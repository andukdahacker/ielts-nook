---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-04-21'
inputDocuments:
  - _bmad-output/planning-artifacts/ielts-teacher-toolkit-product-spec.md
  - _bmad-output/planning-artifacts/infrastructure-cost-model.md
  - _bmad-output/planning-artifacts/architecture.md
  - project-context.md
workflowType: 'architecture'
project_name: 'ielts-teacher-toolkit'
user_name: 'Ducdo'
date: '2026-04-21'
---

# IELTS Teacher Toolkit — Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
The system serves a single authenticated persona (IELTS Teacher) with three core workflows:

1. **AI Grading (Writing/Speaking):** Split-panel review interface where AI suggests comments and scores, teacher accepts/edits/rejects, then publishes feedback. Essays arrive from multiple sources: in-app student submissions (primary), Google Drive folder detection, or pasted Doc URLs. Speaking adds audio transcription via Gemini multimodal.
2. **Unified Assignments (all 4 skills):** Assignment library covering R/L/W/S. Teacher creates assignments → generates shareable link → students complete in-app → results flow into grading inbox (W/S) or auto-score (R/L). Paper mode with PDF export and quick-entry grid for R/L.
3. **Student Analytics & Parent Reports:** Dashboard with trend analysis, at-risk detection, projected bands. Public shareable links for parent progress reports and student feedback/results.

Plus two supporting workflows:
4. **Progressive Onboarding:** Three entry paths (grade now / import scores / setup class). Students and classes created retroactively around grading activity.
5. **Manual Score Entry:** Single, bulk, and per-question entry for scores from external sources.

**Non-Functional Requirements:**
- **AI Latency:** Gemini calls are synchronous from teacher's perspective (no background job queue). 15s target, 60s timeout with retry. Teacher sees progress spinner.
- **Data Integrity:** Never lose teacher work. Graceful degradation on API failures.
- **Security:** Incremental Google OAuth scopes. Public endpoints secured via UUID v4 tokens with rate limiting.
- **Concurrency:** 20+ simultaneous students per assignment. Server-authoritative timers.
- **File Handling:** Audio upload from browser recording and teacher uploads (max 30MB), PDF import/export.
- **Responsiveness:** Desktop-first for teacher. Mobile-responsive for student-facing and parent-facing views.

**Scale & Complexity:**
- Primary domain: Full-stack web app with Google Workspace integration
- Complexity level: Medium (significantly simpler than ClassLite)
- Estimated architectural components: 5 core domains (Auth/Google, Grading/AI, Assignments/Submissions, Analytics, Public-facing)
- Target scale: Individual teachers, 1-3 classes, 10-50 students per teacher. Low traffic.

### Technical Constraints & Dependencies

- **Google OAuth 2.0 (direct, no Firebase):** Single auth flow provides both identity (login) and API access tokens (Drive, Docs, Sheets). Incremental scope requests. No Firebase Auth middleman — teacher profile stored directly in Prisma DB.
- **Google APIs:** Docs (read content), Drive (read/write files, comments, folders), Sheets (read/write). Important but not sole pathway — in-app submissions reduce Drive dependency.
- **Gemini 2.0 Flash:** Multimodal AI for text grading, audio transcription+grading, PDF extraction, and Sheet structure detection. All calls synchronous with loading states — no job queue needed at this scale.
- **No Job Queue (no Inngest):** All AI and API operations are synchronous from the teacher's perspective. Longer timeouts (90s) on AI-related endpoints. No background processing for MVP. Simplifies stack significantly.
- **ClassLite Codebase Reuse:** Fork (not share) Gemini grading prompts, question type schemas, band conversion tables for MVP. Refactor into shared packages later when both products stabilize.
- **Teacher-Scoped Data Isolation:** Not multi-tenant like ClassLite, but teacher data must be strictly isolated. Every query filters by teacher_id. Simpler than center-based tenancy but must be enforced from day one.
- **Minimal Stack:** Fastify + Prisma + Google APIs + Gemini. Four core dependencies. No Firebase, no Inngest, no Polar, no Resend for MVP.

### Cross-Cutting Concerns Identified

1. **Google OAuth Token Lifecycle:** Single flow for identity + API access. Incremental scope requests per feature. Token storage, silent refresh, re-auth prompts without losing teacher's work.
2. **AI Orchestration:** Gemini calls across 4 use cases (writing grading, speaking grading+transcription, PDF extraction, Sheet detection). Synchronous with appropriate timeouts. Consistent error handling and structured JSON output parsing via Zod.
3. **Public vs Authenticated Routes:** Three security contexts — teacher app (Google OAuth session), student assignments (assignment UUID), parent/student results (report/results UUID tokens). Shared backend handles all.
4. **Binary File Pipeline:** Audio files from browser recording (WebM/Opus) and teacher uploads (MP3/M4A/WAV) follow a different pattern than text/JSON. Upload → temporary storage → send to Gemini → discard or save to Drive. PDF import follows similar pattern. Needs consistent upload handling with size limits.
5. **Progressive Data Model:** Students and classes can exist in "unattached" state during progressive onboarding. Assignments unify R/L/W/S under one model. All data scoped by teacher_id.

## Starter Template Evaluation

### Primary Technology Domain

Full-Stack TypeScript Monorepo based on project requirements analysis and ClassLite team experience.

