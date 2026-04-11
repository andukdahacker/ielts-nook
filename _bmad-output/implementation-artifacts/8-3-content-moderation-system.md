# Story 8.3: Content Moderation System (Compliance)

Status: done

## Story

As a Center Admin,
I want the system to flag AI-generated or student-submitted content that violates local regulations,
so that we remain compliant with Vietnamese internet laws (Decree 72/2013/ND-CP).

## Acceptance Criteria

1. **AC1: Prohibited Term Screening** — System screens content for prohibited political/sensitive terms. A configurable term list is maintained at the center level, seeded with a default Vietnamese compliance list.
2. **AC2: Compliance Review Overlay** — Flagged content is locked with a "Compliance Review" overlay preventing normal interaction until resolved.
3. **AC3: Admin Moderation Workspace** — Admins can approve, redact, or delete flagged items in a dedicated compliance review workspace accessible from Settings.

## Tasks / Subtasks

- [x] **Task 1: Database Models** (AC: 1, 2, 3)
  - [x]1.1 Create `ContentModerationFlag` model in Prisma schema
  - [x]1.2 Create `ModerationTermList` model for configurable prohibited terms
  - [x]1.3 Add `ContentModerationFlag` and `ModerationTermList` to TENANTED_MODELS array
  - [x]1.4 Run `pnpm --filter=db db:migrate:dev --name add-content-moderation` then `pnpm --filter=db db:generate`

- [x] **Task 2: Backend Moderation Module** (AC: 1, 2, 3)
  - [x]2.1 Create `apps/backend/src/modules/moderation/` module (service, controller, routes)
  - [x]2.2 Implement `ModerationService.scanContent(text, centerId)` — checks text against center's term list, returns matches
  - [x]2.3 Implement `ModerationService.flagContent(...)` — creates a ContentModerationFlag record and returns it
  - [x]2.4 Implement `ModerationService.getFlags(centerId, filters)` — list flags with pagination, status filter
  - [x]2.5 Implement `ModerationService.resolveFlag(flagId, action, redactedText?)` — approve/redact/delete. Validate: `redactedText` is REQUIRED when action is REDACT
  - [x]2.6 Implement term list CRUD: `getTermList`, `addTerms`, `removeTerms`, `resetToDefaults`
  - [x]2.7 Create default Vietnamese compliance term seed list (political/sensitive terms per Decree 72)
  - [x]2.8 Register routes under `/api/v1/moderation/*`

- [x] **Task 3: Content Scanning Integration Points** (AC: 1, 2)
  - [x]3.1 Hook into exercise publish flow (`exercises.service.ts` publish method) — scan exercise title + passage text + question text on publish; if flagged, block publish and return flag
  - [x]3.2 Hook into AI feedback generation (`analyze-submission.job.ts`) — scan AI-generated feedback text after LLM response; if flagged, mark feedback with compliance hold
  - [x]3.3 Hook into student submission (`submissions.service.ts`) — scan student answer text on submit; if flagged, allow submission but create flag for admin review
  - [x]3.4 Create Inngest job `moderation/scan-existing-content` for one-time batch scan of existing published exercises. Use batch size of 50 exercises per step, load term list once per batch (not per item)

- [x] **Task 4: Zod Schemas & Types** (AC: 1, 2, 3)
  - [x]4.1 Create `packages/types/src/moderation.ts` with all request/response schemas
  - [x]4.2 Define: `ContentModerationFlagSchema`, `ModerationTermSchema`, `ScanResultSchema`, `ResolveFlagSchema`

- [x] **Task 5: Frontend — Compliance Review Overlay Component** (AC: 2)
  - [x]5.1 Create `ComplianceReviewOverlay` component — a semi-transparent overlay with lock icon, flag reason, and "Pending Review" badge
  - [x]5.2 Integrate overlay into exercise detail/preview views when exercise has unresolved flag — modify components in `apps/webapp/src/features/exercises/`
  - [x]5.3 Integrate overlay into grading workbench when AI feedback has unresolved flag — modify components in `apps/webapp/src/features/grading/`
  - [x]5.4 Integrate overlay into student submission view when submission has unresolved flag — modify components in `apps/webapp/src/features/student/`

