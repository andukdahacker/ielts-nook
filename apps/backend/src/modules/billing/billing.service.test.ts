import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { BillingService } from "./billing.service.js";

// Mock the polar client module
vi.mock("./polar.client.js", () => ({
  getPolarClient: vi.fn(),
}));

import { getPolarClient } from "./polar.client.js";

describe("BillingService", () => {
  let service: BillingService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPrisma: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPolar: any;

  const centerId = "center-1";
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      centerMembership: { count: vi.fn().mockResolvedValue(0) },
      billingEvent: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({ id: "evt-1" }),
      },
      studentCountSnapshot: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    mockPrisma = {
      $extends: vi.fn().mockReturnValue(mockDb),
      subscription: {
        upsert: vi.fn().mockResolvedValue({
          id: "sub-1",
          centerId,
          status: "pilot",
          tier: "pilot",
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          polarCustomerId: null,
        }),
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      studentCountSnapshot: {
        upsert: vi.fn().mockResolvedValue({ id: "snap-1" }),
      },
    };

    mockPolar = {
      checkouts: {
        create: vi.fn().mockResolvedValue({
          url: "https://checkout.polar.sh/test-checkout",
        }),
      },
      customerSessions: {
        create: vi.fn().mockResolvedValue({
          customerPortalUrl: "https://polar.sh/portal/test-session",
        }),
      },
    };

    vi.mocked(getPolarClient).mockReturnValue(mockPolar);

    process.env.POLAR_PRODUCT_ID_STARTER = "prod-starter-id";
    process.env.POLAR_PRODUCT_ID_GROWTH = "prod-growth-id";
    process.env.POLAR_PRODUCT_ID_ENTERPRISE = "prod-enterprise-id";
    process.env.FRONTEND_URL = "https://my.classlite.app";

    service = new BillingService(mockPrisma);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("getBillingInfo", () => {
    it("should return pilot billing info for new center", async () => {
      mockDb.centerMembership.count.mockResolvedValue(5);

      const result = await service.getBillingInfo(centerId);

      expect(result.subscription.status).toBe("pilot");
      expect(result.subscription.tier).toBe("pilot");
      expect(result.subscription.currentPeriodEnd).toBeNull();
      expect(result.subscription.cancelAtPeriodEnd).toBe(false);
      expect(result.subscription.polarCustomerId).toBeNull();
      expect(result.usage.enrolledStudents).toBe(5);
      expect(result.usage.monthlyEstimateCents).toBe(0); // pilot = $0
      expect(result.usage.currency).toBe("USD");
      expect(result.portalUrl).toBeNull();
    });

    it("should return gracePeriodDaysRemaining as null for non-grace-period status", async () => {
      const result = await service.getBillingInfo(centerId);

      expect(result.subscription.gracePeriodDaysRemaining).toBeNull();
    });

    it("should return gracePeriodDaysRemaining when in grace_period", async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setUTCDate(threeDaysAgo.getUTCDate() - 3);

      mockPrisma.subscription.upsert.mockResolvedValue({
        id: "sub-1",
        centerId,
        status: "grace_period",
        tier: "starter",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        polarCustomerId: null,
        gracePeriodStartedAt: threeDaysAgo,
      });

      const result = await service.getBillingInfo(centerId);

      expect(result.subscription.gracePeriodDaysRemaining).toBe(11); // 14 - 3
    });

    it("should upsert subscription with pilot defaults", async () => {
      await service.getBillingInfo(centerId);

      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith({
        where: { centerId },
        create: { centerId, status: "pilot", tier: "pilot" },
        update: {},
      });
    });

    it("should calculate monthly estimate for paid tiers", async () => {
      mockPrisma.subscription.upsert.mockResolvedValue({
        id: "sub-1",
        centerId,
        status: "active",
        tier: "starter",
        currentPeriodEnd: new Date("2026-04-01T00:00:00Z"),
        cancelAtPeriodEnd: false,
        polarCustomerId: "polar-cust-1",
      });
      mockDb.centerMembership.count.mockResolvedValue(10);
      mockPrisma.subscription.findUnique.mockResolvedValue({
        polarCustomerId: "polar-cust-1",
      });

      const result = await service.getBillingInfo(centerId);

      expect(result.subscription.tier).toBe("starter");
      expect(result.usage.enrolledStudents).toBe(10);
      expect(result.usage.monthlyEstimateCents).toBe(5000); // 10 students * 500 cents
      expect(result.subscription.currentPeriodEnd).toBe("2026-04-01T00:00:00.000Z");
    });

    it("should return dynamic portal URL when polar customer exists", async () => {
      mockPrisma.subscription.upsert.mockResolvedValue({
        id: "sub-1",
        centerId,
        status: "active",
        tier: "starter",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        polarCustomerId: "polar-cust-1",
      });
      mockPrisma.subscription.findUnique.mockResolvedValue({
        polarCustomerId: "polar-cust-1",
      });

      const result = await service.getBillingInfo(centerId);
      expect(result.portalUrl).toBe("https://polar.sh/portal/test-session");
    });

    it("should return null portal URL when no polar customer", async () => {
      const result = await service.getBillingInfo(centerId);
      expect(result.portalUrl).toBeNull();
    });

    it("should count only ACTIVE STUDENT members", async () => {
      await service.getBillingInfo(centerId);

      expect(mockDb.centerMembership.count).toHaveBeenCalledWith({
        where: { role: "STUDENT", status: "ACTIVE" },
      });
    });
  });

  describe("getPaymentHistory", () => {
    it("should return empty payment history", async () => {
      const result = await service.getPaymentHistory(centerId, 1, 10);

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it("should return paginated billing events", async () => {
      const occurredAt = new Date("2026-03-01T00:00:00Z");
      mockDb.billingEvent.findMany.mockResolvedValue([
        {
          id: "evt-1",
          type: "payment",
          amount: 5000,
          currency: "USD",
          status: "paid",
          description: "Monthly subscription",
          invoiceUrl: "https://polar.sh/invoice/1",
          occurredAt,
        },
      ]);
      mockDb.billingEvent.count.mockResolvedValue(1);

      const result = await service.getPaymentHistory(centerId, 1, 10);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe("evt-1");
      expect(result.items[0].occurredAt).toBe("2026-03-01T00:00:00.000Z");
      expect(result.total).toBe(1);
    });

    it("should apply pagination correctly", async () => {
      await service.getPaymentHistory(centerId, 2, 5);

      expect(mockDb.billingEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5, // (page-1) * limit = (2-1) * 5
          take: 5,
        }),
      );
    });
  });

  describe("getUsageHistory", () => {
    it("should return empty snapshots with current count", async () => {
      mockDb.centerMembership.count.mockResolvedValue(8);

      const result = await service.getUsageHistory(centerId);

      expect(result.snapshots).toEqual([]);
      expect(result.currentCount).toBe(8);
    });

    it("should return snapshots sorted by month ascending", async () => {
      mockDb.studentCountSnapshot.findMany.mockResolvedValue([
        { month: new Date("2026-01-01T00:00:00Z"), count: 5 },
        { month: new Date("2026-02-01T00:00:00Z"), count: 8 },
      ]);
      mockDb.centerMembership.count.mockResolvedValue(10);

      const result = await service.getUsageHistory(centerId);

      expect(result.snapshots).toHaveLength(2);
      expect(result.snapshots[0].month).toBe("2026-01-01T00:00:00.000Z");
      expect(result.snapshots[0].count).toBe(5);
      expect(result.snapshots[1].count).toBe(8);
      expect(result.currentCount).toBe(10);
    });

    it("should query snapshots from last 6 months", async () => {
      await service.getUsageHistory(centerId);

      expect(mockDb.studentCountSnapshot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { month: { gte: expect.any(Date) } },
          orderBy: { month: "asc" },
        }),
      );
    });
  });

  describe("snapshotStudentCount", () => {
    it("should count students and upsert snapshot", async () => {
      mockDb.centerMembership.count.mockResolvedValue(12);

      await service.snapshotStudentCount(centerId);

      expect(mockDb.centerMembership.count).toHaveBeenCalledWith({
        where: { role: "STUDENT", status: "ACTIVE" },
      });

      expect(mockPrisma.studentCountSnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { centerId_month: { centerId, month: expect.any(Date) } },
          create: { centerId, count: 12, month: expect.any(Date) },
          update: { count: 12 },
        }),
      );
    });

    it("should use first day of current month in UTC for snapshot", async () => {
      mockDb.centerMembership.count.mockResolvedValue(0);

      await service.snapshotStudentCount(centerId);

      const call = mockPrisma.studentCountSnapshot.upsert.mock.calls[0][0];
      const month = call.create.month as Date;
      expect(month.getUTCDate()).toBe(1);
      expect(month.getUTCHours()).toBe(0);
      expect(month.getUTCMinutes()).toBe(0);
    });
  });

  describe("createCheckoutSession", () => {
    it("should create checkout with correct product, email, and metadata", async () => {
      const result = await service.createCheckoutSession(centerId, "owner@test.com", "starter");

      expect(mockPolar.checkouts.create).toHaveBeenCalledWith({
        products: ["prod-starter-id"],
        customerEmail: "owner@test.com",
        metadata: { centerId },
        successUrl: `https://my.classlite.app/${centerId}/dashboard/settings/billing?checkout=success`,
      });
      expect(result.checkoutUrl).toBe("https://checkout.polar.sh/test-checkout");
    });

    it("should throw when tier has no configured product", async () => {
      await expect(
        service.createCheckoutSession(centerId, "owner@test.com", "unknown"),
      ).rejects.toThrow("No Polar product configured for tier: unknown");
    });

    it("should throw when tier is pilot", async () => {
      await expect(
        service.createCheckoutSession(centerId, "owner@test.com", "pilot"),
      ).rejects.toThrow("No Polar product configured for tier: pilot");
    });

    it("should throw when FRONTEND_URL is not set", async () => {
      delete process.env.FRONTEND_URL;

      await expect(
        service.createCheckoutSession(centerId, "owner@test.com", "starter"),
      ).rejects.toThrow("FRONTEND_URL environment variable is required for checkout");
    });

    it("should map growth tier to correct product ID", async () => {
      await service.createCheckoutSession(centerId, "owner@test.com", "growth");

      expect(mockPolar.checkouts.create).toHaveBeenCalledWith(
        expect.objectContaining({ products: ["prod-growth-id"] }),
      );
    });

    it("should map enterprise tier to correct product ID", async () => {
      await service.createCheckoutSession(centerId, "owner@test.com", "enterprise");

      expect(mockPolar.checkouts.create).toHaveBeenCalledWith(
        expect.objectContaining({ products: ["prod-enterprise-id"] }),
      );
    });

    it("should wrap Polar SDK errors with descriptive message", async () => {
      mockPolar.checkouts.create.mockRejectedValueOnce(new Error("API rate limited"));

      await expect(
        service.createCheckoutSession(centerId, "owner@test.com", "starter"),
      ).rejects.toThrow("Failed to create checkout session: API rate limited");
    });
  });

  describe("handleSubscriptionEvent", () => {
    const baseData = {
      id: "polar-sub-1",
      customerId: "polar-cust-1",
      metadata: { centerId },
      productId: "prod-starter-id",
      status: "active",
      currentPeriodStart: "2026-03-01T00:00:00Z",
      currentPeriodEnd: "2026-04-01T00:00:00Z",
      cancelAtPeriodEnd: false,
    };

    it("should handle subscription.active and set status to active with gracePeriodStartedAt cleared", async () => {
      await service.handleSubscriptionEvent("subscription.active", baseData);

      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { centerId },
          update: expect.objectContaining({
            status: "active",
            tier: "starter",
            polarSubscriptionId: "polar-sub-1",
            polarCustomerId: "polar-cust-1",
            gracePeriodStartedAt: null,
          }),
        }),
      );
    });

    it("should handle subscription.created with active status", async () => {
      await service.handleSubscriptionEvent("subscription.created", {
        ...baseData,
        status: "active",
      });

      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ status: "active" }),
        }),
      );
    });

    it("should not override status for subscription.created with incomplete status", async () => {
      await service.handleSubscriptionEvent("subscription.created", {
        ...baseData,
        status: "incomplete",
      });

      const call = mockPrisma.subscription.upsert.mock.calls[0][0];
      // Status should NOT be in the update (preserves existing subscription status)
      expect(call.update.status).toBeUndefined();
      // But create block should default to "pilot" for new subscriptions
      expect(call.create.status).toBe("pilot");
    });

    it("should handle subscription.updated — update tier and period", async () => {
      await service.handleSubscriptionEvent("subscription.updated", {
        ...baseData,
        productId: "prod-growth-id",
      });

      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            tier: "growth",
            currentPeriodEnd: new Date("2026-04-01T00:00:00Z"),
          }),
        }),
      );
    });

    it("should handle subscription.past_due — set grace_period status and gracePeriodStartedAt", async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ gracePeriodStartedAt: null });

      await service.handleSubscriptionEvent("subscription.past_due", baseData);

      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            status: "grace_period",
            gracePeriodStartedAt: expect.any(Date),
          }),
        }),
      );
    });

    it("should not reset gracePeriodStartedAt if already in grace period (idempotent)", async () => {
      const existingGraceStart = new Date("2026-02-20T00:00:00Z");
      mockPrisma.subscription.findUnique.mockResolvedValue({
        gracePeriodStartedAt: existingGraceStart,
      });

      await service.handleSubscriptionEvent("subscription.past_due", baseData);

      const call = mockPrisma.subscription.upsert.mock.calls[0][0];
      expect(call.update.status).toBe("grace_period");
      expect(call.update.gracePeriodStartedAt).toBeUndefined();
    });

    it("should handle subscription.canceled — set status and cancelAtPeriodEnd", async () => {
      await service.handleSubscriptionEvent("subscription.canceled", baseData);

      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            status: "canceled",
            cancelAtPeriodEnd: true,
          }),
        }),
      );
    });

    it("should handle subscription.uncanceled — restore active and clear grace period", async () => {
      await service.handleSubscriptionEvent("subscription.uncanceled", baseData);

      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            status: "active",
            cancelAtPeriodEnd: false,
            gracePeriodStartedAt: null,
          }),
        }),
      );
    });

    it("should handle subscription.revoked — set inactive and clear grace period", async () => {
      await service.handleSubscriptionEvent("subscription.revoked", baseData);

      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            status: "inactive",
            gracePeriodStartedAt: null,
          }),
        }),
      );
    });

    it("should find center via polarCustomerId when metadata missing", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({ centerId: "center-2" });

      await service.handleSubscriptionEvent("subscription.active", {
        ...baseData,
        metadata: {},
      });

      expect(mockPrisma.subscription.findFirst).toHaveBeenCalledWith({
        where: { polarCustomerId: "polar-cust-1" },
        select: { centerId: true },
      });
      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { centerId: "center-2" } }),
      );
    });

    it("should throw when no center found for customer", async () => {
      await expect(
        service.handleSubscriptionEvent("subscription.active", {
          ...baseData,
          metadata: {},
        }),
      ).rejects.toThrow("No center found for Polar customer: polar-cust-1");
    });

    it("should set period dates from webhook data", async () => {
      await service.handleSubscriptionEvent("subscription.active", baseData);

      const call = mockPrisma.subscription.upsert.mock.calls[0][0];
      expect(call.update.currentPeriodStart).toEqual(new Date("2026-03-01T00:00:00Z"));
      expect(call.update.currentPeriodEnd).toEqual(new Date("2026-04-01T00:00:00Z"));
    });

    it("should map enterprise product to correct tier", async () => {
      await service.handleSubscriptionEvent("subscription.active", {
        ...baseData,
        productId: "prod-enterprise-id",
      });

      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ tier: "enterprise" }),
        }),
      );
    });

    it("should fallback to starter tier for unknown product", async () => {
      await service.handleSubscriptionEvent("subscription.active", {
        ...baseData,
        productId: "unknown-product-id",
      });

      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ tier: "starter" }),
        }),
      );
    });

    it("should reject payload with missing subscription id", async () => {
      await expect(
        service.handleSubscriptionEvent("subscription.active", {
          ...baseData,
          id: undefined as unknown as string,
        }),
      ).rejects.toThrow("Invalid webhook payload: missing subscription id");
    });

    it("should reject payload with missing customerId", async () => {
      await expect(
        service.handleSubscriptionEvent("subscription.active", {
          ...baseData,
          customerId: undefined as unknown as string,
        }),
      ).rejects.toThrow("Invalid webhook payload: missing customerId");
    });
  });

  describe("handleOrderPaidEvent", () => {
    const orderData = {
      id: "polar-order-1",
      customerId: "polar-cust-1",
      amount: 5000,
      currency: "usd",
      product: { name: "ClassLite Starter" },
      invoiceUrl: "https://polar.sh/invoice/test-1",
      createdAt: "2026-03-01T12:00:00Z",
    };

    it("should create billing event from paid order", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({ centerId });

      await service.handleOrderPaidEvent(orderData);

      expect(mockDb.billingEvent.create).toHaveBeenCalledWith({
        data: {
          centerId,
          type: "payment",
          amount: 5000,
          currency: "USD",
          status: "paid",
          description: "Subscription payment — ClassLite Starter",
          polarOrderId: "polar-order-1",
          invoiceUrl: "https://polar.sh/invoice/test-1",
          occurredAt: new Date("2026-03-01T12:00:00Z"),
        },
      });
    });

    it("should skip when no center found for customer", async () => {
      await service.handleOrderPaidEvent(orderData);

      expect(mockDb.billingEvent.create).not.toHaveBeenCalled();
    });

    it("should use fallback description when product name missing", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({ centerId });

      await service.handleOrderPaidEvent({
        ...orderData,
        product: undefined,
      });

      expect(mockDb.billingEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: "Subscription payment — ClassLite",
          }),
        }),
      );
    });

    it("should uppercase currency from webhook", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({ centerId });

      await service.handleOrderPaidEvent(orderData);

      expect(mockDb.billingEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ currency: "USD" }),
        }),
      );
    });

    it("should handle duplicate webhook delivery gracefully (P2002)", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({ centerId });
      const prismaError = new Error("Unique constraint failed");
      (prismaError as unknown as { code: string }).code = "P2002";
      mockDb.billingEvent.create.mockRejectedValueOnce(prismaError);

      // Should not throw — duplicate is silently ignored
      await service.handleOrderPaidEvent(orderData);
    });
  });

  describe("checkEnrollmentAllowed", () => {
    it("should return allowed=true when no subscription exists", async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const result = await service.checkEnrollmentAllowed(centerId);

      expect(result).toEqual({ allowed: true });
    });

    it("should return allowed=true for active status", async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ status: "active" });

      const result = await service.checkEnrollmentAllowed(centerId);

      expect(result).toEqual({ allowed: true });
    });

    it("should return allowed=true for pilot status", async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ status: "pilot" });

      const result = await service.checkEnrollmentAllowed(centerId);

      expect(result).toEqual({ allowed: true });
    });

    it("should return allowed=true for grace_period status", async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ status: "grace_period" });

      const result = await service.checkEnrollmentAllowed(centerId);

      expect(result).toEqual({ allowed: true });
    });

    it("should return allowed=true for canceled status", async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ status: "canceled" });

      const result = await service.checkEnrollmentAllowed(centerId);

      expect(result).toEqual({ allowed: true });
    });

    it("should return allowed=false for inactive status", async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ status: "inactive" });

      const result = await service.checkEnrollmentAllowed(centerId);

      expect(result).toEqual({
        allowed: false,
        reason: "Subscription inactive — payment required to enroll new students",
      });
    });
  });

  describe("getCustomerPortalUrl", () => {
    it("should return null when no subscription exists", async () => {
      const result = await service.getCustomerPortalUrl(centerId);
      expect(result).toBeNull();
    });

    it("should return null when no polar customer ID", async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ polarCustomerId: null });

      const result = await service.getCustomerPortalUrl(centerId);
      expect(result).toBeNull();
    });

    it("should create customer session and return portal URL", async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        polarCustomerId: "polar-cust-1",
      });

      const result = await service.getCustomerPortalUrl(centerId);

      expect(mockPolar.customerSessions.create).toHaveBeenCalledWith({
        customerId: "polar-cust-1",
      });
      expect(result).toBe("https://polar.sh/portal/test-session");
    });

    it("should return null gracefully when Polar SDK throws", async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        polarCustomerId: "polar-cust-1",
      });
      mockPolar.customerSessions.create.mockRejectedValue(new Error("Polar API error"));

      const result = await service.getCustomerPortalUrl(centerId);
      expect(result).toBeNull();
    });
  });

});
