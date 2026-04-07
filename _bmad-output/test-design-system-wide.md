# System-Wide Test Design: Epics 1-7, 9, 10

**Date:** 2026-03-21
**Author:** Ducdo
**Status:** Draft
**Scope:** Full test design across all completed epics (excluding Epic 8)

---

## Executive Summary

**Scope:** System-wide test design covering 9 epics (1-7, 9, 10) — the complete ClassLite platform excluding Platform Compliance & Methodology (Epic 8).

**Existing Test Base:** 1,831 tests (1,526 automated + 305 manual)
- Backend (Vitest): 1,026 tests across 57 files
- Webapp (Vitest): 123 tests across 16 files
- Packages (Vitest): 307 tests across 7 files
- E2E (Playwright): 356 tests across 45 files
- Manual (Excel): 305 test cases across 9 sheets (`_bmad-output/test-cases/classlite-manual-test-cases.xlsx`)

**Risk Summary:**
- Total risks identified: 24
- High-priority risks (≥6): 8
- Critical categories: SEC, DATA, PERF, TECH

**Coverage Summary:**
- P0 scenarios: 82 (~74 hours)
- P1 scenarios: 58 (~38 hours)
- P2/P3 scenarios: 95 (~35.5 hours)
- **Total effort**: ~147.5 hours (~18.4 days)

