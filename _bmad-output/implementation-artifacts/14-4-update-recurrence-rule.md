# Story 14.4: Update Recurrence Rule

Status: review

## Story

As a Teacher/Admin,
I want to change the recurrence pattern and apply it to future sessions only,
so that past sessions remain accurate while future ones reflect the new schedule.

## Acceptance Criteria

1. **AC1:** Teacher can edit the recurrence rule (day, time, frequency) for a class.
2. **AC2:** Changes apply to future sessions only — past sessions are untouched.
3. **AC3:** Previously created exceptions (edits/cancellations) are preserved.
4. **AC4:** A confirmation dialog shows which future sessions will be affected.

**Feature Requirement:** E4 — Session & Schedule Redesign (user feedback backlog)

## Tasks / Subtasks

- [x] Task 1: Backend — Update `schedulesService.updateSchedule()` to delete-regenerate future sessions (AC: 2, 3)
  - [x] 1.1 In `schedules.service.ts`, replace the current `updateSchedule()` (lines 125-154). Change return type from `Promise<ClassSchedule>` to `Promise<{ schedule: ClassSchedule; deletedCount: number; generatedCount: number; sessions: ClassSession[]; conflicts: ConflictResult[] }>`. The new implementation:
    - Keeps the existing `effectiveFrom` bump logic (lines 137-147).
    - After updating the schedule row, checks `shouldBumpAnchor`. If true, performs the delete-regenerate flow (steps 1.2-1.3). If false (e.g., only `roomName` changed), returns `{ schedule, deletedCount: 0, generatedCount: 0, sessions: [], conflicts: [] }`.
    - Add `ClassSession`, `ConflictResult` to the imports from `@workspace/types`.
  - [x] 1.2 Delete-regenerate is a two-phase operation (NOT a single `$transaction`):
    - **Phase 1 (delete):** Use `db.classSession.deleteMany()` with the selective where clause from 1.3. This runs via the tenanted client (`db`) — no `$transaction` needed since it's a single atomic `deleteMany` call.
    - **Phase 2 (regenerate):** Call `this.sessionsService.generateSessionsFromSchedule(centerId, id)` AFTER the delete completes. This method internally calls `getTenantedClient()` (line 384 of `sessions.service.ts`) — it CANNOT run inside a `$transaction`. This matches the `createSchedule()` pattern (lines 100-104) which also calls `generateSessionsFromSchedule` as a separate non-transactional step with try/catch.
    - Wrap the generate call in try/catch following the `createSchedule` pattern — if generation fails, the schedule update + delete still persist and the user can retry.
  - [x] 1.3 The delete query must preserve: (a) sessions with `isException = true` (individually edited/rescheduled), (b) sessions with `status = 'COMPLETED'` (attendance taken), (c) sessions with `startTime < effectiveFrom` (past sessions). Only delete sessions matching ALL of: `scheduleId = id`, `startTime >= effectiveFrom`, `isException = false`, `status != 'COMPLETED'`.

- [x] Task 2: Backend — Add preview endpoint for affected sessions count (AC: 4)
  - [x] 2.1 In `schedules.service.ts`, add `previewUpdateSchedule(db, scheduleId, effectiveFrom?)`:
    - Count sessions that WOULD be deleted: `WHERE schedule_id = :id AND start_time >= :effectiveFrom AND is_exception = false AND status != 'COMPLETED'`.
    - Count sessions that WOULD be preserved: exceptions + completed sessions in the future range.
    - Return `{ deletableCount, preservedExceptions, preservedCompleted, totalFutureAffected }`.
  - [x] 2.2 In `schedules.controller.ts`, add `previewUpdateSchedule()` that delegates to the service.
  - [x] 2.3 In `schedules.routes.ts`, add route `GET /api/v1/logistics/schedules/:id/preview-update` with RBAC `["OWNER", "ADMIN"]`. Define request/response Zod schemas in `packages/types/src/logistics.ts`.

