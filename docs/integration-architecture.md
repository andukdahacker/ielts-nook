# Integration Architecture

**Generated:** 2026-03-20 | **Scan Level:** Exhaustive

---

## System Architecture Overview

```
                                    ┌─────────────────┐
                                    │   Firebase Auth  │
                                    │  (ID Tokens +    │
                                    │  Custom Claims)  │
                                    └────────┬────────┘
                                             │
                     ┌───────────────────────┼───────────────────────┐
                     │                       │                       │
              ┌──────┴──────┐         ┌──────┴──────┐         ┌─────┴──────┐
              │   Webapp    │         │   Website   │         │   Mobile   │
              │  React SPA  │         │    Astro    │         │  (Future)  │
              │  Vite + RQ  │         │  Static SSG │         │            │
              └──────┬──────┘         └─────────────┘         └────────────┘
                     │
                     │ REST API (openapi-fetch)
                     │ Bearer Token Auth
                     │
              ┌──────┴──────┐
              │   Backend   │──────────── Inngest Cloud ──────┐
              │   Fastify   │             (Background Jobs)   │
              │  Zod + OAS  │                                 │
              └──────┬──────┘                                 │
                     │                                        │
           ┌─────────┼─────────┐                    ┌────────┴────────┐
           │         │         │                    │  Inngest Worker  │
    ┌──────┴──┐  ┌───┴───┐  ┌─┴──────┐           │  (14 functions)  │
    │ Prisma  │  │ Resend│  │ Polar  │           │  AI, Email, etc  │
    │ PG16    │  │ Email │  │ .sh    │           └────────┬─────────┘
    │(Railway)│  │       │  │Billing │                    │
    └─────────┘  └───────┘  └────────┘           ┌───────┴────────┐
                                                  │  Google Gemini │
                                                  │  (AI Grading + │
                                                  │   Generation)  │
                                                  └────────────────┘
```

## Part-to-Part Communication

### Webapp → Backend

| Aspect | Detail |
|--------|--------|
| **Protocol** | REST (JSON over HTTPS) |
| **Client** | `openapi-fetch` (type-safe, generated from OpenAPI spec) |
| **Auth** | Firebase ID Token in `Authorization: Bearer {token}` header |
| **Base URL** | `VITE_API_URL` environment variable |
| **State** | TanStack Query v5 (server state caching, offline support) |
| **Offline** | IndexedDB for submission answer persistence (`idb-keyval`) |

### Backend → Database

| Aspect | Detail |
|--------|--------|
| **ORM** | Prisma with PrismaPg adapter |
| **Connection** | PostgreSQL via `DATABASE_URL` |
| **Tenancy** | `getTenantedClient(prisma, centerId)` auto-injects tenant filter |
| **Migrations** | Prisma Migrate (SQL-based, committed to repo) |
| **Transactions** | `$transaction()` with explicit `centerId` where clauses |

### Backend → Firebase

| Aspect | Detail |
|--------|--------|
| **Admin SDK** | JWT verification, custom claims management |
| **Storage** | File uploads (exercise audio, diagrams, avatars) |
| **Auth Emulator** | `FIREBASE_AUTH_EMULATOR_HOST` env var for local dev |

### Backend → Inngest

| Aspect | Detail |
|--------|--------|
| **Pattern** | API sends event → Inngest routes to function → function calls back |
| **Entry** | `POST /api/inngest` webhook handler |
| **Functions** | 14 registered functions for async processing |
| **DB Access** | Standalone `createPrisma()` (not Fastify plugin) |

### Backend → External Services

| Service | Integration | Purpose |
|---------|-------------|---------|
| **Google Gemini** | `@google/genai` SDK | AI grading feedback + question generation |
| **Resend** | Resend SDK | Transactional email (invitations, interventions, billing) |
| **Polar.sh** | `@polar-sh/sdk` | Subscription billing, checkout, webhooks |

### Webapp → Firebase (Client)

