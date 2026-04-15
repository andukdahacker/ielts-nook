# Story 13.3: Manual Grading Discoverability

Status: review

## Story

As a Teacher who wants to grade manually,
I want a clearer entry point to manual grading,
so that I can find and use it without confusion.

**Scope:** WRITING and SPEAKING submissions only. READING/LISTENING are auto-graded and never appear in the grading queue (queue filters to WRITING/SPEAKING only via `grading.service.ts` line 343-345).

## Acceptance Criteria

1. **AC1:** A visible "Grade Manually" button or tab is present in the grading interface.
2. **AC2:** If the teacher has never used manual grading, a brief onboarding hint or tooltip appears.
3. **AC3:** Manual grading flow is accessible within 2 clicks from the grading queue.

## Tasks / Subtasks

- [x] Task 1: Add "Grade Manually" action button to AI feedback pane empty/failed states (AC: 1, 3)
  - [x] 1.1: In `AIFeedbackPane.tsx`, add a prominent "Grade Manually" button in:
    - The `analysisStatus === "failed"` state (replace buried help text with prominent CTA)
    - The `!feedback` empty state
  - [x] 1.2: In the `analysisStatus === "analyzing"` state, add a secondary "Skip AI — Grade Manually" button below the loading skeleton, but include a note: "You can start entering scores now. Finalization will be available once AI analysis completes or fails." The teacher can fill in scores while waiting, but cannot finalize until `submission.status` is no longer `AI_PROCESSING` (backend returns 400: "AI analysis is still running").
  - [x] 1.3: When "Grade Manually" is clicked (in failed/empty states), set `isManualMode = true` state in `GradingQueuePage.tsx` (passed as prop to `AIFeedbackPane`). The right pane then renders the **manual grading panel**:
    - `BandScoreCard` — with all criteria scores defaulting to `null` (empty inputs, no AI scores to show). Pass `overallScore={null}`, `criteriaScores={{}}` so the component renders editable empty fields. The teacher fills in scores from scratch.
    - `TeacherCommentsSection` — for adding free-form comments (already renders independently)
    - `ApprovalToolbar` — with the "Finalize" / "Approve & Next" button (pass empty `items=[]` so no AI items to review)
    - **Note:** `TeacherCommentsSection` and `ApprovalToolbar` are internal (non-exported) functions within `AIFeedbackPane.tsx` (lines 180-277 and 279-346 respectively) — render them inline, not via import.
  - [x] 1.4: Style button using existing Shadcn `Button` component (`variant="outline"` or `variant="secondary"`)

- [x] Task 2: Add "Grade Manually" option when AI feedback IS present (AC: 1)
  - [x] 2.1: Add a subtle "Grade Manually" text button near the `BandScoreCard` heading or in the toolbar area
  - [x] 2.2: When clicked, scroll to and focus the first score input in `BandScoreCard`. Add `React.forwardRef` to `BandScoreCard` to expose its container div ref. Use `ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })` then focus the first `EditableScore` input.
  - [x] 2.3: Manual score entry (BandScoreCard) is already always visible and editable when AI feedback exists (override mechanism with pencil icon) — no changes needed to this behavior

- [x] Task 3: Add first-time onboarding tooltip for manual grading (AC: 2)
  - [x] 3.1: Track whether teacher has seen the tooltip using `localStorage` key (e.g., `classlite:manual-grading-seen:{centerId}`)
  - [x] 3.2: On first visit to grading workbench, show a brief tooltip/popover near the "Grade Manually" button: "You can grade without AI — enter scores and feedback directly"
  - [x] 3.3: Tooltip dismisses on click or after interacting with manual grading
  - [x] 3.4: Use Shadcn `Tooltip` or `Popover` component from `packages/ui`

- [x] Task 4: Ensure 2-click path from queue to manual grading (AC: 3)
  - [x] 4.1: Click 1: Select submission from `QueueListMode` → navigates to workbench (`/centerId/dashboard/grading/{submissionId}`)
  - [x] 4.2: Click 2: Click "Grade Manually" button in the right pane → enters manual grading state
  - [x] 4.3: Verify this path works for `analysisStatus` states: `analyzing`, `failed`, `ready` (the `not_applicable` state is unreachable — only WRITING/SPEAKING appear in queue)

- [x] Task 5: Add i18n keys for all new UI text (AC: 1, 2)
  - [x] 5.1: Add keys to `apps/webapp/src/locales/en/grading.json`
  - [x] 5.2: Add keys to `apps/webapp/src/locales/vi/grading.json`
  - [x] 5.3: Keys needed: `aiFeedback.gradeManually`, `aiFeedback.gradeManuallyHint`, `aiFeedback.switchToManual`, `aiFeedback.manualGradingTooltip`, `aiFeedback.skipAiGradeManually`, `aiFeedback.aiStillRunningNote`