> **Party-Mode Review (2026-03-21):** Estimates revised per agent feedback — parameterized tests deflated, tenant isolation sized to 23 models × 2, grading latency bumped to P0, question type CRUD moved to API-level, seed infrastructure added. See [Party-Mode Findings](#party-mode-findings) appendix.

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Epic(s) | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|---------|-------------|-------------|--------|-------|------------|-------|
| R-001 | SEC | 1 | Cross-tenant data leakage — logical tenancy relies on application-level `center_id` injection (Prisma extension), not database RLS. A missed extension or direct PrismaClient bypass exposes other tenants' data | 2 | 3 | 6 | 46 integration tests (23 tenanted models × 2 ops: read + write); CI lint rule to block raw `new PrismaClient()` in business modules; schema-compliance test for new models | Dev |
| R-002 | SEC | 1 | JWT refresh token theft — 7-day (or 30-day with "Remember me") refresh tokens stored client-side; stolen token grants prolonged access | 2 | 3 | 6 | Test token rotation on use; verify invalidation on logout/password-change; test account lock after 5 failed attempts | Dev |
| R-003 | DATA | 3 | Answer key variant matching incorrectly accepts/rejects — normalization (case, whitespace, word order, numeric forms like "19"/"nineteen") is complex with 14 Reading + 6 Listening question types | 3 | 2 | 6 | Expand answer-utils unit tests for edge cases across all 20+ question types; fuzz-test normalization with adversarial inputs | QA |
| R-004 | DATA | 4 | Offline submission data loss — auto-save to IndexedDB every 3s + sync-on-reconnect. Browser storage eviction, tab crash, or failed sync could lose student work | 2 | 3 | 6 | E2E tests for offline → online sync; unit tests for storage eviction handling; test conflict resolution when server and local diverge | Dev |
| R-005 | PERF | 5 | AI grading latency exceeds SLO — NFR1 requires <500ms P95 for workbench auto-advance; Inngest job + LLM call chain may bottleneck | 2 | 3 | 6 | Performance test grading pipeline under load; verify pre-fetch of next submission; test graceful degradation when AI is slow | Dev |
| R-006 | SEC | 9 | Polar.sh webhook spoofing — fake webhook could grant unauthorized subscriptions or bypass billing | 2 | 3 | 6 | Test webhook signature validation; test replay attack prevention; verify idempotency of webhook processing | Dev |
| R-007 | BUS | 9 | Grace period logic error — incorrect enforcement could lock out paying customers or give free access beyond 14 days | 3 | 2 | 6 | Integration tests for grace period boundaries (day 0, 13, 14, 15); test feature restriction during grace; test instant restore on payment | QA |
| R-008 | DATA | 3 | Mock test band score miscalculation — IELTS scoring uses raw→band conversion tables + multi-criteria averaging + rounding to 0.5; errors directly impact student assessment | 2 | 3 | 6 | Extensive unit tests with official IELTS conversion tables; test boundary scores; test multi-skill averaging with known results | QA |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Epic(s) | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|---------|-------------|-------------|--------|-------|------------|-------|
| R-009 | TECH | 2 | Schedule conflict detection false negatives — overlapping room/teacher not caught due to timezone or recurring session edge cases | 2 | 2 | 4 | Test timezone boundary conflicts; test recurring session overlap detection; test DST transition edge cases | Dev |
| R-010 | TECH | 2 | Recurring session generation errors — 12-week recurrence with bi-weekly option; off-by-one or holiday overlap issues | 2 | 2 | 4 | Unit tests for recurrence generation across month boundaries; test bi-weekly vs weekly patterns | Dev |
| R-011 | SEC | 1 | RBAC bypass at API layer — UI hides elements but API endpoints may not enforce role checks consistently | 2 | 2 | 4 | Integration tests hitting every protected endpoint with wrong-role tokens; E2E RBAC tests for critical flows | QA |
| R-012 | BUS | 6 | Traffic light health status miscalculation — attendance < 80% = Red threshold may not account for excused absences or newly enrolled students | 2 | 2 | 4 | Unit tests for health status calculation with edge cases (0 sessions, 1 session, exactly 80%) | Dev |
| R-013 | OPS | 7 | Email rate limiting not enforced — "max 1 engagement email per student per day" and "max 3 parent emails per student" could be exceeded under race conditions | 2 | 2 | 4 | Integration tests for concurrent email triggers; verify debounce via Inngest cancelOn | Dev |
| R-014 | TECH | 5 | Evidence anchor orphaning — text edit > 50% should flag anchors, but threshold calculation on rich text with formatting is complex | 2 | 2 | 4 | Unit tests for anchor validation with various edit percentages; test with formatted text | Dev |
| R-015 | DATA | 1 | CSV bulk import validation gaps — malformed CSV, duplicate emails, encoding issues (Vietnamese characters) could corrupt user data | 2 | 2 | 4 | Unit tests for CSV parsing edge cases; test Unicode handling; test duplicate detection | QA |
| R-016 | PERF | 6 | Dashboard "Traffic Light" rendering > 1s (NFR2) — large center with 500+ students could slow widget calculation | 1 | 3 | 3 | Performance test with large dataset; verify query optimization/indexing | Dev |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Epic(s) | Description | Probability | Impact | Score | Action |
|---------|----------|---------|-------------|-------------|--------|-------|--------|
| R-017 | OPS | 2 | Email notification delay > 5 min — Inngest queue backlog during peak could exceed SLA | 1 | 2 | 2 | Monitor |
| R-018 | BUS | 10 | Landing page broken on 375px — responsive layout regression | 1 | 2 | 2 | Monitor |
| R-019 | TECH | 3 | Audio upload > 100MB rejected silently — file size validation missing or misleading error | 1 | 2 | 2 | Monitor |
| R-020 | BUS | 7 | Unsubscribe link broken — parent cannot opt out of emails, violating preferences | 1 | 2 | 2 | Monitor |
| R-021 | TECH | 5 | Breather animation after every 5 items blocks workflow for fast graders | 1 | 1 | 1 | Monitor |
| R-022 | OPS | 3.5 | Railway deployment rollback failure — database migration incompatibility on rollback | 1 | 2 | 2 | Monitor |
| R-023 | BUS | 1 | Account deletion 7-day grace period bypass — user re-registers before deletion completes | 1 | 1 | 1 | Monitor |
| R-024 | TECH | 4 | Mobile camera integration failure on specific devices — WebRTC/getUserMedia inconsistencies | 1 | 2 | 2 | Monitor |

---

## Manual Test Case Inventory

**Source:** `_bmad-output/test-cases/classlite-manual-test-cases.xlsx` (305 cases, 9 sheets)

### Manual Cases by Epic

| Sheet | Epic | Manual Cases | Automated E2E | Automation Gap | Notes |
|-------|------|-------------|---------------|----------------|-------|
| Epic 1 — Tenant & Users | Registration, Branding, RBAC, Login, Profile, CSV Import, Nav | 78 | 90 | **Low** | Well-covered by automated E2E; manual adds edge cases like real-device mobile, visual branding verification |
| Epic 2 — Scheduling | Courses, Scheduler, Conflicts, Attendance, Sessions | 44 | 49 | **Low** | Drag-and-drop calendar interactions are manual-only (hard to automate reliably) |
| Epic 3 — Exercise Builder | Question types, Passage, Audio, Assignments, Mock Tests, Tags | 60 | 33 | **High** | 60 manual vs 33 E2E — audio playback, diagram labelling, and rich text editing are manual-heavy |
| Epic 4 — Submissions | Submission UI, Auto-save, Offline, Timer, Mobile | 24 | 20 | **Moderate** | Offline scenarios + real mobile device testing stay manual; auto-save is automated |
| Epic 5 — AI Grading | AI Analysis, Split Screen, Approval, Queue, Feedback, Comments | 31 | 40 | **Low** | Best automated coverage; manual adds visual verification of anchor tethers and animations |
| Epic 6 — Student Health | Traffic Light, Filters, Profile Overlay, Interventions | 19 | 40 | **Low** | Over-covered in E2E; manual verifies visual color coding accuracy |
| Epic 7 — Notifications | Engagement Emails, Preferences, In-App Notifications | 15 | 4 | **High** | Only 4 E2E tests — manual cases cover email content verification, preference toggles, parent flows |
| Epic 9 — Billing | Dashboard, Status Badges, Tier Management | 20 | 16 | **Moderate** | Polar.sh redirect flows are manual (external service); badge rendering verified manually |
| Epic 10 — Marketing | Landing Page, SEO, Responsive, Performance | 14 | 13 | **Low** | Responsive testing on real devices stays manual; Lighthouse/SEO checks are manual |

### Automation Candidates (Manual → Automated)

Manual test cases that are **P1 regression** and **automatable** should be converted to Playwright E2E tests to reduce manual test cycle time.

| Epic | Manual Case Area | Estimated Automatable Cases | Rationale |
|------|-----------------|---------------------------|-----------|
| 3 | Question type creation (R1-R14, L1-L6) | ~15 | Form-based flows — automate with Playwright |
| 3 | Assignment creation + multi-class assign | ~5 | API-based setup, UI verification |
| 7 | Notification preference toggles | ~5 | Simple toggle + verify behavior |
| 7 | Parent email registration flow | ~3 | Form submission + email verification |
| 9 | Billing dashboard status badges | ~4 | Visual verification with snapshot testing |
| 4 | Timer countdown + auto-submit | ~3 | Can be automated with Playwright clock mocking |
| **Total** | | **~35** | Reduces manual regression from 305 to ~270 |

### Cases That Must Stay Manual

| Area | Why Manual | Cases |
|------|-----------|-------|
| Audio playback quality (Epic 3) | Requires human ears to verify | ~5 |
| Drag-and-drop calendar UX (Epic 2) | Playwright drag is unreliable for complex grid interactions | ~5 |
| Real mobile device testing (Epic 4) | WebDriver mobile emulation differs from real device touch | ~10 |
| Visual branding accuracy (Epic 1) | Logo rendering, color accuracy need human eye | ~3 |
| Polar.sh redirect flow (Epic 9) | External service, cannot control in test | ~4 |
| Email content readability (Epic 7) | Template rendering in real email clients | ~5 |
| Anchor tether visual accuracy (Epic 5) | CSS positioning needs human verification | ~3 |

---

## Existing Coverage Analysis

### Coverage by Epic

| Epic | Feature Area | Backend Tests | Webapp Tests | E2E Tests | Coverage Assessment |
|------|-------------|--------------|-------------|-----------|-------------------|
| 1 | Auth & Users | 169 (auth 26 + users 143) | 0 | 90 (auth 42 + users 48) | **Good** — Strong backend + E2E. Missing webapp unit tests for auth hooks |
| 2 | Logistics | 113 | 0 | 49 | **Good** — Solid backend coverage. Missing E2E for email notifications, recurring sessions |
| 3 | Exercises | 294 (exercises 227 + mock-tests 67) | 0 | 33 | **Gap** — Excellent backend but only 33 E2E for 16 stories. Question type E2E is thin |
| 3.5 | Deployment | 0 | 0 | 0 | **N/A** — Infrastructure, no functional tests needed |
| 4 | Submissions | 25 | 34 | 20 | **Moderate** — Auto-save and storage tested. Offline sync E2E needs expansion |
| 5 | Grading | 120 | 57 | 40 | **Strong** — Best covered module. Anchor validation, hooks, queue all tested |
| 6 | Student Health | 71 | 17 | 40 | **Good** — Solid across all layers |
| 7 | Notifications | 47 | 0 | 4 | **Gap** — Strong backend but only 4 E2E tests. Notification preferences untested in E2E |
| 9 | Billing | 101 | 0 | 16 | **Moderate** — Backend thorough. E2E covers billing page but not Polar.sh webhook flows |
| 10 | Website | 0 | 0 | 13 | **Adequate** — Landing page E2E covers layout/responsive |

### Cross-Cutting Coverage Gaps

| Area | Automated | Manual | Gap Description | Priority |
|------|-----------|--------|-----------------|----------|
| Multi-tenant isolation | 16 tenanted-client tests + 1 schema compliance | Cross-tenant check mentioned in manual tips | No cross-tenant access attempt tests at API layer | P0 |
| RBAC at API layer | 4 role middleware tests + 6 E2E RBAC | Permission boundary cases in all 9 sheets | Automated coverage limited — only grading RBAC has dedicated E2E | P0 |
| Offline → Online sync | 8 E2E offline-sync tests | ~10 manual cases (Epic 4) | No tests for storage eviction, conflict resolution | P1 |
| Email delivery verification | Template tests only (45 total) | ~15 manual cases (Epics 2, 6, 7) | No integration tests verifying Inngest triggers emails correctly | P1 |
| Performance under load | 0 automated tests | ~5 manual perf checks (Epic 10) | No performance tests for any NFR (grading latency, dashboard rendering) | P1 |
| Webhook security | 5 billing webhook integration tests | 0 manual | Need signature validation and replay attack tests | P1 |
| Answer validation edge cases | 65 answer-utils tests | ~10 manual cases (Epic 3) | Good but need adversarial/fuzz inputs for all 20+ question types | P1 |
| Band score calculation | 40 band-score tests | ~5 manual cases (Epic 3) | Good count but need boundary verification against official IELTS tables | P1 |
| Accessibility (WCAG 2.1 AA) | 0 automated tests | 0 manual | NFR9 requires compliance on all public interfaces — no tests at all | P2 |
| Mobile responsiveness | 3 Playwright projects (chromium, firefox, mobile chrome) | ~10 manual cases across epics | Config exists but no explicit viewport/touch tests in most specs | P2 |
| Notification preferences | 0 E2E | ~5 manual (Epic 7) | Biggest manual-only gap — should be automated | P1 |
| Exercise question type coverage | 33 E2E (all types combined) | 60 manual (Epic 3) | Manual carries most coverage for 20+ question types — automate P1 regression subset | P1 |

---

## Test Coverage Plan

### P0 (Critical) — Run on every commit

**Criteria**: Blocks core journey + High risk (≥6) + No workaround

| ID | Requirement | Test Level | Risk Link | Tests | Epic | Status | Notes |
|----|-------------|-----------|-----------|-------|------|--------|-------|
| P0-01 | Tenant isolation — no cross-tenant data access | Integration | R-001 | 46 | 1 | **NEW** | 23 TENANTED_MODELS × 2 (read + write with wrong centerId). Parameterized — one helper, loop over models. ~6h |
| P0-02 | Static analysis — no raw PrismaClient in business modules | CI Lint | R-001 | 1 | 1 | **NEW** | Grep-based CI rule blocking `new PrismaClient()` outside approved paths (plugins, seeds, tests). ~1h |
| P0-03 | Login + session persistence | E2E | R-002 | 4 | 1 | Exists (15) | Existing auth tests cover this; verify token rotation |
| P0-04 | Token refresh + invalidation on logout/password-change | Integration | R-002 | 4 | 1 | **PARTIAL** | Expand auth.service tests |
| P0-05 | Account lockout after 5 failed attempts | Integration | R-002 | 3 | 1 | Exists (9) | login-attempt tests cover this |
| P0-06 | Answer key matching — all question types | Unit | R-003 | 10 | 3 | **EXPAND** | Add adversarial inputs per type |
| P0-07 | IELTS band score calculation accuracy | Unit | R-008 | 8 | 3 | Exists (40) | Verify against official conversion tables |
| P0-08 | Student submission — create + auto-save + sync | E2E | R-004 | 4 | 4 | Exists (7+18) | Combine existing auto-save + submission tests |
| P0-09 | Offline mutation queue FIFO ordering | Unit | R-004 | 3 | 4 | **NEW** | Verify queue replays in order with concurrent writes. More targeted than generic offline E2E |
| P0-10 | Offline submission resilience | E2E | R-004 | 3 | 4 | Exists (8) | Expand with storage eviction scenario |
| P0-11 | Polar.sh webhook signature validation | Integration | R-006 | 3 | 9 | **NEW** | Test valid/invalid/replay signatures. ~2h (3 assertions on 1 endpoint) |
| P0-12 | Grace period enforcement boundaries | Integration | R-007 | 4 | 9 | **NEW** | Day 0, 13, 14, 15 boundary tests |
| P0-13 | Grace period feature restriction + restore | E2E | R-007 | 3 | 9 | **NEW** | Test UI restriction during grace, restore on payment |
| P0-14 | Grading workbench auto-advance latency | Integration | R-005 | 2 | 5 | **NEW** | Bumped from P1 — revenue risk. Verify pre-fetch of next submission; measure P95 < 500ms |

**Total P0**: 82 tests (~74 hours — deflated from original 84h because parameterized tests are faster: tenant isolation ~6h not 92h, webhooks ~2h not 6h)

### P1 (High) — Run on PR to main

**Criteria**: Important features + Medium risk (3-4) + Common workflows

| ID | Requirement | Test Level | Risk Link | Tests | Epic | Status | Notes |
|----|-------------|-----------|-----------|-------|------|--------|-------|
| P1-01 | RBAC enforcement at every API endpoint | Integration | R-011 | 12 | 1 | **NEW** | Parameterized: one helper + config array of endpoint/role pairs. ~4h (not 12h) |
| P1-02 | Schedule conflict detection | Unit + Integration | R-009 | 6 | 2 | **EXPAND** | Add timezone/DST/recurring edge cases |
| P1-03 | Recurring session generation (12-week) | Unit | R-010 | 4 | 2 | **EXPAND** | Month boundary, bi-weekly patterns |
| P1-04 | Schedule change email notification E2E | E2E | R-017 | 3 | 2 | **NEW** | Verify email triggered on session edit |
| P1-05 | Exercise question type CRUD — API level | Integration | — | 8 | 3 | **NEW** | API-level tests instead of E2E for question types — faster, less flaky. Use existing exercise-fixtures.ts |
| P1-06 | Mock test assembly + sequential sections | E2E | — | 3 | 3 | Exists (5) | Verify section ordering and score display |
| P1-07 | AI content generation < 30s | Integration | — | 2 | 3 | Exists (14) | Add timeout/degradation test |
| P1-08 | Traffic light health calculation | Unit | R-012 | 5 | 6 | Exists (47) | Add edge cases (0 sessions, exactly 80%) |
| P1-09 | Email intervention RBAC (Owner/Admin only) | E2E | — | 3 | 6 | Exists (19) | Verify teacher cannot send |
| P1-10 | Email rate limiting enforcement | Integration | R-013 | 4 | 7 | **NEW** | Concurrent triggers, daily cap |
| P1-11 | Notification preferences toggle | E2E | — | 3 | 7 | **NEW** | Automate before question types (stable flow, high manual-only gap) |
| P1-12 | Parent email registration + welcome email | E2E | — | 3 | 7 | **NEW** | Automate before question types (stable flow, high manual-only gap) |
| P1-13 | Evidence anchor orphaning at edit thresholds | Unit | R-014 | 4 | 5 | Exists (20) | Verify 20%/50% thresholds with rich text |
| P1-14 | CSV import validation (Unicode, duplicates) | Unit | R-015 | 4 | 1 | Exists (32) | Add Vietnamese character edge cases |
| P1-15 | Billing dashboard displays correct tier/usage | E2E | — | 3 | 9 | Exists (16) | Verify amounts, dates, history |
| P1-16 | Subscription upgrade/downgrade via Polar.sh | Integration | — | 3 | 9 | **NEW** | Test prorated upgrade, downgrade at cycle end |

**Total P1**: 58 tests, ~38 hours (deflated: RBAC parameterized ~4h, question types moved to API-level, grading latency moved to P0)

### P2 (Medium) — Run nightly/weekly

**Criteria**: Secondary features + Low risk (1-2) + Edge cases

| ID | Requirement | Test Level | Risk Link | Tests | Epic | Status |
|----|-------------|-----------|-----------|-------|------|--------|
| P2-01 | User profile self-service (edit name, photo, language) | E2E | — | 4 | 1 | Exists (20) |
| P2-02 | Password reset flow end-to-end | E2E | — | 3 | 1 | Exists (8) |
| P2-03 | Center branding (logo upload, timezone) | E2E | — | 3 | 1 | Exists (22 settings) |
| P2-04 | Attendance tracking bulk actions | E2E | — | 3 | 2 | Exists (5) |
| P2-05 | Drag-to-create session | E2E | — | 2 | 2 | **NEW** |
| P2-06 | Exercise library filters (skill/type/band/status/tags) | E2E | — | 4 | 3 | Exists (8) |
| P2-07 | Exercise assignment to multiple classes | E2E | — | 3 | 3 | Exists (9) |
| P2-08 | Student assignment dashboard sections | E2E | — | 3 | 3 | Exists (8) |
| P2-09 | Timer & auto-submit on expiry | E2E | — | 3 | 3 | **NEW** |
| P2-10 | AI tagging & organization | E2E | — | 3 | 3 | Exists (7) |
| P2-11 | Mobile submission touch-friendly inputs | E2E | R-024 | 3 | 4 | Exists (9) |
| P2-12 | Split-screen grading interface layout | E2E | — | 3 | 5 | Exists (11) |
| P2-13 | Free-form teacher commenting (anchored + unanchored) | E2E | — | 3 | 5 | Exists (8) |
| P2-14 | Student feedback view (inline comments, score breakdown) | E2E | — | 3 | 5 | Exists (8) |
| P2-15 | Student profile overlay (slide-over, no reload) | E2E | — | 3 | 6 | Exists (22) |
| P2-16 | Teacher student health view (scoped access) | E2E | — | 3 | 6 | Exists (15) |
| P2-17 | Engagement email (7-day streak, personal best) | Integration | — | 4 | 7 | Exists (20+7) |
| P2-18 | WCAG 2.1 AA accessibility audit | E2E (axe) | — | 10 | All | **NEW** |
| P2-19 | Landing page responsive (375px) | E2E | R-018 | 3 | 10 | Exists (17) |
| P2-20 | Landing page links and CTAs | E2E | — | 2 | 10 | Exists (17) |

**Total P2**: 66 tests, ~33 hours

### P3 (Low) — Run on-demand

| ID | Requirement | Test Level | Tests | Epic | Status |
|----|-------------|-----------|-------|------|--------|
| P3-01 | Audio waveform preview in listening builder | E2E | 2 | 3 | **NEW** |
| P3-02 | Diagram labelling visual editor (R14) | E2E | 2 | 3 | **NEW** |
| P3-03 | Speaking exercise audio recording | E2E | 2 | 3 | **NEW** |
| P3-04 | Grading breather animation after 5 items | E2E | 1 | 5 | **NEW** |
| P3-05 | Account deletion 7-day grace period | Integration | 2 | 1 | Exists (4) |
| P3-06 | Invitation 48-hour expiry | Integration | 2 | 1 | Exists (5) |
| P3-07 | Receipt download from billing history | E2E | 2 | 9 | **NEW** |
| P3-08 | Email notification template rendering (all templates) | Unit | 5 | 2,6,7 | Exists (45) |
| P3-09 | Navigation breadcrumb correctness | E2E | 3 | 1 | Exists (25) |
| P3-10 | Dashboard widget rendering (role-specific) | E2E | 4 | 1 | Exists (29) |
| P3-11 | Exercise duplication to Draft | E2E | 2 | 3 | **NEW** |
| P3-12 | Bulk actions (archive, tag, assign) | E2E | 2 | 3 | **NEW** |

**Total P3**: 29 tests, ~7.25 hours

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch build-breaking issues

- [ ] Backend health endpoint responds 200 (5s)
- [ ] Login with valid credentials succeeds (15s)
- [ ] Dashboard loads for Owner role (15s)
- [ ] Tenant isolation — wrong centerId returns 403 (10s)
- [ ] Exercise list page loads (10s)
- [ ] Grading queue page loads (10s)

**Total**: 6 scenarios, ~65s

### P0 Tests (<10 min)

**Purpose**: Critical path validation

- [ ] Cross-tenant data access blocked — 23 models × read + write (Integration, parameterized)
- [ ] Static analysis — no raw PrismaClient in business modules (CI lint)
- [ ] Token refresh cycle + invalidation (Integration)
- [ ] Answer key matching across all question types (Unit)
- [ ] Band score calculation with boundary cases (Unit)
- [ ] Student submission → auto-save → sync (E2E)
- [ ] Offline mutation queue FIFO ordering (Unit)
- [ ] Offline resilience — queue + retry (E2E)
- [ ] Webhook signature validation (Integration)
- [ ] Grace period day-14 boundary enforcement (Integration)
- [ ] Grace period UI restriction + restore (E2E)
- [ ] Grading workbench auto-advance pre-fetch (Integration)

**Total**: 82 scenarios

### P1 Tests (<30 min)

**Purpose**: Important feature coverage

- [ ] RBAC API endpoint enforcement (Integration)
- [ ] Schedule conflict detection edge cases (Unit + Integration)
- [ ] Email notification triggers (E2E + Integration)
- [ ] Notification preferences (E2E)
- [ ] Exercise creation all skill types (E2E)
- [ ] Health dashboard calculation edge cases (Unit)
- [ ] Evidence anchor thresholds (Unit)
- [ ] Billing tier management (E2E + Integration)

**Total**: 68 scenarios

### P2/P3 Tests (<60 min)

**Purpose**: Full regression coverage

- [ ] User management CRUD flows (E2E)
- [ ] Scheduling UI interactions (E2E)
- [ ] Exercise library management (E2E)
- [ ] Grading interface details (E2E)
- [ ] Student health views (E2E)
- [ ] Accessibility audit (E2E/axe)
- [ ] Landing page (E2E)
- [ ] Low-priority edge cases (various)

**Total**: 95 scenarios

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Avg Hours/Test | Total Hours | Notes |
|----------|-------|---------------|-------------|-------|
| P0 | 82 | 0.9 | 74 | Parameterized tenant isolation (46 tests, ~6h); lint rule (~1h); webhooks (~2h); grading latency (~2h); rest at ~2h/test |
| P1 | 58 | 0.66 | 38 | RBAC parameterized (~4h for 12); API-level question types (~8h for 8); notification E2E (~3h each) |
| P2 | 66 | 0.5 | 33 | Simple scenarios — existing flows, accessibility |
| P3 | 29 | 0.25 | 7.25 | Exploratory — media, edge cases |
| **Total** | **235** | **—** | **152.25** | **~19 days** |

> **Estimate rationale (Party-Mode):** Original estimates used flat per-test rates (2h/P0, 1h/P1). Revised to reflect that parameterized tests (tenant isolation, RBAC) amortize setup cost across many assertions. A config-driven test with 46 iterations takes ~6h total, not 46 × 2h.

### New Tests Required (not counting existing)

| Category | New Tests | Effort | Source | Notes |
|----------|-----------|--------|--------|-------|
| Cross-tenant isolation (P0) | 46 | 6h | Gap analysis | Parameterized: 23 models × 2 ops, one helper |
| Static analysis lint rule (P0) | 1 | 1h | Party-mode | CI grep for raw `new PrismaClient()` |
| Offline mutation queue FIFO (P0) | 3 | 4h | Party-mode | Unit test for queue ordering |
| Grading latency pre-fetch (P0) | 2 | 2h | Party-mode (bumped from P1) | Revenue risk |
| Webhook security (P0) | 3 | 2h | Gap analysis | 3 assertions on 1 endpoint |
| Grace period boundaries (P0+E2E) | 7 | 10h | Gap analysis | |
| RBAC API enforcement (P1) | 12 | 4h | Gap analysis | Parameterized helper + config array |
| Question type CRUD — API level (P1) | 8 | 8h | Party-mode | API tests, not E2E — less flaky |
| Email/notification E2E (P1) | 6 | 6h | Gap analysis + manual→auto | Preferences + parent registration |
| Accessibility (P2) | 10 | 5h | Gap analysis | |
| **Total new (gap-filling)** | **98** | **48h (~6 days)** | | |

### Seed Infrastructure (Required)

| Item | Effort | Notes |
|------|--------|-------|
| Extend `seed-e2e.ts` for new E2E tests | 4h | Billing fixtures, second tenant, notification state |
| Multi-tenant test fixture (2 centers) | 3h | Required for P0-01 tenant isolation |
| Large dataset seed (500+ students) | 3h | Required for future performance tests |
| **Total seed work** | **10h** | |

### Manual → Automated Conversion (Recommended)

> **Party-Mode guidance:** Automate stable flows first (notifications, billing badges). Question type UI is flaky in Playwright — use API-level tests instead (already covered in P1-05 above).

| Order | Category | Manual Cases to Automate | Effort | Priority | Stability |
|-------|----------|------------------------|--------|----------|-----------|
| 1 | Notification preferences (Epic 7) | ~5 | 5h | P1 | **High** — simple toggles |
| 2 | Parent email registration (Epic 7) | ~3 | 3h | P1 | **High** — form + verify |
| 3 | Billing dashboard badges (Epic 9) | ~4 | 4h | P2 | **High** — snapshot testing |
| 4 | Timer/auto-submit (Epic 4) | ~3 | 3h | P2 | **Medium** — Playwright clock mocking |
| 5 | Assignment multi-class (Epic 3) | ~5 | 5h | P2 | **Medium** — API setup + UI verify |
| 6 | Question type creation E2E (Epic 3) | ~5 | 5h | P2 | **Low** — rich text, keep minimal; bulk covered by API tests |
| **Total manual→auto** | | **~25** | **25h (~3.1 days)** | | |

**Combined new effort: 98 gap-fill + 25 manual→auto + 10 seed = ~83h (~10.4 days)**
**Reduces manual regression cycle from 305 to ~280 cases** (saves ~1.5-2 hours per manual test run)

### Prerequisites

**Test Data:**
- Tenant isolation test fixture — two centers with distinct data
- Billing test fixture — centers at various subscription states (active, grace, expired)
- Large dataset fixture — 500+ students for performance tests

**Tooling:**
- `@axe-core/playwright` for WCAG 2.1 AA accessibility tests
- Consider `k6` for performance testing (NFR1, NFR2) — currently 0 perf tests

**Environment:**
- Firebase Auth emulator (already configured)
- Inngest dev server for job trigger verification
- Polar.sh test mode / webhook mock for billing tests

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions)
- **P1 pass rate**: ≥95% (waivers required for failures)
- **P2/P3 pass rate**: ≥90% (informational)
- **High-risk mitigations**: 100% complete or approved waivers

