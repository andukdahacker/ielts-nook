# Story 7.1: Engagement Email Notifications

Status: done

## Story

As a Student (and their Parent),
I want to receive email notifications for my achievements,
so that I feel motivated to keep studying (and parents stay informed).

> **FR30 note:** PRD FR30 specifies _"send automated email notifications to **parents** for Personal Bests or 7-day assignment streaks."_ This story serves both audiences: the student receives motivational emails, and the parent (via `parentEmail`) receives the same notification to stay engaged with their child's progress.

## Acceptance Criteria

1. **AC1 — Achievement Detection:** System sends automated email when a student hits a "7-day streak" (7 consecutive calendar days with at least one graded submission, based on `submittedAt` dates) OR a "Personal Best" (highest-ever `teacherFinalScore ?? overallScore` across all graded submissions for that student, requiring at least one prior graded submission for comparison). Personal Best only applies to Writing/Speaking skills (Reading/Listening produce no `SubmissionFeedback.overallScore`).
2. **AC2 — Email Content:** Emails include encouraging copy, achievement details (type: streak or personal-best, score if applicable), and a deep-link to the student's dashboard in ClassLite (`{WEBAPP_URL}/dashboard`).
3. **AC3 — Center Branding:** Emails use center branding — center name in header and email body. Follow existing template pattern with Royal Blue `#2563EB` header.
4. **AC4 — Daily Batching:** Max 1 engagement email per student per day. If both streak and personal-best are detected on the same grading event, combine into a single email. If an engagement email was already sent today (check `EmailLog` where `type = "engagement"` and `sentAt` is today), skip.

## Tasks / Subtasks

- [x] **Task 1: Engagement Email Template** (AC: 2, 3)
  - [x] 1.1 Create `apps/backend/src/modules/engagement/emails/engagement-notification.template.ts`
  - [x] 1.2 Export `buildEngagementEmail(params): { subject: string; html: string }` — pure function, inline CSS, locale support (en/vi)
  - [x] 1.3 Template supports two achievement types: `"streak"` and `"personal-best"` (and combined when both)
  - [x] 1.4 Include center name in header, achievement details, and deep-link button styled with `#2563EB`
  - [x] 1.5 Write template unit tests (en + vi locales, streak-only, personal-best-only, combined)

- [x] **Task 2: Achievement Detection Service** (AC: 1, 4)
  - [x] 2.1 Create `apps/backend/src/modules/engagement/engagement.service.ts`
  - [x] 2.2 Implement `checkStreak(db, studentId): Promise<boolean>` — query submissions with `status: "GRADED"` and `submittedAt` in the last 7 calendar days; filter out null `submittedAt`; group by date; return true if 7 consecutive days ending today
  - [x] 2.3 Implement `checkPersonalBest(db, studentId, currentScore): Promise<boolean>` — if `currentScore` is null, return false (Reading/Listening). If no prior graded submissions exist, return false (first submission is not a "personal best"). Otherwise query all graded submissions, get max `teacherFinalScore ?? overallScore`; return true if `currentScore > previousMax`
  - [x] 2.4 Implement `wasEngagementEmailSentToday(db, studentId, centerId): Promise<boolean>` — check `EmailLog` for `type: "engagement"`, `recipientId: studentId`, `sentAt >= today 00:00 UTC`
  - [x] 2.5 Write service unit tests (streak detected/not detected edge cases, personal best detected/not detected, daily batch check)

- [x] **Task 3: Inngest Engagement Notification Job** (AC: 1, 2, 3, 4)
  - [x] 3.1 Create `apps/backend/src/modules/engagement/jobs/engagement-notification.job.ts`
  - [x] 3.2 Listen for event `engagement/submission.graded` with data `{ studentId, centerId, submissionId, score }`
  - [x] 3.3 Steps: `check-achievements` → `check-batch-limit` → `fetch-student` → `fetch-center` → `send-email` → `log-email`
  - [x] 3.4 Use `getParentEmails(db, studentId)` helper to retrieve parent emails (returns `[user.parentEmail].filter(Boolean)` — forward-compatible with Story 7.3 multi-parent refactor). Send to student email AND each parent email as separate `step.run` calls per recipient
  - [x] 3.5 Log each send to `EmailLog` with `type: "engagement"`
  - [x] 3.6 Register in `apps/backend/src/modules/inngest/functions.ts`

