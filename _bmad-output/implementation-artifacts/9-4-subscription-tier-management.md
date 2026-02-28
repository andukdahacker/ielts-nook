# Story 9.4: Subscription Tier Management

Status: done

## Story

As a Center Owner,
I want to view available tiers and upgrade/downgrade my plan,
so that my subscription matches my center's current size.

## Acceptance Criteria

1. **AC1 — Tier Comparison Table**: Billing page shows current tier highlighted and a comparison table of all tiers with: tier name, flat monthly price, student limit.
2. **AC2 — Change Plan via Polar Portal**: "Change Plan" action opens Polar.sh customer portal for tier changes. For pilot users without an active subscription, per-tier "Subscribe" buttons create a checkout session for the selected tier.
3. **AC3 — Upgrade/Downgrade Timing**: Upgrades take effect immediately (prorated by Polar). Downgrades take effect at next billing cycle. UI clearly communicates this timing to the user.
4. **AC4 — Student Limit Warning**: If enrolled students exceed the target tier's `maxStudents` on downgrade, system warns before confirming. Warning appears inline in the tier comparison table for any tier whose limit the center exceeds.

## Tasks / Subtasks

- [x] Task 1: Add `GET /api/v1/billing/tiers` backend endpoint (AC: #1)
  - [x] 1.1 Add Zod schemas to `packages/types/src/billing.ts`:
        ```typescript
        export const TierInfoSchema = z.object({
          name: z.enum(["starter", "growth", "enterprise"]),
          displayName: z.string(),
          flatPriceCents: z.number(),
          maxStudents: z.number().nullable(),
          isCurrent: z.boolean(),
        });
        export const TiersResponseSchema = z.object({
          tiers: z.array(TierInfoSchema),
          currentTier: z.string(),
          enrolledStudents: z.number(),
        });
        ```
  - [x] 1.2 Add `getTierComparison(centerId)` to `BillingService` in `apps/backend/src/modules/billing/billing.service.ts` — reads TIERS constant, filters out pilot, upserts subscription for current tier, counts enrolled students via `getTenantedClient`
  - [x] 1.3 Add `getTiers(centerId)` to `BillingController` in `apps/backend/src/modules/billing/billing.controller.ts`
  - [x] 1.4 Add `GET /tiers` route to `apps/backend/src/modules/billing/billing.routes.ts` — OWNER-only, same auth pattern as existing routes
  - [x] 1.5 Unit tests (~4 tests) for `getTierComparison` in `billing.service.test.ts`: returns 3 tiers excluding pilot, isCurrent flag accuracy, enrolledStudents count, pilot subscription has no isCurrent match
  - [x] 1.6 Integration tests (~3 tests) for `GET /api/v1/billing/tiers` in `billing.routes.integration.test.ts`: 200 for OWNER, 403 for non-OWNER, correct isCurrent based on subscription state
- [x] Task 2: Build `TierComparisonTable` frontend component (AC: #1, #3, #4)
  - [x] 2.1 Create `TierComparisonTable.tsx` in `apps/webapp/src/features/settings/components/`
  - [x] 2.2 Display all paid tiers (starter, growth, enterprise) with price, student limit, current-tier highlight
  - [x] 2.3 Show student limit warning badge on tiers where `enrolledStudents > maxStudents`
  - [x] 2.4 Show timing text: "Immediate (prorated)" for upgrades, "Effective next billing cycle" for downgrades
  - [x] 2.5 Per-tier action: "Current Plan" badge, "Upgrade" button, "Downgrade" button, or "Subscribe" (if pilot)
- [x] Task 3: Wire tier selection to Polar.sh (AC: #2)
  - [x] 3.1 Add `useTiers()` query hook to `billing.api.ts`
  - [x] 3.2 Pilot users: per-tier "Subscribe" button calls existing `POST /checkout` with selected tier
  - [x] 3.3 Active subscribers: "Change Plan" opens Polar customer portal (existing `portalUrl`)
  - [x] 3.4 Add student limit confirmation dialog (use `AlertDialog` from `@workspace/ui`, follow `SubmitConfirmDialog.tsx` pattern in `apps/webapp/src/features/submissions/components/`) before opening portal/checkout when downgrading past student count
- [x] Task 4: Integrate into BillingPage (AC: #1, #2, #3, #4)
  - [x] 4.1 Add `TierComparisonTable` section to `BillingPage.tsx` below metric cards
  - [x] 4.2 Fix hardcoded checkout in `BillingPage.tsx:135` — currently `checkout.mutate("starter")` always uses starter tier. Replace with tier-aware checkout from `TierComparisonTable`. Update `SubscriptionAction` to show "Change Plan" instead of generic "Manage Subscription" for active subscribers
  - [x] 4.3 Handle `?plan_changed=true` URL param on return from Polar portal to invalidate queries and show toast
- [x] Task 5: Schema sync and verification (AC: all)
  - [x] 5.1 Start backend: `pnpm --filter=backend dev` (required — schema sync hits running backend)
  - [x] 5.2 Regenerate frontend types: `pnpm --filter=webapp sync-schema-dev`
  - [x] 5.3 Run full backend test suite: `pnpm --filter=backend test` (all 1026 tests pass)
  - [x] 5.4 Verify webapp builds: `pnpm --filter=webapp build`

## Dev Notes

### Architecture & Patterns

**Route-Controller-Service pattern** (mandatory): Service returns raw data, Controller wraps in `{ data, message }`, Route handles Fastify specifics and auth.

**OWNER-only access**: All billing routes use `requireRole(["OWNER"])`. Follow exact same pattern as existing billing routes.

**Subscription is NOT tenanted**: Use `this.prisma.subscription` directly (not `getTenantedClient`). Student count queries DO use `getTenantedClient(this.prisma, centerId)`.

**TIERS constant is the source of truth**: `apps/backend/src/modules/billing/billing.constants.ts` defines all tiers. The new endpoint should read from this constant — do NOT hardcode tier data elsewhere.

### Critical Implementation Warnings

1. **TIERS constant is the ONLY source of tier data.** Do NOT hardcode tier names, prices, or limits in frontend components, services, or tests. Always read from `billing.constants.ts` TIERS.
2. **Subscription is NOT tenanted.** Use raw `this.prisma.subscription` for all Subscription queries — same pattern as 9.1/9.2/9.3.
3. **Student count queries ARE tenanted.** Use `getTenantedClient(this.prisma, centerId)` to count enrolled students (centerMembership). This was a code review finding in 9.3.
4. **Portal URL may be null.** `getCustomerPortalUrl()` returns null when no `polarCustomerId` exists (pilot users). Frontend must disable "Change Plan" button when `portalUrl === null`.
5. **Polar handles prorating — do NOT implement proration.** Polar manages upgrade immediacy and downgrade-at-cycle-end. Our webhook handler already processes `subscription.updated` events.
6. **`BillingPage.tsx:135` hardcodes `checkout.mutate("starter")`** — this MUST be replaced with per-tier checkout for pilot users.
7. **Format currency consistently.** Use `Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)` — same pattern as `BillingMetricCards.tsx:26`.
8. **No new env vars needed.** This story uses only existing POLAR_* and FRONTEND_URL vars from 9.2.

### Tier Pricing (Flat Monthly — NOT Per-Student)

**Note:** Epic AC1 references "per-student rate" — this is outdated. Pricing model changed to flat monthly in commit `8efe6fe`. The story implements the current flat monthly model. Current tiers:

| Tier | Price | Student Limit |
|:-----|:------|:-------------|
| Pilot | $0 (free) | Unlimited |
| Starter | $20/mo | 30 students |
| Growth | $50/mo | 100 students |
| Enterprise | $100/mo | Unlimited |

The `pilot` tier should NOT appear in the comparison table — it's a temporary free phase, not a purchasable plan.

### Change Plan Flow

**Pilot users (no active Polar subscription):**
1. User clicks "Subscribe" on desired tier
2. Frontend calls `POST /api/v1/billing/checkout` with `{ tier: "starter"|"growth"|"enterprise" }`
3. User completes checkout on Polar.sh
4. Polar webhook `subscription.active` fires → `handleSubscriptionEvent()` updates status + tier
5. User returns to billing page with `?checkout=success` → toast + query invalidation

**Active subscribers changing tiers:**
1. User clicks "Change Plan" button
2. Frontend opens `portalUrl` (Polar customer portal) in new tab
3. User changes plan in Polar portal
4. Polar webhook `subscription.updated` fires → `handleSubscriptionEvent()` maps new `productId` → tier
5. User returns to billing page → data refreshes

**Polar handles prorating and billing cycle logic.** We do NOT implement proration ourselves.

### Student Limit Warning Logic

Frontend-only check (no backend validation needed since Polar manages the actual subscription):

```
if (targetTier.maxStudents !== null && enrolledStudents > targetTier.maxStudents) {
  // Show warning: "You have {enrolledStudents} students enrolled.
  // The {tierName} plan supports up to {maxStudents} students.
  // Excess students may be affected when the downgrade takes effect."
}
```

Show warning inline in the tier comparison row AND as a confirmation dialog when the user clicks a downgrade action. Do NOT block the action — just warn.

### Existing Code to Reuse (DO NOT REINVENT)

| What | File | Why Reuse |
|:-----|:-----|:----------|
| `TIERS` constant | `billing.constants.ts` | Source of truth for tier config |
| `calculateMonthlyEstimate()` | `billing.constants.ts` | Already computes price from tier |
| `createCheckoutSession()` | `billing.service.ts:131` | Checkout for pilot → paid tier |
| `getCustomerPortalUrl()` | `billing.service.ts:303` | Portal URL for plan changes |
| `handleSubscriptionEvent()` | `billing.service.ts:159` | Already handles `subscription.updated` webhook |
| `useCreateCheckout()` | `billing.api.ts:48` | Existing mutation hook for checkout |
| `useBillingOverview()` | `billing.api.ts:12` | Already returns tier + enrolledStudents + portalUrl |
| `TIER_DISPLAY` mapping | `BillingMetricCards.tsx:4` | Display names for tiers |
| Shadcn `Card`, `Button`, `Badge` | `@workspace/ui` | Existing UI primitives |
| `AlertDialog` | `@workspace/ui/components/alert-dialog` | For downgrade confirmation |
| `SubmitConfirmDialog` | `features/submissions/components/SubmitConfirmDialog.tsx` | Reference pattern for confirmation dialog (open/onConfirm/warning state) |

### New Endpoint Design

**`GET /api/v1/billing/tiers`**

Response schema:
```typescript
{
  data: {
    tiers: Array<{
      name: string;            // "starter" | "growth" | "enterprise"
      displayName: string;     // "Starter" | "Growth" | "Enterprise"
      flatPriceCents: number;  // 2000, 5000, 10000
      maxStudents: number | null; // 30, 100, null
      isCurrent: boolean;      // true if matches subscription tier
    }>;
    currentTier: string;       // Current subscription tier name
    enrolledStudents: number;  // Current enrolled student count
  },
  message: string
}
```

Implementation: Read from `TIERS` constant, filter out `pilot`, add `isCurrent` flag from subscription, add enrolled student count.

### Project Structure Notes

All billing code is co-located in the `modules/billing/` directory. New files go here:

```
apps/backend/src/modules/billing/
  billing.constants.ts       ← TIERS source of truth (exists)
  billing.service.ts         ← Add getTierComparison() (exists)
  billing.controller.ts      ← Add getTiers() (exists)
  billing.routes.ts          ← Add GET /tiers (exists)
  billing.service.test.ts    ← Add tier comparison tests (exists)

apps/webapp/src/features/settings/
  billing.api.ts             ← Add useTiers() hook (exists)
  components/
    TierComparisonTable.tsx  ← NEW: tier comparison UI
    BillingMetricCards.tsx   ← No changes needed (exists)
  pages/
    BillingPage.tsx          ← Add TierComparisonTable section (exists)

packages/types/src/
  billing.ts                 ← Add TierInfoSchema, TiersResponseSchema (exists)
```

### Testing Requirements

**Backend unit tests** (`billing.service.test.ts`):
- `getTierComparison()` returns correct tier list excluding pilot
- `isCurrent` flag correctly marks the active tier
- `enrolledStudents` count is accurate
- Works for pilot subscriptions (no tier is marked current among paid tiers)

**Backend integration test** (in `billing.routes.integration.test.ts`):
- `GET /api/v1/billing/tiers` returns 200 with correct shape for OWNER
- Returns 403 for non-OWNER roles
- Returns correct `isCurrent` based on subscription state

**Frontend**: No unit tests required for this story — visual/integration testing covers tier table rendering.

### References

- [Source: `apps/backend/src/modules/billing/billing.constants.ts`] — TIERS constant with pricing
- [Source: `apps/backend/src/modules/billing/billing.service.ts`] — Existing billing service methods
- [Source: `apps/backend/src/modules/billing/billing.routes.ts`] — Existing route patterns
- [Source: `apps/backend/src/modules/billing/billing.controller.ts`] — Existing controller patterns
- [Source: `packages/types/src/billing.ts`] — Existing billing Zod schemas
- [Source: `apps/webapp/src/features/settings/pages/BillingPage.tsx`] — Current billing UI
- [Source: `apps/webapp/src/features/settings/billing.api.ts`] — Existing billing query hooks
- [Source: `apps/webapp/src/features/settings/components/BillingMetricCards.tsx`] — TIER_DISPLAY mapping
- [Source: `_bmad-output/planning-artifacts/epics.md#Epic 9, Story 9.4`] — FR48 requirements
- [Source: `_bmad-output/planning-artifacts/research/market-classlite-vietnam-pricing-research-2026-02-27.md`] — Pricing research (future reference)
- [Source: `project-context.md`] — Multi-tenancy rules, layered architecture, testing rules

### Previous Story Intelligence (from 9.1, 9.2, 9.3)

**Patterns established in Epic 9:**
- `Subscription` model uses raw `this.prisma` (NOT tenanted) — unique on `centerId`
- `BillingEvent` and `StudentCountSnapshot` use `getTenantedClient`
- Money in cents (integers), formatted on frontend with `Intl.NumberFormat`
- Checkout creates Polar session with `{ centerId }` in metadata
- Customer portal sessions via `polar.customerSessions.create()`
- Webhook→Inngest→Job pattern for all async billing processing
- `ErrorResponseSchema` used for 400 responses across all billing routes
- `authMiddleware` at group level + `requireRole(["OWNER"])` per-route
- Tests mock inngest with `vi.mock("../inngest/client.js", ...)`

**Code review findings from 9.3 (avoid same mistakes):**
- Always use `getTenantedClient()` for centerMembership queries (not raw prisma)
- Inngest step functions should return values, not use closure side-effects
- Handle all subscription statuses in UI (including `inactive`)
- HTML-escape any user data in email templates

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- Types package rebuild required for integration tests to pass (Zod schema validation in fastify-type-provider-zod)
- Used `mockResolvedValueOnce` in integration tests to prevent mock bleed between test suites

### Completion Notes List
- Task 1: Added `GET /api/v1/billing/tiers` endpoint — Zod schemas (`TierInfoSchema`, `TiersResponseSchema`), service method `getTierComparison()`, controller, route. 4 unit tests + 3 integration tests, all pass.
- Task 2: Created `TierComparisonTable.tsx` — 3-column card grid showing paid tiers with price, student limit, current-tier highlight (ring), upgrade/downgrade timing text, and student limit warning badges.
- Task 3: Added `useTiers()` query hook, per-tier checkout for pilot users, portal link for active subscribers, `DowngradeConfirmDialog.tsx` following `SubmitConfirmDialog` pattern.
- Task 4: Integrated into `BillingPage.tsx` — replaced hardcoded `checkout.mutate("starter")` with tier-aware checkout from `TierComparisonTable`. Updated `SubscriptionAction` to show "Change Plan" instead of "Manage Subscription". Added `?plan_changed=true` URL param handler.
- Task 5: Schema synced, all 1026 backend tests pass, webapp builds cleanly.

### File List
- `packages/types/src/billing.ts` — Added `TierInfoSchema`, `TiersResponseSchema` Zod schemas
- `apps/backend/src/modules/billing/billing.service.ts` — Added `getTierComparison(centerId)` method
- `apps/backend/src/modules/billing/billing.controller.ts` — Added `getTiers(centerId)` method
- `apps/backend/src/modules/billing/billing.routes.ts` — Added `GET /tiers` OWNER-only route
- `apps/backend/src/modules/billing/billing.service.test.ts` — Added 4 unit tests for `getTierComparison`
- `apps/backend/src/modules/billing/billing.routes.integration.test.ts` — Added 3 integration tests for `GET /tiers`
- `apps/webapp/src/features/settings/billing.api.ts` — Added `useTiers()` hook and `tiers` query key
- `apps/webapp/src/features/settings/components/TierComparisonTable.tsx` — NEW: Tier comparison card grid
- `apps/webapp/src/features/settings/components/DowngradeConfirmDialog.tsx` — NEW: Downgrade confirmation dialog
- `apps/webapp/src/features/settings/pages/BillingPage.tsx` — Integrated TierComparisonTable, fixed hardcoded checkout, added plan_changed handler
- `apps/webapp/src/schema/schema.d.ts` — Regenerated (auto-generated)

## Senior Developer Review (AI)

**Reviewer:** Ducdo (Dev Agent — Claude Opus 4.6) on 2026-02-28

**Result:** APPROVED with fixes applied (6 issues fixed automatically)

### Issues Found & Fixed

| # | Severity | File | Issue | Fix |
|:--|:---------|:-----|:------|:----|
| 1 | HIGH | `billing.api.ts` | `useCreateCheckout` called `window.open` from async `onSuccess` — popup blockers silently eat checkout URLs for pilot users | Removed `onSuccess` from hook; BillingPage pre-opens blank tab synchronously in click handler, sets URL on success, falls back to `location.href` if blocked |
| 2 | MEDIUM | `BillingPage.tsx` | `setSearchParams({})` cleared ALL URL params instead of just the handled one | Changed to `new URLSearchParams(searchParams)` + `.delete(key)` to preserve other params |
| 3 | MEDIUM | `BillingPage.tsx` | Dead code in `onDowngradeConfirm` — else branch unreachable because callback only invoked when `exceedsLimit` is true | Removed dead else branch |
| 4 | MEDIUM | `BillingPage.tsx` | `?plan_changed=true` handler unreachable — portal opens in `_blank` tab which cannot set params on original tab | Added comment documenting dormant status; handler preserved for future Polar portal return URL configuration |
| 5 | LOW | `TierComparisonTable.tsx` | `formatPrice` hardcoded `currency: "USD"` while `BillingMetricCards` uses dynamic currency | Added `currency` prop (default `"USD"`), passed from BillingPage via `overview.usage.currency` |
| 6 | LOW | `TierComparisonTable.tsx` | `isUpgrade`/`isPilot`/`currentIdx` computed redundantly in render loop AND in `getTierAction` | Computed `isPilot`/`currentIdx` once outside map; `getTierAction` now accepts pre-computed `isPilot`, `isUpgrade`, `exceedsLimit` |

### Accepted Trade-off (Not Fixed)

- **MEDIUM — Redundant DB calls on page load**: Both `useBillingOverview` and `useTiers` independently upsert subscription and count students. Accepted as architectural trade-off — separate endpoints with clean API separation outweighs minor double-query cost. Upserts are idempotent, count queries are fast.

### Verification

- All 1026 backend tests pass
- Webapp builds cleanly
- No new files introduced by review fixes

## Change Log
- 2026-02-28: Story 9.4 implemented — Subscription tier management with comparison table, per-tier checkout/portal actions, student limit warnings, and downgrade confirmation dialog.
- 2026-02-28: Code review — 6 issues fixed (1 HIGH, 3 MEDIUM, 2 LOW). Popup blocker vulnerability resolved, dead code removed, URL param handling fixed, currency consistency improved.