### Coverage Targets

- **Critical paths** (auth, submissions, grading, billing): ≥80%
- **Security scenarios** (tenant isolation, RBAC, webhooks): 100%
- **Business logic** (scoring, health calculation, conflict detection): ≥70%
- **Edge cases** (offline, timezone, Unicode): ≥50%

### Non-Negotiable Requirements

- [ ] All P0 tests pass
- [ ] No high-risk (≥6) items unmitigated
- [ ] Security tests (SEC category) pass 100%
- [ ] Tenant isolation verified for all tenanted models
- [ ] Band score calculation matches official IELTS conversion tables

---

## Mitigation Plans

### R-001: Cross-Tenant Data Leakage (Score: 6)

**Mitigation Strategy:**
1. **Parameterized integration tests** — loop over all 23 models in `TENANTED_MODELS` array, testing both read (findMany with wrong centerId → 0 results) and write (create with wrong centerId → rejected) per model. One test helper, 46 assertions. ~6 hours.
2. **Static analysis CI lint rule** — grep for `new PrismaClient()` in `apps/backend/src/modules/`. Currently clean (verified 2026-03-21: only found in plugins, seeds, test helpers). Catch future violations before they ship.
3. **Schema compliance test** — already exists (1 test). Extend to fail if a model has `centerId` column but is not in `TENANTED_MODELS`.

