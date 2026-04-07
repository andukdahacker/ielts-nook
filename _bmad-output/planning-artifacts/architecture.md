---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/product-brief-classlite-2026-01-16.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/prd-validation-report.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/implementation-artifacts/8-1-methodology-guardian.md
  - docs/data-models.md
workflowType: "architecture"
project_name: "classlite"
user_name: "Ducdo"
date: "2026-01-18"
lastStep: 8
status: "complete"
completedAt: "2026-01-18"
addendum:
  - date: "2026-04-06"
    scope: "Knowledge Hub + Course Redesign + Session Hub (Epics 8.5, 18, 19)"
    newModels: 10
    phases: 3
    reviewMethod: "Party Mode (Winston, John, Amelia, Sally)"
  - date: "2026-04-06"
    scope: "Session & Schedule Redesign (Epic 14)"
    schemaChanges: "ClassSchedule +3 fields, ClassSession +3 fields"
    newEndpoints: 1
    modifiedEndpoints: 3
    reviewMethod: "Party Mode (Winston, John, Quinn, Amelia)"
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
The system centers around three distinct user personas with specialized workflows:

1.  **Administration (Teaching Owner):** Requires tenant management, user provisioning, and high-level dashboarding ("Traffic Light" health reports).
2.  **Pedagogy (Expert Teacher):** A complex "Grading Workbench" for high-velocity feedback (Split-screen, AI-assisted) and an "Exercise Builder" (Manual + AI generation).
3.  **Learning (Student):** A mobile-first, robust submission interface that functions reliably across unstable networks.

**Non-Functional Requirements:**

- **Performance:** "Perceived Instant" (< 500ms) loading for grading next-items is a critical UX promise.
- **Reliability:** "Offline-Proof" submissions are mandatory (Zero data loss).
- **Security:** Strict logical isolation between Centers (Tenants) in a shared database.
- **Accessibility:** WCAG 2.1 AA compliance and Mobile-First design for student flows.

**Scale & Complexity:**

- **Primary domain:** B2B SaaS EdTech (Brownfield Monorepo).
- **Complexity level:** Medium-High.
- **Estimated architectural components:** ~5-7 Core Domains (Auth, Tenant, Logistics, Pedagogy, Grading/AI, Student, Notification).

### Technical Constraints & Dependencies

- **Existing Stack:** Monorepo (Turbo), Fastify (Backend), React (Webapp), Astro (Website), Prisma (ORM), shadcn/ui.
- **AI Integration:** Dependency on external LLM APIs (implying latency management strategies).
- **External Services:** Polar.sh for subscription billing (Phase 1.5). Email (transactional notifications).
- **Browser Storage:** Heavy reliance on LocalStorage/IndexedDB for offline capabilities.

### Cross-Cutting Concerns Identified

1.  **Multi-Tenancy Strategy:** Consistent `center_id` injection and filtering across all queries/mutations.
2.  **Offline Synchronization:** A unified pattern for queuing, retrying, and syncing offline actions.
3.  **AI Orchestration:** Managing prompts, context, and response parsing consistently across features.
4.  **Role-Based Access Control (RBAC):** Granular permission checks (Owner vs Teacher vs Student) at the route/service level.
5.  **Data Freshness Strategy:** Handling real-time vs eventual consistency for "Traffic Light" dashboards.

## Starter Template Evaluation

### Primary Technology Domain

Full-Stack Monorepo (TypeScript/Node.js) based on project requirements analysis

### Starter Options Considered

Since this is a **Brownfield Project** with an existing `pnpm` + `Turbo` monorepo structure, standard "create-new-app" starters are less relevant. Instead, the focus is on validating the existing scaffold against industry-standard TurboRepo patterns.

**1. Vercel TurboRepo Examples (Official)**

- **Status:** The "Gold Standard" for TurboRepo configuration.
- **Key Pattern:** Uses `apps/*` for deployables and `packages/*` for shared config.
- **Alignment:** The current project structure (`apps/backend`, `apps/webapp`, `apps/website`) perfectly aligns with this pattern.

**2. Custom Fastify-React-Turbo Scaffold (Current Project State)**

- **Status:** Custom implementation.
- **Key Decisions:**
  - **Backend:** Fastify (High performance) over Express.
  - **Frontend:** Vite-based React (Modern, fast HMR).
  - **Website:** Astro (SEO-optimized).
  - **Shared:** `ui` (shadcn), `types`, `eslint`.
- **Verdict:** This is a highly robust, modern stack that exceeds the quality of most generic "kitchen sink" starters.

### Selected Starter: Custom Brownfield Scaffold

**Rationale for Selection:**
The existing project structure (`GEMINI.md`) already implements a sophisticated "Best of Breed" architecture that outperforms generic starters.

- **Performance:** Fastify + Astro + Vite is a top-tier performance combination.
- **Separation of Concerns:** Distinct apps for `webapp` (App) vs `website` (Marketing) is a mature architectural decision often missed by simple starters.
- **Type Safety:** Shared `packages/types` ensures end-to-end type safety between Backend and Frontend.

**Initialization Command:**

```bash
# Verify the existing state aligns with the plan
pnpm install && pnpm build
```

**Architectural Decisions Provided by Scaffold:**

**Language & Runtime:**

- **TypeScript:** Strict mode enabled across the monorepo.
- **Runtime:** Node.js (LTS) for Backend, Browser for Frontend.

**Styling Solution:**

- **Tailwind CSS:** Configured via shared `packages/ui` config.
- **Shadcn/UI:** Component library established in `packages/ui`.

**Build Tooling:**

- **Turbo:** Orchestrates the build pipeline (caching, parallel execution).
- **Vite:** Bundler for React.
- **Astro:** Bundler for Website.
- **tsc:** Compiler for Backend.

**Testing Framework:**

- **Strategy:** Vitest + Playwright.
- **Scope:**
  - **E2E:** `apps/webapp` (Playwright).
  - **Unit:** `packages/utils`, `apps/backend` Services (Vitest).
  - **Exemption:** `packages/ui` (Standard Shadcn components are exempt from unit testing; custom extensions must be tested).

**Code Organization:**

