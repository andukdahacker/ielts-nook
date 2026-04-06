# Story 8.1: Methodology Guardian

Status: ready-for-dev

## Story

As a Teaching Center Owner,
I want to train the AI on my center's specific feedback style by uploading Golden Samples,
so that the AI-generated feedback sounds like one of our teachers and maintains our pedagogical identity.

## Acceptance Criteria

1. **AC1: Golden Sample Upload** — Owner can upload 5–10 "Golden Samples," each consisting of Student Work (text) + Teacher Feedback (text), categorized by skill type (WRITING or SPEAKING).
2. **AC2: Few-Shot Prompting Integration** — System uses Few-Shot Prompting by injecting active Golden Samples into AI grading prompts, targeting > 85% style alignment with the uploaded teacher feedback tone and vocabulary.
3. **AC3: Style Adoption** — AI-generated feedback adopts the tone, vocabulary, and pedagogical approach established in the Golden Samples (verified by manual comparison during testing).

## Tasks / Subtasks

- [ ] **Task 1: Database Schema — GoldenSample model** (AC: #1)
  - [ ] 1.1 Add `GoldenSample` model to `packages/db/prisma/schema.prisma` with fields: `id`, `centerId`, `title`, `skillType` (WRITING|SPEAKING), `studentWork` (Text), `teacherFeedback` (Text), `isActive` (Boolean, default true), `order` (Int), `createdAt`, `updatedAt`
  - [ ] 1.2 Add `@@map("golden_sample")`, `@map` on every column, index on `centerId`
  - [ ] 1.3 Add `GoldenSample` to `TENANTED_MODELS` array in `packages/db/src/tenanted-client.ts`
  - [ ] 1.4 Run `pnpm --filter=@workspace/db db:push` then `pnpm --filter=db db:generate`

- [ ] **Task 2: Backend — Golden Sample CRUD API** (AC: #1)
  - [ ] 2.1 Create `apps/backend/src/modules/golden-samples/` module directory
  - [ ] 2.2 Create `golden-samples.service.ts` — Class-based service (matching billing/grading pattern):
    ```typescript
    export class GoldenSamplesService {
      constructor(private prisma: PrismaClient) {}
      // All methods use getTenantedClient(this.prisma, centerId)
    }
    ```
    Methods:
    - `list(centerId)` — Return all samples for center, ordered by `order`
    - `getById(centerId, id)` — Single sample
    - `create(centerId, data)` — Enforce max 10 samples per center per skill type; throw if limit exceeded
    - `update(centerId, id, data)` — Update title, studentWork, teacherFeedback, isActive
    - `delete(centerId, id)` — Hard delete
    - `reorder(centerId, ids[])` — Bulk update order field
    - `getActiveByCenterAndSkill(centerId, skillType)` — Return active samples for AI prompting (used by grading job)
  - [ ] 2.3 Create `golden-samples.controller.ts` — Orchestrate service, format `{ data, message }` responses
  - [ ] 2.4 Create `golden-samples.routes.ts` — Follows billing routes pattern:
    ```typescript
    export async function goldenSamplesRoutes(fastify: FastifyInstance) {
      const api = fastify.withTypeProvider<ZodTypeProvider>();
      api.addHook("preHandler", authMiddleware);
      const service = new GoldenSamplesService(fastify.prisma);
      const controller = new GoldenSamplesController(service);
      // CenterId from JWT: request.jwtPayload!.centerId (NOT from URL params)
    }
    ```
    All endpoints require `preHandler: [requireRole(["OWNER"])]`. Define Zod request/response schemas in `packages/types/` for cross-module reuse.
  - [ ] 2.5 Register routes in `apps/backend/src/app.ts`:
    ```typescript
    import { goldenSamplesRoutes } from "./modules/golden-samples/golden-samples.routes.js";
    await app.register(goldenSamplesRoutes, { prefix: "/api/v1/golden-samples" });
    ```

- [ ] **Task 3: Backend — Few-Shot Prompt Integration** (AC: #2, #3)
  - [ ] 3.1 Modify `apps/backend/src/modules/grading/ai-grading-prompts.ts`:
    - Update `getGradingPromptAndSchema` signature to accept optional `goldenSamples: { studentWork: string; teacherFeedback: string }[]`
    - When samples are provided, append a "STYLE REFERENCE" section to the system prompt BEFORE the student text, formatted as few-shot examples:
      ```
      STYLE REFERENCE — Adopt this feedback style:
      [Example 1]
      Student Work: {sample.studentWork}
      Teacher Feedback: {sample.teacherFeedback}
      [Example 2]
      ...
      Match the tone, vocabulary, and pedagogical approach shown above.
      ```
    - Keep existing prompt structure unchanged when no samples provided
  - [ ] 3.2 Modify `apps/backend/src/modules/grading/jobs/analyze-submission.job.ts`:
    - Add a new Inngest step `load-golden-samples` BEFORE `call-gemini`
    - In that step: use `createPrisma()` (from `../../../plugins/create-prisma.js`) + `getTenantedClient(prisma, centerId)` to query active golden samples for the submission's skill type
    - Pass loaded samples to `getGradingPromptAndSchema`
    - Disconnect Prisma client in finally block (per Inngest job pattern)

- [ ] **Task 4: Frontend — Golden Samples Settings Page** (AC: #1)
  - [ ] 4.1 Add `"ai"` tab to `apps/webapp/src/features/settings/config/settings-nav.ts`: `{ id: "ai", label: "AI Customization", path: "ai", order: 4.5 }`. Note: Settings layout is accessible to OWNER and ADMIN, but this feature is owner-only. Show a "Requires Owner access" message for ADMIN users (check role from `useAuth()`).
  - [ ] 4.2 Create `apps/webapp/src/features/settings/golden-samples.api.ts` — TanStack Query hooks:
    - Query key factory: `goldenSampleKeys = { all: ["golden-samples"], list: () => [...all, "list"] }`
    - `useGoldenSamples(centerId)` — Fetches all samples via `client.GET("/api/v1/golden-samples", ...)`
    - `useCreateGoldenSample()`, `useUpdateGoldenSample()`, `useDeleteGoldenSample()`, `useToggleGoldenSample()` — Mutation hooks with `queryClient.invalidateQueries({ queryKey: goldenSampleKeys.all })` on success
  - [ ] 4.3 Create `apps/webapp/src/features/settings/pages/AICustomizationPage.tsx`:
    - List all golden samples grouped by skill type tabs (Writing / Speaking)
    - Each sample card shows: title, skill type, active/inactive badge, truncated preview of student work + feedback
    - "Add Sample" button (disabled if 10 samples exist for that skill type, with tooltip "Maximum 10 samples per skill type")
    - Toggle active/inactive per sample (Switch component)
    - Edit and Delete actions per sample
    - Display "X/10 samples used" counter per skill type
    - Follow standard page structure: `<div className="space-y-6">` with heading + description + content
  - [ ] 4.4 Create `apps/webapp/src/features/settings/components/GoldenSampleForm.tsx`:
    - Dialog form (using `Dialog` from `@workspace/ui/components/dialog`) with React Hook Form + Zod resolver
    - Fields: Title (text input), Skill Type (select: Writing/Speaking), Student Work (textarea, min 50 chars), Teacher Feedback (textarea, min 50 chars)
    - Side-by-side preview of student work and teacher feedback before saving
    - Used for both create and edit flows. Props: `open`, `onOpenChange`, optional `initialData`
  - [ ] 4.5 Add route in `apps/webapp/src/App.tsx`: `<Route path="ai" element={<AICustomizationPage />} />` inside the settings layout
  - [ ] 4.6 Run `pnpm --filter=webapp sync-schema-dev` after backend routes are registered

- [ ] **Task 5: Backend Tests** (AC: #1, #2, #3)
  - [ ] 5.1 Create `golden-samples.service.test.ts` — Unit tests:
    - CRUD operations (list, create, update, delete, reorder)
    - Enforce max 10 samples per skill type per center
    - `getActiveByCenterAndSkill` returns only active samples
  - [ ] 5.2 Create `golden-samples.routes.integration.test.ts` — Integration tests:
    - All endpoints with auth (owner role required)
    - 403 for non-owner roles
    - Validation errors for missing/invalid fields
  - [ ] 5.3 Update `ai-grading-prompts.test.ts`:
    - Test prompt generation WITH golden samples (verify few-shot section appears)
    - Test prompt generation WITHOUT golden samples (verify no style reference section)
    - Verify prompt structure integrity with varying sample counts (1, 5, 10)
  - [ ] 5.4 Update `analyze-submission.job.test.ts`:
    - Mock golden sample loading step
    - Verify samples are passed to prompt generator
    - Verify job completes correctly when no samples exist

## Dev Notes

### Architecture & Patterns

- **Route-Controller-Service pattern**: Follow existing module structure exactly. See `apps/backend/src/modules/grading/` or `apps/backend/src/modules/exercises/` for reference.
- **Multi-tenancy**: GoldenSample is center-scoped. Add to `TENANTED_MODELS` in `packages/db/src/tenanted-client.ts`. In service layer: `getTenantedClient(this.prisma, centerId)`. In Inngest job steps: `createPrisma()` + `getTenantedClient(prisma, centerId)` per step with `$disconnect()` in finally.
- **Text-only storage**: Golden samples store student work and teacher feedback as TEXT fields in the database. NO file uploads needed for this story — PDF upload UI is deferred to Story 8.5. This simplifies implementation significantly.
- **Zod type provider**: All route schemas must use `fastify-type-provider-zod`. Define shared Zod schemas (request/response) in `packages/types/` for cross-module reuse (see billing module pattern: `BillingOverviewSchema`, etc. imported from `@workspace/types`).
- **Owner-only access**: All golden sample endpoints require `owner` role. Use the existing `requireRole(["OWNER"])` middleware pattern from billing routes (import from `../../middlewares/role.middleware.js`).

### Key File Locations

| Component | Path |
|-----------|------|
| Prisma Schema | `packages/db/prisma/schema.prisma` |
| Tenanted Models | `packages/db/src/tenanted-client.ts` → `TENANTED_MODELS` array |
| Grading Prompts | `apps/backend/src/modules/grading/ai-grading-prompts.ts` |
| Analyze Job | `apps/backend/src/modules/grading/jobs/analyze-submission.job.ts` |
| Inngest Functions Registry | `apps/backend/src/modules/inngest/functions.ts` |
| createPrisma Helper | `apps/backend/src/plugins/create-prisma.ts` |
| Role Middleware | `apps/backend/src/middlewares/role.middleware.ts` |
| App Registration | `apps/backend/src/app.ts` |
| Billing Routes (reference) | `apps/backend/src/modules/billing/billing.routes.ts` |
| Billing API Hooks (reference) | `apps/webapp/src/features/settings/billing.api.ts` |
| API Client | `apps/webapp/src/core/client.ts` |
| Settings Nav Config | `apps/webapp/src/features/settings/config/settings-nav.ts` |
| Settings Routes | `apps/webapp/src/App.tsx` (settings layout children) |
| Frontend Schema | `apps/webapp/src/schema/schema.d.ts` (auto-generated, DO NOT edit) |

### AI Prompting — Current Implementation

- **Provider**: Google Gemini via `@google/genai` SDK
- **Model**: `gemini-2.0-flash` (configurable via `GEMINI_MODEL` env)
- **Temperature**: `0.3` for consistent grading
- **Output**: Structured JSON via `responseMimeType: "application/json"` with Zod schema
- **Current prompt function**: `getGradingPromptAndSchema(skill, studentText, questionPrompt?)` in `ai-grading-prompts.ts`
- **Prompt flow**: System prompt includes IELTS band descriptors + scoring rules + highlight rules + student text → Gemini returns `AIGradingResponse` JSON
- **Key constraint**: Few-shot examples go in the SYSTEM PROMPT, not as separate messages. The `genai.models.generateContent` call uses a single `contents` string, not a messages array.

### Inngest Job Pattern (Critical)

```typescript
import { createPrisma } from "../../../plugins/create-prisma.js";
import { getTenantedClient } from "@workspace/db";

// In each step.run():
const prisma = createPrisma();  // NOT new PrismaClient() — uses PrismaPg adapter
try {
  const db = getTenantedClient(prisma, centerId);  // prisma FIRST, centerId SECOND
  // ... do work
} finally {
  await prisma.$disconnect();
}
```

- Use `createPrisma()` from `plugins/create-prisma.js` (wraps PrismaClient with PrismaPg adapter)
- Each `step.run()` gets its own PrismaClient instance
- Never share PrismaClient across steps
- Always disconnect in finally

### Prisma Model Convention

```prisma
model GoldenSample {
  id              String   @id @default(cuid())
  centerId        String   @map("center_id")
  title           String
  skillType       String   @map("skill_type")   // WRITING | SPEAKING
  studentWork     String   @map("student_work")  @db.Text
  teacherFeedback String   @map("teacher_feedback") @db.Text
  isActive        Boolean  @default(true) @map("is_active")
  order           Int      @default(0)
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  center Center @relation(fields: [centerId], references: [id], onDelete: Cascade)

  @@index([centerId])
  @@index([centerId, skillType])
  @@map("golden_sample")
}
// Also add `goldenSamples GoldenSample[]` to the Center model
```

### Frontend Patterns

- **Settings tabs**: Add entry to `settingsTabs` array in `settings-nav.ts` with `order: 4.5` (between Privacy and Billing). SettingsLayout auto-renders the tab — no layout changes needed.
- **Data fetching**: Use `openapi-fetch` client (from `@/core/client`) + TanStack Query. Types come from auto-generated `schema.d.ts`. Create `golden-samples.api.ts` with query key factory + hooks (see `billing.api.ts` pattern).
- **API call pattern**: `const { data, error } = await client.GET("/api/v1/golden-samples", ...)` → check error → return `data!.data`
- **UI components**: Use Shadcn/UI from `@workspace/ui` (Dialog, Card, Badge, Button, Textarea, Select, Switch)
- **Forms**: React Hook Form + `zodResolver` + `Form`/`FormField`/`FormItem`/`FormLabel`/`FormControl`/`FormMessage` from `@workspace/ui/components/form`
- **Toasts**: Use `toast` from `sonner` for success/error feedback on mutations
- **Icons**: Import from `lucide-react` (Plus, Pencil, Trash2, Loader2, etc.)
- **Auth context**: Use `useAuth()` hook to get `centerId` and user `role`

### Scope Boundaries — What NOT to Build

- **NO PDF upload** — Story 8.5 handles file upload UI. This story uses textarea for student work text.
- **NO style alignment scoring** — The "> 85% style alignment" is a design goal, not a measurable metric to implement. Few-shot prompting is the mechanism.
- **NO audio upload** — Speaking samples use transcribed text, not audio files.
- **NO separate "AI Customization" section** — This is a single settings page/tab. No sub-navigation needed.

### Project Structure Notes

- New module at `apps/backend/src/modules/golden-samples/` follows feature-first organization
- Frontend page at `apps/webapp/src/features/settings/pages/AICustomizationPage.tsx` follows settings pattern
- Co-located tests next to source files (`.test.ts` suffix)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 8.1 — FR32, FR33]
- [Source: _bmad-output/planning-artifacts/prd.md#Section 6 — Innovation & Reliability]
- [Source: project-context.md#Critical Implementation Rules — Multi-Tenancy, Async Workloads]
- [Source: apps/backend/src/modules/grading/ai-grading-prompts.ts — Current prompt construction]
- [Source: apps/backend/src/modules/grading/jobs/analyze-submission.job.ts — Inngest job pattern]
- [Source: apps/webapp/src/features/settings/config/settings-nav.ts — Settings tab config]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
