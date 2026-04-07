# Story 12.2: Input Lag — True/False/Not Given

Status: review

## Story

As a Teacher editing a T/F/NG exercise,
I want answer inputs and radio selections to be responsive without lag,
so that I can author questions efficiently.

## Acceptance Criteria

1. **AC1 (Sibling isolation):** With 5+ questions in a TFNG section, editing one question (text or radio) does NOT cause sibling question rows to re-render. Measured via React DevTools Profiler.
2. **AC2 (Radio responsiveness):** Clicking a T/F/NG radio button shows the selection immediately (< 100ms) via optimistic local state — not gated by the 500ms debounce or server round-trip.
3. **AC3 (Text field responsiveness):** Typing in question text fields has no perceptible lag (< 100ms input-to-render) with 5+ questions.
4. **AC4 (Consistency):** Optimization approach is consistent with Story 12.1 (memoized row components, stable callbacks, useCallback + ref pattern).
5. **AC5:** All existing tests pass — no regressions. New tests cover memoization isolation.
6. **AC6:** Blur-flush-before-save (already implemented in Story 12.1) continues to work correctly for TFNG questions.

## BDD Scenarios

```gherkin
Scenario 1: Instant Radio Selection via Optimistic State
  Given a T/F/NG section with 8+ questions
  When the teacher expands Q1 and clicks the "FALSE" radio button
  Then the radio visually selects "FALSE" immediately (< 100ms)
  And the debounced mutation fires in the background (500ms)
  And collapsed sibling question rows do NOT re-render

Scenario 2: Question Text Editing Without Lag
  Given a T/F/NG section with 5+ questions
  When the teacher expands Q3 and types rapidly in the question text field
  Then each character appears immediately (< 100ms)
  And other question rows do not re-render

Scenario 3: Save Integrity After Radio Selection
  Given the teacher selected "FALSE" for Q1 but has NOT navigated away
  When the teacher clicks "Save Draft"
  Then the debounced update fires and the answer is persisted correctly

Scenario 4: Expand/Collapse Preserves Pending Selection
  Given the teacher expanded Q2 and selected "NOT_GIVEN"
  When the teacher collapses Q2 within 500ms (before debounce fires)
  And then re-expands Q2
  Then Q2 shows "NOT_GIVEN" (optimistic local state) even if server hasn't confirmed yet

Scenario 5: Server Confirmation Reconciles Optimistic State
  Given the teacher selected "TRUE" for Q1 (optimistic state active)
  When the server confirms the mutation
  Then the optimistic state is replaced by server state
  And the radio still shows "TRUE" (no visual flicker)
```

## Root Cause Analysis

The TFNGEditor component itself is trivial (57 lines, just a RadioGroup with 3 options). There are **two distinct lag sources**:

### Lag Source A: 500ms Debounce on Controlled Radio Buttons (Primary UX Issue)

TFNGEditor uses a **controlled** RadioGroup (`value={correctAnswer?.answer}`). When the teacher clicks a radio button:
1. `onValueChange` fires → TFNGEditor calls `onChange(null, { answer: val })`
2. QuestionSectionEditor's `handleEditorChange` → `debouncedUpdate` → **500ms timer starts**
3. After 500ms, mutation fires → server round-trip → TanStack Query cache updates → parent re-renders
4. RadioGroup finally receives the new `correctAnswer` prop and visually updates

The radio button does NOT visually change until step 4 completes because Radix RadioGroup is controlled — it reflects only the `value` prop, not internal state. This means every radio click has a **500ms+ perceived lag**. Text inputs avoid this because they use `defaultValue` + `onBlur` (uncontrolled pattern from Story 11-2).

### Lag Source B: Sibling Re-render Cascade (Same Class as Story 12.1)