- `apps/`: Deployable units.
- `packages/`: Shared libraries (`ui`, `config`, `types`, `utils`).
- `docker/`: (Implicit) Containerization for deployment.

**Development Experience:**

- **Unified Dev Command:** `pnpm dev` starts all services in parallel.
- **Shared Linting:** `@workspace/eslint-config` ensures consistency.

**Note:** The immediate next step is to formalize the **Testing Strategy** (Vitest/Playwright) which is currently missing from the scaffold.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**

- **Multi-Tenancy:** Logical Isolation via Prisma Client Extensions
- **Auth:** Firebase Auth (with Custom Claims for B2B)
- **Offline Sync:** TanStack Query v5 + `persistQueryClient` (idb-keyval)
- **AI Orchestration:** Inngest (Serverless Durable Execution)
- **Infrastructure:** Railway (Docker/Node.js Monorepo Support)

**Important Decisions (Shape Architecture):**

- **Testing:** Vitest (Unit) + Playwright (E2E)
- **UI Library:** Shadcn (Radix primitives)
- **State Management:** React Query (Server State) + React Context (Client State)

### Data Architecture

- **Database:** Postgres (via Railway)
- **Multi-Tenancy:**
  - **Strategy:** Logical Isolation (Discriminator Column).
  - **Implementation:** All models have `center_id`. A `TenantedClient` Prisma extension automatically injects `where: { center_id }` into queries.
  - **Security:** RLS is _not_ used at the DB level; application-level enforcement via the Prisma extension is deemed sufficient for "Lite" SaaS speed.
- **Offline Strategy:**
  - **Reads:** TanStack Query `gcTime: Infinity` caches data in `IndexedDB`.
  - **Writes:** `mutationCache` queues offline mutations. Custom `onOnline` listener triggers `resumePausedMutations()`.

### Authentication & Security

- **Provider:** Firebase Auth.
- **B2B Logic:**
  - **Custom Claims:** `auth.token.claims.center_id` and `auth.token.claims.role` are injected via a backend trigger on login.
  - **Frontend:** `useAuth()` hook decodes the ID token to route the user (e.g., if `role === 'teacher'`, go to `/workbench`).
- **RBAC:**
  - **Middleware:** Fastify `preHandler` checks `request.user.role`.

### API & Communication Patterns

- **Protocol:** REST (Fastify).
- **Background Jobs:** Inngest.
  - **Pattern:** API accepts request -> `inngest.send()` -> Inngest Cloud -> Call `POST /api/inngest` -> Execute Logic.
  - **Why:** Avoids browser timeouts for AI grading (30s+).

### Infrastructure & Deployment

- **Host:** Railway.
- **Structure:**
  - `apps/backend`: Node.js Service (Fastify).
  - `apps/webapp`: Static Site (React/Vite) served via Nginx or Railway Static.
  - `apps/website`: Static Site (Astro).
- **CI/CD:** Railway auto-deploys on `git push`.

### Decision Impact Analysis

**Implementation Sequence:**

1.  **Foundation:** Setup Railway + Postgres + Firebase Auth.
2.  **Backend Core:** Implement `TenantedClient` Prisma Extension.
3.  **Frontend Core:** Setup TanStack Query with `persistQueryClient`.
4.  **Feature:** Build "Grading Workbench" using Inngest for AI calls.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**
4 areas where AI agents could make different choices (Naming, Architecture, Error Handling, Validation).

### Naming Patterns

**Database Naming Conventions:**

- **Tables:** `PascalCase` (Prisma default). E.g., `User`, `CourseEnrollment`.
- **Columns:** `camelCase` in Prisma schema, mapped to `snake_case` in database.
  ```prisma
  model User {
    firstName String @map("first_name")
  }
  ```

**API Naming Conventions:**

- **Endpoints:** `kebab-case`, plural nouns. `GET /api/v1/grading-jobs`.
- **Query Params:** `snake_case`. `?center_id=123`.

**Code Naming Conventions:**

- **React Components:** `PascalCase`. `GradingWorkbench.tsx`.
- **Utilities:** `kebab-case`. `date-utils.ts`.
- **Zod Schemas:** `PascalCase` with `Schema` suffix. `UserSchema`, `CreateJobSchema`.

### Structure Patterns

**Project Organization:**

- **Backend:** Controller-Service-Repository pattern.
  - `apps/backend/src/modules/{feature}/`
- **Frontend:** Feature-based structure.
  - `apps/webapp/src/features/{feature}/components`
  - `apps/webapp/src/features/{feature}/api`

### Format Patterns

**API Response Formats:**

- **Standard Wrapper:**
  ```ts
  {
    data: T | null;
    error: { code: string; message: string; details?: any } | null;
  }
  ```

**Data Exchange Formats:**

- **Date/Time:** ISO 8601 Strings (`2023-01-01T12:00:00Z`).
- **Money:** Integers (Cents).

### Validation Patterns

**Library:** **Zod** (Global Standard).

- **Backend:** Use `fastify-type-provider-zod`.
- **Frontend:** Use `react-hook-form` + `@hookform/resolvers/zod`.
- **Shared:** Zod schemas in `packages/types`.

### Enforcement Guidelines

**All AI Agents MUST:**

- Use `z.infer<>` to generate TypeScript types from Zod schemas.
- Never use `any`; use `z.unknown()` or `z.any()` explicitly if needed.
- Place shared schemas in `packages/types` to avoid duplication.

## Project Structure & Boundaries

### Complete Project Directory Structure

