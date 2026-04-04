# Story 11.3: Question Text Missing in Preview

Status: done

## Story

As a Teacher previewing an exercise,
I want to see question text rendered for Note Completion, Table Completion, Flowchart, Matching Headings, and Matching Sentence Endings,
so that I can verify my exercise looks correct before publishing.

## Acceptance Criteria

1. **AC1:** Note Completion question text renders correctly in preview mode.
2. **AC2:** Table Completion question text renders correctly in preview mode.
3. **AC3:** Flowchart question text renders correctly in preview mode.
4. **AC4:** Matching Headings question text renders correctly in preview mode.
5. **AC5:** Matching Sentence Endings question text renders correctly in preview mode.

## Bug Analysis

**Source:** User feedback item A3 (P1). [Source: _bmad-output/planning-artifacts/epics.md#Story 11.3]

**Root cause — `questionText` not passed to preview components:**

`QuestionPreviewFactory.tsx` renders preview components per question type. For R9/R10/R11/R12/L3 (Matching types) and R13/L1 (Note/Table/Flowchart), the factory does NOT pass `questionText` to the child components. The child components (`MatchingPreview`, `NoteTableFlowchartPreview`) don't accept it in their props interface and don't render it.

Working types like MCQ, TFNG, TextInput correctly pass `questionText={question.questionText}` and render it as `{questionIndex + 1}. {questionText}`.

Broken types render only `{questionIndex + 1}.` with no text after the number.

**Scope:** 3 source files + 1 test file. No backend, schema, or new dependencies. Student submission views (`QuestionInputFactory` in `features/submissions/`) are NOT affected — those types derive question content from `options` (sourceItems, structure), not `questionText`.

## Tasks / Subtasks

- [x] **Task 1: Add `questionText` to MatchingPreview** (AC: 4, 5)
  - [x] 1.1 Add `questionText: string` to `MatchingPreviewProps` interface (line 19)
  - [x] 1.2 Destructure `questionText` in the component function (line 28)
  - [x] 1.3 Render questionText in both the empty-state block (line 43) and the main render (line 53). Follow MCQPreview pattern: `<span className="font-medium">{questionIndex + 1}.</span> {questionText}`
  - [x] 1.4 Verify all 5 matching types (R9, R10, R11, R12, L3) route through this component

- [x] **Task 2: Add `questionText` to NoteTableFlowchartPreview** (AC: 1, 2, 3)
  - [x] 2.1 Add `questionText: string` to `NoteTableFlowchartPreviewProps` interface (line 11)
  - [x] 2.2 Destructure `questionText` in the component function (line 25)
  - [x] 2.3 Render questionText in both the empty-state block (line 31) and the main render (line 41). Same pattern as Task 1.3.
  - [x] 2.4 **Structural note:** The empty-state at line 31 uses a `<div>` with inline text (`{questionIndex + 1}. No structure configured.`), while the main render at line 41 uses a `<p>`. Use the MCQPreview `<p><span>` pattern consistently in BOTH branches for the question number + text line.

- [x] **Task 3: Pass `questionText` from QuestionPreviewFactory** (AC: 1-5)
  - [x] 3.1 Add `questionText={question.questionText}` to MatchingPreview calls at lines 73-77 (R9/R10/R11/R12 case)
  - [x] 3.2 Add `questionText={question.questionText}` to MatchingPreview call at lines 110-114 (L3 case)
  - [x] 3.3 Add `questionText={question.questionText}` to NoteTableFlowchartPreview call at lines 83-86 (R13/L1 case)

- [x] **Task 4: Update unit tests** (AC: 1-5)
  - [x] 4.1 In `question-preview-factory.test.tsx`, update the R9 test (line 79) to assert `screen.getByText("Test question")` is present
  - [x] 4.2 Update the R10 test (line 97) to assert questionText is rendered
  - [x] 4.3 Add a test for R12_MATCHING_SENTENCE_ENDINGS (currently missing entirely) that verifies questionText renders
  - [x] 4.4 Update the R13 test (line 114) to assert questionText is rendered
  - [x] 4.5 Update the L1 with-data test (line 275) to assert questionText is rendered
  - [x] 4.6 Update the L3 test (line 334) to assert questionText is rendered
  - [x] 4.7 Run `pnpm --filter=webapp test` to verify all tests pass with zero regressions

## Dev Notes

### Root Cause Detail

```tsx
// QuestionPreviewFactory.tsx — BROKEN (lines 68-78)
case "R9_MATCHING_HEADINGS":
case "R12_MATCHING_SENTENCE_ENDINGS":
  return (
    <MatchingPreview
      sectionType={sectionType}
      questionIndex={questionIndex}
      options={question.options as ...}
      // ^^^ questionText NOT passed
    />
  );

// QuestionPreviewFactory.tsx — WORKING (lines 26-35)
case "R1_MCQ_SINGLE":
  return (
    <MCQPreview
      sectionType={sectionType}
      questionText={question.questionText}  // ✓ passed
      questionIndex={questionIndex}
      options={...}
    />
  );
```

### Correct Rendering Pattern (from MCQPreview.tsx)

```tsx
<p className="text-sm">
  <span className="font-medium">{questionIndex + 1}.</span> {questionText}
</p>
```

Both `MatchingPreview` and `NoteTableFlowchartPreview` currently render only:
```tsx
<p className="text-sm font-medium">{questionIndex + 1}.</p>
```

**NoteTableFlowchartPreview empty-state (line 31) uses different structure — normalize it:**
```tsx
// Current empty-state (line 31) — inconsistent <div> with inline text:
<div className="pl-4 text-sm text-muted-foreground italic">
  {questionIndex + 1}. No structure configured.
</div>

// Fix: separate question text line from "No structure" message using the <p><span> pattern
```

### Key File Locations

| Component | Path | Lines |
|-----------|------|-------|
| QuestionPreviewFactory (3 call sites) | `apps/webapp/src/features/exercises/components/question-types/QuestionPreviewFactory.tsx` | 68-78, 80-87, 108-115 |
| MatchingPreview (add prop + render) | `apps/webapp/src/features/exercises/components/question-types/MatchingPreview.tsx` | 19-26 (interface), 43 + 53 (render) |
| NoteTableFlowchartPreview (add prop + render) | `apps/webapp/src/features/exercises/components/question-types/NoteTableFlowchartPreview.tsx` | 11-14 (interface), 31 + 41 (render) |
| MCQPreview (reference pattern) | `apps/webapp/src/features/exercises/components/question-types/MCQPreview.tsx` | 25-27 (rendering pattern) |
| Unit tests | `apps/webapp/src/features/exercises/components/question-types/question-preview-factory.test.tsx` | 79-95, 97-112, 114-130, 275-291, 334-350 |

### Bonus Coverage (Side-Effect of Fix)

R10_MATCHING_INFORMATION, R11_MATCHING_FEATURES, and L3_MATCHING also route through `MatchingPreview` (same code path at lines 68-78 and 108-115). These are fixed automatically — no extra work needed. The AC scopes to 5 types but 8 total benefit.

### Out of Scope — DiagramLabelling & WordBank

`DiagramLabellingPreview` and `WordBankPreview` also skip `questionText`, but these types derive their question content from `options` (`diagramUrl`/`labelPositions` and `summaryText`/`wordBank` respectively). The `questionText` field is typically empty or redundant for these types. Not reported in user feedback. Separate story if needed.

### Anti-Patterns to Avoid

- Do NOT change the component API beyond adding `questionText: string` — the existing `options` typing and structure is correct.
- Do NOT move questionText rendering into child sub-components (NotePreviewContent, TablePreviewContent, FlowchartPreviewContent) — it belongs at the top level of each preview component, before the type-specific content.
- Do NOT touch `DiagramLabellingPreview` or `WordBankPreview` — out of scope (see above).
- Do NOT touch student submission components in `features/submissions/` — not affected (see Bug Analysis scope note).
- Do NOT change the `baseQuestion` fixture in tests — it already has `questionText: "Test question"` which is perfect for assertions.

### Testing Standards

- Unit tests co-located at `question-preview-factory.test.tsx`
- Run: `pnpm --filter=webapp test`
- Use `@testing-library/react` with `render`/`screen`
- Assert with `screen.getByText("Test question")` — the `baseQuestion` fixture already has this value
- R12 test is completely missing — add one following the R9/R10 test pattern

### Previous Story Intelligence (11-2)

- 11-2 fixed MCQEditor with controlled inputs + stable keys. Same area (exercise question types) but different concern (editor vs preview).
- Code review found 7 items (1 High). Pattern: thorough review catches subtle issues. Ensure questionText renders in BOTH empty-state and populated-state branches.
- All 899 webapp unit tests passed after 11-2. Current baseline to maintain.

### Git Intelligence

Recent commits: `bbec091` (MCQ option fix), `717ee7d` (course drawer fix). Both are Epic 11 bug fixes. Same test patterns: no hard waits, `waitFor`/`toBeVisible` assertions, `loginAs` for E2E.

### Project Structure Notes

- Question type preview components co-located in `apps/webapp/src/features/exercises/components/question-types/`
- Unit tests co-located in same directory
- No E2E tests needed — this is a rendering fix best covered by unit tests since preview mode is a React state toggle in ExerciseEditor.tsx (line 368: `showPreview` state)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 11.3 — A3]
- [Source: apps/webapp/src/features/exercises/components/question-types/QuestionPreviewFactory.tsx — lines 68-87, 108-115]
- [Source: apps/webapp/src/features/exercises/components/question-types/MatchingPreview.tsx — lines 19-26, 43, 53]
- [Source: apps/webapp/src/features/exercises/components/question-types/NoteTableFlowchartPreview.tsx — lines 11-14, 31, 41]
- [Source: apps/webapp/src/features/exercises/components/question-types/MCQPreview.tsx — lines 6-8, 25-27 (correct pattern)]
- [Source: apps/webapp/src/features/exercises/components/question-types/question-preview-factory.test.tsx — lines 79-95, 97-112, 114-130]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