### Repository Decision: Standalone Repo

The Toolkit will live in a **separate repository** from ClassLite, not as a new app in the ClassLite monorepo.

**Rationale:**
- Toolkit has a fundamentally different auth model (Google OAuth vs Firebase Auth), data model (teacher-scoped vs center-scoped multi-tenant), and stack (no Inngest, no Firebase, no Polar)
- Clean slate avoids inheriting ClassLite complexity and dependencies
- Independent deploys and dependency management
- Faster iteration without risk of breaking ClassLite
- Code reuse via forking specific files (question types, grading prompts, band tables) — refactor into shared packages later if both products converge

**Structure:**
```
ielts-toolkit/
├── apps/
│   ├── api/              ← Fastify backend
│   └── web/              ← React + Vite frontend
├── packages/
│   ├── types/            ← Zod schemas (forked question types + new Toolkit types)
│   └── ui/               ← Shadcn/UI components
├── prisma/
│   └── schema.prisma     ← Clean schema, teacher-scoped
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### Starter Options Considered

Since this is a greenfield project using the same stack the team already knows (Fastify + React + Vite + Prisma + TurboRepo), a "create from scratch" approach using the existing ClassLite scaffold as a reference is more appropriate than adopting an external starter template.

**1. External Starters (Evaluated and Rejected)**
- **create-t3-app:** Next.js-based, includes tRPC. Wrong backend framework (not Fastify) and introduces unnecessary paradigm shift.
- **create-turbo:** Official TurboRepo starter. Provides barebones monorepo scaffolding but no backend or DB setup. Would need extensive customization.
- **Vercel TurboRepo examples:** Good reference patterns but don't include Fastify + Prisma.

**2. Custom Scaffold Based on ClassLite Patterns (Selected)**
- Copy the monorepo structure from ClassLite (turbo.json, pnpm-workspace, tsconfig patterns)
- Set up Fastify API app with Zod type provider (same pattern as ClassLite)
- Set up React + Vite frontend app with TanStack Query + Shadcn (same as ClassLite)
- Fresh Prisma schema with teacher-scoped models
- Remove everything Toolkit doesn't need: Firebase, Inngest, Polar, Resend, multi-tenant middleware, RBAC

### Selected Starter: Custom Scaffold from ClassLite Patterns

**Rationale for Selection:**
The team built and maintains ClassLite's monorepo. Using the same conventions, config files, and patterns means zero learning curve. Starting from a known-good configuration and stripping out what's not needed is faster and safer than adopting an unfamiliar external starter.

**Initialization approach:**
```bash
# Create new repo with monorepo scaffolding
mkdir ielts-toolkit && cd ielts-toolkit
git init

