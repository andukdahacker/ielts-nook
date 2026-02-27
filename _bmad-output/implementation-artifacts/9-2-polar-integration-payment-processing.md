# Story 9.2: Polar.sh Integration & Payment Processing

Status: done

## Story

As a Center Owner,
I want to pay my subscription via self-serve checkout,
so that I can manage billing without contacting sales.

> **FR45:** This is the second billing story. It adds the actual Polar.sh payment integration on top of the billing dashboard (Story 9.1). Centers can subscribe via Polar.sh checkout, webhooks update subscription status in real-time, and receipts appear in the billing dashboard. This story does NOT implement grace period enforcement (Story 9.3) or tier upgrade/downgrade UI (Story 9.4).

## Acceptance Criteria

1. **AC1 — Checkout Redirect:** "Subscribe" button on the billing page redirects OWNER to a Polar.sh checkout session pre-filled with center context (centerId in metadata, owner email pre-filled). On return from successful checkout, the billing page refreshes to show active subscription status.
2. **AC2 — Webhook Processing:** Polar.sh webhook endpoint at `POST /api/v1/billing/webhooks/polar` receives and verifies webhook events. Subscription events (`subscription.created`, `subscription.active`, `subscription.updated`, `subscription.canceled`, `subscription.uncanceled`, `subscription.revoked`, `subscription.past_due`) update the center's `Subscription` record in real-time.
3. **AC3 — Subscription Activation:** On `subscription.active` or `subscription.created` (with active status), the Subscription record is updated: `status = "active"`, `tier` mapped from Polar product metadata, `polarSubscriptionId` and `polarCustomerId` stored, `currentPeriodStart`/`currentPeriodEnd` set from webhook data.
4. **AC4 — Failed Payment Handling:** On `subscription.past_due` webhook, Subscription status updates to `past_due`. Polar.sh handles automatic retry (dunning). The billing dashboard shows "Payment Failed" status with a "Update Payment Method" link to the Polar customer portal.
5. **AC5 — Receipt Generation:** On `order.paid` webhook, a `BillingEvent` record is created with `type: "payment"`, `status: "paid"`, `amount` from the order, and `invoiceUrl` from the Polar order's invoice. Receipts are visible in the payment history table on the billing dashboard.

## Tasks / Subtasks

- [x] **Task 1: Install dependencies** (AC: 1, 2)
  - [x] 1.1 Install `@polar-sh/sdk` in `apps/backend`: `pnpm --filter=backend add @polar-sh/sdk`
  - [x] 1.2 Install `fastify-raw-body` in `apps/backend`: `pnpm --filter=backend add fastify-raw-body`

- [x] **Task 2: Polar.sh client module** (AC: 1, 2, 3, 4, 5)
  - [x] 2.1 Create `apps/backend/src/modules/billing/polar.client.ts` — singleton Polar SDK client
  - [x] 2.2 Add environment variables to `apps/backend/src/app.ts` env schema (JSON Schema format, NOT Zod): `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_PRODUCT_ID_STARTER`, `POLAR_PRODUCT_ID_GROWTH`, `POLAR_PRODUCT_ID_ENTERPRISE`, `POLAR_MODE`, `FRONTEND_URL` — all optional in the schema (DO NOT add to `required` array) so app starts without Polar in local dev. Add runtime guards in service methods instead.
  - [x] 2.3 Register `fastify-raw-body` plugin in `apps/backend/src/app.ts` (global: false — only enabled per-route)
  - [x] 2.4 Write unit tests for polar client initialization

- [x] **Task 3: Extend billing service — checkout + webhook processing** (AC: 1, 2, 3, 4, 5)
  - [x] 3.1 Add `createCheckoutSession(centerId, ownerEmail, tier)` to `BillingService` — creates Polar checkout with center metadata and success/return URLs
  - [x] 3.2 Add `handleSubscriptionEvent(event)` to `BillingService` — processes subscription webhook events, updates Subscription record
  - [x] 3.3 Add `handleOrderPaidEvent(event)` to `BillingService` — creates BillingEvent record from paid order
  - [x] 3.4 Add `getCustomerPortalUrl(centerId)` to `BillingService` — creates pre-authenticated Polar customer portal session
  - [x] 3.5 Add `mapPolarProductToTier(productId)` private method — maps Polar product IDs to internal tier names using env vars
  - [x] 3.6 Update `getPortalUrl()` to use `getCustomerPortalUrl()` (dynamic session-based URL instead of static env var)
  - [x] 3.7 Write unit tests for all new service methods

- [x] **Task 4: Extend billing controller** (AC: 1, 3, 4, 5)
  - [x] 4.1 Add `createCheckout(centerId, ownerEmail, tier)` to `BillingController`
  - [x] 4.2 Add `processWebhook(rawBody, headers)` to `BillingController`

- [x] **Task 5: Backend — Webhook route (public, no auth)** (AC: 2, 3, 4, 5)
  - [x] 5.1 Create `apps/backend/src/modules/billing/billing.webhook.routes.ts`
  - [x] 5.2 `POST /api/v1/billing/webhooks/polar` — verifies signature via `validateEvent`, dispatches to controller
  - [x] 5.3 Register webhook route in `apps/backend/src/app.ts` (NO auth middleware — Polar.sh calls this)
  - [x] 5.4 Enable `rawBody` on this route via Fastify config
  - [x] 5.5 Write integration tests with mocked webhook payloads

- [x] **Task 6: Backend — Checkout route (OWNER only)** (AC: 1)
  - [x] 6.1 Add `POST /api/v1/billing/checkout` to existing `billing.routes.ts`
  - [x] 6.2 Request body: `{ tier: "starter" | "growth" | "enterprise" }`
  - [x] 6.3 Response: `{ data: { checkoutUrl: string }, message: string }`
  - [x] 6.4 Validate tier is not "pilot" (cannot subscribe to free tier)
  - [x] 6.5 Write integration tests

