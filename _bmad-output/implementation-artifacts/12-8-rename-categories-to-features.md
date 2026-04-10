# Story 12.8: Rename "Categories" to "Features" in R11 Matching Features Editor

Status: review

## Story

As a Teacher creating a Matching Feature exercise,
I want the label "Categories" changed to "Features",
So that the terminology matches the IELTS question type name.

## Acceptance Criteria

1. All UI labels reading "Categories" in the R11 Matching Features exercise type are changed to "Features"
2. No change to the underlying data model field names (cosmetic only)

## Tasks / Subtasks

- [x] Task 1: Update editor label (AC: #1)
  - [x] In `MatchingEditor.tsx` line ~48, change `targetLabel: "Categories"` → `"Features"` in the `R11_MATCHING_FEATURES` config
- [x] Task 2: Update preview label (AC: #1)
  - [x] In `MatchingPreview.tsx` line ~14, change `targetLabel: "category"` → `"feature"` in `PREVIEW_LABELS.R11_MATCHING_FEATURES`
- [x] Task 3: Update test assertions (AC: #1)
  - [x] In `matching-editor.test.tsx` line ~69, update assertion from `"Categories"` → `"Features"`
  - [x] In `question-editor-factory.test.tsx` line ~163, update assertion from `"Categories"` → `"Features"`
- [x] Task 4: Verify no regressions (AC: #2)
  - [x] Run `pnpm --filter=webapp test` — all 950 tests pass (0 regressions)
  - [x] Manually verify R11 editor shows "Features" as column header
  - [x] Verify derived text: "Select features...", "Add features...", "N features, M to match"

## Dev Notes

**Scope:** This is a purely cosmetic UI label change. 4 files, 4 one-line changes. No backend, no schema, no data migration.

**How the label propagates:** The `targetLabel` in `MATCHING_CONFIGS` is used in multiple UI locations automatically:
- Column header: `{config.targetLabel}` → "Features"
- Select placeholder: `Select ${targetLabel.toLowerCase()}...` → "Select features..."
- Add input placeholder: `Add ${config.targetLabel.toLowerCase()}...` → "Add features..."
- Distractor badge: `{count} ${config.targetLabel.toLowerCase()}, {n} to match` → "3 features, 2 to match"
- Distractor warning: `Add more ${config.targetLabel.toLowerCase()}...` → "Add more features..."

**DO NOT modify:**
- `packages/types/src/exercises.ts` — the type code `R11_MATCHING_FEATURES` is unchanged
- Any backend files or database schema
- Any other question type configs in `MATCHING_CONFIGS` (R9, R10, R12 are separate)
- The `sourceLabel: "Items"` value — only `targetLabel` changes

### Production Files to Modify

| File | Change |
|------|--------|
| `apps/webapp/src/features/exercises/components/question-types/MatchingEditor.tsx` | Line ~48: `targetLabel: "Categories"` → `"Features"` |
| `apps/webapp/src/features/exercises/components/question-types/MatchingPreview.tsx` | Line ~14: `targetLabel: "category"` → `"feature"` |

### Test Files to Update

| File | Change |
|------|--------|
| `apps/webapp/src/features/exercises/components/question-types/matching-editor.test.tsx` | Line ~69: expect `"Features"` |
| `apps/webapp/src/features/exercises/components/question-types/question-editor-factory.test.tsx` | Line ~163: expect `"Features"` |

### Project Structure Notes

- All changes within `apps/webapp/src/features/exercises/components/question-types/` — aligned with feature-first organization
- Follows Epic 12 pattern: minimal footprint, no new dependencies, no new files
- Consistent with Story 12.7 approach (display-only change, co-located test updates)

### Previous Story Intelligence (12.7)

- Story 12.7 was also a display-only change (placeholder format) with no backend changes
- Pattern: update source files + update test assertions + run full suite
- All 945 webapp tests passed with 0 regressions
- Commit format used: `feat: description (story 12-N)`

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 12, Story 12.8 (B8)]
- [Source: apps/webapp/src/features/exercises/components/question-types/MatchingEditor.tsx — MATCHING_CONFIGS.R11_MATCHING_FEATURES]
- [Source: apps/webapp/src/features/exercises/components/question-types/MatchingPreview.tsx — PREVIEW_LABELS.R11_MATCHING_FEATURES]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References
None — clean implementation, no issues encountered.

### Completion Notes List
- All 4 one-line changes applied: 2 production files + 2 test files
- AC #1: All UI labels reading "Categories" in R11 Matching Features → "Features" ✅
- AC #2: No data model changes — cosmetic only ✅
- Full test suite: 96 files, 950 tests, 0 failures, 0 regressions
- Derived text auto-propagates: "Select features...", "Add features...", "N features, M to match"

### Change Log
- 2026-04-09: Implemented story 12-8 — renamed "Categories" to "Features" in R11 editor/preview labels and updated test assertions

### File List
- `apps/webapp/src/features/exercises/components/question-types/MatchingEditor.tsx` (modified)
- `apps/webapp/src/features/exercises/components/question-types/MatchingPreview.tsx` (modified)
- `apps/webapp/src/features/exercises/components/question-types/matching-editor.test.tsx` (modified)
- `apps/webapp/src/features/exercises/components/question-types/question-editor-factory.test.tsx` (modified)