When any question updates, the parent re-renders ALL question rows:
1. **No memoized question rows** — Every question row re-renders on parent state change
2. **Inline arrow closures** — `handleEditorChange`, `toggleExpand`, and `onChange` create new function references every render
3. **QuestionEditorFactory wrapper** — The TFNG branch wraps `onChange` in `(opts, ans) => onChange(opts, ans)`, creating a new ref every render
4. **`safeParse` creates new objects** — `safeParse(LenientTFNGAnswer, correctAnswer)` in QuestionEditorFactory returns a new object reference every render, defeating React.memo on child editors
5. **Upstream callback instability** — `debouncedUpdate` depends on `[section.id, onUpdateQuestion]`. If `onUpdateQuestion` from ExerciseEditor is not stable (recreated each render), `debouncedUpdate` recreates too, breaking memoization downstream

## Tasks / Subtasks

- [x] Task 1: Add optimistic local state to TFNGEditor (AC: 2)
  - [x] 1.1 Add `useState` for local selected value, initialized from `correctAnswer?.answer ?? ""`
  - [x] 1.2 On radio click: update local state immediately (instant visual feedback), THEN call `onChange(null, { answer: val })` to trigger the debounced parent update
  - [x] 1.3 Sync local state when `correctAnswer` prop changes from server (use `useEffect` or derive from prop with key reset)
  - [x] 1.4 Wrap TFNGEditor in `React.memo` — use a custom comparator that compares `correctAnswer?.answer` (string) rather than the `correctAnswer` object reference, since `safeParse` in QuestionEditorFactory creates a new object each render

- [x] Task 2: Extract memoized QuestionRow component (AC: 1, 4)
  - [x] 2.1 Extract the question row JSX (the `<div key={q.id}>` block inside the `.map()` in QuestionSectionEditor) into a `MemoizedQuestionRow` component wrapped in `React.memo`
  - [x] 2.2 Props should favor primitives over objects to avoid shallow-comparison failures. Pass `questionId`, `questionText`, `questionIndex`, `isExpanded`, `options`, `correctAnswer`, `wordLimit`, `sectionType`, `sectionId`, `exerciseId`, `onToggleExpand`, `onDelete`, `onEditorChange`. **Avoid passing the full `question` object** — TanStack Query returns new object references on every refetch even if data is unchanged, which defeats React.memo's default shallow comparison.
  - [x] 2.3 Provide a custom `React.memo` comparator if passing the full `question` object is unavoidable — compare `question.id`, `question.questionText`, `question.correctAnswer`, `question.options`, `question.wordLimit` individually