```
classlite/
├── apps/
│   ├── backend/                # Fastify API (Stateful)
│   │   ├── src/
│   │   │   ├── modules/        # Feature Modules
│   │   │   │   ├── auth/       # Firebase + Custom Claims
│   │   │   │   ├── grading/    # Grading Workbench Logic
│   │   │   │   │   ├── jobs/   # Co-located Inngest Jobs
│   │   │   │   ├── tenants/    # Center Management
│   │   │   │   └── inngest/    # Inngest Entry & Shared Ops
│   │   │   ├── plugins/        # Fastify Plugins (Cors, Swagger)
│   │   │   └── app.ts          # App Entry
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── webapp/                 # React SPA (Vite)
│   │   ├── src/
│   │   │   ├── features/       # Feature-First Architecture
│   │   │   │   ├── auth/
│   │   │   │   ├── grading/    # The Workbench UI
│   │   │   │   └── student/    # Mobile-First Student View
│   │   │   ├── components/ui/  # Shared Shadcn Components
│   │   │   ├── lib/
│   │   │   │   └── sync/       # Dedicated Offline Sync Logic
│   │   │   │       ├── persister.ts
│   │   │   │       └── queue.ts
│   │   │   └── routeTree.gen.ts
│   │   ├── package.json
│   │   └── vite.config.ts
│   ├── website/                # Astro Marketing Site
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   └── layouts/
│   │   └── astro.config.mjs
│   └── e2e/                    # Dedicated E2E Workspace
│       ├── tests/
│       │   ├── auth.spec.ts
│       │   └── grading.spec.ts
│       └── playwright.config.ts
├── packages/
│   ├── db/                     # Prisma Schema & Client
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── src/                # TenantedClient Extension
│   ├── types/                  # Zod Schemas & TS Types
│   │   └── src/
│   ├── ui/                     # Shared Shadcn UI Lib
│   └── config/                 # Shared Eslint/TSConfig
├── docker/                     # Dockerfiles for Railway
├── package.json                # Root (Turbo)
├── railway.json                # Deployment Config
└── turbo.json                  # Pipeline Config
```

### Architectural Boundaries

**API Boundaries:**

- **REST:** All communication between `apps/webapp` and `apps/backend` happens via `/api/v1/*`.
- **Types:** Request/Response bodies are strictly typed via Zod schemas imported from `@workspace/types`.

**Component Boundaries:**

- **Frontend:** `apps/webapp` must NOT import directly from `apps/backend`.
- **Database:** `apps/backend` must NOT use `new PrismaClient()` directly; it must use `getTenantedClient(centerId)` from `@workspace/db`.

**Service Boundaries:**

- **Background Jobs:** Long-running tasks (grading) must offload to Inngest via `inngest.send()`, never run in the main thread.

**Data Boundaries:**

- **Multi-Tenancy:** The "Tenant Boundary" is enforced at the ORM level. Code should rarely manually add `where: { centerId }`.

### Requirements to Structure Mapping

**Feature/Epic Mapping:**

- **Offline Sync:** `apps/webapp/src/lib/sync/`
- **Grading AI:** `apps/backend/src/modules/grading/jobs/`
- **Center Management:** `apps/backend/src/modules/tenants/`

**Cross-Cutting Concerns:**

- **Authentication:** `apps/backend/src/modules/auth/` (Backend) + `apps/webapp/src/features/auth/` (Frontend).

### Integration Points

**Internal Communication:**

- **Frontend -> Backend:** `fetch` (via TanStack Query).
- **Backend -> AI:** `inngest-node` SDK.

**External Integrations:**

- **Firebase Auth:** Client-side SDK (Frontend) + Admin SDK (Backend).
- **Polar.sh:** `apps/backend/src/services/billing.service.ts` (Phase 1.5).

### File Organization Patterns

**Source Organization:**

- **Co-location:** Tests (`.test.ts`) live next to the file they test (`.ts`).
- **Feature Folders:** All files related to "Grading" (Components, Hooks, Utils) live in `features/grading`.

**Test Organization:**

- **Unit:** Co-located in `src/`.
- **E2E:** Isolated in `apps/e2e/`.

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**

- **Stack:** Fastify + React + Zod + Prisma is a fully compatible, type-safe stack.
- **Tenancy:** The Prisma Extension pattern integrates seamlessly with Fastify Request Context for per-request isolation.
- **Sync:** TanStack Query `persistQueryClient` is compatible with the `idb-keyval` storage choice.

**Pattern Consistency:**

- **Types:** Zod is consistently used for API validation (Fastify), Frontend Forms (Hook Form), and Shared Types (`packages/types`).
- **Structure:** "Feature-First" organization is applied consistently to both Backend Modules and Frontend Features.

**Structure Alignment:**

- The structure explicitly isolates `apps/e2e` and `lib/sync`, preventing "God Files" and dependency loops.

### Requirements Coverage Validation ✅

**Epic/Feature Coverage:**

- **Admin/Tenancy:** Covered by `packages/db` Extensions + `modules/tenants`.
- **Grading Workbench:** Covered by `modules/grading` (API) + `jobs` (AI) + `features/grading` (UI).
- **Student Offline:** Covered by `lib/sync` + TanStack Query Persistence.

**Functional Requirements Coverage:**

- All core personas (Admin, Teacher, Student) have dedicated architectural homes.

**Non-Functional Requirements Coverage:**

- **Performance:** Supported by Optimistic UI (Frontend) + Background Workers (Inngest).
- **Reliability:** Supported by Local-First Architecture (IndexedDB).
- **Security:** Supported by Tenanted Client (Logical Isolation).

### Implementation Readiness Validation ✅

**Decision Completeness:**

- Critical decisions (Auth, DB, Queue, Host) are locked.
- Versions are implied (Latest Stable).

**Structure Completeness:**

- Full directory tree is defined.
- Key files (Entry points, Configs) are identified.

**Pattern Completeness:**

- Naming, Formatting, and Error Handling patterns are documented.

### Gap Analysis Results

**Minor Gaps:**

- **Testing Utils:** Specific utilities for mocking IndexedDB in Unit Tests are not explicitly defined. This can be addressed during the implementation of `lib/sync`.

### Validation Issues Addressed

- **Structure:** Moved Offline Sync logic to dedicated `lib/sync/` folder.
- **Structure:** Co-located Background Jobs with their Feature Modules.
- **Testing:** Moved E2E tests to dedicated `apps/e2e` workspace.

### Architecture Completeness Checklist

**✅ Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**✅ Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**✅ Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**

- **Type Safety:** End-to-End Zod integration.
- **Scalability:** Inngest for async workloads prevents bottlenecks.
- **Maintainability:** Strong "Feature-First" and "Co-location" patterns.

**Areas for Future Enhancement:**

- **Real-time:** We might need to switch from Polling to WebSockets/SSE for "Traffic Light" dashboards if scale increases significantly.

### Implementation Handoff

**AI Agent Guidelines:**

- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions

**First Implementation Priority:**
Initialize the Monorepo structure and `packages/types` with the first Zod schemas.

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED ✅
**Total Steps Completed:** 8
**Date Completed:** 2026-01-18
**Document Location:** \_bmad-output/planning-artifacts/architecture.md

### Final Architecture Deliverables

**📋 Complete Architecture Document**

- All architectural decisions documented with specific versions
- Implementation patterns ensuring AI agent consistency
- Complete project structure with all files and directories
- Requirements to architecture mapping
- Validation confirming coherence and completeness

**🏗️ Implementation Ready Foundation**

- 7 architectural decisions made
- 4 implementation patterns defined
- 7 architectural components specified
- 33 requirements fully supported

**📚 AI Agent Implementation Guide**

- Technology stack with verified versions
- Consistency rules that prevent implementation conflicts
- Project structure with clear boundaries
- Integration patterns and communication standards

### Implementation Handoff

**For AI Agents:**
This architecture document is your complete guide for implementing classlite. Follow all decisions, patterns, and structures exactly as documented.

**First Implementation Priority:**
Initialize the Monorepo structure and `packages/types` with the first Zod schemas.

**Development Sequence:**

1. Initialize project using documented starter template
2. Set up development environment per architecture
3. Implement core architectural foundations
4. Build features following established patterns
5. Maintain consistency with documented rules

### Quality Assurance Checklist

**✅ Architecture Coherence**

- [x] All decisions work together without conflicts
- [x] Technology choices are compatible
- [x] Patterns support the architectural decisions
- [x] Structure aligns with all choices

**✅ Requirements Coverage**

- [x] All functional requirements are supported
- [x] All non-functional requirements are addressed
- [x] Cross-cutting concerns are handled
- [x] Integration points are defined

**✅ Implementation Readiness**

- [x] Decisions are specific and actionable
- [x] Patterns prevent agent conflicts
- [x] Structure is complete and unambiguous
- [x] Examples are provided for clarity

### Project Success Factors

**🎯 Clear Decision Framework**
Every technology choice was made collaboratively with clear rationale, ensuring all stakeholders understand the architectural direction.

**🔧 Consistency Guarantee**
Implementation patterns and rules ensure that multiple AI agents will produce compatible, consistent code that works together seamlessly.

**📋 Complete Coverage**
All project requirements are architecturally supported, with clear mapping from business needs to technical implementation.

**🏗️ Solid Foundation**
The chosen starter template and architectural patterns provide a production-ready foundation following current best practices.

---

## Knowledge Hub, Course Redesign & Session Hub (Epics 8.5, 18, 19)

_Addendum date: 2026-04-06. Extends the original architecture to cover document management, course-as-template, and session-as-teaching-hub._

### Design Principles

1. **Knowledge Hub is the single source of truth** for all center content — files, authored pages, and golden samples live in one library
2. **Course is a reusable template** — lesson plans with linked materials and exercises, snapshot-copied to classes on creation
3. **Session is the daily teaching hub** — inherits from lesson plans, customizable per session, with teacher notes
4. **Shared tags** — one tag pool across exercises and documents for consistent discovery
5. **Markdown for authored content** — pages, lesson plans, teacher notes all use markdown stored as Text fields

### Data Architecture

#### Unified Tag System

Rename `ExerciseTag` → `Tag`. Shared across exercises and documents. This is a **prerequisite task** for Phase 1 — touches existing queries and the Prisma schema.

```prisma
model Tag {
  id        String   @id @default(cuid())
  centerId  String   @map("center_id")
  name      String
  color     String?
  createdAt DateTime @default(now()) @map("created_at")

  center    Center @relation(fields: [centerId], references: [id], onDelete: Cascade)
  exercises Exercise[] // many-to-many via ExerciseTagMap
  documents Document[] // many-to-many via DocumentTagMap

  @@index([centerId])
  @@map("tag")
}
```

**Migration:** Rename `exercise_tag` → `tag` table, rename join table, update all service/route/test files referencing `ExerciseTag`.

#### Document Model (Knowledge Hub)

Replaces the `GoldenSample` model. Three document types in one polymorphic table:

```prisma
model Document {
  id          String   @id @default(cuid())
  centerId    String   @map("center_id")
  type        String   // FILE | GOLDEN_SAMPLE | PAGE
  title       String
  description String?

  // FILE fields (used when type = FILE)
  fileUrl     String?  @map("file_url")
  fileName    String?  @map("file_name")
  fileSize    Int?     @map("file_size")       // bytes
  mimeType    String?  @map("mime_type")

  // PAGE fields (used when type = PAGE)
  content     String?  @db.Text               // markdown

  // GOLDEN_SAMPLE fields (used when type = GOLDEN_SAMPLE)
  studentWork     String?  @map("student_work") @db.Text
  teacherFeedback String?  @map("teacher_feedback") @db.Text
  skillType       String?  @map("skill_type")   // WRITING | SPEAKING
  isActive        Boolean  @default(true) @map("is_active")
  sampleOrder     Int      @default(0) @map("sample_order")

  uploadedById String   @map("uploaded_by_id")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  center      Center          @relation(fields: [centerId], references: [id], onDelete: Cascade)
  uploadedBy  CenterMembership @relation(fields: [uploadedById], references: [id])
  tags        Tag[]           // many-to-many via DocumentTagMap
  courseDocuments    CourseDocument[]
  lessonPlanDocuments LessonPlanDocument[]
  sessionDocuments  SessionDocument[]

  @@index([centerId])
  @@index([centerId, type])
  @@index([centerId, type, skillType])
  @@map("document")
}
```

**Validation: Zod discriminated union** in `packages/types` enforces type-specific required fields at the API boundary:

```typescript
export const DocumentCreateSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("FILE"),
    title: z.string().min(1),
    fileUrl: z.string().url(),
    fileName: z.string(),
    fileSize: z.number().int().positive(),
    mimeType: z.string(),
    description: z.string().optional(),
  }),
  z.object({
    type: z.literal("GOLDEN_SAMPLE"),
    title: z.string().min(1),
    studentWork: z.string().min(50),
    teacherFeedback: z.string().min(50),
    skillType: z.enum(["WRITING", "SPEAKING"]),
    description: z.string().optional(),
  }),
  z.object({
    type: z.literal("PAGE"),
    title: z.string().min(1),
    content: z.string(),
    description: z.string().optional(),
  }),
]);
```