# Copy structural files from ClassLite (turbo.json, tsconfig, pnpm-workspace, eslint config)
# Set up apps/api (Fastify + Prisma + Zod + google-auth-library + @google/generative-ai)
# Set up apps/web (React + Vite + TanStack Query + React Hook Form + Tailwind + Shadcn)
# Set up packages/types (forked question type schemas + new Toolkit schemas)
# Set up packages/ui (Shadcn components)
# Set up prisma/ (fresh schema)
```

**Architectural Decisions Provided by Scaffold:**

**Language & Runtime:**
- TypeScript strict mode across monorepo
- Node.js (LTS) for backend, browser for frontend

**Styling Solution:**
- Tailwind CSS + Shadcn/UI (Radix primitives)
- Shared via packages/ui

**Build Tooling:**
- TurboRepo for monorepo orchestration (build, dev, lint tasks)
- Vite for frontend bundling and HMR
- tsc for backend compilation
- pnpm for package management

**Testing Framework:**
- Vitest for unit and integration tests
- Playwright for E2E (later phases)

**Code Organization:**
- Feature-first modules in backend (e.g., modules/grading/, modules/assignments/)
- Route → Controller → Service layering (same as ClassLite)
- Co-located tests

**Authentication:**
- Google OAuth 2.0 direct (google-auth-library)
- Single auth flow for identity + API access tokens
- Incremental scopes requested per feature
- JWT session cookie for request authentication
- Refresh tokens stored in DB for Google API calls

**Development Experience:**
- Hot reload via Vite (frontend) and tsc --watch (backend)
- Shared Zod schemas between frontend and backend via packages/types
- OpenAPI schema generation for type-safe frontend API client (same pattern as ClassLite)

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Google OAuth 2.0 direct with DB sessions and incremental scopes
- PostgreSQL via Prisma with teacher-scoped data isolation
- Google Cloud Storage for file uploads
- Gemini 2.0 Flash synchronous (no job queue)
- Standalone repo with custom scaffold from ClassLite patterns

**Important Decisions (Shape Architecture):**
- REST API with OpenAPI schema generation
- Tremor for dashboard charts
- Plain textarea for student writing submissions
- Railway single-environment deployment

**Deferred Decisions (Post-MVP):**
- CI/CD pipeline
- Staging environment
- File retention/cleanup policy
- Email notifications (Resend or similar)
- Payment processing (Polar or Stripe)

### Data Architecture

**Database:** PostgreSQL via Prisma ORM
- Fresh schema, not shared with ClassLite
- All models scoped by `teacher_id` — enforced at query level
- Prisma conventions from ClassLite: PascalCase models, snake_case columns via @map, snake_case tables via @@map

**Session Storage:** DB sessions in Prisma
- Session table: `id`, `teacher_id`, `expires_at`, `created_at`
- httpOnly cookie holds session ID
- Server validates session on each authenticated request
- Tracks granted Google OAuth scopes per session for incremental auth

**Google OAuth Token Storage:** `GoogleToken` table linked to Teacher
- Fields: `teacher_id`, `access_token`, `refresh_token`, `scopes_granted` (string array), `expires_at`
- Access token refreshed automatically using refresh token when expired
- Scopes accumulate as teacher uses more features

**File Storage:** Google Cloud Storage (GCS)
- Single bucket: `toolkit-uploads`
- Structure: `{teacher_id}/audio/{gradeSessionId}.webm`, `{teacher_id}/pdf/{importId}.pdf`
- Audio kept until grading session deleted or 90-day cleanup (post-MVP)
- PDFs deleted after extraction
- Cost: negligible at target scale

**Data Validation:** Zod schemas throughout
- Shared via packages/types between frontend and backend
- API request/response validation via fastify-type-provider-zod
- Forked question type schemas from ClassLite (20 types)

### Authentication & Security

**Authentication:** Google OAuth 2.0 direct
- Single auth flow provides identity (login) + API access tokens (Drive, Docs, Sheets)
- Incremental scopes: login starts with `openid email profile`, additional scopes requested per feature
- google-auth-library for token exchange, verification, and refresh
- No Firebase Auth — reduces dependencies and avoids dual-token complexity

**Session Management:** Server-side DB sessions
- httpOnly, secure, sameSite cookie
- Session lookup on each authenticated request
- Session stores: teacher_id, granted scopes, last_active
- Silent token refresh when Google access token expires

**Public Endpoint Security:**
- Assignment links: UUID v4 (unguessable), deactivated when teacher closes assignment
- Parent report links: UUID v4, non-expiring, revocable by teacher
- Student feedback links: UUID v4, tied to specific grading session
- Rate limiting: 100 req/min/IP on all public endpoints
- No sensitive data in public responses (first name + scores only)

**Teacher Data Isolation:**
- Every DB query filters by `teacher_id`
- No multi-tenant middleware needed — simpler than ClassLite's center-based isolation
- Enforced at service layer, not middleware (explicit over implicit)

### API & Communication Patterns

**API Style:** REST with Zod-typed routes
- Same pattern as ClassLite: Route → Controller → Service layering
- Zod schemas define request params, body, query, and response types
- Auto-generated OpenAPI schema from Zod definitions

**Frontend API Client:** openapi-fetch with generated TypeScript types
- Backend serves OpenAPI spec at /api/docs
- Frontend generates types via `sync-schema` script
- Type-safe API calls without manual interface duplication

**Error Handling:**
- Services throw domain errors with clear messages
- Route layer catches and maps to HTTP status codes (400, 401, 404, 409, etc.)
- Frontend handles errors in mutation `onError` callbacks, displayed via toasts
- Google API errors: catch, log, surface user-friendly message ("Could not access Google Drive. Please reconnect.")
- Gemini API errors: catch, save draft state, offer retry or manual grading fallback

**Rate Limiting:** Public endpoints only
- 100 req/min/IP for test-taking, parent reports, student feedback
- Teacher endpoints unprotected at this scale (single user)

**Request Timeouts:**
- Standard endpoints: 30s (Fastify default)
- AI grading endpoints: 90s (Gemini can be slow)
- File upload endpoints: 120s (large audio files)

### Frontend Architecture

**Routing:** React Router (familiar from ClassLite, no learning curve)

**State Management:** TanStack Query v5
- Server state via queries and mutations
- No client-side state management library needed
- Form state via React Hook Form + Zod resolver

**Styling:** Tailwind CSS + Shadcn/UI
- Shadcn preset: `--preset b2v5gxmoga`
- Shared via packages/ui

**Charts & Analytics:** Tremor
- Built on Recharts + Tailwind
- Pairs naturally with Shadcn/UI design language
- Line charts for band-over-time, bar charts for class overview, status badges

**Audio Player:** Custom controls on HTML5 `<audio>` element
- Play/pause, seek to timestamp, playback speed
- Timestamps in transcript are clickable → seek audio to that point

**Audio Recorder:** Browser MediaRecorder API
- WebM/Opus format (best browser support)
- Custom recording UI with timer and visual feedback
- Graceful fallback message for unsupported browsers

**Writing Editor:** Plain `<textarea>`
- IELTS essays are plain text — no formatting needed
- Live word count via simple string split
- Auto-resize textarea as student types

**PDF Generation:** TBD at implementation
- For paper test export: generate printable PDF from test data
- Options: jsPDF (client-side), Puppeteer (server-side), or simple print-optimized HTML page
- Defer specific library choice to implementation

**Bundle Optimization:**
- Vite code splitting per route (lazy loading)
- Tremor and Shadcn are tree-shakeable
- Public pages (test-taking, reports) should be separate entry points or lazy-loaded to keep initial bundle small

### Infrastructure & Deployment

**Hosting:** Railway (single project)
- API service: Fastify, deployed from apps/api
- Web service: Static build (Vite → nginx or Railway static), deployed from apps/web
- PostgreSQL: Railway managed database
- File storage: Google Cloud Storage (separate, managed via GCP console)

**Environment:** Production only for MVP
- No staging environment
- No CI/CD pipeline — push to main, Railway auto-deploys
- Add staging + CI/CD when team grows or product stabilizes

**Environment Configuration:**
- `.env` files for local development
- Railway environment variables for production
- Required env vars: `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GEMINI_API_KEY`, `GCS_BUCKET_NAME`, `SESSION_SECRET`

**Monitoring:** Minimal for MVP
- Railway built-in logs and metrics
- Health check endpoint: `GET /api/health`
- Structured JSON logging in Fastify for debugging
- Add proper APM (Sentry or similar) post-MVP

### Decision Impact Analysis

**Implementation Sequence:**
1. Repo scaffolding (monorepo, turbo, packages)
2. Prisma schema + DB setup on Railway
3. Google OAuth flow (login + session + token storage)
4. AI grading endpoint (Gemini integration, forked from ClassLite)
5. Grading UI (split panel, suggestion review)
6. Score storage + basic dashboard
7. Assignment creation + student-facing views
8. Parent reports

**Cross-Component Dependencies:**
- Auth must be complete before any Google API feature (Drive, Docs, Sheets)
- Prisma schema must be designed to support progressive onboarding (unattached students/scores)
- GCS setup must be ready before speaking grading (audio upload)
- OpenAPI schema sync must work before frontend can call typed API endpoints

## Implementation Patterns & Consistency Rules

### Inherited from ClassLite (no changes)

These patterns are proven and carry over directly:

**Database Naming:**
- Models: `PascalCase` in Prisma (e.g., `model GradingSession`)
- Tables: `snake_case` via `@@map` (e.g., `@@map("grading_session")`)
- Columns: `snake_case` via `@map` (e.g., `@map("teacher_id")`)
- Every model MUST have `@@map`. Every field MUST have `@map`.

**API Naming:**
- URLs: `kebab-case` (e.g., `/api/v1/grading-sessions`)
- Plural resources (e.g., `/assignments`, `/students`)
- Route params: `:id` format (e.g., `/students/:studentId`)

**Code Naming:**
- Components: `PascalCase` files and exports (e.g., `GradingPanel.tsx`)
- Functions/variables: `camelCase`
- No `any` — use `unknown` with narrowing

**Code Organization:**
- Feature-first modules (e.g., `modules/grading/`, `modules/assignments/`)
- Co-located tests: `grading.service.test.ts` next to `grading.service.ts`
- Route → Controller → Service layering

**API Response Format:**
- Success: `{ data: T, message?: string }`
- Error: `{ message: string }` with appropriate HTTP status code

**Error Handling:**
- Services throw domain errors
- Route layer maps to HTTP status codes
- Frontend: `onError` callbacks → toast notifications

**Imports:**
- Internal: relative imports within same module (`./utils`)
- External: workspace packages (`@workspace/types`)
- Never cross-app imports

### Toolkit-Specific Patterns

**1. Teacher Scoping (replaces ClassLite's multi-tenant pattern)**

ClassLite uses `getTenantedClient(centerId)`. Toolkit does NOT use this.

```typescript
// ❌ WRONG — ClassLite pattern, don't use
const db = getTenantedClient(centerId)

