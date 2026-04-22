# Story 15.1: RBAC Audit

Status: review

## Story

As a Product Owner,
I want a complete audit mapping what each role (Owner/Admin/Teacher/Student) should and shouldn't access,
so that we have a definitive permissions matrix to implement against.

## Acceptance Criteria

1. **AC1:** Permissions matrix document is created covering all routes and UI sections.
2. **AC2:** Each role has explicit "allow" and "deny" entries for every feature area.
3. **AC3:** The matrix is reviewed and approved before implementation begins.

## Tasks / Subtasks

- [x] Task 1: Audit all backend routes — role guards AND per-object authorization (AC: #1, #2)
  - [x] 1.1: Scan every `requireRole()` call across all 19 backend modules: assignments, auth, billing, engagement, exercises, golden-samples, grading, health, inngest, logistics (classes, courses, sessions, attendance, rooms, schedules), moderation, mock-tests, notifications, student-health, submissions, tenants, users
  - [x] 1.2: Document the current allowed roles for each route endpoint
  - [x] 1.3: Scan for custom per-object authorization middleware beyond `requireRole()` — specifically: `checkTeacherSessionAccess()` in sessions.routes.ts, any teacher-class assignment checks, student enrollment validation, and document ownership checks
  - [x] 1.4: Compare current implementation against the FULL 28-row PRD RBAC matrix (Section 8)
  - [x] 1.5: Identify discrepancies between implemented guards and PRD-specified permissions
  - [x] 1.6: Verify all data-mutation routes (POST/PATCH/DELETE) and data-read routes (GET) require auth + role guard. Document known intentionally-unprotected routes: `/health` (health check), `/unsubscribe/:token` (email unsubscribe), `/inngest/*` (Inngest webhook, signed), `/billing/webhook` (Polar.sh webhook, signed), auth routes (`/signup/*`, `/login`, `/login-attempt`)
  - [x] 1.7: Audit conditional permission enforcement for all 9 PRD rows with restrictions: Teacher "assigned only" (Sessions: Cancel, Reschedule, Customize Materials, Teacher Notes), Teacher "own only" (Knowledge Hub: Delete), Teacher "Own Students" (Student Health), Student "enrolled only" (Knowledge Hub: View/Download, Course: View, Session: View Materials), Student "student-facing only" (Teacher Comments)
- [x] Task 2: Audit all frontend route protections and UI visibility (AC: #1, #2)
  - [x] 2.1: Scan `apps/webapp/src/App.tsx` for all `ProtectedRoute` `allowedRoles` props
  - [x] 2.2: Scan all conditional role-based rendering across components — search for `user?.role`, `role ===`, and any role-check patterns (note: `RBACWrapper` HOC may not exist; look for inline role checks and conditional rendering instead)
  - [x] 2.3: Audit navigation role filtering in `apps/webapp/src/core/config/navigation.ts` (10 nav items with `allowedRoles` property) and `apps/webapp/src/features/settings/config/settings-nav.ts` (role-filtered settings tabs)
  - [x] 2.4: Audit all 15 frontend features: assignments, auth, dashboard, exercises, grading, logistics, mock-tests, settings, student-health, students, submissions, tenants, users — identify UI elements visible to roles that should NOT see them per PRD matrix
  - [x] 2.5: Identify missing frontend guards where backend has protection but frontend shows the UI
- [x] Task 3: Create the definitive permissions matrix document (AC: #1, #2)
  - [x] 3.1: Create `_bmad-output/planning-artifacts/rbac-permissions-matrix.md`
  - [x] 3.2: Organize by feature area with columns: Feature | Route/Component | Owner | Admin | Teacher | Student | PRD Match? | Notes
  - [x] 3.3: Include explicit ALLOW/DENY for every feature area and every role — must cover all 28 PRD matrix rows
  - [x] 3.4: Add separate section for conditional permissions audit (per-object/enrollment/ownership checks)
  - [x] 3.5: Include a summary section of all gaps/violations found
- [x] Task 4: Generate gap analysis with actionable fix list (AC: #1, #2)
  - [x] 4.1: List every backend route where role guard differs from PRD matrix
  - [x] 4.2: List every frontend route/component where visibility differs from PRD matrix
  - [x] 4.3: Flag any routes with NO role guard that should have one
  - [x] 4.4: Flag Admin-visible grading/assignment views (feeds Story 15-2)
  - [x] 4.5: Flag Owner missing access to any feature (feeds Story 15-3)
  - [x] 4.6: Flag Session: Teacher Notes RBAC — PRD says Owner/Admin CANNOT access (only Teacher assigned). Verify if this conflicts with Owner "god mode" intent in Story 15-3
  - [x] 4.7: Prioritize gaps by severity (security risk vs UX inconvenience)
- [x] Task 5: Present matrix for review (AC: #3)
  - [x] 5.1: Output the complete matrix in the story completion notes
  - [x] 5.2: Highlight critical security gaps that need immediate attention
  - [x] 5.3: List recommended fixes for Stories 15-2, 15-3, and 15-4

## Dev Notes

### Nature of This Story

This is an **audit/analysis story**, not a feature implementation. The primary output is a **permissions matrix document** (`rbac-permissions-matrix.md`) and a **gap analysis**. No production code changes are expected — the audit informs Stories 15-2 through 15-4 which will implement fixes.

### Current RBAC Architecture

**Authentication Flow:**
- Firebase Auth with custom claims (`center_id`, `role`) injected via backend trigger on login
- Backend: `auth.middleware.ts` verifies Firebase ID token, decorates `request.jwtPayload`
- Frontend: `useAuth()` hook decodes ID token for client-side routing

**Authorization Flow:**
- Backend: `requireRole(allowedRoles)` Fastify `preHandler` checks `request.user.role`
- Frontend: `ProtectedRoute` component with `allowedRoles` prop redirects unauthorized users
- Frontend: `RBACWrapper` component conditionally renders UI elements by role

**Role Enum:** `OWNER | ADMIN | TEACHER | STUDENT` (defined in Prisma schema + `packages/types/src/auth/dto.ts`)

**Key Limitation:** The Prisma schema defines `Permission`, `RolePermission`, and `MembershipPermission` models for fine-grained permissions, but these are **NOT used anywhere in the codebase**. Current RBAC is purely role-based at the middleware level, with some ad-hoc per-object checks in specific routes (e.g., `checkTeacherSessionAccess()` for session operations).

### Key Files to Audit

**Backend (route guards):**
- `apps/backend/src/middlewares/auth.middleware.ts` — token verification
- `apps/backend/src/middlewares/role.middleware.ts` — `requireRole()` factory
- `apps/backend/src/modules/*/` — 30+ route files with `requireRole()` calls (~199 instances)

**Frontend (route + UI guards):**
- `apps/webapp/src/App.tsx` — route-level `ProtectedRoute` with `allowedRoles`
- `apps/webapp/src/features/auth/protected-route.tsx` — route guard component
- `apps/webapp/src/features/auth/role-redirect.tsx` — role-based dashboard routing
- `apps/webapp/src/core/config/navigation.ts` — sidebar nav items with `allowedRoles` property (10 items)
- `apps/webapp/src/features/settings/config/settings-nav.ts` — settings tab role filtering
- `apps/webapp/src/core/components/common/app-sidebar.tsx` — sidebar component filtering by user role
- All feature components with inline role-conditional rendering (search for `user?.role`, `role ===` patterns)

**Types:**
- `packages/types/src/auth/dto.ts` — `UserRoleSchema`, `AuthUserSchema`
- `packages/types/src/user.ts` — role filtering for user list queries
- `packages/db/prisma/schema.prisma` — `CenterRole` enum, `CenterMembership`, `Permission` models

### PRD RBAC Matrix (Complete Baseline — All 28 Rows)

The authoritative permissions matrix is in `_bmad-output/planning-artifacts/prd.md` Section 8. The audit MUST cover every row:

| Feature | Owner | Admin | Teacher | Student |
|---------|-------|-------|---------|---------|
| Center Settings | CRUD | CRUD | R | - |
| User Management | CRUD | CRUD | - | - |
| Class Scheduling | CRUD | CRUD | R | R |
| Attendance | CRUD | CRUD | CRUD | R |
| Exercise Creation | CRUD | CRUD | CRUD | - |
| Audio Upload (Listening) | CRUD | CRUD | CRUD | - |
| Mock Test Assembly | CRUD | CRUD | CRUD | - |
| Assignment | CRUD | CRUD | CRUD | - |
| Submission | - | - | - | CRUD |
| AI Grading Workbench | CRUD | CRUD | CRUD | - |
| Teacher Comments | CRUD | CRUD | CRUD | R (student-facing only) |
| Band Rubric Config | CRUD | CRUD | R | - |
| Student Health Dashboard | R | R | R (Own Students) | - |
| Billing & Subscription | CRUD | R | - | - |
| Knowledge Hub: Upload/Create | CRUD | CRUD | CRUD | - |
| Knowledge Hub: View/Download | CRUD | CRUD | CRUD | R (enrolled) |
| Knowledge Hub: Delete | CRUD | CRUD | D (own only) | - |
| Golden Samples: Manage | CRUD | - | - | - |
| Course: Create/Edit | CRUD | CRUD | - | - |
| Course: View | R | R | R | R (enrolled) |
| Lesson Plans: Create/Edit | CRUD | CRUD | - | - |
| Recurrence Rule: Create/Edit | CRUD | CRUD | - | - |
| Session: Cancel Occurrence | CRUD | CRUD | CU (assigned) | - |
| Session: Reschedule | CRUD | CRUD | CU (assigned) | - |
| Session: Customize Materials | CRUD | CRUD | CRU (assigned) | - |
| Session: Teacher Notes | - | - | CRUD (assigned) | - |
| Session: View Materials | R | R | R | R (enrolled) |

**Architecture addendum** has additional RBAC tables for Knowledge Hub, Course Materials, and Session modules — cross-reference during audit.

### Conditional Permissions Requiring Per-Object Audit

These 9 rows have restrictions beyond simple role checks. The audit must verify that custom middleware or service-level checks enforce these constraints:

| Feature | Condition | What to Audit |
|---------|-----------|---------------|
| Teacher Comments | Student: student-facing only | Comment visibility flag filtering on student queries |
| Student Health Dashboard | Teacher: Own Students | Teacher-to-student relationship validation |
| Knowledge Hub: View/Download | Student: enrolled | Course/session enrollment check before data access |
| Knowledge Hub: Delete | Teacher: own only | Document author/ownership verification |
| Session: Cancel Occurrence | Teacher: assigned | Teacher class assignment check (see `checkTeacherSessionAccess()` in `sessions.routes.ts`) |
| Session: Reschedule | Teacher: assigned | Same as above |
| Session: Customize Materials | Teacher: assigned | Same as above |
| Session: Teacher Notes | Teacher: assigned, Owner/Admin: DENIED | This is unusual — Owner has no access. Verify implementation and flag if Story 15-3 "god mode" conflicts |
| Session: View Materials | Student: enrolled | Student enrollment validation before returning session data |

### Audit Scope

**Phase 1 only:** OWNER, ADMIN, TEACHER, STUDENT. Parent role is Phase 2 and excluded from this audit.

### Known RBAC Concerns (from User Feedback)

These drove Epic 15 creation and should be validated:
- **F1:** No comprehensive audit exists mapping actual vs intended permissions
- **F2:** Admins can see grading queue and exercise assignment views (should be teachers only per PRD — note: PRD actually says Admin gets CRUD on Grading Workbench, so verify if F2 is a PRD error or intentional)
- **F3:** Owner should have "god mode" access to everything but may be missing some features
- **F4:** Users report confusion about what their role allows — no visual role indicators

### Audit Methodology

**Layer 1 — Role-level guards:**
1. `grep`/`rg` for every `requireRole()` call and extract the allowed roles array
2. Build a complete map of backend endpoints → allowed roles
3. Build a map of frontend protected routes → allowed roles
4. Cross-reference both maps against the full 28-row PRD matrix

**Layer 2 — Per-object authorization:**
5. Search for custom middleware functions beyond `requireRole()` (e.g., `checkTeacherSessionAccess()`)
6. Search for service-level ownership/enrollment checks (e.g., `teacherId !== uid`, enrollment queries)
7. Map each conditional permission row to its enforcement code (or flag as missing)

**Layer 3 — Frontend UI visibility:**
8. Map navigation config (`navigation.ts`, `settings-nav.ts`) role filters
9. Search for inline role-conditional rendering (`user?.role`, `role ===` patterns)
10. Note: `RBACWrapper` HOC may not exist as a named component — search for equivalent patterns

**Classification:**
- Flag every mismatch as OVER-PERMISSIONED (security risk) or UNDER-PERMISSIONED (UX gap)
- Flag every missing per-object check as CONDITIONAL-MISSING (data leak risk)

### Output Artifact

**File:** `_bmad-output/planning-artifacts/rbac-permissions-matrix.md`

**Structure:**
```markdown
# RBAC Permissions Matrix — ClassLite

## Summary
- Total routes audited: X
- Total UI sections audited: X
- Gaps found: X (Y critical, Z minor)

## Permissions Matrix
| Feature Area | Route/Component | Owner | Admin | Teacher | Student | PRD Match? | Notes |

## Gap Analysis
### Critical Gaps (Security Risk)
### Minor Gaps (UX Inconvenience)
### Recommendations for Stories 15-2, 15-3, 15-4
```

### Previous Epic Intelligence

**From Epic 14 (Session & Schedule):**
- RBAC guards are consistently applied: `requireRole(["OWNER", "ADMIN"])` for schedule management, `requireRole(["OWNER", "ADMIN", "TEACHER"])` for session operations
- `RBACWrapper` is used in frontend for conditional button rendering (e.g., force-save button only for OWNER/ADMIN in ConflictWarningBanner)
- Pattern established: route-level guard + component-level `RBACWrapper` = defense in depth

**From Epic 1 (Stories 1-3, 1-4):**
- Story 1-3 implemented the initial RBAC middleware and invitation system
- Story 1-4 implemented `RBACWrapper` as a reusable HOC for frontend access control
- These are the foundation being audited

### Testing Standards

- **Framework:** Vitest (co-located tests)
- **Existing RBAC tests:** `role.middleware.test.ts` and `role.middleware.integration.test.ts`
- **Frontend tests:** `route-protection.test.tsx`
- No new tests expected for this audit story — the output is a document, not code

### Project Structure Notes

- Alignment: Feature-first organization in `apps/backend/src/modules/{feature}/`
- Frontend: `apps/webapp/src/features/{feature}/components/`
- Types: `packages/types/src/` for shared Zod schemas
- No structural changes expected — this is a read-only audit

### References

- [Source: _bmad-output/planning-artifacts/prd.md#Section 8 — RBAC Matrix]
- [Source: _bmad-output/planning-artifacts/architecture.md — Authentication & Security, RBAC sections]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 15: RBAC Audit & Permissions]
- [Source: apps/backend/src/middlewares/role.middleware.ts — requireRole() implementation]
- [Source: apps/webapp/src/features/auth/protected-route.tsx — ProtectedRoute component]
- [Source: packages/db/prisma/schema.prisma — CenterRole enum, Permission models]
- [Source: project-context.md — Layered Architecture, Multi-Tenancy rules]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Verified `checkTeacherSessionAccess()` implementation in `sessions.routes.ts:34-79` — correctly validates teacher-class assignment
- Verified student-facing comment filtering in `grading.service.ts:110-112` — `visibility === "student_facing"` filter confirmed safe
- Confirmed Knowledge Hub, Lesson Plans, Teacher Notes are NOT IMPLEMENTED (Epics 18/19 backlog)
- Confirmed engagement module has no routes (service-only, background jobs via Inngest)
- Confirmed billing is OWNER-only across all 5 endpoints — Admin read access missing per PRD

### Completion Notes List

- **Task 1:** Audited all 29 backend route files across 19+ modules. Documented ~130 endpoints with role guards. Found `checkTeacherSessionAccess()` as the only custom per-object middleware. Identified session/schedule/attendance GET routes missing explicit `requireRole()`. Verified all 11 intentionally-unprotected routes.
- **Task 2:** Audited all frontend route protections in App.tsx (25+ routes), navigation config (10 nav items + 9 settings tabs), and RBACWrapper usage across 15 features. Found Admin blocked from moderation page despite backend allowing it. Found billing settings tab visible to Admin but API returns 403.
- **Task 3:** Created `_bmad-output/planning-artifacts/rbac-permissions-matrix.md` covering all 28 PRD rows with explicit ALLOW/DENY per role, conditional permissions audit, and gap analysis.
- **Task 4:** Generated prioritized gap list: 4 critical (session/schedule GET missing requireRole, student attendance denied, student session enrollment unverified), 4 moderate (billing Admin access, AI config Admin/Teacher access, moderation frontend/backend mismatch), 5 minor (center settings over/under-permissioned, attendance pattern inconsistency, course nav for students).
- **Task 5:** Matrix presented in story completion. Key finding: Admin grading access (user feedback F2) is actually PRD-correct. Teacher Notes RBAC conflicts with Owner god mode (Story 15-3). Recommendations provided for Stories 15-2, 15-3, 15-4.

### Change Log

- 2026-04-19: Story 15-1 RBAC Audit completed. Created `rbac-permissions-matrix.md`. No production code changes.

### File List

- `_bmad-output/planning-artifacts/rbac-permissions-matrix.md` (NEW — primary output artifact)
- `_bmad-output/implementation-artifacts/15-1-rbac-audit.md` (MODIFIED — task checkboxes, dev agent record)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (MODIFIED — status update)
