# Story 14.2: Edit/Cancel Individual Sessions

Status: review

## Story

As a Teacher,
I want to edit or cancel a single session occurrence,
so that I can handle exceptions without affecting the entire series.

## Acceptance Criteria

1. **AC1:** Teacher can select a single session and choose "Edit" or "Cancel".
2. **AC2:** Cancelled sessions are visually marked (strikethrough or badge) but not deleted.
3. **AC3:** Editing a single session creates an exception — it no longer follows the series rule.
4. **AC4:** Students are notified of cancellations.

**Feature Requirement:** FR72 — [Teacher] can [cancel a single session occurrence without affecting the rest of the series, preserving the cancelled session as a visible record with visual marking and triggering student notification within 30 seconds].

## Tasks / Subtasks

- [x] Task 1: Backend — Cancel endpoint + exception tracking on edit + RBAC (AC: 2, 3, 4)
  - [x] 1.1 Add `cancelSession(centerId, id)` to `sessions.service.ts` — sets `isException = true`, `status = CANCELLED`, populates `originalStartTime`/`originalEndTime` if not already set. Guard: return 409 if `status = COMPLETED`. Idempotent on already-cancelled.
  - [x] 1.2 Add `cancelSession()` to `sessions.controller.ts` — calls service, creates in-app notification via `notificationsService.createBulkNotifications()`, emits `logistics/session.cancelled` Inngest event with `isBulk: false` (mirrors existing `deleteSession()` controller pattern at lines 178-230)
  - [x] 1.3 Add `POST /:id/cancel` route in `sessions.routes.ts` — RBAC: `["OWNER", "ADMIN", "TEACHER"]`. Add `checkTeacherSessionAccess` preHandler for Teacher class-assignment check (reuse pattern from `attendance.routes.ts` lines 28-73: query session with class.teacherId, compare to `request.jwtPayload.uid`)
  - [x] 1.4 Modify `updateSession()` in `sessions.service.ts` — when `startTime` or `endTime` changes (compare against returned `previousStartTime`/`previousEndTime`), set `isException = true` and populate `originalStartTime`/`originalEndTime` with previous values. If `originalStartTime` is already set (re-edit), do NOT overwrite. Room-only edits must NOT set `isException`.
  - [x] 1.5 Add guard in `updateSession()`: return 409 if editing `startTime`/`endTime` on `status = COMPLETED`
  - [x] 1.6 Update `PATCH /:id` route RBAC from `["OWNER", "ADMIN"]` to `["OWNER", "ADMIN", "TEACHER"]` with same `checkTeacherSessionAccess` preHandler

- [x] Task 2: Backend tests (AC: 2, 3, 4)
  - [x] 2.1 Test cancel sets `isException = true` + `status = CANCELLED` + preserves original times
  - [x] 2.2 Test cancel on already-cancelled session is idempotent (no error)
  - [x] 2.3 Test cancel on COMPLETED session returns 409
  - [x] 2.4 Test cancel creates in-app notification for class participants
  - [x] 2.5 Test cancel emits `logistics/session.cancelled` Inngest event
  - [x] 2.6 Test edit time sets `isException = true` + populates `originalStartTime`/`originalEndTime`
  - [x] 2.7 Test re-edit of exception preserves original `originalStartTime`/`originalEndTime`
  - [x] 2.8 Test edit room-only does NOT set `isException`
  - [x] 2.9 Test Teacher can cancel/edit sessions for assigned class
  - [x] 2.10 Test Teacher cannot cancel/edit sessions for unassigned class (403)

