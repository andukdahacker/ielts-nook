import { beforeEach, describe, expect, it, vi } from "vitest";
import { SchedulesService } from "./schedules.service.js";
import type { SessionsService } from "./sessions.service.js";

/**
 * Tests for SchedulesService — the focus of story 14-1's Task 8.2.
 *
 * Coverage:
 *   - Auto-generation hook on create (AC2: generation is automatic on schedule create)
 *   - effectiveFrom respects caller input but defaults to "now"
 *   - effectiveFrom is bumped on update when anchor-affecting fields change,
 *     and ONLY when those fields change (so editing roomName alone doesn't
 *     desync existing biweekly counting)
 *   - Conflict warnings are propagated as a non-blocking field
 *   - Generation failure does not crash the create — the schedule row remains
 */

describe("SchedulesService", () => {
  let schedulesService: SchedulesService;
  let mockPrisma: any;
  let mockTenantedClient: any;
  let mockSessionsService: SessionsService;
  const centerId = "center-123";
  const classId = "class-456";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();

    mockTenantedClient = {
      classSchedule: {
        findMany: vi.fn().mockResolvedValue([]),
        findUniqueOrThrow: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      classSession: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        count: vi.fn().mockResolvedValue(0),
      },
      class: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: classId, centerId }),
      },
    };

    mockPrisma = {
      $extends: vi.fn().mockReturnValue(mockTenantedClient),
    };

    mockSessionsService = {
      generateSessionsFromSchedule: vi.fn().mockResolvedValue({
        generatedCount: 0,
        sessions: [],
        conflicts: [],
      }),
    } as unknown as SessionsService;

    schedulesService = new SchedulesService(mockPrisma as any, mockSessionsService);
  });

  describe("createSchedule (AC1, AC2, AC3)", () => {
    it("auto-generates sessions after creating the schedule and returns the result", async () => {
      const createdRow = {
        id: "schedule-1",
        classId,
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "10:00",
        roomName: null,
        frequency: "WEEKLY",
        endDate: null,
        effectiveFrom: new Date(),
        centerId,
      };
      mockTenantedClient.classSchedule.create.mockResolvedValue(createdRow);
      (mockSessionsService.generateSessionsFromSchedule as any).mockResolvedValue({
        generatedCount: 13,
        sessions: [{ id: "s1" }, { id: "s2" }],
        conflicts: [],
      });

      const result = await schedulesService.createSchedule(centerId, {
        classId,
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "10:00",
        frequency: "WEEKLY",
      });

      expect(mockTenantedClient.class.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: classId },
      });
      expect(
        mockSessionsService.generateSessionsFromSchedule,
      ).toHaveBeenCalledWith(centerId, "schedule-1");
      expect(result.schedule.id).toBe("schedule-1");
      expect(result.generatedCount).toBe(13);
      expect(result.sessions).toHaveLength(2);
      expect(result.conflicts).toEqual([]);
    });

    it("uses caller-supplied effectiveFrom (so the recurrence dialog can anchor on the picked date)", async () => {
      const pickedDate = new Date("2026-06-15T00:00:00Z");
      mockTenantedClient.classSchedule.create.mockResolvedValue({
        id: "schedule-2",
        classId,
        effectiveFrom: pickedDate,
      });

      await schedulesService.createSchedule(centerId, {
        classId,
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "10:00",
        frequency: "WEEKLY",
        effectiveFrom: pickedDate,
      });

      const createCall = mockTenantedClient.classSchedule.create.mock.calls[0]?.[0];
      expect(createCall?.data.effectiveFrom).toEqual(pickedDate);
    });

    it("defaults effectiveFrom to a fresh Date when caller omits it", async () => {
      mockTenantedClient.classSchedule.create.mockResolvedValue({ id: "schedule-3" });

      const before = new Date();
      await schedulesService.createSchedule(centerId, {
        classId,
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "10:00",
        frequency: "WEEKLY",
      });
      const after = new Date();

      const createCall = mockTenantedClient.classSchedule.create.mock.calls[0]?.[0];
      const eff: Date = createCall?.data.effectiveFrom;
      expect(eff).toBeInstanceOf(Date);
      expect(eff.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(eff.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("propagates conflict warnings from generation as non-blocking field", async () => {
      mockTenantedClient.classSchedule.create.mockResolvedValue({ id: "schedule-x" });
      (mockSessionsService.generateSessionsFromSchedule as any).mockResolvedValue({
        generatedCount: 4,
        sessions: [],
        conflicts: [
          { hasConflicts: true, roomConflicts: [{ id: "x", classId, startTime: new Date(), endTime: new Date() }], teacherConflicts: [] },
          { hasConflicts: true, roomConflicts: [{ id: "y", classId, startTime: new Date(), endTime: new Date() }], teacherConflicts: [] },
        ],
      });

      const result = await schedulesService.createSchedule(centerId, {
        classId,
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "10:00",
        frequency: "WEEKLY",
      });

      expect(result.conflicts).toHaveLength(2);
      expect(result.generatedCount).toBe(4);
    });

    it("returns the schedule even when session generation throws", async () => {
      // Spec: schedule create should never 500 the request just because the
      // post-create generation step failed. The schedule row is durable.
      mockTenantedClient.classSchedule.create.mockResolvedValue({ id: "schedule-survives" });
      (mockSessionsService.generateSessionsFromSchedule as any).mockRejectedValue(
        new Error("simulated generation failure"),
      );

      const result = await schedulesService.createSchedule(centerId, {
        classId,
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "10:00",
        frequency: "WEEKLY",
      });

      expect(result.schedule.id).toBe("schedule-survives");
      expect(result.generatedCount).toBe(0);
      expect(result.conflicts).toEqual([]);
    });

    it("coerces endDate to Date when supplied as ISO string (boundary handling)", async () => {
      mockTenantedClient.classSchedule.create.mockResolvedValue({ id: "schedule-end" });

      await schedulesService.createSchedule(centerId, {
        classId,
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "10:00",
        frequency: "WEEKLY",
        endDate: "2026-12-31",
      });

      const createCall = mockTenantedClient.classSchedule.create.mock.calls[0]?.[0];
      expect(createCall?.data.endDate).toBeInstanceOf(Date);
    });
  });

  describe("updateSchedule (anchor-bump rules)", () => {
    it("bumps effectiveFrom when frequency changes", async () => {
      mockTenantedClient.classSchedule.update.mockResolvedValue({
        id: "schedule-1",
        classId,
        frequency: "BIWEEKLY",
      });

      const before = new Date();
      const result = await schedulesService.updateSchedule(centerId, "schedule-1", {
        frequency: "BIWEEKLY",
      });
      const after = new Date();

      const updateCall = mockTenantedClient.classSchedule.update.mock.calls[0]?.[0];
      const eff: Date = updateCall?.data.effectiveFrom;
      expect(eff).toBeInstanceOf(Date);
      expect(eff.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(eff.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(result.schedule.id).toBe("schedule-1");
    });

    it("bumps effectiveFrom when dayOfWeek/startTime/endTime change", async () => {
      mockTenantedClient.classSchedule.update.mockResolvedValue({ id: "schedule-1", classId });

      await schedulesService.updateSchedule(centerId, "schedule-1", { dayOfWeek: 3 });
      let updateCall = mockTenantedClient.classSchedule.update.mock.calls[0]?.[0];
      expect(updateCall?.data.effectiveFrom).toBeInstanceOf(Date);

      vi.clearAllMocks();
      mockTenantedClient.classSchedule.update.mockResolvedValue({ id: "schedule-1", classId });
      mockTenantedClient.classSession.deleteMany.mockResolvedValue({ count: 0 });

      await schedulesService.updateSchedule(centerId, "schedule-1", { startTime: "10:00" });
      updateCall = mockTenantedClient.classSchedule.update.mock.calls[0]?.[0];
      expect(updateCall?.data.effectiveFrom).toBeInstanceOf(Date);
    });

    it("does NOT bump effectiveFrom when only roomName/endDate changes", async () => {
      // Editing roomName alone should not desync biweekly counting.
      mockTenantedClient.classSchedule.update.mockResolvedValue({ id: "schedule-1", classId });

      const result = await schedulesService.updateSchedule(centerId, "schedule-1", {
        roomName: "Room B",
      });

      const updateCall = mockTenantedClient.classSchedule.update.mock.calls[0]?.[0];
      expect(updateCall?.data.effectiveFrom).toBeUndefined();
      expect(updateCall?.data.roomName).toBe("Room B");
      // No delete-regenerate when no anchor fields changed
      expect(result.deletedCount).toBe(0);
      expect(result.generatedCount).toBe(0);
      expect(mockTenantedClient.classSession.deleteMany).not.toHaveBeenCalled();
      expect(mockSessionsService.generateSessionsFromSchedule).not.toHaveBeenCalled();
    });

    it("coerces endDate string to Date on update", async () => {
      mockTenantedClient.classSchedule.update.mockResolvedValue({ id: "schedule-1", classId });

      await schedulesService.updateSchedule(centerId, "schedule-1", {
        endDate: "2027-01-15",
      });

      const updateCall = mockTenantedClient.classSchedule.update.mock.calls[0]?.[0];
      expect(updateCall?.data.endDate).toBeInstanceOf(Date);
    });

    it("normalizes endDate=null when caller clears it", async () => {
      mockTenantedClient.classSchedule.update.mockResolvedValue({ id: "schedule-1", classId });

      await schedulesService.updateSchedule(centerId, "schedule-1", {
        endDate: null,
      });

      const updateCall = mockTenantedClient.classSchedule.update.mock.calls[0]?.[0];
      expect(updateCall?.data.endDate).toBeNull();
    });
  });

  describe("updateSchedule (delete-regenerate — story 14-4)", () => {
    it("deletes future non-exception sessions and re-generates on anchor field change", async () => {
      mockTenantedClient.classSchedule.update.mockResolvedValue({
        id: "schedule-1",
        classId,
        dayOfWeek: 3,
      });
      mockTenantedClient.classSession.deleteMany.mockResolvedValue({ count: 8 });
      (mockSessionsService.generateSessionsFromSchedule as any).mockResolvedValue({
        generatedCount: 10,
        sessions: [{ id: "s1" }],
        conflicts: [],
      });

      const result = await schedulesService.updateSchedule(centerId, "schedule-1", {
        dayOfWeek: 3,
      });

      expect(result.deletedCount).toBe(8);
      expect(result.generatedCount).toBe(10);
      expect(result.sessions).toHaveLength(1);
      expect(mockSessionsService.generateSessionsFromSchedule).toHaveBeenCalledWith(
        centerId,
        "schedule-1",
      );
    });

    it("delete query preserves exceptions (isException = true)", async () => {
      mockTenantedClient.classSchedule.update.mockResolvedValue({
        id: "schedule-1",
        classId,
        frequency: "BIWEEKLY",
      });
      mockTenantedClient.classSession.deleteMany.mockResolvedValue({ count: 5 });

      await schedulesService.updateSchedule(centerId, "schedule-1", {
        frequency: "BIWEEKLY",
      });

      const deleteCall = mockTenantedClient.classSession.deleteMany.mock.calls[0]?.[0];
      expect(deleteCall.where.isException).toBe(false);
    });

    it("delete query preserves COMPLETED sessions", async () => {
      mockTenantedClient.classSchedule.update.mockResolvedValue({
        id: "schedule-1",
        classId,
      });
      mockTenantedClient.classSession.deleteMany.mockResolvedValue({ count: 3 });

      await schedulesService.updateSchedule(centerId, "schedule-1", {
        startTime: "14:00",
      });

      const deleteCall = mockTenantedClient.classSession.deleteMany.mock.calls[0]?.[0];
      expect(deleteCall.where.status).toEqual({ not: "COMPLETED" });
    });

    it("delete query only targets future sessions (startTime >= effectiveFrom)", async () => {
      mockTenantedClient.classSchedule.update.mockResolvedValue({
        id: "schedule-1",
        classId,
      });
      mockTenantedClient.classSession.deleteMany.mockResolvedValue({ count: 0 });

      const before = new Date();
      await schedulesService.updateSchedule(centerId, "schedule-1", {
        endTime: "16:00",
      });

      const deleteCall = mockTenantedClient.classSession.deleteMany.mock.calls[0]?.[0];
      expect(deleteCall.where.scheduleId).toBe("schedule-1");
      const gte = deleteCall.where.startTime.gte as Date;
      expect(gte.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it("returns schedule even when session regeneration throws", async () => {
      mockTenantedClient.classSchedule.update.mockResolvedValue({
        id: "schedule-1",
        classId,
        dayOfWeek: 5,
      });
      mockTenantedClient.classSession.deleteMany.mockResolvedValue({ count: 4 });
      (mockSessionsService.generateSessionsFromSchedule as any).mockRejectedValue(
        new Error("generation failed"),
      );

      const result = await schedulesService.updateSchedule(centerId, "schedule-1", {
        dayOfWeek: 5,
      });

      expect(result.schedule.id).toBe("schedule-1");
      expect(result.deletedCount).toBe(4);
      expect(result.generatedCount).toBe(0);
      expect(result.sessions).toEqual([]);
    });

    it("updating frequency from WEEKLY to BIWEEKLY triggers delete-regenerate", async () => {
      mockTenantedClient.classSchedule.update.mockResolvedValue({
        id: "schedule-1",
        classId,
        frequency: "BIWEEKLY",
      });
      mockTenantedClient.classSession.deleteMany.mockResolvedValue({ count: 12 });
      (mockSessionsService.generateSessionsFromSchedule as any).mockResolvedValue({
        generatedCount: 6,
        sessions: [],
        conflicts: [],
      });

      const result = await schedulesService.updateSchedule(centerId, "schedule-1", {
        frequency: "BIWEEKLY",
      });

      expect(result.deletedCount).toBe(12);
      expect(result.generatedCount).toBe(6);
    });
  });

  describe("previewUpdateSchedule (story 14-4)", () => {
    beforeEach(() => {
      mockTenantedClient.classSchedule.findUniqueOrThrow.mockResolvedValue({ id: "schedule-1" });
    });

    it("returns correct counts for deletable vs preserved sessions", async () => {
      mockTenantedClient.classSession.count
        .mockResolvedValueOnce(5)  // deletable
        .mockResolvedValueOnce(2)  // preserved exceptions
        .mockResolvedValueOnce(1); // preserved completed (non-exception)

      const result = await schedulesService.previewUpdateSchedule(centerId, "schedule-1");

      expect(result.deletableCount).toBe(5);
      expect(result.preservedExceptions).toBe(2);
      expect(result.preservedCompleted).toBe(1);
      expect(result.totalFutureAffected).toBe(8);
    });

    it("returns 0 deletable when all future sessions are exceptions or completed", async () => {
      mockTenantedClient.classSession.count
        .mockResolvedValueOnce(0)  // deletable
        .mockResolvedValueOnce(3)  // preserved exceptions
        .mockResolvedValueOnce(2); // preserved completed (non-exception)

      const result = await schedulesService.previewUpdateSchedule(centerId, "schedule-1");

      expect(result.deletableCount).toBe(0);
      expect(result.totalFutureAffected).toBe(5);
    });

    it("uses provided effectiveFrom as cutoff date", async () => {
      const cutoff = new Date("2026-06-01T00:00:00Z");
      mockTenantedClient.classSession.count
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      await schedulesService.previewUpdateSchedule(centerId, "schedule-1", cutoff);

      const countCalls = mockTenantedClient.classSession.count.mock.calls;
      expect(countCalls[0][0].where.startTime.gte).toEqual(cutoff);
    });

    it("preservedCompleted excludes exception sessions to avoid double-counting", async () => {
      mockTenantedClient.classSession.count
        .mockResolvedValueOnce(3)  // deletable
        .mockResolvedValueOnce(2)  // preserved exceptions
        .mockResolvedValueOnce(1); // preserved completed (non-exception only)

      await schedulesService.previewUpdateSchedule(centerId, "schedule-1");

      const countCalls = mockTenantedClient.classSession.count.mock.calls;
      // Third query (preservedCompleted) must filter isException: false
      expect(countCalls[2][0].where.isException).toBe(false);
      expect(countCalls[2][0].where.status).toBe("COMPLETED");
    });

    it("throws for nonexistent schedule", async () => {
      mockTenantedClient.classSchedule.findUniqueOrThrow.mockRejectedValue(
        new Error("Record not found"),
      );

      await expect(
        schedulesService.previewUpdateSchedule(centerId, "nonexistent"),
      ).rejects.toThrow("Record not found");
    });
  });

  describe("listSchedules / getSchedule / deleteSchedule (pass-through behavior)", () => {
    it("listSchedules orders by dayOfWeek then startTime", async () => {
      mockTenantedClient.classSchedule.findMany.mockResolvedValue([]);
      await schedulesService.listSchedules(centerId);
      const findArgs = mockTenantedClient.classSchedule.findMany.mock.calls[0]?.[0];
      expect(findArgs?.orderBy).toEqual([
        { dayOfWeek: "asc" },
        { startTime: "asc" },
      ]);
    });

    it("getSchedule throws when not found", async () => {
      mockTenantedClient.classSchedule.findUniqueOrThrow.mockRejectedValue(
        new Error("not found"),
      );
      await expect(schedulesService.getSchedule(centerId, "missing")).rejects.toThrow();
    });
  });
});