- [x] Task 6: Write tests (AC: 1, 2, 3)
  - [x] 6.1: `AIFeedbackPane.test.tsx`: Test "Grade Manually" button renders in failed and empty states
  - [x] 6.2: `AIFeedbackPane.test.tsx`: Test "Skip AI — Grade Manually" button renders in analyzing state with the waiting note
  - [x] 6.3: `AIFeedbackPane.test.tsx`: Test clicking "Grade Manually" triggers `isManualMode` state and renders BandScoreCard + TeacherCommentsSection + ApprovalToolbar
  - [x] 6.4: `AIFeedbackPane.test.tsx`: Test "Grade Manually" link near BandScoreCard scrolls to score inputs when AI feedback IS present
  - [x] 6.5: Test onboarding tooltip shows on first visit (no localStorage key), doesn't show after dismissal (localStorage key set)
  - [x] 6.6: Verify existing tests still pass (no regressions to hover/click/scroll behavior from 13-1)

## Dev Notes

### Current State Analysis

Manual grading **already works** — the `BandScoreCard` component allows score overrides (0-9, 0.5 increments) and teachers can add comments via `TeacherCommentCard`. The problem is **discoverability**:

- The "You can still grade manually" text only appears in the `analysisStatus === "failed"` state (`aiFeedback.helpText` i18n key) — it's buried and not prominent
- When AI analysis is loading (`analyzing`), the teacher sees a skeleton loader with no option to skip and grade manually
- When AI feedback exists, manual score override is available via the `BandScoreCard` pencil icon but not labeled as "manual grading"
- There is no explicit mode toggle or CTA — manual grading is a silent fallback, not a first-class option
- **BandScoreCard only renders when `feedback` exists** (inside the `if (feedback)` block at AIFeedbackPane.tsx ~line 447). In failed/empty states, no score entry UI is shown at all.

### Backend Constraint: AI_PROCESSING Blocks Finalization

The backend blocks finalization when `submission.status === "AI_PROCESSING"` (grading.service.ts line 757). This means:
- When `analysisStatus === "analyzing"`, the teacher CAN enter scores manually but CANNOT finalize until AI completes or fails
- When `analysisStatus === "failed"` or `!feedback`, finalization works immediately — no blocker
- The frontend should handle the 400 error gracefully if the teacher tries to finalize during AI processing (show toast: "AI analysis is still running. Scores saved — you can finalize once it completes.")

### Implementation Approach

**Do NOT create a separate "manual grading mode" page or route.** The existing workbench layout with `StudentWorkPane` (left) + `AIFeedbackPane` (right) is the right structure. The fix is surfacing manual grading as an explicit option within the existing pane:

1. **When AI has failed or no feedback**: Show a prominent "Grade Manually" button. On click, set `isManualMode = true` and render the manual grading panel: `BandScoreCard` (empty scores), `TeacherCommentsSection`, `ApprovalToolbar` (finalize button with empty items list)
2. **When AI is analyzing**: Show "Skip AI — Grade Manually" button. Teacher can start entering scores, but finalization waits until AI completes/fails
3. **When AI feedback exists**: Add a subtle "Grade Manually" link that scrolls to `BandScoreCard` and focuses score inputs
4. **Onboarding tooltip**: Simple `localStorage`-based first-time detection, no backend changes needed

### Key Files to Modify

| File | What to Change |
|------|---------------|
| `apps/webapp/src/features/grading/components/AIFeedbackPane.tsx` | Add "Grade Manually" button to failed/empty states; "Skip AI" in analyzing state; "Grade Manually" link near BandScoreCard when feedback exists; render manual grading panel when `isManualMode` |
| `apps/webapp/src/features/grading/components/BandScoreCard.tsx` | Add `React.forwardRef` to expose container ref for scroll-to-focus |
| `apps/webapp/src/features/grading/GradingQueuePage.tsx` | Add `isManualMode` state (`useState<boolean>(false)`), reset on submission change, pass to `AIFeedbackPane` |
| `apps/webapp/src/locales/en/grading.json` | Add new i18n keys |
| `apps/webapp/src/locales/vi/grading.json` | Add new i18n keys |

### Architecture Compliance

- **Component pattern**: Use existing Shadcn `Button`, `Tooltip`/`Popover` from `packages/ui`
- **State management**: Local React state (`useState`) for `isManualMode` toggle; `localStorage` for onboarding dismissal. No new context needed.
- **No backend changes required** — finalize endpoint already accepts optional `teacherFinalScore`, `teacherCriteriaScores`, `teacherGeneralFeedback`. Grading works with null feedback record.
- **No database changes** — scoring, comments, and finalization all work with existing schema
- **i18n**: All user-facing strings via `react-i18next` with `useTranslation('grading')`
- **Accessibility (NFR10, NFR11)**: Ensure "Grade Manually" button is keyboard-focusable, has focus indicator, and includes `aria-label`

