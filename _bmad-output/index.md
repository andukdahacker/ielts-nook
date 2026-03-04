# BMAD Output Directory Index

## Excalidraw Diagrams

- **[owner-dashboard.excalidraw](./excalidraw-diagrams/owner-dashboard.excalidraw)** - Owner dashboard wireframe design
- **[story-2-1-wireframe.excalidraw](./excalidraw-diagrams/story-2-1-wireframe.excalidraw)** - Course/class management wireframe
- **[theme.json](./excalidraw-diagrams/theme.json)** - Design system color palette and typography config

## Planning Artifacts

- **[architecture.md](./planning-artifacts/architecture.md)** - System architecture decisions and technical requirements
- **[bmm-workflow-status.yaml](./planning-artifacts/bmm-workflow-status.yaml)** - Project workflow completion tracking
- **[epics.md](./planning-artifacts/epics.md)** - Complete user story epics with functional requirements
- **[implementation-readiness-report-2026-01-18.md](./planning-artifacts/implementation-readiness-report-2026-01-18.md)** - Epic/PRD readiness validation from January
- **[implementation-readiness-report-2026-02-11.md](./planning-artifacts/implementation-readiness-report-2026-02-11.md)** - Updated readiness report including billing analysis
- **[information-architecture.md](./planning-artifacts/information-architecture.md)** - Role-based navigation and data structure
- **[prd.md](./planning-artifacts/prd.md)** - Complete product requirements specification
- **[product-brief-classlite-2026-01-16.md](./planning-artifacts/product-brief-classlite-2026-01-16.md)** - Executive summary, vision, and market positioning
- **[sprint-change-proposal-2026-02-11.md](./planning-artifacts/sprint-change-proposal-2026-02-11.md)** - Zalo removal, billing addition, epic impact analysis
- **[user-feature-request.md](./planning-artifacts/user-feature-request.md)** - Initial MVP feature list from user requirements
- **[ux-design-specification.md](./planning-artifacts/ux-design-specification.md)** - Complete wireframes and interaction design for all personas
- **[ux-design-specification-epic-2.md](./planning-artifacts/ux-design-specification-epic-2.md)** - UX flows for scheduling and logistics features

### research/

- **[market-classlite-vietnam-pricing-research-2026-02-27.md](./planning-artifacts/research/market-classlite-vietnam-pricing-research-2026-02-27.md)** - Vietnam market pricing analysis for tiers

### validation-reports/

- **[prd-validation-report.md](./planning-artifacts/validation-reports/prd-validation-report.md)** - PRD quality assessment against brief and requirements

## Implementation Artifacts

### Epic 1 — Tenant & User Management

- **[1-1-multi-tenant-onboarding.md](./implementation-artifacts/1-1-multi-tenant-onboarding.md)** - Multi-tenant registration and authentication infrastructure
- **[1-2-center-branding-identity.md](./implementation-artifacts/1-2-center-branding-identity.md)** - Center logo, name, timezone, and dynamic branding
- **[1-3-user-invitation-rbac.md](./implementation-artifacts/1-3-user-invitation-rbac.md)** - User invitation system and role-based access control
- **[1-4-universal-ui-access-control.md](./implementation-artifacts/1-4-universal-ui-access-control.md)** - Reusable RBAC higher-order component wrapper
- **[1-5-unified-dashboard-shell.md](./implementation-artifacts/1-5-unified-dashboard-shell.md)** - Dashboard layout with responsive nav and role routing
- **[1-6-login-page-session-management.md](./implementation-artifacts/1-6-login-page-session-management.md)** - Login form, JWT tokens, and session persistence
- **[1-7-password-reset-flow.md](./implementation-artifacts/1-7-password-reset-flow.md)** - Email-based password reset with token validation
- **[1-8-user-management-interface.md](./implementation-artifacts/1-8-user-management-interface.md)** - Admin user list, search, filter, invite, deactivation
- **[1-9-user-profile-self-service.md](./implementation-artifacts/1-9-user-profile-self-service.md)** - Profile editing, photo upload, password change
- **[1-10-csv-bulk-user-import.md](./implementation-artifacts/1-10-csv-bulk-user-import.md)** - CSV import with validation and progress tracking
- **[1-11-navigation-structure.md](./implementation-artifacts/1-11-navigation-structure.md)** - Role-based navigation menu with dynamic visibility