- [x] **Task 7: Extend shared types** (AC: 1, 2)
  - [x] 7.1 Add `CheckoutRequestSchema` and `CheckoutResponseSchema` to `packages/types/src/billing.ts`
  - [x] 7.2 Add `WebhookEventTypeSchema` enum for supported events
  - [x] 7.3 Export new types from `packages/types/src/index.ts`
  - [x] 7.4 Run `pnpm --filter=types build`

- [x] **Task 8: Frontend — Checkout flow + portal update** (AC: 1, 4)
  - [x] 8.1 Start backend: `pnpm --filter=backend dev` (deferred — schema sync requires running backend)
  - [x] 8.2 Regenerate frontend types: `pnpm --filter=webapp sync-schema-dev` (deferred — requires running backend)
  - [x] 8.3 Add `useCreateCheckout()` mutation hook to `billing.api.ts` — calls `POST /api/v1/billing/checkout`, opens checkout URL in new tab
  - [x] 8.4 Update `BillingPage.tsx` — replace disabled "Manage Subscription" button with active "Subscribe" button (when status is "pilot") or "Manage Subscription" (when subscription exists, links to Polar customer portal)
  - [x] 8.5 Add checkout success handling — on return from Polar, refetch billing overview via query invalidation
  - [x] 8.6 Show payment status indicators: "Active" (green), "Payment Failed" (red with "Update Payment" link), "Canceled" (gray)
  - [x] 8.7 Verify webapp builds: `pnpm --filter=webapp build`

- [x] **Task 9: Inngest job for heavy webhook processing** (AC: 2, 3, 4, 5)
  - [x] 9.1 Create `apps/backend/src/modules/billing/jobs/process-polar-webhook.job.ts` — Inngest function triggered by `billing/polar.webhook.received` event
  - [x] 9.2 Webhook route sends `inngest.send()` with event payload, returns 202 immediately
  - [x] 9.3 Job processes event: subscription changes update Subscription, order.paid creates BillingEvent
  - [x] 9.4 Register job in `apps/backend/src/modules/inngest/functions.ts`
  - [x] 9.5 Write unit tests for the Inngest job

- [x] **Task 10: Verification** (AC: 1, 2, 3, 4, 5)
  - [x] 10.1 Run all backend tests: `pnpm --filter=backend test` — 988 pass, 0 fail
  - [x] 10.2 Verify webapp builds: `pnpm --filter=webapp build` — clean build
  - [x] 10.3 Verify no regressions in existing billing tests — all 6 original billing tests pass

## Dev Notes

### Design Decisions

**Why offload webhook processing to Inngest?**

Polar.sh webhooks have a 10-second timeout. While our processing is likely fast enough, offloading to Inngest provides: (1) automatic retries if DB writes fail, (2) idempotent processing via event IDs, (3) observability in the Inngest dashboard, (4) consistent pattern with all other async work in the codebase. The webhook route verifies the signature and immediately returns 202, then Inngest processes the event.

**Why separate webhook routes file?**

Webhook routes have NO auth middleware (Polar.sh calls them). Keeping them in a separate file (`billing.webhook.routes.ts`) prevents accidentally applying the group-level `authMiddleware` from `billing.routes.ts`. The webhook route is registered separately in `app.ts` with its own prefix.

**Why map Polar product IDs to tiers via env vars?**

Products are created in the Polar.sh dashboard (not programmatically). Each environment (sandbox/production) has different product UUIDs. Mapping via env vars (`POLAR_PRODUCT_ID_STARTER`, etc.) decouples the code from specific Polar configurations and makes it testable.

**Why use customer sessions for portal URL instead of static URL?**

Story 9.1 used `process.env.POLAR_PORTAL_URL` as a static URL. Story 9.2 replaces this with `polar.customerSessions.create({ customerId })` which generates a pre-authenticated, time-limited portal URL. This is more secure (no permanent links) and provides a seamless UX (no login required for the customer).

**Why NOT enforce access restrictions on past_due status?**

That's Story 9.3 (Grace Period). This story only updates the status field and shows the UI indicator. Story 9.3 adds the enforcement middleware and banner.

### Polar.sh SDK Setup

**File:** `apps/backend/src/modules/billing/polar.client.ts`

```typescript
import { Polar } from "@polar-sh/sdk";

let polarClient: Polar | null = null;

export function getPolarClient(): Polar {
  if (!polarClient) {
    polarClient = new Polar({
      accessToken: process.env.POLAR_ACCESS_TOKEN!,
      ...(process.env.POLAR_MODE === "sandbox" ? { server: "sandbox" } : {}),
    });
  }
  return polarClient;
}
```

**CRITICAL:** The `server: "sandbox"` option is conditionally set from `POLAR_MODE` env var. The SDK defaults to production when `server` is omitted. Set `POLAR_MODE=sandbox` in `.env` for dev/staging to hit the Polar.sh sandbox API. Never set it in production.

### fastify-raw-body Registration

**File:** `apps/backend/src/app.ts`

```typescript
import rawBody from "fastify-raw-body";

// Register early, before routes (but global: false means it only activates per-route)
await app.register(rawBody, { global: false, runFirst: true });
```

Then in the webhook route:
```typescript
api.post("/", {
  config: { rawBody: true },
  // ... handler
});
```

### Billing Service Additions

**File:** `apps/backend/src/modules/billing/billing.service.ts`