#### Course Model (Extended)

```prisma
model Course {
  // existing fields: id, name, description, color, centerId, createdAt, updatedAt
  syllabus  String?  @db.Text   // markdown overview/description
  status    String   @default("DRAFT") // DRAFT | PUBLISHED | ARCHIVED

  // existing relation
  classes   Class[]
  // new relations
  lessonPlans     CourseLessonPlan[]
  courseDocuments  CourseDocument[]
  courseExercises  CourseExercise[]
}
```

#### Course Lesson Plan

```prisma
model CourseLessonPlan {
  id         String   @id @default(cuid())
  centerId   String   @map("center_id")
  courseId    String   @map("course_id")
  title      String
  orderIndex Int      @map("order_index")
  content    String?  @db.Text  // markdown lesson notes/objectives
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  center    Center   @relation(fields: [centerId], references: [id], onDelete: Cascade)
  course    Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  documents LessonPlanDocument[]
  exercises LessonPlanExercise[]
  sessions  ClassSession[]  // sessions that were sourced from this plan

  @@index([centerId])
  @@index([courseId, orderIndex])
  @@map("course_lesson_plan")
}

model LessonPlanDocument {
  id           String @id @default(cuid())
  centerId     String @map("center_id")
  lessonPlanId String @map("lesson_plan_id")
  documentId   String @map("document_id")
  orderIndex   Int    @map("order_index")

  center     Center           @relation(fields: [centerId], references: [id], onDelete: Cascade)
  lessonPlan CourseLessonPlan @relation(fields: [lessonPlanId], references: [id], onDelete: Cascade)
  document   Document         @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@unique([lessonPlanId, documentId])
  @@index([centerId])
  @@map("lesson_plan_document")
}

model LessonPlanExercise {
  id           String @id @default(cuid())
  centerId     String @map("center_id")
  lessonPlanId String @map("lesson_plan_id")
  exerciseId   String @map("exercise_id")
  orderIndex   Int    @map("order_index")

  center     Center           @relation(fields: [centerId], references: [id], onDelete: Cascade)
  lessonPlan CourseLessonPlan @relation(fields: [lessonPlanId], references: [id], onDelete: Cascade)
  exercise   Exercise         @relation(fields: [exerciseId], references: [id], onDelete: Cascade)

  @@unique([lessonPlanId, exerciseId])
  @@index([centerId])
  @@map("lesson_plan_exercise")
}
```

#### Course-Level Links (materials not tied to a specific lesson)

```prisma
model CourseDocument {
  id         String @id @default(cuid())
  centerId   String @map("center_id")
  courseId    String @map("course_id")
  documentId String @map("document_id")
  orderIndex Int    @map("order_index")

  center   Center   @relation(fields: [centerId], references: [id], onDelete: Cascade)
  course   Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@unique([courseId, documentId])
  @@index([centerId])
  @@map("course_document")
}

model CourseExercise {
  id         String @id @default(cuid())
  centerId   String @map("center_id")
  courseId    String @map("course_id")
  exerciseId String @map("exercise_id")
  orderIndex Int    @map("order_index")

  center   Center   @relation(fields: [centerId], references: [id], onDelete: Cascade)
  course   Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  exercise Exercise @relation(fields: [exerciseId], references: [id], onDelete: Cascade)

  @@unique([courseId, exerciseId])
  @@index([centerId])
  @@map("course_exercise")
}
```

#### Session Extensions

```prisma
// ClassSession — add these fields to existing model:
// + lessonTitle       String?  @map("lesson_title")
// + lessonContent     String?  @map("lesson_content") @db.Text
// + sourceLessonPlanId String? @map("source_lesson_plan_id")
// + relation: sourceLessonPlan CourseLessonPlan? @relation(...)
// + relations: sessionDocuments[], sessionAssignments[], teacherNotes[]

model SessionDocument {
  id         String @id @default(cuid())
  centerId   String @map("center_id")
  sessionId  String @map("session_id")
  documentId String @map("document_id")
  orderIndex Int    @map("order_index")

  center   Center       @relation(fields: [centerId], references: [id], onDelete: Cascade)
  session  ClassSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  document Document     @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@unique([sessionId, documentId])
  @@index([centerId])
  @@map("session_document")
}

model SessionAssignment {
  id           String @id @default(cuid())
  centerId     String @map("center_id")
  sessionId    String @map("session_id")
  assignmentId String @map("assignment_id")
  type         String // ASSIGNED | DUE

  center     Center       @relation(fields: [centerId], references: [id], onDelete: Cascade)
  session    ClassSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  assignment Assignment   @relation(fields: [assignmentId], references: [id], onDelete: Cascade)

  @@unique([sessionId, assignmentId])
  @@index([centerId])
  @@map("session_assignment")
}

model TeacherSessionNote {
  id        String   @id @default(cuid())
  centerId  String   @map("center_id")
  sessionId String   @map("session_id")
  authorId  String   @map("author_id")
  type      String   // PRE_SESSION | POST_SESSION
  content   String   @db.Text  // markdown
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  center  Center           @relation(fields: [centerId], references: [id], onDelete: Cascade)
  session ClassSession     @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  author  CenterMembership @relation(fields: [authorId], references: [id])

  @@index([sessionId, type, createdAt])
  @@index([centerId])
  @@map("teacher_session_note")
}
```

**Note:** TeacherSessionNote is **append-only** (no unique constraint on session+author+type). Multiple notes per type, ordered by `createdAt`. Teachers journal freely — pre-session prep thoughts and post-session reflections accumulate over time.

### Course → Class Snapshot Logic

When a class is created from a course (story 19.2):

1. **Lesson Plans → Sessions:** For each `CourseLessonPlan`, if sessions already exist (generated from schedule), map lesson plans to sessions by order:
   - Copy `title` → `ClassSession.lessonTitle`
   - Copy `content` → `ClassSession.lessonContent`
   - Set `ClassSession.sourceLessonPlanId` → enables provenance display ("From: Lesson 3 — Opinion Essays") and future "pull updates from template"
   - Copy `LessonPlanDocument` entries → `SessionDocument` entries
   - Copy `LessonPlanExercise` entries → `Assignment` records (status: OPEN)
