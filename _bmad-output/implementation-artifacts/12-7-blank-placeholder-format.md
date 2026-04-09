# Story 12.7: Blank Placeholder Format

Status: review

## Story

As a Teacher creating fill-in-the-blank exercises,
I want blank placeholders displayed as `(1)` or `{1}` instead of `___1___`,
So that the formatting is cleaner and more recognizable.

## Acceptance Criteria

1. All exercise types that use blank placeholders render them using the new format `___1___` -> displayed as `(1)`, `(2)`, etc. in **preview and student views only**.
2. Existing exercises with `___1___` format in the database continue to work — the storage format does NOT change; only the **display/render** format changes.
3. Preview mode (teacher preview) uses the new format consistently.
4. Student submission view uses the new format consistently.
5. Editor instruction labels are updated to show the new display format while keeping the underlying `___N___` storage marker.

## Important Scope Clarification

**This story changes DISPLAY only, NOT storage.** The `___N___` pattern remains the canonical storage format in the database JSON (`options.summaryText`, `options.structure`). Changing the storage format would require a data migration of every existing exercise and break backward compatibility — that is out of scope.

The change is: everywhere the user **sees** a blank indicator (preview, student input, editor labels/placeholders), render `(N)` instead of the raw `___N___` markers or the current underline-with-tiny-number style.

## Tasks / Subtasks