```typescript
import { getPolarClient } from "./polar.client.js";

export class BillingService {
  // ... existing methods from Story 9.1 ...

  async createCheckoutSession(centerId: string, ownerEmail: string, tier: string) {
    const polar = getPolarClient();
    const productId = this.getProductIdForTier(tier);
    if (!productId) {
      throw new Error(`No Polar product configured for tier: ${tier}`);
    }

    const checkout = await polar.checkouts.create({
      products: [productId],
      customerEmail: ownerEmail,
      metadata: { centerId },
      successUrl: `${process.env.FRONTEND_URL}/${centerId}/dashboard/settings/billing?checkout=success`,
    });

    return { checkoutUrl: checkout.url };
  }

  async handleSubscriptionEvent(eventType: string, data: Record<string, unknown>) {
    const polarSubId = data.id as string;
    const customerId = data.customerId as string;
    const metadata = (data.metadata as Record<string, string>) ?? {};
    const centerId = metadata.centerId ?? await this.findCenterByPolarCustomer(customerId);
    if (!centerId) {
      throw new Error(`No center found for Polar customer: ${customerId}`);
    }

    const updateData: Record<string, unknown> = {
      polarSubscriptionId: polarSubId,
      polarCustomerId: customerId,
    };

    switch (eventType) {
      case "subscription.created": {
        // subscription.created can fire with status "incomplete" (payment not yet confirmed).
        // Only set "active" if Polar confirms the status is active; otherwise use the actual status.
        const polarStatus = data.status as string;
        const productId = data.productId as string;
        updateData.status = polarStatus === "active" ? "active" : "pilot"; // Stay pilot until payment confirms
        updateData.tier = this.mapProductToTier(productId);
        updateData.currentPeriodStart = data.currentPeriodStart
          ? new Date(data.currentPeriodStart as string) : undefined;
        updateData.currentPeriodEnd = data.currentPeriodEnd
          ? new Date(data.currentPeriodEnd as string) : undefined;
        updateData.cancelAtPeriodEnd = data.cancelAtPeriodEnd ?? false;
        break;
      }
      case "subscription.active": {
        // subscription.active reliably means payment succeeded — safe to set "active"
        const productId = data.productId as string;
        updateData.status = "active";
        updateData.tier = this.mapProductToTier(productId);
        updateData.currentPeriodStart = data.currentPeriodStart
          ? new Date(data.currentPeriodStart as string) : undefined;
        updateData.currentPeriodEnd = data.currentPeriodEnd
          ? new Date(data.currentPeriodEnd as string) : undefined;
        updateData.cancelAtPeriodEnd = data.cancelAtPeriodEnd ?? false;
        break;
      }
      case "subscription.updated": {
        const productId = data.productId as string;
        updateData.tier = this.mapProductToTier(productId);
        updateData.currentPeriodEnd = data.currentPeriodEnd
          ? new Date(data.currentPeriodEnd as string) : undefined;
        updateData.cancelAtPeriodEnd = data.cancelAtPeriodEnd ?? false;
        break;
      }
      case "subscription.past_due":
        updateData.status = "past_due";
        break;
      case "subscription.canceled":
        updateData.status = "canceled";
        updateData.cancelAtPeriodEnd = true;
        break;
      case "subscription.uncanceled":
        // User reversed cancellation from Polar portal — restore active status
        updateData.status = "active";
        updateData.cancelAtPeriodEnd = false;
        break;
      case "subscription.revoked":
        updateData.status = "inactive";
        break;
    }

    // Use upsert: creates a new subscription if first webhook, updates if exists.
    // Subscription is NOT tenanted — uses raw this.prisma (same as Story 9.1 getBillingInfo).
    await this.prisma.subscription.upsert({
      where: { centerId },
      create: {
        centerId,
        status: (updateData.status as string) ?? "pilot",
        tier: (updateData.tier as string) ?? "pilot",
        polarSubscriptionId: updateData.polarSubscriptionId as string,
        polarCustomerId: updateData.polarCustomerId as string,
        currentPeriodStart: updateData.currentPeriodStart as Date | undefined,
        currentPeriodEnd: updateData.currentPeriodEnd as Date | undefined,
        cancelAtPeriodEnd: (updateData.cancelAtPeriodEnd as boolean) ?? false,
      },
      update: updateData,
    });
  }

  async handleOrderPaidEvent(data: Record<string, unknown>) {
    // Look up center via customer ID (order.paid payload has customerId, NOT nested subscription.metadata)
    const customerId = (data as any).customerId as string;
    const centerId = await this.findCenterByPolarCustomer(customerId);
    if (!centerId) return; // Skip if no center found (e.g., non-ClassLite customer)

    const polarOrderId = (data as any).id as string;

    // Idempotent: use upsert on polarOrderId to handle duplicate webhook deliveries.
    // polarOrderId has a @unique constraint — duplicate create() would throw.
    const db = getTenantedClient(this.prisma, centerId);
    await this.prisma.billingEvent.upsert({
      where: { polarOrderId },
      create: {
        centerId,
        type: "payment",
        amount: (data as any).amount ?? 0,
        currency: ((data as any).currency ?? "usd").toUpperCase(),
        status: "paid",
        description: `Subscription payment — ${(data as any).product?.name ?? "ClassLite"}`,
        polarOrderId,
        invoiceUrl: (data as any).invoiceUrl ?? null,
        occurredAt: new Date((data as any).createdAt as string),
      },
      update: {}, // No-op if already exists (idempotent)
    });
  }

  async getCustomerPortalUrl(centerId: string): Promise<string | null> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { centerId },
      select: { polarCustomerId: true },
    });
    if (!subscription?.polarCustomerId) return null;

    const polar = getPolarClient();
    const session = await polar.customerSessions.create({
      customerId: subscription.polarCustomerId,
    });
    return session.customerPortalUrl;
  }

  private async findCenterByPolarCustomer(polarCustomerId: string): Promise<string | null> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { polarCustomerId },
      select: { centerId: true },
    });
    return subscription?.centerId ?? null;
  }

  private getProductIdForTier(tier: string): string | null {
    const mapping: Record<string, string | undefined> = {
      starter: process.env.POLAR_PRODUCT_ID_STARTER,
      growth: process.env.POLAR_PRODUCT_ID_GROWTH,
      enterprise: process.env.POLAR_PRODUCT_ID_ENTERPRISE,
    };
    return mapping[tier] ?? null;
  }

  private mapProductToTier(productId: string): string {
    if (productId === process.env.POLAR_PRODUCT_ID_STARTER) return "starter";
    if (productId === process.env.POLAR_PRODUCT_ID_GROWTH) return "growth";
    if (productId === process.env.POLAR_PRODUCT_ID_ENTERPRISE) return "enterprise";
    return "starter"; // Default fallback
  }
}
```