2. **Course-level documents** → Accessible via `class.course.courseDocuments` relation (no separate copy needed — these are general course materials, not session-specific)
3. **All session-level copies are one-time snapshots** — editing the course or lesson plan after does not affect existing classes

**Future enhancement:** Course template versioning. Track `templateVersion` on Course; when a lesson plan changes, increment version. Classes with `sourceLessonPlanId` set can compare versions and offer a "Pull updates from template" action. The current model supports this without schema changes.

### GoldenSample → Document Migration

**This is a dedicated story, not a side task.** Migration steps:

1. Create `Document` model with all fields
2. Data migration script: for each existing `GoldenSample` row, insert a `Document` with `type = GOLDEN_SAMPLE`, mapping all fields (`title`, `studentWork`, `teacherFeedback`, `skillType`, `isActive`, `order` → `sampleOrder`)
3. **Keep `/api/v1/golden-samples` route prefix** as a thin facade over `DocumentService` filtered by `type = GOLDEN_SAMPLE`. Frontend AI Customization page requires minimal changes — same CRUD shape, different service underneath
4. Update AI grading job: `getActiveByCenterAndSkill()` queries `Document WHERE type = GOLDEN_SAMPLE AND isActive = true AND skillType = ?`
5. Drop `GoldenSample` model after migration confirmed
6. Update `TENANTED_MODELS`: add `Document`, remove `GoldenSample`

### File Storage Strategy

**Provider:** Firebase Storage (GCS) — extends existing pattern from exercise uploads.

**Path structure:**
```
centers/{centerId}/knowledge-hub/{documentId}/{originalFileName}
centers/{centerId}/content-images/{uuid}.{ext}  // images embedded in markdown via TipTap
```

**Upload flow:**
1. Frontend: `@fastify/multipart` receives file (max 50MB via `limits.fileSize`)
2. Backend: buffer → GCS bucket upload → `makePublic()` → store URL on Document model
3. Reuses existing pattern from `exercises.service.ts` (`uploadAudio`, `uploadDiagram`)

**Allowed MIME types for FILE uploads:**
- `application/pdf`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX)
- `application/vnd.openxmlformats-officedocument.presentationml.presentation` (PPTX)
- `image/png`, `image/jpeg` (for content images)

**Frontend preview strategy:**
- **PDF:** `pdfjs-dist` (Mozilla PDF.js) — renders in-browser, no server processing
- **DOCX/PPTX:** Download-only for MVP. Server-side conversion deferred
- **PAGE (markdown):** Rendered client-side via the same markdown renderer used in the editor

### Markdown Editor Decision

**Library:** TipTap (ProseMirror-based WYSIWYG)

**Rationale:**
- WYSIWYG experience for teachers who don't know markdown syntax
- Stores as **markdown Text field** (not ProseMirror JSON) — portable, human-readable, no format lock-in
- Toolbar: headings, bold/italic, lists, links, image embed, code blocks
- Used across: PAGE documents, lesson plan content, teacher session notes
- Shared editor component in `apps/webapp/src/components/` or `packages/ui`

**Caveat:** TipTap's markdown serialization is not perfectly lossless for complex formatting (nested tables, exotic layouts). For IELTS teaching content (headings, bold, lists, images) this is a non-issue. Do not promise Notion-level rich editing with a markdown storage backend.

**Image handling within markdown:**
- Images uploaded via editor are stored in GCS at `centers/{centerId}/content-images/{uuid}.{ext}`
- Inserted as standard markdown `![alt](url)` references
- Same upload service, different path prefix

### RBAC Rules

| Action | Owner | Admin | Teacher | Student |
|--------|-------|-------|---------|---------|
| Knowledge Hub: upload FILE/PAGE | Yes | Yes | Yes | No |
| Knowledge Hub: view/download | Yes | Yes | Yes | Yes (if enrolled) |
| Knowledge Hub: delete | Yes | Yes | Own only | No |
| Golden Samples: manage | Yes | No | No | No |
| Course: create/edit | Yes | Yes | No | No |
| Course: view | Yes | Yes | Yes | Yes (enrolled) |
| Lesson Plan: create/edit | Yes | Yes | No | No |
| Session: customize materials | Yes | Yes | Assigned only | No |
| Session: teacher notes | No | No | Assigned only | No |
| Session: view materials + assignments | Yes | Yes | Yes | Yes (enrolled) |

**Student session view** is explicitly lightweight: linked documents (viewable/downloadable) + linked assignments (with status). No teacher notes, no lesson content, no teacher customization details.

### Module Structure

**Backend:**
```
apps/backend/src/modules/
├── knowledge-hub/                    # NEW
│   ├── document.service.ts
│   ├── document.controller.ts
│   ├── document.routes.ts
│   └── document.service.test.ts
├── golden-samples/                   # REFACTORED → thin facade over DocumentService
│   ├── golden-samples.routes.ts      # keeps /api/v1/golden-samples prefix
│   └── golden-samples.routes.integration.test.ts
├── courses/                          # EXTENDED
│   ├── course.service.ts             # add lesson plans, template snapshot logic
│   ├── course.controller.ts
│   ├── course.routes.ts
│   └── lesson-plan.service.ts        # NEW
├── sessions/                         # EXTENDED
│   ├── session.service.ts            # add materials, assignments
│   └── teacher-notes.service.ts      # NEW
```

**Frontend:**
```
apps/webapp/src/features/
├── knowledge-hub/                    # NEW
│   ├── components/
│   │   ├── DocumentList.tsx
│   │   ├── DocumentUpload.tsx
│   │   ├── DocumentViewer.tsx        # PDF.js viewer
│   │   └── PageEditor.tsx            # TipTap markdown editor
│   ├── pages/
│   │   ├── KnowledgeHubPage.tsx
│   │   └── DocumentDetailPage.tsx
│   └── knowledge-hub.api.ts
├── courses/                          # EXTENDED
│   ├── components/
│   │   ├── CoursePage.tsx
│   │   ├── LessonPlanEditor.tsx
│   │   └── CourseTemplateWizard.tsx
│   └── courses.api.ts
├── settings/
│   └── pages/
│       └── AICustomizationPage.tsx   # refactored to query Document model
```

