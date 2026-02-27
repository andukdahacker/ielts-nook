# Story 9.1: Billing Dashboard

Status: done

## Story

As a Center Owner,
I want to view my billing status and student usage,
so that I can understand my costs and manage my subscription.

> **FR43–FR44:** This is the first billing story. It creates the billing data models, backend API, and frontend dashboard page. During pilot phase, the dashboard shows "Free Pilot" status with real student usage data. Polar.sh payment processing is Story 9.2; this story just provides the "Manage Subscription" link to the Polar.sh customer portal.

## Acceptance Criteria

1. **AC1 — Billing Overview:** Billing page at `/:centerId/dashboard/settings/billing` shows: current tier (pilot/starter/growth/enterprise), enrolled student count, monthly cost estimate, and next billing date. During pilot: tier = "Free Pilot", estimate = $0.00, next billing date = "N/A".
2. **AC2 — Payment History:** Payment history table with columns: date, amount, status (Paid/Failed/Pending/Refunded), receipt download link. Table is empty during pilot with "No payments yet" message.
3. **AC3 — Usage Chart:** Simple bar chart showing enrolled student count over last 6 months. If fewer than 6 months of data exist, show available months. Uses CSS-based bars (no charting library dependency).
4. **AC4 — Manage Subscription:** "Manage Subscription" button that opens Polar.sh customer portal in new tab. If no Polar subscription exists (pilot), button shows "Free during pilot" with disabled state.

## Tasks / Subtasks

- [x] **Task 1: Database — Billing models + migration** (AC: 1, 2, 3)
  - [x] 1.1 Add `Subscription` model to `packages/db/prisma/schema.prisma` (see Dev Notes for exact schema)
  - [x] 1.2 Add `BillingEvent` model to `packages/db/prisma/schema.prisma`
  - [x] 1.3 Add `StudentCountSnapshot` model to `packages/db/prisma/schema.prisma`
  - [x] 1.4 Add `subscription Subscription?` relation to `Center` model
  - [x] 1.5 Add `billingEvents BillingEvent[]` relation to `Center` model
  - [x] 1.6 Add `studentCountSnapshots StudentCountSnapshot[]` relation to `Center` model
  - [x] 1.7 Add `BillingEvent` and `StudentCountSnapshot` to `TENANTED_MODELS` in `packages/db/src/tenanted-client.ts` (NOT Subscription — see Dev Notes)
  - [x] 1.8 Run `pnpm --filter=db db:migrate:dev --name billing-models`
  - [x] 1.9 Run `pnpm --filter=db db:generate`

- [x] **Task 2: Shared Types** (AC: 1, 2, 3)
  - [x] 2.1 Create `packages/types/src/billing.ts` with all billing schemas (see Dev Notes)
  - [x] 2.2 Export from `packages/types/src/index.ts`
  - [x] 2.3 Run `pnpm --filter=types build`

- [x] **Task 3: Backend — Billing constants** (AC: 1)
  - [x] 3.1 Create `apps/backend/src/modules/billing/billing.constants.ts` with tier definitions and pricing logic

- [x] **Task 4: Backend — Billing service** (AC: 1, 2, 3)
  - [x] 4.1 Create `apps/backend/src/modules/billing/billing.service.ts`
  - [x] 4.2 Implement `getBillingInfo(centerId)` — get-or-create Subscription, count enrolled students, calculate estimate
  - [x] 4.3 Implement `getPaymentHistory(centerId, page, limit)` — paginated BillingEvent query
  - [x] 4.4 Implement `getUsageHistory(centerId)` — last 6 months of StudentCountSnapshot
  - [x] 4.5 Implement `snapshotStudentCount(centerId)` — count active STUDENT members, upsert snapshot for current month
  - [x] 4.6 Implement `getPortalUrl(centerId)` — return Polar.sh customer portal URL if subscription exists
  - [x] 4.7 Write unit tests

- [x] **Task 5: Backend — Billing controller** (AC: 1, 2, 3, 4)
  - [x] 5.1 Create `apps/backend/src/modules/billing/billing.controller.ts`
  - [x] 5.2 Implement `getBillingOverview(centerId)` — orchestrate service calls, format response
  - [x] 5.3 Implement `getPaymentHistory(centerId, page, limit)` — delegate to service
  - [x] 5.4 Implement `getUsageHistory(centerId)` — delegate to service

- [x] **Task 6: Backend — Billing routes** (AC: 1, 2, 3, 4)
  - [x] 6.1 Create `apps/backend/src/modules/billing/billing.routes.ts`
  - [x] 6.2 `GET /api/v1/billing` — billing overview (OWNER only)
  - [x] 6.3 `GET /api/v1/billing/payments` — payment history with pagination (OWNER only)
  - [x] 6.4 `GET /api/v1/billing/usage` — usage chart data (OWNER only)
  - [x] 6.5 Register routes in `apps/backend/src/app.ts`
  - [x] 6.6 Write integration tests

- [x] **Task 7: Backend — Student count snapshot Inngest job** (AC: 3)
  - [x] 7.1 Create `apps/backend/src/modules/billing/jobs/snapshot-student-count.job.ts` — cron job runs 1st of every month
  - [x] 7.2 Register job in `apps/backend/src/modules/inngest/functions.ts`
  - [x] 7.3 Write unit tests for the job

- [x] **Task 8: Frontend — Billing API hooks** (AC: 1, 2, 3, 4)
  - [x] 8.1 Start backend: `pnpm --filter=backend dev`
  - [x] 8.2 Regenerate frontend types: `pnpm --filter=webapp sync-schema-dev`
  - [x] 8.3 Create `apps/webapp/src/features/settings/billing.api.ts` — TanStack Query hooks for billing endpoints