- [x] Task 3: Backend — Update controller to emit bulk notification event (AC: 2)
  - [x] 3.1 In `schedules.controller.ts`:
    - Add Inngest client as a constructor parameter: `constructor(private readonly schedulesService: SchedulesService, private readonly inngest: Inngest)`. Update the constructor call in `schedules.routes.ts` (line 28) to pass `fastify.inngest` as the second argument.
    - Update `updateSchedule()` (lines 82-99): change return type from `ClassScheduleResponse` to match the enriched service response. The service now returns `{ schedule, deletedCount, generatedCount, sessions, conflicts }`.
    - After the service call, check if `deletedCount > 0 || generatedCount > 0` (indicates anchor fields changed). If so, fetch the schedule's `classId` from `result.schedule.classId` and emit `await this.inngest.send({ name: "logistics/schedule.recurrence-changed", data: { scheduleId: id, centerId, classId, deletedCount, generatedCount } })`.
    - Return the enriched response `{ data: result.schedule, message, deletedCount, generatedCount, sessions, conflicts }`.
  - [x] 3.2 In `session-email-notification.job.ts`:
    - Add event type `ScheduleRecurrenceChangedEvent` (following the pattern of `SessionScheduleChangedEvent` at lines 9-22): `{ name: "logistics/schedule.recurrence-changed"; data: { scheduleId: string; centerId: string; classId: string; deletedCount: number; generatedCount: number } }`.
    - Add new Inngest function `scheduleRecurrenceChangedEmailJob`:
      - Event: `"logistics/schedule.recurrence-changed"`.
      - `step.sleep("debounce-rapid-edits", "2m")` — same pattern as session email job.
      - Fetch class participants with `emailScheduleNotifications` enabled.
      - Send a summary email: "Your schedule for [ClassName] has been updated. X sessions removed, Y sessions generated with the new schedule."
    - Create bilingual email template `apps/backend/src/modules/logistics/emails/recurrence-changed.template.ts` following the existing `buildScheduleChangeEmail` pattern in `schedule-change.template.ts`.
  - [x] 3.3 Register `scheduleRecurrenceChangedEmailJob` in `apps/backend/src/modules/inngest/functions.ts` by importing it and adding it to the exported functions array (currently lines 22-39).

- [x] Task 4: Backend — Add response schema for enriched update response (AC: 1)
  - [x] 4.1 In `packages/types/src/logistics.ts`, add `UpdateScheduleResponseSchema`:
    ```ts
    export const UpdateScheduleResponseSchema = z.object({
      data: ClassScheduleSchema,
      message: z.string(),
      deletedCount: z.number(),
      generatedCount: z.number(),
      sessions: z.array(ClassSessionSchema),
      conflicts: z.array(ConflictResultSchema),
    });
    ```
  - [x] 4.2 In `packages/types/src/logistics.ts`, add `PreviewUpdateScheduleResponseSchema`:
    ```ts
    export const PreviewUpdateScheduleResponseSchema = z.object({
      data: z.object({
        deletableCount: z.number(),
        preservedExceptions: z.number(),
        preservedCompleted: z.number(),
        totalFutureAffected: z.number(),
      }),
      message: z.string(),
    });
    ```
  - [x] 4.3 Update the `PATCH /schedules/:id` route response schema from `ClassScheduleResponseSchema` to `UpdateScheduleResponseSchema`.

- [x] Task 5: Backend — Unit tests for delete-regenerate logic (AC: 2, 3)
  - [x] 5.1 Extend the existing `schedules.service.test.ts` (already exists with 14-1 tests covering create + effectiveFrom bumping). Add new test cases:
    - Updating `dayOfWeek` deletes future non-exception sessions and re-generates on the new day.
    - Updating `frequency` from WEEKLY to BIWEEKLY halves the generated sessions.
    - Exception sessions (`isException = true`) in the future are NOT deleted.
    - COMPLETED sessions in the future are NOT deleted.
    - Past sessions (startTime < now) are NOT deleted regardless of status.
    - `effectiveFrom` is bumped to current time on anchor field changes.
  - [x] 5.2 In `schedules.service.test.ts`, test `previewUpdateSchedule`:
    - Returns correct counts for deletable vs preserved sessions.
    - Returns 0 deletable when all future sessions are exceptions or completed.