- [x] **Task 4: Fire Event from Grading Finalization** (AC: 1)
  - [x] 4.1 In `apps/backend/src/modules/grading/grading.service.ts` → `finalizeGrading()` method (line ~800), after the transaction completes and before returning, fire `inngest.send({ name: "engagement/submission.graded", data: { studentId, centerId, submissionId, score: teacherFinalScore } })`
  - [x] 4.2 `inngest` is already imported at line 4 of `grading.service.ts` (used by `triggerAnalysis()`) — NO new import needed
  - [x] 4.3 Ensure this is fire-and-forget — do NOT await in a way that blocks the HTTP response

- [x] **Task 5: Tests** (AC: all)
  - [x] 5.1 Email template tests (co-located: `engagement-notification.template.test.ts`)
  - [x] 5.2 Service unit tests (co-located: `engagement.service.test.ts`)
  - [x] 5.3 Verify existing grading tests still pass after adding `inngest.send()` to `finalizeGrading()`

## Dev Notes

### Trigger Point

The achievement check fires from `GradingService.finalizeGrading()` at `apps/backend/src/modules/grading/grading.service.ts:800`. After the `$transaction` block sets `status: "GRADED"`, fire:

```typescript
await inngest.send({
  name: "engagement/submission.graded",
  data: {
    studentId: submission.studentId,
    centerId,
    submissionId,
    score: data.teacherFinalScore ?? feedback?.overallScore ?? null,
  },
});
```

`inngest` is already imported at line 4 of `grading.service.ts` (`import { inngest } from "../inngest/client.js"`) and used by `triggerAnalysis()`. No new import needed — just add the `inngest.send()` call.

**Grading tests**: `grading.service.test.ts` already mocks inngest at line 5: `vi.mock("../inngest/client.js", () => ({ inngest: { send: vi.fn().mockResolvedValue(undefined) } }))`. Existing `finalizeGrading` tests (8 tests) do NOT assert on `inngest.send`, so adding the call won't break them. `vi.clearAllMocks()` runs in `beforeEach`.

### Achievement Detection Logic

**7-Day Streak:**
```typescript
// Query: all GRADED submissions for student in last 7 days
const submissions = await db.submission.findMany({
  where: { studentId, status: "GRADED", submittedAt: { gte: sevenDaysAgo, not: null } },
  select: { submittedAt: true },
});
// CRITICAL: submittedAt is DateTime? — filter nulls before processing
const uniqueDates = new Set(
  submissions
    .filter(s => s.submittedAt !== null)
    .map(s => s.submittedAt!.toISOString().slice(0, 10))
);
// Check that today and each of the 6 preceding days are in the set
```

**Known limitation:** The streak is based on `submittedAt` dates (student behavior), but only detectable after `status: "GRADED"` is set. If a teacher batches grading and not all 7 days' submissions are graded yet, the streak won't fire until the remaining submissions are graded. This is a false-negative that self-corrects as grading catches up.

**Personal Best:**
```typescript
// GUARD: if score is null (Reading/Listening — no SubmissionFeedback), skip personal-best
if (currentScore === null) return false;

// Query: highest score across ALL student's graded submissions (not just this assignment)
const allGraded = await db.submission.findMany({
  where: { studentId, status: "GRADED", id: { not: submissionId } },
  include: { feedback: { select: { teacherFinalScore: true, overallScore: true } } },
});

// GUARD: require at least 1 prior graded submission — first submission is NOT a "personal best"
const withScores = allGraded.filter(s => s.feedback?.teacherFinalScore != null || s.feedback?.overallScore != null);
if (withScores.length === 0) return false;

const previousMax = Math.max(...withScores.map(s => s.feedback?.teacherFinalScore ?? s.feedback?.overallScore ?? 0));
return currentScore > previousMax;
```

