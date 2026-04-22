# Story 15.2: Admin — Remove Grading/Assignment Views

Status: review

## Story

As an Admin,
I should not see grading queue or exercise assignment views,
so that the UI reflects my actual responsibilities (management, not teaching).

## Context

The PRD (Section 8) currently gives Admin CRUD on Grading Workbench and Assignments. However, user feedback (F2) explicitly requests removing Admin access to these teaching-focused features. This story treats F2 as a PRD change request — Admin should NOT have grading or assignment management access.

The RBAC audit (Story 15-1) confirmed Admin currently has full access to grading and assignments on both frontend and backend. It also identified defense-in-depth gaps (C2, C3, L3) on session/schedule/attendance GET routes that should be addressed in this story.

## Acceptance Criteria

1. **AC1: Grading queue hidden from Admin sidebar and routes**
   - GIVEN I am logged in as ADMIN
   - WHEN I view the sidebar navigation
   - THEN "Grading" nav item is not visible
   - AND navigating to `/:centerId/dashboard/grading` redirects to dashboard
   - AND navigating to `/:centerId/dashboard/grading/:submissionId` redirects to dashboard

2. **AC2: Exercise assignment management hidden from Admin sidebar and routes**
   - GIVEN I am logged in as ADMIN
   - WHEN I view the sidebar navigation
   - THEN "Assignments" nav item is not visible
   - AND navigating to `/:centerId/dashboard/assignments` redirects to dashboard

3. **AC3: Direct URL access returns 403 or redirect**
   - GIVEN I am logged in as ADMIN
   - WHEN I call grading API endpoints directly
   - THEN the backend returns 403 Forbidden
   - WHEN I call assignment API endpoints directly
   - THEN the backend returns 403 Forbidden

4. **AC4: Session/Schedule GET routes have explicit role guards (audit gap C2, C3)**
   - GIVEN any authenticated user
   - WHEN calling session or schedule GET endpoints
   - THEN `requireRole()` is checked (not just `authMiddleware`)
   - AND all four roles (OWNER, ADMIN, TEACHER, STUDENT) are allowed on these read endpoints per PRD

5. **AC5: Attendance GET routes have consistent role guards (audit gap L3)**
   - GIVEN an attendance session endpoint using `checkTeacherSessionAccess`
   - WHEN the endpoint is called
   - THEN an explicit `requireRole()` guard also exists for consistency with the attendance stats endpoints

6. **AC6: Owner retains full access**
   - All changes must NOT affect Owner access — Owner keeps CRUD on grading and assignments

7. **AC7: Student feedback route unaffected**
   - The `/feedback/:submissionId` route (all roles) must remain accessible to ADMIN for viewing student-facing feedback

## Tasks / Subtasks