### What NOT to Do

- Do NOT create a new route or page — use existing workbench layout
- Do NOT duplicate `BandScoreCard` or `ApprovalToolbar` — reuse existing components with appropriate props
- Do NOT add backend endpoints or database changes — manual grading API is complete
- Do NOT add user preferences to the database for the onboarding tooltip — `localStorage` is sufficient
- Do NOT change the grading queue list view (`QueueListMode`) — the entry point is already there
- Do NOT break existing AI grading flow — "Grade Manually" is an alternative path, not a replacement
- Do NOT handle `analysisStatus === "not_applicable"` — READING/LISTENING never appear in the grading queue

### Project Structure Notes

- Frontend grading feature: `apps/webapp/src/features/grading/`
- Shared UI components: `packages/ui/`
- i18n files: `apps/webapp/src/locales/{en,vi}/grading.json`
- Tests co-located: `*.test.tsx` next to source files

### Previous Story Intelligence (13-1 and 13-2)

**From Story 13-1 (click-to-scroll):**
- Split context pattern: `useHighlightValue()`/`useHighlightSetter()` and `useScrollTargetValue()`/`useScrollTargetSetter()` — use same pattern if adding new context
- `e.stopPropagation()` on interactive children to prevent parent click handlers
- Tests mock hooks via `vi.mock()`, use `renderHook()` with wrapper for hook tests
- `scrollIntoView` mocked via `Element.prototype.scrollIntoView = vi.fn()`
- All 1092 tests passed after implementation
- Code review patterns: add both `en` and `vi` i18n keys; test click and hover behaviors explicitly

**Story 13-2** was pre-satisfied — Google Docs-style comments already implemented via Epic 5 + Story 13-1. No new patterns relevant to this task.

### Git Intelligence

Recent commits show pattern of:
- `feat:` prefix for new features, `fix:` for corrections
- Code review fixes as separate commits
- Sprint status updates as `chore:` commits
- Story reference in commit messages (e.g., "story 13-1")

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 13, Story 13.3]
- [Source: _bmad-output/planning-artifacts/prd.md — FR20-FR26, FR49-FR53]
- [Source: _bmad-output/planning-artifacts/architecture.md — Grading Workbench, UI Patterns]
- [Source: _bmad-output/implementation-artifacts/13-1-click-to-scroll-comments.md — Previous story learnings]
- [Source: _bmad-output/implementation-artifacts/13-2-google-docs-style-comments.md — Pre-satisfied analysis]
- [Source: User feedback D3 — "Manual grading exists but users can't find it"]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References
- All 1102 tests passing (10 new + 1092 existing, 0 regressions)

### Completion Notes List
- Task 1: Added "Grade Manually" button to failed, empty, and analyzing states in AIFeedbackPane. Created `GradeManuallyButton` wrapper component with PenLine icon. When `isManualMode=true`, renders manual grading panel with BandScoreCard (empty scores), TeacherCommentsSection, and ApprovalToolbar. Added `isManualMode`/`onManualMode` state in GradingQueuePage, reset on submission change.
- Task 2: Added "Grade Manually" text link below BandScoreCard when AI feedback exists and not finalized. Converted BandScoreCard to `forwardRef` for scroll-to-focus via `scrollIntoView` + first input focus.
- Task 3: Implemented `useManualGradingTooltip` hook using localStorage key `classlite:manual-grading-seen:{centerId}`. Tooltip shows via Shadcn Tooltip component (defaultOpen) on first visit, dismisses on button click.
- Task 4: 2-click path verified — Click 1: select submission from queue → workbench. Click 2: click "Grade Manually" → manual grading panel with score inputs.
- Task 5: Added 6 i18n keys to both en and vi grading.json files.
- Task 6: Added 10 new tests covering all ACs — button rendering in each state, click behavior, manual mode panel rendering, tooltip show/dismiss via localStorage.

### File List
- `apps/webapp/src/features/grading/components/AIFeedbackPane.tsx` — Added manual grading mode, GradeManuallyButton, onboarding tooltip, new props
- `apps/webapp/src/features/grading/components/BandScoreCard.tsx` — Converted to forwardRef
- `apps/webapp/src/features/grading/GradingQueuePage.tsx` — Added isManualMode state, passed to AIFeedbackPane
- `apps/webapp/src/locales/en/grading.json` — Added 6 new i18n keys
- `apps/webapp/src/locales/vi/grading.json` — Added 6 new i18n keys
- `apps/webapp/src/features/grading/__tests__/AIFeedbackPane.test.tsx` — Added 10 new tests, tooltip/router mocks
