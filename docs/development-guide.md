# Development Guide

**Generated:** 2026-03-20 | **Scan Level:** Exhaustive

---

## Prerequisites

- **Node.js:** >= 20 (LTS)
- **pnpm:** 10.4.1 (`corepack enable && corepack prepare pnpm@10.4.1`)
- **Docker:** For local PostgreSQL + Firebase Emulator
- **Firebase CLI:** `npm install -g firebase-tools` (for auth emulator)

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Start local infrastructure (Postgres + Firebase Emulator)
docker compose up -d postgres firebase-emulator

# 3. Set up environment
cp apps/backend/.env.example apps/backend/.env
# Edit .env with your credentials

# 4. Apply database migrations
pnpm --filter=db db:migrate:dev

# 5. Start development (all services)
pnpm dev
# Starts: backend (4000), webapp (5173), website (4321), Inngest Dev Server
```

## Environment Variables

### Backend (`apps/backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `PORT` | No | Server port (default: 4000) |
| `NODE_ENV` | No | development / production |
| `FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `FIREBASE_PRIVATE_KEY` | Yes | Firebase service account key |
| `FIREBASE_CLIENT_EMAIL` | Yes | Firebase service account email |
| `FIREBASE_STORAGE_BUCKET` | Yes | Firebase storage bucket |
| `FIREBASE_API_KEY` | No | Web API key (for password verification) |
| `RESEND_API_KEY` | Yes | Email service API key |
| `PLATFORM_ADMIN_API_KEY` | Yes | Platform admin key |
| `EMAIL_FROM` | No | From address for emails |
| `GEMINI_API_KEY` | No | Google Gemini for AI features |
| `GEMINI_MODEL` | No | AI model override (default: gemini-2.0-flash) |
| `POLAR_ACCESS_TOKEN` | No | Polar.sh billing integration |
| `POLAR_WEBHOOK_SECRET` | No | Webhook signature verification |
| `POLAR_PRODUCT_ID_*` | No | Product IDs for billing tiers |
| `FRONTEND_URL` | No | Frontend URL for emails |

## Development Commands

### Root

```bash
pnpm dev                              # Start all services (Turbo + Inngest)
pnpm build                            # Build all packages + apps
pnpm lint                             # Lint all packages
pnpm test                             # Run all unit tests
pnpm format                           # Prettier formatting
```

### Backend (`apps/backend`)

```bash
pnpm --filter=backend dev              # Start backend (tsc-watch → node)
pnpm --filter=backend test             # Run all tests (unit + integration)
pnpm --filter=backend test -- --run --exclude "**/*.integration.test.ts"  # Unit only
pnpm --filter=backend build            # TypeScript compile
```

### Frontend (`apps/webapp`)

```bash
pnpm --filter=webapp dev               # Vite dev server (port 5173)
pnpm --filter=webapp build             # Production build
pnpm --filter=webapp test              # Run Vitest tests
pnpm --filter=webapp test:watch        # Watch mode
pnpm --filter=webapp sync-schema-dev   # Regenerate OpenAPI types (backend must be running)
pnpm --filter=webapp typecheck         # TypeScript type check
```

### Database (`packages/db`)

```bash
pnpm --filter=db db:generate           # Generate Prisma client
pnpm --filter=db db:migrate:dev        # Create + apply migration locally
pnpm --filter=db db:migrate:create --name <desc>  # Generate migration SQL only
pnpm --filter=db db:migrate:deploy     # Apply pending migrations (CI/prod)
pnpm --filter=db db:migrate:status     # Check migration status
pnpm --filter=db db:studio             # Open Prisma Studio GUI
pnpm --filter=db build                 # Generate + compile + copy
pnpm --filter=db test                  # Run DB tests
```

### Website (`apps/website`)

```bash
pnpm --filter=website dev              # Astro dev server
pnpm --filter=website build            # Static site build
pnpm --filter=website preview          # Preview built site
```

### E2E Tests (`apps/e2e`)

```bash
pnpm test:e2e                          # Run all E2E tests
pnpm test:e2e:chromium                 # Chromium only
pnpm test:e2e:ui                       # Playwright UI mode
pnpm test:e2e:headed                   # Headed browser
pnpm test:e2e:seed                     # Seed test data
pnpm test:e2e:run                      # Full orchestration (start services + run tests)
```

## Database Workflow

### Creating a Migration

1. Modify `packages/db/prisma/schema.prisma`
2. Run: `pnpm --filter=db db:migrate:dev --name <description>`
3. Migration SQL generated in `packages/db/prisma/migrations/`
4. Commit migration + code changes together
5. `db:migrate:deploy` runs automatically on staging/production start

### Important Rules

- **NEVER** use `db:push` -- it is deprecated for prototyping only
- **NEVER** use bare `npx prisma` -- always use `pnpm --filter=db` prefix
- Prisma Migrate does not support down migrations -- create corrective migrations instead
- Always add `@@map("snake_case_name")` to new models
- Always add `@map("snake_case")` to field names

## Schema Sync (Frontend Types)

After adding or modifying backend routes:

```bash
# 1. Ensure backend is running
pnpm --filter=backend dev

