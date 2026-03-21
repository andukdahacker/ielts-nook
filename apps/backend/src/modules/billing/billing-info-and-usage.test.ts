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
      expect(result.usage.monthlyEstimateCents).toBe(2000); // starter flat $20/mo
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

  describe("getTierComparison", () => {
    it("should return 3 paid tiers excluding pilot", async () => {
      const result = await service.getTierComparison(centerId);

      expect(result.tiers).toHaveLength(3);
      expect(result.tiers.map((t) => t.name)).toEqual(["starter", "growth", "enterprise"]);
      expect(result.tiers.find((t) => (t.name as string) === "pilot")).toBeUndefined();
    });

    it("should mark isCurrent correctly for active subscription tier", async () => {
      mockPrisma.subscription.upsert.mockResolvedValue({
        id: "sub-1",
        centerId,
        status: "active",
        tier: "growth",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        polarCustomerId: "polar-cust-1",
      });

      const result = await service.getTierComparison(centerId);

      expect(result.tiers.find((t) => t.name === "growth")?.isCurrent).toBe(true);
      expect(result.tiers.find((t) => t.name === "starter")?.isCurrent).toBe(false);
      expect(result.tiers.find((t) => t.name === "enterprise")?.isCurrent).toBe(false);
      expect(result.currentTier).toBe("growth");
    });

    it("should return correct enrolledStudents count", async () => {
      mockDb.centerMembership.count.mockResolvedValue(42);

      const result = await service.getTierComparison(centerId);

      expect(result.enrolledStudents).toBe(42);
      expect(mockDb.centerMembership.count).toHaveBeenCalledWith({
        where: { role: "STUDENT", status: "ACTIVE" },
      });
    });

    it("should have no isCurrent tier for pilot subscription", async () => {
      // Default mock returns pilot tier — no paid tier should be marked current
      const result = await service.getTierComparison(centerId);

      expect(result.tiers.every((t) => t.isCurrent === false)).toBe(true);
      expect(result.currentTier).toBe("pilot");
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
      expect(result.items[0]!.id).toBe("evt-1");
      expect(result.items[0]!.occurredAt).toBe("2026-03-01T00:00:00.000Z");
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
      expect(result.snapshots[0]!.month).toBe("2026-01-01T00:00:00.000Z");
      expect(result.snapshots[0]!.count).toBe(5);
      expect(result.snapshots[1]!.count).toBe(8);
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
});
