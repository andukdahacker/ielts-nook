# API Contracts

**Generated:** 2026-03-20 | **Scan Level:** Exhaustive
**Base URL:** `/api/v1` | **Protocol:** REST (JSON)
**Auth:** Firebase ID Token in `Authorization: Bearer {token}` header
**Validation:** Zod schemas via `fastify-type-provider-zod`

---

## Authentication

| Method | Path | Auth | Roles | Description |
|--------|------|:----:|-------|-------------|
| POST | `/auth/signup/center` | - | - | Create center + owner account |
| POST | `/auth/signup/center/google` | - | - | Google OAuth signup for center |
| POST | `/auth/login` | - | - | Login with Firebase ID token |
| GET | `/auth/me` | Yes | All | Get current user profile + membership |
| GET | `/auth/login-attempt?email=` | - | - | Check if account is locked |
| POST | `/auth/login-attempt` | - | - | Record failed login attempt |
| DELETE | `/auth/login-attempt?email=` | Yes | - | Reset login attempts (dev only) |

## Center/Tenant Management

| Method | Path | Auth | Roles | Description |
|--------|------|:----:|-------|-------------|
| GET | `/tenants` | Yes | O/A | List centers |
| POST | `/tenants` | Yes | O/A | Create center |
| GET | `/tenants/:id` | Yes | O/A | Get center details |
| PATCH | `/tenants/:id` | Yes | O/A | Update center settings |
| DELETE | `/tenants/:id` | Yes | O | Delete center |

## Invitations

| Method | Path | Auth | Roles | Description |
|--------|------|:----:|-------|-------------|
| GET | `/invitations` | Yes | O/A | List pending invitations |
| POST | `/invitations` | Yes | O/A | Send invitation email |
| GET | `/invitations/:id` | Yes | O/A | Get invitation details |
| PATCH | `/invitations/:id` | Yes | O/A | Update invitation |
| DELETE | `/invitations/:id` | Yes | O/A | Revoke invitation |

## Courses

| Method | Path | Auth | Roles | Description |
|--------|------|:----:|-------|-------------|
| GET | `/logistics/courses` | Yes | All | List courses |
| POST | `/logistics/courses` | Yes | O/A | Create course |
| GET | `/logistics/courses/:id` | Yes | All | Get course details |
| PATCH | `/logistics/courses/:id` | Yes | O/A | Update course |
| DELETE | `/logistics/courses/:id` | Yes | O/A | Delete course (no classes) |

## Classes

| Method | Path | Auth | Roles | Description |
|--------|------|:----:|-------|-------------|
| GET | `/logistics/classes` | Yes | All | List classes (with filters) |
| POST | `/logistics/classes` | Yes | O/A | Create class |
| GET | `/logistics/classes/:id` | Yes | All | Get class details |
| PATCH | `/logistics/classes/:id` | Yes | O/A | Update class |
| DELETE | `/logistics/classes/:id` | Yes | O/A | Delete class |
| GET | `/logistics/classes/:id/students` | Yes | O/A/T | List roster students |
| POST | `/logistics/classes/:id/students` | Yes | O/A | Add students to roster |
| DELETE | `/logistics/classes/:id/students/:studentId` | Yes | O/A | Remove student from roster |

## Sessions & Schedules

| Method | Path | Auth | Roles | Description |
|--------|------|:----:|-------|-------------|
| GET | `/logistics/sessions` | Yes | All | List sessions (date range) |
| POST | `/logistics/sessions` | Yes | O/A | Create session |
| PATCH | `/logistics/sessions/:id` | Yes | O/A | Update session |
| DELETE | `/logistics/sessions/:id` | Yes | O/A | Cancel session |
| GET | `/logistics/schedules` | Yes | All | List schedules |
| POST | `/logistics/schedules` | Yes | O/A | Create recurring schedule |
| PATCH | `/logistics/schedules/:id` | Yes | O/A | Update schedule |
| DELETE | `/logistics/schedules/:id` | Yes | O/A | Delete schedule |

## Rooms