- [x] Task 3: Stabilize callback references in QuestionSectionEditor (AC: 4)
  - [x] 3.1 Memoize `handleEditorChange` with `useCallback` + `stateRef`/`onChangeRef` pattern (same as Story 12.1's MatchingEditor)
  - [x] 3.2 Memoize `toggleExpand` with `useCallback` (setter function form: `setExpandedQuestionId(prev => prev === id ? null : id)`)
  - [x] 3.3 Memoize the delete handler passed to each row with `useCallback`
  - [x] 3.4 Stabilize `debouncedUpdate` — it already uses `useCallback` but depends on `[section.id, onUpdateQuestion]`. Check whether `onUpdateQuestion` from ExerciseEditor is a stable reference. If not, apply the ref pattern: `const onUpdateRef = useRef(onUpdateQuestion); onUpdateRef.current = onUpdateQuestion;` and use `onUpdateRef.current` inside the callback with `[]` deps.

- [x] Task 4: Fix QuestionEditorFactory onChange wrapper for TFNG (AC: 4)
  - [x] 4.1 In QuestionEditorFactory, the TFNG branch wraps onChange: `(opts, ans) => onChange(opts, ans)`. This wrapper exists to strip the third `wordLimit` argument from the factory's onChange signature. Since TFNGEditor's onChange type only accepts 2 args, TypeScript allows passing the 3-arg `onChange` directly — but verify this compiles cleanly with the project's strict mode settings before removing the wrapper. If it causes type errors, keep the wrapper and rely on React.memo in TFNGEditor instead.
  - [x] 4.2 Do NOT fix the same wrapper pattern in other editors (WordBank, Matching, NTF, etc.) in this story — those are out of scope and expand blast radius unnecessarily. Log them as tech debt for a future cleanup.

- [x] Task 5: Add unit tests (AC: 5)
  - [x] 5.1 Test: radio selection in TFNGEditor updates optimistic local state immediately, then calls onChange
  - [x] 5.2 Test: TFNGEditor syncs local state when `correctAnswer` prop changes (server confirmation)
  - [x] 5.3 Test: radio selection fires onChange correctly through memoized layers
  - [x] 5.4 Test: rendering QuestionSectionEditor with 5 TFNG questions, updating one question's answer — verify the onChange is called correctly and other rows' props don't change (snapshot props or use `vi.fn()` render spy injected via a wrapper component)
  - [x] 5.5 Run full test suite: `pnpm --filter=webapp test` — all tests must pass. Run baseline FIRST before any changes to get the current count (do NOT assume 925).

- [x] Task 6: Verify no regressions across all question types (AC: 5, 6)
  - [x] 6.1 The QuestionSectionEditor changes affect ALL question types, not just TFNG. Run existing tests for MCQ, TextInput, WordBank, Matching, NoteTableFlowchart, DiagramLabelling, SpeakingCueCard editors
  - [x] 6.2 Verify blur-flush-before-save still works (already in ExerciseEditor.tsx from Story 12.1)
  - [x] 6.3 Run: `pnpm --filter=webapp test`

- [ ] Task 7: Manual verification (AC: 1, 2, 3)
  - [ ] 7.1 Create a TFNG exercise with 8+ questions
  - [ ] 7.2 Expand Q1, select radio — verify INSTANT visual response (no 500ms wait)
  - [ ] 7.3 Type rapidly in question text field — verify no lag
  - [ ] 7.4 Use React DevTools Profiler to confirm sibling rows don't re-render on radio click or text edit
  - [ ] 7.5 Test with R4_YNNG (Yes/No/Not Given) variant too
  - [ ] 7.6 Test a Matching Headings exercise still works (regression check for Story 12.1)
  - [ ] 7.7 Test expand Q2 → select answer → collapse Q2 within 500ms → re-expand Q2 → verify answer persisted

## Dev Notes

### Critical Constraints

- **DO NOT change the 500ms debounce timing** in QuestionSectionEditor
- **DO NOT break the uncontrolled input pattern** for questionText (`defaultValue` + `onChange` with debounce in QuestionSectionEditor's expanded editor — this is intentional from Story 11-2)
- **Blur-flush-before-save is already implemented** in ExerciseEditor.tsx (the `handleSaveDraft` function blurs active element + microtask yield) — do NOT duplicate it
- **Story 11-7 (lock submitted exercises)** — The lock mechanism lives in `features/grading/hooks/use-unlock-submission.ts`, NOT in QuestionSectionEditor or ExerciseEditor. There is no `readOnly` prop on these editor components, so memoization changes here have zero impact on the lock feature.

### Architecture Pattern (from Story 12-1)

Follow the optimization pattern proven in MatchingEditor, adapted for the parent-level fix:

1. **Stable callbacks via useCallback + ref pattern:**
   ```typescript
   const stateRef = useRef({ section, onUpdateQuestion });
   stateRef.current = { section, onUpdateQuestion };
   
   const stableHandler = useCallback((questionId: string, input: UpdateQuestionInput) => {
     stateRef.current.onUpdateQuestion(stateRef.current.section.id, questionId, input);
   }, []); // Empty deps = stable reference forever
   ```

2. **Memoized row component:**
   ```typescript
   const MemoizedQuestionRow = React.memo(function QuestionRow({ ... }) {
     // Question header + expanded editor
   });
   ```

3. **Optimistic local state for controlled inputs (NEW for this story):**
   ```typescript
   // Inside TFNGEditor — add local state for instant radio feedback
   const [localAnswer, setLocalAnswer] = useState(correctAnswer?.answer ?? "");
   // Sync from server when prop changes
   useEffect(() => { setLocalAnswer(correctAnswer?.answer ?? ""); }, [correctAnswer?.answer]);
   // On radio click: update local immediately, then fire debounced parent update
   <RadioGroup value={localAnswer} onValueChange={(val) => { setLocalAnswer(val); onChange(null, { answer: val }); }} />
   ```

4. **No new abstractions needed** — solve this specific problem. Do NOT create shared utility hooks or generic memoized wrappers. Story 12-1 explicitly warned: "do NOT over-abstract."

### Scope Boundary

- **Primary target:** QuestionSectionEditor.tsx (extract memoized row, stabilize callbacks)
- **Secondary:** TFNGEditor.tsx (optimistic local state + React.memo), QuestionEditorFactory.tsx (fix TFNG onChange wrapper only)
- **NOT in scope:** ExerciseEditor.tsx (blur-flush already done), MatchingEditor.tsx (already optimized), student submission UI, other editor onChange wrappers in QuestionEditorFactory (tech debt — log for future cleanup)
- **Impact radius:** QuestionSectionEditor changes benefit ALL question types, not just TFNG. This is a positive side effect but must be regression-tested.

### Key File Locations

| File | Role |
|------|------|
| `apps/webapp/src/features/exercises/components/QuestionSectionEditor.tsx` | **Primary target** — extract memoized row, stabilize callbacks. Find the `.map((q: Question, qIdx: number) =>` block. |
| `apps/webapp/src/features/exercises/components/question-types/TFNGEditor.tsx` | Add optimistic local state + wrap in React.memo |
| `apps/webapp/src/features/exercises/components/question-types/QuestionEditorFactory.tsx` | Fix TFNG onChange wrapper — find the `R3_TFNG` / `R4_YNNG` case branch |
| `apps/webapp/src/features/exercises/components/question-types/tfng-editor.test.tsx` | Add optimistic state + memoization tests |
| `apps/webapp/src/features/exercises/components/ExerciseEditor.tsx` | DO NOT modify (blur-flush already present in `handleSaveDraft`) |
| `apps/webapp/src/features/exercises/components/question-types/MatchingEditor.tsx` | **Reference implementation** for the memoization pattern (stateRef, useCallback, React.memo rows) |

### Previous Story Intelligence (12-1)

Story 12-1 (Input Lag — Matching Headings) established:
- **stateRef + onChangeRef pattern** for useCallback without stale closures
- **React.memo row extraction** as the primary technique
- **Stable ID via useRef counter** — NOT needed here since question rows already use `q.id` as key (stable UUID)
- **useMemo for pre-calculations** — NOT needed here since TFNG has no computed indices
- **Blur-flush-before-save** in ExerciseEditor.tsx — already done, benefits all editors

**What's different from 12-1:**
- The memoization fix is in the **parent** (QuestionSectionEditor) rather than the type-specific editor — higher impact, higher regression risk
- TFNGEditor needs **optimistic local state** for instant radio feedback — 12-1 didn't need this because MatchingEditor uses uncontrolled inputs (`defaultValue` + `onBlur`) that are inherently instant
- **`safeParse` in QuestionEditorFactory** creates new object references every render — this didn't matter for MatchingEditor (which receives options/correctAnswer as props and doesn't use React.memo at the factory level), but it WILL break React.memo on TFNGEditor unless the custom comparator compares `correctAnswer?.answer` (string primitive) rather than the object reference

### Testing Standards

- **Framework:** Vitest + React Testing Library
- **Location:** Co-located with source files
- **Run:** `pnpm --filter=webapp test`
- **Baseline:** Run `pnpm --filter=webapp test` BEFORE any changes to establish the current passing count. Do NOT assume a specific number — Story 12-1 is still in review and its test count may shift.
- **Memoization testing approach:** React Testing Library does not directly measure re-renders. To verify memoization, either: (a) inject a `vi.fn()` render spy via a test wrapper component that increments a counter on each render call, or (b) snapshot the props passed to MemoizedQuestionRow across renders and assert they are referentially equal for untouched rows.

### Project Structure Notes

- Feature-first organization: `apps/webapp/src/features/exercises/components/`
- Question type editors: `apps/webapp/src/features/exercises/components/question-types/`
- Tests co-located with source files
- No cross-app imports — all shared types from `@workspace/types`

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 12, Story 12.2]
- [Source: _bmad-output/implementation-artifacts/12-1-input-lag-matching-headings.md — Reference implementation]
- [Source: _bmad-output/planning-artifacts/architecture.md — Frontend architecture, testing standards]
- [Source: apps/webapp/src/features/exercises/components/QuestionSectionEditor.tsx — Primary optimization target]
- [Source: apps/webapp/src/features/exercises/components/question-types/TFNGEditor.tsx — Current component]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Baseline: 95 test files, 928 tests passing
- After implementation: 95 test files, 932 tests passing (+4 new tests)
- TypeScript: clean compile (0 errors)
- Task 4.1: Verified `onChange` can be passed directly to TFNGEditor — TS strict mode allows it since function parameter types are compatible (contravariant check passes)
- Task 2.3: Used primitive props (questionId, questionText, questionIndex, isExpanded) instead of full question object — no custom comparator needed on MemoizedQuestionRow (default shallow compare sufficient)

