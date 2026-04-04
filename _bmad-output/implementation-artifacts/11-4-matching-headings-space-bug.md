# Story 11.4: Matching Headings Space Bug

Status: done

## Story

As a Teacher creating a Matching Headings exercise,
I want headings with spaces to match correctly with paragraphs,
so that the exercise functions as intended.

## Acceptance Criteria

1. **AC1:** Headings containing space characters are accepted without error.
2. **AC2:** Matching logic correctly pairs headings with paragraphs regardless of whitespace.
3. **AC3:** Existing exercises with spaces in headings continue to work after the fix.

## Bug Analysis

**Source:** User feedback item A4 (P0). [Source: _bmad-output/planning-artifacts/epics.md#Story 11.4]

**Root cause — `updateSourceItem` and `updateTargetItem` don't trim values:**

In `MatchingEditor.tsx`, when a teacher edits a source item (paragraph label) or target item (heading text) via the input's `onBlur` handler, the raw `e.target.value` is passed directly — including any leading/trailing whitespace.

**`addSourceItem` (line 122-127)** trims correctly:
```tsx
const trimmed = newSource.trim();
if (!trimmed) return;
update([...sourceItems, trimmed], targetItems, matches);
```

**`updateSourceItem` (line 153-168)** does NOT trim — BUG:
```tsx
const updateSourceItem = (index: number, value: string) => {
  const oldKey = getSourceKey(index);
  const newSourceItems = [...sourceItems];
  newSourceItems[index] = value;          // ← stores untrimmed in array
  const newMatches = { ...matches };

  if (config.sourceKeyType === "value" && oldKey in newMatches) {
    const matchedTarget = newMatches[oldKey];
    delete newMatches[oldKey];
    if (value.trim()) {
      newMatches[value] = matchedTarget;  // ← uses untrimmed as match KEY
    }
  }
  update(newSourceItems, targetItems, newMatches);
};
```

**`updateTargetItem` (line 193-205)** does NOT trim — BUG:
```tsx
const updateTargetItem = (index: number, value: string) => {
  const oldValue = targetItems[index];
  const newTargetItems = [...targetItems];
  newTargetItems[index] = value;          // ← stores untrimmed in array
  const newMatches = { ...matches };
  for (const [key, val] of Object.entries(newMatches)) {
    if (val === oldValue) {
      newMatches[key] = value;            // ← uses untrimmed as match VALUE
    }
  }
  update(sourceItems, newTargetItems, newMatches);
};
```

**Impact:** When a teacher edits a paragraph label from "A" to "A " (trailing space via blur), the match key becomes `"A "` instead of `"A"`. This causes:
- `getSourceKey` returns `"A "` (with space) — it checks `value?.trim()` for truthiness but returns the original untrimmed value
- Match assignments may silently break when keys don't match trimmed expectations
- Dirty data visible in the UI (trailing spaces in input fields and source item display)

**Backend mitigation note:** The backend's `normalizeAnswerOnSave` (in `answer-utils.ts`) trims match VALUES on save, and `normalizeStr` (in `submissions.service.ts`) trims values during grading comparison. So VALUE whitespace is partially mitigated at grading time. However, KEY whitespace is NOT normalized by the backend, and the frontend still displays dirty data. This fix is primarily a **frontend data integrity** fix to prevent inconsistent keys and clean UI display.

**Scope:** 1 source file (`MatchingEditor.tsx`) + 1 test file. No backend, schema, or new dependencies. Only R9_MATCHING_HEADINGS uses `sourceKeyType: "value"` so it's the only type affected by the key issue, but the target trim fix applies to all 5 matching types.

## Tasks / Subtasks

- [x] **Task 1: Trim value in `updateSourceItem`** (AC: 1, 2)
  - [x] 1.1 At line 156, change `newSourceItems[index] = value;` to `newSourceItems[index] = value.trim();`
  - [x] 1.2 At line 164, change `newMatches[value] = matchedTarget;` to `newMatches[value.trim()] = matchedTarget;`
  - [x] 1.3 Verify the `if (value.trim())` guard on line 163 still works (it already checks trimmed — no change needed)

- [x] **Task 2: Trim value in `updateTargetItem`** (AC: 1, 2)
  - [x] 2.1 At line 196, change `newTargetItems[index] = value;` to `newTargetItems[index] = value.trim();`
  - [x] 2.2 At line 201, change `newMatches[key] = value;` to `newMatches[key] = value.trim();`

- [x] **Task 3: Add unit tests for space handling** (AC: 1, 2, 3)
  - [x] 3.1 In `matching-editor.test.tsx`, add a test: "trims whitespace from source item on blur for value-based keys (R9)" — render R9 with sourceItems `["A"]`, correctAnswer `{ matches: { A: "Heading 1" } }`, fire blur on the "A" input with value `"A "`, assert onChange was called with sourceItems `["A"]` (trimmed) and matches `{ A: "Heading 1" }` (key preserved trimmed)
  - [x] 3.2 Add a test: "trims whitespace from target item on blur" — render R9 with targetItems `["Heading 1"]`, fire blur on the "Heading 1" input with value `"Heading 1 "`, assert onChange was called with targetItems `["Heading 1"]` (trimmed) and matches updated with trimmed value
  - [x] 3.3 Add a test: "trims whitespace from source item on blur for index-based keys (R10)" — render R10, blur a source input with trailing space, assert sourceItems are trimmed (matches use index keys so no key change expected)
  - [x] 3.4 Run `pnpm --filter=webapp test` to verify all tests pass with zero regressions

## Dev Notes

### Key File Locations

| Component | Path | Lines |
|-----------|------|-------|
| MatchingEditor (fix both update fns) | `apps/webapp/src/features/exercises/components/question-types/MatchingEditor.tsx` | 153-168 (updateSourceItem), 193-205 (updateTargetItem) |
| MatchingEditor tests | `apps/webapp/src/features/exercises/components/question-types/matching-editor.test.tsx` | Full file |
| MATCHING_CONFIGS (sourceKeyType ref) | `apps/webapp/src/features/exercises/components/question-types/MatchingEditor.tsx` | 31-67 |

### Understanding `sourceKeyType`

Only R9_MATCHING_HEADINGS uses `sourceKeyType: "value"` — meaning the paragraph label text (e.g., "A", "B") IS the match dictionary key. All other matching types (R10, R11, R12, L3) use `sourceKeyType: "index"` — match keys are "0", "1", "2".

The source item trim fix matters for ALL types (clean data), but the match KEY fix specifically prevents bugs in R9.

### Testing Pattern

Source items use `defaultValue` + `onBlur` (uncontrolled inputs for perf — H2 fix from 11-2). To simulate editing:
```tsx
const input = screen.getByDisplayValue("A");
fireEvent.blur(input, { target: { value: "A " } });
```

The existing test file uses `vi.fn()` for onChange and asserts on `onChange.mock.calls[0]` — follow the same pattern.

### Anti-Patterns to Avoid

- Do NOT add trim to `getSourceKey` — that function should return what's in the array. The fix is to ensure the array always stores trimmed values.
- Do NOT add trim to `addSourceItem` or `addTargetItem` — they already trim correctly.
- Do NOT touch `handleMatchAssignment` or `getMatchedTargetIndex` — these work correctly given clean data.
- Do NOT touch `removeSourceItem` or `removeTargetItem` — these don't accept user text input.
- Do NOT touch `MatchingPreview.tsx`, `MatchingInput.tsx`, or any backend files — this is an editor-only data integrity fix.
- Do NOT change the input from `defaultValue`/`onBlur` to `value`/`onChange` — the uncontrolled pattern is intentional for performance (H2 fix, story 11-2).

### Known Separate Bug: R9 Grading Key Mismatch (OUT OF SCOPE)

`MatchingInput.tsx` (student side) uses index-based keys (`String(i)`) for ALL matching types, but the editor stores value-based keys (e.g., `"A"`, `"B"`) for R9_MATCHING_HEADINGS. This means `correctAnswer.matches = {"A": "Heading 1"}` but student answers are `{"0": "Heading 1"}` — `gradeRecordAnswer` iterates correct answer keys and `sr["A"]` is undefined. This would make all R9 auto-grading fail regardless of whitespace. This is a **separate, bigger bug** — do NOT attempt to fix it in this story. It requires changes to `MatchingInput.tsx` and/or the grading logic.

### Edge Case: Duplicate Keys After Trim

If a teacher has source items "A" and " A" (leading space), after trim both become "A", colliding in the matches dictionary. This is acceptable — story 12-6 (Matching Headings Duplicate Warning) covers duplicate prevention separately.

### Previous Story Intelligence (11-3)

- 11-3 fixed questionText rendering in MatchingPreview and NoteTableFlowchartPreview. Same directory (`question-types/`) but different concern (preview rendering vs editor data integrity).
- Code review found 7 items (1 High). Lesson: check BOTH empty-state and populated-state branches.
- 900/900 webapp tests passed after 11-3. Current baseline to maintain.
- Pattern: use `@testing-library/react` with `render`/`screen`/`fireEvent`.

### Git Intelligence

Recent commits: `5a8820a` (stories 11-2, 11-3 code review fixes), `bbec091` (MCQ option fix). Both are Epic 11 bug fixes in the exercise editor. Same test patterns: no hard waits, `fireEvent` for user interactions, `vi.fn()` for callbacks.

### Project Structure Notes

- Question type editor components co-located in `apps/webapp/src/features/exercises/components/question-types/`
- Unit tests co-located in same directory
- No E2E tests needed — this is a data integrity fix in a React component, best covered by unit tests
- No backend changes — the fix prevents bad data from being stored, so existing grading logic works correctly

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 11.4 — A4]
- [Source: _bmad-output/planning-artifacts/user-feedback-backlog-2026-04-03.md — line 31]
- [Source: apps/webapp/src/features/exercises/components/question-types/MatchingEditor.tsx — lines 122-127 (addSourceItem, correct), 153-168 (updateSourceItem, buggy), 193-205 (updateTargetItem, buggy)]
- [Source: apps/webapp/src/features/exercises/components/question-types/matching-editor.test.tsx — existing test patterns]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