- [x] Task 3: Frontend — Cancel action + visual marking + RBAC (AC: 1, 2)
  - [x] 3.1 Add `cancelSessionMutation` to `use-sessions.ts` hook calling `POST /sessions/:id/cancel`
  - [x] 3.2 Add "Cancel Session" button to `SessionDetailsPopover.tsx` — use `RBACWrapper requiredRoles={["OWNER", "ADMIN", "TEACHER"]}` AND additionally check `session.class.teacherId === user.id` for Teacher role (RBACWrapper alone cannot check class assignment)
  - [x] 3.3 Add cancel confirmation dialog: "Cancel this session? Students will be notified. The session will remain visible on the calendar."
  - [x] 3.4 Visual marking on **calendar block** in `SessionBlock.tsx`: when `session.status === 'CANCELLED'`, apply reduced opacity (`opacity-50`) + strikethrough on course name + "Cancelled" badge.
  - [x] 3.5 Hide Edit/Cancel/Delete buttons for cancelled sessions in popover; show "Cancelled" status badge instead
  - [x] 3.6 Update Edit button RBAC to include Teacher: `RBACWrapper requiredRoles={["OWNER", "ADMIN", "TEACHER"]}` with same `teacherId === user.id` guard
  - [x] 3.7 Add i18n keys for cancel action (en + vi in `logistics.json`)

- [x] Task 4: Schema sync + verification
  - [ ] 4.1 Run `pnpm --filter=webapp sync-schema-dev` after backend changes — deferred to merge (backend must be running locally)
  - [x] 4.2 Verify all backend tests pass (`pnpm --filter=backend test`) — 1169 tests passing, 0 failures
  - [x] 4.3 Verify TypeScript compiles cleanly for both backend and webapp

## Dev Notes

### What Already Exists (DO NOT recreate)

**Backend — fully wired, extend don't replace:**
- `sessions.service.ts` → `updateSession()` (lines 166-220) — already updates time/room/status. **Extend** to set `isException` + original times when time changes.
- `sessions.controller.ts` → `updateSession()` (lines 105-176) — already creates in-app notifications + emits `logistics/session.schedule-changed` Inngest event. Reuse for edit flow.
- `sessions.controller.ts` → `deleteSession()` (lines 178-230) — emits `logistics/session.cancelled` Inngest event. **Model the cancel controller after this** but use update instead of delete.
- `session-email-notification.job.ts` → `sessionCancellationEmailJob` (lines 284-420) — already handles cancellation emails, respects user preferences, bilingual. **Reuse as-is** by emitting the same `logistics/session.cancelled` event with `isBulk: false`.
- `schedule-change.template.ts` + `session-cancelled.template.ts` — bilingual email templates already exist.
- `getClassParticipants(centerId, classId)` (lines 563-582) — fetches teacher + student IDs for notifications. Already used by controller.

**Frontend — mostly complete, extend don't replace:**
- `EditSessionDialog.tsx` — fully functional: date picker, time selects, room combobox, conflict checking, force-save. **No changes needed** for edit flow (backend handles exception marking transparently).
- `SessionDetailsPopover.tsx` — has Edit + Delete buttons (Owner/Admin only). **Add** Cancel button + extend RBAC to include Teacher.
- `use-sessions.ts` — has `updateSessionMutation` + `deleteSessionMutation` with optimistic updates. **Add** `cancelSessionMutation`.
- `WeeklyCalendar.tsx` — renders sessions. **Add** visual styling for `status === 'CANCELLED'`.

**Database — fields already exist from Story 14-1:**
- `ClassSession.isException` (Boolean, default false)
- `ClassSession.originalStartTime` (DateTime, nullable)
- `ClassSession.originalEndTime` (DateTime, nullable)
- `ClassSession.status` enum already includes `CANCELLED`
- Indexes `[scheduleId, isException]` and `[scheduleId, originalStartTime]` already created

### Architecture Compliance

**Route-Controller-Service pattern:**
- **Service:** `cancelSession(centerId, id)` — DB update only, returns cancelled session
- **Controller:** `cancelSession(centerId, id)` — calls service, creates in-app notification, emits Inngest event
- **Route:** `POST /:id/cancel` — extracts params, calls controller, maps errors to HTTP status

**Multi-tenancy:** Use `getTenantedClient(centerId)` — NEVER `new PrismaClient()` directly.

**Validation:** Zod schemas in `packages/types/src/logistics.ts`.

**API response format:** Success: `{ data: T | null, message: string }` (built via `createResponseSchema()` from `packages/types/src/response.ts`). Error: `{ message: string, error?: unknown }` (via `ErrorResponseSchema`). Do NOT use `{ data, error }` pattern — that is not the codebase convention.