**Shared component:**
```
apps/webapp/src/components/
└── MarkdownEditor.tsx                # TipTap wrapper, reused across features
```

### Implementation Phasing

**Phase 1: Knowledge Hub + Golden Sample Migration**
- **Prerequisite:** Tag rename (`ExerciseTag` → `Tag`, update all references)
- Document model creation (all three types)
- File upload for FILE type (extend GCS pattern)
- TipTap markdown editor component for PAGE type
- Golden sample migration (dedicated story — facade route, service swap, data migration)
- AI grading integration updated to query Document model
- Knowledge Hub UI (list, upload, search, tag filtering, PDF preview)

**Phase 2: Course Redesign**
- Course model extensions (syllabus, status, relations)
- CourseLessonPlan model + CRUD
- Lesson plan editor (TipTap, link documents + exercises)
- Course standalone page with documents, exercises, lesson plans
- Course → Class template snapshot logic
- CourseDocument, CourseExercise join tables

**Phase 3: Session as Teaching Hub**
- ClassSession extensions (lessonTitle, lessonContent, sourceLessonPlanId)
- SessionDocument, SessionAssignment models
- Lesson plan → session content inheritance on class creation
- Teacher session notes (append-only journal, pre/post)
- Teacher session view (rich hub: lesson content, materials, assignments, notes)
- Student session view (lightweight: materials + assignments only)

**Future (separate epic):**
- Student personal notes with entity linking (`StudentNote`, `NoteLink`, `@mention` system)
- Course template versioning and "pull updates" action
- DOCX/PPTX server-side preview conversion

### New Models Summary