None — clean implementation, no debugging needed.

### Completion Notes List

- Added `questionText: string` prop to `MatchingPreview` and `NoteTableFlowchartPreview` components
- Rendered questionText using MCQPreview `<p><span>` pattern in both empty-state and populated-state branches
- Normalized NoteTableFlowchartPreview empty-state from inline `<div>` to consistent `<p><span>` + separate message pattern
- Passed `questionText={question.questionText}` at all 3 call sites in QuestionPreviewFactory (R9-R12 case, L3 case, R13/L1 case)
- Updated 5 existing tests to assert questionText renders (R9, R10, R13, L1 with-data, L3)
- Added 1 new test for R12_MATCHING_SENTENCE_ENDINGS (was missing entirely)
- 900/900 tests pass (baseline was 899, +1 new R12 test)
- 8 question types benefit from fix: R9, R10, R11, R12, R13, L1, L3 (+ L3 as separate call site)

### Change Log

- 2026-04-03: Implemented story 11-3 — Added questionText rendering to MatchingPreview and NoteTableFlowchartPreview preview components

### File List

- `apps/webapp/src/features/exercises/components/question-types/MatchingPreview.tsx` (modified)
- `apps/webapp/src/features/exercises/components/question-types/NoteTableFlowchartPreview.tsx` (modified)
- `apps/webapp/src/features/exercises/components/question-types/QuestionPreviewFactory.tsx` (modified)
- `apps/webapp/src/features/exercises/components/question-types/question-preview-factory.test.tsx` (modified)