**Naming conventions:**
- Endpoint: `POST /api/v1/logistics/sessions/:id/cancel` (kebab-case, verb suffix for action)
- DB columns: snake_case via `@map`
- React components: PascalCase
- Zod schemas: PascalCase + `Schema` suffix

### Critical Implementation Rules

1. **Cancel != Delete.** Cancel preserves the record with `status = CANCELLED` + `isException = true`. The existing DELETE endpoint remains for actual deletion (e.g., cleanup). Do NOT modify DELETE behavior.

2. **Exception tracking on edit.** When `startTime` or `endTime` changes in `updateSession()`:
   - Set `isException = true`
   - Set `originalStartTime` = previous `startTime` (use the `previous` values already returned by the service)
   - Set `originalEndTime` = previous `endTime`
   - If `originalStartTime` is already set (re-edit of exception), do NOT overwrite — keep the first original values.

3. **Completed sessions are sacred.** Never allow cancel or time-edit on `status = COMPLETED`. Return 409 Conflict.

4. **Cancel is idempotent.** Cancelling an already-cancelled session should succeed without error (no-op).

5. **Room-only edits are NOT exceptions.** Changing just `roomName` should NOT set `isException = true` — room changes don't affect recurrence dedup logic. Detection: compare `input.startTime`/`input.endTime` against `previousStartTime`/`previousEndTime` — if both are undefined or unchanged, it's a room-only edit.

6. **Conflict detection is frontend-driven, NOT on the PATCH endpoint.** The PATCH endpoint saves unconditionally — there is no server-side conflict check. The frontend calls a separate debounced endpoint (`POST /check-conflicts`, 300ms debounce via `use-conflict-check.ts`) as the user types in `EditSessionDialog`. This already works for edits — no changes needed. Cancel does not need conflict detection.

7. **Cancel must create BOTH in-app notification AND email notification.** The existing `deleteSession()` controller does both: `createBulkNotifications()` for in-app + `inngest.send({ name: "logistics/session.cancelled" })` for email. The cancel controller must mirror this dual-notification pattern.

### RBAC Requirements

| Action | Owner | Admin | Teacher (assigned) | Student |
|--------|-------|-------|--------------------|---------|
| Edit session time/room | Yes | Yes | Yes | No |
| Cancel session | Yes | Yes | Yes | No |
| Delete session | Yes | Yes | No | No |

**Teacher authorization check — reuse existing pattern from `attendance.routes.ts` (lines 28-73):**
- Backend: Create a `checkTeacherSessionAccess` preHandler. For Owner/Admin, pass through. For Teacher, query `db.classSession.findUnique({ where: { id: sessionId }, include: { class: { select: { teacherId: true } } } })` and compare `session.class.teacherId` against `request.jwtPayload.uid`. Return 403 "Access denied - not assigned to this class" if mismatch.
- Frontend: `RBACWrapper` only checks global role — it CANNOT check class assignment. For Teacher-specific buttons (Edit/Cancel), additionally check `session.class.teacherId === user.id` where `user` comes from `useAuth()`. Render the button only if BOTH conditions pass.

### Testing Standards

- **Framework:** Vitest, co-located with source
- **Command:** `pnpm --filter=backend test`
- **Pattern:** Integration tests with real Fastify instance via `buildApp()`
- **Current baseline:** 1135 tests passing (from story 14-1) — ensure no regressions

### Previous Story Intelligence (14-1)

**Key learnings to apply:**
- Migration SQL was hand-authored because local Postgres was down — check if DB is available before attempting migration (no migration needed for 14-2 since all fields exist)
- `sync-schema-dev` requires backend running locally — defer until merge if needed
- Frontend `RecurrenceEnum` vs Prisma `frequency` case mismatch — already handled, don't re-introduce
- `handleScheduleCreated()` was removed from ClassDrawer.tsx — don't re-add frontend generation
- All generation is now server-side — cancel/edit should not trigger regeneration

