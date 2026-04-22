# RBAC Permissions Matrix — ClassLite

**Generated:** 2026-04-19
**Audit Scope:** Phase 1 roles (OWNER, ADMIN, TEACHER, STUDENT)
**Source:** Full codebase scan of backend route guards, frontend route/component protections, cross-referenced against PRD Section 8

---

## Summary

- **Total backend route files audited:** 29
- **Total backend endpoints audited:** ~130
- **Total frontend features audited:** 15
- **Total PRD matrix rows:** 28 (27 implemented feature areas + 1 not-yet-built)
- **Gaps found:** 13 (4 critical security, 4 moderate, 5 minor/UX)
- **Not-yet-implemented PRD rows:** 4 (Knowledge Hub, Lesson Plans, Teacher Notes — Epics 18/19 backlog)

---

## Permissions Matrix

### Legend

- **CRUD** = Create, Read, Update, Delete (full access)
- **R** = Read only
- **CU** = Create + Update
- **CRU** = Create + Read + Update
- **D** = Delete only
- **-** = No access
- **(assigned)** = Teacher must be assigned to the class
- **(own only)** = Only the user's own resources
- **(enrolled)** = Student must be enrolled in the class/course
- **(student-facing)** = Only comments marked as student-facing

### 1. Center Settings

| Feature | Owner | Admin | Teacher | Student | PRD Match? | Notes |
|---------|-------|-------|---------|---------|------------|-------|
| **PRD Expected** | CRUD | CRUD | R | - | — | — |
| **Backend (tenant)** | CRUD | CRUD | R | R | PARTIAL | Student can GET tenant (read center info) — PRD says "-" |
| **Frontend (settings)** | CRUD | CRUD | - | - | PARTIAL | Teacher cannot see settings at all — PRD says R |

**Gaps:**
- **OVER-PERMISSIONED:** Student can read center settings via `GET /tenants/:id` (backend allows all roles). *Severity: Low — read-only, same center data.*
- **UNDER-PERMISSIONED:** Teacher has no access to settings pages in frontend. PRD says R. *Severity: Low — UX inconvenience, no security risk.*

---

### 2. User Management

| Feature | Owner | Admin | Teacher | Student | PRD Match? | Notes |
|---------|-------|-------|---------|---------|------------|-------|
| **PRD Expected** | CRUD | CRUD | - | - | — | — |
| **Backend (users)** | CRUD | CRU | - | - | PARTIAL | Admin cannot change roles (OWNER only) |
| **Frontend (users)** | CRUD | CRU | - | - | MATCH | Correct |

**Notes:** Admin restriction on role changes is intentional security — only Owner can change roles. This is stricter than PRD but reasonable. Change role = OWNER only (`PATCH /:userId/role`).

---

### 3. Class Scheduling

| Feature | Owner | Admin | Teacher | Student | PRD Match? | Notes |
|---------|-------|-------|---------|---------|------------|-------|
| **PRD Expected** | CRUD | CRUD | R | R | — | — |
| **Backend (classes)** | CRUD | CRUD | R | R | MATCH | Correct |
| **Backend (schedules)** | CRUD | CRUD | R* | R* | PARTIAL | *GET routes lack explicit `requireRole()` — rely on service filtering |
| **Frontend (schedule)** | CRUD | CRUD | R | R | MATCH | RBACWrapper hides create/edit for Teacher/Student |

**Gaps:**
- **DEFENSE-IN-DEPTH:** Schedule GET routes (`GET /`, `GET /:id`) have `authMiddleware` but no `requireRole()`. Service filters by role. *Severity: Low — auth required, service filters correctly.*

---

### 4. Attendance

| Feature | Owner | Admin | Teacher | Student | PRD Match? | Notes |
|---------|-------|-------|---------|---------|------------|-------|
| **PRD Expected** | CRUD | CRUD | CRUD | R | — | — |
| **Backend (attendance)** | CRUD | CRUD | CRUD (assigned) | - | PARTIAL | Students denied via `checkTeacherSessionAccess` |
| **Frontend (schedule)** | CRUD | CRUD | CRUD | R | MATCH | Mark Attendance button shown to OWNER/ADMIN/TEACHER |

