# Story 3.3: Reading Question Types - Matching (R9-R12)

Status: done

## Story

As a Teacher,
I want to create IELTS Matching question types (R9-R12) with type-specific editors and previews,
so that my students can practice paragraph matching, feature matching, and sentence ending questions.

## Acceptance Criteria

1. **AC1: Matching Headings (R9)** - When section type is R9_MATCHING_HEADINGS, teacher creates a list of headings (more headings than paragraphs as distractors). Teacher links each paragraph letter (A, B, C...) to the correct heading. Student preview shows a dropdown per paragraph to select a heading. Auto-grade: exact match per paragraph.
2. **AC2: Matching Information (R10)** - When section type is R10_MATCHING_INFORMATION, teacher creates statement items and links each to a paragraph letter. Student preview shows a dropdown per statement to select a paragraph. Auto-grade: exact match per statement.
3. **AC3: Matching Features (R11)** - When section type is R11_MATCHING_FEATURES, teacher creates items (e.g., researchers, dates) and features (e.g., findings, theories). Teacher maps each item to a feature. Student preview shows a dropdown per item to select a feature. Auto-grade: exact match per item.
4. **AC4: Matching Sentence Endings (R12)** - When section type is R12_MATCHING_SENTENCE_ENDINGS, teacher creates sentence beginnings and a list of endings (more endings than beginnings as distractors). Teacher links each beginning to its correct ending. Student preview shows a dropdown per sentence beginning to select an ending. Auto-grade: exact match per beginning.
5. **AC5: Distractor Management** - For all matching types (R9-R12), teacher can add extra options (distractors) that are not correct answers. The number of options must exceed the number of items to match (enforced in editor UI with validation message).

## Tasks / Subtasks

### Backend Tasks

