# Story 14.3: Reschedule Single Occurrence

Status: review

## Story

As a Teacher,
I want to reschedule a single session by dragging or editing,
so that I can move one class without affecting the rest of the series.

## Acceptance Criteria

1. **AC1:** Teacher can drag a session to a new time/date on the weekly scheduler.
2. **AC2:** Only the moved session is affected; all other series sessions remain unchanged.
3. **AC3:** Conflict detection runs on the new time slot.
4. **AC4:** Students are notified of the reschedule.

**Feature Requirement:** E3 — Session & Schedule Redesign (user feedback backlog)

## Tasks / Subtasks

- [x] Task 1: Frontend — Guard drag for non-reschedulable sessions (AC: 1)
  - [x] 1.1 In `WeeklyCalendar.tsx`, change `renderSessionBlock(session, true)` (line 917) to pass `canDrag` based on session status: `canDrag={session.status !== "CANCELLED" && session.status !== "COMPLETED"}`. Currently all desktop sessions pass `canDrag=true`.
  - [x] 1.2 In `SessionBlock.tsx`, add a `cursor-not-allowed` style when `session.status === "CANCELLED" || session.status === "COMPLETED"` to give visual feedback that the session can't be dragged.
  - [x] 1.3 Add i18n keys for reschedule-related messages (en + vi in `logistics.json`):
    - `scheduler.confirmRescheduleTitle`: "Reschedule Session?"
    - `scheduler.confirmRescheduleBody`: "Move {{courseName}} — {{className}} to {{newDate}} at {{newTime}}?"
    - `scheduler.confirmRescheduleConflictWarning`: "This time slot has conflicts. Are you sure you want to reschedule?"
    - `scheduler.rescheduledBadge`: "Rescheduled"
    - `sessionDetails.originalTime`: "Originally: {{date}} at {{time}}"

- [x] Task 2: Frontend — Reschedule confirmation dialog after drag-drop (AC: 1, 3)
  - [x] 2.1 In `WeeklyCalendar.tsx`, modify `handleDrop()` (line 492) to also pass the full session object: `onSessionMove(draggedSession.id, newStartTime, newEndTime, draggedSession)`. Update the `onSessionMove` prop type (line 30) to: `(sessionId: string, newStartTime: Date, newEndTime: Date, session: ClassSessionWithConflicts) => void`.
  - [x] 2.2 In `scheduler-page.tsx`, add `import { useConflictCheck } from "./hooks/use-conflict-check"` and `import { ConflictWarningBanner } from "./components/ConflictWarningBanner"`. Add AlertDialog imports from `@workspace/ui/components/alert-dialog`.
  - [x] 2.3 In `scheduler-page.tsx`, add state: `pendingReschedule: { sessionId: string, session: ClassSessionWithConflicts, newStartTime: Date, newEndTime: Date } | null`. Call `useConflictCheck(user?.centerId)` to get `checkConflictsImmediate`, `hasConflicts`, `roomConflicts`, `teacherConflicts`, `suggestions`, `clearConflicts`.
  - [x] 2.4 Modify `handleSessionMove()` (lines 56-73) to NOT save immediately. Instead: (1) set `pendingReschedule` state, (2) call `checkConflictsImmediate({ classId: session.classId, startTime: newStartTime.toISOString(), endTime: newEndTime.toISOString(), roomName: session.roomName, excludeSessionId: session.id })`.
  - [x] 2.5 Add inline `RescheduleConfirmDialog` using Shadcn `AlertDialog` (follow exact pattern from `SessionDetailsPopover.tsx` cancel dialog, lines 314-334):
    - Show course name, class name, old time → new time (format with `date-fns`)
    - If `hasConflicts`: render `<ConflictWarningBanner roomConflicts={roomConflicts} teacherConflicts={teacherConflicts} suggestions={suggestions} onForceSave={handleConfirmReschedule} isForcing={isUpdating} />` — the banner has built-in RBAC (force-save button only shows for OWNER/ADMIN)
    - If no conflicts: show Confirm button that calls `updateSession()` then clears state + shows success toast
    - Cancel button: clears `pendingReschedule` + calls `clearConflicts()`