**Gaps:**
- **UNDER-PERMISSIONED:** Student cannot read attendance via API. `checkTeacherSessionAccess` denies STUDENT role. PRD says Student gets R. *Severity: Moderate — students cannot verify their own attendance records via API.*
- **DEFENSE-IN-DEPTH:** Session attendance GET/POST routes lack explicit `requireRole()` — rely solely on `checkTeacherSessionAccess`. *Severity: Low.*

---

### 5. Exercise Creation

| Feature | Owner | Admin | Teacher | Student | PRD Match? | Notes |
|---------|-------|-------|---------|---------|------------|-------|
| **PRD Expected** | CRUD | CRUD | CRUD | - | — | — |
| **Backend (exercises)** | CRUD | CRUD | CRUD | - | MATCH | Correct |
| **Frontend (exercises)** | CRUD | CRUD | CRUD | - | MATCH | Route guard + nav config correct |

---

### 6. Audio Upload (Listening)

| Feature | Owner | Admin | Teacher | Student | PRD Match? | Notes |
|---------|-------|-------|---------|---------|------------|-------|
| **PRD Expected** | CRUD | CRUD | CRUD | - | — | — |
| **Backend (exercises/audio)** | CRUD | CRUD | CRUD | - | MATCH | Correct |
| **Frontend** | CRUD | CRUD | CRUD | - | MATCH | Within exercise editor |

---

### 7. Mock Test Assembly

| Feature | Owner | Admin | Teacher | Student | PRD Match? | Notes |
|---------|-------|-------|---------|---------|------------|-------|
| **PRD Expected** | CRUD | CRUD | CRUD | - | — | — |
| **Backend (mock-tests)** | CRUD | CRUD | CRUD | - | MATCH | Correct |
| **Frontend (mock-tests)** | CRUD | CRUD | CRUD | - | MATCH | Route guard + nav correct |

---

### 8. Assignment

| Feature | Owner | Admin | Teacher | Student | PRD Match? | Notes |
|---------|-------|-------|---------|---------|------------|-------|
| **PRD Expected** | CRUD | CRUD | CRUD | - | — | — |
| **Backend (assignments)** | CRUD | CRUD | CRUD | - | MATCH | Correct |
| **Backend (student-assignments)** | - | - | - | R | MATCH | Students can list/view own assignments |
| **Frontend (assignments)** | CRUD | CRUD | CRUD | - | MATCH | Correct |

---

### 9. Submission

| Feature | Owner | Admin | Teacher | Student | PRD Match? | Notes |
|---------|-------|-------|---------|---------|------------|-------|
| **PRD Expected** | - | - | - | CRUD | — | — |
| **Backend (submissions)** | - | - | - | CRUD | MATCH | Student-only with ownership checks |
| **Frontend** | - | - | - | CRUD | MATCH | Full-screen take assignment is STUDENT only |

---

### 10. AI Grading Workbench

| Feature | Owner | Admin | Teacher | Student | PRD Match? | Notes |
|---------|-------|-------|---------|---------|------------|-------|
| **PRD Expected** | CRUD | CRUD | CRUD | - | — | — |
| **Backend (grading)** | CRUD | CRUD | CRUD | - | MATCH | Teachers see only their class submissions |
| **Frontend (grading)** | CRUD | CRUD | CRUD | - | MATCH | Route guard correct |

**Note on User Feedback F2:** "Admins can see grading queue" — this is actually PRD-correct. PRD gives Admin CRUD on Grading Workbench. The user feedback concern may reflect a desired change, not a PRD violation.

---

### 11. Teacher Comments