- [x] **Task 6: Frontend — Admin Moderation Workspace** (AC: 3)
  - [x]6.1 Create `apps/webapp/src/features/settings/pages/ModerationPage.tsx` — dedicated compliance review workspace
  - [x]6.2 Implement flag list view with filters (status: pending/approved/redacted/deleted, content type: exercise/submission/feedback)
  - [x]6.3 Implement flag detail panel showing flagged content with highlighted matched terms
  - [x]6.4 Implement approve action (removes flag, unlocks content)
  - [x]6.5 Implement redact action (replaces flagged text with redacted version, resolves flag)
  - [x]6.6 Implement delete action (removes the flagged content entirely, resolves flag)
  - [x]6.7 Create `ModerationTermsSettings` component for managing the prohibited term list
  - [x]6.8 Add "Compliance" tab to Settings navigation (after Privacy tab)

- [x] **Task 7: Frontend API & Hooks** (AC: 1, 2, 3)
  - [x]7.1 Create `apps/webapp/src/features/settings/moderation.api.ts` with openapi-fetch client calls
  - [x]7.2 Create TanStack Query hooks: `useModerationFlags`, `useResolveFlag`, `useModerationTerms`, `useUpdateTerms`
  - [x]7.3 Run schema sync: `pnpm --filter=webapp sync-schema-dev`

- [x] **Task 8: Testing** (AC: 1, 2, 3)
  - [x]8.1 Unit tests for `ModerationService` — scanContent (match/no-match, case-insensitive, Vietnamese diacritics), flagContent, resolveFlag (approve/redact/delete), term list CRUD
  - [x]8.2 Integration tests for moderation routes — auth (admin/owner only), validation, tenant isolation, RBAC
  - [x]8.3 Integration test: exercise publish blocked when content flagged
  - [x]8.4 Integration test: AI feedback flagged during grading job
  - [x]8.5 Verify all existing backend tests still pass

## Dev Notes

### Architecture Patterns (MUST FOLLOW)

**Backend module structure** — follow the golden-samples module pattern exactly:
```
apps/backend/src/modules/moderation/
├── moderation.service.ts       # Business logic, DB queries
├── moderation.controller.ts    # Orchestrates service, formats responses
├── moderation.routes.ts        # Fastify route definitions, Zod validation
├── moderation.service.test.ts  # Unit tests (co-located)
└── moderation.routes.test.ts   # Integration tests (co-located)
```

**Layered architecture (Rule 6 from project-context.md):**
- Service: DB/external API interaction only, returns raw data
- Controller: Orchestrates services, formats `{ data, message }` response, throws domain errors
- Route: Fastify-specific logic, extracts params/body, calls controller, maps errors to HTTP status

**Multi-tenancy (Rule 1 & Rule 5):**
- Use `getTenantedClient(centerId)` for all queries outside transactions
- Inside `$transaction`: use `tx` directly with explicit `where: { centerId }` on every query
- Add `ContentModerationFlag` and `ModerationTermList` to `TENANTED_MODELS` array in `packages/db/src/tenanted-client.ts`

**Zod schemas:**
- Define all schemas in `packages/types/src/moderation.ts`
- Use `z.infer<>` for TypeScript types
- Use `fastify-type-provider-zod` for route validation
- Never use `any`

### Database Schema Design

```prisma
enum ModerationFlagStatus {
  PENDING
  APPROVED
  REDACTED
  DELETED
}

enum ModerationContentType {
  EXERCISE
  SUBMISSION
  AI_FEEDBACK
}

model ContentModerationFlag {
  id              String                @id @default(cuid())
  centerId        String                @map("center_id")
  contentType     ModerationContentType @map("content_type")
  contentId       String                @map("content_id")    // polymorphic FK to exercise/submission/feedbackItem
  flaggedText     String                @map("flagged_text") @db.Text
  matchedTerms    String[]              @map("matched_terms") // array of matched prohibited terms
  status          ModerationFlagStatus  @default(PENDING)
  resolvedById    String?               @map("resolved_by_id")
  resolvedAt      DateTime?             @map("resolved_at")
  redactedText    String?               @map("redacted_text") @db.Text
  createdAt       DateTime              @default(now()) @map("created_at")
  updatedAt       DateTime              @updatedAt @map("updated_at")

  center          Center                @relation(fields: [centerId], references: [id], onDelete: Cascade)
  resolvedBy      CenterMembership?     @relation(fields: [resolvedById], references: [id])

  @@index([centerId, status])
  @@index([centerId, contentType])
  @@index([contentId])
  @@map("content_moderation_flag")
}

model ModerationTermList {
  id        String   @id @default(cuid())
  centerId  String   @unique @map("center_id")  // one list per center
  terms     String[] // array of prohibited terms
  isCustom  Boolean  @default(false) @map("is_custom") // true if center customized from defaults
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  updatedBy String?  @map("updated_by")

  center    Center   @relation(fields: [centerId], references: [id], onDelete: Cascade)

  @@map("moderation_term_list")
}
```