- [x] Task 6: Frontend — Edit schedule dialog in ScheduleManager (AC: 1, 4)
  - [x] 6.1 In `ScheduleManager.tsx`, add an "Edit" icon button (pencil) next to each schedule row's delete button (lines 259-300). Only show for OWNER/ADMIN roles using `RBACWrapper`.
  - [x] 6.2 Create an inline `EditScheduleDialog` using Shadcn `Dialog` (NOT AlertDialog — this is a form dialog). The form should mirror the existing create form's fields:
    - `dayOfWeek` — `<Select>` with Mon-Sun (reuse same options from create form, lines 159-191).
    - `startTime` / `endTime` — `<Select>` with 30-min increments 6:00am-10:00pm (reuse `generateTimeOptions()`, line 135-145).
    - `frequency` — `<Select>` with WEEKLY / BIWEEKLY.
    - `endDate` — native `<input type="date">` (optional).
    - `roomName` — combobox from `useRooms(centerId)` (reuse existing pattern from create form, lines 207-256).
  - [x] 6.3 Pre-populate the form with current schedule values. Use `react-hook-form` + Zod validation (same schema as create form, lines 63-102, but adapted for edit — all fields optional in the `UpdateClassScheduleSchema`).
  - [x] 6.4 On form submit, BEFORE calling `updateSchedule`:
    - Call `GET /api/v1/logistics/schedules/:id/preview-update` to get affected session counts.
    - Show a confirmation step within the dialog: "This will remove X future sessions and regenerate them with the new schedule. Y exception sessions and Z completed sessions will be preserved."
    - If user confirms, call `updateSchedule({ id, input })`.
    - On success, invalidate `["schedules", classId]` and `["sessions"]` queries, show success toast.

- [x] Task 7: Frontend — Add preview API hook and update schedule response handling (AC: 4)
  - [x] 7.1 In `use-logistics.ts`, add `previewScheduleUpdate(scheduleId)` query/mutation that calls `GET /api/v1/logistics/schedules/{scheduleId}/preview-update`.
  - [x] 7.2 Update the `updateSchedule` mutation's `onSuccess` callback (line 273-275) to also invalidate `["sessions"]` queries — currently only invalidates `["schedules", classId]`. Also update `deleteScheduleMutation`'s `onSuccess` (line 288-290) to invalidate `["sessions"]` since deleting a schedule nullifies `scheduleId` on sessions (cascade: SetNull).
  - [x] 7.3 Run `pnpm --filter=webapp sync-schema-dev` after backend routes are added (requires backend running locally).

- [x] Task 8: Frontend — i18n keys for edit schedule UI (AC: 1, 4)
  - [x] 8.1 Add keys to `apps/webapp/src/locales/en/logistics.json`:
    - `scheduleManager.editSchedule`: "Edit Schedule"
    - `scheduleManager.editScheduleDescription`: "Update the recurrence rule for this class schedule"
    - `scheduleManager.confirmUpdateTitle`: "Update Recurrence Rule?"
    - `scheduleManager.confirmUpdateBody`: "This will remove {{deletableCount}} future sessions and regenerate them with the new schedule."
    - `scheduleManager.preservedExceptions`: "{{count}} individually edited sessions will be preserved"
    - `scheduleManager.preservedCompleted`: "{{count}} completed sessions will be preserved"
    - `scheduleManager.updateSuccess`: "Schedule updated — {{generatedCount}} sessions regenerated"
    - `scheduleManager.updateError`: "Failed to update schedule"
    - `scheduleManager.noChanges`: "No changes detected"
  - [x] 8.2 Add corresponding Vietnamese translations to `apps/webapp/src/locales/vi/logistics.json`.

- [x] Task 9: Tests + verification (AC: 1, 2, 3, 4)
  - [x] 9.1 Run `pnpm --filter=backend test` to confirm all existing tests pass + new tests pass.
  - [x] 9.2 Verify TypeScript compiles cleanly for both backend and webapp: `pnpm --filter=backend build && pnpm --filter=webapp build`.
  - [x] 9.3 Run `pnpm --filter=webapp sync-schema-dev` if schema changes needed (requires backend running locally — defer to merge if not available).

## Dev Notes

### What Already Exists (DO NOT recreate)

**Backend schedule service — EXTEND, don't replace:**
- `schedules.service.ts` → `updateSchedule()` (lines 125-154): already bumps `effectiveFrom` when `ANCHOR_BUMPING_FIELDS` change (`dayOfWeek`, `startTime`, `endTime`, `frequency`). Currently does NOT re-generate sessions — this story adds that.
- `schedules.service.ts` → `createSchedule()` (lines 54-123): already calls `sessionsService.generateSessionsFromSchedule()` after create — follow the same try/catch pattern for update.
- `schedules.controller.ts` → `updateSchedule()` (lines 82-99): currently returns plain schedule — needs enriched response.
- `schedules.routes.ts` → `PATCH /:id` (lines 126-148): RBAC `["OWNER", "ADMIN"]` — keep this, add new preview route alongside.