| Feature | Owner | Admin | Teacher | Student | PRD Match? | Notes |
|---------|-------|-------|---------|---------|------------|-------|
| **PRD Expected** | CRUD | CRUD | CRUD | R (student-facing only) | — | — |
| **Backend (grading/comments)** | CRUD | CRUD | CRUD | R | PARTIAL | Student reads via `/student/submissions/:id` — need to verify student-facing filtering |
| **Frontend (feedback)** | R | R | CRUD | R | MATCH | Feedback route allows all 4 roles |

**Verified:** Student feedback view correctly filters by `visibility === "student_facing"` in `grading.service.ts:111`. No data leak risk.

---

### 12. Band Rubric Config

| Feature | Owner | Admin | Teacher | Student | PRD Match? | Notes |
|---------|-------|-------|---------|---------|------------|-------|
| **PRD Expected** | CRUD | CRUD | R | - | — | — |
| **Backend** | CRUD | - | - | - | PARTIAL | AI Customization (methodology/golden samples) is OWNER-only |
| **Frontend** | CRUD | - | - | - | PARTIAL | AI settings page: `if (!isOwner) return <ErrorState>` |

**Gaps:**
- **UNDER-PERMISSIONED:** Admin has no access to band rubric/AI configuration. PRD says CRUD. Teacher has no read access. PRD says R. *Severity: Moderate — Admin cannot manage rubrics.*

---

### 13. Student Health Dashboard

| Feature | Owner | Admin | Teacher | Student | PRD Match? | Notes |
|---------|-------|-------|---------|---------|------------|-------|
| **PRD Expected** | R | R | R (Own Students) | - | — | — |
| **Backend (student-health)** | R+ | R+ | R (filtered) | - | MATCH | Owner/Admin can also create interventions. Teacher filtered to own students |
| **Frontend (students)** | R+ | R+ | R | - | MATCH | RBACWrapper controls visibility |

**Notes:** Owner/Admin have additional capabilities beyond R (interventions, flag resolution) which exceeds PRD spec but is reasonable. Teacher gets `GET /dashboard/teacher-widget` (TEACHER only). Teacher can create flags (`POST /flags` is TEACHER only).

---

### 14. Billing & Subscription

| Feature | Owner | Admin | Teacher | Student | PRD Match? | Notes |
|---------|-------|-------|---------|---------|------------|-------|
| **PRD Expected** | CRUD | R | - | - | — | — |
| **Backend (billing)** | CRUD | - | - | - | NO MATCH | All billing routes are OWNER-only |
| **Frontend (settings/billing)** | CRUD | visible | - | - | PARTIAL | Settings route allows ADMIN to see billing tab, but API calls will 403 |

**Gaps:**
- **UNDER-PERMISSIONED:** Admin cannot read billing information. PRD says Admin gets R. Backend blocks Admin from all billing endpoints. *Severity: Moderate — Admin should be able to view billing overview/payment history.*
- **FRONTEND/BACKEND MISMATCH:** Admin can navigate to billing settings tab (no role restriction on tab config) but API calls return 403. *Severity: Moderate — broken UX for Admin.*

---

### 15. Knowledge Hub: Upload/Create

| Feature | Owner | Admin | Teacher | Student | PRD Match? | Notes |
|---------|-------|-------|---------|---------|------------|-------|
| **PRD Expected** | CRUD | CRUD | CRUD | - | — | — |
| **Implementation** | NOT IMPLEMENTED | — | — | — | N/A | Epic 18 (backlog) |

---

### 16. Knowledge Hub: View/Download

| Feature | Owner | Admin | Teacher | Student | PRD Match? | Notes |
|---------|-------|-------|---------|---------|------------|-------|
| **PRD Expected** | CRUD | CRUD | CRUD | R (enrolled) | — | — |
| **Implementation** | NOT IMPLEMENTED | — | — | — | N/A | Epic 18 (backlog) |

---

### 17. Knowledge Hub: Delete

