import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Mock inngest client
vi.mock("../../inngest/client.js", () => ({
  inngest: {
    createFunction: vi.fn((_config, _trigger, handler) => handler),
  },
}));

// Mock createPrisma
const mockPrisma = {
  subscription: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  $extends: vi.fn(),
  $disconnect: vi.fn(),
};

const mockDb = {
  centerMembership: {
    findFirst: vi.fn(),
  },
};

vi.mock("../../../plugins/create-prisma.js", () => ({
  createPrisma: () => mockPrisma,
}));

vi.mock("@workspace/db", () => ({
  getTenantedClient: () => mockDb,
}));

// Mock Resend
const mockSend = vi.fn().mockResolvedValue({ id: "email-1" });
vi.mock("resend", () => {
  return {
    Resend: class MockResend {
      emails = { send: mockSend };
    },
  };
});

import { enforceGracePeriodJob } from "./enforce-grace-period.job.js";

describe("enforceGracePeriodJob", () => {
  const originalEnv = { ...process.env };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: any;

  const mockStep = {
    run: vi.fn((_name: string, fn: () => unknown) => fn()),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "test-key";
    process.env.EMAIL_FROM = "ClassLite <test@classlite.app>";
    process.env.FRONTEND_URL = "https://classlite.app";
    handler = enforceGracePeriodJob;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("should return 0 when no expired grace periods exist", async () => {
    mockPrisma.subscription.findMany.mockResolvedValue([]);

    const result = await handler({ step: mockStep });

    expect(result).toEqual({ status: "completed", centersEnforced: 0 });
  });

  it("should query subscriptions with grace_period status older than 14 days", async () => {
    mockPrisma.subscription.findMany.mockResolvedValue([]);

    await handler({ step: mockStep });

    expect(mockPrisma.subscription.findMany).toHaveBeenCalledWith({
      where: {
        status: "grace_period",
        gracePeriodStartedAt: { lt: expect.any(Date) },
      },
      select: { centerId: true },
    });

    // Verify the date is approximately 14 days ago
    const call = mockPrisma.subscription.findMany.mock.calls[0][0];
    const cutoffDate = call.where.gracePeriodStartedAt.lt as Date;
    const expectedDate = new Date();
    expectedDate.setUTCDate(expectedDate.getUTCDate() - 14);
    // Allow 1 second tolerance
    expect(Math.abs(cutoffDate.getTime() - expectedDate.getTime())).toBeLessThan(1000);
  });

  it("should update subscription to inactive and clear gracePeriodStartedAt", async () => {
    mockPrisma.subscription.findMany.mockResolvedValue([
      { centerId: "center-1" },
    ]);
    mockPrisma.subscription.update.mockResolvedValue({});
    mockDb.centerMembership.findFirst.mockResolvedValue(null);

    await handler({ step: mockStep });

    expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
      where: { centerId: "center-1" },
      data: {
        status: "inactive",
        gracePeriodStartedAt: null,
      },
    });
  });

  it("should send expiry notification email to center owner", async () => {
    mockPrisma.subscription.findMany.mockResolvedValue([
      { centerId: "center-1" },
    ]);
    mockPrisma.subscription.update.mockResolvedValue({});
    mockDb.centerMembership.findFirst.mockResolvedValue({
      user: { email: "owner@test.com" },
    });

    const result = await handler({ step: mockStep });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "owner@test.com",
        subject: "Your ClassLite subscription grace period has expired",
      }),
    );
    expect(result.centersEnforced).toBe(1);
  });

  it("should skip email when no owner found", async () => {
    mockPrisma.subscription.findMany.mockResolvedValue([
      { centerId: "center-1" },
    ]);
    mockPrisma.subscription.update.mockResolvedValue({});
    mockDb.centerMembership.findFirst.mockResolvedValue(null);

    await handler({ step: mockStep });

    expect(mockSend).not.toHaveBeenCalled();
  });

  it("should skip email when RESEND_API_KEY is not set", async () => {
    delete process.env.RESEND_API_KEY;

    mockPrisma.subscription.findMany.mockResolvedValue([
      { centerId: "center-1" },
    ]);
    mockPrisma.subscription.update.mockResolvedValue({});
    mockDb.centerMembership.findFirst.mockResolvedValue({
      user: { email: "owner@test.com" },
    });

    await handler({ step: mockStep });

    expect(mockSend).not.toHaveBeenCalled();
  });

  it("should process multiple expired centers", async () => {
    mockPrisma.subscription.findMany.mockResolvedValue([
      { centerId: "center-1" },
      { centerId: "center-2" },
    ]);
    mockPrisma.subscription.update.mockResolvedValue({});
    mockDb.centerMembership.findFirst.mockResolvedValue({
      user: { email: "owner@test.com" },
    });

    const result = await handler({ step: mockStep });

    expect(mockPrisma.subscription.update).toHaveBeenCalledTimes(2);
    expect(result.centersEnforced).toBe(2);
  });

  it("should always disconnect prisma in finally blocks", async () => {
    mockPrisma.subscription.findMany.mockRejectedValue(new Error("DB error"));

    await expect(handler({ step: mockStep })).rejects.toThrow("DB error");

    expect(mockPrisma.$disconnect).toHaveBeenCalled();
  });
});