- [x] **Task 9: Frontend — BillingPage** (AC: 1, 2, 3, 4)
  - [x] 9.1 Create `apps/webapp/src/features/settings/pages/BillingPage.tsx` — main page component
  - [x] 9.2 Create `apps/webapp/src/features/settings/components/BillingMetricCards.tsx` — 4 metric cards (tier, students, estimate, next billing)
  - [x] 9.3 Create `apps/webapp/src/features/settings/components/PaymentHistoryTable.tsx` — payment history data table
  - [x] 9.4 Create `apps/webapp/src/features/settings/components/UsageChart.tsx` — CSS-based bar chart for student count over time
  - [x] 9.5 Enable billing tab: update `settings-nav.ts` — set `disabled: false`, remove `badge`
  - [x] 9.6 Add billing route in `App.tsx` — `<Route path="billing" element={<BillingPage />} />`
  - [x] 9.7 Update E2E test in `apps/e2e/tests/settings/settings.spec.ts` — change "Billing tab is disabled with Coming Soon badge" test to verify billing tab is enabled and clickable (see Dev Notes)
  - [x] 9.8 Verify all backend tests pass: `pnpm --filter=backend test`
  - [x] 9.9 Verify webapp builds: `pnpm --filter=webapp build`

## Dev Notes

### Design Decisions

**Why separate Subscription model instead of fields on Center?**

Billing is a distinct domain with its own lifecycle (created, active, past_due, canceled, grace_period). A separate model cleanly separates billing concerns from center management. It also allows 1:1 relation semantics (Center has one Subscription) and clean cascade delete.

**Why Subscription is NOT in TENANTED_MODELS?**

Subscription has a `centerId` but is accessed via the `Center` relation, not via tenant filtering. It's a 1:1 relation — you always query by `centerId` directly. The `get-or-create` pattern in `getBillingInfo` uses a raw `prisma.subscription.upsert({ where: { centerId } })` which doesn't need tenant filtering. Adding it to TENANTED_MODELS would cause issues with the `upsert` operation since the extension would try to inject centerId into the where clause.

**Why BillingEvent and StudentCountSnapshot ARE in TENANTED_MODELS?**

These are center-scoped collections (many per center) that follow the standard query pattern of "get all records for this center." The tenant extension auto-injects the centerId filter on reads, which is exactly what we want.

**Why no Polar.sh SDK in this story?**

Story 9.1 is the dashboard foundation. Polar.sh integration (SDK, webhooks, checkout sessions) is Story 9.2. This story creates the data models and UI that Story 9.2 will populate. During pilot, the dashboard shows real student usage data with $0 billing.

**Why CSS bars instead of Recharts/Chart.js?**

AC3 shows 6 monthly bars — trivial to render with div heights. Adding a charting library for this is over-engineering. If more complex charts are needed later, a library can be added in a future story.

**Why OWNER-only access (not ADMIN)?**

Billing is a financial concern. Only the center Owner should see payment history and subscription details. ADMINs manage users and content, not billing. This matches the `ProtectedRoute allowedRoles={["OWNER"]}` pattern.

**Why count active STUDENT members as "enrolled students"?**

The PRD says "any student enrolled in at least one class during billing period." For Story 9.1, counting `CenterMembership` where `role = STUDENT` and `status = ACTIVE` is a reliable proxy. The more granular "enrolled in a class" refinement can come in Story 9.2 when metered billing is actually processed by Polar.sh. This keeps the query simple and fast.

### Prisma Schema Changes

**New Subscription model** — Add after the Center model:

```prisma
model Subscription {
  id                  String    @id @default(cuid())
  centerId            String    @unique @map("center_id")
  polarSubscriptionId String?   @unique @map("polar_subscription_id")
  polarCustomerId     String?   @map("polar_customer_id")
  status              String    @default("pilot") // pilot, active, past_due, canceled, grace_period, inactive
  tier                String    @default("pilot") // pilot, starter, growth, enterprise
  currentPeriodStart  DateTime? @map("current_period_start")
  currentPeriodEnd    DateTime? @map("current_period_end")
  cancelAtPeriodEnd   Boolean   @default(false) @map("cancel_at_period_end")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  center Center @relation(fields: [centerId], references: [id], onDelete: Cascade)

  @@map("subscription")
}
```

**New BillingEvent model:**

```prisma
model BillingEvent {
  id           String   @id @default(cuid())
  centerId     String   @map("center_id")
  type         String   // payment, refund, credit
  amount       Int      // cents
  currency     String   @default("USD")
  status       String   // paid, failed, pending, refunded
  description  String?
  polarOrderId String?  @unique @map("polar_order_id")
  invoiceUrl   String?  @map("invoice_url")
  occurredAt   DateTime @map("occurred_at")
  createdAt    DateTime @default(now()) @map("created_at")

  center Center @relation(fields: [centerId], references: [id], onDelete: Cascade)

  @@index([centerId])
  @@map("billing_event")
}
```

**New StudentCountSnapshot model:**

```prisma
model StudentCountSnapshot {
  id        String   @id @default(cuid())
  centerId  String   @map("center_id")
  count     Int
  month     DateTime // First day of month (e.g., 2026-02-01T00:00:00Z)
  createdAt DateTime @default(now()) @map("created_at")

  center Center @relation(fields: [centerId], references: [id], onDelete: Cascade)

  @@unique([centerId, month])
  @@index([centerId])
  @@map("student_count_snapshot")
}
```

**Center model additions:**

```prisma
model Center {
  // ... existing fields ...

  memberships            CenterMembership[]
  csvImportLogs          CsvImportLog[]
  subscription           Subscription?
  billingEvents          BillingEvent[]
  studentCountSnapshots  StudentCountSnapshot[]

  @@map("center")
}
```

### TENANTED_MODELS Update

**File:** `packages/db/src/tenanted-client.ts`

Add to the array:
```typescript
const TENANTED_MODELS = [
  // ... existing models ...
  "BillingEvent",
  "StudentCountSnapshot",
];
```

**DO NOT add `Subscription`** — it uses `centerId` as a unique key for upsert, and the tenant extension would interfere with the `where: { centerId }` clause in upsert operations.

### Shared Types

**File:** `packages/types/src/billing.ts`

