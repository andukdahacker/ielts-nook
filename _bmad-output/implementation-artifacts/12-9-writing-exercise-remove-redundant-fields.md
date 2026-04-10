# Story 12.9: Writing Exercise — Remove Redundant Fields

Status: review

## Story

As a Teacher creating a Writing exercise,
I want redundant section chrome and the `questionText` field hidden,
So that I'm not confused by fields that duplicate `writingPrompt` and `instructions`.

## Acceptance Criteria

1. **AC1:** The section header ("Section 1"), section instructions input, section time limit, and audio section selector are hidden in the Writing exercise editor. The **task type selector (W1/W2/W3) remains visible** — relocated into `WritingTaskEditor` as a "Task Type" dropdown.
2. **AC2:** The `questionText` editor field is hidden for Writing exercises. Student-facing components (`WritingInput`, `QuestionPreviewFactory`) are updated to read `writingPrompt` (exercise-level) instead of `questionText` for Writing question types.
3. **AC3:** Existing Writing exercises with data in `questionText` or section fields are unaffected — data is preserved in the database, just hidden from the editor UI.

## Tasks / Subtasks

- [x] Task 1: Relocate task type selector from QuestionSectionEditor to WritingTaskEditor (AC: #1)
  - [x] 1.1 In `WritingTaskEditor.tsx`, add a "Task Type" `<Select>` dropdown (W1 Academic / W2 General Training / W3 Essay) at the top, before the writing prompt field
  - [x] 1.2 The dropdown's value is derived from the `sectionType` prop; on change, call a new `onSectionTypeChange` callback prop
  - [x] 1.3 In `ExerciseEditor.tsx`, wire `onSectionTypeChange` to call `updateSection` on the first (only) section with the new `sectionType` value
- [x] Task 2: Hide section-level configuration for Writing exercises (AC: #1)
  - [x] 2.1 In `QuestionSectionEditor.tsx`, conditionally hide these when `skill === "WRITING"`: section header ("Section 1"), section type selector, section instructions input, audio section selector, section time limit
  - [x] 2.2 The auto-created section still exists in the data model — only the UI chrome is hidden
- [x] Task 3: Hide questionText editor and update student-facing display (AC: #2)
  - [x] 3.1 In `QuestionSectionEditor.tsx` `MemoizedQuestionRow`, hide the `questionText` `<Input>` (line ~145-150) when `skill === "WRITING"`. Pass `skill` down to `MemoizedQuestionRow` via props.
  - [x] 3.2 In `WritingInput.tsx` (line ~40), update to accept and display `writingPrompt` instead of `questionText` for the student-facing prompt. The parent `QuestionInputFactory.tsx` (lines 129-142) must pass `writingPrompt` from the exercise context.
  - [x] 3.3 In `QuestionPreviewFactory.tsx` (lines 120-130), update the W1/W2/W3 cases to display `writingPrompt` instead of `question.questionText`
- [x] Task 4: Verify data preservation (AC: #3)
  - [x] 4.1 No schema, API, or save logic changes — hidden fields are display-only
  - [x] 4.2 Existing Writing exercises with `questionText` data remain in DB untouched
- [x] Task 5: Create tests (AC: #1, #2)
  - [x] 5.1 Create new test file `QuestionSectionEditor.test.tsx` — no existing test file exists for this component. Verify section config and questionText are hidden when `skill === "WRITING"` and visible for other skills.
  - [x] 5.2 Add tests for the new task type selector in `WritingTaskEditor` (existing test file or new)
  - [x] 5.3 Update `WritingInput` and `QuestionPreviewFactory` tests (if they exist) to verify `writingPrompt` is displayed for Writing types
  - [x] 5.4 Run full test suite: `pnpm --filter=webapp test` — 0 regressions expected

## Dev Notes

### What's Redundant and Why

Writing exercises have a unique structure compared to Reading/Listening:
- **Only 1 section** (auto-created, "Add Section" button already hidden for WRITING)
- **Only 1 question** per section (the writing task itself)
- **Section header "Section 1"** — meaningless when there's always exactly one section
- **Section instructions** — `writingPrompt` (exercise-level) covers the teacher's prompt to students
- **Section time limit** — exercise-level time limit is sufficient
- **Audio section selector** — never applicable to Writing

### Task Type Selector Must Be Relocated, NOT Removed

`WritingTaskEditor` receives `sectionType` as a **read-only prop** — it has no task type selector. The `<Select>` in `QuestionSectionEditor.tsx` (lines 335-356) is the **only control** for switching between W1/W2/W3. The available options are defined in `QUESTION_TYPES_BY_SKILL.WRITING` (line ~53-57):
```
W1_TASK1_ACADEMIC  → "Task 1 - Academic"
W2_TASK1_GENERAL   → "Task 1 - General Training"
W3_TASK2_ESSAY     → "Task 2 - Essay"
```

You must add this selector to `WritingTaskEditor` before hiding the section config. The flow:
1. `WritingTaskEditor` renders a "Task Type" `<Select>` using these same options
2. On change, calls `onSectionTypeChange(newType)` (new callback prop)
3. `ExerciseEditor.tsx` handles this by calling `updateSection(sectionId, { sectionType: newType })`
4. This triggers re-render with updated `sectionType` prop, which `WritingTaskEditor` uses to show/hide task-specific fields (stimulus image for W1, letter tone for W2)

### questionText vs writingPrompt — Different Consumers

These are NOT interchangeable today:
- `writingPrompt` — exercise-level field, edited in `WritingTaskEditor`, stored on Exercise model
- `questionText` — question-level field, edited in `QuestionSectionEditor`, stored on Question model

**Student-facing components currently read `questionText`:**
| Component | File | Line | What it displays |
|-----------|------|------|-----------------|
| `WritingInput` | `features/submissions/components/question-inputs/WritingInput.tsx` | ~40 | `questionText` as the prompt above the textarea |
| `QuestionInputFactory` | `features/submissions/components/question-inputs/QuestionInputFactory.tsx` | 129-142 | Passes `question.questionText` to `WritingInput` |
| `QuestionPreviewFactory` | `features/exercises/components/question-types/QuestionPreviewFactory.tsx` | 120-130 | `question.questionText` in preview card |

**After this story:** These components must read `writingPrompt` for Writing types. The exercise-level `writingPrompt` needs to be available in the context where these components render. Check how exercise data flows to submission/preview components — you may need to pass `writingPrompt` down from the exercise object or a context provider.

### Key Files to Modify

| File | Change | Lines |
|------|--------|-------|
| `QuestionSectionEditor.tsx` | Hide section config + questionText for WRITING; pass `skill` to `MemoizedQuestionRow` | ~145-150, ~310-422 |
| `WritingTaskEditor.tsx` | Add "Task Type" `<Select>` dropdown; accept `onSectionTypeChange` callback | Top of component |
| `ExerciseEditor.tsx` | Wire `onSectionTypeChange` to `updateSection` mutation | ~972-995 |
| `WritingInput.tsx` | Display `writingPrompt` instead of `questionText` for Writing | ~40 |
| `QuestionInputFactory.tsx` | Pass `writingPrompt` to `WritingInput` for Writing types | 129-142 |
| `QuestionPreviewFactory.tsx` | Display `writingPrompt` instead of `questionText` for Writing | 120-130 |

### Files to NOT Modify

- `packages/types/src/exercises.ts` — Schema unchanged (data preserved)
- Backend files — Purely frontend UI change
- Database/migrations — No data migration needed

### Implementation Pattern

The `skill` prop is already passed to `QuestionSectionEditor` from `ExerciseEditor.tsx` (line ~1186: `skill={selectedSkill!}`). Use conditional rendering:

```tsx
// Hide section chrome for Writing
{skill !== "WRITING" && (
  <div className="space-y-2">
    <Label>Question Type</Label>
    <Select ... />
  </div>
)}
```

For `MemoizedQuestionRow`, add `skill` to its props interface and pass it through:

```tsx
// Hide questionText for Writing
{skill !== "WRITING" && (
  <div className="space-y-1.5">
    <Label className="text-xs">Question Text</Label>
    <Input ... />
  </div>
)}
```

### Previous Story Intelligence (12-8)

- 4 one-line changes across exercise component files
- Full test suite: 96 files, 950 tests, 0 failures
- Commit format: `feat: description (story 12-N)`
- Pattern: minimal footprint, no new dependencies, no new files

### Project Structure Notes

- Feature-first: `apps/webapp/src/features/exercises/components/`
- Tests co-located: No existing `QuestionSectionEditor.test.tsx` — create new
- Naming: PascalCase components, kebab-case utilities
- Testing framework: Vitest
- This story is larger than 12-7/12-8 — touches ~6 files across exercises, submissions, and preview

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 12, Story 12.9]
- [Source: apps/webapp/src/features/exercises/components/QuestionSectionEditor.tsx — lines 53-57, 67-81, 145-150, 184-199, 310-422]
- [Source: apps/webapp/src/features/exercises/components/ExerciseEditor.tsx — lines 570-587, 819, 972-995, 1156, 1186]
- [Source: apps/webapp/src/features/exercises/components/WritingTaskEditor.tsx — lines 34-36, 54-60 (read-only sectionType)]
- [Source: apps/webapp/src/features/submissions/components/question-inputs/WritingInput.tsx — line 40]
- [Source: apps/webapp/src/features/submissions/components/question-inputs/QuestionInputFactory.tsx — lines 129-142]
- [Source: apps/webapp/src/features/exercises/components/question-types/QuestionPreviewFactory.tsx — lines 120-130]
- [Source: packages/types/src/exercises.ts — QuestionSchema, QuestionSectionSchema]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References
None — clean implementation, no debug issues.

### Completion Notes List
- Task 1: Added `WRITING_TASK_TYPES` constant and "Task Type" `<Select>` to `WritingTaskEditor` with `onSectionTypeChange` callback. Wired in `ExerciseEditor` to call `handleUpdateSection` on first section.
- Task 2: Wrapped section header, drag handle, delete button, question type selector, instructions, audio section, and time limit in `{skill !== "WRITING" && (...)}` conditionals. Removed border/padding for WRITING to avoid empty chrome.
- Task 3: Added `skill` prop to `MemoizedQuestionRow` interface and memo comparator. Hid `questionText` input for WRITING. Updated `WritingInput` to accept `writingPrompt` and prefer it over `questionText`. Updated `QuestionInputFactory` to pass `writingPrompt` through. Updated `QuestionPreviewFactory` to display `writingPrompt` for Writing types. Threaded `writingPrompt` from exercise object through `SubmissionPage` → `FlatQuestion` → `QuestionInputFactory`.
- Task 4: Confirmed no schema, API, backend, or migration changes. All changes are display-only conditional rendering.
- Task 5: Created `QuestionSectionEditor.test.tsx` (5 tests), `WritingTaskEditor.test.tsx` (6 tests), added 2 tests to existing `question-preview-factory.test.tsx`. Full suite: 98 files, 965 tests, 0 failures.

### Change Log
- 2026-04-10: Story 12-9 implemented — all 5 tasks complete, all ACs satisfied.

### File List
- apps/webapp/src/features/exercises/components/WritingTaskEditor.tsx (modified — added task type selector, onSectionTypeChange prop)
- apps/webapp/src/features/exercises/components/QuestionSectionEditor.tsx (modified — hide section config + questionText for WRITING, add skill prop to MemoizedQuestionRow)
- apps/webapp/src/features/exercises/components/ExerciseEditor.tsx (modified — wire onSectionTypeChange, pass writingPrompt to preview)
- apps/webapp/src/features/submissions/components/question-inputs/WritingInput.tsx (modified — accept/display writingPrompt)
- apps/webapp/src/features/submissions/components/question-inputs/QuestionInputFactory.tsx (modified — pass writingPrompt to WritingInput)
- apps/webapp/src/features/exercises/components/question-types/QuestionPreviewFactory.tsx (modified — display writingPrompt for Writing types)
- apps/webapp/src/features/submissions/components/SubmissionPage.tsx (modified — extract writingPrompt from exercise, pass through FlatQuestion)
- apps/webapp/src/features/exercises/components/QuestionSectionEditor.test.tsx (new — 5 tests)
- apps/webapp/src/features/exercises/components/WritingTaskEditor.test.tsx (new — 6 tests)
- apps/webapp/src/features/exercises/components/question-types/question-preview-factory.test.tsx (modified — 2 tests added for writingPrompt)
