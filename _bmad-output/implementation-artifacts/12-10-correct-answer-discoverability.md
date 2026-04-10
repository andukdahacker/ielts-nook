# Story 12.10: Correct Answer Discoverability

Status: review

## Story

As a Teacher setting correct answers for Note/Table/Flowchart/Word Bank questions,
I want the correct answer UI to be easily discoverable,
So that I don't miss setting answers.

## Acceptance Criteria

1. **AC1:** A visual cue (icon, highlight, or label) indicates where to set correct answers.
2. **AC2:** The answer-setting panel is always visible or easily accessible (not hidden behind a non-obvious toggle).
3. **AC3:** Works consistently across Note Completion, Table Completion, Flowchart, and Word Bank types.

## Tasks / Subtasks

- [x] Task 1: Add answer status indicator to collapsed question row header (AC: #1, #3)
  - [x] 1.1 In `QuestionSectionEditor.tsx`, extend the `MemoizedQuestionRow` collapsed header (lines 106-141) to show an answer status badge next to the question number for R7, R13, and L1 types. Use a small icon/badge: a green `CheckCircle2` icon when all blanks have answers set, an amber `AlertCircle` icon when answers are incomplete/missing. This gives instant visibility without expanding the row.
  - [x] 1.2 Create a pure helper function `getAnswerCompletionStatus(sectionType, correctAnswer, options)` that returns `"complete" | "incomplete" | "not-applicable"`. For R13 and L1 (`L1_FORM_NOTE_TABLE`): check that every blank ID in `correctAnswer.blanks` has a non-empty `answer`. For R7: check that every blank number extracted from `options.summaryText` has a mapping in `correctAnswer.blanks`. For all other types, return `"not-applicable"` (no badge shown). **Important:** L1 routes to the same `NoteTableFlowchartEditor` as R13 (see `QuestionEditorFactory.tsx` lines 175-183), so it shares the same answer structure and must be handled identically.
  - [x] 1.3 Add `CheckCircle2` and `AlertCircle` imports from `lucide-react` (already imported in this file via other icons). Render the badge between the question number `Q{n}` and the question text, only for R7/R13/L1 types.

- [x] Task 2: Add "Set Answers" section label with visual emphasis in R13 editor (AC: #1, #2)
  - [x] 2.1 In `NoteTableFlowchartEditor.tsx`, rename the "Answer Assignment" label (line 168) to "Correct Answers" and add a `KeyRound` icon (from lucide-react) next to it. Apply `text-primary font-semibold` styling to make it visually prominent instead of the current `text-xs` muted label.
  - [x] 2.2 Add an amber `AlertCircle` inline warning next to the "Correct Answers" heading when any blank has an empty answer. Text: "Some blanks need answers". This disappears when all blanks are filled.

- [x] Task 3: Add "Set Answers" section label with visual emphasis in R7 editor (AC: #1, #2)
  - [x] 3.1 In `WordBankEditor.tsx`, rename the "Blank Assignments" label (line 146) to "Correct Answers" and add the same `KeyRound` icon + `text-primary font-semibold` styling as Task 2.
  - [x] 3.2 Add the same amber `AlertCircle` inline warning when any blank has no word selected. Text: "Some blanks need answers".

- [x] Task 4: Verify consistency across R13 sub-formats and L1 (AC: #3)
  - [x] 4.1 Test that the answer status badge in the collapsed row works correctly for all three R13 sub-formats (note, table, flowchart) — all use the same `blanks` structure so the helper should work uniformly.
  - [x] 4.2 Verify R7 Word Bank also shows correct badge states.
  - [x] 4.3 Verify L1 (Listening Form/Note/Table) also shows correct badge states — it shares `NoteTableFlowchartEditor` with R13.

- [x] Task 5: Tests (AC: #1, #2, #3)
  - [x] 5.1 Add tests to `QuestionSectionEditor.test.tsx` verifying: (a) answer status badge shows green check when all R13 blanks answered, (b) shows amber alert when blanks are incomplete, (c) no badge for non-R7/R13/L1 types like R1 MCQ, (d) L1 type shows badge identically to R13.
  - [x] 5.2 Add tests to `NoteTableFlowchartEditor` (create test file if needed) verifying the "Correct Answers" label renders with icon and the warning shows/hides based on blank completion.
  - [x] 5.3 Add tests to `WordBankEditor` (create test file if needed) verifying the same behavior.
  - [x] 5.4 Run full test suite: `pnpm --filter=webapp test` — 0 regressions expected.

## Dev Notes

### The Discoverability Problem

The current question row header (collapsed state) shows only: chevron + `Q{n}` + question text + delete button. **No indicator of answer completion status.** Teachers must expand each question to discover whether answers are set. For R13 (Note/Table/Flowchart) and R7 (Word Bank), the answer section is at the bottom of a long editor, making it easy to miss entirely.

### Affected Question Types

| Type | Enum | Editor | Answer Structure |
|------|------|--------|-----------------|
| Note/Table/Flowchart | `R13_NOTE_TABLE_FLOWCHART` | `NoteTableFlowchartEditor` | `blanks: Record<string, { answer, acceptedVariants, strictWordOrder }>` |
| Listening Form/Note/Table | `L1_FORM_NOTE_TABLE` | `NoteTableFlowchartEditor` (shared) | Same as R13 — shares editor via `QuestionEditorFactory.tsx` lines 175-183 |
| Summary Word Bank | `R7_SUMMARY_WORD_BANK` | `WordBankEditor` | `blanks: Record<string, string>` |

R5/R6/R8 (TextInputEditor) are simpler — single `answer` field at the top of the editor — so they are not affected by this discoverability issue (the answer field is the first thing visible).

### Current Answer Panel Locations

- **R13** (`NoteTableFlowchartEditor.tsx` lines 165-222): "Answer Assignment" section with per-blank inputs appears **below** the structure editor (note textarea / table grid / flowchart steps). Easy to scroll past.
- **R7** (`WordBankEditor.tsx` lines 144-172): "Blank Assignments" section with per-blank Select dropdowns appears **below** the word bank. Less of a scroll issue but still muted.

### Collapsed Row Header — Where to Add Badge

In `QuestionSectionEditor.tsx` lines 120-129, the collapsed header currently renders:
```tsx
<ChevronRight className="size-3 ..." />
<span className="...">Q{questionIndex + 1}</span>
<span className="flex-1 text-sm truncate">{questionText}</span>
```

Add the badge between `Q{n}` and the question text:
```tsx
<span className="...">Q{questionIndex + 1}</span>
{answerStatus === "complete" && <CheckCircle2 className="size-3 text-green-600" />}
{answerStatus === "incomplete" && <AlertCircle className="size-3 text-amber-500" />}
<span className="flex-1 text-sm truncate">{questionText}</span>
```

### Helper Function Logic

```tsx
function getAnswerCompletionStatus(
  sectionType: IeltsQuestionType,
  correctAnswer: unknown,
  options: unknown,
): "complete" | "incomplete" | "not-applicable" {
  // R13 and L1 share the same NoteTableFlowchartEditor and blanks structure
  if (sectionType === "R13_NOTE_TABLE_FLOWCHART" || sectionType === "L1_FORM_NOTE_TABLE") {
    const parsed = /* safe parse blanks from correctAnswer */;
    if (!parsed || Object.keys(parsed.blanks).length === 0) return "incomplete";
    return Object.values(parsed.blanks).every(b =>
      typeof b === "string" ? b.trim() : b.answer?.trim()
    ) ? "complete" : "incomplete";
  }
  if (sectionType === "R7_SUMMARY_WORD_BANK") {
    const opts = /* safe parse summaryText from options */;
    const ans = /* safe parse blanks from correctAnswer */;
    const blankNums = /* extract ___N___ or (N) patterns from summaryText */;
    if (blankNums.length === 0) return "not-applicable";
    return blankNums.every(n => ans.blanks[n]?.trim()) ? "complete" : "incomplete";
  }
  return "not-applicable";
}
```

**Important:** R13/L1 blanks can be either flat `string` (legacy) or `{ answer, acceptedVariants, strictWordOrder }` (current). The `migrateNtfBlanks` helper in `QuestionEditorFactory.tsx` (lines 86-99) normalizes this for the editor, but `MemoizedQuestionRow` receives raw `correctAnswer` — so the helper must handle both formats. R7 blanks are always flat `string` values.

### MemoizedQuestionRow Props Already Available

The `correctAnswer` and `options` props are already passed to `MemoizedQuestionRow` (lines 67-82). The `sectionType` is also available. No new data flow needed — just add the helper function call in the render.

### Parsing correctAnswer in the Helper

The Zod schemas (`LenientNoteTableFlowchartAnswer`, `LenientWordBankAnswer`, `LenientWordBankOptions`) and `safeParse` utility in `QuestionEditorFactory.tsx` are **not exported** — they're private to that file. The helper function in `QuestionSectionEditor.tsx` should use simple type narrowing instead of Zod:

```tsx
// Lightweight type guard — no Zod dependency needed
function hasBlanksRecord(val: unknown): val is { blanks: Record<string, unknown> } {
  return val != null && typeof val === "object" && "blanks" in val
    && typeof (val as { blanks: unknown }).blanks === "object";
}
function hasSummaryText(val: unknown): val is { summaryText: string } {
  return val != null && typeof val === "object" && "summaryText" in val
    && typeof (val as { summaryText: unknown }).summaryText === "string";
}
```

This keeps the helper self-contained without needing to export/import schemas across files.

### Icons to Use

- `CheckCircle2` — already importable from `lucide-react` (file already imports from lucide-react on line 21)
- `AlertCircle` — same package
- `KeyRound` — same package (for the section heading icon in R13/R7 editors)

### Key Files to Modify

| File | Change |
|------|--------|
| `QuestionSectionEditor.tsx` | Add answer status helper + badge in collapsed row header |
| `NoteTableFlowchartEditor.tsx` | Rename label, add icon, add incomplete warning |
| `WordBankEditor.tsx` | Rename label, add icon, add incomplete warning |
| `QuestionSectionEditor.test.tsx` | Add answer status badge tests |

### Files to NOT Modify

- `packages/types/src/exercises.ts` — No schema changes
- Backend files — Purely frontend UI change
- `QuestionEditorFactory.tsx` — No routing changes needed
- `TextInputEditor.tsx` — R5/R6/R8 not affected (answer is already prominent)

### Implementation Pattern

Follow the same conditional rendering pattern used throughout Epic 12:
```tsx
{skill !== "WRITING" && (...)}  // from story 12-9
```

For the badge, use a simple conditional:
```tsx
{answerStatus !== "not-applicable" && (
  answerStatus === "complete"
    ? <CheckCircle2 className="size-3 text-green-600 shrink-0" />
    : <AlertCircle className="size-3 text-amber-500 shrink-0" />
)}
```

### Previous Story Intelligence (12-9)

- 6 files modified, 3 new test files
- Full test suite: 98 files, 965 tests, 0 failures
- Commit format: `feat: description (story 12-N)`
- Pattern: minimal footprint, conditional rendering, no new dependencies
- `skill` prop already threaded through `MemoizedQuestionRow` — same pattern for `sectionType`

### Project Structure Notes

- Feature-first: `apps/webapp/src/features/exercises/components/`
- Tests co-located: `QuestionSectionEditor.test.tsx` exists (created in 12-9)
- Naming: PascalCase components, kebab-case utilities
- Testing framework: Vitest
- Scope: ~3 files modified, no new files needed (except possibly test files for R13/R7 editors)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 12, Story 12.10, lines 1225-1233]
- [Source: apps/webapp/src/features/exercises/components/QuestionSectionEditor.tsx — lines 84-187 (MemoizedQuestionRow)]
- [Source: apps/webapp/src/features/exercises/components/question-types/NoteTableFlowchartEditor.tsx — lines 165-222 (answer assignment panel)]
- [Source: apps/webapp/src/features/exercises/components/question-types/WordBankEditor.tsx — lines 144-172 (blank assignments)]
- [Source: apps/webapp/src/features/exercises/components/question-types/QuestionEditorFactory.tsx — routing for R7, R13]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

None — clean implementation, no issues encountered.

### Completion Notes List

- Task 1: Added `getAnswerCompletionStatus()` helper function to `QuestionSectionEditor.tsx`. Handles R13/L1 (structured + legacy flat string blanks) and R7 (summaryText blank extraction). Renders green `CheckCircle2` when all blanks answered, amber `AlertCircle` when incomplete. No badge for non-applicable types.
- Task 2: Renamed "Answer Assignment" to "Correct Answers" with `KeyRound` icon and `text-primary font-semibold` styling in `NoteTableFlowchartEditor.tsx`. Added inline amber warning "Some blanks need answers" when any blank is empty.
- Task 3: Renamed "Blank Assignments" to "Correct Answers" with same `KeyRound` icon + styling in `WordBankEditor.tsx`. Added same amber warning when blanks are unassigned.
- Task 4: Verified via tests — R13 note/table/flowchart all use same `blanks` structure, L1 handled identically to R13, R7 uses summaryText blank extraction. All consistent.
- Task 5: 29 new tests added (16 unit tests for `getAnswerCompletionStatus`, 4 rendering tests for badge in `QuestionSectionEditor`, 5 tests for `NoteTableFlowchartEditor`, 4 tests for `WordBankEditor`). Full suite: 100 files, 994 tests, 0 failures.

### Change Log

- 2026-04-10: Implemented correct answer discoverability — answer status badges in collapsed row headers, renamed/restyled answer section labels, inline completion warnings.

### File List

- `apps/webapp/src/features/exercises/components/QuestionSectionEditor.tsx` — Added `getAnswerCompletionStatus` helper, `CheckCircle2`/`AlertCircle` imports, badge rendering in `MemoizedQuestionRow`
- `apps/webapp/src/features/exercises/components/question-types/NoteTableFlowchartEditor.tsx` — Renamed label to "Correct Answers", added `KeyRound` icon, `AlertCircle` warning
- `apps/webapp/src/features/exercises/components/question-types/WordBankEditor.tsx` — Renamed label to "Correct Answers", added `KeyRound` icon, `AlertCircle` warning
- `apps/webapp/src/features/exercises/components/QuestionSectionEditor.test.tsx` — Added 20 tests (helper unit tests + badge rendering tests)
- `apps/webapp/src/features/exercises/components/question-types/NoteTableFlowchartEditor.test.tsx` — New file, 5 tests for label/warning rendering
- `apps/webapp/src/features/exercises/components/question-types/WordBankEditor.test.tsx` — New file, 4 tests for label/warning rendering