- [x] **Task 1: Add Unified Matching Zod Schemas** (AC: #1-5)
  - [x] 1.1 Add `MatchingOptionsSchema` to `packages/types/src/exercises.ts` — `{ sourceItems: string[], targetItems: string[] }` where `sourceItems` are the items being matched (paragraphs/statements/items/beginnings) and `targetItems` are the options to match against (headings/paragraphs/features/endings, including distractors). Both arrays require `.min(1)`.
  - [x] 1.2 Add `MatchingAnswerSchema` — `{ matches: Record<string, string> }` mapping source item index (0-based string) to the selected target item text. For R9 specifically, keys are paragraph letters (A, B, C) instead of indices.
  - [x] 1.3 Add R9-R12 entries to `QuestionOptionsSchema` discriminated union (after line 171, before closing bracket). All four types use the same `MatchingOptionsSchema` and `MatchingAnswerSchema`.
  - [x] 1.4 Add unit tests for new schemas in `packages/types/src/exercises.test.ts` — valid and invalid inputs for each R9-R12 type, including empty arrays, missing fields.

- [ ] **Task 2: Add matching answer utility** (AC: #1-4) — DEFERRED to Epic 5 (not needed for editor/preview)
  - [ ] 2.1 Add `matchesExactMapping(studentMapping: Record<string, string>, correctMapping: Record<string, string>): { correct: number, total: number }` to `answer-utils.ts`
  - [ ] 2.2 Unit tests for matching answer utility

### Frontend Tasks

- [x] **Task 3: Create MatchingEditor component** (AC: #1-5) — Target: >=80% line coverage
  - [x] 3.1 Create `apps/webapp/src/features/exercises/components/question-types/MatchingEditor.tsx` — A **single shared editor** for all R9-R12 types, parameterized by `sectionType`
  - [x] 3.2 **R9 Mode (MATCHING_HEADINGS):** Left column = paragraph letter list (manually entered by teacher, e.g. A, B, C, D, E). Right column = heading list (add/remove/edit). Mapping = dropdown per paragraph to select heading.
  - [x] 3.3 **R10 Mode (MATCHING_INFORMATION):** Left column = statement list (add/remove/edit). Right column = paragraph letters (manually entered). Mapping = dropdown per statement to select paragraph.
  - [x] 3.4 **R11 Mode (MATCHING_FEATURES):** Left column = items list (add/remove/edit). Right column = features list (add/remove/edit). Mapping = dropdown per item to select feature.
  - [x] 3.5 **R12 Mode (MATCHING_SENTENCE_ENDINGS):** Left column = sentence beginnings (add/remove/edit). Right column = endings list (add/remove/edit, includes distractors). Mapping = dropdown per beginning to select ending.
  - [x] 3.6 Distractor indicator: Badge showing "X options, Y to match" count. Validation warning if `targetItems.length <= sourceItems.length`: "Add more options — matching questions need extra choices as distractors."
  - [x] 3.7 Handle null options/correctAnswer gracefully (legacy question support — render empty form state)

- [x] **Task 4: Create MatchingPreview component** (AC: #1-5) — Target: >=80% line coverage
  - [x] 4.1 Create `apps/webapp/src/features/exercises/components/question-types/MatchingPreview.tsx` — Shared preview for all R9-R12 types
  - [x] 4.2 **R9 Preview:** Numbered paragraph letters with disabled dropdown showing heading options
  - [x] 4.3 **R10 Preview:** Numbered statements with disabled dropdown showing paragraph letter options
  - [x] 4.4 **R11 Preview:** Numbered items with disabled dropdown showing feature options
  - [x] 4.5 **R12 Preview:** Numbered sentence beginnings with disabled dropdown showing ending options

- [x] **Task 5: Integrate into factory components** (AC: #1-5)
  - [x] 5.1 Add R9-R12 cases to `QuestionEditorFactory.tsx` switch statement (after line 98, before default) — all dispatch to `MatchingEditor`. Add `import { MatchingEditor } from "./MatchingEditor"` after line 6.
  - [x] 5.2 Add single lenient parsing schema in `QuestionEditorFactory.tsx` (after line 40): `LenientMatchingOptions = z.object({ sourceItems: z.array(z.string()), targetItems: z.array(z.string()) })` and `LenientMatchingAnswer = z.object({ matches: z.record(z.string(), z.string()) })`
  - [x] 5.3 Add R9-R12 cases to `QuestionPreviewFactory.tsx` switch statement (after line 57, before default) — all dispatch to `MatchingPreview`. Add `import { MatchingPreview } from "./MatchingPreview"` after line 5. Cast: `question.options as { sourceItems: string[]; targetItems: string[] } | null`

### Testing Tasks

- [x] **Task 6: Backend Tests** (AC: #1-5)
  - [x] 6.1 Unit tests for `MatchingOptionsSchema` and `MatchingAnswerSchema` — valid inputs, empty arrays, missing fields
  - [x] 6.2 Unit tests for all R9-R12 entries in `QuestionOptionsSchema` discriminated union
  - [ ] 6.3 Unit tests for `matchesExactMapping` utility — DEFERRED with Task 2
  - [x] 6.4 Run: `pnpm --filter=backend test` — 321 passed

- [x] **Task 7: Frontend Tests** (AC: #1-5) — Target: >=80% line coverage for new components
  - [x] 7.1 Component tests for MatchingEditor — add/remove source/target items, assign mappings via Select, distractor validation warning, null handling, all 4 sectionType modes
  - [x] 7.2 Component tests for MatchingPreview — correct rendering per type (R9-R12), null options handling
  - [x] 7.3 Update existing R9 fallback test in `question-editors.test.tsx` — verify MatchingEditor renders instead of the "No editor available" fallback message
  - [x] 7.4 Factory integration tests — verify R9-R12 dispatch to correct components in both editor and preview factories
  - [x] 7.5 Run: `pnpm --filter=webapp test` — 268 passed

- [x] **Task 8: Schema Sync** (AC: all)
  - [x] 8.1 No new API endpoints — schema sync not required
  - [x] 8.2 Verified no new routes added

## Dev Notes

### Architecture Compliance

**Backend Pattern (Route -> Controller -> Service):**
- NO new routes, controllers, or services needed. The existing question CRUD in `sections.service.ts` already stores arbitrary JSON in `options` and `correctAnswer` fields via `toJsonValue()`.
- The only backend changes are Zod type-helper schemas in `packages/types/src/exercises.ts` and optional answer utilities in `answer-utils.ts`.

**Frontend Pattern (Feature-First):**
- Follow exact patterns from story 3.2 editors/previews.
- Hooks: Reuse `use-sections.ts` — `updateQuestion` mutation already exists (lines 100-123). DO NOT recreate.
- Components: Use `@workspace/ui` shadcn components (`Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `Input`, `Button`, `Badge`, `Label`).
- Feedback: `toast.success()` / `toast.error()` from `sonner`.
- Icons: `lucide-react` (`Plus`, `Trash2`, `GripVertical`, `Link`, `Unlink`).

### Multi-Tenancy Requirements

- ALL database queries MUST go through `getTenantedClient(this.prisma, centerId)`.
- Questions inherit `centerId` from the exercise's center scope — already set in `sections.service.ts`.
- NO new Prisma models or columns needed — `Question.options` and `Question.correctAnswer` are already `Json?` columns.

### Database Schema — NO CHANGES NEEDED

The existing schema already supports this story:
- `Question.options Json?` — stores matching options (`sourceItems` and `targetItems` arrays)
- `Question.correctAnswer Json?` — stores mapping structure (`matches: Record<string, string>`)
- `QuestionSection.sectionType IeltsQuestionType` — R9-R12 enum values already exist in the Prisma schema (lines 397-400)
- `Question.wordLimit Int?` — not used for matching types (set to null)

**NO Prisma schema changes. NO migration. NO `db:push` needed.**

### Unified JSON Structure for All Matching Types

All R9-R12 types use the **same JSON shape** with generic field names. The `sectionType` enum determines the semantic meaning:

```json
{
  "options": {
    "sourceItems": ["...items being matched..."],
    "targetItems": ["...options to match against (includes distractors)..."]
  },
  "correctAnswer": {
    "matches": {
      "sourceKey": "targetValue",
      "...": "..."
    }
  }
}
```

**R9_MATCHING_HEADINGS:**
```json
{
  "options": {
    "sourceItems": ["A", "B", "C", "D", "E"],
    "targetItems": [
      "The impact of climate change",
      "Economic growth in developing nations",
      "Solutions for urban planning",
      "Educational reform policies",
      "Healthcare system challenges",
      "Technology and social change",
      "Environmental conservation efforts"
    ]
  },
  "correctAnswer": {
    "matches": {
      "A": "The impact of climate change",
      "B": "Economic growth in developing nations",
      "C": "Solutions for urban planning",
      "D": "Educational reform policies",
      "E": "Healthcare system challenges"
    }
  }
}
```
`sourceItems` = paragraph letters. `targetItems` = headings (7 headings for 5 paragraphs = 2 distractors). Match keys are paragraph letters.

**R10_MATCHING_INFORMATION:**
```json
{
  "options": {
    "sourceItems": [
      "a reference to the size of the population",
      "an explanation of the__(process)",
      "a description of the__(event)"
    ],
    "targetItems": ["A", "B", "C", "D", "E", "F"]
  },
  "correctAnswer": {
    "matches": {
      "0": "C",
      "1": "A",
      "2": "E"
    }
  }
}
```
`sourceItems` = statements. `targetItems` = paragraph letters (more paragraphs than statements). Match keys are 0-based indices.

**R11_MATCHING_FEATURES:**
```json
{
  "options": {
    "sourceItems": ["Dr. Smith", "Prof. Jones", "Dr. Lee", "Prof. Chen"],
    "targetItems": ["Supports Theory X", "Opposes Theory X", "Neutral"]
  },
  "correctAnswer": {
    "matches": {
      "0": "Supports Theory X",
      "1": "Opposes Theory X",
      "2": "Neutral",
      "3": "Supports Theory X"
    }
  }
}
```
`sourceItems` = items to classify. `targetItems` = features. Multiple items CAN map to the same feature. Match keys are 0-based indices.

**R12_MATCHING_SENTENCE_ENDINGS:**
```json
{
  "options": {
    "sourceItems": [
      "The research team discovered that",
      "According to the latest findings",
      "The study concluded that"
    ],
    "targetItems": [
      "climate change accelerated in the last decade.",
      "new policies were needed for conservation.",
      "the population growth rate had slowed.",
      "renewable energy sources showed promise.",
      "economic factors played a minor role."
    ]
  },
  "correctAnswer": {
    "matches": {
      "0": "climate change accelerated in the last decade.",
      "1": "new policies were needed for conservation.",
      "2": "the population growth rate had slowed."
    }
  }
}
```
`sourceItems` = sentence beginnings. `targetItems` = endings (5 endings for 3 beginnings = 2 distractors). Match keys are 0-based indices.

### Match Key Convention

- **R9 (Matching Headings):** Keys are paragraph letters (A, B, C...) matching the `sourceItems` values directly.
- **R10, R11, R12:** Keys are 0-based string indices ("0", "1", "2"...) corresponding to `sourceItems` array positions.

### Existing Code to Extend (DO NOT Reinvent)

| What | Location | Action |
|------|----------|--------|
| Question CRUD | `sections.service.ts` | No change — already handles `createQuestion()`, `updateQuestion()` with `toJsonValue()` for Json fields |
| Factory dispatch | `QuestionEditorFactory.tsx` | Add R9-R12 cases to switch (after line 98) |
| Lenient schemas | `QuestionEditorFactory.tsx` | Add `LenientMatchingOptions` + `LenientMatchingAnswer` (after line 40) |
| Factory dispatch | `QuestionPreviewFactory.tsx` | Add R9-R12 cases to switch (after line 57) |
| Type schemas | `packages/types/src/exercises.ts` | Add `MatchingOptionsSchema` + `MatchingAnswerSchema` + extend discriminated union |
| Use-sections hook | `use-sections.ts` | No change — `updateQuestion` exists (lines 100-123) |
| Debounced editing | `QuestionSectionEditor.tsx` | No change — 500ms debounce already wired (lines 87-100) |
| Expand-to-edit UX | `QuestionSectionEditor.tsx` | No change — inline expand pattern already implemented |
| Question type dropdown | `QuestionSectionEditor.tsx` | No change — R9-R12 already listed in QUESTION_TYPES_BY_SKILL (lines 36-39) |
| Section editor props | `QuestionSectionEditor.tsx` | No change — `onUpdateQuestion` prop already wired |
| Prisma Json handling | `sections.service.ts:toJsonValue()` | Reuse for options/correctAnswer |
| WordBankEditor pattern | `WordBankEditor.tsx` | Reference pattern — similar mapping structure with Select dropdowns |
| Select component | `@workspace/ui` | Import: `Select, SelectTrigger, SelectContent, SelectItem, SelectValue` from `"@workspace/ui/components/select"` |

### Previous Story Intelligence (Story 3.2)

**Key learnings from 3-2:**
- **Debounced updates**: QuestionSectionEditor already implements 500ms debounce on `handleEditorChange()` — editors just call `onChange(options, correctAnswer)` and the parent handles debouncing. DO NOT add debounce inside editor components.
- **Null handling**: All editors MUST handle `options: null` and `correctAnswer: null` gracefully — render empty form state, not errors. Existing questions may have null values.
- **SafeParse pattern**: QuestionEditorFactory uses lenient Zod schemas with `safeParse()` to safely parse unknown JSON before passing to editors. Add ONE lenient schema for all R9-R12.
- **onChange contract**: Editors call `onChange(options, correctAnswer)` — always pass BOTH values. The parent handles the API call.
- **Component sharing**: R1/R2 share MCQEditor, R3/R4 share TFNGEditor, R5/R6/R8 share TextInputEditor. Follow the same pattern: create ONE `MatchingEditor` component shared by R9-R12 with mode switching based on `sectionType`.
- **Test count baseline**: 321 backend tests, 245 webapp tests passing as of 3.2 completion.
- **Code review findings from 3.2**: Scoped radio IDs (prefix with questionId to avoid conflicts), runtime safeParse validation in factory, debounced API calls (500ms).
- **Existing R9 test**: `question-editors.test.tsx` already has a test at ~line 422 verifying the "No editor available" fallback for R9_MATCHING_HEADINGS. This test must be updated to expect MatchingEditor instead.

**Files established in 3-2 that this story follows:**
- `QuestionEditorFactory.tsx` — Add R9-R12 cases + lenient schema
- `QuestionPreviewFactory.tsx` — Add R9-R12 cases
- `packages/types/src/exercises.ts` — Add matching schemas to discriminated union
- `packages/types/src/exercises.test.ts` — Add matching schema tests

### Git Intelligence

**Recent commits (relevant patterns):**
```
255b04d feat(exercises): implement story 3.2 reading question types (R1-R8) with code review fixes
0d8a6f2 feat(exercises): create story 3.2 — reading question types basic (R1-R8)
da9b2f8 feat(classes): inline schedule and roster management in class drawer
```

**Commit convention:** `feat(exercises): description` for new features.

### Drag-and-Drop Available (NOT Required)

- `@hello-pangea/dnd` v18.0.1 is installed in `apps/webapp/package.json` but minimally used.
- For this story, **use Select dropdowns** (like WordBankEditor) for matching assignment. Drag-and-drop is a nice-to-have for student-facing UI (Story 4.1), not the teacher editor.
- The student preview should use disabled Select dropdowns showing options, consistent with the WordBankPreview pattern.

### Scope Boundaries (What NOT to Build)

- DO NOT implement auto-grading engine — just store answer structures; grading is Epic 5
- DO NOT implement student-facing interactive matching — this story builds the **teacher editor** and **preview**; student submission UI is Story 4.1
- DO NOT implement drag-and-drop matching UX — use Select dropdowns for mapping (consistent with R7 WordBankEditor pattern)
- DO NOT implement answer key management UI (Story 3.5) — this story stores answer data in JSON
- DO NOT add new Prisma models, columns, or routes — existing infrastructure is sufficient
- DO NOT implement Note/Table/Flowchart (R13) or Diagram (R14) — those are Story 3.4
- DO NOT implement paragraph auto-detection from passage — teacher manually enters paragraph letters as `sourceItems`. Auto-detection from passage text is a future enhancement.
- DO NOT build new API endpoints — question CRUD already supports all matching JSON shapes

### Technical Specifics

**Shadcn/UI components to use:**
- `Select` / `SelectTrigger` / `SelectContent` / `SelectItem` / `SelectValue` — for matching assignment dropdowns (per source item)
- `Input` — for editing source and target items
- `Button` — for add/remove items
- `Badge` — for distractor count indicator ("7 options, 5 to match — 2 distractors")
- `Label` — for section labels
- `Trash2` icon — for delete item buttons
- `Plus` icon — for add item buttons

**MatchingEditor Architecture:**

The editor uses a single component parameterized by `sectionType`. A config mapping provides labels and placeholders per type:

```
sectionType → config mapping:
  R9_MATCHING_HEADINGS → {
    sourceLabel: "Paragraphs",
    targetLabel: "Headings",
    sourcePlaceholder: "e.g., A",
    targetPlaceholder: "e.g., The impact of climate change",
    sourceKeyType: "value"      // match keys = paragraph letter values (A, B, C)
  }
  R10_MATCHING_INFORMATION → {
    sourceLabel: "Statements",
    targetLabel: "Paragraphs",
    sourcePlaceholder: "e.g., a reference to the size of...",
    targetPlaceholder: "e.g., A",
    sourceKeyType: "index"      // match keys = 0-based indices
  }
  R11_MATCHING_FEATURES → {
    sourceLabel: "Items",
    targetLabel: "Features",
    sourcePlaceholder: "e.g., Dr. Smith",
    targetPlaceholder: "e.g., Supports Theory X",
    sourceKeyType: "index"
  }
  R12_MATCHING_SENTENCE_ENDINGS → {
    sourceLabel: "Sentence Beginnings",
    targetLabel: "Sentence Endings",
    sourcePlaceholder: "e.g., The research team discovered that",
    targetPlaceholder: "e.g., climate change accelerated.",
    sourceKeyType: "index"
  }
```

**`sourceKeyType` determines match key generation:**
- `"value"` (R9 only): Uses the source item text as the key (e.g., `"A"`, `"B"`)
- `"index"` (R10-R12): Uses the 0-based array index as string (e.g., `"0"`, `"1"`)

**Editor UI Layout:**
```
┌─────────────────────────────────────────┐
│ [Source Label]          [Target Label]   │
│                                         │
│ Source Items:           Target Options:  │
│ ┌────────────────────┐ ┌──────────────┐ │
│ │ A  [Select ▾]      │ │ Heading 1  ✕ │ │
│ │ B  [Select ▾]      │ │ Heading 2  ✕ │ │
│ │ C  [Select ▾]      │ │ Heading 3  ✕ │ │
│ │ D  [Select ▾]      │ │ Heading 4  ✕ │ │
│ │ E  [Select ▾]      │ │ Heading 5  ✕ │ │
│ │ [+ Add]            │ │ Heading 6  ✕ │ │
│ └────────────────────┘ │ Heading 7  ✕ │ │
│                        │ [+ Add]      │ │
│                        └──────────────┘ │
│                                         │
│ Badge: 7 options, 5 to match (2 extra)  │
└─────────────────────────────────────────┘
```

### Component Tree

```
QuestionSectionEditor (no change)
├── QuestionEditorFactory (add R9-R12 cases)
│   ├── R1/R2  → MCQEditor (existing)
│   ├── R3/R4  → TFNGEditor (existing)
│   ├── R5/R6/R8 → TextInputEditor (existing)
│   ├── R7     → WordBankEditor (existing)
│   └── R9/R10/R11/R12 → MatchingEditor (NEW)
└── Question List (click row → expand inline editor, existing)

ExercisePreview (no change)
└── QuestionPreviewFactory (add R9-R12 cases)
    ├── R1/R2  → MCQPreview (existing)
    ├── R3/R4  → TFNGPreview (existing)
    ├── R5/R6/R8 → TextInputPreview (existing)
    ├── R7     → WordBankPreview (existing)
    └── R9/R10/R11/R12 → MatchingPreview (NEW)
```

### Project Structure Notes

```
apps/webapp/src/features/exercises/
├── components/
│   ├── question-types/
│   │   ├── MCQEditor.tsx            # Existing (no change)
│   │   ├── MCQPreview.tsx           # Existing (no change)
│   │   ├── TFNGEditor.tsx           # Existing (no change)
│   │   ├── TFNGPreview.tsx          # Existing (no change)
│   │   ├── TextInputEditor.tsx      # Existing (no change)
│   │   ├── TextInputPreview.tsx     # Existing (no change)
│   │   ├── WordBankEditor.tsx       # Existing (no change)
│   │   ├── WordBankPreview.tsx      # Existing (no change)
│   │   ├── QuestionEditorFactory.tsx  # MODIFY — add R9-R12 cases + lenient schema
│   │   ├── QuestionPreviewFactory.tsx # MODIFY — add R9-R12 cases
│   │   ├── MatchingEditor.tsx       # NEW — shared editor for R9-R12
│   │   ├── MatchingPreview.tsx      # NEW — shared preview for R9-R12
│   │   └── question-editors.test.tsx # MODIFY — add matching tests, update R9 fallback test
│   ├── QuestionSectionEditor.tsx    # Existing (no change)
│   └── ExerciseEditor.tsx           # Existing (no change)
├── hooks/
│   └── use-sections.ts             # Existing (no change)

packages/types/src/
├── exercises.ts                     # MODIFY — add MatchingOptionsSchema, MatchingAnswerSchema + extend union
└── exercises.test.ts                # MODIFY — add matching schema tests

apps/backend/src/modules/exercises/
├── answer-utils.ts                  # MODIFY (optional — defer to Epic 5) — add matchesExactMapping
├── answer-utils.test.ts             # MODIFY (optional) — add matching tests
├── sections.service.ts              # Existing (no change)
├── sections.controller.ts           # Existing (no change)
└── sections.routes.ts               # Existing (no change)
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 3, Story 3.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy]
- [Source: _bmad-output/implementation-artifacts/3-2-reading-question-types-basic.md#Dev Notes]
- [Source: project-context.md#Critical Implementation Rules]
- [Source: packages/types/src/exercises.ts — Current Zod schemas and discriminated union (lines 123-172)]
- [Source: apps/webapp/src/features/exercises/components/question-types/QuestionEditorFactory.tsx — Factory dispatch (lines 57-106), lenient schemas (lines 20-40)]
- [Source: apps/webapp/src/features/exercises/components/question-types/WordBankEditor.tsx — Select import from "@workspace/ui/components/select", mapping pattern with Record<string, string>]
- [Source: apps/backend/src/modules/exercises/sections.service.ts — Question CRUD with toJsonValue() (lines 171-239)]
- [Source: apps/webapp/src/features/exercises/components/QuestionSectionEditor.tsx — R9-R12 in QUESTION_TYPES_BY_SKILL (lines 36-39), debounce (lines 87-100)]
- [Source: apps/webapp/src/features/exercises/components/question-types/question-editors.test.tsx — Existing R9 fallback test (~lines 422, 634)]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation, all tests passed on first run.

### Completion Notes List

- Task 2 (answer utility) deferred to Epic 5 as specified in story scope
- Task 6.3 (answer utility tests) deferred with Task 2
- Types package tests: 57 → 77 (+20 matching schema tests)
- Backend tests: 321 passed (unchanged baseline)
- Webapp tests: 245 → 268 (+23 matching component/factory tests)
- No Prisma schema changes, no migrations, no new API routes
- Unified `MatchingOptionsSchema` with `sourceItems`/`targetItems` for all R9-R12
- Single `MatchingEditor` component handles all 4 types via config mapping
- `sourceKeyType` convention: R9 uses paragraph letter values as keys, R10-R12 use 0-based indices
- Distractor management: Badge shows count, destructive warning when targets <= sources
- Source item removal with index-based types correctly re-indexes match keys

### Code Review Fixes Applied (2026-02-07)

Adversarial code review found 7 issues (3 High, 3 Medium, 1 Low). All fixed:

- **H1**: SelectItem values changed from target text to index-based strings (`String(ti)`) to prevent Radix Select crash on duplicate target items. Added `getMatchedTargetIndex()` helper for value resolution.
- **H2**: Source/target item Input fields switched from `onChange` to `onBlur` to prevent excessive parent onChange calls on every keystroke and stale key mapping for R9.
- **H3**: `getSourceKey()` now guards against empty/falsy values for value-based types (R9), falling back to `String(index)` instead of `""` key collision.
- **M1**: MatchingPreview shows "No matching items configured." message when options is null or sourceItems is empty.
- **M2**: `MatchingSectionType` exported from MatchingEditor, imported in MatchingPreview (deduplicated).
- **M3**: Documented Radix Select test gap in test file (not testable in jsdom, logic covered by remove-item tests).
- **L1**: Verified as non-issue — `export * from "./exercises.js"` in index.ts covers all new exports.

### File List

**New files:**
- `apps/webapp/src/features/exercises/components/question-types/MatchingEditor.tsx`
- `apps/webapp/src/features/exercises/components/question-types/MatchingPreview.tsx`

**Modified files:**
- `packages/types/src/exercises.ts` — Added MatchingOptionsSchema, MatchingAnswerSchema, R9-R12 discriminated union entries
- `packages/types/src/exercises.test.ts` — Added 20 matching schema tests
- `apps/webapp/src/features/exercises/components/question-types/QuestionEditorFactory.tsx` — Added MatchingEditor import, lenient schemas, R9-R12 switch cases
- `apps/webapp/src/features/exercises/components/question-types/QuestionPreviewFactory.tsx` — Added MatchingPreview import, R9-R12 switch cases
- `apps/webapp/src/features/exercises/components/question-types/question-editors.test.tsx` — Added 23 matching tests, updated R9 fallback test
