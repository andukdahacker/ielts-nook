# Story 11.7: Lock Submitted Exercises

Status: review

## Story

As a Teacher,
I want submitted exercises to be locked from further student edits,
so that grading integrity is maintained.

## Acceptance Criteria

1. **AC1:** After a student submits an exercise, all answer inputs become read-only for that student.
2. **AC2:** The student sees a clear "Submitted" state indicator.
3. **AC3:** A teacher can unlock a specific student's submission to allow re-submission.
4. **AC4:** Re-submission resets the grading status for that student.

## Tasks / Subtasks

- [x] Task 1: Frontend — Lock submitted exercises on `SubmissionPage` load (AC: #1, #2)
  - [x] 1.1: In `SubmissionPage.tsx`, after `startSubmission` resolves, inspect the returned `submission.status`. If status is `SUBMITTED`, `AI_PROCESSING`, or `GRADED`, set a new state `isLocked = true` (in addition to existing `isSubmitted`).
  - [x] 1.2: When `isLocked === true`, render all `QuestionInputFactory` components in read-only mode. Add a `readOnly` prop to `QuestionInputFactory` and propagate it to all question input components (`MCQInput`, `TextAnswerInput`, `WordBankInput`, `MatchingInput`, `NoteTableFlowchartInput`, `DiagramLabellingInput`, `WritingInput`, `SpeakingInput`, `PhotoCaptureInput`). Each input should disable interactions (e.g., `disabled` on `<input>`, unclickable radio/checkboxes, no photo upload button).
  - [x] 1.3: When `isLocked === true`, hide the "Submit" button in `QuestionStepper.tsx` and the `SubmitConfirmDialog`. Show a "Submitted" badge/indicator instead.
  - [x] 1.4: In `SubmissionHeader.tsx`, when locked, hide the countdown timer and save indicator. Show a "Submitted" or "Graded" status badge based on `submission.status`.
  - [x] 1.5: Populate answers from `submission.answers` into the form state so the student can see what they submitted (read-only review).
- [x] Task 2: Frontend — Fix `AssignmentCard` navigation for non-graded submitted states (AC: #2)
  - [x] 2.1: In `AssignmentCard.tsx` (`features/dashboard/components/AssignmentCard.tsx`), update the button logic: `SUBMITTED` and `AI_PROCESSING` statuses should show a "View Submission" label and navigate to `/:centerId/assignments/:assignmentId/take` (which will now render read-only). Do NOT navigate to feedback for these — feedback is only available for `GRADED`.
  - [x] 2.2: Add a status chip/badge on `AssignmentCard` showing the current submission state: "In Progress", "Submitted", "Grading...", "Graded".
- [x] Task 3: Backend — Teacher unlock endpoint (AC: #3, #4)
  - [x] 3.1: Add a new service method `unlockSubmission(submissionId, centerId)` in `grading.service.ts`. Guards: submission must exist, status must be `SUBMITTED`, `AI_PROCESSING`, or `GRADED`. Throws if `IN_PROGRESS` (already unlocked). Resets `submission.status` to `IN_PROGRESS`, nullifies `submittedAt`, resets `timeSpentSec` to 0. If a `GradingJob` exists, delete it. If `SubmissionFeedback` + `AIFeedbackItem`s exist, delete them. If `TeacherComment`s exist, delete them. Reset all `StudentAnswer.isCorrect` and `StudentAnswer.score` to null. Use a `$transaction` with explicit `where: { centerId }` filters (per Rule 5 in project-context.md — no `getTenantedClient` inside transactions).
  - [x] 3.2: Add route `POST /api/v1/grading/submissions/:submissionId/unlock` in `grading.routes.ts`. Restricted to TEACHER/ADMIN/OWNER roles. Calls `unlockSubmission` controller method.
  - [x] 3.3: Add Zod request/response schemas in `packages/types/src/grading.ts` (or submissions.ts). Request: `{ submissionId: z.string().uuid() }`. Response: standard `{ data: { id, status }, message }`.
  - [ ] 3.4: After schema changes, run `pnpm --filter=webapp sync-schema-dev` to regenerate frontend types.
- [x] Task 4: Frontend — Teacher unlock button in grading UI (AC: #3)
  - [x] 4.1: In `GradingQueuePage.tsx` (the grading workbench view), add an "Unlock for Re-submission" button near the `SubmissionNav` / finalize area. Only visible when `submission.status !== "IN_PROGRESS"`.
  - [x] 4.2: Create hook `use-unlock-submission.ts` in `features/grading/hooks/` using the new `POST .../unlock` endpoint.
  - [x] 4.3: Show a confirmation dialog before unlocking: "This will reset all grading data and allow the student to re-submit. Continue?"
  - [x] 4.4: On success, invalidate grading queries (`queryClient.invalidateQueries`) so the grading queue reflects the updated status.
- [x] Task 5: Backend — Verify `startSubmission` returns full status for locked detection (AC: #1)
  - [x] 5.1: **Verification only** — `startSubmission` in `submissions.service.ts` already uses `SUBMISSION_INCLUDE` (`{ answers: true }`) on the `findUnique` call (line ~67). Confirm the response schema in `packages/types/src/submissions.ts` surfaces `status` and `answers` to the frontend. If the schema omits `status`, add it. The frontend `SubmissionPage.tsx` needs both fields to detect locked state and populate read-only answers.
- [x] Task 6: Unit tests (AC: all)
  - [x] 6.1: Add tests in `submissions.service.test.ts` (or create `grading.service.test.ts` if needed):
    - `unlockSubmission` resets status to `IN_PROGRESS`
    - `unlockSubmission` deletes grading job, feedback, AI items, comments
    - `unlockSubmission` resets answer scores
    - `unlockSubmission` throws for `IN_PROGRESS` submission
    - `unlockSubmission` throws for non-existent submission
  - [x] 6.2: Add frontend unit tests for `SubmissionPage` locked state rendering (mock `useStartSubmission` to return a `SUBMITTED` status, verify inputs are disabled, submit button hidden, status badge shown).
- [x] Task 7: E2E tests (AC: all)
  - [x] 7.1: In `apps/e2e/tests/submissions/`, create `submission-lock.spec.ts`:
    - Student submits exercise → navigates back → sees read-only view with "Submitted" indicator
    - Student cannot modify answers in locked state
    - Teacher unlocks submission → student can re-submit
    - Re-submission shows fresh form (grading data cleared)
  - [x] 7.2: Use existing `submissionTest` fixture from `submission-fixtures.ts` for setup/teardown.

## Dev Notes

### Root Cause Analysis

The backend already guards against modifying submitted exercises — `saveAnswers`, `submitSubmission`, and `uploadPhoto` all throw when `status !== "IN_PROGRESS"`. However, **the frontend has no page-load status check**. `SubmissionPage.tsx` calls `startSubmission` on mount unconditionally and the backend returns the existing submission idempotently, but the frontend ignores the returned `status` field and renders the full interactive form. The student sees an editable form but any save attempt silently fails (backend rejects). This is confusing UX and breaks AC1/AC2.

Additionally, `AssignmentCard.tsx` sends students with `SUBMITTED`/`AI_PROCESSING` status to the `/take` route with a misleading button. Only `GRADED` status properly redirects to the feedback page.

### Key Implementation Details

**Backend guards already exist** (do NOT duplicate):
- `submissions.service.ts:125` — `saveAnswers`: `if (submission.status !== "IN_PROGRESS") throw AppError.badRequest("Cannot modify a submitted submission")`
- `submissions.service.ts:196` — `submitSubmission`: `if (submission.status !== "IN_PROGRESS") throw AppError.badRequest("This submission has already been submitted")`
- `submissions.service.ts:281` — `uploadPhoto`: `if (submission.status !== "IN_PROGRESS") throw AppError.badRequest("Cannot upload to a submitted submission")`

**SubmissionPage state flow** (current):
1. Mount → `startSubmission(assignmentId)` → returns `{ id, status, answers }` (existing or new)
2. Sets `submissionId` state, loads answers into local state
3. **BUG:** Does NOT inspect `status` — always renders interactive form
4. After successful submit in THIS session, sets `isSubmitted = true` → renders `SubmissionCompletePage`

**SubmissionPage state flow** (target):
1. Mount → `startSubmission(assignmentId)` → returns `{ id, status, answers }`
2. If `status !== "IN_PROGRESS"` → set `isLocked = true`, populate answers as read-only
3. Render all inputs disabled, show status badge, hide submit button
4. If `status === "IN_PROGRESS"` → current interactive behavior (unchanged)

**`startSubmission` return value**: `submissions.service.ts` already uses `SUBMISSION_INCLUDE` (`{ answers: true }`) on the `findUnique` (line ~67). Answers are already returned. Task 5 is a verification step — confirm the response schema surfaces `status` to the frontend.

**Unlock transaction cleanup order** (important for FK constraints):
1. Delete `AIFeedbackItem` records (FK → `SubmissionFeedback`)
2. Delete `SubmissionFeedback` record (FK → `Submission`)
3. Delete `TeacherComment` records (FK → `Submission`)
4. Delete `GradingJob` record (FK → `Submission`)
5. Reset `StudentAnswer.isCorrect` and `StudentAnswer.score` to null (keep answers for student to see)
6. Update `Submission.status = "IN_PROGRESS"`, `submittedAt = null`

**$transaction rule**: Per project-context.md Rule 5, do NOT call `getTenantedClient(centerId)` inside `$transaction`. Use the `tx` client directly with explicit `where: { centerId }` on every query.

### Project Structure Notes

**New files:**
| File | Purpose |
|------|---------|
| `apps/webapp/src/features/grading/hooks/use-unlock-submission.ts` | React Query mutation hook for unlock endpoint |
| `apps/e2e/tests/submissions/submission-lock.spec.ts` | E2E tests for lock/unlock flow |

**Modified files:**
| File | Change |
|------|--------|
| `apps/webapp/src/features/submissions/components/SubmissionPage.tsx` | Add `isLocked` state, read-only rendering, status badge |
| `apps/webapp/src/features/submissions/components/SubmissionHeader.tsx` | Show status badge when locked, hide timer |
| `apps/webapp/src/features/submissions/components/QuestionStepper.tsx` | Hide submit button when locked |
| `apps/webapp/src/features/submissions/components/question-inputs/QuestionInputFactory.tsx` | Add `readOnly` prop, propagate to all inputs |
| `apps/webapp/src/features/submissions/components/question-inputs/*.tsx` | All input components (MCQInput, TextAnswerInput, WordBankInput, MatchingInput, NoteTableFlowchartInput, DiagramLabellingInput, WritingInput, SpeakingInput, PhotoCaptureInput): add `readOnly`/`disabled` support |
| `apps/webapp/src/features/dashboard/components/AssignmentCard.tsx` | Fix navigation for SUBMITTED/AI_PROCESSING, add status chip |
| `apps/backend/src/modules/grading/grading.service.ts` | Add `unlockSubmission` method |
| `apps/backend/src/modules/grading/grading.routes.ts` | Add `POST .../unlock` route |
| `apps/backend/src/modules/grading/grading.controller.ts` | Add `unlockSubmission` controller method |
| `apps/backend/src/modules/submissions/submissions.service.ts` | Ensure `startSubmission` returns answers for existing submissions |
| `packages/types/src/grading.ts` (or `submissions.ts`) | Add unlock request/response schemas |
| `apps/webapp/src/features/grading/GradingQueuePage.tsx` | Add unlock button + confirmation dialog near SubmissionNav/finalize area |

### Architecture Compliance

- **Multi-tenancy:** All unlock queries use explicit `where: { centerId }` inside `$transaction`. Do NOT use `getTenantedClient()` inside transactions (Rule 5).
- **Layered architecture:** Route → Controller → Service pattern. Business logic in service, HTTP mapping in route.
- **Type safety:** Zod schemas in `packages/types`, `fastify-type-provider-zod` for typed routes.
- **Frontend state:** TanStack Query for server state, local React state for UI. Invalidate queries on unlock mutation success.
- **Offline:** The read-only view does not need offline support (student is just viewing, not submitting). Auto-save (`use-auto-save.ts`) should be disabled when `isLocked === true`.
- **Error handling:** Domain errors thrown in service, mapped to HTTP codes in route. Frontend handles in `onError` of mutation, displays via toast.

### Anti-Patterns to Avoid

- Do NOT create a separate "submission review" page — reuse `SubmissionPage` with the `isLocked` flag. This preserves all the question rendering logic.
- Do NOT add a new Prisma enum value (e.g., `LOCKED`) — the existing `SubmissionStatus` already covers all states. "Locked" is a frontend rendering concern based on `status !== "IN_PROGRESS"`.
- Do NOT delete `StudentAnswer` records on unlock — the student should see their previous answers when re-taking. Only reset `isCorrect` and `score`.
- Do NOT create a new submission on unlock — reuse the existing submission. Reset its status back to `IN_PROGRESS`.
- Do NOT skip the confirmation dialog on unlock — grading data deletion is destructive and irreversible.
- Do NOT put unlock logic in `submissions.service.ts` — it's a grading/teacher action, belongs in `grading.service.ts`.
- Do NOT forget to disable auto-save when `isLocked` — `use-auto-save.ts` would fire unnecessary save requests that get rejected by the backend.

### Existing Code to Reuse

- **Backend guards:** `submissions.service.ts` already rejects mutations on non-`IN_PROGRESS` submissions. Do not duplicate.
- **`startSubmission`:** Already idempotent (returns existing submission). Just ensure it includes `answers` in the response.
- **`SubmissionCompletePage.tsx`:** Reference for success state UI. The locked view needs similar visual treatment but with answer display.
- **`submissionTest` E2E fixture:** Handles exercise+assignment creation and cleanup. Extend for unlock tests.
- **`AppError` utility:** Use `AppError.badRequest()`, `AppError.conflict()`, `AppError.notFound()` for domain errors.
- **`GradingQueuePage.tsx`:** Main grading workbench page (uses `WorkbenchLayout` + `SubmissionNav` + `AIFeedbackPane`). Unlock button goes here near the finalize/nav area.
- **Question input components:** All in `features/submissions/components/question-inputs/` — they already render answers, just need a `disabled`/`readOnly` prop.

### Testing Standards

- **Unit tests:** Vitest, co-located. `submissions.service.test.ts` for backend. Frontend component tests in same directory.
- **E2E tests:** Playwright in `apps/e2e/tests/submissions/`. Use `submissionTest` fixture.
- **Run backend tests:** `pnpm --filter=backend test`
- **Run E2E tests:** From `apps/e2e/`, use `npx playwright test tests/submissions/submission-lock.spec.ts`

### Previous Story Intelligence (11-6)

From story 11-6 (Exercise Edit Breadcrumbs):
- Created a reusable breadcrumb context pattern — not directly relevant here but shows the context-based approach used in this codebase.
- All 904 tests passing at completion, zero regressions.
- Agent model: Claude Opus 4.6 (1M context).
- Code review was thorough — expect similar review for this story.

### Git Intelligence

Recent commits follow `fix:` or `feat:` conventional commit format with story references (e.g., `fix: code review fixes for story 11-6`). 

### References

- [Source: apps/backend/src/modules/submissions/submissions.service.ts] — Backend submission guards, startSubmission
- [Source: apps/backend/src/modules/submissions/submissions.routes.ts] — Student submission API endpoints
- [Source: apps/backend/src/modules/grading/grading.service.ts] — Grading workflow, finalizeGrading
- [Source: apps/backend/src/modules/grading/grading.routes.ts] — Grading API endpoints
- [Source: apps/webapp/src/features/submissions/components/SubmissionPage.tsx] — Main student submission UI
- [Source: apps/webapp/src/features/submissions/components/SubmissionHeader.tsx] — Timer, save indicator
- [Source: apps/webapp/src/features/submissions/components/QuestionStepper.tsx] — Navigation + submit button
- [Source: apps/webapp/src/features/submissions/components/question-inputs/QuestionInputFactory.tsx] — Question input router
- [Source: apps/webapp/src/features/dashboard/components/AssignmentCard.tsx] — Dashboard assignment card, navigation logic
- [Source: apps/webapp/src/features/submissions/hooks/use-auto-save.ts] — Auto-save hook (disable when locked)
- [Source: apps/webapp/src/features/submissions/hooks/use-start-submission.ts] — Start/resume submission hook
- [Source: apps/e2e/fixtures/submission-fixtures.ts] — E2E test fixtures
- [Source: apps/e2e/tests/submissions/submission-flow.spec.ts] — Existing submission E2E tests
- [Source: packages/db/prisma/schema.prisma — Submission model] — Status enum, relations
- [Source: packages/types/src/submissions.ts] — SubmissionStatusSchema Zod enum
- [Source: project-context.md — Rule 5] — $transaction + multi-tenancy constraint

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- TypeScript checks pass: both `apps/webapp` and `apps/backend` — zero errors
- Backend unit tests: 8/8 pass (grading.service.unlock.test.ts)
- Frontend unit tests: 918/918 pass (includes 7 new locked state tests + 1 updated AssignmentCard test)
- Pre-existing integration test failures (39) are DB-dependent, not caused by this story

### Completion Notes List

- Task 1: Added `isLocked` + `submissionStatus` state to SubmissionPage. Added `readOnly` prop to QuestionInputFactory and all 9 input components. Disabled auto-save, save-on-navigate, beforeunload guard, and IndexedDB restore when locked. Status badge shown in header and stepper.
- Task 2: AssignmentCard shows "View Submission" for SUBMITTED/AI_PROCESSING (was "View Results"). Added "Grading..." status chip for AI_PROCESSING.
- Task 3: `unlockSubmission` service method with `$transaction` + explicit `centerId` filters. Deletes AIFeedbackItems, SubmissionFeedback, TeacherComments, GradingJob. Resets StudentAnswer scores. Route + controller + Zod schema added.
- Task 4: Unlock button with AlertDialog confirmation in GradingQueuePage workbench header. Hook invalidates grading queries on success.
- Task 5: Verified `startSubmission` already returns `status` and `answers` — no changes needed.
- Task 6: 8 backend unit tests (unlock service) + 7 frontend tests (locked state rendering, auto-save disabled, IndexedDB skipped, status badge, submit hidden). Updated existing AssignmentCard test.
- Task 7: 3 E2E tests in submission-lock.spec.ts using submissionTest fixture.
- Task 3.4 (schema sync) deferred — requires running backend for `pnpm --filter=webapp sync-schema-dev`. Unlock hook uses `any` cast as workaround until schema is regenerated.

### File List

**New files:**
- `apps/webapp/src/features/grading/hooks/use-unlock-submission.ts`
- `apps/backend/src/modules/grading/grading.service.unlock.test.ts`
- `apps/e2e/tests/submissions/submission-lock.spec.ts`

**Modified files:**
- `apps/webapp/src/features/submissions/components/SubmissionPage.tsx`
- `apps/webapp/src/features/submissions/components/SubmissionPage.test.tsx`
- `apps/webapp/src/features/submissions/components/SubmissionHeader.tsx`
- `apps/webapp/src/features/submissions/components/QuestionStepper.tsx`
- `apps/webapp/src/features/submissions/components/question-inputs/QuestionInputFactory.tsx`
- `apps/webapp/src/features/submissions/components/question-inputs/MCQInput.tsx`
- `apps/webapp/src/features/submissions/components/question-inputs/TextAnswerInput.tsx`
- `apps/webapp/src/features/submissions/components/question-inputs/WordBankInput.tsx`
- `apps/webapp/src/features/submissions/components/question-inputs/MatchingInput.tsx`
- `apps/webapp/src/features/submissions/components/question-inputs/NoteTableFlowchartInput.tsx`
- `apps/webapp/src/features/submissions/components/question-inputs/DiagramLabellingInput.tsx`
- `apps/webapp/src/features/submissions/components/question-inputs/WritingInput.tsx`
- `apps/webapp/src/features/submissions/components/question-inputs/SpeakingInput.tsx`
- `apps/webapp/src/features/submissions/components/question-inputs/PhotoCaptureInput.tsx`
- `apps/webapp/src/features/dashboard/components/AssignmentCard.tsx`
- `apps/webapp/src/features/dashboard/components/AssignmentCard.test.tsx`
- `apps/webapp/src/features/grading/GradingQueuePage.tsx`
- `apps/backend/src/modules/grading/grading.service.ts`
- `apps/backend/src/modules/grading/grading.controller.ts`
- `apps/backend/src/modules/grading/grading.routes.ts`
- `packages/types/src/grading.ts`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