```typescript
import { z } from "zod";

// Tier definitions
export const BillingTierSchema = z.enum(["pilot", "starter", "growth", "enterprise"]);
export type BillingTier = z.infer<typeof BillingTierSchema>;

// Subscription status
export const SubscriptionStatusSchema = z.enum([
  "pilot", "active", "past_due", "canceled", "grace_period", "inactive",
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

// Billing overview response
export const BillingOverviewSchema = z.object({
  subscription: z.object({
    status: SubscriptionStatusSchema,
    tier: BillingTierSchema,
    currentPeriodEnd: z.string().nullable(),
    cancelAtPeriodEnd: z.boolean(),
    polarCustomerId: z.string().nullable(),
  }),
  usage: z.object({
    enrolledStudents: z.number(),
    monthlyEstimateCents: z.number(),
    currency: z.string(),
  }),
  portalUrl: z.string().nullable(),
});
export type BillingOverview = z.infer<typeof BillingOverviewSchema>;

// Payment history item
export const BillingEventResponseSchema = z.object({
  id: z.string(),
  type: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
  description: z.string().nullable(),
  invoiceUrl: z.string().nullable(),
  occurredAt: z.string(),
});
export type BillingEventResponse = z.infer<typeof BillingEventResponseSchema>;

// Payment history paginated response
export const PaymentHistorySchema = z.object({
  items: z.array(BillingEventResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
export type PaymentHistory = z.infer<typeof PaymentHistorySchema>;

// Usage chart data point
export const UsageDataPointSchema = z.object({
  month: z.string(), // ISO date string (first of month)
  count: z.number(),
});
export type UsageDataPoint = z.infer<typeof UsageDataPointSchema>;

// Usage history response
export const UsageHistorySchema = z.object({
  snapshots: z.array(UsageDataPointSchema),
  currentCount: z.number(),
});
export type UsageHistory = z.infer<typeof UsageHistorySchema>;
```

**Export:** Add `export * from "./billing.js";` to `packages/types/src/index.ts`.

### Billing Constants

**File:** `apps/backend/src/modules/billing/billing.constants.ts`

```typescript
export interface TierConfig {
  name: string;
  displayName: string;
  perStudentCents: number; // Monthly per-student rate in cents
  maxStudents: number | null; // null = unlimited
}

export const TIERS: Record<string, TierConfig> = {
  pilot: {
    name: "pilot",
    displayName: "Free Pilot",
    perStudentCents: 0,
    maxStudents: null,
  },
  starter: {
    name: "starter",
    displayName: "Starter",
    perStudentCents: 500, // $5.00/student/month
    maxStudents: 30,
  },
  growth: {
    name: "growth",
    displayName: "Growth",
    perStudentCents: 400, // $4.00/student/month
    maxStudents: 100,
  },
  enterprise: {
    name: "enterprise",
    displayName: "Enterprise",
    perStudentCents: 300, // $3.00/student/month
    maxStudents: null,
  },
};

export function calculateMonthlyEstimate(tier: string, studentCount: number): number {
  const config = TIERS[tier];
  if (!config) return 0;
  return config.perStudentCents * studentCount;
}
```

**Note:** Tier pricing is placeholder. Story 9.4 (Subscription Tier Management) will finalize pricing. The structure supports easy configuration changes.

### Backend — Billing Service

**File:** `apps/backend/src/modules/billing/billing.service.ts`

```typescript
import { PrismaClient } from "@prisma/client";
import { getTenantedClient } from "@workspace/db";
import { TIERS, calculateMonthlyEstimate } from "./billing.constants.js";

export class BillingService {
  constructor(private prisma: PrismaClient) {}

  async getBillingInfo(centerId: string) {
    // Get-or-create subscription (pilot default)
    const subscription = await this.prisma.subscription.upsert({
      where: { centerId },
      create: { centerId, status: "pilot", tier: "pilot" },
      update: {}, // No-op if exists
    });

    // Count enrolled students (active STUDENT members)
    const db = getTenantedClient(this.prisma, centerId);
    const enrolledStudents = await db.centerMembership.count({
      where: { role: "STUDENT", status: "ACTIVE" },
    });

    const monthlyEstimateCents = calculateMonthlyEstimate(
      subscription.tier,
      enrolledStudents,
    );

    const portalUrl = this.getPortalUrl(subscription.polarCustomerId);

    return {
      subscription: {
        status: subscription.status,
        tier: subscription.tier,
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        polarCustomerId: subscription.polarCustomerId,
      },
      usage: {
        enrolledStudents,
        monthlyEstimateCents,
        currency: "USD",
      },
      portalUrl,
    };
  }

  async getPaymentHistory(centerId: string, page: number, limit: number) {
    const db = getTenantedClient(this.prisma, centerId);
    const [items, total] = await Promise.all([
      db.billingEvent.findMany({
        orderBy: { occurredAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          type: true,
          amount: true,
          currency: true,
          status: true,
          description: true,
          invoiceUrl: true,
          occurredAt: true,
        },
      }),
      db.billingEvent.count(),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        occurredAt: item.occurredAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  async getUsageHistory(centerId: string) {
    // Last 6 months of snapshots
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const db = getTenantedClient(this.prisma, centerId);
    const snapshots = await db.studentCountSnapshot.findMany({
      where: { month: { gte: sixMonthsAgo } },
      orderBy: { month: "asc" },
      select: { month: true, count: true },
    });

    // Current live count
    const currentCount = await db.centerMembership.count({
      where: { role: "STUDENT", status: "ACTIVE" },
    });

    return {
      snapshots: snapshots.map((s) => ({
        month: s.month.toISOString(),
        count: s.count,
      })),
      currentCount,
    };
  }

  async snapshotStudentCount(centerId: string) {
    const db = getTenantedClient(this.prisma, centerId);
    const count = await db.centerMembership.count({
      where: { role: "STUDENT", status: "ACTIVE" },
    });

    const now = new Date();
    const month = new Date(now.getFullYear(), now.getMonth(), 1);

    await this.prisma.studentCountSnapshot.upsert({
      where: { centerId_month: { centerId, month } },
      create: { centerId, count, month },
      update: { count },
    });
  }

  private getPortalUrl(polarCustomerId: string | null): string | null {
    if (!polarCustomerId) return null;
    const portalBase = process.env.POLAR_PORTAL_URL;
    if (!portalBase) return null;
    return portalBase;
  }
}
```