### Epic 2 — Scheduling & Logistics

- **[2-1-course-class-management.md](./implementation-artifacts/2-1-course-class-management.md)** - Course and class CRUD with brand color selection
- **[2-2-visual-weekly-scheduler.md](./implementation-artifacts/2-2-visual-weekly-scheduler.md)** - Calendar grid with drag-and-drop session scheduling
- **[2-3-conflict-detection.md](./implementation-artifacts/2-3-conflict-detection.md)** - Teacher and room conflict detection with warnings
- **[2-4-attendance-tracking.md](./implementation-artifacts/2-4-attendance-tracking.md)** - Teacher attendance marking with bulk actions
- **[2-5-class-session-crud.md](./implementation-artifacts/2-5-class-session-crud.md)** - Session creation, editing, deletion with recurrence
- **[2-6-schedule-change-notifications-email.md](./implementation-artifacts/2-6-schedule-change-notifications-email.md)** - Email notifications for schedule changes with debouncing

### Epic 3 — IELTS Exercise Builder

- **[3-1-exercise-builder-core-passage-management.md](./implementation-artifacts/3-1-exercise-builder-core-passage-management.md)** - Exercise creation with passages and question sections
- **[3-2-reading-question-types-basic.md](./implementation-artifacts/3-2-reading-question-types-basic.md)** - IELTS reading question types R1-R8
- **[3-3-reading-question-types-matching.md](./implementation-artifacts/3-3-reading-question-types-matching.md)** - IELTS reading matching types R9-R12
- **[3-4-reading-question-types-advanced.md](./implementation-artifacts/3-4-reading-question-types-advanced.md)** - Advanced reading types R13-R14
- **[3-5-answer-key-management.md](./implementation-artifacts/3-5-answer-key-management.md)** - Answer variants, case sensitivity, word order
- **[3-6-listening-exercise-builder.md](./implementation-artifacts/3-6-listening-exercise-builder.md)** - Audio upload and listening exercise creation
- **[3-7-listening-question-types.md](./implementation-artifacts/3-7-listening-question-types.md)** - IELTS listening types L1-L6
- **[3-8-writing-task-builder.md](./implementation-artifacts/3-8-writing-task-builder.md)** - IELTS writing tasks with rubrics
- **[3-9-speaking-exercise-builder.md](./implementation-artifacts/3-9-speaking-exercise-builder.md)** - Speaking parts 1-3 with recording limits
- **[3-10-timer-test-conditions.md](./implementation-artifacts/3-10-timer-test-conditions.md)** - Time limits, countdown timers, grace period
- **[3-11-exercise-tagging-organization.md](./implementation-artifacts/3-11-exercise-tagging-organization.md)** - Band level and topic tags, filtering
- **[3-12-ai-content-generation-reading.md](./implementation-artifacts/3-12-ai-content-generation-reading.md)** - AI question generation from passages
- **[3-13-mock-test-assembly.md](./implementation-artifacts/3-13-mock-test-assembly.md)** - Mock test creation with unified scoring
- **[3-14-exercise-library-management.md](./implementation-artifacts/3-14-exercise-library-management.md)** - Exercise list, search, archive functionality
- **[3-15-exercise-assignment-management.md](./implementation-artifacts/3-15-exercise-assignment-management.md)** - Exercise assignment to classes and students
- **[3-16-student-assignment-dashboard.md](./implementation-artifacts/3-16-student-assignment-dashboard.md)** - Student view of pending assignments