**Session generation engine — USE AS-IS, do not modify:**
- `sessions.service.ts` → `generateSessionsFromSchedule()` (lines 351-597): the complete session generation engine. Handles:
  - Timezone-aware date generation via `buildSessionInstant()` / `dayOfWeekInTz()`.
  - `effectiveFrom` as range start (max of effectiveFrom vs today).
  - `endDate` as range end (or +3 months rolling window).
  - BIWEEKLY anchor math (7-day bucket from `effectiveFrom`).
  - Dedup against existing sessions (including manual sessions at same slot).
  - Exception dedup: `originalStartTime` blocks regeneration for rescheduled (non-cancelled) sessions.
  - `createMany` with `skipDuplicates: true` + DB unique index `class_session_schedule_start_uk`.
  - Batch conflict detection post-generation.

**Session delete — CANNOT reuse directly:**
- `sessions.service.ts` → `deleteFutureSessions()` (lines 311-349): deletes ALL future sessions for a scheduleId, including exceptions and completed. This is too aggressive for 14-4 — we need selective deletion that preserves exceptions and completed sessions. Write a new query.

**Frontend schedule hook — EXTEND:**
- `use-logistics.ts` → `useSchedules()` (lines 216-302): `updateSchedule` mutation exists but is never called from UI. Wire it from the new edit dialog.

**Frontend ScheduleManager — EXTEND:**
- `ScheduleManager.tsx` → displays schedule rows with delete button. Add edit button + dialog alongside.

**Frontend create form — REUSE patterns:**
- `ScheduleManager.tsx` → create form fields (lines 159-256): day selector, time selectors, frequency, end date, room combobox. Reuse the same field patterns for the edit dialog.

### Architecture Compliance

**Backend pattern:** Route → Controller → Service (layered architecture).
- Route: handles Fastify-specific logic, extracts params, calls controller.
- Controller: orchestrates services, formats `{ data, message }` response, emits Inngest events.
- Service: interacts with DB, returns raw data. Throws domain errors.

**Multi-tenancy:** Use `getTenantedClient(centerId)` from `@workspace/db`. NEVER inside `$transaction` — use the `tx` client with explicit `centerId` filters.

**API response format:** `{ data: T | null, message: string }` via `createResponseSchema()`.

**Validation:** Zod schemas in `packages/types`. Backend uses `fastify-type-provider-zod`. Frontend uses `react-hook-form` + `@hookform/resolvers/zod`.

**Naming conventions:**
- Endpoints: `kebab-case`, plural nouns (`/api/v1/logistics/schedules/:id/preview-update`)
- React components: PascalCase
- i18n keys: camelCase dot-notation
- DB columns: `camelCase` in Prisma, mapped to `snake_case` via `@map`

**Inngest events:** emit from controller (not service), use `inngest.send()`. Event names: `domain/entity.action` format (e.g., `logistics/schedule.recurrence-changed`).

**Email notifications:** follow existing `session-email-notification.job.ts` pattern with debounce, bilingual templates, per-recipient `step.run`.

### Critical Implementation Rules

1. **DO NOT modify `generateSessionsFromSchedule()`** — it already handles everything correctly (dedup, exceptions, biweekly, timezone). Just call it after deleting future non-protected sessions.

2. **The delete query is the critical piece.** Must preserve exceptions AND completed sessions. The conditions are: `scheduleId = id AND startTime >= effectiveFrom AND isException = false AND status != 'COMPLETED'`. Get this wrong and you'll destroy teacher edits or attendance records.

3. **Two-phase delete-regenerate, NOT a single `$transaction`.** The delete uses `db.classSession.deleteMany()` (a single atomic Prisma call via the tenanted client). The regenerate calls `generateSessionsFromSchedule(centerId, scheduleId)` which internally calls `getTenantedClient()` — it CANNOT run inside `$transaction` (the `tx` client does not support `$extends`). This matches the `createSchedule()` pattern (lines 100-104) which also runs generation as a separate non-transactional step.

4. **Generation failure is non-fatal.** Wrap `generateSessionsFromSchedule` in try/catch following the `createSchedule` pattern. If generation fails after the delete, the schedule update persists and the user sees the schedule with fewer sessions — they can re-trigger generation or edit again. The `createMany` with `skipDuplicates` + unique index makes repeated generation attempts idempotent.

5. **Preview endpoint is read-only.** It counts sessions matching the delete criteria without modifying anything. This lets the frontend show the confirmation dialog before the destructive action.

6. **RBAC:** Only OWNER and ADMIN can modify recurrence rules (consistent with existing `PATCH /schedules/:id`). Teachers can only edit individual sessions (via `PATCH /sessions/:id`).

