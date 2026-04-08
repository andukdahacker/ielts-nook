# Story 12.6: Matching Headings Duplicate Warning

Status: done

## Story

As a Teacher creating a Matching Headings exercise,
I want a validation warning if two paragraphs share the same heading,
So that I can catch unintentional duplicates before publishing.

## Acceptance Criteria

1. When two or more paragraphs are assigned the same heading, a warning message is displayed.
2. The warning identifies which paragraphs have duplicate headings.
3. The warning is non-blocking (teacher can still save/publish if intentional).

## Tasks / Subtasks

- [x] Task 1: Add duplicate heading detection logic (AC: #1, #2)
  - [x] 1.1 In `MatchingEditor.tsx`, add a `useMemo` that computes duplicate matches. For R9 (`sourceKeyType === "value"`), iterate `matches` entries and group by value. Any heading value assigned to 2+ paragraph keys is a duplicate. Return an array of `{ heading: string, paragraphs: string[] }` objects.
    ```tsx
    const duplicateMatches = useMemo(() => {
      if (config?.sourceKeyType !== "value") return [];
      const headingToSources: Record<string, string[]> = {};
      for (const [key, val] of Object.entries(matches)) {
        if (!val) continue;
        (headingToSources[val] ??= []).push(key);
      }
      return Object.entries(headingToSources)
        .filter(([, sources]) => sources.length > 1)
        .map(([heading, paragraphs]) => ({ heading, paragraphs }));
    }, [matches, config?.sourceKeyType]);
    ```
  - [x] 1.2 Place this `useMemo` after the existing `matchedIndices` memo (line 381) and before the `if (!config) return null` guard (line 383).
- [x] Task 2: Render duplicate warning UI (AC: #1, #2, #3)
  - [x] 2.1 Add a warning block after the existing distractor indicator `<div>` (after line 506), using the same inline warning pattern (amber/warning color to distinguish from the red distractor error and signal non-blocking). Include `role="alert"` for WCAG 2.1 AA screen reader announcement (architecture requires a11y compliance; precedent: `StudentProfileOverlay.tsx` uses `role="alert"` on warnings):
    ```tsx
    {duplicateMatches.length > 0 && (
      <div className="space-y-1" role="alert">
        {duplicateMatches.map(({ heading, paragraphs }) => (
          <p key={heading} className="text-xs text-amber-600">
            Paragraphs {paragraphs.join(", ")} share the same heading: "{heading}"
          </p>
        ))}
      </div>
    )}
    ```
  - [x] 2.2 The warning is purely visual — no blocking of save/publish. The `handleMatchAssignment` callback and `update()` function are not gated by this. AC #3 is satisfied by default since this is display-only.
- [x] Task 3: Add unit tests (AC: #1, #2, #3)
  - [x] 3.1 In `matching-editor.test.tsx`, add a new `describe("duplicate heading warnings")` block. **Important:** Radix Select is not testable in jsdom (see test file lines 15-17), so all tests must render with `correctAnswer` containing pre-set duplicate matches — do NOT simulate Select dropdown interactions. Tests:
    - Test: Render with `correctAnswer={{ matches: { A: "Same", B: "Same" } }}` — warning text containing "A, B" and "Same" is present.
    - Test: Render with three paragraphs sharing a heading — all three paragraph keys listed in warning.
    - Test: Re-render with non-duplicate matches — warning disappears (`queryByText(/share the same heading/)` returns null).
    - Test: Render with `sectionType="R10_MATCHING_INFORMATION"` and duplicate target values in matches — no warning appears (duplicate detection is R9-only).
    - Test: Warning container has `role="alert"` attribute for a11y.
  - [x] 3.2 Use existing test patterns: `render(<MatchingEditor sectionType="R9_MATCHING_HEADINGS" options={{...}} correctAnswer={{...}} onChange={vi.fn()} />)`, then `screen.getByText()` / `screen.queryByText()` to assert. Existing imports: `{ render, screen, fireEvent }` from `@testing-library/react`, `{ describe, it, vi, expect }` from `vitest`.
- [x] Task 4: Verify no regressions
  - [x] 4.1 Run `pnpm --filter=webapp test` — all existing tests must pass (922/922, 2 pre-existing file failures in users module unchanged).
  - [ ] 4.2 Manual test: Create R9 Matching Headings exercise, assign same heading to two paragraphs — warning should appear.
  - [ ] 4.3 Manual test: Reassign one paragraph to different heading — warning should disappear.
  - [ ] 4.4 Manual test: Verify R10/R11/R12/L3 exercise types show no duplicate warnings.
  - [ ] 4.5 Manual test: Verify save and publish still work when duplicates are present (non-blocking).

## Dev Notes

### Implementation Strategy: useMemo + Inline Warning

This is a frontend-only, single-file change to `MatchingEditor.tsx` (+ test file). The detection logic lives in a `useMemo` that recomputes on every `matches` change. The warning renders inline using the same pattern as the existing distractor warning.

### Why Only R9 (Matching Headings)

The `sourceKeyType: "value"` is unique to R9. For R10-R12 and L3, `sourceKeyType: "index"` means matches use numeric index keys (`"0"`, `"1"`) — duplicate target values are intentional (e.g., multiple statements can match the same paragraph in R10). The story specifically targets Matching Headings where each paragraph should typically have a unique heading.

### Data Model Context

For R9_MATCHING_HEADINGS:
- `sourceItems`: paragraph labels (e.g., `["A", "B", "C", "D"]`)
- `targetItems`: heading texts (e.g., `["The impact of...", "Benefits of...", "Challenges in..."]`)
- `matches`: maps paragraph label to heading text (e.g., `{ "A": "The impact of...", "B": "The impact of..." }`)
- Duplicate = two keys in `matches` sharing the same value

### Warning Color: Amber vs Red

Use `text-amber-600` (warning) rather than `text-destructive` (red/error) to visually communicate that this is a non-blocking advisory. The existing distractor warning uses `text-destructive` because insufficient distractors is a hard IELTS requirement; duplicate headings are a soft check since teachers may intentionally reuse headings.

### Performance

The `useMemo` depends on `[matches, config?.sourceKeyType]`. For R9, `matches` is a small object (typically 5-8 entries for IELTS). The detection is O(n) — negligible overhead.

### What NOT to Do

- Do NOT block save/publish when duplicates are found — AC #3 explicitly requires non-blocking.
- Do NOT add duplicate detection for R10/R11/R12/L3 — duplicate target assignments are valid for those types.
- Do NOT modify `handleMatchAssignment` or `update()` — the warning is display-only.
- Do NOT add a modal/dialog/toast — use inline text warning matching existing patterns.
- Do NOT modify `MatchingSourceRow` or `MatchingTargetRow` memoized components — detection operates on the `matches` state, not on individual rows.
- Do NOT change the debounce timing or save behavior (lesson from stories 12-1, 12-2).
- Do NOT modify any hooks, types, or backend code.
- Do NOT import new components — `text-amber-600` is a Tailwind class, no new UI library needed. Do NOT use the `Alert` component from `@workspace/ui` — the existing distractor warning in this same file uses raw `<span>` + `<Badge>`, so raw elements are the consistent pattern within MatchingEditor.

### Project Structure Notes

- **Only file to modify:** `apps/webapp/src/features/exercises/components/question-types/MatchingEditor.tsx`
- **Test file to update:** `apps/webapp/src/features/exercises/components/question-types/matching-editor.test.tsx`
- No new files needed
- No backend changes required
- No new dependencies needed
- Follows Epic 12 pattern: minimal, single-file changes

### References

- [Source: apps/webapp/src/features/exercises/components/question-types/MatchingEditor.tsx#lines 30-36] — R9_MATCHING_HEADINGS config with `sourceKeyType: "value"`
- [Source: apps/webapp/src/features/exercises/components/question-types/MatchingEditor.tsx#lines 345-364] — `handleMatchAssignment` callback (assigns heading to paragraph)
- [Source: apps/webapp/src/features/exercises/components/question-types/MatchingEditor.tsx#lines 367-381] — `matchedIndices` useMemo (place new memo after this)
- [Source: apps/webapp/src/features/exercises/components/question-types/MatchingEditor.tsx#lines 493-506] — Existing distractor warning pattern (follow this pattern)
- [Source: apps/webapp/src/features/exercises/components/question-types/matching-editor.test.tsx#lines 611-657] — Existing duplicate target tests (editor allows duplicates)
- [Source: _bmad-output/planning-artifacts/epics.md#Story 12.6] — Requirements
- [Source: packages/types/src/exercises.ts#lines 146-156] — MatchingOptions/MatchingAnswer schemas

### Previous Story Intelligence (Story 12-5)

- Story 12-5 modified `ExerciseEditor.tsx` only — no conflicts with this story's `MatchingEditor.tsx` changes.
- Test baseline: 917/917 webapp tests passing (2 pre-existing failures in users module unrelated).
- ExerciseEditor.tsx is ~1250 lines after 12-4/12-5 — this story does NOT touch ExerciseEditor.
- Epic 12 pattern: all changes scoped to single files, minimal footprint, no new dependencies.
- Sticky header structure and responsive patterns established in 12-3 — not relevant here.
- Input lag fixes from 12-1/12-2 used memoization + stable keys — MatchingEditor already has both.

### Git Intelligence

Recent Epic 12 commits:
- `7507e47` feat: stay on page after publish with Assign button (story 12-5)
- `3d58510` feat: auto-scroll to new section with race-condition fixes (story 12-4)
- `7dc7ad9` feat: sticky toolbar with responsive icons and a11y fixes (story 12-3)
- `a0a3cfa` feat: fix input lag in TFNGEditor with optimistic state and memoized question rows (story 12-2)
- `2eb5a2e` feat: fix input lag in MatchingEditor with memoization and stable keys (story 12-1)

Story 12-1 (`2eb5a2e`) is the most relevant — it established the current memoization/stable-key architecture in MatchingEditor.tsx. The `useMemo`, `useRef`, and `React.memo` patterns in that file are a direct result of 12-1.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- First test run: `getByText(/Same Heading/)` matched multiple elements (target item input + warning text). Fixed by combining into single regex: `/A, B.*share the same heading.*Same Heading/`.

### Completion Notes List

- Task 1: Added `duplicateMatches` useMemo after `matchedIndices` memo. Groups R9 matches by heading value, returns array of duplicates with paragraph keys.
- Task 2: Added amber inline warning below distractor indicator. Uses `role="alert"` for a11y. Non-blocking — no changes to save/publish logic.
- Task 3: Added 5 unit tests in `describe("duplicate heading warnings")` block: two-paragraph duplicate, three-paragraph duplicate, warning disappearance on re-render, R10 no-warning, and role="alert" a11y check.
- Task 4: 922/922 tests pass. 2 pre-existing file failures in users module unchanged from baseline.

### Change Log

- 2026-04-08: Implemented story 12-6 — duplicate heading warning for R9 Matching Headings

### File List

- `apps/webapp/src/features/exercises/components/question-types/MatchingEditor.tsx` (modified)
- `apps/webapp/src/features/exercises/components/question-types/matching-editor.test.tsx` (modified)