### Epic 3.5 — Infrastructure & DevOps

- **[3.5-1-dockerfiles-cicd-railway-staging.md](./implementation-artifacts/3.5-1-dockerfiles-cicd-railway-staging.md)** - Docker containerization and CI/CD setup
- **[3.5-2-database-migration-strategy.md](./implementation-artifacts/3.5-2-database-migration-strategy.md)** - Prisma migration workflow and validation
- **[3.5-3-production-environment-deployment-workflow.md](./implementation-artifacts/3.5-3-production-environment-deployment-workflow.md)** - Production Railway environment setup
- **[3.5-4-error-boundaries-accessibility-enforcement.md](./implementation-artifacts/3.5-4-error-boundaries-accessibility-enforcement.md)** - Error boundaries and a11y linting
- **[3.5-5-epic-3-e2e-tests.md](./implementation-artifacts/3.5-5-epic-3-e2e-tests.md)** - End-to-end Playwright tests for Epic 3

### Epic 4 — Student Submissions

- **[4-1-mobile-submission-interface.md](./implementation-artifacts/4-1-mobile-submission-interface.md)** - Mobile UI for student assignment submissions
- **[4-2-local-auto-save-persistent-storage.md](./implementation-artifacts/4-2-local-auto-save-persistent-storage.md)** - Auto-save submissions to IndexedDB every 3 seconds
- **[4-3-offline-safeguards-sync.md](./implementation-artifacts/4-3-offline-safeguards-sync.md)** - Offline submission queue and sync recovery
- **[4-4-epic-4-e2e-tests.md](./implementation-artifacts/4-4-epic-4-e2e-tests.md)** - Playwright E2E tests for submission flows

### Epic 5 — AI-Assisted Grading

- **[5-1-automated-submission-analysis.md](./implementation-artifacts/5-1-automated-submission-analysis.md)** - AI-generated score suggestions for Writing/Speaking
- **[5-2-split-screen-grading-interface.md](./implementation-artifacts/5-2-split-screen-grading-interface.md)** - Resizable side-by-side student work and AI feedback
- **[5-3-evidence-anchoring.md](./implementation-artifacts/5-3-evidence-anchoring.md)** - Visual tether lines linking feedback to text evidence
- **[5-4-one-click-approval-loop.md](./implementation-artifacts/5-4-one-click-approval-loop.md)** - Teacher approval/rejection workflow with summaries
- **[5-5-grading-queue-management.md](./implementation-artifacts/5-5-grading-queue-management.md)** - Submission queue with filtering and prioritization
- **[5-6-student-feedback-view.md](./implementation-artifacts/5-6-student-feedback-view.md)** - Student view of graded assignment with feedback
- **[5-7-free-form-teacher-commenting.md](./implementation-artifacts/5-7-free-form-teacher-commenting.md)** - Anchored and general teacher comments

### Epic 6 — Student Health Monitoring

- **[6-1-traffic-light-dashboard.md](./implementation-artifacts/6-1-traffic-light-dashboard.md)** - Color-coded student health cards (red/yellow/green)
- **[6-2-student-profile-overlay.md](./implementation-artifacts/6-2-student-profile-overlay.md)** - Slide-over showing attendance and assignment history
- **[6-3-email-intervention-loop.md](./implementation-artifacts/6-3-email-intervention-loop.md)** - Owner emails parent when student falls behind
- **[6-4-teacher-student-health-view.md](./implementation-artifacts/6-4-teacher-student-health-view.md)** - Teachers see health data for their class students

### Epic 7 — Notifications & Engagement

- **[7-1-engagement-email-notifications.md](./implementation-artifacts/7-1-engagement-email-notifications.md)** - Achievement emails for streaks and personal bests
- **[7-2-notification-preferences.md](./implementation-artifacts/7-2-notification-preferences.md)** - User controls for email notification categories
- **[7-3-parent-email-registration.md](./implementation-artifacts/7-3-parent-email-registration.md)** - Admin-managed parent email addresses with welcome emails