**CRITICAL PATTERNS:**
- `Subscription` queries use raw `this.prisma` (NOT tenanted) — it's a 1:1 relation with Center queried by unique `centerId`
- `BillingEvent` and `StudentCountSnapshot` queries use `getTenantedClient` — they ARE tenanted
- `CenterMembership.count` uses tenanted client — counts students for the current center
- `snapshotStudentCount` uses `upsert` on `StudentCountSnapshot` with the composite unique key `centerId_month` — raw prisma for the upsert (unique constraint), tenanted for count queries
- `getPortalUrl` returns null during pilot (no Polar customer ID set yet)

### Backend — Billing Controller

**File:** `apps/backend/src/modules/billing/billing.controller.ts`

Follow the Route-Controller-Service pattern (see `project-context.md`). Controller receives the **service instance** in its constructor (NOT PrismaClient). Controller formats `{ data, message }` responses and throws domain errors.

```typescript
import { BillingService } from "./billing.service.js";

export class BillingController {
  constructor(private readonly service: BillingService) {}

  async getBillingOverview(centerId: string) {
    const data = await this.service.getBillingInfo(centerId);
    return { data, message: "Billing overview retrieved" };
  }

  async getPaymentHistory(centerId: string, page: number, limit: number) {
    const data = await this.service.getPaymentHistory(centerId, page, limit);
    return { data, message: "Payment history retrieved" };
  }

  async getUsageHistory(centerId: string) {
    const data = await this.service.getUsageHistory(centerId);
    return { data, message: "Usage history retrieved" };
  }
}
```

**CRITICAL:** Controller takes `BillingService` — NOT `PrismaClient`. The route file creates the service and passes it to the controller. This matches the established pattern in `student-health.controller.ts` and all other controllers in the codebase.

### Backend — Billing Routes

**File:** `apps/backend/src/modules/billing/billing.routes.ts`

```typescript
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { BillingService } from "./billing.service.js";
import { BillingController } from "./billing.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import {
  BillingOverviewSchema,
  PaymentHistorySchema,
  UsageHistorySchema,
} from "@workspace/types";

export async function billingRoutes(fastify: FastifyInstance) {
  const api = fastify.withTypeProvider<ZodTypeProvider>();

  // Group-level auth
  api.addHook("preHandler", authMiddleware);

  // Instantiate service → controller (service takes prisma, controller takes service)
  const service = new BillingService(fastify.prisma);
  const controller = new BillingController(service);

  // GET /api/v1/billing — Billing overview
  api.get(
    "/",
    {
      schema: {
        response: {
          200: z.object({
            data: BillingOverviewSchema,
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
      const result = await controller.getBillingOverview(payload.centerId);
      return reply.send(result);
    },
  );

  // GET /api/v1/billing/payments — Payment history
  api.get(
    "/payments",
    {
      schema: {
        querystring: z.object({
          page: z.coerce.number().int().min(1).default(1),
          limit: z.coerce.number().int().min(1).max(50).default(10),
        }),
        response: {
          200: z.object({
            data: PaymentHistorySchema,
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
      const { page, limit } = request.query;
      const result = await controller.getPaymentHistory(payload.centerId, page, limit);
      return reply.send(result);
    },
  );

  // GET /api/v1/billing/usage — Usage chart data
  api.get(
    "/usage",
    {
      schema: {
        response: {
          200: z.object({
            data: UsageHistorySchema,
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
      const result = await controller.getUsageHistory(payload.centerId);
      return reply.send(result);
    },
  );
}
```

**CRITICAL ROUTE PATTERNS (validated against `student-health.routes.ts`):**
- **Parameter name:** Use `fastify` (not `app`) as the FastifyInstance parameter — matches codebase convention
- **Type provider variable:** Name it `api` (not `server`) — matches `student-health.routes.ts`
- **Auth hook:** `api.addHook("preHandler", authMiddleware)` — group-level, uses `preHandler` NOT `onRequest`
- **Role guard:** Per-route `preHandler: [requireRole(["OWNER"])]` in the route options object — NOT group-level
- **Controller instantiation:** Create service first with `fastify.prisma`, then pass service to controller
- **centerId guard:** Check `payload.centerId` is not null before calling controller (centerId can be null for users without a center)
- **Import paths from `modules/billing/`:** `../../middlewares/auth.middleware.js` and `../../middlewares/role.middleware.js`

**Route registration** in `apps/backend/src/app.ts`:
```typescript
import { billingRoutes } from "./modules/billing/billing.routes.js";
// ...
await app.register(billingRoutes, { prefix: "/api/v1/billing" });
```

Place after the `usersRoutes` registration (line ~245) and before the unsubscribe routes.

### Student Count Snapshot Inngest Job

**File:** `apps/backend/src/modules/billing/jobs/snapshot-student-count.job.ts`

```typescript
import { inngest } from "../../inngest/client.js";
import { createPrisma } from "../../../plugins/create-prisma.js";
import { BillingService } from "../billing.service.js";

export const snapshotStudentCountJob = inngest.createFunction(
  {
    id: "snapshot-student-count",
    retries: 3,
  },
  { cron: "0 0 1 * *" }, // 1st of every month at midnight UTC
  async ({ step }) => {
    // Step 1: Get all active centers
    const centerIds = await step.run("fetch-centers", async () => {
      const prisma = createPrisma();
      try {
        const centers = await prisma.center.findMany({
          select: { id: true },
        });
        return centers.map((c) => c.id);
      } finally {
        await prisma.$disconnect();
      }
    });

    // Step 2: Snapshot each center's student count
    for (const centerId of centerIds) {
      await step.run(`snapshot-${centerId}`, async () => {
        const prisma = createPrisma();
        try {
          const service = new BillingService(prisma);
          await service.snapshotStudentCount(centerId);
        } finally {
          await prisma.$disconnect();
        }
      });
    }

    return { status: "completed", centersProcessed: centerIds.length };
  },
);
```