| Feature | Owner | Admin | Teacher | Student | PRD Match? | Notes |
|---------|-------|-------|---------|---------|------------|-------|
| **PRD Expected** | CRUD | CRUD | D (own only) | - | — | — |
| **Implementation** | NOT IMPLEMENTED | — | — | — | N/A | Epic 18 (backlog) |

---

### 18. Golden Samples: Manage

| Feature | Owner | Admin | Teacher | Student | PRD Match? | Notes |
|---------|-------|-------|---------|---------|------------|-------|
| **PRD Expected** | CRUD | - | - | - | — | — |
| **Backend (golden-samples)** | CRUD | - | - | - | MATCH | Correct — OWNER only |
| **Frontend (AI settings)** | CRUD | - | - | - | MATCH | Page gated by `isOwner` check |

---

### 19. Course: Create/Edit

| Feature | Owner | Admin | Teacher | Student | PRD Match? | Notes |
|---------|-------|-------|---------|---------|------------|-------|
| **PRD Expected** | CRUD | CRUD | - | - | — | — |
| **Backend (courses)** | CRUD | CRUD | R | R | PARTIAL | Teacher/Student can read courses — PRD says "-" for Teacher create/edit |
| **Frontend (courses)** | CRUD | CRUD | R | - | MATCH | RBACWrapper hides create/edit for Teacher |

**Notes:** Teacher having R on courses is reasonable — they need to see which courses they teach. PRD column says "-" for create/edit which is correct. Read access is implied.

---

### 20. Course: View

| Feature | Owner | Admin | Teacher | Student | PRD Match? | Notes |
|---------|-------|-------|---------|---------|------------|-------|
| **PRD Expected** | R | R | R | R (enrolled) | — | — |
| **Backend (courses)** | R | R | R | R | PARTIAL | Student enrollment filtering needs verification |
| **Frontend (courses)** | R | R | R | - | PARTIAL | Student has no nav to courses page |

**Gaps:**
- **CONDITIONAL-MISSING (potential):** Student enrollment check on course view not verified. *Severity: Low — students don't have frontend nav to courses.*

---

### 21. Lesson Plans: Create/Edit

| Feature | Owner | Admin | Teacher | Student | PRD Match? | Notes |
|---------|-------|-------|---------|---------|------------|-------|
| **PRD Expected** | CRUD | CRUD | - | - | — | — |
| **Implementation** | NOT IMPLEMENTED | — | — | — | N/A | Epic 19 (backlog) |

---

### 22. Recurrence Rule: Create/Edit

| Feature | Owner | Admin | Teacher | Student | PRD Match? | Notes |
|---------|-------|-------|---------|---------|------------|-------|
| **PRD Expected** | CRUD | CRUD | - | - | — | — |
| **Backend (schedules)** | CRUD | CRUD | - | - | MATCH | Create/Update/Delete require OWNER/ADMIN |
| **Frontend (schedule)** | CRUD | CRUD | - | - | MATCH | RBACWrapper hides schedule management for non-admin |

---

### 23. Session: Cancel Occurrence

| Feature | Owner | Admin | Teacher | Student | PRD Match? | Notes |
|---------|-------|-------|---------|---------|------------|-------|
| **PRD Expected** | CRUD | CRUD | CU (assigned) | - | — | — |
| **Backend (sessions)** | CRUD | CRUD | CU (assigned) | - | MATCH | `checkTeacherSessionAccess` validates teacher assignment |
| **Frontend (schedule)** | CRUD | CRUD | CU (assigned) | - | MATCH | RBACWrapper + `isAssignedTeacher` check |

---

### 24. Session: Reschedule

| Feature | Owner | Admin | Teacher | Student | PRD Match? | Notes |
|---------|-------|-------|---------|---------|------------|-------|
| **PRD Expected** | CRUD | CRUD | CU (assigned) | - | — | — |
| **Backend (sessions)** | CRUD | CRUD | CU (assigned) | - | MATCH | Same `checkTeacherSessionAccess` middleware |
| **Frontend (schedule)** | CRUD | CRUD | CU (assigned) | - | MATCH | Drag-to-reschedule gated correctly |

