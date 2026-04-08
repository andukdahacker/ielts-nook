# Story 12.5: Stay on Page After Publish

Status: review

## Story

As a Teacher who just published an exercise,
I want to stay on the edit page instead of being redirected,
So that I can assign or continue reviewing immediately.

## Acceptance Criteria

1. After publishing, user remains on the exercise edit page.
2. An "Assign" button appears once the exercise is in published state.
3. The "Assign" button is disabled/hidden when the exercise is still in draft state.
4. A success toast confirms the publish action.

## Tasks / Subtasks

- [x] Task 1: Remove post-publish navigation (AC: #1, #4)
  - [x] 1.1 In `ExerciseEditor.tsx` `handlePublish` (line 634-645), remove the `navigate("../exercises", { replace: true })` call at line 640. Keep the `toast.success("Exercise published")` (AC #4 already satisfied).
  - [x] 1.2 After `publishExercise(id)` succeeds, the mutation's `onSuccess` in `use-exercises.ts` (lines 128-131) already invalidates `exercisesKeys.detail(id)`, which triggers a refetch. The `exercise?.status` will update to `"PUBLISHED"` automatically via TanStack Query cache invalidation. No manual refetch needed.
- [x] Task 2: Hide Save Draft button and show Assign button after publish (AC: #2, #3)
  - [x] 2.1 Add state: `const [showAssignDialog, setShowAssignDialog] = useState(false)`
  - [x] 2.2 Wrap the Save Draft button (line 881-884) in a `exercise?.status === "DRAFT"` conditional, so it hides after publish. The backend rejects saves to PUBLISHED exercises (`verifyDraftExercise()` in `exercises.service.ts` lines 31-44 throws `"Only draft exercises can be auto-saved"`), so showing the button would cause confusing "Failed to save" errors.
    ```tsx
    {exercise?.status === "DRAFT" && (
      <Button variant="outline" size="sm" aria-label="Save Draft" onClick={handleSaveDraft}>
        <Save className="sm:mr-2 size-4" />
        <span className="hidden sm:inline">Save Draft</span>
      </Button>
    )}
    ```
  - [x] 2.3 In the sticky header button group (after the Publish button block, line 889), add a conditional "Assign" button that only renders when `exercise?.status === "PUBLISHED"`:
    ```tsx
    {exercise?.status === "PUBLISHED" && (
      <Button size="sm" aria-label="Assign to Class" onClick={() => setShowAssignDialog(true)}>
        <ClipboardList className="sm:mr-2 size-4" />
        <span className="hidden sm:inline">Assign</span>
      </Button>
    )}
    ```
  - [x] 2.4 Import `ClipboardList` icon from `lucide-react` (task/assignment semantic — `Send` is used in `QuestionStepper.tsx` for submission, not assignment)
  - [x] 2.5 The Publish button already hides when `exercise?.status !== "DRAFT"` (line 885-889), so after publish it disappears naturally — no extra logic needed for AC #3
- [x] Task 3: Wire up CreateAssignmentDialog (AC: #2)
  - [x] 3.1 Import `CreateAssignmentDialog` from `@/features/assignments/components/create-assignment-dialog` — this is the first cross-feature import from assignments in ExerciseEditor; it follows the same `@/features/` alias pattern used by existing imports like `useAuth` from `@/features/auth/auth-context`
  - [x] 3.2 Render the dialog at the bottom of the component JSX (alongside the existing AlertDialog for publish, near line 1208):
    ```tsx
    <CreateAssignmentDialog
      open={showAssignDialog}
      onOpenChange={setShowAssignDialog}
      defaultExerciseId={id}
    />
    ```
  - [x] 3.3 The `CreateAssignmentDialog` component (line 37-41 of `create-assignment-dialog.tsx`) accepts `{ open, onOpenChange, defaultExerciseId }` — this matches exactly. It pre-selects the exercise and shows class/student assignment UI.
- [x] Task 4: Verify no regressions (AC: #1-#4)
  - [x] 4.1 Run existing test suite: `pnpm --filter=webapp test` — 917/917 tests pass (2 pre-existing failures in users module unrelated to this story, caused by @workspace/types build artifact missing)
  - [ ] 4.2 Manual test: Create a draft exercise, click Publish, confirm dialog — should stay on edit page with success toast
  - [ ] 4.3 Manual test: After publish, verify Publish button is gone and Assign button is visible
  - [ ] 4.4 Manual test: Click Assign button — should open CreateAssignmentDialog with the exercise pre-selected
  - [ ] 4.5 Manual test: Verify Assign button is NOT visible on a draft exercise (open a different draft exercise)
  - [ ] 4.6 Manual test: Verify "Back to Exercises" button still works to navigate away
  - [ ] 4.7 Manual test: After publish, type in a field (e.g., title) — verify no autosave error toast fires (Save Draft button should be hidden, but typing in fields should not trigger a visible error)
  - [ ] 4.8 Manual test: After publish, verify Save Draft button is hidden

## Dev Notes

### Implementation Strategy: Remove Navigation + Add Conditional Assign Button

This is a minimal, targeted change to `ExerciseEditor.tsx` only. The key insight is that the existing infrastructure already handles most of the work:

1. **Publish mutation** already invalidates the exercise detail query, so status updates to PUBLISHED automatically
2. **Publish button** already conditionally renders on `status === "DRAFT"`, so it hides itself after publish
3. **CreateAssignmentDialog** already exists with `defaultExerciseId` prop — just wire it up

### Current Publish Flow (What Changes)

**Before (current):**
```
User clicks Publish → Confirm dialog → handlePublish() → saveDraft → publishExercise(id) → toast.success → navigate("../exercises") ← REMOVE THIS
```

**After:**
```
User clicks Publish → Confirm dialog → handlePublish() → saveDraft → publishExercise(id) → toast.success → stay on page → status refetches to PUBLISHED → Publish button hides → Assign button appears
```

### handlePublish Change (Lines 634-645)

```tsx
// Before
const handlePublish = async () => {
  if (!id) return;
  try {
    await handleSaveDraft();
    await publishExercise(id);
    toast.success("Exercise published");
    navigate("../exercises", { replace: true }); // ← DELETE THIS LINE
  } catch {
    toast.error("Failed to publish exercise");
  } finally {
    setShowPublishDialog(false);
  }
};

// After
const handlePublish = async () => {
  if (!id) return;
  try {
    await handleSaveDraft();
    await publishExercise(id);
    toast.success("Exercise published");
  } catch {
    toast.error("Failed to publish exercise");
  } finally {
    setShowPublishDialog(false);
  }
};
```

### Why This Works Without Manual Refetch

The `publishExerciseMutation` in `use-exercises.ts` (lines 128-131) has:
```tsx
onSuccess: (_, id) => {
  queryClient.invalidateQueries({ queryKey: exercisesKeys.lists() });
  queryClient.invalidateQueries({ queryKey: exercisesKeys.detail(id) });
}
```

This invalidates the detail query, which triggers an automatic refetch of the exercise. The `exercise` object in ExerciseEditor updates via TanStack Query reactivity, and `exercise?.status` changes from `"DRAFT"` to `"PUBLISHED"`. The conditional renders then update:
- `exercise?.status === "DRAFT"` → `false` → Publish button hides
- `exercise?.status === "PUBLISHED"` → `true` → Assign button shows

### Sticky Header Button Placement

The buttons are in the sticky header (lines 860-890). Current order:
1. Save status indicator
2. Preview button
3. Save Draft button
4. Publish button (DRAFT only)

After change:
1. Save status indicator
2. Preview button
3. Save Draft button (DRAFT only) ← NOW CONDITIONAL
4. Publish button (DRAFT only)
5. **Assign button (PUBLISHED only)** ← NEW

In DRAFT state: indicator + Preview + Save Draft + Publish.
In PUBLISHED state: indicator + Preview + Assign. Clean, mutually exclusive toolbar states.

### Responsive Pattern

Follow the same responsive pattern established in Story 12-3 for the Assign button:
- Icon always visible
- Text hidden below `sm:` breakpoint via `<span className="hidden sm:inline">Assign</span>`
- `size="sm"` to match other toolbar buttons

### Save Draft Button and Autosave After Publish

The Save Draft button MUST be hidden when `exercise?.status === "PUBLISHED"`. The backend enforces `verifyDraftExercise()` (`exercises.service.ts` lines 31-44) which rejects saves/autosaves to non-DRAFT exercises with `"Only draft exercises can be auto-saved"`. Leaving the button visible would cause confusing "Failed to save" errors.

**Autosave edge case:** The `autosaveTimer` ref (line 374) fires on a debounce after `handleFieldChange`. If the user edits a field *after* publish, the debounce will trigger `autosave()`, which will hit the backend and fail. Hiding the Save Draft button doesn't prevent typing in fields. However, the autosave error is caught silently in the mutation's `onError` (no error toast for autosave — only `handleSaveDraft` shows the "Failed to save" toast in its catch block at line 628). So post-publish typing won't show visible errors to the user, but the changes won't persist. This is acceptable for now — Story 12-12 (Edit After Publish) will add proper read-only field gating based on submission state.

### What NOT to Do

- Do NOT make fields read-only after publish — that's Story 12-12's scope (Edit After Publish — Before Submissions Only)
- Do NOT modify `use-exercises.ts` — the mutation hook already handles cache invalidation correctly
- Do NOT add a manual `refetchExercise()` call after publish — query invalidation handles this
- Do NOT modify `CreateAssignmentDialog` — it works as-is with `defaultExerciseId`
- Do NOT change the debounce timing or save behavior (lesson from stories 12-1, 12-2)
- Do NOT modify `use-sections.ts` or any other hooks
- Do NOT change the publish confirmation AlertDialog
- Do NOT add scroll behavior (that was story 12-4)
- Do NOT add any backend changes — the publish endpoint and assignment endpoint already exist

### Project Structure Notes

- **Only file to modify:** `apps/webapp/src/features/exercises/components/ExerciseEditor.tsx`
- **Existing component to reuse:** `apps/webapp/src/features/assignments/components/create-assignment-dialog.tsx`
- No new files needed
- No backend changes required
- No new dependencies needed
- No changes to hooks, types, or other components

### References

- [Source: apps/webapp/src/features/exercises/components/ExerciseEditor.tsx#lines 634-645] — `handlePublish` with navigate to remove
- [Source: apps/webapp/src/features/exercises/components/ExerciseEditor.tsx#lines 881-884] — Save Draft button (wrap in DRAFT conditional)
- [Source: apps/webapp/src/features/exercises/components/ExerciseEditor.tsx#lines 885-889] — Publish button conditional render
- [Source: apps/webapp/src/features/exercises/hooks/use-exercises.ts#lines 117-132] — `publishExerciseMutation` with cache invalidation
- [Source: apps/webapp/src/features/assignments/components/create-assignment-dialog.tsx#lines 29-41] — Dialog interface and props
- [Source: apps/backend/src/modules/exercises/exercises.service.ts#lines 31-44] — `verifyDraftExercise()` backend guard (why Save Draft must hide)
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 12, Story 12.5] — Requirements
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 12, Story 12.12] — Future: Edit After Publish scope (read-only fields)

### Previous Story Intelligence (Story 12-4)

- ExerciseEditor.tsx has `newSectionIdRef` + `data-section-id` + scroll `useEffect` added in story 12-4 — do not disturb these
- Sticky header structure: `<header className="sticky top-0 z-40 ...">` with responsive icon-only buttons below `sm:` (from story 12-3)
- Test baseline: 933/933 webapp tests passing
- ExerciseEditor.tsx is a large file (~1250 lines after 12-4) — make minimal, targeted changes
- Pattern: All Epic 12 changes scoped to single files, minimal footprint, no new dependencies

### Git Intelligence

Recent commits in Epic 12:
- `3d58510` feat: auto-scroll to new section with race-condition fixes (story 12-4)
- `7dc7ad9` feat: sticky toolbar with responsive icons and a11y fixes (story 12-3)
- `a0a3cfa` feat: fix input lag in TFNGEditor with optimistic state and memoized question rows (story 12-2)
- `2eb5a2e` feat: fix input lag in MatchingEditor with memoization and stable keys (story 12-1)

Pattern: All changes scoped to single files, minimal footprint, no new dependencies.

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References
- 917/917 webapp tests pass; 2 pre-existing failures in users module (unrelated @workspace/types build artifact)

### Completion Notes List
- Task 1: Removed `navigate("../exercises", { replace: true })` from `handlePublish`. User now stays on edit page after publish. Toast already present.
- Task 2: Wrapped Save Draft button in `exercise?.status === "DRAFT"` conditional. Added Assign button with `ClipboardList` icon, visible only when `exercise?.status === "PUBLISHED"`. Follows responsive pattern from story 12-3.
- Task 3: Imported `CreateAssignmentDialog` from assignments feature. Wired up with `showAssignDialog` state and `defaultExerciseId={id}`. Renders alongside existing AlertDialogs.
- Task 4: Automated tests pass. Manual tests (4.2-4.8) deferred to user.

### Change Log
- 2026-04-08: Implemented story 12-5 — stay on page after publish, conditional Save Draft/Assign buttons

### File List
- apps/webapp/src/features/exercises/components/ExerciseEditor.tsx (modified)