| Method | Path | Auth | Roles | Description |
|--------|------|:----:|-------|-------------|
| GET | `/logistics/rooms` | Yes | All | List rooms |
| POST | `/logistics/rooms` | Yes | O/A | Create room |
| PATCH | `/logistics/rooms/:id` | Yes | O/A | Update room |
| DELETE | `/logistics/rooms/:id` | Yes | O/A | Delete room |

## Attendance

| Method | Path | Auth | Roles | Description |
|--------|------|:----:|-------|-------------|
| GET | `/logistics/attendance/:sessionId` | Yes | O/A/T | Get session attendance |
| POST | `/logistics/attendance/:sessionId` | Yes | O/A/T | Submit attendance records |
| PATCH | `/logistics/attendance/:recordId` | Yes | O/A/T | Update attendance record |

## Exercises

| Method | Path | Auth | Roles | Description |
|--------|------|:----:|-------|-------------|
| GET | `/exercises` | Yes | O/A/T | List exercises (filters: skill, status, band, tags, type) |
| POST | `/exercises` | Yes | O/A/T | Create exercise |
| GET | `/exercises/:id` | Yes | O/A/T | Get exercise with sections/questions |
| PATCH | `/exercises/:id` | Yes | O/A/T | Update exercise |
| PATCH | `/exercises/:id/autosave` | Yes | O/A/T | Auto-save (frequent updates) |
| DELETE | `/exercises/:id` | Yes | O/A/T | Delete exercise |
| POST | `/exercises/:id/publish` | Yes | O/A/T | Publish exercise |
| POST | `/exercises/:id/archive` | Yes | O/A/T | Archive exercise |
| POST | `/exercises/:id/restore` | Yes | O/A/T | Restore from archive |
| POST | `/exercises/:id/duplicate` | Yes | O/A/T | Clone exercise |
| POST | `/exercises/bulk-archive` | Yes | O/A/T | Bulk archive |
| POST | `/exercises/bulk-duplicate` | Yes | O/A/T | Bulk clone |
| POST | `/exercises/bulk-tag` | Yes | O/A/T | Bulk assign tags |

### Exercise Media

| Method | Path | Auth | Roles | Description |
|--------|------|:----:|-------|-------------|
| POST | `/exercises/:id/diagram` | Yes | O/A/T | Upload diagram image (5MB) |
| POST | `/exercises/:id/stimulus-image` | Yes | O/A/T | Upload stimulus image (5MB) |
| DELETE | `/exercises/:id/stimulus-image` | Yes | O/A/T | Remove stimulus image |
| POST | `/exercises/:id/audio` | Yes | O/A/T | Upload listening audio (100MB) |
| DELETE | `/exercises/:id/audio` | Yes | O/A/T | Remove audio |

### Exercise Tags

| Method | Path | Auth | Roles | Description |
|--------|------|:----:|-------|-------------|
| GET | `/exercises/tags` | Yes | O/A/T | List tags |
| POST | `/exercises/tags` | Yes | O/A/T | Create tag |
| PATCH | `/exercises/tags/:id` | Yes | O/A/T | Update tag |
| DELETE | `/exercises/tags/:id` | Yes | O/A/T | Delete tag |
| GET | `/exercises/:id/tags` | Yes | O/A/T | Get exercise tags |
| PUT | `/exercises/:id/tags` | Yes | O/A/T | Replace exercise tags |

### Exercise Sections

| Method | Path | Auth | Roles | Description |
|--------|------|:----:|-------|-------------|
| GET | `/exercises/:id/sections` | Yes | O/A/T | List sections |
| POST | `/exercises/:id/sections` | Yes | O/A/T | Create section |
| PATCH | `/exercises/:id/sections/:sectionId` | Yes | O/A/T | Update section |
| DELETE | `/exercises/:id/sections/:sectionId` | Yes | O/A/T | Delete section |

### AI Question Generation

| Method | Path | Auth | Roles | Description |
|--------|------|:----:|-------|-------------|
| POST | `/exercises/ai/generate-questions` | Yes | O/A/T | Trigger Gemini question generation (Inngest job) |

## Assignments