**CRITICAL PATTERNS (from MEMORY.md):**
- `createPrisma()` per `step.run()` — each step gets its own PrismaClient
- `$disconnect()` in `finally` — always clean up
- Cron trigger `"0 0 1 * *"` — runs on the 1st of every month at midnight UTC
- Each center gets its own step for isolation and retry resilience

**Registration** in `apps/backend/src/modules/inngest/functions.ts`:
```typescript
import { snapshotStudentCountJob } from "../billing/jobs/snapshot-student-count.job.js";

export const functions = [
  // ... existing functions ...
  snapshotStudentCountJob,
];
```

### Frontend — Billing API Hooks

**File:** `apps/webapp/src/features/settings/billing.api.ts`

Use `openapi-fetch` with auto-generated types. Follow the exact pattern from `users.api.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";
import { client } from "@/core/client";

// Query key factory — enables cache invalidation from mutations (Story 9.2 checkout will need this)
export const billingKeys = {
  all: ["billing"] as const,
  overview: () => [...billingKeys.all, "overview"] as const,
  payments: (page: number, limit: number) => [...billingKeys.all, "payments", page, limit] as const,
  usage: () => [...billingKeys.all, "usage"] as const,
};

export function useBillingOverview() {
  return useQuery({
    queryKey: billingKeys.overview(),
    queryFn: async () => {
      const { data, error } = await client.GET("/api/v1/billing");
      if (error) throw new Error(error.message || "Failed to fetch billing");
      return data!.data;
    },
  });
}

export function usePaymentHistory(page = 1, limit = 10) {
  return useQuery({
    queryKey: billingKeys.payments(page, limit),
    queryFn: async () => {
      const { data, error } = await client.GET("/api/v1/billing/payments", {
        params: { query: { page, limit } },
      });
      if (error) throw new Error(error.message || "Failed to fetch payments");
      return data!.data;
    },
  });
}

export function useUsageHistory() {
  return useQuery({
    queryKey: billingKeys.usage(),
    queryFn: async () => {
      const { data, error } = await client.GET("/api/v1/billing/usage");
      if (error) throw new Error(error.message || "Failed to fetch usage");
      return data!.data;
    },
  });
}
```

**CRITICAL IMPORT:** Client is at `@/core/client` (NOT `../../lib/api-client`). This is the `openapi-fetch` client with auth middleware, used by all frontend API files. Verified from `users.api.ts` and `use-student-health-dashboard.ts`.

### Frontend — BillingPage Component

**File:** `apps/webapp/src/features/settings/pages/BillingPage.tsx`

```
┌─ Billing ──────────────────────────────────────────────┐
│                                                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Plan     │ │ Students │ │ Estimate │ │ Next Due │  │
│  │ Free     │ │    12    │ │  $0.00   │ │   N/A    │  │
│  │ Pilot    │ │ enrolled │ │ /month   │ │          │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                        │
│  [Manage Subscription]  (disabled during pilot)        │
│                                                        │
│  ── Student Usage (Last 6 Months) ──────────────────── │
│  Jan  ████████████  8                                  │
│  Feb  ██████████████████  12                           │
│                                                        │
│  ── Payment History ────────────────────────────────── │
│  No payments yet. Billing will start after pilot.      │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Structure:**
- Page loads billing overview, usage, and payment data via 3 TanStack Query hooks
- Renders `BillingMetricCards`, then `UsageChart`, then `PaymentHistoryTable`
- Loading: Skeleton cards (follow existing pattern in student health dashboard)
- Error: Toast via Sonner

**BillingMetricCards pattern** — Follow `HealthSummaryBar` component pattern:
```typescript
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  <Card>/* Plan tier */</Card>
  <Card>/* Enrolled students */</Card>
  <Card>/* Monthly estimate */</Card>
  <Card>/* Next billing date */</Card>
</div>
```

**Icons:** Use `lucide-react`:
- Plan: `CreditCard`
- Students: `Users`
- Estimate: `DollarSign`
- Next billing: `Calendar`

**Manage Subscription button:**
```typescript
<Button
  variant="outline"
  disabled={!billingData.portalUrl}
  onClick={() => window.open(billingData.portalUrl!, "_blank")}
>
  {billingData.portalUrl ? "Manage Subscription" : "Free during pilot"}
</Button>
```

### Frontend — UsageChart (CSS bars)

**File:** `apps/webapp/src/features/settings/components/UsageChart.tsx`

Simple CSS-based horizontal bar chart:

```typescript
// For each month, render a row:
<div className="flex items-center gap-2">
  <span className="w-10 text-xs text-muted-foreground">{monthLabel}</span>
  <div className="flex-1 bg-muted rounded-full h-6">
    <div
      className="bg-primary rounded-full h-6 flex items-center justify-end px-2"
      style={{ width: `${(count / maxCount) * 100}%`, minWidth: count > 0 ? "2rem" : 0 }}
    >
      <span className="text-xs text-primary-foreground font-medium">{count}</span>
    </div>
  </div>