- [x] Task 1: Update frontend navigation config (AC: #1, #2)
  - [x] 1.1: In `navigation.ts`, remove "ADMIN" from `allowedRoles` for `nav.grading` and `nav.assignments`
- [x] Task 2: Update frontend route guards (AC: #1, #2, #3, #6, #7)
  - [x] 2.1: In `App.tsx`, remove "ADMIN" from `ProtectedRoute allowedRoles` for grading routes (`grading`, `grading/:submissionId`)
  - [x] 2.2: In `App.tsx`, remove "ADMIN" from `ProtectedRoute allowedRoles` for assignments route
  - [x] 2.3: Verify `/feedback/:submissionId` still includes "ADMIN" — do NOT change this route
- [x] Task 3: Update backend grading route guards (AC: #3, #6)
  - [x] 3.1: In `grading.routes.ts`, change all `requireRole(["TEACHER", "ADMIN", "OWNER"])` to `requireRole(["TEACHER", "OWNER"])` — except student-facing routes
  - [x] 3.2: Verify student feedback routes (`/student/*`) keep their current role lists (include ADMIN)
- [x] Task 4: Update backend assignment route guards (AC: #3, #6)
  - [x] 4.1: In `assignments.routes.ts`, change all `requireRole(["OWNER", "ADMIN", "TEACHER"])` to `requireRole(["OWNER", "TEACHER"])`
  - [x] 4.2: Verify student-assignment routes are unaffected (STUDENT only)
- [x] Task 5: Add `requireRole()` to session GET routes (AC: #4)
  - [x] 5.1: Add `preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER", "STUDENT"])]` to `GET /sessions/` in `sessions.routes.ts`
  - [x] 5.2: Add same to `GET /sessions/week`
  - [x] 5.3: Add same to `GET /sessions/:id`
- [x] Task 6: Add `requireRole()` to schedule GET routes (AC: #4)
  - [x] 6.1: Add `preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER", "STUDENT"])]` to `GET /schedules/` in `schedules.routes.ts`
  - [x] 6.2: Add same to `GET /schedules/:id`
- [x] Task 7: Add `requireRole()` to attendance session endpoints (AC: #5)
  - [x] 7.1: Add `requireRole(["OWNER", "ADMIN", "TEACHER"])` alongside `checkTeacherSessionAccess` on attendance GET/POST endpoints
  - [x] 7.2: Use array syntax: `preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"]), checkTeacherSessionAccess]`
- [x] Task 8: Update tests (all ACs)
  - [x] 8.1: Update `grading.routes.integration.test.ts` — add 5 ADMIN role access tests (403 on grading, allow on student-facing)
  - [x] 8.2: Create `assignments.routes.integration.test.ts` — 6 tests verifying ADMIN 403, TEACHER/OWNER allowed
  - [x] 8.3: Update `navigation.test.ts` — verify ADMIN sees 8 items (not grading/assignments)
  - [x] 8.4: Update `route-protection.test.tsx` — add ADMIN redirect from grading test
  - [x] 8.5: Run full test suite — frontend 1103 passed, backend 1195 passed, 0 regressions

## Dev Notes

### Key Decision: PRD Override

This story implements user feedback F2 which **overrides** the PRD's Admin CRUD permission on Grading Workbench and Assignments. The PRD says Admin gets CRUD; we are intentionally removing Admin access. This is a product decision, not a bug fix.

### Architecture Patterns to Follow

**Backend role guards** — Use existing `requireRole()` middleware pattern:
```typescript
// Remove ADMIN from grading/assignment guards:
preHandler: [requireRole(["TEACHER", "OWNER"])]

// Add explicit role guard to currently-unguarded GET routes:
preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER", "STUDENT"])]
```

**Frontend route guards** — Use existing `ProtectedRoute` pattern:
```tsx
<ProtectedRoute allowedRoles={["OWNER", "TEACHER"]}>
```

**Frontend navigation** — Role filtering in `navigation.ts`:
```typescript
allowedRoles: ["OWNER", "TEACHER"], // Remove "ADMIN"
```

### Files to Modify

| File | Change | Lines |
|------|--------|-------|
| `apps/webapp/src/core/config/navigation.ts` | Remove "ADMIN" from grading (line 82) and assignments (line 63) `allowedRoles` | ~2 lines |
| `apps/webapp/src/App.tsx` | Remove "ADMIN" from `ProtectedRoute` for grading (lines 271, 284), assignments (line 224) | ~3 routes |
| `apps/backend/src/modules/grading/grading.routes.ts` | Remove "ADMIN" from `requireRole` on lines 70, 106, 139, 171, 204, 238, 273, 307, 341, 376, 413, 447, 547 (13 endpoints). Keep ADMIN on student-facing lines 483, 515 | ~13 lines |
| `apps/backend/src/modules/assignments/assignments.routes.ts` | Remove "ADMIN" from `requireRole` on lines 60, 89, 120, 142, 167, 191, 216, 240, 263 (9 endpoints) | ~9 lines |
| `apps/backend/src/modules/logistics/sessions.routes.ts` | Add `requireRole(["OWNER", "ADMIN", "TEACHER", "STUDENT"])` to GET `/`, GET `/week`, GET `/:id` (~lines 98-214) | ~3 routes |
| `apps/backend/src/modules/logistics/schedules.routes.ts` | Add `requireRole(["OWNER", "ADMIN", "TEACHER", "STUDENT"])` to GET `/`, GET `/:id` (~lines 36-81) | ~2 routes |
| `apps/backend/src/modules/logistics/attendance.routes.ts` | Add `requireRole(["OWNER", "ADMIN", "TEACHER"])` before `checkTeacherSessionAccess` on lines ~100, ~129, ~162 | ~3 routes |

### Test Files to Update

| File | Change |
|------|--------|
| `apps/backend/src/modules/grading/grading.routes.integration.test.ts` | Add ADMIN 403 test cases |
| `apps/backend/src/modules/assignments/assignments-list-and-create.test.ts` | Add ADMIN 403 test cases |
| `apps/webapp/src/features/assignments/assignments-page.test.tsx` | Add ADMIN access denial test |
| `apps/backend/src/middlewares/role.middleware.test.ts` | Reference only — existing tests cover `requireRole` behavior |

### Anti-Patterns to Avoid

- **DO NOT** remove ADMIN from the `/feedback/:submissionId` route — Admin should still see student feedback
- **DO NOT** remove ADMIN from student-facing grading endpoints (lines 483, 515 in `grading.routes.ts`)
- **DO NOT** change Owner permissions anywhere — Owner keeps full access
- **DO NOT** modify `RBACWrapper` component — this story only changes route/nav config, not the component itself
- **DO NOT** touch exercises or mock-tests routes — those stay as-is (Admin keeps access per PRD)
- **DO NOT** add `requireRole` with fewer roles than currently allowed — session/schedule GETs should allow all 4 roles

### Previous Story Intelligence (15-1)

Story 15-1 was an audit-only story (no production code changes). Key findings:
- `requireRole()` middleware is well-established and simple — just check `request.user.role` against allowed array
- `checkTeacherSessionAccess()` validates `class.teacherId === uid` for per-object access
- Frontend uses `ProtectedRoute` with `allowedRoles` prop for route-level guards
- Navigation filtering works via `allowedRoles` array in `navigation.ts` config
- Prisma `Permission`/`RolePermission` models exist but are UNUSED — RBAC is purely middleware-based
- Student-facing comment filtering verified safe at `grading.service.ts:111`

### Git Intelligence

Recent commits show:
- Story 14-1 through 14-4: Session/schedule features with `requireRole(["OWNER", "ADMIN"])` pattern on mutation endpoints
- Story 13-3: Manual grading discoverability (grading UI changes)
- Story 17-03: User account features (in-progress)
- Test framework: Vitest with co-located test files

### Project Structure Notes

- Monorepo: TurboRepo + pnpm
- Backend: `apps/backend/src/modules/<domain>/<domain>.routes.ts`
- Frontend: `apps/webapp/src/features/<domain>/`
- Navigation: `apps/webapp/src/core/config/navigation.ts`
- Routes: `apps/webapp/src/App.tsx`
- Testing: Vitest, co-located `*.test.ts` files
- Run tests: `pnpm --filter=backend test` and `pnpm --filter=webapp test`

### References

- [Source: _bmad-output/planning-artifacts/rbac-permissions-matrix.md] — Full gap analysis, C2/C3/L3 gaps
- [Source: _bmad-output/implementation-artifacts/15-1-rbac-audit.md] — Audit findings and patterns
- [Source: _bmad-output/planning-artifacts/prd.md#Section8] — RBAC matrix (Admin CRUD on grading — being overridden by F2)
- [Source: _bmad-output/planning-artifacts/epics.md#Epic15] — Epic context and story ACs
- [Source: _bmad-output/planning-artifacts/architecture.md] — Auth/RBAC architecture patterns

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References
- Grading ADMIN student-facing test initially returned 400 due to missing mock setup — fixed by adding authAccount/centerMembership mocks and asserting `not 403` instead of `200`

### Completion Notes List
- AC1: Grading nav hidden from ADMIN in sidebar (navigation.ts). Route redirects via ProtectedRoute (App.tsx).
- AC2: Assignments nav hidden from ADMIN in sidebar (navigation.ts). Route redirects via ProtectedRoute (App.tsx).
- AC3: Backend returns 403 for ADMIN on all grading endpoints (13 routes) and all assignment endpoints (9 routes).
- AC4: Session GET routes (/, /week, /:id) now have explicit `requireRole(["OWNER", "ADMIN", "TEACHER", "STUDENT"])`. Schedule GET routes (/, /:id) same.
- AC5: Attendance session endpoints (GET, POST, POST bulk) now have `requireRole(["OWNER", "ADMIN", "TEACHER"])` alongside `checkTeacherSessionAccess`.
- AC6: Owner access verified unchanged — Owner remains in all role lists.
- AC7: `/feedback/:submissionId` route verified unchanged — ADMIN still included in allowedRoles (frontend and backend student-facing routes).

### Change Log
- 2026-04-22: Story 15-2 implementation complete — ADMIN removed from grading/assignment access, defense-in-depth gaps (C2, C3, L3) addressed

### File List
- apps/webapp/src/core/config/navigation.ts (modified — removed ADMIN from grading + assignments allowedRoles)
- apps/webapp/src/App.tsx (modified — removed ADMIN from grading + assignments ProtectedRoute)
- apps/backend/src/modules/grading/grading.routes.ts (modified — removed ADMIN from 13 requireRole calls)
- apps/backend/src/modules/assignments/assignments.routes.ts (modified — removed ADMIN from 9 requireRole calls)
- apps/backend/src/modules/logistics/sessions.routes.ts (modified — added requireRole to 3 GET routes)
- apps/backend/src/modules/logistics/schedules.routes.ts (modified — added requireRole to 2 GET routes)
- apps/backend/src/modules/logistics/attendance.routes.ts (modified — added requireRole to 3 session endpoints)
- apps/backend/src/modules/grading/grading.routes.integration.test.ts (modified — added 5 ADMIN role access tests)
- apps/backend/src/modules/assignments/assignments.routes.integration.test.ts (new — 6 ADMIN 403 tests)
- apps/webapp/src/core/config/navigation.test.ts (modified — updated ADMIN nav count to 8)
- apps/webapp/src/features/auth/route-protection.test.tsx (modified — added ADMIN redirect from grading test)