**Key design decisions:**
- `contentId` is polymorphic (references Exercise.id, Submission.id, or SubmissionFeedback.id depending on `contentType`) — no FK constraint, validated at service layer
- `matchedTerms` is a Postgres text array for efficient storage of which terms triggered the flag
- `ModerationTermList` is one-per-center (unique on centerId) — lazy-created with defaults on first scan
- `terms` stored as Postgres text array for efficient `ANY()` matching
- `status` enum captures the resolution action (APPROVED/REDACTED/DELETED) — no separate `resolvedAction` field needed
- `@unique` on `ModerationTermList.centerId` implicitly creates an index — do NOT add a redundant `@@index`
- **Term list limits:** Max 500 terms per center, max 100 characters per term — enforce in service layer
- **centerId** comes from the authenticated request context (`request.user.centerId`) — same pattern as golden-samples and all other modules. Never pass centerId as a route param or query param.

### API Endpoints

| Method | Path | RBAC | Description |
|--------|------|------|-------------|
| GET | `/api/v1/moderation/flags` | ADMIN, OWNER | List flags (paginated, filterable by status/contentType) |
| GET | `/api/v1/moderation/flags/:id` | ADMIN, OWNER | Get flag detail with content context |
| PATCH | `/api/v1/moderation/flags/:id/resolve` | ADMIN, OWNER | Resolve flag (approve/redact/delete) |
| GET | `/api/v1/moderation/terms` | ADMIN, OWNER | Get center's term list |
| PUT | `/api/v1/moderation/terms` | OWNER | Replace center's term list |
| POST | `/api/v1/moderation/terms/reset` | OWNER | Reset to default term list |
| POST | `/api/v1/moderation/scan` | ADMIN, OWNER | Manual scan trigger (for testing/ad-hoc) |

### Content Scanning Strategy

**Scan algorithm:**
1. Load center's term list (lazy-create from defaults if not exists)
2. Normalize input text: lowercase, normalize Vietnamese diacritics (NFC normalization)
3. For each term in list, check case-insensitive substring match against normalized text
4. Return array of matched terms (empty = clean)

**Vietnamese text considerations:**
- Use `String.normalize('NFC')` for consistent Unicode normalization
- Case-insensitive matching via `.toLowerCase()` — Vietnamese diacritics preserved
- Match on word boundaries where possible to reduce false positives (use `\b` regex with Unicode flag)
- Terms should be stored in normalized form

**Integration hook patterns:**

*Exercise publish (synchronous, blocking):*
```typescript
// In exercises.service.ts publish() method
const scanResult = await moderationService.scanContent(fullExerciseText, centerId);
if (scanResult.matches.length > 0) {
  await moderationService.flagContent({
    centerId, contentType: 'EXERCISE', contentId: exercise.id,
    flaggedText: fullExerciseText, matchedTerms: scanResult.matches
  });
  throw AppError.conflict('Content flagged for compliance review. Publishing blocked.');
}
```

*AI feedback (async, non-blocking):*
```typescript
// In analyze-submission.job.ts after LLM response
const scanResult = await moderationService.scanContent(aiResponseText, centerId);
if (scanResult.matches.length > 0) {
  await moderationService.flagContent({
    centerId, contentType: 'AI_FEEDBACK', contentId: submissionFeedback.id,
    flaggedText: aiResponseText, matchedTerms: scanResult.matches
  });
  // Do NOT throw — feedback is still saved but flagged for review
}
```

*Student submission (async, non-blocking):*
```typescript
// In submissions.service.ts on submit
const answerTexts = answers.map(a => a.text).filter(Boolean).join(' ');
const scanResult = await moderationService.scanContent(answerTexts, centerId);
if (scanResult.matches.length > 0) {
  await moderationService.flagContent({
    centerId, contentType: 'SUBMISSION', contentId: submission.id,
    flaggedText: answerTexts, matchedTerms: scanResult.matches
  });
  // Allow submission — flag for admin review only
}
```

### Frontend Implementation

**Compliance Review Overlay (`ComplianceReviewOverlay.tsx`):**
- Reusable component that wraps any content container
- Props: `flagId`, `status`, `matchedTerms`, `contentType`
- Shows semi-transparent overlay with: lock icon, "Compliance Review Required" text, matched term count
- Only renders when flag status is `PENDING`
- Admin/Owner sees "Review" button linking to moderation workspace

