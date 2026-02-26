import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted runs at the hoisted scope, before vi.mock factories
const state = vi.hoisted(() => ({
  handler: null as ((ctx: {
    event: { data: Record<string, unknown> };
    step: { run: ReturnType<typeof vi.fn>; sleep: ReturnType<typeof vi.fn> };
  }) => Promise<unknown>) | null,
}));

vi.mock("../../inngest/client.js", () => ({
  inngest: {
    createFunction: vi.fn(
      (_config: unknown, _trigger: unknown, handler: typeof state.handler) => {
        state.handler = handler;
        return { id: "engagement-email-notification" };
      },
    ),
  },
}));

vi.mock("../../../plugins/create-prisma.js", () => ({
  createPrisma: vi.fn(() => ({ $disconnect: vi.fn() })),
}));

vi.mock("@workspace/db", () => ({
  getTenantedClient: vi.fn(() => ({
    user: { findUnique: vi.fn() },
    emailLog: { create: vi.fn(), findFirst: vi.fn() },
  })),
}));

vi.mock("../engagement.service.js", () => ({
  checkStreak: vi.fn(),
  checkPersonalBest: vi.fn(),
  wasEngagementEmailSentToday: vi.fn(),
  getParentEmails: vi.fn(() => []),
}));

vi.mock("../emails/engagement-notification.template.js", () => ({
  buildEngagementEmail: vi.fn(() => ({
    subject: "Test Subject",
    html: "<p>Test</p>",
  })),
}));

vi.mock("resend", () => ({
  Resend: vi.fn(() => ({ emails: { send: vi.fn() } })),
}));

// Import triggers createFunction, capturing the handler
import "./engagement-notification.job.js";

const baseEvent = {
  data: {
    studentId: "student-1",
    centerId: "center-1",
    submissionId: "sub-1",
    score: 7.5,
  },
};

function makeStep(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    "check-achievements": { streak: true, personalBest: false },
    "check-batch-limit": true,
    "fetch-student": {
      id: "student-1",
      email: "student@test.com",
      name: "Test Student",
      preferredLanguage: "en",
      parentEmail: null,
      emailEngagementNotifications: true,
      emailNotificationsPaused: false,
      parentEmails: [],
    },
    "fetch-center": "Test Center",
    ...overrides,
  };

  return {
    run: vi.fn(async (name: string) => defaults[name]),
    sleep: vi.fn(),
  };
}

describe("engagementNotificationJob — preference enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.RESEND_API_KEY;
  });

  it("returns preferences-disabled when emailNotificationsPaused is true", async () => {
    const step = makeStep({
      "fetch-student": {
        id: "student-1",
        email: "student@test.com",
        name: "Test",
        preferredLanguage: "en",
        parentEmail: null,
        emailEngagementNotifications: true,
        emailNotificationsPaused: true,
        parentEmails: [],
      },
    });

    const result = await state.handler!({ event: baseEvent, step });
    expect(result).toEqual({ status: "preferences-disabled" });
    const stepNames = step.run.mock.calls.map((c: unknown[]) => c[0]);
    expect(stepNames).not.toContain("fetch-center");
  });

  it("returns preferences-disabled when emailEngagementNotifications is false", async () => {
    const step = makeStep({
      "fetch-student": {
        id: "student-1",
        email: "student@test.com",
        name: "Test",
        preferredLanguage: "en",
        parentEmail: null,
        emailEngagementNotifications: false,
        emailNotificationsPaused: false,
        parentEmails: [],
      },
    });

    const result = await state.handler!({ event: baseEvent, step });
    expect(result).toEqual({ status: "preferences-disabled" });
    const stepNames = step.run.mock.calls.map((c: unknown[]) => c[0]);
    expect(stepNames).not.toContain("fetch-center");
  });

  it("continues past preference check when notifications are enabled", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    const step = makeStep();

    const result = await state.handler!({ event: baseEvent, step });
    const stepNames = step.run.mock.calls.map((c: unknown[]) => c[0]);
    expect(stepNames).toContain("fetch-center");
    expect(stepNames).toContain("send-email-student");
    expect(result).toEqual({ status: "sent", achievementType: "streak" });
  });

  it("returns no-achievements when neither streak nor personal best", async () => {
    const step = makeStep({
      "check-achievements": { streak: false, personalBest: false },
    });

    const result = await state.handler!({ event: baseEvent, step });
    expect(result).toEqual({ status: "no-achievements" });
  });

  it("returns batch-limited when daily limit reached", async () => {
    const step = makeStep({ "check-batch-limit": false });

    const result = await state.handler!({ event: baseEvent, step });
    expect(result).toEqual({ status: "batch-limited" });
  });
});
