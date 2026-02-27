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

import { billingReminderJob } from "./billing-reminder.job.js";

describe("billingReminderJob", () => {
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
    handler = billingReminderJob;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("should return 0 reminders when no active subscriptions exist", async () => {
    mockPrisma.subscription.findMany.mockResolvedValue([]);

    const result = await handler({ step: mockStep });

    expect(result).toEqual({ status: "completed", remindersSent: 0 });
  });

  it("should send 7-day reminder for subscription renewing in 7 days", async () => {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setUTCDate(sevenDaysFromNow.getUTCDate() + 7);
    sevenDaysFromNow.setUTCHours(12, 0, 0, 0); // Non-midnight to test date-only comparison

    mockPrisma.subscription.findMany.mockResolvedValue([
      {
        centerId: "center-1",
        currentPeriodEnd: sevenDaysFromNow,
        tier: "starter",
      },
    ]);

    mockDb.centerMembership.findFirst.mockResolvedValue({
      user: { email: "owner@test.com" },
    });

    const result = await handler({ step: mockStep });

    expect(result.remindersSent).toBe(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "owner@test.com",
        subject: "Your ClassLite subscription renews in 7 days",
      }),
    );
  });

  it("should send 1-day reminder for subscription renewing tomorrow", async () => {
    const oneDayFromNow = new Date();
    oneDayFromNow.setUTCDate(oneDayFromNow.getUTCDate() + 1);
    oneDayFromNow.setUTCHours(12, 0, 0, 0);

    mockPrisma.subscription.findMany.mockResolvedValue([
      {
        centerId: "center-1",
        currentPeriodEnd: oneDayFromNow,
        tier: "growth",
      },
    ]);

    mockDb.centerMembership.findFirst.mockResolvedValue({
      user: { email: "owner@test.com" },
    });

    const result = await handler({ step: mockStep });

    expect(result.remindersSent).toBe(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Your ClassLite subscription renews tomorrow",
      }),
    );
  });

  it("should not send reminders for subscriptions not at 7 or 1 day", async () => {
    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setUTCDate(fiveDaysFromNow.getUTCDate() + 5);

    mockPrisma.subscription.findMany.mockResolvedValue([
      {
        centerId: "center-1",
        currentPeriodEnd: fiveDaysFromNow,
        tier: "starter",
      },
    ]);

    const result = await handler({ step: mockStep });

    expect(result).toEqual({ status: "completed", remindersSent: 0 });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("should skip sending when no owner email found", async () => {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setUTCDate(sevenDaysFromNow.getUTCDate() + 7);

    mockPrisma.subscription.findMany.mockResolvedValue([
      {
        centerId: "center-1",
        currentPeriodEnd: sevenDaysFromNow,
        tier: "starter",
      },
    ]);

    mockDb.centerMembership.findFirst.mockResolvedValue(null);

    const result = await handler({ step: mockStep });

    expect(mockSend).not.toHaveBeenCalled();
    expect(result.status).toBe("completed");
  });

  it("should skip sending when RESEND_API_KEY is not set", async () => {
    delete process.env.RESEND_API_KEY;

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setUTCDate(sevenDaysFromNow.getUTCDate() + 7);

    mockPrisma.subscription.findMany.mockResolvedValue([
      {
        centerId: "center-1",
        currentPeriodEnd: sevenDaysFromNow,
        tier: "starter",
      },
    ]);

    mockDb.centerMembership.findFirst.mockResolvedValue({
      user: { email: "owner@test.com" },
    });

    await handler({ step: mockStep });

    expect(mockSend).not.toHaveBeenCalled();
  });

  it("should only query active subscriptions with currentPeriodEnd", async () => {
    mockPrisma.subscription.findMany.mockResolvedValue([]);

    await handler({ step: mockStep });

    expect(mockPrisma.subscription.findMany).toHaveBeenCalledWith({
      where: {
        status: "active",
        currentPeriodEnd: { not: null },
      },
      select: {
        centerId: true,
        currentPeriodEnd: true,
        tier: true,
      },
    });
  });

  it("should always disconnect prisma in finally blocks", async () => {
    mockPrisma.subscription.findMany.mockRejectedValue(new Error("DB error"));

    await expect(handler({ step: mockStep })).rejects.toThrow("DB error");

    expect(mockPrisma.$disconnect).toHaveBeenCalled();
  });
});