**Owner:** Dev
**Status:** Planned
**Verification:** `TENANTED_MODELS.length × 2` tests pass; CI lint rule blocks raw PrismaClient in business modules

### R-002: JWT Refresh Token Theft (Score: 6)

**Mitigation Strategy:**
1. Test that refresh tokens are rotated on use (old token invalidated)
2. Test that logout invalidates all active refresh tokens
3. Test that password change invalidates all sessions
4. Test account lockout after 5 failed login attempts (already exists — verify)

**Owner:** Dev
**Status:** Partial (lockout tests exist)
**Verification:** Auth integration tests cover rotation, invalidation, and lockout

### R-003: Answer Key Variant Matching Errors (Score: 6)

**Mitigation Strategy:**
1. Expand `answer-utils.test.ts` with adversarial inputs per question type
2. Add edge cases: Unicode answers, mixed numeric forms, trailing punctuation
3. Test partial credit scoring with boundary cases
4. Add regression tests for any reported grading bugs

**Owner:** QA
**Status:** Partial (65 tests exist)
**Verification:** Coverage report shows ≥90% branch coverage on answer-utils.ts

### R-004: Offline Submission Data Loss (Score: 6)

**Mitigation Strategy:**
1. **Mutation queue FIFO ordering** (Unit) — verify that when student saves Q3 then changes Q1, queue replays in correct order on reconnect. This is the real risk per architecture review (TanStack Query `persistQueryClient`). ~4h.
2. E2E test: submit offline → go online → verify server received (exists, 8 tests)
3. Unit test: IndexedDB storage eviction handling (quota exceeded)
4. E2E test: tab crash recovery (re-open → data restored from storage)
5. Test conflict resolution when server has newer data