| Aspect | Detail |
|--------|--------|
| **SDK** | Firebase Client SDK (`firebase` package) |
| **Auth** | `signInWithEmailAndPassword`, `signInWithPopup` (Google) |
| **Token** | `getIdToken()` → attached to API requests |
| **Sync** | On auth state change → call backend `/auth/login` to sync claims |

## Shared Package Dependencies

```
                    ┌──────────────────┐
                    │  packages/types  │  Zod schemas (22 files)
                    │  @workspace/types│  Shared API contracts
                    └────────┬─────────┘
                             │
                    ┌────────┼────────┐
                    │        │        │
             ┌──────┴──┐ ┌──┴───┐ ┌──┴─────┐
             │ backend │ │webapp│ │  e2e   │
             └─────────┘ └──┬───┘ └────────┘
                            │
                    ┌───────┴────────┐
                    │  packages/ui   │  40+ shadcn components
                    │  @workspace/ui │  Radix + Tailwind
                    └────────────────┘
                            │
                    ┌───────┴────────┐
                    │  packages/db   │  Prisma schema + client
                    │  @workspace/db │  Tenanted client extension
                    └────────────────┘
```

### Dependency Flow

- **`@workspace/types`** → Used by: backend, webapp, e2e
- **`@workspace/ui`** → Used by: webapp, website
- **`@workspace/db`** → Used by: backend, e2e
- **`@workspace/eslint-config`** → Used by: all packages and apps
- **`@workspace/typescript-config`** → Used by: all packages and apps

## Data Flow Patterns

### 1. Student Submission Flow

```
Student (Webapp)
  → Auto-save to IndexedDB every 3s
  → POST /student/submissions (start)
  → PATCH /student/submissions/:id/answers (save progress)
  → POST /student/submissions/:id/submit (final)
    → Backend: Update status to SUBMITTED
    → Backend: inngest.send("submission.created")
      → Inngest: AI analysis via Gemini
      → Inngest: Update GradingJob + SubmissionFeedback
```

### 2. Teacher Grading Flow

```
Teacher (Webapp)
  → GET /grading/submissions (queue with filters)
  → GET /grading/submissions/:id (detail + feedback)
  → Teacher reviews AI suggestions:
    → PATCH feedback/items/:id (accept/reject)
    → POST comments (add teacher comment)
  → POST /grading/submissions/:id/finalize
    → Backend: Auto-approve remaining PENDING items
    → Backend: Mark submission as GRADED
    → Backend: Trigger engagement check
    → Returns next submission ID for auto-advance
```

### 3. Billing Webhook Flow

```
Polar.sh
  → POST /billing/webhooks/polar (HMAC verified)
  → Backend: Validate signature
  → Backend: inngest.send("polar.webhook.received")
    → Inngest: Process webhook (idempotent)
    → Inngest: Upsert subscription status
    → Inngest: Create BillingEvent record
```

### 4. CSV Import Flow

```
Admin (Webapp)
  → POST /users/import/validate (upload CSV)
    → Backend: Parse + validate rows
    → Return validation results
  → POST /users/import/execute (confirm)
    → Backend: Create CsvImportLog
    → Backend: inngest.send("csv.import.started")
      → Inngest: Process rows in batches
      → Inngest: Create Firebase users
      → Inngest: Send invitation emails
    → Frontend: Poll GET /users/import/status/:id
```

## Security Boundaries

| Boundary | Enforcement |
|----------|-------------|
| **Auth** | Firebase JWT verification in auth middleware |
| **RBAC** | `requireRole()` preHandler on every route |
| **Tenancy** | Prisma Extension auto-injects `centerId` |
| **Teacher Access** | Teachers only see submissions from own classes |
| **Student Ownership** | Students only access own submissions/profile |
| **Webhook Auth** | HMAC signature verification for Polar webhooks |
| **Rate Limiting** | 100 req/min per IP (production) |

## OpenAPI Schema Generation Flow

```
Zod schemas (packages/types)
  → Fastify routes (fastify-type-provider-zod)
  → @fastify/swagger (OpenAPI JSON at /documentation/json)
  → openapi-typescript (sync-schema-dev command)
  → apps/webapp/src/schema/schema.d.ts
  → openapi-fetch client (type-safe API calls)
```
