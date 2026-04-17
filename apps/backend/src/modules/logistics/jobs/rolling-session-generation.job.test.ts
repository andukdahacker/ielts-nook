import { beforeEach, describe, expect, it, vi } from "vitest";
import { addMonths } from "date-fns";

// We mock SessionsService at the module level so the helper's `new SessionsService(prisma)`
// returns our spy instance instead of touching the real implementation.
// vi.fn().mockImplementation returns a function that is NOT callable with `new`,
// so we use a class declaration here — mock construction works correctly.
const mockGenerate = vi.fn();
vi.mock("../sessions.service.js", () => ({
  SessionsService: class MockSessionsService {
    generateSessionsFromSchedule = mockGenerate;
  },
}));

// Import after mocks so the helper picks up the mocked SessionsService.
import { processRollingSchedule } from "./rolling-session-generation.job.js";

describe("rolling-session-generation.job — processRollingSchedule (Task 8.3)", () => {
  let mockPrisma: any;
  let mockTenantedClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTenantedClient = {
      classSession: {
        findFirst: vi.fn(),
      },
    };
    mockPrisma = {
      $extends: vi.fn().mockReturnValue(mockTenantedClient),
    };
  });

  it("skips schedules whose latest session already covers the rolling window", async () => {
    const todayMs = new Date("2026-04-17T00:00:00Z").getTime();
    // Latest session is 4 months out — past the rolling 3-month window.
    const farFuture = addMonths(new Date(todayMs), 4);
    mockTenantedClient.classSession.findFirst.mockResolvedValue({
      startTime: farFuture,
    });

    const result = await processRollingSchedule(
      mockPrisma,
      { id: "schedule-1", centerId: "center-1" },
      todayMs,
    );

    expect(result).toEqual({ generated: 0, skipped: true });
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("invokes generation when the rolling window needs filling", async () => {
    const todayMs = new Date("2026-04-17T00:00:00Z").getTime();
    // Latest session is 1 month out — needs filling to 3 months ahead.
    const nearFuture = addMonths(new Date(todayMs), 1);
    mockTenantedClient.classSession.findFirst.mockResolvedValue({
      startTime: nearFuture,
    });
    mockGenerate.mockResolvedValue({ generatedCount: 8, sessions: [], conflicts: [] });

    const result = await processRollingSchedule(
      mockPrisma,
      { id: "schedule-2", centerId: "center-1" },
      todayMs,
    );

    expect(mockGenerate).toHaveBeenCalledWith("center-1", "schedule-2");
    expect(result).toEqual({ generated: 8, skipped: false });
  });

  it("invokes generation for brand-new schedules with no existing sessions", async () => {
    const todayMs = Date.now();
    mockTenantedClient.classSession.findFirst.mockResolvedValue(null);
    mockGenerate.mockResolvedValue({ generatedCount: 13, sessions: [], conflicts: [] });

    const result = await processRollingSchedule(
      mockPrisma,
      { id: "schedule-new", centerId: "center-1" },
      todayMs,
    );

    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(result.generated).toBe(13);
  });

  it("returns skipped without throwing when centerId is empty (defense-in-depth)", async () => {
    // A bad row (centerId === "") should not abort the whole cron run.
    const result = await processRollingSchedule(
      mockPrisma,
      { id: "schedule-bad", centerId: "" },
      Date.now(),
    );

    expect(result).toEqual({ generated: 0, skipped: true });
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(mockTenantedClient.classSession.findFirst).not.toHaveBeenCalled();
  });

  it("uses the supplied todayMs deterministically (not new Date())", async () => {
    // Pin todayMs to a fixed value and verify the rollingEnd cutoff that
    // controls skip-vs-generate is computed from that value, not Date.now().
    const todayMs = new Date("2025-01-01T00:00:00Z").getTime();
    const expectedRollingEnd = addMonths(new Date(todayMs), 3);

    // Latest session falls EXACTLY on the rollingEnd boundary → skipped.
    mockTenantedClient.classSession.findFirst.mockResolvedValue({
      startTime: expectedRollingEnd,
    });

    const result = await processRollingSchedule(
      mockPrisma,
      { id: "schedule-edge", centerId: "center-1" },
      todayMs,
    );

    expect(result.skipped).toBe(true);
  });
});
