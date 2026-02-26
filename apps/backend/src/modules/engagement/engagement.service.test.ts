import { describe, it, expect, vi } from "vitest";
import {
  checkStreak,
  checkPersonalBest,
  wasEngagementEmailSentToday,
  getParentEmails,
} from "./engagement.service.js";

// Helper: create a date N days ago from today (UTC midnight)
function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(12, 0, 0, 0); // noon UTC to avoid edge issues
  return d;
}

function makeMockDb(overrides: Record<string, unknown> = {}) {
  return {
    submission: {
      findMany: vi.fn().mockResolvedValue([]),
      ...overrides.submission,
    },
    emailLog: {
      findFirst: vi.fn().mockResolvedValue(null),
      ...overrides.emailLog,
    },
  } as never;
}

describe("checkStreak", () => {
  it("returns true when 7 consecutive days have graded submissions", async () => {
    const submissions = Array.from({ length: 7 }, (_, i) => ({
      submittedAt: daysAgo(i),
    }));
    const db = makeMockDb({
      submission: { findMany: vi.fn().mockResolvedValue(submissions) },
    });

    expect(await checkStreak(db, "student-1")).toBe(true);
  });

  it("returns false when only 6 days have submissions", async () => {
    // Missing today
    const submissions = Array.from({ length: 6 }, (_, i) => ({
      submittedAt: daysAgo(i + 1),
    }));
    const db = makeMockDb({
      submission: { findMany: vi.fn().mockResolvedValue(submissions) },
    });

    expect(await checkStreak(db, "student-1")).toBe(false);
  });

  it("returns false with no submissions", async () => {
    const db = makeMockDb();
    expect(await checkStreak(db, "student-1")).toBe(false);
  });

  it("returns true with multiple submissions per day", async () => {
    const submissions = [];
    for (let i = 0; i < 7; i++) {
      // 2 submissions per day
      submissions.push({ submittedAt: daysAgo(i) });
      submissions.push({ submittedAt: daysAgo(i) });
    }
    const db = makeMockDb({
      submission: { findMany: vi.fn().mockResolvedValue(submissions) },
    });

    expect(await checkStreak(db, "student-1")).toBe(true);
  });

  it("returns false with a gap in the middle", async () => {
    // Days 0,1,2,3,5,6 (missing day 4)
    const days = [0, 1, 2, 3, 5, 6];
    const submissions = days.map((d) => ({ submittedAt: daysAgo(d) }));
    const db = makeMockDb({
      submission: { findMany: vi.fn().mockResolvedValue(submissions) },
    });

    expect(await checkStreak(db, "student-1")).toBe(false);
  });

  it("filters out null submittedAt values", async () => {
    const submissions = [
      ...Array.from({ length: 7 }, (_, i) => ({
        submittedAt: daysAgo(i),
      })),
      { submittedAt: null },
    ];
    const db = makeMockDb({
      submission: { findMany: vi.fn().mockResolvedValue(submissions) },
    });

    expect(await checkStreak(db, "student-1")).toBe(true);
  });
});

describe("checkPersonalBest", () => {
  it("returns false when currentScore is null", async () => {
    const db = makeMockDb();
    expect(
      await checkPersonalBest(db, "student-1", "sub-1", null),
    ).toBe(false);
  });

  it("returns false when no prior graded submissions exist", async () => {
    const db = makeMockDb({
      submission: { findMany: vi.fn().mockResolvedValue([]) },
    });
    expect(
      await checkPersonalBest(db, "student-1", "sub-1", 7.5),
    ).toBe(false);
  });

  it("returns false when prior submissions have no scores (no feedback)", async () => {
    const db = makeMockDb({
      submission: {
        findMany: vi.fn().mockResolvedValue([
          { id: "sub-old", feedback: null },
        ]),
      },
    });
    expect(
      await checkPersonalBest(db, "student-1", "sub-1", 7.5),
    ).toBe(false);
  });

  it("returns true when current score exceeds previous max", async () => {
    const db = makeMockDb({
      submission: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "sub-old-1",
            feedback: { teacherFinalScore: 6.0, overallScore: 5.5 },
          },
          {
            id: "sub-old-2",
            feedback: { teacherFinalScore: null, overallScore: 7.0 },
          },
        ]),
      },
    });
    expect(
      await checkPersonalBest(db, "student-1", "sub-1", 7.5),
    ).toBe(true);
  });

  it("returns false when current score equals previous max", async () => {
    const db = makeMockDb({
      submission: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "sub-old",
            feedback: { teacherFinalScore: 7.5, overallScore: 7.0 },
          },
        ]),
      },
    });
    expect(
      await checkPersonalBest(db, "student-1", "sub-1", 7.5),
    ).toBe(false);
  });

  it("returns false when current score is below previous max", async () => {
    const db = makeMockDb({
      submission: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "sub-old",
            feedback: { teacherFinalScore: 8.0, overallScore: 7.0 },
          },
        ]),
      },
    });
    expect(
      await checkPersonalBest(db, "student-1", "sub-1", 7.5),
    ).toBe(false);
  });

  it("uses teacherFinalScore over overallScore when both present", async () => {
    const db = makeMockDb({
      submission: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "sub-old",
            feedback: { teacherFinalScore: 6.0, overallScore: 8.0 },
          },
        ]),
      },
    });
    // Previous max = teacherFinalScore 6.0 (NOT overallScore 8.0)
    expect(
      await checkPersonalBest(db, "student-1", "sub-1", 7.0),
    ).toBe(true);
  });

  it("falls back to overallScore when teacherFinalScore is null", async () => {
    const db = makeMockDb({
      submission: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "sub-old",
            feedback: { teacherFinalScore: null, overallScore: 6.0 },
          },
        ]),
      },
    });
    expect(
      await checkPersonalBest(db, "student-1", "sub-1", 7.0),
    ).toBe(true);
  });
});

describe("wasEngagementEmailSentToday", () => {
  it("returns false when no engagement email was sent today", async () => {
    const db = makeMockDb();
    expect(
      await wasEngagementEmailSentToday(db, "student-1", "center-1"),
    ).toBe(false);
  });

  it("returns true when an engagement email exists today", async () => {
    const db = makeMockDb({
      emailLog: {
        findFirst: vi.fn().mockResolvedValue({ id: "log-1" }),
      },
    });
    expect(
      await wasEngagementEmailSentToday(db, "student-1", "center-1"),
    ).toBe(true);
  });

  it("queries with correct filters", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const db = makeMockDb({ emailLog: { findFirst } });

    await wasEngagementEmailSentToday(db, "student-1", "center-1");

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        recipientId: "student-1",
        centerId: "center-1",
        type: "engagement",
        status: "sent",
        sentAt: { gte: expect.any(Date) },
      },
    });
  });
});

describe("getParentEmails", () => {
  it("returns array with parentEmail when present", () => {
    expect(getParentEmails({ parentEmail: "parent@test.com" })).toEqual([
      "parent@test.com",
    ]);
  });

  it("returns empty array when parentEmail is null", () => {
    expect(getParentEmails({ parentEmail: null })).toEqual([]);
  });
});
