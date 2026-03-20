# Source Tree Analysis

**Generated:** 2026-03-20 | **Scan Level:** Exhaustive

---

## Monorepo Root Structure

```
classlite/
├── apps/                            # Deployable applications
│   ├── backend/                     # [backend] Fastify API server
│   ├── webapp/                      # [web] React SPA (Vite)
│   ├── website/                     # [web] Astro marketing site
│   └── e2e/                         # [test] Playwright E2E tests
├── packages/                        # Shared libraries
│   ├── db/                          # [library] Prisma schema + tenanted client
│   ├── types/                       # [library] Shared Zod schemas
│   ├── ui/                          # [library] shadcn component library
│   ├── eslint-config/               # [tooling] ESLint presets
│   └── typescript-config/           # [tooling] TSConfig presets
├── scripts/
│   └── run-e2e.sh                   # E2E orchestration (Firebase, Backend, Inngest, Webapp)
├── docs/                            # Generated project documentation
├── _bmad/                           # BMAD workflow engine
├── _bmad-output/                    # Planning & implementation artifacts
├── .github/workflows/ci.yml         # CI pipeline (lint, typecheck, test, integration)
├── docker-compose.yml               # Local dev stack
├── turbo.json                       # Build pipeline
├── pnpm-workspace.yaml              # Workspace packages
├── package.json                     # Root scripts + dev deps
├── CLAUDE.md                        # AI agent instructions
├── project-context.md               # Critical rules + patterns
└── README.md                        # Project overview
```

## Backend (`apps/backend/src/`)

```
src/
├── index.ts                         # ENTRY POINT: Server bootstrap, plugin registration
├── app.ts                           # Fastify app builder (buildApp)
├── env.ts                           # Environment type definitions
├── security.test.ts                 # Security hardening tests
├── errors/
│   ├── app-error.ts                 # Custom AppError class (conflict/notFound/unauthorized/forbidden/badRequest)
│   ├── app-error.test.ts
│   ├── prisma-errors.ts             # Prisma error code → AppError mapping
│   └── prisma-errors.test.ts
├── middlewares/
│   ├── auth.middleware.ts           # Firebase JWT verification → request.jwtPayload
│   ├── role.middleware.ts           # requireRole(roles) preHandler factory
│   ├── role.middleware.test.ts
│   └── role.middleware.integration.test.ts
├── plugins/
│   ├── firebase.plugin.ts           # Firebase Admin SDK (auth, storage decorators)
│   ├── prisma.plugin.ts             # Prisma client lifecycle (connect/disconnect)
│   ├── resend.plugin.ts             # Resend email client
│   └── create-prisma.ts             # Standalone Prisma for Inngest jobs
├── utils/
│   ├── html.ts                      # HTML escaping for email templates
│   └── html.test.ts
├── test/
│   ├── setup.ts                     # Test configuration
│   └── db.ts                        # Test database utilities
└── modules/                         # Feature modules (Route → Controller → Service)
    ├── auth/                        # Firebase login/signup, custom claims, account lockout
    ├── tenants/                     # Center CRUD, invitations
    ├── logistics/                   # Courses, classes, sessions, attendance, rooms, schedules
    │   ├── courses/                 # Course CRUD
    │   ├── classes/                 # Class CRUD + roster management
    │   ├── sessions/                # Session CRUD
    │   ├── schedules/               # Recurring schedules
    │   ├── rooms/                   # Room CRUD
    │   ├── attendance/              # Attendance tracking
    │   ├── email-templates/         # Schedule change, cancellation templates
    │   └── jobs/                    # Inngest: email notifications
    ├── exercises/                   # IELTS exercise builder (23 question types)
    │   ├── exercises/               # Exercise CRUD, publish/archive/duplicate
    │   ├── tags/                    # Tag management
    │   ├── sections/                # Section + question management
    │   ├── ai-generation/           # Gemini question generation
    │   └── jobs/                    # Inngest: AI question generation
    ├── assignments/                 # Assignment CRUD, student assignments
    ├── submissions/                 # Student submission + answer handling
    ├── grading/                     # AI grading workbench
    │   ├── grading/                 # Queue, feedback, comments, finalization
    │   ├── student/                 # Student feedback view
    │   ├── prompts/                 # Gemini grading prompts
    │   └── jobs/                    # Inngest: AI analysis
    ├── mock-tests/                  # Mock test assembly + band scoring
    ├── billing/                     # Polar.sh subscription integration
    │   ├── billing/                 # Overview, tiers, checkout
    │   ├── webhooks/                # Polar webhook handling
    │   ├── polar-client/            # Polar SDK wrapper
    │   └── jobs/                    # Inngest: snapshots, reminders, grace period
    ├── users/                       # User management, CSV import
    │   ├── users/                   # CRUD, role changes, activation
    │   ├── profile/                 # Profile updates, password, avatar, deletion
    │   ├── csv-import/              # CSV validation + import pipeline
    │   ├── parent-emails/           # Parent communication
    │   └── jobs/                    # Inngest: deletion, import, welcome emails
    ├── notifications/               # In-app notifications
    ├── student-health/              # Health dashboard, intervention emails
    ├── engagement/                  # Achievement/streak notifications
    ├── inngest/                     # Inngest client, route handler, function registry
    └── health/                      # Health check endpoint
```