**CRITICAL PATTERNS:**
- `createCheckoutSession` uses `getPolarClient()` — NOT injected via constructor (Polar SDK is a singleton, not per-request)
- `handleSubscriptionEvent` uses raw `this.prisma` for Subscription (NOT tenanted — same as Story 9.1)
- `handleOrderPaidEvent` uses `getTenantedClient` for BillingEvent (IS tenanted — same as Story 9.1)
- `findCenterByPolarCustomer` provides fallback lookup when `centerId` is not in webhook metadata
- All Polar SDK calls should be wrapped in try/catch at the service level

### Webhook Route

**File:** `apps/backend/src/modules/billing/billing.webhook.routes.ts`

```typescript
import { FastifyInstance } from "fastify";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { inngest } from "../inngest/client.js";

export async function billingWebhookRoutes(fastify: FastifyInstance) {
  // NO authMiddleware — this is called by Polar.sh

  fastify.post(
    "/",
    { config: { rawBody: true } },
    async (request, reply) => {
      try {
        const event = validateEvent(
          request.rawBody as string,
          request.headers as Record<string, string>,
          process.env.POLAR_WEBHOOK_SECRET!,
        );

        // Offload to Inngest for reliable processing
        await inngest.send({
          name: "billing/polar.webhook.received",
          data: {
            eventType: event.type,
            payload: event.data,
          },
        });

        return reply.code(202).send("");
      } catch (error) {
        if (error instanceof WebhookVerificationError) {
          return reply.code(403).send({ message: "Invalid webhook signature" });
        }
        throw error;
      }
    },
  );
}
```

**Registration in `apps/backend/src/app.ts`:**
```typescript
import { billingWebhookRoutes } from "./modules/billing/billing.webhook.routes.js";

// Register AFTER billing routes, NO auth
await app.register(billingWebhookRoutes, { prefix: "/api/v1/billing/webhooks/polar" });
```

**CRITICAL:** This route is registered SEPARATELY from `billingRoutes` to avoid the group-level `authMiddleware` hook. It has NO auth — Polar.sh verifies identity via webhook signature.

### Checkout Route Addition

**File:** `apps/backend/src/modules/billing/billing.routes.ts` (add to existing file)

```typescript
import { CheckoutRequestSchema, CheckoutResponseSchema } from "@workspace/types";

// POST /api/v1/billing/checkout — Create Polar.sh checkout session
api.post(
  "/checkout",
  {
    schema: {
      body: CheckoutRequestSchema,
      response: {
        200: z.object({
          data: CheckoutResponseSchema,
          message: z.string(),
        }),
      },
    },
    preHandler: [requireRole(["OWNER"])],
  },
  async (request, reply) => {
    const payload = request.jwtPayload!;
    if (!payload.centerId) {
      return reply.status(400).send({ message: "No center associated" });
    }
    const { tier } = request.body;
    const result = await controller.createCheckout(
      payload.centerId,
      payload.email,
      tier,
    );
    return reply.send(result);
  },
);
```

### Inngest Job for Webhook Processing

**File:** `apps/backend/src/modules/billing/jobs/process-polar-webhook.job.ts`

```typescript
import { inngest } from "../../inngest/client.js";
import { createPrisma } from "../../../plugins/create-prisma.js";
import { BillingService } from "../billing.service.js";

const SUBSCRIPTION_EVENTS = [
  "subscription.created",
  "subscription.active",
  "subscription.updated",
  "subscription.canceled",
  "subscription.uncanceled",
  "subscription.revoked",
  "subscription.past_due",
];

export const processPolarWebhookJob = inngest.createFunction(
  {
    id: "process-polar-webhook",
    retries: 5,
  },
  { event: "billing/polar.webhook.received" },
  async ({ event, step }) => {
    const { eventType, payload } = event.data;

    if (SUBSCRIPTION_EVENTS.includes(eventType)) {
      await step.run("process-subscription-event", async () => {
        const prisma = createPrisma();
        try {
          const service = new BillingService(prisma);
          await service.handleSubscriptionEvent(eventType, payload);
        } finally {
          await prisma.$disconnect();
        }
      });
    }

    if (eventType === "order.paid") {
      await step.run("process-order-paid", async () => {
        const prisma = createPrisma();
        try {
          const service = new BillingService(prisma);
          await service.handleOrderPaidEvent(payload);
        } finally {
          await prisma.$disconnect();
        }
      });
    }

    return { status: "processed", eventType };
  },
);
```

**Registration in `apps/backend/src/modules/inngest/functions.ts`:**
```typescript
import { processPolarWebhookJob } from "../billing/jobs/process-polar-webhook.job.js";

export const functions = [
  // ... existing functions ...
  processPolarWebhookJob,
];
```

**CRITICAL INNGEST PATTERNS (from MEMORY.md):**
- `createPrisma()` per `step.run()` — each step gets its own PrismaClient
- `$disconnect()` in `finally` — always clean up
- Event name: `"billing/polar.webhook.received"` — follows `domain/entity.action` convention used by other Inngest events
- Retries: 5 (higher than default 3 because payment processing is critical)