**Moderation Workspace (`ModerationPage.tsx`):**
- Location: `apps/webapp/src/features/settings/pages/ModerationPage.tsx`
- Two-panel layout: flag list (left) + detail/action panel (right)
- Filter bar: status dropdown (Pending/Approved/Redacted/Deleted), content type filter
- Flag card shows: content type icon, excerpt, matched terms as badges, timestamp
- Detail panel shows: full flagged text with highlighted terms, source link, action buttons
- Actions: Approve (green), Redact (yellow, opens inline editor), Delete (red, with confirmation)

**Settings Navigation:**
- Add "Compliance" tab to settings sidebar, after Privacy tab
- Visible to ADMIN and OWNER roles only
- Route: `/settings/compliance`

### RBAC Matrix

| Action | Owner | Admin | Teacher | Student |
|--------|-------|-------|---------|---------|
| View moderation flags | Yes | Yes | No | No |
| Resolve flags (approve/redact/delete) | Yes | Yes | No | No |
| Manage term list | Yes | No | No | No |
| Reset terms to defaults | Yes | No | No | No |

### Existing Code to Reuse

| Pattern | Location | Reuse For |
|---------|----------|-----------|
| Module structure | `apps/backend/src/modules/golden-samples/` | Service/controller/routes pattern |
| RBAC middleware | `requireRole(["ADMIN", "OWNER"])` from auth module | Route-level access control |
| Pagination pattern | Any list endpoint (exercises, assignments) | Flag list pagination |
| Settings page layout | `apps/webapp/src/features/settings/` | ModerationPage layout |
| Settings nav tabs | `apps/webapp/src/features/settings/` | Adding Compliance tab |
| Badge component | `@workspace/ui` shadcn Badge | Matched term badges |
| Dialog/AlertDialog | `@workspace/ui` shadcn components | Delete confirmation |
| TanStack Query hooks | `apps/webapp/src/features/settings/` (billing, privacy patterns) | API hooks pattern |

### Previous Story Intelligence (Story 8-1 & 8-2)

**From Story 8-1 (Methodology Guardian — done):**
- GoldenSample model successfully added to Prisma with TENANTED_MODELS registration
- Settings page pattern established at `apps/webapp/src/features/settings/pages/AICustomizationPage.tsx`
- Route-level response schemas should use local `z` import to avoid Zod instance mismatch in tests
- 3 pre-existing test failures in grading route files with `isFluentSchema` error (ignore — confirmed on clean branch)
- All 1071 backend tests pass as of 8-1 completion

**From Story 8-2 (Data Sovereignty — ready-for-dev, not yet implemented):**
- Privacy page at `apps/webapp/src/features/settings/pages/PrivacyPage.tsx` exists as placeholder
- Settings nav already has tabs configured — follow same pattern to add Compliance tab
- Inngest job pattern documented: `new PrismaClient()` per `step.run()`, `getTenantedClient()`, `$disconnect()` in finally

### Out of Scope (Future Enhancement)

- **Admin notification on flag creation** — Exercise publish blocks are surfaced immediately to the teacher. Submission/AI flags are silent. A follow-up story could add Inngest-based email or in-app notifications to admins when new flags are created.
- **Denormalized `hasPendingFlag` field** — For list views, consider adding a boolean to Exercise/Submission models to avoid N+1 flag queries. Defer unless performance becomes an issue.

### Default Prohibited Terms Seed

The default Vietnamese compliance term list should include categories per Decree 72/2013/ND-CP:
- Political terms opposing the Vietnamese state/government
- Terms inciting violence or hatred
- Terms related to prohibited organizations
- Obscene/offensive language

**Implementation note:** Store as a TypeScript constant array in `moderation.service.ts` (not in DB migration). The service lazy-creates the center's `ModerationTermList` from this default on first `scanContent` call. Center owners can then customize via the UI.

### Project Structure Notes

**New files:**
- `apps/backend/src/modules/moderation/moderation.service.ts`
- `apps/backend/src/modules/moderation/moderation.controller.ts`
- `apps/backend/src/modules/moderation/moderation.routes.ts`
- `apps/backend/src/modules/moderation/moderation.service.test.ts`
- `apps/backend/src/modules/moderation/moderation.routes.test.ts`
- `packages/types/src/moderation.ts`
- `apps/webapp/src/features/settings/pages/ModerationPage.tsx`
- `apps/webapp/src/features/settings/moderation.api.ts`
- `apps/webapp/src/features/settings/hooks/use-moderation.ts`
- `apps/webapp/src/components/ComplianceReviewOverlay.tsx`