- [x] Task 3: Frontend — "Rescheduled" visual indicator on exception sessions (AC: 2)
  - [x] 3.1 In `SessionBlock.tsx`, when `session.isException === true && session.status !== "CANCELLED"`, show a small "Rescheduled" badge similar to the existing "Cancelled" badge pattern (line 90-94). Use `<Badge variant="secondary" className="bg-blue-100 text-blue-800 text-[9px] px-1 py-0">` to match the Cancelled badge styling (`bg-red-100 text-red-800 text-[9px] px-1 py-0`).
  - [x] 3.2 In `SessionDetailsPopover.tsx`, show the original time when `session.originalStartTime` exists: "Originally: {{originalDate}} at {{originalTime}}" below the current time display (lines 164-171, after the `<Clock>` icon row). Use same `text-muted-foreground` styling with `text-xs`. Add i18n key `sessionDetails.originalTime`.

- [x] Task 4: Tests + verification (AC: 1, 2, 3, 4)
  - [x] 4.1 Verify existing backend tests still pass — no backend changes needed (exception tracking + notifications already work from 14-2)
  - [x] 4.2 Run `pnpm --filter=backend test` to confirm no regressions
  - [x] 4.3 Verify TypeScript compiles cleanly for both backend and webapp
  - [x] 4.4 Run `pnpm --filter=webapp sync-schema-dev` if schema changes needed (unlikely — defer to merge if backend not running)

## Dev Notes

### What Already Exists (DO NOT recreate)

**Drag-and-drop infrastructure — FULLY IMPLEMENTED, extend don't replace:**
- `WeeklyCalendar.tsx` → complete HTML5 drag-and-drop with:
  - `handleDragStart()` (lines 372-421): captures session, computes conflict slots, creates preview
  - `handleDragOver()` (lines 424-470): cross-day support via `data-day` attribute, 15-min snap-to-grid
  - `handleDrop()` (lines 472-494): computes new start/end from `dragPreview.dayKey` + time, calls `onSessionMove`
  - `handleDragEnd()` (lines 496-503): cleanup
  - Visual conflict preview: green (free) / red (conflict) ghost during drag
  - `computeConflictSlots()` (lines 218-283): client-side interval overlap computation

**Backend — NO CHANGES NEEDED, everything works from 14-1 + 14-2:**
- `sessions.service.ts` → `updateSession()` (lines 166-252): already sets `isException = true` + `originalStartTime`/`originalEndTime` when time changes. Blocks COMPLETED sessions (409).
- `sessions.controller.ts` → `updateSession()` (lines 105-176): already creates in-app notifications ("Session Rescheduled") + emits `logistics/session.schedule-changed` Inngest event when time changes. Notification goes to all class participants (teacher + students).
- `sessions.routes.ts` → `PATCH /:id` (lines 252-295): RBAC `["OWNER", "ADMIN", "TEACHER"]` with `checkTeacherSessionAccess` preHandler. Saves unconditionally (no server-side conflict block).
- `session-email-notification.job.ts` → `sessionScheduleChangedEmailJob`: bilingual email for reschedule. Already wired via Inngest.

**Frontend hooks — extend, don't replace:**
- `use-sessions.ts` → `updateSessionMutation` (lines 38-128): optimistic update with rollback on error. Converts Date to ISO strings for API.
- `use-conflict-check.ts` → `checkConflictsImmediate()` (lines 57-60): synchronous conflict check (no debounce). Returns `{ hasConflicts, roomConflicts, teacherConflicts, suggestions }`.
- `ConflictWarningBanner` — standalone reusable component at `./components/ConflictWarningBanner.tsx`. Import directly: `import { ConflictWarningBanner } from "./components/ConflictWarningBanner"`. Props: `roomConflicts`, `teacherConflicts`, `suggestions`, `onApplySuggestion` (optional), `onForceSave`, `isForcing`. Has built-in RBAC — force-save button only renders for OWNER/ADMIN roles.

**Scheduler page wiring — modify `handleSessionMove`:**
- `scheduler-page.tsx` → `handleSessionMove()` (lines 56-73): currently saves immediately on drop. Change to set pending state + check conflicts first.
- Already passes `onSessionMove={handleSessionMove}` to WeeklyCalendar (line ~170).
- Current callback signature: `(sessionId: string, newStartTime: Date, newEndTime: Date)` — needs 4th param `session: ClassSessionWithConflicts` for conflict check input (`classId`, `roomName`).