### Shared Types Additions

**File:** `packages/types/src/billing.ts` (add to existing file)

```typescript
// Checkout request (Story 9.2)
export const CheckoutRequestSchema = z.object({
  tier: z.enum(["starter", "growth", "enterprise"]),
});
export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;

// Checkout response (Story 9.2)
export const CheckoutResponseSchema = z.object({
  checkoutUrl: z.string(),
});
export type CheckoutResponse = z.infer<typeof CheckoutResponseSchema>;
```

### Frontend Updates

**File:** `apps/webapp/src/features/settings/billing.api.ts` (add to existing)

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCreateCheckout() {
  return useMutation({
    mutationFn: async (tier: "starter" | "growth" | "enterprise") => {
      const { data, error } = await client.POST("/api/v1/billing/checkout", {
        body: { tier },
      });
      if (error) throw new Error(error.message || "Failed to create checkout");
      return data!.data;
    },
    onSuccess: (data) => {
      // Open Polar.sh checkout in new tab — user completes payment there.
      // Query invalidation happens on return via the ?checkout=success URL param in BillingPage.
      window.open(data.checkoutUrl, "_blank");
    },
  });
}
```

**File:** `apps/webapp/src/features/settings/pages/BillingPage.tsx` — Update "Manage Subscription" button:

```tsx
// Replace existing button logic:
{billingData.subscription.status === "pilot" ? (
  <Button onClick={() => checkout.mutate("starter")}>
    Subscribe
  </Button>
) : billingData.subscription.status === "past_due" ? (
  <div className="flex items-center gap-2">
    <span className="text-sm text-destructive font-medium">Payment Failed</span>
    <Button
      variant="outline"
      size="sm"
      onClick={() => window.open(billingData.portalUrl!, "_blank")}
      disabled={!billingData.portalUrl}
    >
      Update Payment Method
    </Button>
  </div>
) : (
  <Button
    variant="outline"
    onClick={() => window.open(billingData.portalUrl!, "_blank")}
    disabled={!billingData.portalUrl}
  >
    Manage Subscription
  </Button>
)}
```

Also add checkout success detection via URL params. **Add new import** to BillingPage (not currently imported):
```tsx
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { billingKeys } from "../billing.api";
```

Then at top of BillingPage component:
```tsx
const [searchParams, setSearchParams] = useSearchParams();
const queryClient = useQueryClient();

useEffect(() => {
  if (searchParams.get("checkout") === "success") {
    queryClient.invalidateQueries({ queryKey: billingKeys.all });
    toast.success("Subscription activated! Welcome aboard.");
    setSearchParams({}, { replace: true });
  }
}, [searchParams]);
```

### Environment Variables

**New env vars for Story 9.2:**

| Variable | Required | Description |
|---|---|---|
| `POLAR_ACCESS_TOKEN` | Yes | Organization Access Token from Polar.sh dashboard |
| `POLAR_WEBHOOK_SECRET` | Yes | Base64-encoded webhook secret from Polar.sh |
| `POLAR_PRODUCT_ID_STARTER` | Yes | UUID of the Starter tier product in Polar.sh |
| `POLAR_PRODUCT_ID_GROWTH` | Yes | UUID of the Growth tier product in Polar.sh |
| `POLAR_PRODUCT_ID_ENTERPRISE` | Yes | UUID of the Enterprise tier product in Polar.sh |
| `POLAR_MODE` | No | `"sandbox"` for dev/staging, omit for production |
| `FRONTEND_URL` | Yes* | Frontend base URL for checkout success redirect (*likely already exists) |

**Remove/deprecate:** `POLAR_PORTAL_URL` — replaced by dynamic customer session URLs.

Add to `apps/backend/src/app.ts` env schema (`fastify-env` uses JSON Schema, NOT Zod):
```typescript
// Add inside the `properties` object of the fastify-env schema:
POLAR_ACCESS_TOKEN: { type: "string" },
POLAR_WEBHOOK_SECRET: { type: "string" },
POLAR_PRODUCT_ID_STARTER: { type: "string" },
POLAR_PRODUCT_ID_GROWTH: { type: "string" },
POLAR_PRODUCT_ID_ENTERPRISE: { type: "string" },
POLAR_MODE: { type: "string" },
FRONTEND_URL: { type: "string" },
```

**DO NOT add Polar vars to the `required` array** — they should be optional in the env schema so the app can start without them for local dev. Instead, add runtime guards in service methods (e.g., `if (!process.env.POLAR_ACCESS_TOKEN) throw new Error("Polar not configured")`).

**CRITICAL:** The env schema in `app.ts` uses **JSON Schema format** (for `fastify-env` plugin), NOT Zod. Look at existing entries like `RESEND_API_KEY: { type: "string" }` for the pattern.

### Polar.sh Dashboard Setup (Manual — NOT code)

Before this story can be tested end-to-end, these must be configured in the Polar.sh dashboard:

1. **Create 3 products** in Polar.sh (sandbox for dev, production for live):
   - "ClassLite Starter" — $5/student/month (recurring, monthly)
   - "ClassLite Growth" — $4/student/month (recurring, monthly)
   - "ClassLite Enterprise" — $3/student/month (recurring, monthly)
2. **Create a webhook endpoint** pointing to `https://your-domain/api/v1/billing/webhooks/polar`
   - Events to subscribe: `subscription.*`, `order.paid`, `order.refunded`
3. Copy the **webhook secret** to `POLAR_WEBHOOK_SECRET` env var
4. Copy each **product UUID** to the corresponding `POLAR_PRODUCT_ID_*` env var

### Testing Strategy