**Owner:** Dev
**Status:** Partial (8 offline-sync E2E exist)
**Verification:** Mutation queue unit tests pass; offline E2E flow works on Mobile Chrome emulation

### R-005: AI Grading Latency > SLO (Score: 6)

**Mitigation Strategy:**
1. Integration test verifying pre-fetch of next submission triggers on grading start
2. Performance benchmark: measure P95 latency for grading workbench advance
3. Test graceful degradation: AI timeout → manual grading available
4. Monitor Inngest job execution times in production

**Owner:** Dev
**Status:** Planned
**Verification:** P95 latency metric < 500ms in test environment

### R-006: Polar.sh Webhook Spoofing (Score: 6)

**Mitigation Strategy:**
1. Integration test: valid signature → accepted
2. Integration test: invalid signature → 401 rejected
3. Integration test: replayed event (same event ID) → idempotent (no duplicate processing)
4. Test that webhook handler validates expected event types

**Owner:** Dev
**Status:** Partial (5 webhook integration tests exist)
**Verification:** Webhook endpoint rejects all unsigned/replayed requests

### R-007: Grace Period Logic Error (Score: 6)

**Mitigation Strategy:**
1. Integration test: day 0 (lapse) → full access + banner shown
2. Integration test: day 13 → full access + banner shown
3. Integration test: day 14 → enrollment restricted, existing access preserved
4. Integration test: day 15 → enrollment restricted
5. Integration test: payment during grace → instant full restore
6. E2E test: UI banner visibility and restriction behavior

