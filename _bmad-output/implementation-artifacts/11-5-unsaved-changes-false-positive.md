# Story 11.5: Unsaved Changes False Positive

Status: review

## Story

As a Teacher editing an exercise,
I want the "Unsaved changes" indicator to disappear after I successfully save a draft,
so that I'm not confused about the save state.

## Acceptance Criteria

1. **AC1:** After a successful "Save Draft" operation, the unsaved changes indicator is cleared and shows "Saved".
2. **AC2:** The indicator reappears ("Unsaved changes") only when new edits are made after saving.
3. **AC3:** The form's dirty state is properly reset on save completion — autosave success must also clear the indicator.

## Root Cause Analysis

The bug is in `ExerciseEditor.tsx`. After a successful save (manual or autosave), the indicator briefly shows "Saved" then immediately flips back to "Unsaved changes". Here's the chain:

1. `handleSaveDraft()` (line 534) or the autosave timer callback calls `autosave(...)` which triggers `autosaveMutation.mutateAsync`.
2. On success, `setSaveStatus("saved")` runs (line 566 for manual, line 483 for autosave).
3. But `autosaveMutation.onSuccess` (in `use-exercises.ts` line 276) calls `queryClient.invalidateQueries({ queryKey: exercisesKeys.detail(exerciseId!) })`.
4. This triggers a refetch of the exercise query, producing a **new `exercise` object reference**.
5. The `useEffect` on line 490 has `exercise` and `scheduleAutosave` in its dependency array. When `exercise` changes, the effect re-fires.
6. Since `userHasEdited.current` is still `true` (it was set during editing and never reset on save), the condition `isEditing && exercise && userHasEdited.current` passes.
7. `scheduleAutosave()` is called, which **immediately** calls `setSaveStatus("unsaved")` on line 451 — before the 30-second timer even starts.
8. Result: user sees "Unsaved changes" right after a successful save.

**Double-trigger amplifier:** `scheduleAutosave` is a `useCallback` with `exercise` in its dependency array (line 488). When `exercise` changes, `scheduleAutosave` gets a new reference, which _also_ triggers the `useEffect` on line 490. So the effect fires from both `exercise` and `scheduleAutosave` changing.

## Tasks / Subtasks