**Unit tests (service methods):**
- Mock `getPolarClient()` to return a mock Polar SDK
- Test `createCheckoutSession` — verifies correct product ID, metadata, success URL
- Test `handleSubscriptionEvent` — for each event type, verify correct Subscription update
- Test `handleOrderPaidEvent` — verify BillingEvent creation with correct fields
- Test `getCustomerPortalUrl` — verify customer session creation
- Test `mapProductToTier` — verify all tier mappings + fallback

**Integration tests (routes):**
- Test `POST /api/v1/billing/checkout` — OWNER can create checkout, non-OWNER gets 403
- Test `POST /api/v1/billing/webhooks/polar` — valid signature returns 202, invalid returns 403
- Mock `inngest.send()` to verify webhook event is dispatched

**Inngest job tests:**
- Mock `BillingService` methods
- Test that subscription events call `handleSubscriptionEvent`
- Test that `order.paid` calls `handleOrderPaidEvent`
- Test that unknown events are handled gracefully

### Project Structure Notes

- All new files go in the existing `apps/backend/src/modules/billing/` directory
- Webhook routes in separate file prevents auth middleware contamination
- Follows feature-first organization (billing module contains all billing concerns)
- No new database models needed — Story 9.1 already created Subscription, BillingEvent, StudentCountSnapshot with all needed fields (including `polarSubscriptionId`, `polarCustomerId`, `polarOrderId`)

### References