</div>
```

If no snapshots exist, show current count with a note: "Student count tracking starts next month."

### Frontend — PaymentHistoryTable

**File:** `apps/webapp/src/features/settings/components/PaymentHistoryTable.tsx`

Use a simple HTML table or shadcn `Table` component:

```
| Date        | Amount  | Status | Receipt    |
|-------------|---------|--------|------------|
| 2026-03-01  | $60.00  | Paid   | [Download] |
```

During pilot (empty data): Show centered message "No payments yet. Billing will start after pilot."

If `invoiceUrl` exists, render a download link. If not, show "—".

Format amounts: `(amount / 100).toFixed(2)` (cents to dollars).

### E2E Test Update

**File:** `apps/e2e/tests/settings/settings.spec.ts`

The existing test at lines 87-92 must be updated:

**BEFORE:**
```typescript
test("Billing tab is disabled with Coming Soon badge", async ({ page }) => {
  const nav = await getVisibleSettingsNav(page);
  const billingBtn = nav.getByRole("button", { name: /Billing/ });
  await expect(billingBtn).toBeDisabled();
  await expect(billingBtn.getByText("Coming Soon")).toBeVisible();
});
```

**AFTER:**
```typescript
test("Billing tab is enabled and navigable", async ({ page }) => {
  const nav = await getVisibleSettingsNav(page);
  const billingBtn = nav.getByRole("button", { name: /Billing/ });
  await expect(billingBtn).toBeEnabled();
  await billingBtn.click();
  // Verify billing page loads (look for a heading or metric card)
  await expect(page.getByText(/Billing/)).toBeVisible();
});
```

**NOTE:** The "placeholder pages show Coming Soon" test (lines 94-105) only tests Integrations and Privacy — it does NOT test Billing. No changes needed for that test.

### Settings Nav Update

**File:** `apps/webapp/src/features/settings/config/settings-nav.ts`

Change billing entry from:
```typescript
{ id: "billing", label: "Billing", path: "billing", order: 5, disabled: true, badge: "Coming Soon" },
```
To:
```typescript
{ id: "billing", label: "Billing", path: "billing", order: 5 },
```

### Route Registration in App.tsx

**File:** `apps/webapp/src/App.tsx`

Add inside the `<Route path="settings" ...>` block, after the privacy route:
```tsx
<Route path="billing" element={<BillingPage />} />
```

**But only for OWNER role.** Check if there's a way to conditionally render routes based on role, or handle it in the BillingPage component itself. Since the settings layout is already OWNER/ADMIN protected, and the backend enforces OWNER-only access, adding the route is safe — ADMINs who navigate to `/settings/billing` will see an error from the API.

Alternatively, hide the billing tab from ADMINs in `SettingsLayout.tsx` by filtering based on user role. But the simplest approach is to add the route and let the API enforce access — the nav tab already shows for everyone in settings, and the API will return 403 for non-OWNER roles.

### App.ts Registration

**File:** `apps/backend/src/app.ts`

Add import and registration:
```typescript
import { billingRoutes } from "./modules/billing/billing.routes.js";

// After usersRoutes registration:
await app.register(billingRoutes, { prefix: "/api/v1/billing" });
```

### Environment Variable

**New env var: `POLAR_PORTAL_URL`** (optional)

Used by `BillingService.getPortalUrl()` to construct the Polar.sh customer portal URL. Not required during pilot — the "Manage Subscription" button will be disabled when this is not set.

| Environment | Value |
|---|---|
| Development | Not set (button disabled) |
| Staging | `https://sandbox.polar.sh/your-org/portal` |
| Production | `https://polar.sh/your-org/portal` |

This env var is NOT added to the required schema in `app.ts` — it's optional and read directly via `process.env.POLAR_PORTAL_URL`.

### Existing Infrastructure — DO NOT Rebuild

| Component | Location | Notes |
|---|---|---|
| Inngest client | `apps/backend/src/modules/inngest/client.ts` | `id: "classlite"` |
| Inngest registry | `apps/backend/src/modules/inngest/functions.ts` | Add snapshot job here |
| createPrisma | `apps/backend/src/plugins/create-prisma.ts` | For PrismaClient in Inngest jobs |
| authMiddleware | `apps/backend/src/middlewares/auth.middleware.ts` | JWT auth preHandler hook |
| requireRole | `apps/backend/src/middlewares/role.middleware.ts` | RBAC preHandler factory |
| getTenantedClient | `packages/db/src/tenanted-client.ts` | For tenanted queries |
| TENANTED_MODELS | `packages/db/src/tenanted-client.ts` | Add BillingEvent, StudentCountSnapshot |
| SettingsLayout | `apps/webapp/src/features/settings/components/SettingsLayout.tsx` | Already has sidebar nav |
| settings-nav.ts | `apps/webapp/src/features/settings/config/settings-nav.ts` | Enable billing tab |
| Card/Button/Table | `@workspace/ui/components/` | Shadcn components |
| TanStack Query | `apps/webapp` | For data fetching |
| openapi-fetch client | `apps/webapp/src/core/client.ts` | For typed API calls (`import { client } from "@/core/client"`) |
| Sonner toast | `apps/webapp` | For error notifications |
| lucide-react | `apps/webapp` | For icons |

### Key Implementation Warnings