---

### 25. Session: Customize Materials

| Feature | Owner | Admin | Teacher | Student | PRD Match? | Notes |
|---------|-------|-------|---------|---------|------------|-------|
| **PRD Expected** | CRUD | CRUD | CRU (assigned) | - | — | — |
| **Implementation** | NOT FULLY IMPLEMENTED | — | — | — | N/A | Session edit includes basic fields but "customize materials" as a distinct feature is not explicitly separated |

---

### 26. Session: Teacher Notes

| Feature | Owner | Admin | Teacher | Student | PRD Match? | Notes |
|---------|-------|-------|---------|---------|------------|-------|
| **PRD Expected** | - | - | CRUD (assigned) | - | — | Owner/Admin DENIED |
| **Implementation** | NOT IMPLEMENTED | — | — | — | N/A | No teacher notes feature exists in codebase |

**Important flag for Story 15-3:** PRD explicitly denies Owner/Admin access to Teacher Notes. This conflicts with "Owner god mode" intent. Must resolve before implementation.

---

### 27. Session: View Materials

| Feature | Owner | Admin | Teacher | Student | PRD Match? | Notes |
|---------|-------|-------|---------|---------|------------|-------|
| **PRD Expected** | R | R | R | R (enrolled) | — | — |
| **Backend (sessions)** | R | R | R | R* | PARTIAL | *Session GET routes lack explicit `requireRole()` — student filtering via service |
| **Frontend (schedule)** | R | R | R | R | MATCH | Schedule page allows all roles |

**Gaps:**
- **CONDITIONAL-MISSING (potential):** Student enrollment check on session view not verified at service level. *Severity: Moderate — students might see sessions from classes they're not enrolled in.*
- **DEFENSE-IN-DEPTH:** Session GET routes have no `requireRole()`. *Severity: Low.*

---

### 28. Content Moderation

| Feature | Owner | Admin | Teacher | Student | PRD Match? | Notes |
|---------|-------|-------|---------|---------|------------|-------|
| **PRD Expected** | CRUD | CRUD | - | - | — | (from architecture addendum) |
| **Backend (moderation)** | CRUD | partial | - | - | PARTIAL | Admin can view/resolve flags but CANNOT manage moderation terms (OWNER only) |
| **Frontend (moderation)** | CRUD | - | - | - | NO MATCH | Moderation page is OWNER-only (`if (!isOwner) return <AccessDenied>`) |

**Gaps:**
- **UNDER-PERMISSIONED (Frontend):** Admin cannot access moderation page at all. Backend allows Admin to view/resolve flags. *Severity: Moderate — frontend blocks Admin from a feature backend allows.*

---

## Conditional Permissions Audit

### Per-Object Authorization Checks

| PRD Condition | Enforcement | Status | Details |
|---|---|---|---|
| Teacher Comments: Student sees student-facing only | Service-level filtering | NEEDS VERIFICATION | Student feedback endpoint returns via `/student/submissions/:id` — must verify only student-facing comments are included |
| Student Health: Teacher sees Own Students | Service-level filtering | IMPLEMENTED | `student-health.service` filters dashboard/profile by teacher's assigned classes |
| Knowledge Hub: Student sees enrolled only | N/A | NOT IMPLEMENTED | Epic 18 backlog |
| Knowledge Hub: Teacher deletes own only | N/A | NOT IMPLEMENTED | Epic 18 backlog |
| Session Cancel: Teacher assigned only | `checkTeacherSessionAccess()` | IMPLEMENTED | Middleware validates `class.teacherId === uid` |
| Session Reschedule: Teacher assigned only | `checkTeacherSessionAccess()` | IMPLEMENTED | Same middleware |
| Session Customize Materials: Teacher assigned only | `checkTeacherSessionAccess()` | IMPLEMENTED | Same middleware |
| Session Teacher Notes: Owner/Admin DENIED | N/A | NOT IMPLEMENTED | Feature doesn't exist yet |
| Session View Materials: Student enrolled only | Service-level filtering | NEEDS VERIFICATION | Session GET routes have no role guard; service filtering unverified for students |