// ✅ CORRECT — Reads: explicit teacher_id filter
const students = await prisma.student.findMany({
  where: { teacher_id: teacherId }
})

// ✅ CORRECT — Writes: compound where on updates/deletes
await prisma.student.update({
  where: { id: studentId, teacher_id: teacherId },
  data: { name: newName },
})

// ✅ CORRECT — Deletes: compound where
await prisma.student.delete({
  where: { id: studentId, teacher_id: teacherId },
})
```

Rule: Every query that touches teacher-specific data MUST include `teacher_id` — reads, writes, AND deletes. Updates and deletes use compound `where` to prevent cross-teacher access by guessing UUIDs.

**Required test pattern for teacher isolation:**
```typescript
// ✅ Every service function MUST have a cross-teacher isolation test
it('should not return students from another teacher', async () => {
  const student = await createStudent({ teacher_id: 'teacher-A' })
  const result = await studentService.getById('teacher-B', student.id)
  expect(result).toBeNull()
})

it('should not update students from another teacher', async () => {
  const student = await createStudent({ teacher_id: 'teacher-A' })
  await expect(
    studentService.update('teacher-B', student.id, { name: 'hacked' })
  ).rejects.toThrow()
})
```

**2. Progressive Onboarding Data Pattern**

Students and scores can exist without a class (created during "grade now" flow before class setup).

```typescript
// class_id is NULLABLE across the data model
{
  teacher_id: 'abc',
  student_id: 'xyz',
  class_id: null,          // ← unattached, no class yet
  skill: 'WRITING',
  overall_band: 6.5,
  source: 'AI_GRADING',    // 'AI_GRADING' | 'MANUAL' | 'ONLINE_TEST'
}
```

Rule: `class_id` is nullable on scores, grading sessions, and student-class membership. All dashboard queries MUST handle both states:

```typescript
// ✅ Dashboard query handles attached AND unattached scores
const scores = await prisma.score.findMany({
  where: {
    teacher_id: teacherId,
    // class_id filter is OPTIONAL — omit to show all, include to filter by class
    ...(classId ? { class_id: classId } : {}),
  },
})
```

**3. Google OAuth Scope Re-Auth Flow**

Backend throws `ScopeRequiredError` when teacher lacks required scopes. Frontend handles re-auth with return URL preservation.

```typescript
// ✅ Backend: throw when scopes insufficient
async function withGoogleClient<T>(
  teacherId: string,
  requiredScopes: string[],
  fn: (auth: OAuth2Client) => Promise<T>
): Promise<T> {
  const tokens = await getTeacherTokens(teacherId)
  if (!hasScopes(tokens, requiredScopes)) {
    throw new ScopeRequiredError(requiredScopes)
  }
  const client = createOAuthClient(tokens)
  return fn(client)
}

