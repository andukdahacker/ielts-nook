# Architecture Documentation

**Generated:** 2026-03-20 | **Scan Level:** Exhaustive

---

## Executive Summary

ClassLite is a multi-tenant B2B SaaS IELTS LMS built as a TypeScript monorepo. The architecture follows a feature-first modular pattern with a layered backend (Route → Controller → Service), React SPA frontend with TanStack Query for server state, and Prisma ORM with custom extensions for tenant isolation. Background processing is handled by Inngest, AI features by Google Gemini, and billing by Polar.sh.

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Orchestration** | Turborepo + pnpm | Monorepo build pipeline |
| **Backend** | Fastify 5 + Zod | REST API with schema validation |
| **Frontend** | React 19 + Vite 7 | Single-page application |
| **Marketing** | Astro 5 | Static marketing site |
| **Database** | PostgreSQL 16 + Prisma 7 | Data persistence + ORM |
| **Auth** | Firebase Auth | Identity + JWT tokens |
| **State** | TanStack Query v5 | Server state + offline cache |
| **UI** | shadcn/ui + Tailwind 4 | Component library |
| **Validation** | Zod 4 | Runtime + compile-time type safety |
| **Background** | Inngest | Durable serverless functions |
| **AI** | Google Gemini | Grading + question generation |
| **Email** | Resend | Transactional notifications |
| **Billing** | Polar.sh | Subscription management |
| **Testing** | Vitest + Playwright | Unit, integration, E2E |

## Architectural Patterns

### 1. Multi-Tenancy (Logical Isolation)

Every tenant-scoped model has a `centerId` column. A Prisma Client Extension (`getTenantedClient`) automatically injects `where: { centerId }` into all 33 tenanted models.

**Rules:**
- NEVER use `new PrismaClient()` directly -- use `getTenantedClient(prisma, centerId)`
- NEVER call `getTenantedClient()` inside `$transaction()` -- use `tx` client with explicit `centerId` filters
- Application-level enforcement (no database RLS)

### 2. Layered Backend (Route → Controller → Service)

```
Route (Fastify-specific)
  ├── Extracts params/body/query from request
  ├── Calls controller
  └── Maps errors to HTTP status codes

Controller (Pure business orchestration)
  ├── Coordinates services
  ├── Formats response { data, message }
  └── Throws domain errors (AppError)

Service (Data access)
  ├── Interacts with DB via Prisma
  ├── Returns raw data
  └── No HTTP awareness
```

### 3. Feature-First Organization

Backend modules and frontend features are organized by domain, not type:

```
modules/grading/           # Backend
  ├── grading.routes.ts
  ├── grading.controller.ts
  ├── grading.service.ts
  ├── grading.service.test.ts
  └── jobs/

features/grading/          # Frontend
  ├── GradingQueuePage.tsx
  ├── components/
  ├── hooks/
  └── __tests__/
```

### 4. Type Safety Pipeline

```
Zod schemas (packages/types)
  → Fastify route validation (fastify-type-provider-zod)
  → OpenAPI spec generation (@fastify/swagger)
  → TypeScript types (openapi-typescript)
  → Type-safe API client (openapi-fetch)
```

### 5. Offline-First Submissions

```
Student types answer → Auto-save to IndexedDB (3s interval)
  → Network available? → PATCH to server
  → Network down? → Queue locally, show "Saved Locally" banner
  → Network restored? → Auto-sync queued mutations
```

### 6. AI Integration (Inngest)

Long-running AI tasks are offloaded to background jobs:

```
HTTP Request → inngest.send(event) → Inngest Cloud → Worker Function → DB Update
```

Prevents browser timeouts for Gemini calls (30s+).

## RBAC Model

| Role | Scope |
|------|-------|
| **OWNER** | Full CRUD on everything within their center |
| **ADMIN** | Same as Owner except role management |
| **TEACHER** | CRUD exercises/assignments, grade own classes, read-only admin |
| **STUDENT** | Submit work, view own grades/assignments, read-only schedule |

Enforced at:
- **Route level:** `requireRole([OWNER, ADMIN])` preHandler
- **Service level:** Teacher class ownership checks, student submission ownership
- **Frontend:** `<RBACWrapper requiredRole="ADMIN">` component

## Error Handling

### Backend

```typescript
// Service/Controller throws:
AppError.notFound("Student not found")
AppError.conflict("Email already exists")
AppError.forbidden("Not authorized")

// Route catches and maps:
catch (error) {
  if (error instanceof AppError) {
    reply.status(error.statusCode).send({ message: error.message })
  }
}

// Prisma errors auto-mapped:
P2025 → 404 NOT_FOUND
P2002 → 409 CONFLICT
P2003 → 400 BAD_REQUEST
```

### Frontend

```typescript
// React Query onError:
useMutation({
  onError: (error) => toast.error(error.message)
})
```

## API Design

- **Protocol:** REST
- **Format:** JSON
- **Auth:** Firebase ID Token (`Authorization: Bearer {token}`)
- **Versioning:** URL prefix (`/api/v1/`)
- **Naming:** kebab-case URLs, snake_case query params
- **Response:** `{ data: T, message: string }`
- **Validation:** Zod schemas on request body/params/query
- **Documentation:** Auto-generated OpenAPI at `/documentation`

## Data Architecture

- **Database:** PostgreSQL 16 (Railway managed)
- **ORM:** Prisma 7 with PrismaPg adapter
- **Models:** 45+ models across 8 domain groups
- **Tenancy:** 33 models scoped by `centerId`
- **Migrations:** SQL-based (Prisma Migrate), no down migrations
- **Conventions:** PascalCase models → snake_case tables/columns via `@@map`/`@map`

## Infrastructure

- **Host:** Railway (Docker-based)
- **SSL:** Automatic via Railway custom domains
- **DB Backups:** Railway automated daily backups (production)
- **CI:** GitHub Actions (lint, typecheck, test-unit, test-integration)
- **CD:** Railway auto-deploy (develop → staging, master → production)
- **Monitoring:** Health check endpoint + Pino structured logging

## Security Measures

1. **Firebase JWT** verification on every authenticated request
2. **RBAC middleware** on all routes
3. **Tenant isolation** via Prisma Extension (33 models)
4. **Rate limiting:** 100 req/min per IP (production)
5. **Helmet:** CSP, HSTS, frame protection
6. **CORS:** Whitelist production/staging domains only
7. **Login protection:** 5 failed attempts → 15 min lockout
8. **Webhook verification:** HMAC for Polar.sh
9. **Input validation:** Zod on all request inputs
10. **No `any` types:** TypeScript strict mode enforced