---

## Gap Analysis

### Critical Gaps (Security Risk)

| # | Feature | Gap Type | Description | Feeds Story |
|---|---------|----------|-------------|-------------|
| ~~C1~~ | ~~Teacher Comments~~ | ~~CONDITIONAL-MISSING~~ | **VERIFIED SAFE:** `grading.service.ts:111` filters by `visibility === "student_facing"`. Students only see student-facing comments. No gap. | N/A |
| C2 | Session GET routes | DEFENSE-IN-DEPTH | `GET /sessions/`, `GET /sessions/week`, `GET /sessions/:id` have `authMiddleware` but no `requireRole()`. Any authenticated user can call these endpoints. Service filtering is the only guard. | 15-2 |
| C3 | Schedule GET routes | DEFENSE-IN-DEPTH | `GET /schedules/`, `GET /schedules/:id` have `authMiddleware` but no `requireRole()`. Same pattern as sessions. | 15-2 |
| C4 | Attendance: Student | UNDER-PERMISSIONED | `checkTeacherSessionAccess` denies STUDENT role on attendance endpoints. Students cannot view their own attendance records. PRD says Student gets R. | 15-4 |
| C5 | Session View Materials: Student | CONDITIONAL-MISSING | Student enrollment check not verified. Students might access sessions from non-enrolled classes. | 15-4 |

### Moderate Gaps (Functionality/UX)

| # | Feature | Gap Type | Description | Feeds Story |
|---|---------|----------|-------------|-------------|
| M1 | Billing | UNDER-PERMISSIONED | Admin cannot access any billing endpoints. PRD says Admin gets R. Backend is OWNER-only on all 5 billing routes. | 15-3 or 15-4 |
| M2 | Billing (Frontend) | MISMATCH | Admin can navigate to billing settings tab but API returns 403. Broken UX. | 15-4 |
| M3 | Band Rubric / AI Config | UNDER-PERMISSIONED | Admin has no access to AI customization. PRD says CRUD. Teacher has no read access. PRD says R. | 15-4 |
| M4 | Moderation (Frontend) | UNDER-PERMISSIONED | Admin blocked from moderation page by frontend `isOwner` check, but backend allows Admin on most moderation endpoints. | 15-4 |

### Minor Gaps (UX Inconvenience)

| # | Feature | Gap Type | Description | Feeds Story |
|---|---------|----------|-------------|-------------|
| L1 | Center Settings | OVER-PERMISSIONED | Student can read center settings via API (all roles allowed on `GET /tenants/:id`). Low risk — same-center data. | 15-4 |
| L2 | Center Settings (Frontend) | UNDER-PERMISSIONED | Teacher cannot see settings pages. PRD says R. No security risk. | 15-4 |
| L3 | Attendance GET stats | DEFENSE-IN-DEPTH | `GET /students/:id/attendance-stats` and `GET /students/:id/attendance` use `requireRole(["OWNER", "ADMIN", "TEACHER"])` but attendance session endpoints use only `checkTeacherSessionAccess`. Inconsistent pattern. | 15-2 |
| L4 | User Role Change | STRICTER-THAN-PRD | Only OWNER can change roles. PRD says Admin gets CRUD on User Management. Intentional security decision. | N/A (document only) |
| L5 | Course View: Student | UNDER-PERMISSIONED | Student has no frontend nav to courses page. PRD says Student gets R (enrolled). Student can view via direct URL but no navigation path. | 15-4 |

---

## Recommendations for Stories 15-2, 15-3, and 15-4

### Story 15-2: Admin — Remove Grading/Assignment Views