// ✅ Frontend: catch and redirect with return URL
const { mutate } = useMutation({
  mutationFn: api.grading.publishToDoc,
  onError: (err) => {
    if (err.code === 'SCOPE_REQUIRED') {
      const missingScopes = err.data.scopes
      window.location.href = buildAuthUrl({
        scopes: missingScopes,
        state: JSON.stringify({
          returnTo: window.location.pathname, // e.g., '/grade/session-123'
          action: 'publish-comments',
        }),
      })
    }
  },
})

// ✅ Backend callback: restore return URL after Google redirect
app.get('/api/v1/auth/google/callback', async (req, reply) => {
  const { code, state } = req.query
  const tokens = await exchangeCodeForTokens(code)
  await updateTeacherTokens(teacherId, tokens)
  const { returnTo } = JSON.parse(state)
  reply.redirect(returnTo || '/dashboard')
})
```

Rule: OAuth `state` parameter always carries `returnTo` URL. After re-auth, teacher lands back on the exact page they were on. Never drop them at the dashboard when they were mid-grading.

**4. AI Grading Call Pattern**

```typescript
// ✅ Pattern for Gemini API calls
async function gradeEssay(text: string, taskType: string): Promise<GradingResult> {
  const result = await callGemini({
    model: 'gemini-2.0-flash',
    contents: [systemPrompt, userPrompt(text, taskType)],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: GradingResultSchema,
    },
    timeout: 60_000,
  })
  return GradingResultSchema.parse(result)
}
```

Rule: All Gemini calls use structured JSON output with Zod schema validation. Always set explicit timeout. Always parse response through Zod before using.

**5. Public vs Authenticated Route Pattern**

```typescript
// ✅ Authenticated route (teacher)
app.get('/api/v1/students', {
  preHandler: [requireAuth],
  schema: { response: { 200: StudentListSchema } },
  handler: studentController.list,
})

// ✅ Public route (student/parent)
app.get('/api/v1/public/assignments/:assignmentId', {
  preHandler: [rateLimit(100)],
  schema: { params: AssignmentParamsSchema },
  handler: publicAssignmentController.get,
})
```

Rule: Public routes live under `/api/v1/public/`. Authenticated routes under `/api/v1/`. Never mix auth middleware on public routes.

**6. File Upload Pattern**

```typescript
// ✅ Pattern for file uploads to GCS
app.post('/api/v1/grading/upload-audio', {
  preHandler: [requireAuth],
  config: { bodyLimit: 30 * 1024 * 1024 },
  handler: async (req, reply) => {
    const file = await req.file()
    const gcsPath = `${req.teacherId}/audio/${uuid()}.webm`
    await uploadToGCS(file.stream, gcsPath) // streaming, not buffered
    return { data: { path: gcsPath } }
  },
})
```

Rule: Files upload to GCS under `{teacher_id}/` prefix. Use streaming upload — don't buffer entire file in memory.

**7. Loading States (Frontend)**

```typescript
// ✅ Pattern for AI operations with loading states
const { mutate: gradeEssay, isPending } = useMutation({
  mutationFn: api.grading.analyze,
  onError: (err) => {
    if (err.status === 503) toast.error('AI grading unavailable. Try again or grade manually.')
    else toast.error(err.message)
  },
})