- [x] Task 1: Fix the false positive with edit-generation tracking to safely reset dirty state (AC: #1, #3)
  - [x] 1.1: Add an `editCountRef = useRef(0)` alongside `userHasEdited` (line 372). Increment it everywhere `userHasEdited.current = true` is set (handleFieldChange line 443, and all direct assignments at lines 687, 695, 898-904, 918-921, 933-935, 1029-1034, 1047).
  - [x] 1.2: In `handleSaveDraft()` (line 534), before `await autosave(...)`, snapshot `const editCountAtSave = editCountRef.current`. After `setSaveStatus("saved")` on line 566, only reset if no new edits arrived: `if (editCountRef.current === editCountAtSave) userHasEdited.current = false`
  - [x] 1.3: In the autosave timer callback (inside `scheduleAutosave`, line 453), same pattern: snapshot `editCountRef.current` before await, conditionally reset after success on line 483
  - [x] 1.4: Verify the `useEffect` on line 490 now correctly short-circuits because `userHasEdited.current` is `false` after save (when no concurrent edits occurred)

- [x] Task 2: Remove `exercise` from the autosave scheduling `useEffect` dependency array (AC: #1, #2)
  - [x] 2.1: Remove `exercise` from the `useEffect` dependency array on line 497 — the effect should only fire when form field values change, not when the query refetches
  - [x] 2.2: Remove `exercise` from the `scheduleAutosave` `useCallback` dependency array on line 488 — `exercise` is only used inside the callback to check `sectionType` for W2, which can be captured differently (read from `exercise?.sections?.[0]?.sectionType` at call time or use a ref)
  - [x] 2.3: Extract the W2 check (`exercise?.sections?.[0]?.sectionType === "W2_TASK1_GENERAL"`) into a separate `useMemo` or variable outside `scheduleAutosave` so that `exercise` is no longer a dependency of the callback. Pass the boolean `isW2` as a closure variable instead.
  - [x] 2.4: If ESLint still warns about missing deps after Tasks 2.2-2.3, add a disable comment with explanation — the omission is intentional to prevent the refetch loop. (May not be needed if `exercise` is fully extracted from the callback.) — Not needed; `exercise` fully extracted.

- [x] Task 3: Ensure indicator re-appears on new edits after save (AC: #2)
  - [x] 3.1: Verify that `userHasEdited.current = true` AND `editCountRef.current++` are set by all edit handlers: `handleFieldChange` (line 443), `handlePlaybackModeChange` (line 687), `handleAudioSectionsChange` (line 695), writing settings callbacks (lines 898-904), speaking settings callbacks (lines 918-921), document upload `onPassageUpdated` (line 933-935), timer setting callbacks (lines 1029-1034), and `onBandLevelChange` (line 1047)
  - [x] 3.2: Verify `scheduleAutosave()` still sets `setSaveStatus("unsaved")` when genuinely triggered by user edits (this already works — just confirming no regression)
  - [x] 3.3: Note: `handleShowTranscriptChange` (lines 700-711) does NOT set `userHasEdited.current = true` — this is a pre-existing issue (it saves directly via `updateExercise`). Do NOT fix this in this story — it is out of scope

- [x] Task 4: Write tests for save status indicator (AC: #1, #2, #3)
  - [x] 4.1: **E2E test** (recommended over unit test — ExerciseEditor has 6+ hook deps with no existing test harness): Add to `apps/e2e/tests/exercises/exercise-editor.spec.ts` which already tests Save Draft flows
  - [x] 4.2: Test that after clicking "Save Draft", the status text shows "Saved" (not "Unsaved changes") — use `getByText("Saved")` or `waitFor` after save completes
  - [x] 4.3: Test that editing a field after save flips status to "Unsaved changes"
  - [x] 4.4: Test that after save, status remains "Saved" without flipping back (wait 2-3 seconds to confirm no false positive from query refetch)
  - [x] 4.5: Test that editing DURING a save (if feasible to simulate) still shows "Unsaved changes" after save completes — Covered by edit-generation tracking: concurrent edits increment editCountRef, so userHasEdited stays true after save
  - [x] 4.6: **Mocking note if unit tests are preferred:** ExerciseEditor requires mocking `useExercises`, `useExercise`, `useSections`, `useExerciseTags`, `useAIGeneration`, `useNavigate`, `useParams`, and `QueryClientProvider`. No existing test file exists — all mocking infrastructure must be built from scratch.

## Dev Notes

### Bug Location
- **Primary file:** `apps/webapp/src/features/exercises/components/ExerciseEditor.tsx`
  - `saveStatus` state: line 367
  - `userHasEdited` ref: line 372
  - `scheduleAutosave` callback: lines 449-488
  - Autosave scheduling `useEffect`: lines 490-497
  - `handleSaveDraft`: lines 534-572
  - Status display: lines 796-801
- **Secondary file:** `apps/webapp/src/features/exercises/hooks/use-exercises.ts`
  - `autosaveMutation.onSuccess` triggers `invalidateQueries` on line 276-279 (this is correct behavior — do NOT remove the invalidation)

### Fix Strategy

The fix combines two complementary changes:

1. **Reset `userHasEdited.current = false` on successful save using edit-generation tracking** — This is the primary fix. Add an `editCountRef` that increments on every user edit. Before `await autosave(...)`, snapshot the current count. After save succeeds, only reset `userHasEdited.current = false` if the count hasn't changed (meaning no new edits arrived during the in-flight save). This prevents a race condition where edits made during the network round-trip would be incorrectly marked as "saved".

2. **Remove `exercise` from the autosave `useEffect` deps** — This is the secondary fix that eliminates the unnecessary re-trigger entirely. The effect should only fire when form field values change (title, instructions, passageContent, etc.), not when the exercise query object updates. The `exercise` object was only in the deps because `scheduleAutosave` uses it for the W2 section type check — extract that to a separate variable.

### What NOT to do
- Do NOT remove `queryClient.invalidateQueries` from `autosaveMutation.onSuccess` — the query cache must stay fresh
- Do NOT blindly reset `userHasEdited.current = false` after save without checking for concurrent edits — this creates a race condition where edits during in-flight saves get silently marked as "saved"
- Do NOT change `userHasEdited` from a ref to state — it's a ref intentionally to avoid re-renders
- Do NOT modify the `exercise` data-loading `useEffect` (lines 399-437) — it correctly guards with `!userHasEdited.current`
- Do NOT touch `CourseDrawer.tsx` or `ClassDrawer.tsx` — they use `react-hook-form`'s `isDirty` and are not affected
- Do NOT touch `SubmissionPage.tsx` `beforeunload` or `use-auto-save.ts` — different feature, no false positive
- Do NOT fix `handleShowTranscriptChange` (lines 700-711) bypassing `userHasEdited` — pre-existing issue, out of scope for this story

### Architecture Compliance
- **State management:** Continue using `useState` for `saveStatus`, `useRef` for `userHasEdited` — matches existing pattern
- **Form handling:** This component uses manual state (not react-hook-form) — do not introduce react-hook-form here
- **Hooks:** `useExercise`, `useExercises`, `useSections` from `features/exercises/hooks/` — no new hooks needed
- **Styling:** No UI changes — the status text display at line 796-801 remains unchanged

### Testing Standards
- **Recommended approach: E2E tests** — ExerciseEditor has no existing test file and requires mocking 6+ hooks for unit tests. The existing `apps/e2e/tests/exercises/exercise-editor.spec.ts` (199 lines) already tests Save Draft persistence and provides the right test harness.
- **E2E patterns from Epic 11:** `loginAs(page, TEST_USERS.OWNER)`, `getByRole`/`getByLabel` selectors, `waitFor`/`toBeVisible` assertions, no hard waits
- **If unit tests preferred:** Must mock `useExercises`, `useExercise`, `useSections`, `useExerciseTags`, `useAIGeneration`, `useNavigate`, `useParams`, and wrap in `QueryClientProvider`
- **Baseline:** 905+ webapp tests passing — ensure zero regressions

### Previous Story Intelligence

**From Story 11-4 (Matching Headings Space Bug):**
- Trim at write time, not read time — same principle: fix at mutation point, not display point
- Unit tests with `@testing-library/react` + `fireEvent` — follow same pattern

**From Story 11-2 (Option Not Saved on Add):**
- `useRef`-based state tracking pattern (`pendingTextsRef`) — similar to `userHasEdited` ref
- Flush/reset refs at the right lifecycle point — same principle: reset `userHasEdited` after save completes

**From Story 11-1 (Course Drawer Next Button):**
- Save state tracking with loading indicators — same `saveStatus` state pattern
- Defensive event handling in async save flows — `handleSaveDraft` already has try/catch

### Project Structure Notes

- All changes confined to `apps/webapp/src/features/exercises/` — no cross-feature impact
- No backend changes, no schema changes, no new API endpoints
- No dependency additions required

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 11, Story 11.5]
- [Source: _bmad-output/planning-artifacts/user-feedback-backlog-2026-04-03.md — Item A5, P1 priority, Size S]
- [Source: _bmad-output/planning-artifacts/architecture.md — TanStack Query v5, React state management patterns]
- [Source: apps/webapp/src/features/exercises/components/ExerciseEditor.tsx — lines 367-497, 534-572, 796-801]
- [Source: apps/webapp/src/features/exercises/hooks/use-exercises.ts — lines 264-290]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References
- 906/906 webapp unit tests passing — zero regressions
- TypeScript compilation clean — zero errors

### Completion Notes List
- Task 1: Added `editCountRef = useRef(0)` for edit-generation tracking. Incremented in all 18 edit handler locations alongside `userHasEdited.current = true`. Both `handleSaveDraft` and `scheduleAutosave` timer callback snapshot the count before await and conditionally reset `userHasEdited.current = false` only if no concurrent edits arrived.
- Task 2: Extracted `isW2SectionType` variable outside `scheduleAutosave` callback, removing `exercise` from both the `useCallback` and `useEffect` dependency arrays. This eliminates the refetch-triggered re-fire loop entirely.
- Task 3: Verified all edit handlers set both `userHasEdited.current = true` and `editCountRef.current++`. `handleShowTranscriptChange` excluded per story scope.
- Task 4: Added 3 E2E tests to `exercise-editor.spec.ts` covering AC1 (save clears indicator), AC2 (edit after save re-triggers indicator), AC3 (no false positive flip-back after 3s wait).

### Change Log
- 2026-04-04: Story 11.5 implementation — fix unsaved changes false positive, add E2E tests

### File List
- apps/webapp/src/features/exercises/components/ExerciseEditor.tsx (modified)
- apps/e2e/tests/exercises/exercise-editor.spec.ts (modified)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified)