**WeeklyCalendar callback — update to pass session object:**
- `onSessionMove` prop type (line 30): currently `(sessionId: string, newStartTime: Date, newEndTime: Date) => void`. Add 4th param.
- `handleDrop()` (line 492): currently `onSessionMove(draggedSession.id, newStartTime, newEndTime)`. Add `draggedSession` as 4th arg. `draggedSession` is already the full `ClassSessionWithConflicts` object (set in `handleDragStart`, line 404).

**i18n — extend existing:**
- `apps/webapp/src/locales/en/logistics.json` + `vi/logistics.json` — add reschedule-specific keys.
- Existing keys: `scheduler.toastRescheduleSuccess`, `scheduler.toastRescheduleError` (generic, keep these).

### Architecture Compliance

**No backend changes required.** All work is frontend-only:
- The PATCH endpoint, exception tracking, notifications, and email are all in place from stories 14-1 and 14-2.
- Conflict detection endpoint `POST /check-conflicts` is already available.

**Frontend patterns to follow:**
- Use Shadcn `AlertDialog` for confirmation (matches cancel confirmation pattern from 14-2)
- Use `RBACWrapper` + `useAuth()` for role-based visibility
- Import `ConflictWarningBanner` from `./components/ConflictWarningBanner` — it has built-in RBAC for force-save
- Follow existing badge pattern from `SessionBlock.tsx` (Cancelled badge uses `Badge variant="secondary"` with `bg-red-100 text-red-800 text-[9px] px-1 py-0`; Rescheduled should use same variant with `bg-blue-100 text-blue-800`)

**API response format:** `{ data: T | null, message: string }` — standard response via `createResponseSchema()`.

**Naming conventions:**
- React components: PascalCase
- i18n keys: camelCase dot-notation (`scheduler.confirmRescheduleTitle`)
- CSS: Tailwind utility classes

### Critical Implementation Rules

1. **DO NOT modify backend code.** Exception tracking, notifications, and conflict detection all work correctly from 14-2. This story is frontend-only polish.

2. **Drag guards prevent UI-level confusion.** The backend already returns 409 for COMPLETED sessions, but allowing the drag attempt and then failing is poor UX. Guard at the drag source level.

3. **Confirmation dialog is the key new behavior.** Currently drag-drop saves immediately — this story adds a confirmation step with conflict awareness.

4. **Conflict checking on drop uses `checkConflictsImmediate()` (not debounced).** The drop is a discrete event, not a continuous input — use the immediate variant.

5. **Force-save on conflicts follows existing pattern.** OWNER/ADMIN can force-save when conflicts exist (matches `EditSessionDialog` behavior). TEACHER cannot force-save — must resolve conflicts first.

6. **"Rescheduled" badge only shows on exception sessions that aren't cancelled.** Condition: `isException === true && status !== "CANCELLED"`. This includes sessions rescheduled via drag AND via the edit dialog.

7. **Original time display in popover.** When `originalStartTime` exists, show "Originally: Mon, Apr 14 at 2:00 PM" below the current time. Use `format()` from `date-fns` consistently with existing patterns.

### RBAC Requirements

| Action | Owner | Admin | Teacher (assigned) | Student |
|--------|-------|-------|--------------------|---------|
| Drag to reschedule | Yes | Yes | Yes | No |
| Force-save on conflict | Yes | Yes | No | No |
| View rescheduled badge | Yes | Yes | Yes | Yes |

### Testing Standards

- **Framework:** Vitest, co-located with source
- **Command:** `pnpm --filter=backend test`
- **Current baseline:** 1169 tests passing (from story 14-2) — ensure no regressions
- **No new backend tests needed** — all backend logic is already tested
- **Frontend verification:** TypeScript compiles cleanly for both apps

### Previous Story Intelligence (14-2)