**Score scope:** Personal Best only applies to Writing and Speaking (both use 0-9 IELTS band scale via `SubmissionFeedback.overallScore`). Reading/Listening submissions are auto-graded with per-question `StudentAnswer.score` and never create a `SubmissionFeedback` record — their event payload `score` will be `null`, which triggers the null guard above.

### Daily Batching (AC4)

Check `EmailLog` before sending:
```typescript
const today = new Date();
today.setUTCHours(0, 0, 0, 0);
const alreadySent = await db.emailLog.findFirst({
  where: { recipientId: studentId, centerId, type: "engagement", sentAt: { gte: today } },
});
if (alreadySent) return { status: "batch-limited" };
```

### Inngest Job Pattern — Follow Existing Infrastructure

File: `apps/backend/src/modules/engagement/jobs/engagement-notification.job.ts`

Follow the exact pattern from `session-email-notification.job.ts`:
- `createPrisma()` from `../../../plugins/create-prisma.js` (3 levels up: `jobs/` → `engagement/` → `modules/` → `src/`)
- `getTenantedClient` from `@workspace/db` (never relative path)
- `$disconnect()` in `finally` block of every `step.run()`
- `new Resend(process.env.RESEND_API_KEY)` directly — NOT `fastify.resend`
- One `step.run()` per recipient for resilient retries
- 3 retries, no debounce needed (one event per grading finalization)

```typescript
import { inngest } from "../../inngest/client.js";
import { createPrisma } from "../../../plugins/create-prisma.js";
import { getTenantedClient } from "@workspace/db";
import { Resend } from "resend";
import { buildEngagementEmail } from "../emails/engagement-notification.template.js";
import { getParentEmails } from "../engagement.service.js";

export const engagementNotificationJob = inngest.createFunction(
  { id: "engagement-email-notification", retries: 3 },
  { event: "engagement/submission.graded" },
  async ({ event, step }) => {
    const { studentId, centerId, submissionId, score } = event.data;

    // Step 1: Check achievements (streak + personal best)
    const achievements = await step.run("check-achievements", async () => {
      const prisma = createPrisma();
      try {
        const db = getTenantedClient(prisma, centerId);
        const streak = await checkStreak(db, studentId);
        const personalBest = score != null ? await checkPersonalBest(db, studentId, submissionId, score) : false;
        return { streak, personalBest };
      } finally { await prisma.$disconnect(); }
    });
    if (!achievements.streak && !achievements.personalBest) return { status: "no-achievements" };

    // Step 2: Check daily batch limit (max 1 engagement email per student per day)
    const canSend = await step.run("check-batch-limit", async () => {
      const prisma = createPrisma();
      try {
        const db = getTenantedClient(prisma, centerId);
        const today = new Date(); today.setUTCHours(0, 0, 0, 0);
        const existing = await db.emailLog.findFirst({
          where: { recipientId: studentId, centerId, type: "engagement", sentAt: { gte: today } },
        });
        return !existing;
      } finally { await prisma.$disconnect(); }
    });
    if (!canSend) return { status: "batch-limited" };

    // Step 3: Fetch student details + parent emails
    const recipientData = await step.run("fetch-student", async () => {
      const prisma = createPrisma();
      try {
        const db = getTenantedClient(prisma, centerId);
        const user = await db.user.findUnique({
          where: { id: studentId },
          select: { id: true, email: true, name: true, preferredLanguage: true, parentEmail: true },
        });
        if (!user) return null;
        const parentEmails = [user.parentEmail].filter(Boolean) as string[];
        return { ...user, parentEmails };
      } finally { await prisma.$disconnect(); }
    });
    if (!recipientData?.email) return { status: "no-email" };

    // Step 4: Fetch center name (Center is NOT tenanted — use raw prisma)
    const centerName = await step.run("fetch-center", async () => {
      const prisma = createPrisma();
      try {
        const center = await prisma.center.findUnique({ where: { id: centerId }, select: { name: true } });
        return center?.name ?? "ClassLite";
      } finally { await prisma.$disconnect(); }
    });

    // Step 5+: Send emails — one step.run per recipient
    // Send to student
    await step.run("send-email-student", async () => { /* build template, resend.emails.send, log to EmailLog */ });
    // Send to each parent email
    for (const parentEmail of recipientData.parentEmails) {
      await step.run(`send-email-parent-${parentEmail}`, async () => { /* same pattern */ });
    }
  }
);
```