**Owner:** QA
**Status:** Partial (8 grace period job tests exist)
**Verification:** Boundary tests pass for days 0, 13, 14, 15

### R-008: Mock Test Band Score Miscalculation (Score: 6)

**Mitigation Strategy:**
1. Verify existing 40 band-score tests against official IELTS conversion tables
2. Add boundary score tests (e.g., raw score that rounds up vs down to nearest 0.5)
3. Test multi-skill overall averaging (Reading 6.5 + Listening 7.0 + Writing 6.0 + Speaking 6.5 = 6.5)
4. Test with all possible raw score values for each section

**Owner:** QA
**Status:** Partial (40 tests exist)
**Verification:** All conversion table entries have corresponding test assertions

---

## Assumptions and Dependencies

### Assumptions

1. Firebase Auth emulator accurately replicates production token behavior
2. Inngest dev server job execution timing is representative of production
3. Polar.sh test mode webhooks match production webhook format
4. All tenanted models are listed in TENANTED_MODELS array (no unlisted models)

### Dependencies

1. `@axe-core/playwright` package — Required for P2 accessibility tests
2. Polar.sh test API credentials — Required for billing integration tests
3. Large dataset seed script — Required for performance tests (500+ students)

### Risks to Plan

- **Risk**: Test data setup time dominates test execution time
  - **Impact**: CI pipeline exceeds time budget
  - **Contingency**: Invest in API-based fixtures (already partially done) and parallel test execution