**Key learnings to apply:**
- `checkTeacherSessionAccess` preHandler already guards Teacher access to PATCH — no backend RBAC changes needed
- Cancel confirmation dialog pattern in `SessionDetailsPopover.tsx` (Shadcn AlertDialog) — reuse same pattern for reschedule confirmation
- `cancelSessionMutation` optimistic update pattern — `updateSessionMutation` already has this
- `sync-schema-dev` requires backend running locally — defer to merge if needed
- i18n keys must be added to both `en/logistics.json` AND `vi/logistics.json`

**Files modified in 14-2 that are relevant (read for patterns):**
- `SessionDetailsPopover.tsx` — cancel confirmation dialog pattern to reuse
- `SessionBlock.tsx` — "Cancelled" badge pattern to mirror for "Rescheduled" badge
- `use-sessions.ts` — optimistic update pattern (already works for update)
- `scheduler-page.tsx` — cancel handler wiring pattern

### Git Intelligence

Recent commits show the project follows conventional commits with scope:
- `feat(logistics): edit/cancel individual sessions with code review fixes (story 14-2)`
- `feat(logistics): auto-generate sessions from recurrence with code review fixes (story 14-1)`

Expected commit: `feat(logistics): reschedule single occurrence with drag confirmation (story 14-3)`

### Project Structure Notes

All changes are in the frontend logistics feature:
- `apps/webapp/src/features/logistics/components/WeeklyCalendar.tsx` — drag guard + update `onSessionMove` callback to pass full session object
- `apps/webapp/src/features/logistics/components/SessionBlock.tsx` — rescheduled badge + cursor-not-allowed for non-draggable
- `apps/webapp/src/features/logistics/components/SessionDetailsPopover.tsx` — original time display
- `apps/webapp/src/features/logistics/components/ConflictWarningBanner.tsx` — existing component, import only (no changes)
- `apps/webapp/src/features/logistics/scheduler-page.tsx` — confirmation dialog + pending reschedule state + conflict check + modified handler
- `apps/webapp/src/locales/en/logistics.json` — i18n keys
- `apps/webapp/src/locales/vi/logistics.json` — i18n keys (Vietnamese)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 14, Story 14.3 lines 1342-1351]
- [Source: _bmad-output/planning-artifacts/architecture.md — Session exception handling lines 1143-1168]
- [Source: _bmad-output/implementation-artifacts/14-2-edit-cancel-individual-sessions.md — previous story context]
- [Source: project-context.md — technology stack and critical rules]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

None — clean implementation, no debugging needed.

### Completion Notes List

- Task 1: Added drag guard — CANCELLED/COMPLETED sessions no longer draggable. Added `cursor-not-allowed` visual feedback. Added 5 i18n keys (en + vi) for reschedule UI.
- Task 2: Replaced immediate-save-on-drop with confirmation dialog flow. `handleSessionMove` now sets `pendingReschedule` state and runs conflict check. AlertDialog shows course/class/new-time details. ConflictWarningBanner renders when conflicts detected (with built-in RBAC for force-save). Updated `onSessionMove` prop to pass full session object.
- Task 3: Added "Rescheduled" badge (blue) on exception sessions that aren't cancelled, mirroring the "Cancelled" badge pattern. Added original time display in SessionDetailsPopover when `originalStartTime` exists.
- Task 4: Backend tests — 1173 passing, 0 regressions. TypeScript compiles clean for both backend and webapp. No schema changes needed.

### Change Log

- 2026-04-17: Story 14-3 implementation complete — all 4 tasks done, all ACs satisfied.

### File List

- `apps/webapp/src/features/logistics/components/WeeklyCalendar.tsx` — drag guard on session status, updated `onSessionMove` prop to include session object
- `apps/webapp/src/features/logistics/components/SessionBlock.tsx` — `cursor-not-allowed` for non-draggable sessions, "Rescheduled" badge for exception sessions
- `apps/webapp/src/features/logistics/components/SessionDetailsPopover.tsx` — original time display when `originalStartTime` exists
- `apps/webapp/src/features/logistics/scheduler-page.tsx` — reschedule confirmation dialog with conflict check, pending state management
- `apps/webapp/src/locales/en/logistics.json` — 5 new i18n keys for reschedule UI
- `apps/webapp/src/locales/vi/logistics.json` — 5 new i18n keys for reschedule UI (Vietnamese)