# 2. Regenerate frontend types
pnpm --filter=webapp sync-schema-dev
# Generates: apps/webapp/src/schema/schema.d.ts
```

**NEVER** edit `schema.d.ts` directly.

## Adding UI Components

```bash
pnpm dlx shadcn@latest add <component> -c apps/webapp
```

Components are installed to `packages/ui/src/components/`.

## Testing Strategy

### Unit Tests (Vitest)
- Co-located with source files (`.test.ts` / `.test.tsx`)
- Backend: `pnpm --filter=backend test`
- Webapp: `pnpm --filter=webapp test`
- DB: `pnpm --filter=db test`

### Integration Tests (Vitest + PostgreSQL)
- Backend files with `.integration.test.ts` suffix
- Require running PostgreSQL (CI uses service container)
- Use `buildApp()` to spin up real Fastify instance

### E2E Tests (Playwright)
- Located in `apps/e2e/tests/`
- Run against full stack (backend + webapp + Inngest)
- Firebase Auth Emulator for isolated auth
- 3 browsers: Chromium, Firefox, Mobile Chrome (Pixel 5)

## Code Conventions

### Architecture
- **Backend:** Route → Controller → Service pattern (feature-first modules)
- **Frontend:** Feature-first with co-located components, hooks, and tests

### Naming
- **API URLs:** `kebab-case` (`/api/v1/grading-jobs`)
- **DB Models:** PascalCase in Prisma, snake_case in DB
- **Components:** PascalCase (`GradingWorkbench.tsx`)
- **Utilities:** kebab-case (`date-utils.ts`)
- **Zod Schemas:** PascalCase with Schema suffix (`UserSchema`)

### Error Handling
- Services/Controllers throw `AppError` (custom error class)
- Route layer catches and maps to HTTP status codes
- Frontend handles via `onError` callbacks + Toast notifications

### Imports
- Internal: Relative (`./utils`)
- External: Path aliases (`@/lib/db`, `@workspace/types`)
- Cross-app imports forbidden

### Commits
- Format: Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`)
- Scope: Optional (`feat(grading): add comment anchoring`)

### Branching
- Feature: `feat/description`
- Fix: `fix/issue-id-description`
- Main branch: `master` (production)
- Dev branch: `develop` (staging)
- Flow: `feature → develop → master`

## CI/CD Pipeline

### GitHub Actions (`.github/workflows/ci.yml`)

| Job | Description |
|-----|-------------|
| **lint** | ESLint across monorepo |
| **typecheck** | TypeScript type checking (webapp) |
| **build-website** | Astro build verification |
| **test-unit** | Vitest (webapp + backend unit tests) |
| **test-integration** | PostgreSQL service + migrations + integration tests |

### Railway Deployment

| Environment | Branch | URL |
|-------------|--------|-----|
| Staging | `develop` | `my-staging.classlite.app` |
| Production | `master` | `my.classlite.app` / `api.classlite.app` |

- Auto-deploys on push to branch
- Waits for CI checks to pass
- Backend runs `prisma migrate deploy` on start (via `prestart` script)