7. **`effectiveFrom` double duty.** It serves as: (a) the biweekly anchor for counting intervals, and (b) the "rule last changed" timestamp. When the rule changes, bump it to `new Date()` — this ensures re-generated sessions start from now (not from the old anchor), and biweekly counting resets to the new anchor.

8. **No lesson-plan-mapper.ts exists yet.** The architecture doc mentions it for story 14.4 + 19.2, but it hasn't been built. For this story, skip lesson plan inheritance — it's a future concern (Epic 19). Session generation creates plain sessions without lesson content.

### RBAC Requirements

| Action | Owner | Admin | Teacher (assigned) | Student |
|--------|-------|-------|--------------------|---------|
| Edit recurrence rule | Yes | Yes | No | No |
| Preview affected sessions | Yes | Yes | No | No |
| View schedule list | Yes | Yes | Yes | Yes |

### Testing Standards

- **Framework:** Vitest, co-located with source
- **Command:** `pnpm --filter=backend test`
- **Current baseline:** 1173 tests passing (from story 14-3) — ensure no regressions
- **New tests required:** `schedules.service.test.ts` for delete-regenerate logic and preview
- **Frontend verification:** TypeScript compiles cleanly for both apps

### Previous Story Intelligence (14-3)

**Key learnings to apply:**
- Backend exception tracking is solid — `isException`, `originalStartTime`, `originalEndTime` all work correctly. Trust the existing session generation dedup logic.
- `checkConflictsImmediate()` works for discrete events (drop). The same conflict check runs automatically inside `generateSessionsFromSchedule` via `checkBatchConflicts` — conflicts will be surfaced in the response.
- Confirmation dialog pattern (Shadcn AlertDialog) is established from 14-2 cancel and 14-3 reschedule. For the edit dialog, use `Dialog` (not AlertDialog) since it has a form, with a confirmation step embedded inside.
- i18n keys must be added to both `en/logistics.json` AND `vi/logistics.json`.

**Files modified in 14-3 that are relevant (read for patterns):**
- `ScheduleManager.tsx` — existing schedule row layout to extend with edit button
- `scheduler-page.tsx` — confirmation dialog pattern (AlertDialog for simple confirm)
- `use-logistics.ts` — `updateSchedule` mutation already exists but is unwired

### Git Intelligence

Recent commits follow conventional commits with scope:
- `feat(logistics): reschedule single occurrence with drag confirmation and code review fixes (story 14-3)`
- `feat(logistics): edit/cancel individual sessions with code review fixes (story 14-2)`
- `feat(logistics): auto-generate sessions from recurrence with code review fixes (story 14-1)`

Expected commit: `feat(logistics): update recurrence rule with delete-regenerate and confirmation (story 14-4)`

### Project Structure Notes

**UX entry point:** User navigates to Classes page → opens class drawer → ScheduleManager section shows existing schedules → clicks edit (pencil) button on a schedule row → EditScheduleDialog opens inside the drawer. The scheduler-page (weekly calendar) only shows sessions, not schedule rules — no changes to the scheduler page.

**Backend changes:**
- `apps/backend/src/modules/logistics/schedules.service.ts` — enhanced `updateSchedule()` return type + delete-regenerate logic + new `previewUpdateSchedule()`
- `apps/backend/src/modules/logistics/schedules.controller.ts` — add Inngest constructor param + enriched response + Inngest event emission + preview handler
- `apps/backend/src/modules/logistics/schedules.routes.ts` — new `GET /:id/preview-update` route + updated PATCH response schema + pass `fastify.inngest` to controller
- `apps/backend/src/modules/logistics/schedules.service.test.ts` — extend existing test file with delete-regenerate + preview tests
- `apps/backend/src/modules/logistics/jobs/session-email-notification.job.ts` — new `scheduleRecurrenceChangedEmailJob` function + event type
- `apps/backend/src/modules/logistics/emails/recurrence-changed.template.ts` — NEW bilingual email template
- `apps/backend/src/modules/inngest/functions.ts` — register `scheduleRecurrenceChangedEmailJob`

**Frontend changes:**
- `apps/webapp/src/features/logistics/components/ScheduleManager.tsx` — edit button + EditScheduleDialog
- `apps/webapp/src/features/logistics/hooks/use-logistics.ts` — preview query + update mutation fix
- `apps/webapp/src/locales/en/logistics.json` — i18n keys
- `apps/webapp/src/locales/vi/logistics.json` — i18n keys (Vietnamese)

