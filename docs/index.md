# ClassLite - Project Documentation Index

**Generated:** 2026-03-20 | **Scan Level:** Exhaustive | **Mode:** Initial Scan

---

## Project Overview

- **Type:** Monorepo with 9 parts (4 apps, 5 packages)
- **Primary Language:** TypeScript (strict mode)
- **Architecture:** Multi-tenant SaaS (logical isolation), feature-first modules, layered backend
- **Domain:** B2B EdTech -- IELTS learning management platform
- **Deployment:** Railway (Docker) with GitHub CI/CD

## Quick Reference

### Backend (`apps/backend`)
- **Type:** `backend`
- **Tech Stack:** Fastify 5, Prisma 7, Firebase Admin, Inngest, Zod 4
- **Entry:** `src/index.ts`
- **Root:** `apps/backend/`

### Webapp (`apps/webapp`)
- **Type:** `web`
- **Tech Stack:** React 19, Vite 7, TanStack Query 5, React Router, shadcn/ui
- **Entry:** `src/main.tsx`
- **Root:** `apps/webapp/`

### Website (`apps/website`)
- **Type:** `web`
- **Tech Stack:** Astro 5, React, Tailwind CSS
- **Root:** `apps/website/`

### E2E Tests (`apps/e2e`)
- **Type:** test suite
- **Tech Stack:** Playwright
- **Root:** `apps/e2e/`

### Database (`packages/db`)
- **Type:** `library`
- **Tech Stack:** Prisma Client 7, PrismaPg adapter
- **Key:** Tenanted client extension (33 models)

### Shared Types (`packages/types`)
- **Type:** `library`
- **Tech Stack:** Zod 4 (22 schema files)

### UI Library (`packages/ui`)
- **Type:** `library`
- **Tech Stack:** shadcn/ui, Radix, Tailwind CSS (40+ components)

---

## Generated Documentation

- [Project Overview](./project-overview.md) -- Executive summary, tech stack, feature list
- [Architecture](./architecture.md) -- Architectural decisions, patterns, boundaries, security
- [Source Tree Analysis](./source-tree-analysis.md) -- Complete annotated directory structure
- [API Contracts](./api-contracts.md) -- All REST endpoints with auth/role requirements
- [Data Models](./data-models.md) -- Database schema, relationships, multi-tenancy
- [Development Guide](./development-guide.md) -- Setup, commands, conventions, testing
- [Deployment Guide](./deployment-guide.md) -- Railway deployment, CI/CD, infrastructure
- [Integration Architecture](./integration-architecture.md) -- Part communication, data flows
- [Component Inventory](./component-inventory.md) -- UI components, feature components, hooks

## Existing Documentation

- [README.md](../README.md) -- Project overview and quick start
- [project-context.md](../project-context.md) -- Critical AI agent rules and patterns
- [CLAUDE.md](../CLAUDE.md) -- AI coding assistant instructions
- [CI Pipeline](../.github/workflows/ci.yml) -- GitHub Actions configuration
- [Docker Compose](../docker-compose.yml) -- Local development stack

## Planning Artifacts

- [PRD](../_bmad-output/planning-artifacts/prd.md) -- Product requirements (53 FRs, 11 NFRs)
- [Architecture Decisions](../_bmad-output/planning-artifacts/architecture.md) -- Architectural decision document
- [UX Design](../_bmad-output/planning-artifacts/ux-design-specification.md) -- UX patterns, component strategy
- [Epics & Stories](../_bmad-output/planning-artifacts/epics.md) -- Implementation stories

## Getting Started

```bash
# Install dependencies
pnpm install

# Start local infrastructure
docker compose up -d postgres firebase-emulator

# Set up environment
cp apps/backend/.env.example apps/backend/.env

# Apply database migrations
pnpm --filter=db db:migrate:dev

# Start all services
pnpm dev
```

**Backend:** http://localhost:4000 | **Webapp:** http://localhost:5173 | **API Docs:** http://localhost:4000/documentation