**Files modified in 14-1 that are relevant:**
- `apps/backend/src/modules/logistics/sessions.service.ts` — extend `updateSession()` here
- `apps/backend/src/modules/logistics/sessions.routes.ts` — add cancel route here
- `apps/backend/src/modules/logistics/sessions.controller.ts` — add cancel controller here
- `packages/types/src/logistics.ts` — schemas already sufficient, may need cancel-specific schema
- `apps/webapp/src/features/logistics/components/SessionDetailsPopover.tsx` — add Cancel button
- `apps/webapp/src/features/logistics/hooks/use-sessions.ts` — add cancel mutation
- `apps/webapp/src/locales/en/logistics.json` + `vi/logistics.json` — add i18n keys

### Project Structure Notes

- Backend logistics module: `apps/backend/src/modules/logistics/`
- Frontend logistics feature: `apps/webapp/src/features/logistics/`
- Shared types: `packages/types/src/logistics.ts`
- DB schema: `packages/db/prisma/schema.prisma`
- No new migration needed — all required fields exist from story 14-1

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 14, Story 14.2 lines 1331-1340]
- [Source: _bmad-output/planning-artifacts/architecture.md — Session exception handling lines 1153-1160]
- [Source: _bmad-output/planning-artifacts/architecture.md — RBAC matrix line 1282]
- [Source: _bmad-output/planning-artifacts/prd.md — FR72 line 267]
- [Source: _bmad-output/implementation-artifacts/14-1-auto-generate-sessions-from-recurrence.md — previous story context]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References
- No debug issues encountered.

### Completion Notes List
- **Task 1:** Backend cancel endpoint (`POST /:id/cancel`) + exception tracking on edit. Cancel preserves session record with `CANCELLED` status + `isException=true`. Edit time sets `isException=true` + populates `originalStartTime`/`originalEndTime` (preserved on re-edit). COMPLETED sessions protected from cancel/time-edit (409). `checkTeacherSessionAccess` preHandler added for Teacher RBAC (reused pattern from attendance.routes.ts). Dual notification on cancel: in-app + Inngest email event.
- **Task 2:** 11 integration tests covering cancel (idempotency, COMPLETED guard, notifications, Inngest event), edit exception tracking (time change, re-edit preservation, room-only), Teacher RBAC, and COMPLETED time-edit guard. All 1169 tests pass.
- **Task 3:** Frontend cancel flow with optimistic update, cancel confirmation dialog, visual marking (opacity-50 + strikethrough + "Cancelled" badge on SessionBlock), action buttons hidden for cancelled sessions, Edit/Cancel RBAC extended to Teachers with class-assignment check. i18n keys added (en + vi).
- **Task 4:** TypeScript compiles cleanly for both backend and webapp. Schema sync deferred to merge (requires backend running locally).

### Change Log
- 2026-04-17: Story 14-2 implemented — cancel endpoint, exception tracking on edit, visual marking, Teacher RBAC

### File List
- `apps/backend/src/modules/logistics/sessions.service.ts` — added `cancelSession()`, modified `updateSession()` for exception tracking + COMPLETED guard
- `apps/backend/src/modules/logistics/sessions.controller.ts` — added `cancelSession()` controller with dual notifications
- `apps/backend/src/modules/logistics/sessions.routes.ts` — added `POST /:id/cancel` route, `checkTeacherSessionAccess` preHandler, updated PATCH RBAC to include Teacher
- `apps/backend/src/modules/logistics/sessions.cancel-edit.integration.test.ts` — new test file (11 tests)
- `apps/webapp/src/features/logistics/hooks/use-sessions.ts` — added `cancelSessionMutation` with optimistic update
- `apps/webapp/src/features/logistics/components/SessionDetailsPopover.tsx` — added cancel button/dialog, Teacher RBAC for edit/cancel, hide actions for cancelled sessions
- `apps/webapp/src/features/logistics/components/SessionBlock.tsx` — added cancelled visual marking (opacity, strikethrough, badge)
- `apps/webapp/src/features/logistics/components/WeeklyCalendar.tsx` — passed cancel props through
- `apps/webapp/src/features/logistics/scheduler-page.tsx` — added cancel handler + wiring
- `apps/webapp/src/locales/en/logistics.json` — added cancel i18n keys
- `apps/webapp/src/locales/vi/logistics.json` — added cancel i18n keys (Vietnamese)