{isPending ? <GradingSpinner message="Analyzing essay..." /> : <GradingResults />}
```

Rule: All AI-related mutations show a descriptive spinner. Error states always offer a manual fallback or retry.

### Enforcement Guidelines

**All implementations MUST:**
1. Include `teacher_id` in every DB query — reads, writes, and deletes (compound where)
2. Have cross-teacher isolation tests for every service function
3. Handle nullable `class_id` in all dashboard/analytics queries
4. Validate Gemini responses through Zod before using
5. Check OAuth scopes before calling Google APIs
6. Preserve return URL via OAuth `state` parameter during scope re-auth
7. Use `/api/v1/public/` prefix for unauthenticated endpoints
8. Set explicit timeouts on all external API calls
9. Use streaming uploads — never buffer entire files in memory
10. Show loading states for any operation > 1 second

**Anti-Patterns to Avoid:**
- ❌ `prisma.student.findMany()` without `where: { teacher_id }` — data leak
- ❌ `prisma.student.update({ where: { id } })` without `teacher_id` in where — cross-teacher write
- ❌ Dashboard query with `where: { class_id: classId }` that excludes unattached scores
- ❌ Trusting Gemini response shape without Zod validation — runtime errors
- ❌ Calling Google API without scope check — confusing auth errors
- ❌ Dropping teacher at `/dashboard` after scope re-auth instead of their original page
- ❌ Buffering entire audio file in memory — OOM risk
- ❌ Using `getTenantedClient()` — that's ClassLite's pattern, not Toolkit's

## Project Structure & Boundaries

### Complete Project Directory Structure

```
ielts-toolkit/
├── .env.example
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
│
├── apps/
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── index.ts                         # Fastify entry point
│   │       ├── app.ts                            # App builder (plugins, routes)
│   │       ├── config/
│   │       │   ├── env.ts                        # Environment config + validation
│   │       │   ├── google.ts                     # Google OAuth + API config
│   │       │   └── gemini.ts                     # Gemini client setup
│   │       ├── middleware/
│   │       │   ├── auth.ts                       # requireAuth — session cookie validation
│   │       │   ├── rate-limit.ts                 # Rate limiter for public routes
│   │       │   └── teacher-scope.ts              # Extracts teacherId from session
│   │       ├── modules/
│   │       │   ├── auth/
│   │       │   │   ├── auth.route.ts             # /api/v1/auth/google, /callback
│   │       │   │   ├── auth.controller.ts
│   │       │   │   ├── auth.service.ts           # Token exchange, session create
│   │       │   │   └── auth.service.test.ts
│   │       │   ├── grading/
│   │       │   │   ├── grading.route.ts          # /api/v1/grading-sessions
│   │       │   │   ├── grading.controller.ts
│   │       │   │   ├── grading.service.ts        # AI grading orchestration
│   │       │   │   ├── grading.service.test.ts
│   │       │   │   ├── prompts/
│   │       │   │   │   ├── writing-system.ts     # Writing grading system prompt
│   │       │   │   │   └── speaking-system.ts    # Speaking grading system prompt
│   │       │   │   └── schemas/
│   │       │   │       ├── grading-result.ts     # Zod schema for Gemini response
│   │       │   │       └── grading-request.ts
│   │       │   ├── assignments/
│   │       │   │   ├── assignment.route.ts       # /api/v1/assignments
│   │       │   │   ├── assignment.controller.ts
│   │       │   │   ├── assignment.service.ts
│   │       │   │   └── assignment.service.test.ts
│   │       │   ├── students/
│   │       │   │   ├── student.route.ts          # /api/v1/students
│   │       │   │   ├── student.controller.ts
│   │       │   │   ├── student.service.ts
│   │       │   │   └── student.service.test.ts
│   │       │   ├── classes/
│   │       │   │   ├── class.route.ts            # /api/v1/classes
│   │       │   │   ├── class.controller.ts
│   │       │   │   ├── class.service.ts
│   │       │   │   └── class.service.test.ts
│   │       │   ├── scores/
│   │       │   │   ├── score.route.ts            # /api/v1/scores
│   │       │   │   ├── score.controller.ts
│   │       │   │   ├── score.service.ts
│   │       │   │   └── score.service.test.ts
│   │       │   ├── analytics/
│   │       │   │   ├── analytics.route.ts        # /api/v1/analytics
│   │       │   │   ├── analytics.controller.ts
│   │       │   │   ├── analytics.service.ts      # Trends, at-risk, projections
│   │       │   │   └── analytics.service.test.ts
│   │       │   ├── import/
│   │       │   │   ├── import.route.ts           # /api/v1/import
│   │       │   │   ├── import.controller.ts
│   │       │   │   ├── import.service.ts         # Sheet parsing, column detection, preview
│   │       │   │   └── import.service.test.ts
│   │       │   ├── google/
│   │       │   │   ├── drive.service.ts          # Drive folder operations
│   │       │   │   ├── docs.service.ts           # Read docs, publish comments
│   │       │   │   ├── sheets.service.ts         # Read/write score sheets
│   │       │   │   └── google-auth.service.ts    # Token refresh, scope checking
│   │       │   ├── files/
│   │       │   │   ├── upload.route.ts           # /api/v1/files/upload
│   │       │   │   ├── upload.service.ts         # GCS streaming upload
│   │       │   │   └── gcs.ts                    # GCS client wrapper
│   │       │   └── public/
│   │       │       ├── public-assignment.route.ts  # /api/v1/public/assignments/:id
│   │       │       ├── public-submission.route.ts  # /api/v1/public/submissions
│   │       │       ├── public-report.route.ts      # /api/v1/public/reports/:token
│   │       │       └── public-results.route.ts     # /api/v1/public/results/:token
│   │       ├── utils/
│   │       │   ├── band-conversion.ts            # Raw score → IELTS band tables
│   │       │   └── errors.ts                     # Domain error classes (ScopeRequiredError, etc.)
│   │       └── test-utils/
│   │           ├── factories.ts                  # createTeacher(), createStudent(), createScore()
│   │           ├── setup.ts                      # DB cleanup between tests
│   │           └── fixtures/
│   │               └── cambridge-18-answers.json # Shared with seed script
│   │
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       ├── index.html
│       ├── public/
│       │   └── favicon.ico
│       └── src/
│           ├── main.tsx                          # React entry point
│           ├── App.tsx                           # Router setup
│           ├── api/
│           │   ├── client.ts                     # openapi-fetch client setup
│           │   └── schema.d.ts                   # Auto-generated from OpenAPI
│           ├── hooks/
│           │   ├── use-auth.ts                   # Google auth state + scope re-auth
│           │   ├── use-grading.ts                # Grading mutations + state
│           │   └── use-analytics.ts              # Dashboard data queries
│           ├── components/
│           │   ├── layout/
│           │   │   ├── AppShell.tsx              # Sidebar + main content layout
│           │   │   ├── Sidebar.tsx               # Navigation with badge counts
│           │   │   └── PublicLayout.tsx           # Layout for student/parent pages (no sidebar)
│           │   ├── grading/
│           │   │   ├── GradingInbox.tsx           # List of pending items
│           │   │   ├── WritingGrader.tsx          # Split panel: essay + suggestions
│           │   │   ├── SpeakingGrader.tsx         # Split panel: audio/transcript + suggestions
│           │   │   ├── SuggestionCard.tsx         # Accept/Edit/Reject per suggestion
│           │   │   ├── BandScoreEditor.tsx        # Editable band score fields
│           │   │   └── AudioPlayer.tsx            # Custom player with timestamp seek
│           │   ├── assignments/
│           │   │   ├── AssignmentLibrary.tsx
│           │   │   ├── CreateAssignment.tsx
│           │   │   ├── AssignToClass.tsx
│           │   │   └── QuickEntryGrid.tsx         # Paper results entry
│           │   ├── dashboard/
│           │   │   ├── DashboardHome.tsx          # Cross-class overview
│           │   │   ├── ClassOverview.tsx           # Single class analytics
│           │   │   ├── StudentProfile.tsx          # Individual student view
│           │   │   ├── BandChart.tsx               # Tremor line chart
│           │   │   ├── StatusBadge.tsx             # Improving/Plateaued/Declining
│           │   │   └── ProgressiveEmpty.tsx        # Empty states with CTAs
│           │   ├── students/
│           │   │   ├── StudentList.tsx
│           │   │   ├── ManualScoreEntry.tsx        # Single + bulk entry modals
│           │   │   └── ParentReportPreview.tsx     # Preview + share controls
│           │   ├── import/
│           │   │   ├── ImportScores.tsx            # Sheet import flow
│           │   │   ├── SheetPreview.tsx            # Column mapping + data preview
│           │   │   └── ImportConfirmation.tsx
│           │   ├── onboarding/
│           │   │   ├── WelcomePaths.tsx            # Three-path welcome screen
│           │   │   └── ClassSetup.tsx              # Traditional onboarding
│           │   ├── student/                        # Student-facing experiences
│           │   │   ├── AssignmentStart.tsx         # "Enter your name" screen
│           │   │   ├── TestTaker.tsx               # R/L split-panel test UI
│           │   │   ├── WritingSubmission.tsx        # Essay textarea + word count
│           │   │   ├── SpeakingRecorder.tsx         # Audio recorder + prep timer
│           │   │   ├── SubmissionComplete.tsx       # Post-submit confirmation
│           │   │   ├── StudentResultsView.tsx       # View graded feedback
│           │   │   └── question-types/             # Forked from ClassLite
│           │   │       ├── MCQSingle.tsx
│           │   │       ├── MCQMulti.tsx
│           │   │       ├── TrueFalseNotGiven.tsx
│           │   │       ├── YesNoNotGiven.tsx
│           │   │       ├── SentenceCompletion.tsx
│           │   │       ├── ShortAnswer.tsx
│           │   │       ├── FormNoteCompletion.tsx
│           │   │       ├── MatchingDropdown.tsx
│           │   │       └── index.ts                # Question type renderer (switch by type)
│           │   └── parent/                         # Parent-facing experiences
│           │       └── ParentReportView.tsx         # Public progress report
│           ├── lib/
│           │   ├── utils.ts                       # cn() and helpers
│           │   └── band-tables.ts                 # Client-side band conversion
│           └── styles/
│               └── globals.css                    # Tailwind imports
│
├── packages/
│   ├── db/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── prisma/
│   │   │   ├── schema.prisma                    # Full schema (teacher-scoped)
│   │   │   └── migrations/
│   │   └── src/
│   │       ├── client.ts                        # Prisma client export
│   │       └── index.ts
│   │
│   ├── types/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                          # Re-exports
│   │       ├── question-types.ts                 # Forked from ClassLite (20 types)
│   │       ├── grading.ts                        # Grading result schemas
│   │       ├── assignments.ts                    # Assignment + submission schemas
│   │       ├── scores.ts                         # Score + analytics schemas
│   │       └── auth.ts                           # Session + token schemas
│   │
│   └── ui/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── components/                       # Shadcn/UI components (preset b2v5gxmoga)
│               ├── button.tsx
│               ├── dialog.tsx
│               ├── ...
│               └── index.ts
│
└── scripts/
    ├── sync-schema.ts                           # OpenAPI → frontend types
    └── seed-cambridge-tests.ts                  # Pre-load Cambridge answer keys (shared fixture data)