1. **DO NOT add `Subscription` to `TENANTED_MODELS`** — it uses unique `centerId` for upsert. Tenant extension would interfere with the where clause.
2. **DO add `BillingEvent` and `StudentCountSnapshot` to `TENANTED_MODELS`** — they are center-scoped collections that benefit from auto-filtering.
3. **DO NOT install `@polar-sh/sdk`** — That's Story 9.2. This story only needs the portal URL as a config value.
4. **DO NOT install a charting library** — CSS bars are sufficient for the 6-month usage chart.
5. **Use `pnpm --filter=db db:migrate:dev --name billing-models`** — NOT `db:push`. Follow migration workflow per `project-context.md`.
6. **Run `pnpm --filter=webapp sync-schema-dev` after backend routes** — New billing endpoints need OpenAPI type definitions.
7. **OWNER-only access** — All billing routes enforce `requireRole(["OWNER"])`. ADMINs should not see billing data.
8. **Money in cents** — All amounts stored and transmitted as integers (cents). Format on frontend: `(amount / 100).toFixed(2)`.
9. **Subscription get-or-create** — Use `prisma.subscription.upsert` with `centerId` as unique key. Default to `status: "pilot"`, `tier: "pilot"`. Never fail if no subscription exists — create one lazily.
10. **Inngest cron job** — `"0 0 1 * *"` runs on the 1st of every month. Each center gets its own step for retry isolation. Use `createPrisma()` per step.
11. **UPDATE E2E test** — `apps/e2e/tests/settings/settings.spec.ts` (lines 87-92) has a test "Billing tab is disabled with Coming Soon badge" that asserts `toBeDisabled()` and checks for "Coming Soon" text. This test MUST be updated to verify the billing tab is enabled and navigable. The "displays all settings navigation tabs" test (line 59) should still pass as-is since it just checks visibility.
12. **StudentCountSnapshot upsert** — Uses composite unique `[centerId, month]`. The `month` field is always set to the first day of the month at midnight UTC for consistent deduplication.
13. **Auth middleware imports are DEFINITIVE** — `authMiddleware` from `../../middlewares/auth.middleware.js` and `requireRole` from `../../middlewares/role.middleware.js`. These are two separate files. Use `preHandler` hook (NOT `onRequest`). Per-route `preHandler: [requireRole(["OWNER"])]` in the route options object.
14. **First cron job in project** — This is the FIRST Inngest cron job in the codebase (all existing 10 jobs are event-triggered). After deployment, verify the cron schedule appears in the Inngest Cloud dashboard. For local testing, cron jobs can be manually triggered via the Inngest dev server UI at `http://localhost:8288`.
15. **Usage chart empty state during development** — Without historical snapshot data, the usage chart will be empty. Consider adding a `backfillSnapshots(centerId)` method to `BillingService` that generates the last 6 months of snapshots from current enrollment data. Call it from the `getBillingInfo` or `getUsageHistory` method when no snapshots exist. This is for dev convenience only — in production, the cron job populates data monthly.

### Previous Story Intelligence

**From Story 7.3 (Parent Email Registration) — most recent predecessor:**
- All backend tests pass as of Story 7.3 completion
- ParentEmail model uses raw `prisma` (not tenanted) — same pattern for Subscription
- Inngest job pattern: `createPrisma()` per `step.run()`, `$disconnect()` in finally
- Public routes (unsubscribe) registered separately — billing routes are auth-protected, simpler registration

**From Epic 7 overall:**
- Consistent commit pattern: `feat: Story X.Y — Description with code review fixes`
- Backend route registration follows alphabetical/logical order in `app.ts`
- All new models need `@@map("snake_case_name")` for PostgreSQL table naming
- Integration tests use `buildApp()` to spin up real Fastify instance

**From Epic 3.5 (Deployment):**
- Railway auto-deploys — new env vars (`POLAR_PORTAL_URL`) must be added to Railway dashboard
- Migration files are auto-applied via `db:migrate:deploy` on deployment
- New backend modules don't need Docker changes — the existing Dockerfile builds all TypeScript

### Git Intelligence

Recent commits:
- `145b108 feat: Story 7.3 — Parent email registration with code review fixes` — Latest
- `52eb0b8 feat: Story 7.2 — Notification preferences with code review fixes`
- `7d3d608 feat: Story 7.1 — Engagement email notifications with code review fixes`
- Commit pattern: `feat: Story X.Y — Description with code review fixes`
- All on `develop` branch — stories are developed on develop, merged to master via PR

### Project Structure Notes

**New files (13):**
```
packages/types/src/billing.ts
apps/backend/src/modules/billing/billing.constants.ts
apps/backend/src/modules/billing/billing.service.ts
apps/backend/src/modules/billing/billing.service.test.ts
apps/backend/src/modules/billing/billing.controller.ts
apps/backend/src/modules/billing/billing.routes.ts
apps/backend/src/modules/billing/billing.routes.integration.test.ts
apps/backend/src/modules/billing/jobs/snapshot-student-count.job.ts
apps/webapp/src/features/settings/pages/BillingPage.tsx
apps/webapp/src/features/settings/components/BillingMetricCards.tsx
apps/webapp/src/features/settings/components/PaymentHistoryTable.tsx
apps/webapp/src/features/settings/components/UsageChart.tsx
apps/webapp/src/features/settings/billing.api.ts
```

**Modified files (8):**
```
packages/db/prisma/schema.prisma                              — Add Subscription, BillingEvent, StudentCountSnapshot models + Center relations
packages/db/src/tenanted-client.ts                            — Add BillingEvent, StudentCountSnapshot to TENANTED_MODELS
packages/types/src/index.ts                                   — Export billing types
apps/backend/src/app.ts                                       — Register billing routes
apps/backend/src/modules/inngest/functions.ts                 — Register snapshotStudentCountJob
apps/webapp/src/features/settings/config/settings-nav.ts      — Enable billing tab
apps/webapp/src/App.tsx                                       — Add billing route
apps/e2e/tests/settings/settings.spec.ts                      — Update billing tab E2E test (disabled → enabled)
```

**Auto-generated (1):**
```
apps/webapp/src/schema/schema.d.ts                            — Regenerated after backend route changes
```

### References