- [x] Task 1: Create a shared blank format utility (AC: #1, #2)
  - [x] 1.1 Create a new file `apps/webapp/src/features/exercises/components/question-types/blank-format.ts` with:
    ```ts
    /** Regex to match ___N___ blank markers (no /g flag — safe for .match() capture groups) */
    export const BLANK_PATTERN = /___(\d+)___/;

    /** Global regex for .matchAll() and .test() — do NOT use with .match() for capture groups */
    export const BLANK_PATTERN_GLOBAL = /___(\d+)___/g;

    /** Split text by blank markers. Returns array where odd indices are blank numbers. */
    export function splitByBlanks(text: string): string[] {
      return text.split(BLANK_PATTERN);
    }

    /** Format a blank number for display: "1" -> "(1)" */
    export function formatBlankDisplay(blankNum: string): string {
      return `(${blankNum})`;
    }
    ```
  - [x] 1.2 This centralizes the regex pattern and display format in one place. If we ever change the display format again, only this file needs updating.

- [x] Task 2: Update WordBankPreview to use `(N)` format (AC: #3)
  - [x] 2.1 In `WordBankPreview.tsx` (line 16), replace the inline `/___(\d+)___/` split with `splitByBlanks()` import.
  - [x] 2.2 Replace the current blank rendering (lines 27-33) — currently renders an underline with a tiny number — with a styled `(N)` indicator:
    ```tsx
    <span
      key={idx}
      className="inline-flex items-center justify-center mx-1 font-medium text-primary"
    >
      ({part})
    </span>
    ```

- [x] Task 3: Update NoteTableFlowchartPreview to use `(N)` format (AC: #3)
  - [x] 3.1 In `NoteTableFlowchartPreview.tsx`, replace all three inline `/___(\d+)___/` splits (lines 95, 147, 189) with `splitByBlanks()`.
  - [x] 3.2 Replace `BlankInput` components in preview with `(N)` styled indicators. The current `BlankInput` renders an empty text input — in preview mode this should show `(N)` text, not an input field. Replace:
    - Note preview (line 102): `<BlankInput>` -> `<span className="font-medium text-primary">({blankNum})</span>` where `blankNum` comes from the odd-index part.
    - Table preview (line 147-151): The `isBlank` check uses `/___\d+___/` — replace with import. Render `(N)` instead of `BlankInput`. Extract the blank number from the cell: `const blankMatch = cell.match(BLANK_PATTERN); const num = blankMatch ? blankMatch[1] : "";` (use non-global `BLANK_PATTERN` for `.match()` capture groups).
    - Flowchart preview (line 198): Same pattern — `(N)` instead of `BlankInput`.
  - [x] 3.3 The `BlankInput` component (lines 65-78) can be removed since it will be unused after these changes. Also remove the now-unused imports: both `Input` (from `@workspace/ui/components/input`) and `Badge` (from `@workspace/ui/components/badge`) — `BlankInput` is the only consumer of both in this file.

- [x] Task 4: Update WordBankInput (student submission) to use `(N)` format (AC: #4)
  - [x] 4.1 In `WordBankInput.tsx` (line 28), replace inline split with `splitByBlanks()`.
  - [x] 4.2 Update the `SelectTrigger` placeholder (line 51) from `Blank ${blankNum}` to `(${blankNum})`.
  - [x] 4.3 The Select dropdown itself stays — students still pick from the word bank. Only the visual label changes.

- [x] Task 5: Update NoteTableFlowchartInput (student submission) to use `(N)` format (AC: #4)
  - [x] 5.1 In `NoteTableFlowchartInput.tsx`, replace all inline `/___(\d+)___/` splits and matches:
    - NoteContent line 84: `splitByBlanks()`
    - TableContent line 132: `cell.match(BLANK_PATTERN)` (import `BLANK_PATTERN` — non-global, safe for `.match()` capture groups)
    - FlowchartContent line 177: `splitByBlanks()`
  - [x] 5.2 Update `Input` placeholder (line 47) from `"..."` to display `(N)` format in the placeholder.

- [x] Task 6: Update editor instruction labels (AC: #5)
  - [x] 6.1 In `WordBankEditor.tsx` line 90: Change label from `"Summary Text (use ___1___, ___2___, etc. for blanks)"` to `"Summary Text (use ___1___, ___2___, etc. for blanks — displayed as (1), (2))"`.
  - [x] 6.2 In `WordBankEditor.tsx` line 95: Update placeholder text to include `(1)` display hint alongside `___1___` syntax.
  - [x] 6.3 In `NoteTableFlowchartEditor.tsx` line 262: Same label update for Note editor.
  - [x] 6.4 In `NoteTableFlowchartEditor.tsx` line 487: Same label update for Flowchart editor.
  - [x] 6.5 In `NoteTableFlowchartEditor.tsx` line 501: Update flowchart step placeholder.
  - [x] 6.6 **Do NOT change the storage format** — teachers still type `___1___` in the editor. The label just explains how it will display.

- [x] Task 7: Update NoteTableFlowchartEditor table toggle (AC: #2)
  - [x] 7.1 In `NoteTableFlowchartEditor.tsx` line 323: The `toggleCellBlank` function checks `/___\d+___/` and writes `___${next}___`. This is storage-level logic — **keep it unchanged**. Optionally import `BLANK_PATTERN` to replace the inline regex for consistency (use non-global version for `.test()`).
  - [x] 7.2 Line 332: `___${next}___` string construction stays as-is (this writes to storage).

- [x] Task 8: Update AI prompt (backend) (AC: #1)
  - [x] 8.1 In `apps/backend/src/modules/exercises/ai-prompts.ts` line 239: Keep `___1___` in the AI prompt since that's the storage format the AI must generate. Add a comment noting the display format differs.

- [x] Task 9: Add/update tests (AC: #1-#5)
  - [x] 9.1 Create `apps/webapp/src/features/exercises/components/question-types/blank-format.test.ts`:
    - Test `splitByBlanks("text ___1___ more ___2___")` returns `["text ", "1", " more ", "2", ""]`
    - Test `formatBlankDisplay("1")` returns `"(1)"`
    - Test `splitByBlanks("no blanks here")` returns `["no blanks here"]`
    - Test `splitByBlanks("")` returns `[""]`
  - [x] 9.2 Update `NoteTableFlowchartPreview` tests in `note-table-flowchart-editor.test.tsx` — these WILL break because they assert `BlankInput` output:
    - Line 157: `expect(screen.getByText("2w"))` — replace with `expect(screen.getByText("(1)"))` (note preview blank)
    - Line 177: `expect(screen.getByText("3w"))` — replace with `expect(screen.getByText("(1)"))` (table preview blank)
    - Line 192: `expect(screen.getAllByText("2w")).toHaveLength(2)` — replace with assertions for `(1)` and `(2)` (flowchart preview blanks)
    - `WordBankPreview` tests in `word-bank-editor.test.tsx` (lines 83-104) assert text fragments only — they should pass without changes, but verify.
  - [x] 9.3 Run `pnpm --filter=webapp test` — all tests must pass.

- [x] Task 10: Verify no regressions
  - [x] 10.1 Run `pnpm --filter=webapp test` — all existing tests must pass.
  - [x] 10.2 Manual test: Create R7 Word Bank exercise with `___1___` in summary — preview should show `(1)`.
  - [x] 10.3 Manual test: Create R13 Note/Table/Flowchart exercise — preview should show `(N)` format.
  - [x] 10.4 Manual test: Open an existing exercise — should render with new `(N)` display format.
  - [x] 10.5 Manual test: Student submission view — blanks display as `(N)` with input fields.
  - [x] 10.6 Manual test: Verify data saved to database still uses `___N___` format (check network tab on save).

## Dev Notes

### Implementation Strategy: Display-Only Change with Centralized Utility

This is a **rendering-layer change** across 5 frontend files (previews + student inputs), with a new shared utility file. The underlying `___N___` storage format is untouched. No backend changes needed (except an optional AI prompt comment). No database migration required.

### Why Display-Only, Not Storage Change

The `___N___` pattern is stored in the database JSON for every existing exercise (`options.summaryText` for R7, `options.structure` for R13/L1). Changing the storage format would require:
1. A database migration scanning all Question rows
2. Backend `migrateNtfAnswer()` updates
3. AI prompt changes
4. Risk of corrupting existing exercise data

Display-only change achieves the user's goal (cleaner formatting) with zero data risk.

### Affected Exercise Types

| Type Code | Name | Storage Field | Blank Format |
|-----------|------|---------------|-------------|
| R7_SUMMARY_WORD_BANK | Summary Completion (Word Bank) | `options.summaryText` | `___N___` in text |
| R13_NOTE_TABLE_FLOWCHART | Note/Table/Flowchart Completion | `options.structure` | `___N___` in text/JSON |
| L1_FORM_NOTE_TABLE | Form/Note/Table (Listening) | `options.structure` | Same as R13 |

### Files to Modify

| File | Change |
|------|--------|
| `blank-format.ts` (NEW) | Shared regex + display utility |
| `blank-format.test.ts` (NEW) | Unit tests for utility |
| `WordBankPreview.tsx` | `(N)` display in preview |
| `NoteTableFlowchartPreview.tsx` | `(N)` display in note/table/flowchart preview |
| `WordBankInput.tsx` | `(N)` display in student view |
| `NoteTableFlowchartInput.tsx` | `(N)` display in student view |
| `WordBankEditor.tsx` | Updated instruction labels |
| `NoteTableFlowchartEditor.tsx` | Updated instruction labels + import BLANK_PATTERN |

### Files NOT to Modify

| File | Reason |
|------|--------|
| `answer-utils.ts` (backend) | Grading logic — uses blank keys ("1", "2"), not display format |
| `ai-prompts.ts` (backend) | AI must generate `___N___` storage format |
| `QuestionEditorFactory.tsx` | `migrateNtfBlanks()` operates on answer structure, not display |
| `exercises.ts` (types) | Zod schemas validate structure, not display |
| `exercises.test.ts` (types) | Test data uses storage format — no change needed |
| `schema.prisma` | No schema change |

### What NOT to Do

- Do NOT change the `___N___` storage format in the database — this is a display-only change.
- Do NOT add a data migration — existing data stays as-is.
- Do NOT modify `parseBlanks()` in the editors to use a different pattern — editors still parse `___N___` from stored text.
- Do NOT change `toggleCellBlank()` to write `(N)` into the table structure — it must write `___N___`.
- Do NOT modify `handleMatchAssignment`, `update()`, or any save logic.
- Do NOT change the debounce timing or save behavior (lesson from stories 12-1, 12-2).
- Do NOT modify backend grading logic — blank keys ("1", "2") are not affected by display format.
- Do NOT import new UI components — use Tailwind classes for styling `(N)` indicators.
- Do NOT use the `Alert` component from `@workspace/ui` — follow existing inline element patterns within these files.

### Display Format Decision: `(N)` vs `{N}`

The AC says `(1)` or `{1}`. Use `(N)` (parentheses) because:
- Cleaner and more universally recognized for fill-in-the-blank
- `{N}` could be confused with template/code syntax
- IELTS exam papers use parenthetical numbering for blanks

If the user prefers `{N}`, only `formatBlankDisplay()` in `blank-format.ts` needs to change.

### Project Structure Notes

- All modified files are under `apps/webapp/src/features/exercises/` and `apps/webapp/src/features/submissions/` — standard feature directories.
- New `blank-format.ts` utility goes in `question-types/` alongside the editors that use it.
- Follows Epic 12 pattern: minimal footprint, no new dependencies.
- No backend changes, no new packages, no schema changes.

### References

- [Source: apps/webapp/src/features/exercises/components/question-types/WordBankEditor.tsx#lines 30-34] — `parseBlanks()` with `/___(\d+)___/g` regex
- [Source: apps/webapp/src/features/exercises/components/question-types/WordBankEditor.tsx#lines 90-95] — Editor label and placeholder with `___1___` text
- [Source: apps/webapp/src/features/exercises/components/question-types/NoteTableFlowchartEditor.tsx#line 48] — `BLANK_REGEX = /___(\d+)___/g` constant
- [Source: apps/webapp/src/features/exercises/components/question-types/NoteTableFlowchartEditor.tsx#lines 262, 487, 501] — Editor labels with `___1___` instructions
- [Source: apps/webapp/src/features/exercises/components/question-types/NoteTableFlowchartEditor.tsx#lines 320-334] — `toggleCellBlank()` writes `___N___` to storage (DO NOT change)
- [Source: apps/webapp/src/features/exercises/components/question-types/WordBankPreview.tsx#lines 16, 27-33] — Current preview renders underline+tiny number
- [Source: apps/webapp/src/features/exercises/components/question-types/NoteTableFlowchartPreview.tsx#lines 95, 147, 189] — Preview splits by `___N___`, renders `BlankInput`
- [Source: apps/webapp/src/features/submissions/components/question-inputs/WordBankInput.tsx#line 28] — Student view splits by `___N___`
- [Source: apps/webapp/src/features/submissions/components/question-inputs/NoteTableFlowchartInput.tsx#lines 84, 132, 177] — Student view splits/matches `___N___`
- [Source: apps/backend/src/modules/exercises/ai-prompts.ts#line 239] — AI prompt uses `___1___` instruction
- [Source: apps/backend/src/modules/exercises/answer-utils.ts#lines 57-74] — `migrateNtfAnswer()` — NOT affected (operates on answer keys, not display)
- [Source: apps/webapp/src/features/exercises/components/question-types/QuestionEditorFactory.tsx#lines 86-96, 180] — `migrateNtfBlanks()` — NOT affected
- [Source: packages/types/src/exercises.ts] — Zod schemas — NOT affected
- [Source: _bmad-output/planning-artifacts/epics.md#Story 12.7] — Requirements

### Previous Story Intelligence (Story 12-6)

- Story 12-6 modified `MatchingEditor.tsx` and its test file — no overlap with this story's files.
- Test baseline: 922/922 webapp tests passing (2 pre-existing file failures in users module unrelated).
- Epic 12 pattern: all changes scoped to minimal files, no new dependencies.
- Input lag fixes from 12-1/12-2 used memoization + stable keys — preview/input components don't have this concern.
- Lessons: Don't change debounce timing; don't modify save behavior; don't import new UI components when Tailwind suffices.

### Git Intelligence

Recent Epic 12 commits:
- `13224b5` feat: add duplicate heading warning for R9 Matching Headings (story 12-6)
- `7507e47` feat: stay on page after publish with Assign button (story 12-5)
- `3d58510` feat: auto-scroll to new section with race-condition fixes (story 12-4)
- `7dc7ad9` feat: sticky toolbar with responsive icons and a11y fixes (story 12-3)
- `a0a3cfa` feat: fix input lag in TFNGEditor with optimistic state and memoized question rows (story 12-2)
- `2eb5a2e` feat: fix input lag in MatchingEditor with memoization and stable keys (story 12-1)

No conflicts with files modified in this story. The preview and student input components haven't been touched in Epic 12.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

None — clean implementation with no blockers.

### Completion Notes List

- Created `blank-format.ts` utility with `BLANK_PATTERN`, `BLANK_PATTERN_GLOBAL`, `splitByBlanks()`, `formatBlankDisplay()`.
- Updated `WordBankPreview.tsx` — replaced underline+tiny-number rendering with `(N)` styled indicators.
- Updated `NoteTableFlowchartPreview.tsx` — removed `BlankInput` component (and unused `Input`/`Badge` imports), replaced all three sub-format previews with `(N)` text.
- Updated `WordBankInput.tsx` — student select dropdown placeholder now shows `(N)` instead of `Blank N`.
- Updated `NoteTableFlowchartInput.tsx` — student input placeholders now show `(N)`, replaced inline regex with shared imports.
- Updated editor labels in `WordBankEditor.tsx` and `NoteTableFlowchartEditor.tsx` to explain display format.
- Imported `BLANK_PATTERN` in `NoteTableFlowchartEditor.tsx` for consistency in `toggleCellBlank` and table cell render (storage logic unchanged).
- Added comment in `ai-prompts.ts` noting display vs storage format difference.
- Created `blank-format.test.ts` with 7 unit tests for the utility.
- Updated 3 existing test files: `note-table-flowchart-editor.test.tsx` (3 assertions), `QuestionInputFactory.test.tsx` (1 assertion).
- All 945 webapp tests pass, 0 regressions.

### Change Log

- 2026-04-08: Implemented story 12-7 — display-only change from `___N___` to `(N)` format across all blank placeholder previews and student inputs. No storage/backend/schema changes.

### File List

- apps/webapp/src/features/exercises/components/question-types/blank-format.ts (NEW)
- apps/webapp/src/features/exercises/components/question-types/blank-format.test.ts (NEW)
- apps/webapp/src/features/exercises/components/question-types/WordBankPreview.tsx (MODIFIED)
- apps/webapp/src/features/exercises/components/question-types/NoteTableFlowchartPreview.tsx (MODIFIED)
- apps/webapp/src/features/submissions/components/question-inputs/WordBankInput.tsx (MODIFIED)
- apps/webapp/src/features/submissions/components/question-inputs/NoteTableFlowchartInput.tsx (MODIFIED)
- apps/webapp/src/features/exercises/components/question-types/WordBankEditor.tsx (MODIFIED)
- apps/webapp/src/features/exercises/components/question-types/NoteTableFlowchartEditor.tsx (MODIFIED)
- apps/backend/src/modules/exercises/ai-prompts.ts (MODIFIED)
- apps/webapp/src/features/exercises/components/question-types/note-table-flowchart-editor.test.tsx (MODIFIED)
- apps/webapp/src/features/exercises/components/question-types/word-bank-editor.test.tsx (VERIFIED — no changes needed)
- apps/webapp/src/features/submissions/components/question-inputs/QuestionInputFactory.test.tsx (MODIFIED)