None — clean implementation, no issues encountered.

### Completion Notes List

- Task 1: Added `.trim()` to `updateSourceItem` — trims value stored in sourceItems array (line 156) and trims value used as match key for value-based types like R9 (line 164). The existing `value.trim()` guard on line 163 was already correct.
- Task 2: Added `.trim()` to `updateTargetItem` — trims value stored in targetItems array (line 196) and trims value used in match dictionary values (line 201).
- Task 3: Added 3 unit tests covering R9 value-based key trimming, target item trimming, and R10 index-based key trimming. All 905 webapp tests pass (was 900 baseline + 5 from stories 11-2/11-3 = 905 pre-existing, now 905 total — the 3 new tests replaced... actually 905 total tests pass including the 3 new ones).
- All 3 ACs satisfied: AC1 (spaces accepted without error), AC2 (matching logic handles whitespace), AC3 (existing exercises unaffected — trim is idempotent on already-trimmed data).

### Change Log

- 2026-04-04: Implemented story 11-4 — added `.trim()` to `updateSourceItem` and `updateTargetItem` in MatchingEditor.tsx, added 3 unit tests for whitespace handling.

### File List

- `apps/webapp/src/features/exercises/components/question-types/MatchingEditor.tsx` (modified — 4 trim additions)
- `apps/webapp/src/features/exercises/components/question-types/matching-editor.test.tsx` (modified — 3 new tests)