- [Source: epics.md#Epic 9, Story 9.1] — AC1-AC4 acceptance criteria
- [Source: prd.md#FR43-FR44] — Billing dashboard and usage tracking requirements
- [Source: prd.md#Section 9] — Pricing model: per-active-student, volume tiers
- [Source: architecture.md#External Integrations] — Polar.sh: `apps/backend/src/services/billing.service.ts` (Phase 1.5)
- [Source: architecture.md#Data Exchange Formats] — Money: Integers (Cents)
- [Source: architecture.md#Structure Patterns] — Feature-first backend modules
- [Source: project-context.md#Multi-Tenancy Enforcement] — getTenantedClient pattern
- [Source: project-context.md#Database] — Migration workflow: db:migrate:dev, NOT db:push
- [Source: project-context.md#Layered Architecture] — Route-Controller-Service pattern
- [Source: settings-nav.ts] — Billing tab currently disabled with "Coming Soon" badge
- [Source: App.tsx:112-132] — Settings route structure and sub-routes
- [Source: SettingsLayout.tsx] — Sidebar navigation, disabled tab handling
- [Source: HealthSummaryBar.tsx] — Metric card pattern for dashboard
- [Source: student-health.routes.ts] — Route registration pattern: `preHandler` hooks, per-route `requireRole`, `fastify.prisma`, service→controller instantiation
- [Source: middlewares/auth.middleware.ts] — `authMiddleware` export, `jwtPayload` type: `{ uid, email, role, centerId: string | null }`
- [Source: middlewares/role.middleware.ts] — `requireRole(roles[])` factory export
- [Source: core/client.ts] — Frontend openapi-fetch client (`import { client } from "@/core/client"`)
- [Source: users.api.ts] — Query key factory pattern, TanStack Query hook pattern
- [Source: inngest/functions.ts] — Job registration array (currently 10 event-triggered jobs, zero cron jobs)
- [Source: tenanted-client.ts] — TENANTED_MODELS array (21 models); extension handles upsert (injects centerId into where/create/update)
- [Source: e2e/tests/settings/settings.spec.ts:87-92] — Billing tab disabled test that MUST be updated

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed OpenAPI schema path: `/api/v1/billing/` (trailing slash) vs `/api/v1/billing`
- Added `ErrorResponseSchema` to route response schemas to fix TS typing for 400 status replies
- Required `pnpm --filter=@workspace/db build` after migration to propagate new model types to backend

### Completion Notes List

- All 9 tasks completed with 24 new tests (14 service unit, 6 route integration, 4 job unit)
- Total backend tests: 933 passing (0 regressions)
- Webapp builds cleanly with no TS errors
- Subscription uses raw prisma (not tenanted) — 1:1 relation queried by unique centerId
- BillingEvent and StudentCountSnapshot added to TENANTED_MODELS — center-scoped collections
- First Inngest cron job in codebase: `"0 0 1 * *"` (1st of month, midnight UTC)
- E2E test updated from "disabled with Coming Soon" to "enabled and navigable"
- All billing routes enforce OWNER-only access via `requireRole(["OWNER"])`

### Senior Developer Review (AI)

**Reviewer:** Ducdo (via Code Review workflow) on 2026-02-27
**Outcome:** Approved with fixes applied

**Issues Found (5 MEDIUM, 3 LOW):**

| # | Severity | Issue | Fix Applied |
|---|----------|-------|-------------|
| M1 | MEDIUM | No error handling in BillingPage — `isError` never used, failed API calls show blank sections | Added `isError` destructuring, toast on overview error, `ErrorBanner` fallback UI for all 3 queries |
| M2 | MEDIUM | Billing tab visible to ADMINs who get 403 — broken UX | Fixed by M1: error banner now shows "Only center owners can access billing" |
| M3 | MEDIUM | BillingMetricCards hardcodes `$` sign — outputs `$0.00 USD` (redundant) | Replaced with `Intl.NumberFormat` currency-aware formatting |
| M4 | MEDIUM | `snapshotStudentCount` month uses local timezone, not UTC | Changed to `Date.UTC()` with `getUTCFullYear()`/`getUTCMonth()` |
| M5 | MEDIUM | `getUsageHistory` date filter uses local timezone | Changed to `Date.UTC()` with UTC methods |
| L1 | LOW | Story file count header says "14" but lists 15 files | Fixed to "15" |
| L2 | LOW | Trailing slash in billing API path (`/api/v1/billing/`) | Not a bug — OpenAPI generates path with trailing slash from Fastify `"/"` route under prefix |
| L3 | LOW | No controller unit tests | Accepted — controller is thin pass-through, covered by route integration tests |

**Post-fix verification:** 933 backend tests passing (0 regressions), webapp builds cleanly.

### Change Log

- 2026-02-27: Code review fixes applied — error handling, currency formatting, UTC dates (5 MEDIUM, 1 LOW fixed)
- 2026-02-27: Story 9.1 implemented — Billing Dashboard (database models, backend API, frontend page, Inngest cron job)

### File List

**New files (15):**
- `packages/types/src/billing.ts`
- `packages/db/prisma/migrations/20260227030200_billing_models/migration.sql`
- `apps/backend/src/modules/billing/billing.constants.ts`
- `apps/backend/src/modules/billing/billing.service.ts`
- `apps/backend/src/modules/billing/billing.service.test.ts`
- `apps/backend/src/modules/billing/billing.controller.ts`
- `apps/backend/src/modules/billing/billing.routes.ts`
- `apps/backend/src/modules/billing/billing.routes.integration.test.ts`
- `apps/backend/src/modules/billing/jobs/snapshot-student-count.job.ts`
- `apps/backend/src/modules/billing/jobs/snapshot-student-count.job.test.ts`
- `apps/webapp/src/features/settings/billing.api.ts`
- `apps/webapp/src/features/settings/pages/BillingPage.tsx`
- `apps/webapp/src/features/settings/components/BillingMetricCards.tsx`
- `apps/webapp/src/features/settings/components/PaymentHistoryTable.tsx`
- `apps/webapp/src/features/settings/components/UsageChart.tsx`

**Modified files (8):**
- `packages/db/prisma/schema.prisma` — Added Subscription, BillingEvent, StudentCountSnapshot models + Center relations
- `packages/db/src/tenanted-client.ts` — Added BillingEvent, StudentCountSnapshot to TENANTED_MODELS
- `packages/types/src/index.ts` — Export billing types
- `apps/backend/src/app.ts` — Register billing routes
- `apps/backend/src/modules/inngest/functions.ts` — Register snapshotStudentCountJob
- `apps/webapp/src/features/settings/config/settings-nav.ts` — Enable billing tab (removed disabled + badge)
- `apps/webapp/src/App.tsx` — Add billing route + import
- `apps/e2e/tests/settings/settings.spec.ts` — Updated billing tab E2E test (disabled → enabled)

**Auto-generated (1):**
- `apps/webapp/src/schema/schema.d.ts` — Regenerated after backend route changes
