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
});
