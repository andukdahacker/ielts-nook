# Story 7.2: Notification Preferences

Status: done

## Story

As a User,
I want to control which email notifications I receive,
so that I only get relevant updates.

> **FR31 note:** PRD FR31 specifies _"Parent/User can manage email notification preferences."_ This story adds per-category toggles and a master pause switch to the existing User Profile page (Story 1.9). Categories map to the two existing email types that users receive: schedule changes (already toggleable) and engagement/achievement emails (new toggle). A master "Pause all" toggle provides temporary opt-out across all categories (AC3).

## Acceptance Criteria

1. **AC1 — Notification Preferences Section:** User Profile page (Story 1.9, `ProfileEditForm.tsx`) includes a dedicated "Notification Preferences" section grouping all email notification toggles.
2. **AC2 — Per-Category Toggles:** Users can independently toggle:
   - **Schedule Changes** — Receive emails when class schedule is modified or sessions are cancelled. _(Already exists as `emailScheduleNotifications`, regroup into this section.)_
   - **Achievements & Streaks** — Receive emails celebrating 7-day streaks and personal bests. _(New field: `emailEngagementNotifications`, default ON.)_
3. **AC3 — Master Pause Toggle:** A "Pause all email notifications" toggle (default OFF) that, when enabled, suppresses ALL email notifications regardless of per-category settings. Visual emphasis (warning color or description) indicates this overrides individual toggles.
4. **AC4 — Default All ON:** New users have all notification categories ON and pause OFF by default (enforced via DB column defaults).

## Tasks / Subtasks

- [x] **Task 1: Database Migration** (AC: 2, 3, 4)
  - [x] 1.1 Add `emailEngagementNotifications Boolean @default(true) @map("email_engagement_notifications")` to User model in `packages/db/prisma/schema.prisma` (after line 19, alongside existing `emailScheduleNotifications`)
  - [x] 1.2 Add `emailNotificationsPaused Boolean @default(false) @map("email_notifications_paused")` to User model (after the engagement field)
  - [x] 1.3 Run `pnpm --filter=db db:migrate:dev --name add-notification-preferences`
  - [x] 1.4 Run `pnpm --filter=db db:generate` to regenerate Prisma Client

- [x] **Task 2: Update Shared Types** (AC: 1, 2, 3)
  - [x] 2.1 In `packages/types/src/user.ts` → `UserProfileSchema`: Add `emailEngagementNotifications: z.boolean()` and `emailNotificationsPaused: z.boolean()` (after line 144 `emailScheduleNotifications`)
  - [x] 2.2 In `packages/types/src/user.ts` → `UpdateProfileSchema`: Add `emailEngagementNotifications: z.boolean().optional()` and `emailNotificationsPaused: z.boolean().optional()` (after line 166)
  - [x] 2.3 In `packages/types/src/auth/dto.ts` → `AuthUserSchema`: Add `emailEngagementNotifications: z.boolean().optional()` and `emailNotificationsPaused: z.boolean().optional()` (after line 16)
  - [x] 2.4 Run `pnpm --filter=types build` to verify types compile

- [x] **Task 3: Backend Service Updates** (AC: 1, 2, 3)
  - [x] 3.1 In `apps/backend/src/modules/users/users.service.ts` → `getUserById()` (line ~63-77): Add `emailEngagementNotifications` and `emailNotificationsPaused` to the returned `UserProfile` object
  - [x] 3.2 In `apps/backend/src/modules/users/users.service.ts` → `updateProfile()` (line ~80-117): Add both fields to the `data` object in `prisma.user.update()` and to the returned `UserProfile` object
  - [x] 3.3 Verify existing profile tests still pass: `pnpm --filter=backend test`

- [x] **Task 4: Engagement Job Preference Enforcement** (AC: 2, 3)
  - [x] 4.1 In `apps/backend/src/modules/engagement/jobs/engagement-notification.job.ts` → "fetch-student" step (line ~120-136): Add `emailEngagementNotifications` and `emailNotificationsPaused` to the `select` clause
  - [x] 4.2 After the `fetch-student` step (line ~138), add preference check: if `emailNotificationsPaused === true` OR `emailEngagementNotifications === false`, return `{ status: "preferences-disabled" }`
  - [x] 4.3 IMPORTANT: The preference check must happen AFTER achievement detection and batch limit check (Steps 1-2) but BEFORE sending. This avoids unnecessary DB queries when no achievements were detected anyway. Insert the check between the existing batch-limit check and the email construction.

