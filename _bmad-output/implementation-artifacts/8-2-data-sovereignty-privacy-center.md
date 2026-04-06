# Story 8.2: Data Sovereignty & Privacy Center

Status: ready-for-dev

## Story

As a User,
I want to ensure my data is stored according to local laws (Decree 13) and have control over my personal data,
so that my privacy is protected and I can exercise my data rights.

## Acceptance Criteria

1. **AC1: Encryption-at-Rest Verification** — All personal data is encrypted-at-rest using AES-256 (Railway Postgres provides this at the infrastructure level). A verification check confirms encryption is active and displays status in the Privacy Center admin view.

2. **AC2: Privacy Center UI** — Settings > Privacy page (replacing current "Coming Soon" placeholder) provides:
   - **Data Export:** Users can request a full copy of their personal data in JSON format. Export runs asynchronously via Inngest job. User receives download link when ready.
   - **Account Deletion:** Link/redirect to existing account deletion flow (already implemented in profile page). Owners see note that owner accounts cannot be deleted.
   - **Data Summary:** Shows what categories of data the platform stores about the user (profile, academic records, submissions, AI feedback, etc.).

3. **AC3: AI Data Processing Transparency** — Every AI data processing event (grading, exercise generation) displays a transparent indicator explaining the data usage:
   - Grading interface shows "AI processes your submission text to generate feedback" indicator.
   - Exercise generation shows "AI uses passage text to create questions" indicator.
   - Indicators are subtle (info icon + tooltip), not intrusive.

## Tasks / Subtasks