```

### Feature → Directory Mapping

| Feature | Backend | Frontend |
|---|---|---|
| **Auth / Google OAuth** | `modules/auth/` + `modules/google/` | `hooks/use-auth.ts` + `components/onboarding/` |
| **AI Grading (W/S)** | `modules/grading/` | `components/grading/` |
| **Assignments (R/L/W/S)** | `modules/assignments/` | `components/assignments/` |
| **Score Import (Sheets)** | `modules/import/` | `components/import/` |
| **Student Management** | `modules/students/` | `components/students/` |
| **Classes** | `modules/classes/` | (inline in dashboard/student views) |
| **Scores / Manual Entry** | `modules/scores/` | `components/students/ManualScoreEntry.tsx` |
| **Dashboard / Analytics** | `modules/analytics/` | `components/dashboard/` |
| **Parent Reports** | `modules/public/` | `components/parent/ParentReportView.tsx` |
| **Student Test-Taking** | `modules/public/` | `components/student/TestTaker.tsx` + `question-types/` |
| **Student W/S Submission** | `modules/public/` | `components/student/WritingSubmission.tsx`, `SpeakingRecorder.tsx` |
| **File Uploads (GCS)** | `modules/files/` | (inline in grading/assignment flows) |
| **Google Drive/Docs/Sheets** | `modules/google/` | (called from grading/import flows) |

### Architectural Boundaries

**API Boundaries:**
- `/api/v1/*` — authenticated teacher endpoints (requireAuth middleware)
- `/api/v1/public/*` — unauthenticated student/parent endpoints (rate limit only)
- All endpoints return `{ data, message? }` or `{ message }` on error

**Data Boundaries:**
- `@workspace/db` is the only data access layer — no raw SQL
- All queries go through service layer, never called from routes/controllers directly
- Every service function receives `teacherId` as first parameter (for teacher-scoped queries)
- Public services receive assignment/report UUIDs instead of teacherId

**External Integration Boundaries:**
- `modules/google/` — all Google API calls isolated here (Drive, Docs, Sheets, OAuth)
- `modules/grading/prompts/` — all Gemini prompts isolated here
- `modules/files/gcs.ts` — all GCS operations isolated here
- No external API calls outside these boundaries

### Data Flow

```
Teacher (authenticated):
  Browser → Cookie → requireAuth → Controller → Service(teacherId) → Prisma(where: teacher_id)
                                                         ↓
                                                   Google APIs (via modules/google/)
                                                   Gemini API (via modules/grading/)
                                                   GCS (via modules/files/)

Student (public):
  Browser → rateLimit → Controller → Service(assignmentId) → Prisma(where: assignment UUID)
                                         ↓
                                   Submission saved → appears in teacher's grading inbox

Parent (public):
  Browser → rateLimit → Controller → Service(reportToken) → Prisma(where: report UUID)
```

## Architecture Validation Results

### Coherence Validation ✅

- All technology choices compatible (Fastify + Prisma + Google OAuth + Gemini + TanStack + Tremor)
- Implementation patterns align with stack (Zod end-to-end, Route→Controller→Service)
- Project structure supports all architectural boundaries
- No contradictory decisions found

### Requirements Coverage ✅

All 6 product spec features + 14 edge cases have clear architectural homes:
- AI Grading → modules/grading/ + modules/google/ + modules/files/
- Assignments → modules/assignments/ + modules/public/ + components/student/
- Analytics → modules/analytics/ + Tremor charts in components/dashboard/
- Parent Reports → modules/public/ + components/parent/
- Progressive Onboarding → nullable class_id pattern + modules/import/
- Manual Scores → modules/scores/

### Implementation Readiness ✅

- All critical decisions documented with rationale
- 7 implementation patterns with code examples
- 10 enforcement rules with anti-patterns
- Complete directory structure with feature mapping
- Clear data flow for all 3 security contexts

### Gap Analysis

**No critical gaps.**

**Important (address in first implementation sprint):**
- Prisma schema needs to be designed (models, relationships, indexes)
- Cambridge answer key seed data needs to be sourced and formatted

**Deferred (post-MVP):**
- CI/CD pipeline
- Staging environment
- APM/monitoring (Sentry)
- Email notifications
- Payment processing

### Architecture Completeness Checklist

- [x] Project context analyzed with requirements extracted
- [x] Standalone repo decision with rationale
- [x] Full technology stack specified (Fastify, Prisma, React, Vite, Tremor, Shadcn)
- [x] Authentication architecture (Google OAuth direct, DB sessions, incremental scopes)
- [x] Data architecture (PostgreSQL, GCS, teacher-scoped isolation)
- [x] API architecture (REST, OpenAPI, Zod, public vs authenticated)
- [x] Frontend architecture (React Router, TanStack Query, Tremor, MediaRecorder)
- [x] Infrastructure (Railway, production-only, GCS bucket)
- [x] Implementation patterns with 7 code examples
- [x] 10 enforcement rules with anti-patterns
- [x] Complete project structure with 50+ files mapped
- [x] Feature → directory mapping for all 12 feature areas
- [x] Data flow diagrams for all 3 security contexts

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Minimal stack — 4 core dependencies, no over-engineering
- Proven patterns — inherited from battle-tested ClassLite conventions
- Clear boundaries — teacher-scoped isolation enforced with compound where + required tests
- Progressive data model — supports cold-start strategy from day one

**Implementation Sequence:**
1. Repo scaffolding + Prisma schema + DB on Railway
2. Google OAuth flow (login + session + tokens)
3. AI grading endpoint (fork ClassLite prompts + Gemini integration)
4. Grading UI (split panel, suggestion review, publish to Doc)
5. Score storage + basic dashboard (Tremor charts)
6. Assignment library + student submission views
7. Parent reports