- [x] **Task 5: Schedule Email Job Preference Enforcement** (AC: 3)
  - [x] 5.1 In `apps/backend/src/modules/logistics/jobs/session-email-notification.job.ts` → `fetchRecipientsForClass()` (line ~44-97): Add `emailNotificationsPaused` to the `select` clause for both teacher and students (lines 59 and 70)
  - [x] 5.2 Update the filter at line 87 from `.filter((u) => u.emailScheduleNotifications && u.email)` to `.filter((u) => u.emailScheduleNotifications && !u.emailNotificationsPaused && u.email)`

- [x] **Task 6: Frontend — Notification Preferences UI** (AC: 1, 2, 3)
  - [x] 6.1 In `apps/webapp/src/features/users/components/ProfileEditForm.tsx`:
    - Add `emailEngagementNotifications: z.boolean()` and `emailNotificationsPaused: z.boolean()` to `profileFormSchema`
    - Add default values in `useForm` defaultValues
  - [x] 6.2 Replace the single `emailScheduleNotifications` toggle with a "Notification Preferences" section containing:
    - Master pause toggle (prominent, with amber/warning styling when ON and descriptive text that it overrides all toggles below)
    - Schedule changes toggle (existing behavior, regrouped)
    - Achievements & streaks toggle (new)
  - [x] 6.3 When master pause is ON, visually dim/disable the per-category toggles (but don't change their saved values — user can re-enable pause and their previous per-category settings are preserved)
  - [x] 6.4 In `apps/webapp/src/features/users/profile-page.tsx`: Update the view-mode display to show the new preference fields (line ~314 area where `emailScheduleNotifications` is displayed)

- [x] **Task 7: Schema Sync** (AC: all)
  - [x] 7.1 Start backend: `pnpm --filter=backend dev`
  - [x] 7.2 Regenerate frontend types: `pnpm --filter=webapp sync-schema-dev`
  - [x] 7.3 Verify no TypeScript errors in webapp: `pnpm --filter=webapp build`

- [x] **Task 8: Tests** (AC: all)
  - [x] 8.1 Update existing `engagement.service.test.ts` if any tests directly assert on the job flow (likely no changes needed — service functions are independent of preferences)
  - [x] 8.2 Verify all existing backend tests pass: `pnpm --filter=backend test`
  - [x] 8.3 Verify engagement notification job works with preference checks by running existing test suite
  - [x] 8.4 Verify schedule email job works with master pause by running existing test suite

## Dev Notes

### Design Decisions

**Why only 2 category toggles (not 4 from AC2)?**

AC2 in the epics lists "Grades, Attendance, Streaks/Achievements, Schedule Changes." However:
- "Schedule Changes" → Already exists as `emailScheduleNotifications` (covers `schedule-change` + `session-cancelled` email types)
- "Streaks/Achievements" → New `emailEngagementNotifications` (covers `engagement` email type)
- "Grades" → No email notification exists for individual grading events. Adding a dead toggle is over-engineering. Add when a grading-notification email feature is built.
- "Attendance" → No email notification exists for attendance events. Same rationale.

**Why NOT gating intervention emails behind a preference toggle?**

Interventions are teacher-initiated communications to parents about at-risk students (`student-health/intervention.send`). These are deliberate, human-authored concern emails — not automated notifications. Allowing students/parents to opt out would undermine the teacher's ability to communicate critical concerns. The teacher already decides when and whether to send each intervention.

### Prisma Schema Changes

Add these 2 fields to the User model in `packages/db/prisma/schema.prisma` (after line 19):

```prisma
emailEngagementNotifications Boolean   @default(true) @map("email_engagement_notifications")
emailNotificationsPaused     Boolean   @default(false) @map("email_notifications_paused")
```

Field placement — group all notification-related fields together:
```prisma
emailScheduleNotifications   Boolean   @default(true) @map("email_schedule_notifications")   // existing
emailEngagementNotifications Boolean   @default(true) @map("email_engagement_notifications")  // NEW
emailNotificationsPaused     Boolean   @default(false) @map("email_notifications_paused")     // NEW
parentEmail                  String?   @map("parent_email")                                    // existing
```

### Types Changes

**`packages/types/src/user.ts`** — 2 schemas to update:

```typescript
// UserProfileSchema — add after emailScheduleNotifications (line 144)
emailEngagementNotifications: z.boolean(),
emailNotificationsPaused: z.boolean(),

// UpdateProfileSchema — add after emailScheduleNotifications (line 166)
emailEngagementNotifications: z.boolean().optional(),
emailNotificationsPaused: z.boolean().optional(),
```

**`packages/types/src/auth/dto.ts`** — AuthUserSchema:

```typescript
// Add after emailScheduleNotifications (line 16)
emailEngagementNotifications: z.boolean().optional(),
emailNotificationsPaused: z.boolean().optional(),
```

### Backend Service Changes

**`apps/backend/src/modules/users/users.service.ts`** — 2 methods:

`getUserById()` (line ~63-77) — add to the return object:
```typescript
emailEngagementNotifications: membership.user.emailEngagementNotifications,
emailNotificationsPaused: membership.user.emailNotificationsPaused,
```

`updateProfile()` (line ~80-117) — add to `prisma.user.update({ data: ... })`:
```typescript
emailEngagementNotifications: input.emailEngagementNotifications,
emailNotificationsPaused: input.emailNotificationsPaused,
```
And add to the return object:
```typescript
emailEngagementNotifications: user.emailEngagementNotifications,
emailNotificationsPaused: user.emailNotificationsPaused,
```

### Engagement Job Enforcement

**`apps/backend/src/modules/engagement/jobs/engagement-notification.job.ts`**

In the "fetch-student" step (line ~120-136), add the 2 new fields to the `select`:
```typescript
select: {
  id: true,
  email: true,
  name: true,
  preferredLanguage: true,
  parentEmail: true,
  emailEngagementNotifications: true,  // NEW
  emailNotificationsPaused: true,      // NEW
},
```

After the `fetch-student` step completes and the email-null check (line ~138), add:
```typescript
// Check notification preferences
if (recipientData.emailNotificationsPaused || !recipientData.emailEngagementNotifications) {
  return { status: "preferences-disabled" };
}
```

**Why check AFTER fetch-student, not as a separate step?** The preference fields are already fetched in the same `user.findUnique()` query — zero additional DB cost. Adding a separate `step.run()` would add Inngest step overhead for no benefit.

**Note on parent emails:** When the student has preferences disabled, we skip sending to parent emails too. The achievement belongs to the student — if they don't want the notification, their parents shouldn't get it either. This is consistent with the daily-batch-limit behavior (if student already got one today, parents don't get a duplicate).

### Schedule Email Job Enforcement

**`apps/backend/src/modules/logistics/jobs/session-email-notification.job.ts`**

In `fetchRecipientsForClass()` (line ~44-97):

1. Add `emailNotificationsPaused: true` to the `select` for teacher (line ~59) and students (line ~70)
2. Update filter (line ~87):
```typescript
// BEFORE:
.filter((u) => u.emailScheduleNotifications && u.email)
// AFTER:
.filter((u) => u.emailScheduleNotifications && !u.emailNotificationsPaused && u.email)
```

This applies to both the `sessionEmailNotificationJob` and `sessionCancellationEmailJob` since they share `fetchRecipientsForClass()`.

### Frontend Changes

**`apps/webapp/src/features/users/components/ProfileEditForm.tsx`**

Schema update:
```typescript
const profileFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  phoneNumber: z.string().max(20, "Phone number must be at most 20 characters").optional().or(z.literal("")),
  preferredLanguage: z.enum(["en", "vi"]),
  emailScheduleNotifications: z.boolean(),
  emailEngagementNotifications: z.boolean(),     // NEW
  emailNotificationsPaused: z.boolean(),          // NEW
});
```

UI structure — Replace the single `emailScheduleNotifications` FormField with a grouped section:

```
── Notification Preferences ──────────────────────
  [Switch] Pause all email notifications
           "Temporarily stop all email notifications.
            Your category preferences are preserved."
           (amber/warning styling when ON)

  [Switch] Schedule changes                    (dimmed when paused)
           "Email me when class schedules change
            or sessions are cancelled"

  [Switch] Achievements & streaks              (dimmed when paused)
           "Email me when I hit a 7-day streak
            or achieve a personal best"
────────────────────────────────────────────────────
```

**Master pause visual behavior:**
- Use `form.watch("emailNotificationsPaused")` to reactively dim the per-category toggles
- Apply `opacity-50 pointer-events-none` to per-category toggles when paused (CSS only — don't change form values)
- Show amber/yellow border or background on the pause toggle when it's ON to indicate override state

### Existing Infrastructure — DO NOT Rebuild

| Component | Location | Notes |
|---|---|---|
| ProfileEditForm | `apps/webapp/src/features/users/components/ProfileEditForm.tsx` | Extend with new fields |
| User Profile page | `apps/webapp/src/features/users/profile-page.tsx` | Update view-mode display |
| UpdateProfileSchema | `packages/types/src/user.ts` | Extend with new optional fields |
| UserProfileSchema | `packages/types/src/user.ts` | Extend with new required fields |
| AuthUserSchema | `packages/types/src/auth/dto.ts` | Extend with new optional fields |
| UsersService | `apps/backend/src/modules/users/users.service.ts` | Extend getUserById + updateProfile |
| Engagement job | `apps/backend/src/modules/engagement/jobs/engagement-notification.job.ts` | Add preference check |
| Schedule email job | `apps/backend/src/modules/logistics/jobs/session-email-notification.job.ts` | Add master pause check |
| Prisma schema | `packages/db/prisma/schema.prisma` | Add 2 fields to User model |
| Switch component | `@workspace/ui/components/switch` | Already imported in ProfileEditForm |

### Database — Migration Required

New columns added to `user` table:
- `email_engagement_notifications BOOLEAN NOT NULL DEFAULT true`
- `email_notifications_paused BOOLEAN NOT NULL DEFAULT false`

Both have defaults, so migration is non-breaking. Existing users get `true`/`false` respectively. No data migration needed.

### File Structure

No new files created. All changes are modifications to existing files:

```
packages/db/prisma/schema.prisma                      — Add 2 fields to User model
packages/db/prisma/migrations/XXXX_add-notification-preferences/migration.sql — Auto-generated
packages/types/src/user.ts                             — Extend 2 schemas
packages/types/src/auth/dto.ts                         — Extend AuthUserSchema
apps/backend/src/modules/users/users.service.ts        — Extend 2 methods
apps/backend/src/modules/engagement/jobs/engagement-notification.job.ts — Add preference check
apps/backend/src/modules/logistics/jobs/session-email-notification.job.ts — Add master pause to filter
apps/webapp/src/features/users/components/ProfileEditForm.tsx — Regroup notification toggles
apps/webapp/src/features/users/profile-page.tsx        — Update view-mode display
apps/webapp/src/schema/schema.d.ts                     — Auto-regenerated (DO NOT edit)
```

### Key Implementation Warnings

1. **DO NOT create a separate NotificationPreference model** — Store preferences directly on User model. Follows existing pattern (`emailScheduleNotifications` is on User).
2. **DO NOT add toggles for email types that don't exist yet** — No "Grades" or "Attendance" toggles. Add when those email features are built.
3. **DO NOT gate intervention emails behind preferences** — Interventions are teacher-initiated, not automated. Students cannot opt out.
4. **DO NOT change per-category toggle values when master pause is toggled** — Only the visual state changes. When user un-pauses, their previous per-category settings are preserved.
5. **DO NOT add a separate Inngest step for preference checks** — The preference fields are fetched in the same query as the user data. Zero additional DB cost.
6. **Run `pnpm --filter=db db:migrate:dev --name add-notification-preferences`** — NOT `db:push`. Follow the migration workflow per `project-context.md`.
7. **Run `pnpm --filter=webapp sync-schema-dev` after backend changes** — Frontend types won't have the new fields until schema is synced.
8. **`emailNotificationsPaused` defaults to `false`** — NOT `true`. Users should receive emails by default (AC4).

### Previous Story (7.1) Intelligence

From Story 7.1 implementation:
- Engagement job follows `createPrisma()` + `getTenantedClient()` + `$disconnect()` in finally pattern
- The `fetch-student` step already selects `preferredLanguage` and `parentEmail` — add the 2 new fields to the same `select`
- The `sendAndLogEmail()` helper is generic — no changes needed to it
- Code review found and fixed: `DbClient = any` type violation, duplicate email-sending code, batch check counting failed entries. These are already fixed in the committed code.
- 866 backend tests pass as of Story 7.1 completion

### Git Intelligence

Recent commits show consistent patterns:
- `feat: Story 7.1 — Engagement email notifications with code review fixes` — Most recent, this is the immediate predecessor
- Commit pattern: `feat: Story X.Y — Description with code review fixes`
- All stories include code review fixes in the same commit

### Project Structure Notes

- All changes extend existing files — no new modules or directories
- Notification preferences are co-located with user profile (follows existing pattern)
- Migration follows `db:migrate:dev` workflow per updated `project-context.md` (NOT `db:push`)
- Frontend schema sync required after backend route changes

### References

- [Source: project-context.md#Critical Implementation Rules] — Multi-tenancy, migration workflow
- [Source: epics.md#Epic 7, Story 7.2] — FR31 acceptance criteria
- [Source: prd.md#FR31] — Parent/User can manage email notification preferences
- [Source: architecture.md#Implementation Patterns] — Feature-first organization
- [Source: 7-1-engagement-email-notifications.md] — Previous story learnings, job patterns
- [Source: 2-6-schedule-change-notifications-email.md] — emailScheduleNotifications pattern reference
- [Source: ProfileEditForm.tsx] — Current notification toggle UI pattern
- [Source: users.service.ts] — Current updateProfile/getUserById implementation

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation, no blockers.

### Completion Notes List

- Added `emailEngagementNotifications` (default true) and `emailNotificationsPaused` (default false) to User model
- Extended UserProfileSchema, UpdateProfileSchema, AuthUserSchema with new fields
- Extended `getUserById()` and `updateProfile()` in users.service.ts
- Engagement job: fetches new fields in same query, returns `preferences-disabled` if paused or engagement off
- Schedule email job: added `emailNotificationsPaused` to teacher/student select, updated filter to exclude paused users
- Frontend: replaced single toggle with "Notification Preferences" section — master pause (amber styling), schedule changes, achievements & streaks toggles
- Master pause disables per-category toggles via `disabled` prop (prevents keyboard + mouse + screen reader accessible)
- View-mode profile page updated to show all notification preference states (dims toggles when paused)
- Schema sync completed — 14 occurrences of new fields in generated schema.d.ts
- All 871 backend tests pass, webapp builds with 0 errors

### File List

- `packages/db/prisma/schema.prisma` — Added 2 fields to User model
- `packages/db/prisma/migrations/20260226091237_add_notification_preferences/migration.sql` — Auto-generated migration
- `packages/types/src/user.ts` — Extended UserProfileSchema + UpdateProfileSchema
- `packages/types/src/auth/dto.ts` — Extended AuthUserSchema
- `apps/backend/src/modules/users/users.service.ts` — Extended getUserById + updateProfile
- `apps/backend/src/modules/engagement/jobs/engagement-notification.job.ts` — Added preference check
- `apps/backend/src/modules/logistics/jobs/session-email-notification.job.ts` — Added master pause to filter
- `apps/webapp/src/features/users/components/ProfileEditForm.tsx` — Notification Preferences section
- `apps/webapp/src/features/users/profile-page.tsx` — Updated view-mode display
- `apps/webapp/src/schema/schema.d.ts` — Auto-regenerated
- `apps/backend/src/modules/engagement/jobs/engagement-notification.job.test.ts` — NEW: Preference enforcement tests (5 tests)
- `apps/backend/src/modules/users/profile.integration.test.ts` — Updated mock with notification fields + assertions

## Change Log

- 2026-02-26: Story 7.2 implemented — Notification preferences (engagement toggle, master pause, UI regrouping)
- 2026-02-26: Code review fixes — Added 5 preference enforcement tests for engagement job, updated profile test mock with new fields, fixed Switch keyboard accessibility (disabled prop replaces pointer-events-none), added view-mode dimming when paused