### Email Template Pattern

File: `apps/backend/src/modules/engagement/emails/engagement-notification.template.ts`

Follow the exact pattern from `schedule-change.template.ts` and `intervention.template.ts`:
- Pure function returning `{ subject: string; html: string }`
- Inline CSS only (email clients strip `<style>` tags)
- `<table>` layout for cross-client compatibility
- Locale support: `en`/`vi` via recipient's `preferredLanguage`
- Import `escapeHtml` from `../../logistics/emails/format-utils.js` (up from `engagement/emails/` → `engagement/` → `modules/`, then into `logistics/emails/`) — DO NOT recreate
- Deep-link button: `background-color: #2563EB`
- Use `process.env.WEBAPP_URL` for deep-link construction

### Recipients

Send to:
1. **Student's email** (`user.email`) — primary recipient
2. **Parent email(s)** — retrieved via `getParentEmails()` helper, each as a separate `step.run()` call

Both get logged individually to `EmailLog` with `type: "engagement"`. The student's `recipientId` is used for both log entries (the `EmailLog.recipientId` tracks whose achievement it is, not who received it).

### Forward-Compatibility: `getParentEmails()` Helper

Export from `engagement.service.ts`:

```typescript
/** Returns parent emails for a student. Encapsulated for Story 7.3 multi-parent refactor. */
export function getParentEmails(user: { parentEmail: string | null }): string[] {
  return [user.parentEmail].filter(Boolean) as string[];
}
```

Today this wraps the single `parentEmail` field. When Story 7.3 changes to a separate `ParentEmail` table (max 3 per student), only this function needs updating. The Inngest job loops over the returned array and is already multi-recipient ready.

### Existing Infrastructure — DO NOT Rebuild

| Component | Location | Notes |
|---|---|---|
| Resend plugin | `apps/backend/src/plugins/resend.plugin.ts` | Use `new Resend()` directly in Inngest jobs, NOT plugin |
| Inngest client | `apps/backend/src/modules/inngest/client.ts` | `id: "classlite"` |
| Inngest registry | `apps/backend/src/modules/inngest/functions.ts` | Add new job to `functions` array |
| createPrisma | `apps/backend/src/plugins/create-prisma.ts` | For PrismaClient in Inngest jobs |
| EmailLog model | `packages/db/prisma/schema.prisma` | Already exists with `type`, `status`, `recipientId`, `centerId` |
| escapeHtml + format utils | `apps/backend/src/modules/logistics/emails/format-utils.ts` | Import, do NOT duplicate |
| User.parentEmail | `packages/db/prisma/schema.prisma` | Already exists on User model |
| User.preferredLanguage | `packages/db/prisma/schema.prisma` | `"en"` default, used for locale |
| Center.name | `packages/db/prisma/schema.prisma` | Fetch via raw PrismaClient (Center is NOT tenanted) |

### Database — No Schema Changes Required

No new models or fields needed:
- `EmailLog` already supports arbitrary `type` values — use `"engagement"`
- `User.parentEmail` already exists
- Achievement detection queries existing `Submission` + `SubmissionFeedback` tables
- Notification preferences (Story 7.2) will add preference fields later — for now, send to ALL students

### File Structure

```
apps/backend/src/modules/engagement/
  engagement.service.ts          # Achievement detection logic
  engagement.service.test.ts     # Service unit tests
  emails/
    engagement-notification.template.ts       # Email template
    engagement-notification.template.test.ts  # Template tests
  jobs/
    engagement-notification.job.ts            # Inngest background job
```

Modified files:
- `apps/backend/src/modules/grading/grading.service.ts` — Add `inngest.send()` after `finalizeGrading()`
- `apps/backend/src/modules/inngest/functions.ts` — Register new job