- [ ] **Task 1: Verify & Document Encryption-at-Rest** (AC: #1)
  - [ ] 1.1 Verify Railway Postgres encryption-at-rest is enabled (AES-256 or equivalent)
  - [ ] 1.2 Add `GET /api/v1/privacy/encryption-status` endpoint (owner-only) that returns encryption verification status
  - [ ] 1.3 Display encryption status badge in Privacy Center (owner view only)

- [ ] **Task 2: Data Export Backend** (AC: #2)
  - [ ] 2.1 Create `DataExportRequest` Prisma model: id, userId, centerId, status (pending/processing/completed/failed/expired), fileUrl, error, requestedAt, completedAt, expiresAt
  - [ ] 2.2 Add `DataExportRequest` to TENANTED_MODELS in `packages/db/src/tenanted-client.ts`
  - [ ] 2.3 Create `apps/backend/src/modules/privacy/` module (service, routes)
  - [ ] 2.4 Add `POST /api/v1/privacy/data-export` endpoint — creates DataExportRequest, fires Inngest event
  - [ ] 2.5 Add `GET /api/v1/privacy/data-export/status` endpoint — returns latest export request status
  - [ ] 2.6 Add `GET /api/v1/privacy/data-export/download` endpoint — streams the export file (time-limited)
  - [ ] 2.7 Create Inngest job `privacy/data-export.requested` that:
    - Collects user data across all relevant models (see Data Export Scope below)
    - Generates JSON file
    - Uploads to Firebase Storage with expiring URL (7-day expiry)
    - Updates DataExportRequest status to completed
  - [ ] 2.8 Add `GET /api/v1/privacy/data-summary` endpoint — returns categories of data stored (no actual data, just category names + counts)

- [ ] **Task 3: Privacy Center Frontend** (AC: #2)
  - [ ] 3.1 Replace `PrivacyPage.tsx` placeholder with full Privacy Center UI
  - [ ] 3.2 **Data Summary section:** Card showing data categories stored (profile, academic, submissions, feedback, notifications)
  - [ ] 3.3 **Data Export section:** "Request Data Export" button with status tracking (pending/processing/ready), download link when complete
  - [ ] 3.4 **Account Deletion section:** Card with link to profile page deletion flow, explanation of 7-day grace period
  - [ ] 3.5 **Encryption Status section** (owner-only): Badge showing encryption-at-rest status
  - [ ] 3.6 Add privacy API hooks in `apps/webapp/src/features/settings/privacy.api.ts`

- [ ] **Task 4: AI Transparency Indicators** (AC: #3)
  - [ ] 4.1 Create reusable `AIProcessingIndicator` component (info icon + tooltip with explanation text)
  - [ ] 4.2 Add indicator to grading interface (`apps/webapp/src/features/grading/`) near AI feedback display
  - [ ] 4.3 Add indicator to AI exercise generation panel (`AIGenerationPanel.tsx`) near generation trigger
  - [ ] 4.4 Add indicator to student submission feedback view near AI-generated feedback sections

- [ ] **Task 5: Tests** (AC: #1, #2, #3)
  - [ ] 5.1 Unit tests for privacy service (data export request CRUD, data summary)
  - [ ] 5.2 Unit tests for data export Inngest job (data collection, JSON generation, status updates)
  - [ ] 5.3 Route tests for all privacy endpoints (auth, validation, tenant isolation)
  - [ ] 5.4 Frontend component tests for AIProcessingIndicator

## Dev Notes

### Architecture Patterns — MUST FOLLOW

**Backend Module Pattern:**
- Create `apps/backend/src/modules/privacy/` with:
  - `privacy.service.ts` — business logic
  - `privacy.routes.ts` — Fastify route definitions
- Follow Controller-Service pattern used in `modules/billing/` and `modules/users/`
- Register routes in `apps/backend/src/app.ts`

**Route Pattern:**
```typescript
// All routes under /api/v1/privacy/*
// Use fastify-type-provider-zod for validation
// Use requireAuth + requireRole middleware as needed
```

**Inngest Job Pattern (CRITICAL — follow exactly):**
```typescript
import { createPrisma } from "../../../plugins/create-prisma.js";
import { getTenantedClient } from "@workspace/db";

// Each step.run() gets its own Prisma client
const result = await step.run("step-name", async () => {
  const prisma = createPrisma();  // NOT new PrismaClient()
  try {
    const db = getTenantedClient(prisma, centerId);  // prisma FIRST, centerId SECOND
    // ... do work
    return result;
  } finally {
    await prisma.$disconnect();
  }
});
```
- Register job in `apps/backend/src/modules/inngest/functions.ts`
- Event name: `privacy/data-export.requested`
- Use `step.run()` for each distinct operation (collect user data, collect academic data, generate file, upload)

**Multi-Tenancy:**
- Add `DataExportRequest` to `TENANTED_MODELS` array in `packages/db/src/tenanted-client.ts`
- All queries MUST use `getTenantedClient(prisma, centerId)`
- Data export must only include data within the user's tenant

**Zod Schemas:**
- Define request/response schemas in `packages/types/src/privacy.ts`
- Use `z.infer<>` for TypeScript types
- Schema naming: `DataExportRequestSchema`, `DataSummarySchema`, etc.

### Data Export Scope

The export job must collect user data from these model categories:

| Category | Models | Key Fields |
|----------|--------|------------|
| **Profile** | User, AuthAccount, ParentEmail | email, name, phone, avatar, preferences |
| **Memberships** | CenterMembership, Permission | role, center, permissions |
| **Academic** | ClassStudent, Attendance | class enrollments, attendance records |
| **Assignments** | AssignmentStudent | assigned exercises, due dates |
| **Submissions** | Submission, StudentAnswer | submitted work, answers |
| **AI Feedback** | GradingJob, SubmissionFeedback, AIFeedbackItem | AI grades, feedback, scores |
| **Teacher Feedback** | TeacherComment | teacher comments on submissions |
| **Interventions** | InterventionLog, StudentFlag | intervention emails, flags |
| **Notifications** | Notification, EmailLog | all notifications received |

**Export JSON structure:**
```json
{
  "exportedAt": "ISO-8601",
  "userId": "...",
  "profile": { ... },
  "memberships": [ ... ],
  "academic": { ... },
  "submissions": [ ... ],
  "feedback": [ ... ],
  "notifications": [ ... ]
}
```

### Existing Code to Reuse — DO NOT REINVENT

| What | Where | How to Reuse |
|------|-------|-------------|
| **Privacy page placeholder** | `apps/webapp/src/features/settings/pages/PrivacyPage.tsx` | Replace content, keep file |
| **Settings nav config** | `apps/webapp/src/features/settings/config/settings-nav.ts` | Already has "Privacy" tab at order 4 — NO CHANGES needed |
| **Account deletion flow** | `apps/webapp/src/features/users/profile-page.tsx`, `DeleteAccountModal.tsx` | Link to it from Privacy Center, do NOT duplicate |
| **Account deletion backend** | `apps/backend/src/modules/users/users.service.ts` (requestDeletion/cancelDeletion) | Reference only, do NOT move or duplicate |
| **Inngest job structure** | `apps/backend/src/modules/users/jobs/user-deletion.job.ts` | Follow same pattern for data export job |
| **AI status tracking** | `AIGenerationJob` model + `AIGenerationPanel.tsx` | Reference pattern for export status polling |
| **CSV download pattern** | `GET /api/v1/users/import/template` | Reference for file download response headers |
| **Settings page layout** | `BillingPage.tsx`, `RoomsPage.tsx` | Follow Card-based section layout |
| **Firebase Storage upload** | Avatar upload in `users.routes.ts` | Reference for uploading export file |

### Prisma Model — DataExportRequest

```prisma
model DataExportRequest {
  id          String    @id @default(cuid())
  centerId    String    @map("center_id")
  userId      String    @map("user_id")
  status      String    @default("pending")  // pending | processing | completed | failed | expired
  fileUrl     String?   @map("file_url")
  error       String?
  requestedAt DateTime  @default(now()) @map("requested_at")
  completedAt DateTime? @map("completed_at")
  expiresAt   DateTime? @map("expires_at")

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  center Center @relation(fields: [centerId], references: [id], onDelete: Cascade)

  @@index([centerId])
  @@index([userId])
  @@map("data_export_request")
}
```
- Add `dataExportRequests DataExportRequest[]` relation to both User and Center models
- Run `pnpm --filter=@workspace/db db:push` then `pnpm --filter=db db:generate`

### AI Transparency Indicator Component

```tsx
// Reusable component — place in apps/webapp/src/components/ui/ or features/shared/
// Pattern: Info icon + Tooltip
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";

interface AIProcessingIndicatorProps {
  description: string;  // e.g., "AI processes your submission text to generate feedback"
}
```

**Placement locations:**
- `apps/webapp/src/features/grading/` — near AI feedback display
- `apps/webapp/src/features/exercises/components/AIGenerationPanel.tsx` — near generation trigger button
- `apps/webapp/src/features/dashboard/` or student feedback view — near AI-generated feedback sections

### Encryption-at-Rest — Implementation Approach

Railway Postgres provides encryption-at-rest at the infrastructure level. The implementation should:
1. **NOT implement application-level encryption** — this is handled by the hosting provider
2. Create a simple verification endpoint that confirms the database is hosted on Railway (encrypted infrastructure)
3. Display a static "Encryption Active" badge for owner view
4. Document in the Privacy Center that data is encrypted at rest via infrastructure-level AES-256

### Security Considerations

- Data export endpoint must be rate-limited (max 1 export request per 24 hours per user)
- Export file URLs must be time-limited (7-day expiry)
- Only authenticated users can request their own data export
- Owner-only endpoints: encryption status
- All endpoints must validate tenant isolation via `getTenantedClient`
- Export job must NOT include data from other tenants

### Project Structure Notes

- New module: `apps/backend/src/modules/privacy/` — follows existing module pattern
- New API file: `apps/webapp/src/features/settings/privacy.api.ts` — follows existing API hook pattern
- New types: `packages/types/src/privacy.ts` — Zod schemas for privacy endpoints
- Settings nav: NO changes needed (Privacy tab already configured)
- PrivacyPage.tsx: REPLACE content (do not create new file)

### Previous Story Intelligence (Story 8-1)

Story 8-1 (Methodology Guardian) is `ready-for-dev` but NOT yet implemented. The GoldenSample model does NOT exist in the schema yet. This story (8-2) is independent of 8-1 and can be implemented without it.

Key patterns from 8-1 story spec that apply:
- Route-Controller-Service pattern for new backend modules
- Owner-only access via `requireRole(["OWNER"])` middleware
- Zod type provider for all route validation
- Settings page integration pattern (new tab content)

### Git Intelligence

Recent commits (stories 11-1 through 11-7) show:
- Active bug fix sprint with code review iteration pattern
- E2E test fixes alongside feature work
- Breadcrumb and navigation improvements
- Exercise locking and submission patterns

No direct relevance to privacy features, but confirms:
- Code review process is active — expect review feedback
- E2E tests are being maintained — add E2E consideration for privacy flows

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 8, Story 8.2]
- [Source: _bmad-output/planning-artifacts/architecture.md — NFR5, NFR6, Multi-tenancy]
- [Source: _bmad-output/planning-artifacts/prd.md — Section 7 Domain Compliance, FR36]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Section 10 Privacy by Design, PrivacyCenter component]
- [Source: apps/webapp/src/features/settings/pages/PrivacyPage.tsx — Existing placeholder]
- [Source: apps/webapp/src/features/settings/config/settings-nav.ts — Privacy tab already configured]
- [Source: apps/backend/src/modules/users/users.service.ts — Existing deletion flow]
- [Source: apps/backend/src/modules/users/jobs/user-deletion.job.ts — Inngest job pattern reference]
- [Source: packages/db/prisma/schema.prisma — All 42 models for data export scope]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