- **Risk**: Inngest job tests are flaky due to timing
  - **Impact**: P0 tests intermittently fail
  - **Contingency**: Use Inngest step mocking for unit tests; reserve full job tests for nightly runs

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 tests (separate workflow; not auto-run).
- Run `*automate` for broader coverage once implementation exists.
- Run `*review` to validate test quality after tests are written.

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: _____________ Date: _____________
- [ ] Tech Lead: _____________ Date: _____________
- [ ] QA Lead: _____________ Date: _____________

**Comments:**

---

## Appendix

### Party-Mode Findings

**Date:** 2026-03-21
**Participants:** Murat (Test Architect), Winston (Architect), Amelia (Developer)

**Key decisions and changes applied to this document:**

1. **Tenant isolation test count**: Sized to `TENANTED_MODELS.length × 2` = 46 tests (was 6). Parameterized — one helper loops over all 23 models. Effort: ~6h, not 92h.

2. **Static analysis CI lint rule**: Added P0-02 — grep-based CI rule to block `new PrismaClient()` in business modules. Currently clean (only in plugins/seeds/tests). Catches the class of bug before it ships. Cheapest mitigation on the board.

3. **Grading latency bumped to P0**: Moved from P1-14 to P0-14. Rationale: if a teacher grades 200 submissions and the workbench lags, they abandon the tool. Revenue risk masquerading as a performance risk.