### Key Implementation Warnings

1. **DO NOT create a REST endpoint** — This is purely event-driven. No HTTP routes needed.
2. **DO NOT add notification preference checks yet** — Story 7.2 handles notification preferences. For now, send to all students with valid email.
3. **DO NOT use `fastify.resend`** inside the Inngest job — use `new Resend(process.env.RESEND_API_KEY)` directly.
4. **DO NOT create new Prisma models** — Use existing `EmailLog` with `type: "engagement"` (plain `String` field, not an enum — any value works).
5. **Handle null scores gracefully** — Reading/Listening submissions produce no `SubmissionFeedback` record, so the event payload `score` will be `null`. If `score` is null, skip personal-best check entirely but still check streak.
6. **First submission is NOT a personal best** — Require at least 1 prior graded submission with a score before comparing. `Math.max(...[])` returns `-Infinity`, which would make every first submission a false positive.
7. **Null-guard `submittedAt`** — `Submission.submittedAt` is `DateTime?`. Production always sets it on submit, but filter out nulls in the streak query to be defensive.
8. **UTC dates for batching** — Use UTC midnight for the "already sent today" check. Known limitation: centers in UTC+7 may have a 7-hour window mismatch between UTC day and local day. Acceptable for pilot phase; fix with center-timezone-aware batching before multi-timezone deployments.
9. **Streak = calendar days, not 24-hour windows** — A submission at 11pm and another at 1am count as two different days.
10. **Center is NOT tenanted** — Fetch center name with raw PrismaClient (via `createPrisma()`), not `getTenantedClient()`.
11. **Keep `inngest.send()` outside the transaction** — The event fires after the transaction commits. If the transaction fails, no event is sent. This is already the correct position in the code (after the `$transaction` block).
12. **`inngest` is already imported in `grading.service.ts`** — Line 4. Do NOT add a duplicate import. Just add the `inngest.send()` call in `finalizeGrading()`.
13. **`createPrisma` path from `engagement/jobs/`** — Must be `../../../plugins/create-prisma.js` (3 levels up). NOT `../../plugins/`. Verified against all existing Inngest jobs.

### Known Limitations (by design)

1. **Streak false-negatives with batched grading** — The streak check only considers `GRADED` submissions. If a teacher hasn't graded all 7 days' submissions yet, the streak won't fire. Self-corrects as grading catches up.
2. **Personal Best only for Writing/Speaking** — Reading/Listening have no `SubmissionFeedback.overallScore` (auto-graded per-question). Students who only do Reading/Listening exercises will never get a personal-best email.
3. **UTC-based daily batching** — Does not use center timezone. May cause edge-case double/missed sends for centers far from UTC. Fix before multi-timezone deployment.
4. **No notification opt-out** — All students receive emails until Story 7.2 adds preference toggles.
5. **Single parent email** — Uses `User.parentEmail` (single field). Story 7.3 will add multi-parent support (max 3). The `getParentEmails()` helper encapsulates this for easy refactoring.

### Project Structure Notes

- New module `engagement/` follows feature-first pattern matching `grading/`, `student-health/`, `logistics/`
- Email template co-located with feature: `engagement/emails/` matches `logistics/emails/`, `student-health/emails/`
- Inngest job co-located: `engagement/jobs/` (some modules use this pattern, others put jobs at module root)
- Tests co-located with source files per project convention

### References