| Method | Path | Auth | Roles | Description |
|--------|------|:----:|-------|-------------|
| GET | `/assignments` | Yes | O/A/T | List assignments |
| POST | `/assignments` | Yes | O/A/T | Create assignment |
| GET | `/assignments/:id` | Yes | O/A/T | Get assignment details |
| PATCH | `/assignments/:id` | Yes | O/A/T | Update assignment |
| DELETE | `/assignments/:id` | Yes | O/A/T | Delete assignment |
| POST | `/assignments/:id/close` | Yes | O/A/T | Close assignment |
| POST | `/assignments/:id/reopen` | Yes | O/A/T | Reopen assignment |
| POST | `/assignments/:id/archive` | Yes | O/A/T | Archive assignment |

### Student Assignments

| Method | Path | Auth | Roles | Description |
|--------|------|:----:|-------|-------------|
| GET | `/student/assignments` | Yes | S | List student's assignments |
| GET | `/student/assignments/:id` | Yes | S | Get assignment detail for student |

## Submissions

| Method | Path | Auth | Roles | Description |
|--------|------|:----:|-------|-------------|
| POST | `/student/submissions` | Yes | S | Start a submission |
| GET | `/student/submissions/:id` | Yes | S | Get submission status |
| PATCH | `/student/submissions/:id/answers` | Yes | S | Save answers (auto-save) |
| POST | `/student/submissions/:id/submit` | Yes | S | Final submit |

## Grading (Teacher/Admin)

| Method | Path | Auth | Roles | Description |
|--------|------|:----:|-------|-------------|
| GET | `/grading/submissions` | Yes | O/A/T | Grading queue (filters: skill, status, gradingStatus) |
| GET | `/grading/submissions/:id` | Yes | O/A/T | Full submission detail for grading |
| GET | `/grading/submissions/:id/feedback` | Yes | O/A/T | AI-generated feedback |
| POST | `/grading/submissions/:id/comments` | Yes | O/A/T | Create teacher comment |
| GET | `/grading/submissions/:id/comments` | Yes | O/A/T | List comments (optional visibility filter) |
| PATCH | `/grading/submissions/:id/comments/:cid` | Yes | O/A/T | Update own comment |
| DELETE | `/grading/submissions/:id/comments/:cid` | Yes | O/A/T | Delete own comment |
| PATCH | `/grading/submissions/:id/feedback/items/:iid` | Yes | O/A/T | Accept/reject AI feedback item |
| PATCH | `/grading/submissions/:id/feedback/items/bulk` | Yes | O/A/T | Bulk approve remaining items |
| POST | `/grading/submissions/:id/finalize` | Yes | O/A/T | Finalize grading (mark GRADED) |
| POST | `/grading/submissions/:id/analyze` | Yes | O/A/T | Trigger/re-trigger AI analysis |
| PATCH | `/grading/submissions/:id/priority` | Yes | O/A/T | Toggle priority flag |

## Grading (Student View)

| Method | Path | Auth | Roles | Description |
|--------|------|:----:|-------|-------------|
| GET | `/grading/student/submissions/:id` | Yes | All | View approved feedback only |
| GET | `/grading/student/submissions/:id/history` | Yes | All | Submission history for assignment |

## Mock Tests

| Method | Path | Auth | Roles | Description |
|--------|------|:----:|-------|-------------|
| GET | `/mock-tests` | Yes | O/A/T | List mock tests |
| POST | `/mock-tests` | Yes | O/A/T | Create mock test |
| GET | `/mock-tests/:id` | Yes | O/A/T | Get mock test details |
| PATCH | `/mock-tests/:id` | Yes | O/A/T | Update mock test |
| DELETE | `/mock-tests/:id` | Yes | O/A/T | Delete mock test |
| POST | `/mock-tests/:id/publish` | Yes | O/A/T | Publish mock test |
| POST | `/mock-tests/:id/archive` | Yes | O/A/T | Archive mock test |

## Billing

| Method | Path | Auth | Roles | Description |
|--------|------|:----:|-------|-------------|
| GET | `/billing/tiers` | Yes | O | Tier comparison (starter/growth/enterprise) |
| GET | `/billing` | Yes | O | Billing overview (subscription + usage + grace) |
| GET | `/billing/payments` | Yes | O | Payment history (paginated) |
| GET | `/billing/usage` | Yes | O | Usage history (6-month snapshots) |
| POST | `/billing/checkout` | Yes | O | Create Polar.sh checkout session |
| POST | `/billing/webhooks/polar` | - | - | Polar.sh webhook (HMAC verified) |