### Epic 9 — Billing & Subscriptions

- **[9-1-billing-dashboard.md](./implementation-artifacts/9-1-billing-dashboard.md)** - Billing status, payment history, student usage chart
- **[9-2-polar-integration-payment-processing.md](./implementation-artifacts/9-2-polar-integration-payment-processing.md)** - Polar.sh checkout and webhook subscription management
- **[9-3-billing-reminders-grace-period.md](./implementation-artifacts/9-3-billing-reminders-grace-period.md)** - Renewal reminders and 14-day grace period
- **[9-4-subscription-tier-management.md](./implementation-artifacts/9-4-subscription-tier-management.md)** - Tier comparison and upgrade/downgrade functionality

### Epic 10 — Marketing

- **[10-1-credibility-landing-page.md](./implementation-artifacts/10-1-credibility-landing-page.md)** - Single-page marketing site with hero and CTAs

### Retrospectives & Reviews

- **[epic-1-retrospective-2026-01-25.md](./implementation-artifacts/epic-1-retrospective-2026-01-25.md)** - Initial Epic 1 retrospective with team perspectives
- **[epic-1-retro-2026-02-03.md](./implementation-artifacts/epic-1-retro-2026-02-03.md)** - Complete Epic 1 retrospective covering 11 stories
- **[epic-2-retro-2026-02-06.md](./implementation-artifacts/epic-2-retro-2026-02-06.md)** - Epic 2 scheduling retrospective with test metrics
- **[epic-3-retro-2026-02-10.md](./implementation-artifacts/epic-3-retro-2026-02-10.md)** - Epic 3 IELTS exercise builder retrospective
- **[epic-3.5-retro-2026-02-13.md](./implementation-artifacts/epic-3.5-retro-2026-02-13.md)** - Infrastructure/deployment retrospective with E2E tests
- **[gemini-code-audit-2026-02-06.md](./implementation-artifacts/gemini-code-audit-2026-02-06.md)** - Security and quality audit findings

### Process & Tracking

- **[misc-fixes-2026-02-06.md](./implementation-artifacts/misc-fixes-2026-02-06.md)** - Bug fixes outside formal story workflow
- **[outstanding-action-items.md](./implementation-artifacts/outstanding-action-items.md)** - Centralized tracker for unfinished retro commitments
- **[pre-review-checklist.md](./implementation-artifacts/pre-review-checklist.md)** - Top 4 recurring code review issue categories
- **[sprint-status.yaml](./implementation-artifacts/sprint-status.yaml)** - Epic and story status tracking system

### archived/

- **[1-0-design-system-foundation.md](./implementation-artifacts/archived/1-0-design-system-foundation.md)** - Color palette and typography system setup
- **[1-1-tenant-provisioning-system.md](./implementation-artifacts/archived/1-1-tenant-provisioning-system.md)** - Tenant creation with unique center IDs
- **[1-2-user-authentication-with-firebase.md](./implementation-artifacts/archived/1-2-user-authentication-with-firebase.md)** - Google OAuth and email/password authentication
- **[1-3-role-based-access-control-rbac.md](./implementation-artifacts/archived/1-3-role-based-access-control-rbac.md)** - API-level permission enforcement middleware
- **[1-4-multi-tenant-data-isolation.md](./implementation-artifacts/archived/1-4-multi-tenant-data-isolation.md)** - Tenanted client isolation via query interception
- **[1-5-user-invitation-system.md](./implementation-artifacts/archived/1-5-user-invitation-system.md)** - Center owner email invitation system setup
- **[1-6-center-registration-with-google-oauth.md](./implementation-artifacts/archived/1-6-center-registration-with-google-oauth.md)** - Google signup flow for center registration
- **[1-6-center-registration-with-google-oauth-review.md](./implementation-artifacts/archived/1-6-center-registration-with-google-oauth-review.md)** - Code review findings with process violations
