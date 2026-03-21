import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionsService } from "./sessions.service.js";

describe("SessionsService - updateSession, getClassParticipants, generateSessions, deleteFutureSessions", () => {
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
        createMany: vi.fn(),
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
        create: vi.fn(),
        delete: vi.fn(),
      },
    };

    // Mock base prisma with $extends that returns our tenanted client
    mockPrisma = {
      $extends: vi.fn().mockReturnValue(mockTenantedClient),
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

    it("should allow updating status", async () => {
      const sessionId = "session-1";
      mockTenantedClient.classSession.findUniqueOrThrow.mockResolvedValue({
        id: sessionId,
        startTime: new Date(),
        endTime: new Date(),
        status: "SCHEDULED",
        centerId,
      });
      mockTenantedClient.classSession.update.mockResolvedValue({
        id: sessionId,
        status: "CANCELLED",
        centerId,
      });

      await sessionsService.updateSession(centerId, sessionId, {
        status: "CANCELLED",
      });

      expect(mockTenantedClient.classSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "CANCELLED" }),
        }),
      );
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

  describe("generateSessions", () => {
    it("should generate sessions from schedules for date range", async () => {
      const input = {
        startDate: "2026-01-20",
        endDate: "2026-01-26",
      };

      mockTenantedClient.classSchedule.findMany.mockResolvedValue([
        {
          id: "schedule-1",
          classId: "class-1",
          dayOfWeek: 1, // Monday
          startTime: "09:00",
          endTime: "10:00",
          roomName: "Room A",
        },
      ]);

      mockTenantedClient.classSession.findMany.mockResolvedValue([]);
      mockTenantedClient.classSession.createMany.mockResolvedValue({
        count: 1,
      });

      const result = await sessionsService.generateSessions(centerId, input);

      expect(mockTenantedClient.classSchedule.findMany).toHaveBeenCalled();
      expect(mockTenantedClient.classSession.createMany).toHaveBeenCalled();
      expect(result.generatedCount).toBeGreaterThanOrEqual(0);
    });

    it("should not create duplicate sessions", async () => {
      const input = {
        startDate: "2026-01-20",
        endDate: "2026-01-26",
      };

      const existingSessionStart = new Date("2026-01-20T09:00:00Z");
      mockTenantedClient.classSchedule.findMany.mockResolvedValue([
        {
          id: "schedule-1",
          classId: "class-1",
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "10:00",
          roomName: "Room A",
        },
      ]);

      // Existing session that matches the schedule
      mockTenantedClient.classSession.findMany
        .mockResolvedValueOnce([
          { classId: "class-1", startTime: existingSessionStart },
        ])
        .mockResolvedValueOnce([]); // For the final query

      mockTenantedClient.classSession.createMany.mockResolvedValue({
        count: 0,
      });

      await sessionsService.generateSessions(centerId, input);

      // Should check for existing sessions
      expect(mockTenantedClient.classSession.findMany).toHaveBeenCalled();
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
});
