# ClassLite - Project Overview

**Generated:** 2026-03-20
**Scan Level:** Exhaustive
**Repository Type:** Monorepo (pnpm + Turborepo)

---

## Executive Summary

ClassLite is a B2B SaaS Learning Management System (LMS) tailored for small to medium-sized IELTS centers in Vietnam. It unifies administrative logistics (scheduling, rosters) and pedagogical delivery (AI-assisted grading, exercise building) into a single platform. The core vision is **"High-Velocity Pedagogy"** -- automating 80% of grading through an AI-assisted workbench while keeping teachers in full editorial control.

## Target Users

| Persona | Role | Core Need |
|---------|------|-----------|
| **Teaching Owner** | Center owner who teaches | "Clarity & Calm" -- instant visibility into student/business health |
| **Expert Teacher** | Experienced educator | "Respect & Support" -- AI drafts feedback, teacher validates in < 3 min |
| **Student** | Learner | "Safe & Seen" -- offline-proof, mobile-first submission experience |
| **Center Admin** | Operations staff | "Operational Efficiency" -- scheduling, rosters, resources |

## Architecture Type

- **Pattern:** Multi-tenant SaaS with logical data isolation (discriminator column `centerId`)
- **Style:** Feature-first modular architecture with layered backend (Route -> Controller -> Service)
- **Deployment:** Railway (Docker-based) with GitHub auto-deploy

## Technology Stack Summary

| Category | Technology | Version |
|----------|-----------|---------|
| **Monorepo** | Turborepo + pnpm | turbo 2.4, pnpm 10.4 |
| **Language** | TypeScript (strict mode) | 5.7+ |
| **Runtime** | Node.js | >= 20 (LTS) |
| **Backend** | Fastify | 5.5+ |
| **Frontend** | React + Vite | React 19, Vite 7 |
| **Marketing Site** | Astro | 5.x |
| **Database** | PostgreSQL | 16 |
| **ORM** | Prisma (PrismaPg adapter) | 7.x |
| **Auth** | Firebase Auth (Admin + Client SDK) | 13.x |
| **State** | TanStack Query v5 | 5.x |
| **UI Library** | shadcn/ui (Radix + Tailwind) | Latest |
| **Styling** | Tailwind CSS | 4.x |
| **Validation** | Zod | 4.x |
| **Forms** | React Hook Form | 7.x |
| **Background Jobs** | Inngest | 3.x |
| **AI** | Google Gemini API | Latest |
| **Email** | Resend | 6.x |
| **Billing** | Polar.sh | 0.45+ |
| **E2E Testing** | Playwright | 1.50+ |
| **Unit Testing** | Vitest | 4.x |
| **File Storage** | Firebase Cloud Storage | - |

## Repository Structure

```
classlite/                           # Monorepo root
├── apps/
│   ├── backend/                     # Fastify API server (~150 TS files, ~15K LOC)
│   ├── webapp/                      # React SPA (~200+ TS/TSX files)
│   ├── website/                     # Astro marketing site
│   └── e2e/                         # Playwright E2E tests (20+ test files)
├── packages/
│   ├── db/                          # Prisma schema + tenanted client (45+ models)
│   ├── types/                       # Shared Zod schemas (22 files)
│   ├── ui/                          # shadcn component library (40+ components)
│   ├── eslint-config/               # Shared ESLint config
│   └── typescript-config/           # Shared TSConfig presets
├── scripts/                         # E2E orchestration scripts
├── docker-compose.yml               # Local dev (Postgres + Firebase Emulator)
├── turbo.json                       # Build pipeline config
└── pnpm-workspace.yaml              # Workspace definition
```

## Key Features (Implemented)

1. **Authentication & RBAC** -- Firebase Auth with custom claims, 4 roles (Owner/Admin/Teacher/Student)
2. **Multi-Tenant Center Management** -- Logical isolation via Prisma Client Extensions
3. **IELTS Exercise Builder** -- 23 question types across Reading, Listening, Writing, Speaking
4. **AI Grading Workbench** -- Split-screen review with evidence anchoring, teacher comments, Gemini integration
5. **Student Submissions** -- Offline-proof with IndexedDB persistence and auto-save
6. **Mock Test Assembly** -- Full IELTS practice tests with band score conversion
7. **Class Logistics** -- Courses, classes, scheduling, roster management, attendance tracking
8. **Student Health Dashboard** -- Traffic-light at-risk detection with intervention workflows
9. **User Management** -- Invitations, CSV bulk import, profile management, account deletion
10. **Billing & Subscriptions** -- Polar.sh integration with tiered flat-rate pricing
11. **Background Jobs** -- 14 Inngest functions for async processing (grading, emails, billing)
12. **Notifications** -- In-app + email notifications (Resend) for schedule changes, interventions

## Links to Detailed Documentation

- [Architecture](./architecture.md) -- Architectural decisions, patterns, boundaries
- [Source Tree Analysis](./source-tree-analysis.md) -- Annotated directory structure
- [API Contracts](./api-contracts.md) -- All HTTP endpoints
- [Data Models](./data-models.md) -- Database schema and relationships
- [Development Guide](./development-guide.md) -- Setup, commands, workflow
- [Deployment Guide](./deployment-guide.md) -- Railway deployment, CI/CD
- [Integration Architecture](./integration-architecture.md) -- How parts communicate
- [Component Inventory](./component-inventory.md) -- UI component catalog