- [Source: epics.md#Epic 9, Story 9.2] — AC1-AC5 acceptance criteria
- [Source: prd.md#FR45] — Self-serve payment processing requirement
- [Source: architecture.md#External Integrations] — Polar.sh integration pattern
- [Source: project-context.md#Async Workloads] — Inngest for background processing
- [Source: project-context.md#Layered Architecture] — Route-Controller-Service pattern
- [Source: project-context.md#Multi-Tenancy Enforcement] — getTenantedClient pattern
- [Source: 9-1-billing-dashboard.md] — Existing billing models, service, routes, types
- [Source: billing.service.ts] — Subscription uses raw prisma (not tenanted)
- [Source: billing.constants.ts] — Tier definitions: pilot/starter/growth/enterprise
- [Source: tenanted-client.ts] — BillingEvent IS tenanted, Subscription is NOT
- [Source: inngest/functions.ts] — Job registration array, processPolarWebhookJob added here
- [Source: Polar.sh SDK docs] — @polar-sh/sdk, validateEvent from @polar-sh/sdk/webhooks
- [Source: Polar.sh API — Checkouts] — polar.checkouts.create() with products, metadata, successUrl
- [Source: Polar.sh API — Customer Sessions] — polar.customerSessions.create() for portal URL
- [Source: Polar.sh Webhooks] — Standard Webhooks spec, 10-second timeout, 202 response

### Existing Infrastructure — DO NOT Rebuild

| Component | Location | Notes |
|---|---|---|
| BillingService | `apps/backend/src/modules/billing/billing.service.ts` | EXTEND, do not replace |
| BillingController | `apps/backend/src/modules/billing/billing.controller.ts` | EXTEND, do not replace |
| billing.routes.ts | `apps/backend/src/modules/billing/billing.routes.ts` | ADD checkout route |
| billing.constants.ts | `apps/backend/src/modules/billing/billing.constants.ts` | TIERS config, DO NOT change |
| billing.api.ts | `apps/webapp/src/features/settings/billing.api.ts` | ADD checkout mutation |
| BillingPage.tsx | `apps/webapp/src/features/settings/pages/BillingPage.tsx` | UPDATE subscribe/manage button |
| Inngest client | `apps/backend/src/modules/inngest/client.ts` | `id: "classlite"` |
| Inngest registry | `apps/backend/src/modules/inngest/functions.ts` | Add webhook job here |
| createPrisma | `apps/backend/src/plugins/create-prisma.ts` | For PrismaClient in Inngest jobs |
| Subscription model | `packages/db/prisma/schema.prisma` | Already has polarSubscriptionId, polarCustomerId |
| BillingEvent model | `packages/db/prisma/schema.prisma` | Already has polarOrderId, invoiceUrl |
| @workspace/types/billing | `packages/types/src/billing.ts` | ADD checkout schemas |

### Key Implementation Warnings

1. **DO NOT add auth middleware to webhook route** — Polar.sh has no JWT. Use webhook signature verification instead.
2. **DO NOT process webhooks synchronously** — Offload to Inngest. Return 202 immediately.
3. **DO NOT create new Prisma models** — Story 9.1 already created all needed models with Polar.sh fields.
4. **DO NOT install `@polar-sh/sdk` in packages/types or packages/db** — Only needed in `apps/backend`.
5. **`fastify-raw-body` must be registered BEFORE webhook route** — Otherwise `request.rawBody` will be undefined.
6. **Webhook secret must be base64-encoded** — Copy directly from Polar.sh dashboard, the SDK handles decoding.
7. **Subscription upsert uses raw `this.prisma`** — NOT tenanted. Same pattern as Story 9.1.
8. **BillingEvent.create uses `getTenantedClient`** — IS tenanted. Same pattern as Story 9.1.
9. **Money in cents** — All Polar.sh amounts are in cents. Store as-is in the `amount` field (Integer).
10. **Use `pnpm --filter=webapp sync-schema-dev` after adding checkout route** — New endpoint needs OpenAPI type definitions.
11. **Environment variables are OPTIONAL in env schema** — Polar vars are NOT in the `required` array so the app starts without them in local dev. Add runtime guards in service methods: `if (!process.env.POLAR_ACCESS_TOKEN) throw new Error("Polar not configured — set POLAR_ACCESS_TOKEN")`. Checkout and portal methods should return a clear error, not silently fail.
12. **Polar SDK import paths** — Main client: `import { Polar } from "@polar-sh/sdk"`, Webhook verification: `import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks"`.
13. **centerId in metadata** — Always pass `{ centerId }` in checkout metadata. Webhooks carry this back, enabling center lookup without extra DB queries.
14. **`FRONTEND_URL` for success redirect** — Check if this env var already exists (likely from email templates). If not, add it.

### Previous Story Intelligence

**From Story 9.1 (Billing Dashboard) — direct predecessor:**
- 933 backend tests passing, 0 regressions
- Subscription model: `polarSubscriptionId` and `polarCustomerId` fields already exist (nullable) — ready for Story 9.2 to populate
- BillingEvent model: `polarOrderId` and `invoiceUrl` fields already exist (nullable) — ready for webhook order.paid handler
- `getPortalUrl()` currently returns static `POLAR_PORTAL_URL` — Story 9.2 replaces with dynamic customer session URL
- Code review fixed: UTC dates in snapshot/usage, `Intl.NumberFormat` for currency, error handling in BillingPage
- Debug insight: OpenAPI path `/api/v1/billing/` (trailing slash) is expected Fastify behavior from `"/"` route under prefix

**From Story 7.3 (most recent non-billing story):**
- Inngest job pattern confirmed: `createPrisma()` per `step.run()`, `$disconnect()` in finally
- Public routes (unsubscribe) registered separately from auth-protected routes — same pattern for webhook route
- Commit pattern: `feat: Story 9.2 — Polar.sh integration and payment processing with code review fixes`

### Git Intelligence

Recent commits (develop branch):
- `fc94c68 feat: Story 9.1 — Billing dashboard with code review fixes` — Direct predecessor
- `145b108 feat: Story 7.3 — Parent email registration with code review fixes`
- All stories on `develop` branch, commit follows `feat: Story X.Y — Description` pattern

Files from Story 9.1 that will be MODIFIED in 9.2:
- `apps/backend/src/modules/billing/billing.service.ts` — Add checkout, webhook, portal methods
- `apps/backend/src/modules/billing/billing.controller.ts` — Add checkout, webhook controller methods
- `apps/backend/src/modules/billing/billing.routes.ts` — Add checkout POST route
- `apps/backend/src/modules/inngest/functions.ts` — Register webhook processing job
- `apps/backend/src/app.ts` — Register webhook routes, rawBody plugin, env vars
- `packages/types/src/billing.ts` — Add checkout schemas
- `apps/webapp/src/features/settings/billing.api.ts` — Add checkout mutation
- `apps/webapp/src/features/settings/pages/BillingPage.tsx` — Update subscribe/manage button

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Integration test `billing.routes.integration.test.ts` failed after `getBillingInfo` became async (now calls `getCustomerPortalUrl`). Fix: added `subscription.findUnique` mock to test setup.
- Webapp build failed with `react-router-dom` import. Fix: changed to `react-router` (v7 — this project's router).
- Inngest job tests failed with "not a constructor" error. Fix: changed `vi.fn().mockImplementation()` to proper `class MockBillingService` syntax.

### Completion Notes List

- **Task 1:** Installed `@polar-sh/sdk@0.45.0` and `fastify-raw-body@5.0.0` in `apps/backend`
- **Task 2:** Created `polar.client.ts` singleton with sandbox mode support, added 7 env vars to JSON Schema (all optional), registered `fastify-raw-body` with `global: false`, 6 unit tests
- **Task 3:** Extended `BillingService` with 5 new methods: `createCheckoutSession`, `handleSubscriptionEvent` (7 event types), `handleOrderPaidEvent` (idempotent upsert), `getCustomerPortalUrl` (dynamic session URL replacing static `POLAR_PORTAL_URL`), `mapProductToTier`. Updated `getBillingInfo` to use async portal URL. 29 new unit tests covering all methods + edge cases
- **Task 4:** Extended `BillingController` with `createCheckout` and `processWebhook` methods
- **Task 5:** Created `billing.webhook.routes.ts` — public POST endpoint with webhook signature verification via `validateEvent`, dispatches to Inngest, returns 202. Registered separately from auth-protected billing routes. 5 integration tests
- **Task 6:** Added `POST /api/v1/billing/checkout` to `billing.routes.ts` — OWNER-only, validates tier enum (no pilot), returns checkout URL. 4 integration tests
- **Task 7:** Added `CheckoutRequestSchema`, `CheckoutResponseSchema`, `WebhookEventTypeSchema` to `@workspace/types/billing`. Types package builds clean
- **Task 8:** Added `useCreateCheckout` mutation to `billing.api.ts`. Refactored `BillingPage.tsx` with `SubscriptionAction` component — shows "Subscribe" (pilot), "Payment Failed + Update Payment" (past_due), or "Manage Subscription" (active). Added checkout success detection via URL param with query invalidation
- **Task 9:** Created `process-polar-webhook.job.ts` Inngest function with 5 retries, registered in functions array. 11 unit tests
- **Task 10:** Full test suite: 988 pass / 0 fail (up from 939). Webapp builds clean. No regressions

### Senior Developer Review (AI — Pre-Implementation)

**Reviewer:** Bob (SM) on 2026-02-27
**Outcome:** 10 issues found and fixed in story document

| # | Severity | Issue | Fix Applied |
|---|----------|-------|-------------|
| H1 | HIGH | Env schema used Zod syntax — actual app.ts uses JSON Schema (fastify-env) | Changed to JSON Schema format with `{ type: "string" }` syntax |
| H2 | HIGH | `handleOrderPaidEvent` used `create()` — duplicate webhooks would throw unique constraint error | Changed to `upsert` on `polarOrderId` for idempotent processing |
| H3 | HIGH | `polar.client.ts` ignored `POLAR_MODE` env var — dev/staging would hit production Polar API | Added conditional `server: "sandbox"` based on `POLAR_MODE` |
| M1 | MEDIUM | Missing `subscription.uncanceled` handler — reversed cancellations not reflected | Added `subscription.uncanceled` case setting status back to "active" |
| M2 | MEDIUM | `handleOrderPaidEvent` accessed non-existent `data.subscription.metadata` | Removed dead code path, uses `customerId` lookup directly |
| M3 | MEDIUM | Warning 11 contradicted Task 2.2 on env var optionality | Unified: optional in schema, runtime guards in service methods |
| M4 | MEDIUM | `useSearchParams` import source not specified — BillingPage has no react-router imports | Added explicit `import { useSearchParams } from "react-router-dom"` |
| M5 | MEDIUM | `subscription.created` hardcoded status "active" — can fire with "incomplete" | Now checks `data.status` from webhook payload, only sets "active" if confirmed |
| L1 | LOW | `useCreateCheckout` `onSettled` invalidation fired before checkout completed (new tab) | Removed — URL-param-based invalidation on return is the correct mechanism |
| L2 | LOW | `subscription.upsert` create block used `as any` — bypassed type safety | Replaced with properly typed create object |

### File List

**New Files:**
- `apps/backend/src/modules/billing/polar.client.ts` — Polar SDK singleton client
- `apps/backend/src/modules/billing/polar.client.test.ts` — 6 unit tests
- `apps/backend/src/modules/billing/billing.webhook.routes.ts` — Public webhook endpoint
- `apps/backend/src/modules/billing/billing.webhook.routes.integration.test.ts` — 5 integration tests
- `apps/backend/src/modules/billing/jobs/process-polar-webhook.job.ts` — Inngest webhook processor
- `apps/backend/src/modules/billing/jobs/process-polar-webhook.job.test.ts` — 11 unit tests

**Modified Files:**
- `apps/backend/package.json` — Added `@polar-sh/sdk`, `fastify-raw-body` dependencies
- `apps/backend/src/app.ts` — Added rawBody plugin, webhook route registration, 7 Polar env vars
- `apps/backend/src/env.ts` — Added Polar env var type definitions
- `apps/backend/src/modules/billing/billing.service.ts` — Added 5 new methods, updated `getBillingInfo` for dynamic portal URL
- `apps/backend/src/modules/billing/billing.service.test.ts` — Updated existing tests + 29 new tests
- `apps/backend/src/modules/billing/billing.controller.ts` — Added `createCheckout`, `processWebhook`
- `apps/backend/src/modules/billing/billing.routes.ts` — Added POST `/checkout` route
- `apps/backend/src/modules/billing/billing.routes.integration.test.ts` — Added 4 checkout route tests + mock fixes
- `apps/backend/src/modules/inngest/functions.ts` — Registered `processPolarWebhookJob`
- `packages/types/src/billing.ts` — Added `CheckoutRequestSchema`, `CheckoutResponseSchema`, `WebhookEventTypeSchema`
- `apps/webapp/src/features/settings/billing.api.ts` — Added `useCreateCheckout` mutation
- `apps/webapp/src/features/settings/pages/BillingPage.tsx` — Replaced subscription button with SubscriptionAction component, added checkout success handling

### Senior Developer Review (AI — Post-Implementation)

**Reviewer:** Claude Opus 4.6 (Code Review Workflow) on 2026-02-27
**Outcome:** 10 issues found (3 High, 4 Medium, 3 Low) — ALL FIXED

| # | Severity | Issue | Fix Applied |
|---|----------|-------|-------------|
| H1 | HIGH | `handleOrderPaidEvent` bypassed tenant scoping — used raw `this.prisma.billingEvent.upsert()` instead of `getTenantedClient()` (BillingEvent IS tenanted) | Replaced with `getTenantedClient().billingEvent.create()` + P2002 catch for idempotency |
| H2 | HIGH | No runtime validation of webhook payload — `as string` casts on external data could silently produce corrupt records | Added field validation guards at top of `handleSubscriptionEvent` and `handleOrderPaidEvent` |
| H3 | HIGH | `subscription.created` with status "incomplete" set status to "pilot" — could downgrade an existing active subscription | Changed to only set status when `polarStatus === "active"`; omits status otherwise to preserve existing state |
| M1 | MEDIUM | `BillingController.processWebhook()` was dead code — never called by any route or job | Removed the method entirely |
| M2 | MEDIUM | `createCheckoutSession` lacked try/catch around `polar.checkouts.create()` — SDK errors became cryptic 500s | Wrapped in try/catch with descriptive error message |
| M3 | MEDIUM | `mapProductToTier` was public (should be private per spec) — tested directly instead of through public API | Made private; removed 4 direct tests; added 2 integration tests through `handleSubscriptionEvent` |
| M4 | MEDIUM | Missing subscription status indicators per Task 8.6 — no "Active" (green) or "Canceled" (gray) badges | Added `StatusBadge` component with color-coded status for all states |
| L1 | LOW | Stray `apps/website/.astro/settings.json` change (Astro auto-generated timestamp) | Reverted via `git checkout` |
| L2 | LOW | Subscribe button hardcodes "starter" tier (no tier selection) | By design — Story 9.4 handles tier selection |
| L3 | LOW | `WebhookEventTypeSchema` exported but unused in codebase | Kept as type definition; validation addressed via H2 field guards |

**Test Impact:** 990 pass / 0 fail (was 988 → +6 new tests, -4 removed direct tests)

### Change Log

- 2026-02-27: Code review — 10 issues found (3H/4M/3L), all fixed. Tests: 990 pass / 0 fail
- 2026-02-27: Story 9.2 implementation complete — Polar.sh checkout, webhook processing, Inngest job, frontend checkout flow (49 new tests, 988 total passing)