**Modified files:**
- `packages/db/prisma/schema.prisma` — add models and enums
- `packages/db/src/tenanted-client.ts` — add to TENANTED_MODELS
- `apps/backend/src/modules/exercises/exercises.service.ts` — add scan hook on publish
- `apps/backend/src/modules/grading/jobs/analyze-submission.job.ts` — add scan hook after AI response
- `apps/backend/src/modules/submissions/submissions.service.ts` — add scan hook on submit
- `apps/backend/src/app.ts` — register moderation routes
- `apps/webapp/src/features/settings/` — add Compliance nav tab
- `apps/webapp/src/schema/schema.d.ts` — regenerated after schema sync

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 8, Story 8.3]
- [Source: _bmad-output/planning-artifacts/prd.md — FR36, NFR5, Domain Compliance section]
- [Source: _bmad-output/planning-artifacts/architecture.md — Security, RBAC, Multi-Tenancy, Testing sections]
- [Source: project-context.md — Rules 1, 5, 6; Testing; Database workflow]
- [Source: _bmad-output/implementation-artifacts/8-1-methodology-guardian.md — Dev notes, learnings]
- [Source: _bmad-output/implementation-artifacts/8-2-data-sovereignty-privacy-center.md — Settings nav, Inngest patterns]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References
- Fixed exercises.service.crud.test.ts: added moderationTermList/contentModerationFlag mocks to mockDb
- resolvedById FK points to CenterMembership.id, needed resolveMembershipId helper in routes
- Exercise model has passageContent (not passage on QuestionSection)
- DB not available locally — migration SQL created manually, Prisma client generated

### Completion Notes List
- Task 1: ContentModerationFlag + ModerationTermList models, enums, migration, TENANTED_MODELS
- Task 2: Full moderation module (service/controller/routes) with scan, flag, resolve, term CRUD
- Task 3: Exercise publish hook (blocking), AI feedback hook (Inngest step), student submission hook (non-blocking), batch scan job
- Task 4: Zod schemas in packages/types/src/moderation.ts with all request/response types
- Task 5: ComplianceReviewOverlay component + useContentFlag hook
- Task 6: ModerationPage with flag list/detail, approve/redact/delete, term manager, Compliance settings tab
- Task 7: moderation.api.ts with TanStack Query hooks (schema sync pending backend run)
- Task 8: 30+ unit tests (ModerationService) + 16 integration tests (routes, RBAC, tenant isolation)

### File List

**New files:**
- packages/db/prisma/migrations/20260411120000_add_content_moderation/migration.sql
- packages/types/src/moderation.ts
- apps/backend/src/modules/moderation/moderation.service.ts
- apps/backend/src/modules/moderation/moderation.controller.ts
- apps/backend/src/modules/moderation/moderation.routes.ts
- apps/backend/src/modules/moderation/moderation.service.test.ts
- apps/backend/src/modules/moderation/moderation.routes.integration.test.ts
- apps/backend/src/modules/moderation/jobs/scan-existing-content.job.ts
- apps/webapp/src/components/ComplianceReviewOverlay.tsx
- apps/webapp/src/features/settings/pages/ModerationPage.tsx
- apps/webapp/src/features/settings/moderation.api.ts
- apps/webapp/src/features/settings/hooks/use-content-flag.ts

**Modified files:**
- packages/db/prisma/schema.prisma (added enums + models + Center/CenterMembership relations)
- packages/db/src/tenanted-client.ts (added ContentModerationFlag, ModerationTermList to TENANTED_MODELS)
- packages/types/src/index.ts (export moderation types)
- apps/backend/src/app.ts (register moderationRoutes)
- apps/backend/src/modules/inngest/functions.ts (register scanExistingContentJob)
- apps/backend/src/modules/exercises/exercises.service.ts (moderation scan on publish)
- apps/backend/src/modules/grading/jobs/analyze-submission.job.ts (moderation scan on AI feedback)
- apps/backend/src/modules/submissions/submissions.service.ts (moderation scan on submit)
- apps/backend/src/modules/exercises/exercises.service.crud.test.ts (added moderation mocks)
- apps/webapp/src/App.tsx (ModerationPage route)
- apps/webapp/src/features/settings/config/settings-nav.ts (Compliance tab)

### Change Log
- 2026-04-11: Story 8-3 implementation complete. Content moderation system with prohibited term screening, compliance overlay, admin workspace, and integration hooks.
- 2026-04-11: Code review fixes applied (20 findings). Key fixes: reverted unscoped TENANTED_MODELS, fixed Vietnamese \b word boundary, atomic resolveFlag, resolve actions now modify underlying content, batch scan unpublishes flagged exercises, AI feedback compliance hold, contentId filter on flags API, settings nav role gating, regex caching, flaggedText truncation, dedup on publish, error logging. All 1127 backend tests pass.