**Shared changes:**
- `packages/types/src/logistics.ts` — `UpdateScheduleResponseSchema`, `PreviewUpdateScheduleResponseSchema`

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 14, Story 14.4]
- [Source: _bmad-output/planning-artifacts/architecture.md — Session exception handling, recurrence model, update-in-place pattern]
- [Source: _bmad-output/implementation-artifacts/14-3-reschedule-single-occurrence.md — previous story context]
- [Source: project-context.md — technology stack, critical rules, $transaction multi-tenancy rule]
- [Source: apps/backend/src/modules/logistics/schedules.service.ts — current updateSchedule implementation]
- [Source: apps/backend/src/modules/logistics/sessions.service.ts — generateSessionsFromSchedule engine]
- [Source: apps/webapp/src/features/logistics/components/ScheduleManager.tsx — current schedule UI]
- [Source: apps/webapp/src/features/logistics/hooks/use-logistics.ts — useSchedules hook with unwired updateSchedule]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

None — clean implementation, no blocking issues.

### Completion Notes List

- Task 1: Updated `updateSchedule()` in `schedules.service.ts` to return enriched response with `{ schedule, deletedCount, generatedCount, sessions, conflicts }`. Implemented two-phase delete-regenerate: selective `deleteMany` preserving exceptions/completed/past sessions, followed by `generateSessionsFromSchedule` call with try/catch (matching `createSchedule` pattern).
- Task 2: Added `previewUpdateSchedule()` service method returning `{ deletableCount, preservedExceptions, preservedCompleted, totalFutureAffected }`. Added controller handler and `GET /:id/preview-update` route with RBAC `["OWNER", "ADMIN"]`.
- Task 3: Controller now emits `logistics/schedule.recurrence-changed` Inngest event when `deletedCount > 0 || generatedCount > 0`. Created bilingual email template `recurrence-changed.template.ts`. Added `scheduleRecurrenceChangedEmailJob` with debounce + cancelOn pattern. Registered in `functions.ts`. Used direct `inngest` import (matching existing codebase pattern) instead of constructor injection.
- Task 4: Added `UpdateScheduleResponseSchema` and `PreviewUpdateScheduleResponseSchema` to `packages/types/src/logistics.ts`. Updated PATCH route response schema.
- Task 5: Added 9 new tests to `schedules.service.test.ts` — 6 for delete-regenerate logic, 3 for preview. Total: 1182 tests passing (up from 1173 baseline).
- Task 6: Added edit (pencil) button to each schedule row. Created `EditScheduleDialog` with form mirroring create form fields, pre-populated with current values. Implements preview confirmation flow before destructive update.
- Task 7: Added `previewScheduleUpdate` function and `isUpdating` state to `useSchedules` hook. Fixed `updateSchedule` and `deleteSchedule` mutations to also invalidate `["sessions"]` queries.
- Task 8: Added 9 i18n keys to both `en/logistics.json` and `vi/logistics.json`.
- Task 9: All 1182 backend tests pass. Both backend and webapp build cleanly.

### Change Log

- 2026-04-18: Story 14-4 implemented — update recurrence rule with delete-regenerate and confirmation

### File List

- `apps/backend/src/modules/logistics/schedules.service.ts` — enhanced `updateSchedule()` + new `previewUpdateSchedule()`
- `apps/backend/src/modules/logistics/schedules.controller.ts` — enriched response + Inngest event + preview handler
- `apps/backend/src/modules/logistics/schedules.routes.ts` — new preview-update route + updated PATCH response schema
- `apps/backend/src/modules/logistics/schedules.service.test.ts` — 9 new tests for delete-regenerate + preview
- `apps/backend/src/modules/logistics/jobs/session-email-notification.job.ts` — new event type + `scheduleRecurrenceChangedEmailJob`
- `apps/backend/src/modules/logistics/emails/recurrence-changed.template.ts` — NEW bilingual email template
- `apps/backend/src/modules/inngest/functions.ts` — registered `scheduleRecurrenceChangedEmailJob`
- `packages/types/src/logistics.ts` — `UpdateScheduleResponseSchema` + `PreviewUpdateScheduleResponseSchema`
- `apps/webapp/src/features/logistics/components/ScheduleManager.tsx` — edit button + `EditScheduleDialog`
- `apps/webapp/src/features/logistics/hooks/use-logistics.ts` — preview query + session invalidation fixes
- `apps/webapp/src/locales/en/logistics.json` — 9 new i18n keys
- `apps/webapp/src/locales/vi/logistics.json` — 9 new Vietnamese translations