Based on audit findings, the user feedback (F2) that "Admins can see grading queue" is actually **PRD-correct**. The PRD gives Admin CRUD on AI Grading Workbench. Options:

1. **If F2 is a PRD change request:** Update PRD to deny Admin grading access, then implement route guard changes.
2. **If F2 was a misunderstanding:** Close with "works as designed per PRD."

**Additional 15-2 work from audit:**
- Add explicit `requireRole()` to session/schedule/attendance GET routes (C2, C3, L3)
- Verify teacher comment student-facing filtering (C1)

### Story 15-3: Owner God Mode

Owner currently has access to everything except:
- **Teacher Notes** (not yet implemented, PRD says Owner DENIED — conflict with god mode)
- All other features: Owner has full access

**Recommendation:** Resolve the Teacher Notes RBAC conflict before implementing god mode. Options:
- A) Owner sees Teacher Notes (breaks PRD but aligns with god mode)
- B) Teacher Notes remains teacher-only (PRD-compliant but limits god mode)

**Additional 15-3 work from audit:**
- Add Admin R access to billing endpoints (M1)
- Fix billing settings tab for Admin (M2)

### Story 15-4: Clearer Role Distinction in UI

**Audit-informed recommendations:**
- Fix Admin access to moderation page (M4) — backend allows it, frontend blocks it
- Add Admin access to AI customization/band rubrics (M3)
- Add Student R access to attendance (C4)
- Add Student enrollment check on session/course views (C5, L5)
- Add Teacher R access to center settings page (L2)
- Consider adding course navigation for Students (L5)
- Add role-specific visual indicators throughout UI

---

## Intentionally Unprotected Routes (Verified)

These routes correctly have no role guards:

| Route | Reason |
|---|---|
| `GET /health` | Health check endpoint |
| `GET/POST /unsubscribe/:token` | Email unsubscribe — token-based auth |
| `GET/POST/PUT /api/inngest` | Inngest webhook — signed by Inngest |
| `POST /billing/webhook` | Polar.sh webhook — signature verified |
| `POST /signup/center` | Public signup |
| `POST /signup/center/google` | Google OAuth signup |
| `POST /login` | Public login |
| `GET /login-attempt` | Rate-limited login attempt check |
| `POST /login-attempt` | Rate-limited login attempt recording |
| `DELETE /login-attempt` | DEV MODE ONLY — login attempt reset |
| `POST /tenants` | Platform admin key required (X-Platform-Admin-Key) |

---

## Architecture Notes

### Authorization Patterns Used

1. **`requireRole(roles[])`** — Route-level Fastify preHandler. Primary RBAC enforcement.
2. **`checkTeacherSessionAccess()`** — Custom middleware for session/attendance per-object checks. Validates teacher-class assignment.
3. **`authMiddleware`** — Token verification. Applied as global hook or per-route.
4. **Service-level filtering** — Role-based data scoping in service layer (e.g., teachers see only their students).
5. **`ProtectedRoute` component** — Frontend route-level guard with `allowedRoles` prop.
6. **`RBACWrapper` component** — Frontend component-level hide/disable by role.
7. **Inline role checks** — `user?.role === "OWNER"` conditional rendering in components.

### Defense-in-Depth Assessment

The codebase uses a layered approach:
- **Layer 1 (Route):** `requireRole()` — present on ~90% of mutation endpoints, missing on some GET endpoints
- **Layer 2 (Middleware):** `checkTeacherSessionAccess()` — covers session/attendance per-object checks
- **Layer 3 (Service):** Role-based data filtering — catches cases where route guard is broad
- **Layer 4 (Frontend):** `ProtectedRoute` + `RBACWrapper` — UI-level access control

**Strength:** Multi-layer approach means a single-layer failure rarely results in unauthorized access.
**Weakness:** Inconsistent application of Layer 1 on GET routes creates ambiguity about whether service-level filtering is the intended guard or an oversight.