## Frontend (`apps/webapp/src/`)

```
src/
├── main.tsx                         # ENTRY POINT: React root
├── App.tsx                          # Router + context providers
├── schema/
│   └── schema.d.ts                  # AUTO-GENERATED OpenAPI types (DO NOT EDIT)
├── core/
│   ├── client.ts                    # openapi-fetch with Firebase token middleware
│   ├── firebase.ts                  # Firebase SDK initialization
│   ├── config/
│   │   ├── navigation.ts            # Sidebar menu config (role-aware)
│   │   └── breadcrumb-config.ts     # Breadcrumb labels
│   └── components/
│       ├── common/
│       │   ├── app-sidebar.tsx      # Main navigation sidebar
│       │   ├── nav-main.tsx         # Nav menu items
│       │   ├── nav-user.tsx         # User dropdown
│       │   ├── theme-provider.tsx   # Dark/light mode
│       │   ├── error-boundary.tsx   # Global error boundary
│       │   └── error-fallback.tsx   # Error UI
│       └── layout/
│           ├── DashboardShell.tsx   # Main layout (sidebar + content)
│           ├── TopBar.tsx           # Header bar
│           ├── Breadcrumbs.tsx      # Auto-generated breadcrumbs
│           ├── MobileNavOverflow.tsx # Mobile nav overflow menu
│           └── OfflineIndicator.tsx # Network status indicator
├── features/
│   ├── auth/                        # Firebase auth + backend sync
│   │   ├── auth-context.tsx         # AuthProvider (user state, token refresh)
│   │   ├── auth.api.ts              # Login/signup API calls
│   │   ├── auth.hooks.ts            # React Query auth mutations
│   │   ├── protected-route.tsx      # Route protection wrapper
│   │   ├── guest-route.tsx          # Guest-only route
│   │   ├── role-redirect.tsx        # Role-based routing
│   │   ├── components/              # Login/signup/reset forms, RBACWrapper
│   │   └── pages/                   # Auth pages
│   ├── tenants/
│   │   └── tenant-context.tsx       # Center data provider
│   ├── dashboard/                   # Role-specific home dashboards
│   │   ├── DashboardPage.tsx        # Router: Owner/Teacher/Student dashboard
│   │   └── components/              # OwnerDashboard, TeacherDashboard, StudentDashboard
│   ├── exercises/                   # Exercise management (23 IELTS types)
│   │   ├── exercises-page.tsx       # Exercise library with filters
│   │   ├── components/
│   │   │   ├── ExerciseEditor.tsx   # Create/edit exercise form
│   │   │   ├── QuestionSectionEditor.tsx
│   │   │   ├── AIGenerationPanel.tsx # AI question generation
│   │   │   ├── AudioUploadEditor.tsx # Listening audio
│   │   │   ├── DocumentUploadPanel.tsx # PDF/Word upload
│   │   │   ├── WritingTaskEditor.tsx
│   │   │   ├── SpeakingTaskEditor.tsx
│   │   │   └── question-types/      # Per-type editors + previewers (MCQ, TFNG, Matching, etc.)
│   │   └── hooks/                   # Exercise CRUD, tags, sections, uploads, AI generation
│   ├── assignments/                 # Assign exercises to classes
│   ├── submissions/                 # Student submission-taking interface
│   │   ├── components/
│   │   │   ├── SubmissionPage.tsx   # Main submission UI
│   │   │   ├── AudioPlayerPanel.tsx # Listening audio playback
│   │   │   ├── OfflineBanner.tsx    # Offline warning
│   │   │   └── question-inputs/     # Per-type answer inputs
│   │   ├── hooks/                   # Start, save, submit, auto-save
│   │   └── lib/
│   │       └── submission-storage.ts # IndexedDB offline persistence
│   ├── grading/                     # AI-assisted grading workbench
│   │   ├── GradingQueuePage.tsx     # Main grading interface
│   │   ├── components/
│   │   │   ├── WorkbenchLayout.tsx  # Split-pane layout (resizable)
│   │   │   ├── QueueListMode.tsx    # Submission queue list
│   │   │   ├── StudentWorkPane.tsx  # Student answer display
│   │   │   ├── AIFeedbackPane.tsx   # AI feedback cards
│   │   │   ├── FeedbackItemCard.tsx # Individual AI item (accept/reject)
│   │   │   ├── BandScoreCard.tsx    # IELTS scoring display
│   │   │   ├── AddCommentInput.tsx  # Teacher comment input
│   │   │   ├── TeacherCommentCard.tsx # Comment display
│   │   │   ├── HighlightedText.tsx  # Text anchoring
│   │   │   ├── ConnectionLineOverlay.tsx # SVG anchor lines
│   │   │   ├── StampedAnimation.tsx # Approval stamp effect
│   │   │   └── BreatherCard.tsx     # 5-item break prompt
│   │   ├── student/                 # Student feedback view
│   │   ├── hooks/                   # Queue, detail, comments, approval, shortcuts, prefetch
│   │   └── utils/                   # Offset calculations, time formatting
│   ├── logistics/                   # Classes, courses, scheduling
│   │   ├── components/              # ClassDrawer, WeeklyCalendar, AttendanceSheet, ConflictWarning
│   │   └── hooks/                   # Courses, classes, sessions, rooms, attendance, conflicts
│   ├── mock-tests/                  # Mock test management
│   ├── users/                       # User management + CSV import
│   │   ├── components/              # UserListTable, InviteModal, CsvImportModal, ProfileEditForm
│   │   └── hooks/                   # User CRUD, role changes, import pipeline
│   ├── student-health/              # Student health dashboard
│   │   ├── components/              # TrafficLightBadge, StudentProfileOverlay, InterventionModal
│   │   └── hooks/                   # Health dashboard, profiles, flags, interventions
│   ├── students/                    # Student list view
│   └── settings/                    # Admin settings pages
│       ├── components/              # SettingsLayout, BillingMetricCards, TierComparison
│       └── pages/                   # General, Billing, Users, Rooms, Tags, Integrations, Privacy
```

