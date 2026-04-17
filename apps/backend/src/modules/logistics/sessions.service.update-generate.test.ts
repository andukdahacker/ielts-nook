import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionsService } from "./sessions.service.js";
import { addMonths, getDay } from "date-fns";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

// Reproduce the same UTC-anchored "today" the service uses internally so the
// tests don't drift across midnight or across timezones the test runner is in.
function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Build the expected session UTC instant for a given date + HH:mm in a given
// center timezone — mirrors the service's `buildSessionInstant` helper.
function expectedSessionInstant(day: Date, hour: number, minute: number, tz: string): Date {
  const datePart = formatInTimeZone(day, tz, "yyyy-MM-dd");
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return fromZonedTime(`${datePart}T${hh}:${mm}:00`, tz);
}

describe("SessionsService - updateSession, getClassParticipants, generateSessions, deleteFutureSessions, generateSessionsFromSchedule", () => {
  let sessionsService: SessionsService;
  let mockPrisma: any;
  let mockTenantedClient: any;
  const centerId = "center-123";

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock the tenanted client methods directly
    mockTenantedClient = {
      classSession: {
        findMany: vi.fn().mockResolvedValue([]),
        findUniqueOrThrow: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn().mockResolvedValue({ count: 0 }),
        update: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
        count: vi.fn(),
      },
      class: {
        findUniqueOrThrow: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      classSchedule: {
        findMany: vi.fn().mockResolvedValue([]),
        findUniqueOrThrow: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
    };

    // Mock base prisma with $extends that returns our tenanted client.
    // Also mock `center.findUnique` on the base prisma — the new
    // generateSessionsFromSchedule looks up the center timezone via the
    // un-tenanted prisma client (Center is a global model, not per-tenant).
    mockPrisma = {
      $extends: vi.fn().mockReturnValue(mockTenantedClient),
      center: {
        findUnique: vi.fn().mockResolvedValue({ timezone: "UTC" }),
      },
    };

    sessionsService = new SessionsService(mockPrisma as any);
  });

  describe("updateSession", () => {
    it("should return previous times for notification comparison", async () => {
      const sessionId = "session-1";
      const previousStart = new Date("2026-01-20T09:00:00Z");
      const previousEnd = new Date("2026-01-20T10:00:00Z");
      const newStart = new Date("2026-01-20T11:00:00Z");
      const newEnd = new Date("2026-01-20T12:00:00Z");

      mockTenantedClient.classSession.findUniqueOrThrow.mockResolvedValue({
        id: sessionId,
        classId: "class-456",
        startTime: previousStart,
        endTime: previousEnd,
        centerId,
      });

      mockTenantedClient.classSession.update.mockResolvedValue({
        id: sessionId,
        classId: "class-456",
        startTime: newStart,
        endTime: newEnd,
        centerId,
      });

      const result = await sessionsService.updateSession(centerId, sessionId, {
        startTime: newStart,
        endTime: newEnd,
      });

      expect(result.previousStartTime).toEqual(previousStart);
      expect(result.previousEndTime).toEqual(previousEnd);
      expect(result.session.startTime).toEqual(newStart);
    });

    it("should only update provided fields", async () => {
      const sessionId = "session-1";
      mockTenantedClient.classSession.findUniqueOrThrow.mockResolvedValue({
        id: sessionId,
        startTime: new Date(),
        endTime: new Date(),
        roomName: "Room A",
        centerId,
      });
      mockTenantedClient.classSession.update.mockResolvedValue({
        id: sessionId,
        roomName: "Room B",
        centerId,
      });

      await sessionsService.updateSession(centerId, sessionId, {
        roomName: "Room B",
      });

      expect(mockTenantedClient.classSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { roomName: "Room B" },
        }),
      );
    });

    it("should reject setting status to CANCELLED via update (must use cancel endpoint)", async () => {
      const sessionId = "session-1";
      mockTenantedClient.classSession.findUniqueOrThrow.mockResolvedValue({
        id: sessionId,
        startTime: new Date(),
        endTime: new Date(),
        status: "SCHEDULED",
        centerId,
      });

      await expect(
        sessionsService.updateSession(centerId, sessionId, {
          status: "CANCELLED",
        }),
      ).rejects.toThrow("Use the cancel endpoint to cancel a session");
    });

    it("should reject setting status to COMPLETED via update", async () => {
      const sessionId = "session-1";
      mockTenantedClient.classSession.findUniqueOrThrow.mockResolvedValue({
        id: sessionId,
        startTime: new Date(),
        endTime: new Date(),
        status: "SCHEDULED",
        centerId,
      });

      await expect(
        sessionsService.updateSession(centerId, sessionId, {
          status: "COMPLETED",
        }),
      ).rejects.toThrow("Cannot set status to COMPLETED via update");
    });
  });

  describe("getClassParticipants", () => {
    it("should return teacher and student IDs", async () => {
      const classId = "class-456";
      mockTenantedClient.class.findUniqueOrThrow.mockResolvedValue({
        id: classId,
        teacherId: "teacher-1",
        students: [{ studentId: "student-1" }, { studentId: "student-2" }],
      });

      const result = await sessionsService.getClassParticipants(
        centerId,
        classId,
      );

      expect(result.teacherId).toBe("teacher-1");
      expect(result.studentIds).toEqual(["student-1", "student-2"]);
    });

    it("should handle class with no teacher", async () => {
      const classId = "class-456";
      mockTenantedClient.class.findUniqueOrThrow.mockResolvedValue({
        id: classId,
        teacherId: null,
        students: [{ studentId: "student-1" }],
      });

      const result = await sessionsService.getClassParticipants(
        centerId,
        classId,
      );

      expect(result.teacherId).toBeNull();
      expect(result.studentIds).toEqual(["student-1"]);
    });

    it("should handle class with no students", async () => {
      const classId = "class-456";
      mockTenantedClient.class.findUniqueOrThrow.mockResolvedValue({
        id: classId,
        teacherId: "teacher-1",
        students: [],
      });

      const result = await sessionsService.getClassParticipants(
        centerId,
        classId,
      );

      expect(result.teacherId).toBe("teacher-1");
      expect(result.studentIds).toEqual([]);
    });
  });

  describe("generateSessions (deprecated wrapper)", () => {
    // The deprecated wrapper now delegates to generateSessionsFromSchedule for
    // each matching schedule. The startDate/endDate args are kept for API
    // back-compat but the actual generation respects each schedule's own
    // effectiveFrom/endDate fields.
    it("should fan out to generateSessionsFromSchedule for each matching schedule", async () => {
      mockTenantedClient.classSchedule.findMany.mockResolvedValue([
        { id: "schedule-1" },
        { id: "schedule-2" },
      ]);
      // For each delegated call, findUniqueOrThrow returns a stub schedule and
      // createMany returns a count. The new method's full path runs per id.
      mockTenantedClient.classSchedule.findUniqueOrThrow.mockResolvedValue({
        id: "schedule-1",
        classId: "class-1",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "10:00",
        roomName: "Room A",
        frequency: "WEEKLY",
        endDate: null,
        effectiveFrom: null,
        centerId,
      });
      mockTenantedClient.classSession.findMany.mockResolvedValue([]);
      mockTenantedClient.classSession.createMany.mockResolvedValue({ count: 3 });

      const result = await sessionsService.generateSessions(centerId, {
        startDate: "2026-01-20",
        endDate: "2026-01-26",
      });

      // findMany on schedules — once at the top of the wrapper.
      expect(mockTenantedClient.classSchedule.findMany).toHaveBeenCalledTimes(1);
      // findUniqueOrThrow — once per delegated schedule (2 schedules).
      expect(
        mockTenantedClient.classSchedule.findUniqueOrThrow,
      ).toHaveBeenCalledTimes(2);
      // generatedCount sums across delegated calls (3 + 3).
      expect(result.generatedCount).toBe(6);
    });

    it("should reject invalid date ranges with 400-class error", async () => {
      await expect(
        sessionsService.generateSessions(centerId, {
          startDate: "not-a-date",
          endDate: "2026-01-26",
        }),
      ).rejects.toThrow("Invalid date range provided");
    });
  });

  describe("deleteFutureSessions", () => {
    it("should delete all future sessions with the same scheduleId", async () => {
      const sessionId = "session-5";
      const scheduleId = "schedule-1";
      const classId = "class-1";
      const sessionStartTime = new Date("2026-02-10T09:00:00Z");

      mockTenantedClient.classSession.findUniqueOrThrow.mockResolvedValue({
        id: sessionId,
        scheduleId,
        classId,
        startTime: sessionStartTime,
        centerId,
      });
      mockTenantedClient.classSession.deleteMany.mockResolvedValue({
        count: 5,
      });
      mockTenantedClient.classSession.count.mockResolvedValue(3); // 3 earlier sessions remain

      const result = await sessionsService.deleteFutureSessions(
        centerId,
        sessionId,
      );

      expect(result.deletedCount).toBe(5);
      expect(result.classId).toBe(classId);
      expect(mockTenantedClient.classSession.deleteMany).toHaveBeenCalledWith({
        where: {
          scheduleId,
          startTime: { gte: sessionStartTime },
          centerId,
        },
      });
      // Should NOT delete ClassSchedule since 3 sessions remain
      expect(mockTenantedClient.classSchedule.delete).not.toHaveBeenCalled();
    });

    it("should throw when session has no scheduleId", async () => {
      mockTenantedClient.classSession.findUniqueOrThrow.mockResolvedValue({
        id: "session-solo",
        scheduleId: null,
        classId: "class-1",
        startTime: new Date(),
        centerId,
      });

      await expect(
        sessionsService.deleteFutureSessions(centerId, "session-solo"),
      ).rejects.toThrow("Session is not part of a recurring series");
    });

    it("should delete orphaned ClassSchedule when no sessions remain", async () => {
      const sessionId = "session-last";
      const scheduleId = "schedule-orphan";

      mockTenantedClient.classSession.findUniqueOrThrow.mockResolvedValue({
        id: sessionId,
        scheduleId,
        classId: "class-1",
        startTime: new Date("2026-02-10T09:00:00Z"),
        centerId,
      });
      mockTenantedClient.classSession.deleteMany.mockResolvedValue({
        count: 1,
      });
      mockTenantedClient.classSession.count.mockResolvedValue(0); // No sessions remain
      mockTenantedClient.classSchedule.delete.mockResolvedValue({
        id: scheduleId,
      });

      await sessionsService.deleteFutureSessions(centerId, sessionId);

      expect(mockTenantedClient.classSchedule.delete).toHaveBeenCalledWith({
        where: { id: scheduleId },
      });
    });

    it("should keep ClassSchedule when earlier sessions still exist", async () => {
      const sessionId = "session-mid";
      const scheduleId = "schedule-keep";

      mockTenantedClient.classSession.findUniqueOrThrow.mockResolvedValue({
        id: sessionId,
        scheduleId,
        classId: "class-1",
        startTime: new Date("2026-02-10T09:00:00Z"),
        centerId,
      });
      mockTenantedClient.classSession.deleteMany.mockResolvedValue({
        count: 3,
      });
      mockTenantedClient.classSession.count.mockResolvedValue(5); // 5 earlier sessions remain

      await sessionsService.deleteFutureSessions(centerId, sessionId);

      expect(mockTenantedClient.classSchedule.delete).not.toHaveBeenCalled();
    });
  });

  describe("generateSessionsFromSchedule", () => {
    const scheduleId = "schedule-1";
    const classId = "class-1";

    function mockSchedule(overrides: Record<string, unknown> = {}) {
      return {
        id: scheduleId,
        classId,
        dayOfWeek: 1, // Monday
        startTime: "09:00",
        endTime: "10:00",
        roomName: "Room A",
        frequency: "WEEKLY",
        endDate: null,
        effectiveFrom: null,
        centerId,
        ...overrides,
      };
    }

    /**
     * Helper: find the first UTC Monday at-or-after today.
     * MUST use `getUTCDay()` (not date-fns `getDay()` which is local-tz) so
     * the test runner's host timezone doesn't shift us onto an adjacent day
     * and silently break the parity assertions further down.
     */
    function nextMondayUtc(): Date {
      const today = startOfTodayUtc();
      for (let i = 0; i < 7; i++) {
        const d = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
        if (d.getUTCDay() === 1) return d;
      }
      throw new Error("unreachable: no Monday in 7 days");
    }

    it("should generate correct sessions for WEEKLY frequency", async () => {
      const schedule = mockSchedule();
      mockTenantedClient.classSchedule.findUniqueOrThrow.mockResolvedValue(schedule);
      // Two findMany calls:
      //   1) schedule's existing sessions (empty)
      //   2) manual sessions at any candidate slot (empty)
      // Both default to []; the third call (post-create fetch) returns [].
      mockTenantedClient.classSession.findMany.mockResolvedValue([]);
      mockTenantedClient.classSession.createMany.mockResolvedValue({ count: 5 });

      const result = await sessionsService.generateSessionsFromSchedule(centerId, scheduleId);

      // createMany is invoked exactly once with `skipDuplicates: true`.
      expect(mockTenantedClient.classSession.createMany).toHaveBeenCalledTimes(1);
      const createCall = mockTenantedClient.classSession.createMany.mock.calls[0]?.[0];
      expect(createCall).toBeDefined();
      expect(createCall!.skipDuplicates).toBe(true);
      expect(Array.isArray(createCall!.data)).toBe(true);
      expect(createCall!.data.length).toBeGreaterThan(0);

      for (const session of createCall!.data) {
        expect(getDay(session.startTime)).toBe(1); // Monday
        expect(session.scheduleId).toBe(scheduleId);
        expect(session.classId).toBe(classId);
        expect(session.isException).toBe(false);
      }

      // Service surfaces the actual `result.count` from createMany, not the
      // candidate count — caller-visible accuracy.
      expect(result.generatedCount).toBe(5);
    });

    it("should generate correct sessions for BIWEEKLY frequency anchored on effectiveFrom", async () => {
      const anchor = startOfTodayUtc();
      const schedule = mockSchedule({
        frequency: "BIWEEKLY",
        effectiveFrom: anchor,
      });
      mockTenantedClient.classSchedule.findUniqueOrThrow.mockResolvedValue(schedule);
      mockTenantedClient.classSession.findMany.mockResolvedValue([]);
      mockTenantedClient.classSession.createMany.mockResolvedValue({ count: 0 });

      await sessionsService.generateSessionsFromSchedule(centerId, scheduleId);

      const createCall = mockTenantedClient.classSession.createMany.mock.calls[0]?.[0];
      expect(createCall).toBeDefined();
      expect(createCall!.data.length).toBeGreaterThan(0);

      // Every BIWEEKLY candidate must be exactly an even number of UTC weeks
      // away from the anchor (the parity rule the service uses to dedup
      // off-weeks).
      const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
      const anchorMidnight = Date.UTC(
        anchor.getUTCFullYear(),
        anchor.getUTCMonth(),
        anchor.getUTCDate(),
      );
      for (const session of createCall!.data) {
        const day: Date = session.startTime;
        const dayMidnight = Date.UTC(
          day.getUTCFullYear(),
          day.getUTCMonth(),
          day.getUTCDate(),
        );
        const weeks = Math.floor((dayMidnight - anchorMidnight) / ONE_WEEK_MS);
        expect(weeks % 2).toBe(0);
        expect(getDay(day)).toBe(1);
      }
    });

    it("should skip existing sessions (dedup) and not include skipped slot in createMany payload", async () => {
      const schedule = mockSchedule();
      mockTenantedClient.classSchedule.findUniqueOrThrow.mockResolvedValue(schedule);

      const monday = nextMondayUtc();
      const existingStart = expectedSessionInstant(monday, 9, 0, "UTC");

      mockTenantedClient.classSession.findMany
        // 1st: existing sessions for this schedule
        .mockResolvedValueOnce([
          { startTime: existingStart, originalStartTime: null, status: "SCHEDULED", isException: false },
        ])
        // 2nd: manual sessions at candidate slots
        .mockResolvedValueOnce([])
        // 3rd: post-create fetch (won't include skipped slot)
        .mockResolvedValueOnce([]);

      mockTenantedClient.classSession.createMany.mockResolvedValue({ count: 0 });

      await sessionsService.generateSessionsFromSchedule(centerId, scheduleId);

      const createCall = mockTenantedClient.classSession.createMany.mock.calls[0]?.[0];
      expect(createCall).toBeDefined();
      const createdTimes = createCall!.data.map((s: any) => s.startTime.toISOString());
      expect(createdTimes).not.toContain(existingStart.toISOString());
    });

    it("should preserve LIVE exception sessions (originalStartTime suppresses regeneration)", async () => {
      const schedule = mockSchedule();
      mockTenantedClient.classSchedule.findUniqueOrThrow.mockResolvedValue(schedule);

      const monday = nextMondayUtc();
      const originalStart = expectedSessionInstant(monday, 9, 0, "UTC");
      const rescheduledStart = expectedSessionInstant(monday, 11, 0, "UTC");

      mockTenantedClient.classSession.findMany
        .mockResolvedValueOnce([
          {
            startTime: rescheduledStart,
            originalStartTime: originalStart,
            status: "SCHEDULED",
            isException: true,
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockTenantedClient.classSession.createMany.mockResolvedValue({ count: 0 });

      await sessionsService.generateSessionsFromSchedule(centerId, scheduleId);

      const createCall = mockTenantedClient.classSession.createMany.mock.calls[0]?.[0];
      expect(createCall).toBeDefined();
      const createdTimes = createCall!.data.map((s: any) => s.startTime.toISOString());
      expect(createdTimes).not.toContain(originalStart.toISOString());
    });

    it("should ALLOW regeneration when an exception is CANCELLED (originalStartTime no longer suppresses)", async () => {
      // Spec rule: cancelled-and-deleted exceptions should not block the slot
      // forever. The dedup map only includes originalStartTime when the
      // exception is still SCHEDULED.
      const schedule = mockSchedule();
      mockTenantedClient.classSchedule.findUniqueOrThrow.mockResolvedValue(schedule);

      const monday = nextMondayUtc();
      const originalStart = expectedSessionInstant(monday, 9, 0, "UTC");
      const rescheduledStart = expectedSessionInstant(monday, 11, 0, "UTC");

      mockTenantedClient.classSession.findMany
        .mockResolvedValueOnce([
          {
            startTime: rescheduledStart,
            originalStartTime: originalStart,
            status: "CANCELLED",
            isException: true,
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockTenantedClient.classSession.createMany.mockResolvedValue({ count: 0 });

      await sessionsService.generateSessionsFromSchedule(centerId, scheduleId);

      const createCall = mockTenantedClient.classSession.createMany.mock.calls[0]?.[0];
      expect(createCall).toBeDefined();
      const createdTimes = createCall!.data.map((s: any) => s.startTime.toISOString());
      // The original 09:00 slot should be regenerated since the exception is cancelled.
      expect(createdTimes).toContain(originalStart.toISOString());
    });

    it("should preserve COMPLETED sessions (their startTime stays in the dedup set)", async () => {
      // Spec rule from Dev Notes: "COMPLETED sessions are sacred — never
      // overwritten during re-generation."
      const schedule = mockSchedule();
      mockTenantedClient.classSchedule.findUniqueOrThrow.mockResolvedValue(schedule);

      const monday = nextMondayUtc();
      const completedStart = expectedSessionInstant(monday, 9, 0, "UTC");

      mockTenantedClient.classSession.findMany
        .mockResolvedValueOnce([
          {
            startTime: completedStart,
            originalStartTime: null,
            status: "COMPLETED",
            isException: false,
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockTenantedClient.classSession.createMany.mockResolvedValue({ count: 0 });

      await sessionsService.generateSessionsFromSchedule(centerId, scheduleId);

      const createCall = mockTenantedClient.classSession.createMany.mock.calls[0]?.[0];
      expect(createCall).toBeDefined();
      const createdTimes = createCall!.data.map((s: any) => s.startTime.toISOString());
      expect(createdTimes).not.toContain(completedStart.toISOString());
    });

    it("should preserve manually-created sessions (no scheduleId) at the same slot — AC4", async () => {
      // The dedup query for manual sessions runs in parallel; if a manual
      // session lives at the same `(classId, startTime)` slot, regeneration
      // skips it rather than duplicating.
      const schedule = mockSchedule();
      mockTenantedClient.classSchedule.findUniqueOrThrow.mockResolvedValue(schedule);

      const monday = nextMondayUtc();
      const manualStart = expectedSessionInstant(monday, 9, 0, "UTC");

      mockTenantedClient.classSession.findMany
        // 1st: schedule's own sessions (none)
        .mockResolvedValueOnce([])
        // 2nd: manual sessions at any candidate slot — has one at our 09:00 Monday
        .mockResolvedValueOnce([{ startTime: manualStart }])
        // 3rd: post-create fetch
        .mockResolvedValueOnce([]);

      mockTenantedClient.classSession.createMany.mockResolvedValue({ count: 0 });

      await sessionsService.generateSessionsFromSchedule(centerId, scheduleId);

      const createCall = mockTenantedClient.classSession.createMany.mock.calls[0]?.[0];
      expect(createCall).toBeDefined();
      const createdTimes = createCall!.data.map((s: any) => s.startTime.toISOString());
      expect(createdTimes).not.toContain(manualStart.toISOString());
    });

    it("should respect endDate when set", async () => {
      const today = startOfTodayUtc();
      const endDate = addMonths(today, 1);
      const schedule = mockSchedule({ endDate });
      mockTenantedClient.classSchedule.findUniqueOrThrow.mockResolvedValue(schedule);
      mockTenantedClient.classSession.findMany.mockResolvedValue([]);
      mockTenantedClient.classSession.createMany.mockResolvedValue({ count: 0 });

      await sessionsService.generateSessionsFromSchedule(centerId, scheduleId);

      const createCall = mockTenantedClient.classSession.createMany.mock.calls[0]?.[0];
      expect(createCall).toBeDefined();
      // endDate is treated as inclusive end-of-day, so a session at 09:00 ON
      // endDate is permitted; sessions strictly after end-of-day are not.
      const endDayCutoff = new Date(endDate);
      endDayCutoff.setUTCHours(23, 59, 59, 999);
      for (const session of createCall!.data) {
        expect(session.startTime.getTime()).toBeLessThanOrEqual(endDayCutoff.getTime());
      }
    });

    it("should use rolling window (3 months) when no endDate", async () => {
      const schedule = mockSchedule({ endDate: null });
      mockTenantedClient.classSchedule.findUniqueOrThrow.mockResolvedValue(schedule);
      mockTenantedClient.classSession.findMany.mockResolvedValue([]);
      mockTenantedClient.classSession.createMany.mockResolvedValue({ count: 0 });

      await sessionsService.generateSessionsFromSchedule(centerId, scheduleId);

      const createCall = mockTenantedClient.classSession.createMany.mock.calls[0]?.[0];
      expect(createCall).toBeDefined();
      const today = startOfTodayUtc();
      const threeMonths = addMonths(today, 3);
      for (const session of createCall!.data) {
        expect(session.startTime.getTime()).toBeLessThanOrEqual(threeMonths.getTime());
      }
    });

    it("should return empty result when endDate is in the past", async () => {
      const pastDate = new Date("2020-01-01");
      const schedule = mockSchedule({ endDate: pastDate });
      mockTenantedClient.classSchedule.findUniqueOrThrow.mockResolvedValue(schedule);

      const result = await sessionsService.generateSessionsFromSchedule(centerId, scheduleId);

      expect(result.generatedCount).toBe(0);
      expect(result.sessions).toEqual([]);
      expect(mockTenantedClient.classSession.createMany).not.toHaveBeenCalled();
    });

    it("should return conflict warnings (non-blocking)", async () => {
      const schedule = mockSchedule();
      mockTenantedClient.classSchedule.findUniqueOrThrow.mockResolvedValue(schedule);
      mockTenantedClient.classSession.findMany.mockResolvedValue([]);
      mockTenantedClient.classSession.createMany.mockResolvedValue({ count: 0 });

      const result = await sessionsService.generateSessionsFromSchedule(centerId, scheduleId);

      // conflicts is always an array (even if empty)
      expect(Array.isArray(result.conflicts)).toBe(true);
    });

    it("should generate session times in the center's timezone (TZ-correctness)", async () => {
      // A center in Asia/Saigon (UTC+7) with schedule "09:00 Monday" should
      // produce sessions whose UTC timestamp is "Monday 02:00 UTC". This is
      // the bug class P-4/P-5/P-6 was meant to fix.
      mockPrisma.center.findUnique.mockResolvedValue({ timezone: "Asia/Saigon" });
      const schedule = mockSchedule();
      mockTenantedClient.classSchedule.findUniqueOrThrow.mockResolvedValue(schedule);
      mockTenantedClient.classSession.findMany.mockResolvedValue([]);
      mockTenantedClient.classSession.createMany.mockResolvedValue({ count: 0 });

      await sessionsService.generateSessionsFromSchedule(centerId, scheduleId);

      const createCall = mockTenantedClient.classSession.createMany.mock.calls[0]?.[0];
      expect(createCall).toBeDefined();
      expect(createCall!.data.length).toBeGreaterThan(0);

      for (const session of createCall!.data) {
        // The wall-clock representation in Asia/Saigon must read 09:00 on Monday.
        const wallClock = formatInTimeZone(session.startTime, "Asia/Saigon", "i HH:mm");
        expect(wallClock).toBe("1 09:00");
      }
    });

    it("should skip generation when effectiveFrom is in the future and rangeStart > today", async () => {
      // Future-effective schedules: rangeStart shifts to effectiveFrom,
      // candidate filter compares against rangeStart (not today), so we still
      // produce sessions starting on/after that effective date.
      const futureAnchor = addMonths(startOfTodayUtc(), 1);
      const schedule = mockSchedule({ effectiveFrom: futureAnchor });
      mockTenantedClient.classSchedule.findUniqueOrThrow.mockResolvedValue(schedule);
      mockTenantedClient.classSession.findMany.mockResolvedValue([]);
      mockTenantedClient.classSession.createMany.mockResolvedValue({ count: 0 });

      await sessionsService.generateSessionsFromSchedule(centerId, scheduleId);

      const createCall = mockTenantedClient.classSession.createMany.mock.calls[0]?.[0];
      // We should still produce some sessions (candidates >= futureAnchor).
      expect(createCall).toBeDefined();
      for (const session of createCall!.data) {
        expect(session.startTime.getTime()).toBeGreaterThanOrEqual(futureAnchor.getTime());
      }
    });
  });
});
