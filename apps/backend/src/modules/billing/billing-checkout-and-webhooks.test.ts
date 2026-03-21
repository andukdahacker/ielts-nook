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