## Shared Packages

```
packages/
├── db/
│   ├── prisma/
│   │   ├── schema.prisma            # 45+ models, multi-tenant, all relationships
│   │   ├── migrations/              # 13 migrations (init through billing)
│   │   └── seed-staging.ts          # Staging data seeder
│   └── src/
│       ├── index.ts                 # Re-exports client + tenanted client
│       └── tenanted-client.ts       # Prisma Extension: auto-injects centerId into 33 models
├── types/src/                       # 22 Zod schema files
│   ├── auth/dto.ts                  # Auth schemas (signup, login, roles)
│   ├── tenant/dto.ts                # Center management schemas
│   ├── exercises.ts                 # 740 lines -- 23 IELTS question type schemas
│   ├── submissions.ts               # Student answer + submission schemas
│   ├── grading.ts                   # AI feedback, teacher comments, grading queue
│   ├── assignments.ts               # Assignment schemas
│   ├── billing.ts                   # Subscription tiers, billing events
│   ├── student-health.ts            # Health metrics, traffic lights
│   ├── mock-tests.ts                # Mock test assembly + scoring
│   ├── ai-generation.ts             # AI question generation schemas
│   ├── csv-import.ts                # CSV import pipeline schemas
│   └── response.ts                  # Generic API response wrapper
└── ui/src/
    ├── components/                  # 40+ shadcn/Radix components
    ├── hooks/use-mobile.ts          # Mobile breakpoint detection
    └── lib/utils.ts                 # cn() -- clsx + tailwind-merge
```

## CI/CD & Deployment

```
.github/workflows/ci.yml            # GitHub Actions CI
├── lint                             # ESLint across monorepo
├── typecheck                        # TypeScript type checking
├── build-website                    # Astro build verification
├── test-unit                        # Vitest (webapp + backend unit)
└── test-integration                 # PostgreSQL service container + Prisma migrations + integration tests

apps/backend/Dockerfile              # Backend: Node 20 Alpine, Prisma migrate deploy on start
apps/webapp/Dockerfile               # Webapp: Vite build → Nginx Alpine
apps/website/Dockerfile              # Website: Astro build → Nginx Alpine
docker-compose.yml                   # Local: Postgres 16 + Firebase Emulator + Backend + Webapp
```