## Users

| Method | Path | Auth | Roles | Description |
|--------|------|:----:|-------|-------------|
| GET | `/users` | Yes | O/A | List users (filters, pagination) |
| GET | `/users/:id` | Yes | All | Get user profile |
| PATCH | `/users/:id/role` | Yes | O | Change user role |
| PATCH | `/users/:id/deactivate` | Yes | O/A | Deactivate user |
| PATCH | `/users/:id/reactivate` | Yes | O/A | Reactivate user |
| POST | `/users/bulk-deactivate` | Yes | O/A | Bulk deactivate |
| POST | `/users/bulk-remind` | Yes | O/A | Send reminder emails |

### User Profile

| Method | Path | Auth | Roles | Description |
|--------|------|:----:|-------|-------------|
| PATCH | `/users/me/profile` | Yes | All | Update own profile |
| GET | `/users/me/has-password` | Yes | All | Check password provider |
| POST | `/users/me/change-password` | Yes | All | Change password |
| POST | `/users/me/request-deletion` | Yes | All | Request account deletion |
| POST | `/users/me/cancel-deletion` | Yes | All | Cancel deletion request |
| POST | `/users/me/avatar` | Yes | All | Upload avatar (1MB) |

### Invitations (User context)

| Method | Path | Auth | Roles | Description |
|--------|------|:----:|-------|-------------|
| GET | `/users/invitations` | Yes | O/A | List pending invitations |
| POST | `/users/invitations/:id/resend` | Yes | O/A | Resend invitation |
| DELETE | `/users/invitations/:id` | Yes | O/A | Revoke invitation |

### CSV Import

| Method | Path | Auth | Roles | Description |
|--------|------|:----:|-------|-------------|
| GET | `/users/import/template` | Yes | O/A | Download CSV template |
| POST | `/users/import/validate` | Yes | O/A | Validate CSV file |
| POST | `/users/import/execute` | Yes | O/A | Execute import (Inngest job) |
| GET | `/users/import/status/:importLogId` | Yes | O/A | Poll import progress |
| GET | `/users/import/history` | Yes | O/A | Import history (paginated) |
| GET | `/users/import/:id/details` | Yes | O/A | Import details + error rows |
| POST | `/users/import/:id/retry` | Yes | O/A | Retry failed rows |

### Parent Emails

| Method | Path | Auth | Roles | Description |
|--------|------|:----:|-------|-------------|
| POST | `/users/:userId/parent-emails` | Yes | O/A/T | Send parent email |
| GET | `/users/:userId/parent-emails` | Yes | O/A/T | List parent communications |

## Notifications

| Method | Path | Auth | Roles | Description |
|--------|------|:----:|-------|-------------|
| GET | `/notifications` | Yes | All | List notifications |
| PATCH | `/notifications/:id/read` | Yes | All | Mark as read |
| POST | `/notifications/read-all` | Yes | All | Mark all as read |

## Student Health

| Method | Path | Auth | Roles | Description |
|--------|------|:----:|-------|-------------|
| GET | `/student-health/dashboard` | Yes | O/A/T | Health overview (traffic lights) |
| GET | `/student-health/profile/:studentId` | Yes | O/A/T | Detailed student profile |
| POST | `/student-health/flags` | Yes | O/A/T | Create student flag |
| PATCH | `/student-health/flags/:id/resolve` | Yes | O/A/T | Resolve flag |
| POST | `/student-health/interventions` | Yes | O/A/T | Send intervention email |
| GET | `/student-health/interventions/:studentId` | Yes | O/A/T | Intervention history |

## Health Check

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| GET | `/health` | - | Server health (status, timestamp, version, DB reachable) |

## Inngest Webhook

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| GET/POST/PUT | `/api/inngest` | - | Inngest function execution endpoint |

---

## Response Format

All API responses follow the standard wrapper:

```typescript
{
  data: T | null;
  message: string;
}
```

Error responses:

```typescript
{
  statusCode: number;
  error: string;
  message: string;
}
```

## Role Abbreviations

- **O** = Owner
- **A** = Admin
- **T** = Teacher
- **S** = Student