| Model | Domain | Tenanted | Purpose |
|-------|--------|----------|---------|
| Document | Knowledge Hub | Yes | Unified content: files, pages, golden samples |
| Tag | Shared | Yes | Replaces ExerciseTag, shared across exercises + documents |
| CourseLessonPlan | Course | Yes | Structured syllabus entry with linked materials |
| LessonPlanDocument | Course | Yes | Join: lesson plan → document |
| LessonPlanExercise | Course | Yes | Join: lesson plan → exercise |
| CourseDocument | Course | Yes | Join: course → document (general materials) |
| CourseExercise | Course | Yes | Join: course → exercise (general exercises) |
| SessionDocument | Session | Yes | Join: session → document (day's materials) |
| SessionAssignment | Session | Yes | Join: session → assignment (assigned/due) |
| TeacherSessionNote | Session | Yes | Append-only teacher journal per session |

**Total new models: 10** (plus extensions to Course and ClassSession)

---

**Architecture Status:** READY FOR IMPLEMENTATION ✅

**Next Phase:** Begin implementation using the architectural decisions and patterns documented herein.

**Document Maintenance:** Update this architecture when major technical decisions are made during implementation.

---

## Session & Schedule Redesign (Epic 14)

_Addendum date: 2026-04-06. Extends the existing scheduling system with auto-generation from recurrence rules, exception handling, and recurrence rule updates._
_Reviewed via Party Mode (Winston, John, Quinn, Amelia)._

### Design Principles

1. **Simple recurrence model** — `dayOfWeek + frequency + interval + endDate` over RFC 5545 RRules. ClassLite scheduling is straightforward (weekly/biweekly on fixed days); RRules add 40KB+ dependency and mental model complexity for zero benefit
2. **Eager generation** — all sessions materialized up to end date on save. Max 12-month cap enforced at Zod validation. For no-end-date classes, rolling 3-month window via scheduled Inngest job
3. **Exceptions are flagged, not separated** — `isException` flag on ClassSession with `originalStartTime`/`originalEndTime` to track what the series would have generated
4. **Completed sessions are sacred** — `COMPLETED` status sessions are never deleted during re-generation, implicitly treated as exceptions
5. **Update in place** — recurrence rule changes update the existing ClassSchedule with `effectiveFrom` audit trail, delete future non-exception/non-completed sessions, then re-generate

### Data Architecture

#### ClassSchedule Extensions

Add to existing model:

```prisma
model ClassSchedule {
  // existing: id, classId, dayOfWeek, startTime, endTime, roomName, centerId

  frequency      String   @default("WEEKLY")  // WEEKLY | BIWEEKLY
  endDate        DateTime? @map("end_date")    // null = rolling window
  effectiveFrom  DateTime? @map("effective_from") // audit: when rule last changed
}
```

**`frequency`** — currently lost after session creation. Storing it enables re-generation when the rule changes.

**`endDate`** — determines session generation boundary. Null triggers rolling window behavior.

**`effectiveFrom`** — audit metadata only. Set when rule changes; not used as logic driver.

#### ClassSession Extensions

Add to existing model:

```prisma
model ClassSession {
  // existing: id, classId, scheduleId, startTime, endTime, roomName, status, centerId

  isException        Boolean   @default(false) @map("is_exception")
  originalStartTime  DateTime? @map("original_start_time")
  originalEndTime    DateTime? @map("original_end_time")
}
```

**`isException`** — set to `true` when a session is individually edited (time, date, room) or cancelled. Protects the session from deletion during re-generation.

**`originalStartTime` / `originalEndTime`** — what the series rule would have generated for this slot. Critical for deduplication during re-generation: when checking if a slot is already occupied, check `originalStartTime` for rescheduled exceptions, not just `startTime`.

**When `isException` is set:**
- Teacher edits a single session's time/date/room → `isException = true`, `originalStartTime`/`originalEndTime` = the original generated values, `startTime`/`endTime` = new values
- Teacher cancels a single session → `isException = true`, `status = CANCELLED`, original times preserved
- Attendance is taken → `status = COMPLETED` (implicitly protected, no explicit flag change needed)

#### Indexes

```prisma
// Add to ClassSession
@@index([scheduleId, isException])        // fast filter during re-generation
@@index([scheduleId, originalStartTime])  // dedup check for rescheduled exceptions
```

### Generation Logic

#### Auto-Generation on Save (Story 14.1)

When a ClassSchedule is created or updated with schedules + end date:

1. Determine date range: `effectiveFrom` (or today) → `endDate` (or today + 3 months)
2. Expand dates matching `dayOfWeek` + `frequency` (weekly = every matching day, biweekly = every other)
3. For each candidate date, create `startTime`/`endTime` from schedule's HH:mm times
4. **Dedup check:** For each candidate slot, check for existing sessions where:
   - `scheduleId` matches AND (`startTime` = candidate OR `originalStartTime` = candidate)
   - Skip if found (session already exists, possibly as exception)
5. Bulk create via `createMany`
6. Run `checkBatchConflicts()` post-generation → return conflict warnings (non-blocking)

#### Rolling Window Job (No End Date)

**Trigger:** Inngest cron job, runs daily at 02:00 UTC.

**Logic:**
1. Query all ClassSchedules where `endDate IS NULL`
2. For each, find the latest generated session's date
3. If latest session < today + 3 months, generate sessions to fill the gap
4. Same dedup + exception-aware logic as above

**Pattern:** Follows existing Inngest job conventions — `new PrismaClient()` per `step.run()`, `getTenantedClient()`, `$disconnect()` in finally.

#### Re-Generation on Rule Change (Story 14.4)

When a recurrence rule is updated (day, time, frequency):

1. Set `effectiveFrom = now()` on ClassSchedule
2. Delete future sessions where:
   ```
   scheduleId = X
   AND startTime >= now()
   AND isException = false
   AND status != COMPLETED
   ```
3. Re-generate from updated rule (same logic as auto-generation, starting from today)
4. **Exceptions survive:** Cancelled and rescheduled sessions are preserved
5. Send notification to class participants via existing Inngest email pipeline

**Edge case — cancelled exception after rule change:** A cancelled Tuesday session survives when the rule changes to Wednesday. It remains visible on the calendar as a cancelled historical entry. No special handling needed — it simply no longer aligns with the current series pattern, which is correct behavior.

**Edge case — rescheduled exception after rule change:** A session moved from Tue to Wed survives. The new rule generates a fresh Tue session (original slot is free per dedup). The teacher now has both — intentional, since the rescheduled session was a deliberate choice. If this creates a double-booking, conflict detection surfaces it.

### Lesson Plan Inheritance for Re-Generated Sessions

**Problem:** The Knowledge Hub addendum defines lesson plan → session inheritance during class creation (story 19.2). Re-generated sessions are created *after* class creation.

**Solution:** Extract the lesson plan mapping logic into a shared utility:

```typescript
// apps/backend/src/modules/logistics/utils/lesson-plan-mapper.ts
export async function mapLessonPlansToSessions(
  db: TenantedClient,
  classId: string,
  sessionIds: string[],  // ordered by startTime
): Promise<void>
```

- Query `CourseLessonPlan` entries for the class's course, ordered by `orderIndex`
- Map lesson plans to sessions by position (plan 1 → session 1, etc.)
- Set `lessonTitle`, `lessonContent`, `sourceLessonPlanId` on each session
- Copy `LessonPlanDocument` → `SessionDocument`, `LessonPlanExercise` → `Assignment`
- Called both during class creation (story 19.2) and during re-generation (story 14.4)

### Conflict Detection Strategy

**During auto-generation:** Non-blocking. Run `checkBatchConflicts()` after bulk create. Return `{ generatedCount, sessions, conflicts: ConflictResult[] }`. Frontend displays warnings.

**During single session edit/reschedule:** Blocking (existing behavior). Run `checkConflicts()` before save. Frontend shows `ConflictWarningBanner`.

**No change to existing conflict detection code** — `checkBatchConflicts()` already handles room + teacher double-booking for a batch of sessions.

### API Changes

#### Modified Endpoints

| Endpoint | Change |
|----------|--------|
| `POST /api/v1/logistics/schedules` | Accept `frequency`, `endDate`. Auto-generate sessions on create |
| `PATCH /api/v1/logistics/schedules/:id` | Accept rule changes. Trigger delete-regenerate flow |
| `PATCH /api/v1/logistics/sessions/:id` | Set `isException = true` + populate `originalStartTime`/`originalEndTime` when time/date changes |

#### New Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/v1/logistics/sessions/:id/cancel` | Cancel single occurrence (set `isException`, `status = CANCELLED`). Distinct from DELETE — preserves the record |

#### Removed/Deprecated

| Endpoint | Reason |
|----------|--------|
| `POST /api/v1/logistics/sessions/generate` | Replaced by auto-generation on schedule save. Keep for backward compat during transition, mark deprecated |

### Notification Integration

All Epic 14 operations feed into the existing notification pipeline:

- **Session cancelled** → existing `session-cancelled.template.ts`
- **Session rescheduled** → existing `schedule-change.template.ts`
- **Bulk re-generation** → new template: summary email "Your schedule for [ClassName] has been updated. X sessions affected."
- **Trigger:** `inngest.send()` from controller, same pattern as story 2.6

### RBAC Rules

| Action | Owner | Admin | Teacher | Student |
|--------|-------|-------|---------|---------|
| Create/edit recurrence rule | Yes | Yes | No | No |
| Cancel single session | Yes | Yes | Assigned only | No |
| Reschedule single session | Yes | Yes | Assigned only | No |
| Edit single session (room, time) | Yes | Yes | Assigned only | No |
| View schedule | Yes | Yes | Yes | Yes (enrolled) |

### Implementation Sequence

1. **Schema changes** — Add fields to ClassSchedule and ClassSession, db:push, generate
2. **Generation logic** — Refactor `generateSessions()` with exception-aware dedup, frequency support
3. **Exception handling** — Update `updateSession()` to set `isException` + original times
4. **Rule change flow** — Implement delete-regenerate in schedule update endpoint
5. **Rolling window job** — Inngest cron for no-end-date classes
6. **Cancel endpoint** — New `POST /sessions/:id/cancel`
7. **Lesson plan mapper** — Extract shared utility, wire into re-generation
8. **Notification templates** — Bulk schedule change summary email
9. **Frontend** — Scheduler UI updates (cancel vs delete, exception visual markers)
