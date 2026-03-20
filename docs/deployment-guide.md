# Deployment Guide

**Generated:** 2026-03-20 | **Scan Level:** Exhaustive

---

## Infrastructure Overview

| Component | Provider | Service |
|-----------|----------|---------|
| **Backend API** | Railway | Node.js service (Fastify) |
| **Webapp SPA** | Railway | Static site (Nginx) |
| **Website** | Railway | Static site (Nginx) |
| **Database** | Railway | PostgreSQL 16 |
| **Auth** | Firebase | Firebase Authentication |
| **File Storage** | Firebase | Cloud Storage |
| **Background Jobs** | Inngest | Inngest Cloud |
| **Email** | Resend | Transactional email |
| **Billing** | Polar.sh | Subscription management |
| **AI** | Google | Gemini API |
| **CI** | GitHub Actions | Lint, typecheck, test |

## Environments

| Environment | Branch | URLs | Database |
|-------------|--------|------|----------|
| **Production** | `master` | `my.classlite.app` (webapp), `api.classlite.app` (API) | Railway Postgres (prod) |
| **Staging** | `develop` | `my-staging.classlite.app` | Railway Postgres (staging) |
| **Local** | - | `localhost:5173` (webapp), `localhost:4000` (API) | Docker Postgres |

## Promotion Flow

```
feature branch → PR → develop (auto-deploy staging) → PR → master (auto-deploy production)
```

1. Create branch from `develop`, open PR back to `develop`
2. Merge to `develop` -- Railway auto-deploys to staging
3. Merge `develop` to `master` -- Railway auto-deploys to production
4. Railway waits for all CI checks to pass before deploying

## Docker Configuration

### Backend (`apps/backend/Dockerfile`)
- Base: Node 20 Alpine
- Build: `pnpm install` → `pnpm build`
- Runtime: `pnpm --filter=backend start` (runs `prisma migrate deploy` via `prestart`)
- Port: 4000

### Webapp (`apps/webapp/Dockerfile`)
- Base: Node 20 Alpine
- Build: `pnpm install` → `vite build`
- Build args: `VITE_API_URL`, Firebase config vars
- Runtime: Nginx Alpine with SPA routing (`try_files $uri /index.html`)
- Port: 80

### Website (`apps/website/Dockerfile`)
- Base: Node 20 Alpine
- Build: `pnpm install` → `astro build`
- Runtime: Nginx Alpine
- Port: 80

### Local Development (`docker-compose.yml`)
- **postgres**: PostgreSQL 16 (port 5432)
- **firebase-emulator**: Firebase Auth Emulator (port 9099, UI 4001)
- **backend**: Fastify API (port 4000)
- **webapp**: Nginx SPA (port 80)

## Database Migrations

Migrations run automatically on backend start via `prestart` script:

```json
"prestart": "prisma migrate deploy"
```

- **Local:** `pnpm --filter=db db:migrate:dev`
- **CI:** `pnpm --filter=db db:migrate:deploy`
- **Staging/Production:** Runs on container start (Railway)

## CI/CD Pipeline

### GitHub Actions (`.github/workflows/ci.yml`)

Triggered on push/PR to `main`, `master`, `develop`.

```
lint → (parallel) → typecheck, build-website, test-unit, test-integration
```

**Integration Tests:**
- PostgreSQL 16 service container
- Shadow database for migration diff verification
- Runs `prisma migrate deploy` → backend integration tests

## Security Configuration

| Feature | Implementation |
|---------|---------------|
| **CORS** | Whitelist: `my.classlite.app`, `my-staging.classlite.app` |
| **Rate Limiting** | 100 req/min per IP (production), 10000 (dev) |
| **Helmet** | CSP headers, frame protection, HSTS |
| **Auth** | Firebase JWT verification on every authenticated route |
| **RBAC** | Role middleware (Owner/Admin/Teacher/Student) |
| **Tenancy** | Prisma Extension auto-injects `centerId` |
| **Login Protection** | 5 failed attempts → 15 min lockout |
| **Webhook Verification** | HMAC signature for Polar.sh webhooks |
| **Encryption** | SSL via Railway custom domains (automatic) |
| **DB Backups** | Railway automated daily backups (production) |

## Health Check

```
GET /api/v1/health
```

Returns `200` with `{status, timestamp, version}` or `503` if DB unreachable.

## Background Jobs (Inngest)

14 Inngest functions handle async processing:

| Function | Trigger | Purpose |
|----------|---------|---------|
| `analyzeSubmissionJob` | Submission created | AI grading via Gemini |
| `questionGenerationJob` | Teacher request | AI question generation |
| `sessionEmailNotificationJob` | Schedule change | Notify participants |
| `sessionCancellationEmailJob` | Session cancelled | Cancellation emails |
| `userDeletionJob` | Deletion request | Async user + Firebase cleanup |
| `csvImportJob` | Import executed | Process CSV rows |
| `parentWelcomeEmailJob` | Parent added | Welcome email |
| `interventionEmailJob` | Intervention created | Send concern email |
| `engagementNotificationJob` | Achievement | Engagement notification |
| `snapshotStudentCountJob` | Monthly cron | Student count for billing |
| `processPolarWebhookJob` | Webhook received | Async webhook processing |
| `billingReminderJob` | 7 days before renewal | Payment reminder email |
| `enforceGracePeriodJob` | Grace period expired | Restrict enrollments |

## Firebase Configuration

- **Separate projects** for staging and production
- **Auth Emulator** for local development (port 9099)
- **Custom Claims:** `role` and `centerId` set via Admin SDK on login
- **Storage:** Used for exercise media (audio, images, avatars)

## Monitoring

- **Health endpoint:** `GET /api/v1/health`
- **Logging:** Pino logger (structured JSON in production)
- **Error tracking:** Application-level error handler in Fastify
- **Inngest dashboard:** Background job monitoring via Inngest Cloud console