- [Source: project-context.md#Critical Implementation Rules] — Multi-tenancy, Inngest patterns
- [Source: epics.md#Epic 7, Story 7.1] — FR30 acceptance criteria
- [Source: prd.md#FR30] — System shall send automated email notifications for Personal Bests or streaks
- [Source: architecture.md#API & Communication Patterns] — Inngest background job architecture
- [Source: 2-6-schedule-change-notifications-email.md] — Inngest email job pattern reference
- [Source: 6-3-email-intervention-loop.md] — Email template + intervention job pattern reference
- [Source: grading.service.ts:735-821] — `finalizeGrading()` method, trigger point for achievement events

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
None — clean implementation with no debugging required.

### Completion Notes List
- **Task 1:** Created `buildEngagementEmail()` pure function supporting streak/personal-best/combined types, en/vi locales, center branding with Royal Blue #2563EB header, deep-link dashboard button. 20 unit tests.
- **Task 2:** Created `checkStreak()`, `checkPersonalBest()`, `wasEngagementEmailSentToday()`, and `getParentEmails()` in `engagement.service.ts`. 19 unit tests covering all edge cases (null scores, first submissions, gap days, null submittedAt).
- **Task 3:** Created Inngest job `engagement-email-notification` with full step pipeline: check-achievements → check-batch-limit → fetch-student → fetch-center → send-email per recipient. Follows existing Inngest patterns (createPrisma, getTenantedClient, $disconnect in finally, Resend directly). Registered in functions.ts.
- **Task 4:** Added `inngest.send({ name: "engagement/submission.graded" })` in `grading.service.ts` → `finalizeGrading()` after transaction commits. No new imports needed — inngest already imported. Score uses `data.teacherFinalScore ?? feedback?.overallScore ?? null`. All 65 existing grading tests still pass.
- **Task 5:** Full regression suite: 866 tests pass, 0 failures.

### File List
**New files:**
- `apps/backend/src/modules/engagement/emails/engagement-notification.template.ts`
- `apps/backend/src/modules/engagement/emails/engagement-notification.template.test.ts`
- `apps/backend/src/modules/engagement/engagement.service.ts`
- `apps/backend/src/modules/engagement/engagement.service.test.ts`
- `apps/backend/src/modules/engagement/jobs/engagement-notification.job.ts`

**Modified files:**
- `apps/backend/src/modules/grading/grading.service.ts` — Added `inngest.send()` for engagement event after finalizeGrading transaction
- `apps/backend/src/modules/inngest/functions.ts` — Registered engagementNotificationJob
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Updated story status to review

## Senior Developer Review (AI)

**Reviewer:** Amelia (Dev Agent) on 2026-02-26
**Outcome:** Approved with fixes applied

### Issues Found: 1 High, 4 Medium, 3 Low — All fixed

**HIGH (fixed):**
1. `wasEngagementEmailSentToday()` batch check counted failed/skipped EmailLog entries as "already sent" — added `status: "sent"` filter (`engagement.service.ts:99`)

**MEDIUM (fixed):**
2. `DbClient = any` type violation — replaced with `ReturnType<typeof getTenantedClient>` from `@workspace/db` (`engagement.service.ts:1-3`)
3. Duplicate email-sending code (~40 lines each for student/parent) — extracted shared `sendAndLogEmail()` helper (`engagement-notification.job.ts:28-64`)
4. `sprint-status.yaml` modified but missing from File List — added to Dev Agent Record
5. `checkPersonalBest` fetched full submission records — narrowed to `select` (feedback scores only) (`engagement.service.ts:58`)

**LOW (fixed):**
6. Failed email logs omitted `subject` field — now included in all log paths
7. Raw `parentEmail` in Inngest step name — sanitized with regex (`engagement-notification.job.ts:179`)
8. No Inngest job unit tests — noted as consistent with existing codebase patterns (session-email, intervention-email also lack job tests); not added

### Files Modified by Review
- `apps/backend/src/modules/engagement/engagement.service.ts` — batch check fix, type fix, query optimization
- `apps/backend/src/modules/engagement/engagement.service.test.ts` — updated filter assertion for `status: "sent"`
- `apps/backend/src/modules/engagement/jobs/engagement-notification.job.ts` — extracted `sendAndLogEmail` helper, added subject to failure logs, sanitized step names
- `_bmad-output/implementation-artifacts/7-1-engagement-email-notifications.md` — File List fix, review notes

## Change Log
- 2026-02-26: Story 7.1 implemented — Engagement email notifications (streak + personal best detection, Inngest background job, email template with en/vi locale support)
- 2026-02-26: Code review — 8 issues found (1H/4M/3L), all fixed. Batch check bug, type safety, code deduplication, query optimization.