### Completion Notes List

- **Task 1:** Added optimistic local state (`useState` + `useEffect` sync) to TFNGEditor for instant radio feedback. Wrapped in `React.memo` with custom comparator comparing `correctAnswer?.answer` (string) instead of object reference to handle `safeParse` creating new objects each render.
- **Task 2:** Extracted `MemoizedQuestionRow` from QuestionSectionEditor's `.map()` loop. Props decomposed into primitives where possible (questionId, questionText, questionIndex, isExpanded) to work with default shallow comparison.
- **Task 3:** Stabilized all callbacks with `useCallback` + `stateRef` pattern: `debouncedUpdate` (empty deps, reads from stateRef), `handleEditorChange`, `handleQuestionTextChange`, `toggleExpand`, `handleDeleteQuestion`. This ensures MemoizedQuestionRow receives stable function references.
- **Task 4:** Removed the `(opts, ans) => onChange(opts, ans)` wrapper in QuestionEditorFactory TFNG branch. Direct `onChange={onChange}` compiles cleanly — TS allows it because TFNGEditor's 2-arg onChange is assignable from the factory's 3-arg onChange type. Other editor wrappers (WordBank, Matching, NTF, etc.) left as tech debt per scope boundary.
- **Task 5:** Added 4 new tests: optimistic state on radio click, server sync on prop change, multi-selection through memoized layers, memoization stability with new object refs.
- **Task 6:** Full test suite passes — 932/932. All existing MCQ, TextInput, WordBank, Matching, NoteTableFlowchart, DiagramLabelling, SpeakingCueCard tests pass. Blur-flush-before-save untouched (ExerciseEditor.tsx not modified).
- **Task 7:** Manual verification required — radio responsiveness, React DevTools Profiler sibling isolation, YNNG variant, expand/collapse persistence. Cannot be automated.

### Change Log

- 2026-04-07: Story 12-2 implementation — optimistic radio state, memoized question rows, stable callbacks (Tasks 1-6 complete, Task 7 manual)

### File List

- `apps/webapp/src/features/exercises/components/question-types/TFNGEditor.tsx` — Added optimistic local state, React.memo with custom comparator
- `apps/webapp/src/features/exercises/components/QuestionSectionEditor.tsx` — Extracted MemoizedQuestionRow, stabilized callbacks with useCallback + stateRef
- `apps/webapp/src/features/exercises/components/question-types/QuestionEditorFactory.tsx` — Removed TFNG onChange wrapper (direct pass-through)
- `apps/webapp/src/features/exercises/components/question-types/tfng-editor.test.tsx` — Added 4 new tests for optimistic state and memoization