4. **Automate stable flows first**: Notification preferences and parent email registration should be automated before question type creation. Question type E2E with rich text editors is the flakiest category.

5. **API tests over E2E for question type CRUD**: Changed P1-05 from E2E to API-level integration tests using existing `exercise-fixtures.ts`. Faster, less brittle, and already have the test infrastructure.

6. **Mutation queue FIFO ordering**: Added P0-09 — targeted unit test for offline sync. The real risk is queue replay ordering with concurrent writes, not generic "offline → online" flows. More targeted than another E2E test.

7. **Effort estimates deflated**: RBAC endpoint enforcement (12 tests): 4h not 12h (parameterized). Webhook validation (3 tests): 2h not 6h (3 assertions on 1 endpoint). Overall: ~83h combined new effort, down from ~93h.

8. **Seed infrastructure effort**: Added 10h for extending `seed-e2e.ts` — billing fixtures, second tenant, notification state. Every new E2E test needs data; this was missing from original estimates.

### Knowledge Base References

- `risk-governance.md` — Risk classification framework (6 categories, gate decisions)
- `probability-impact.md` — Risk scoring methodology (3×3 matrix)
- `test-levels-framework.md` — Test level selection (E2E/API/Component/Unit)
- `test-priorities-matrix.md` — P0-P3 prioritization criteria

### Related Documents

- PRD: `_bmad-output/planning-artifacts/prd.md`
- Epics: `_bmad-output/planning-artifacts/epics.md`
- Architecture: `_bmad-output/planning-artifacts/architecture.md`
- Sprint Status: `_bmad-output/implementation-artifacts/sprint-status.yaml`

---

**Generated by**: BMad TEA Agent — Test Architect Module
**Workflow**: `_bmad/bmm/testarch/test-design`
**Version**: 4.0 (BMad v6)
