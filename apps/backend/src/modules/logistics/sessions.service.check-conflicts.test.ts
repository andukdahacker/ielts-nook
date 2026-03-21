import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionsService } from "./sessions.service.js";

describe("SessionsService - checkConflicts", () => {
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

  describe("checkConflicts", () => {
    const baseInput = {
      classId: "class-456",
      startTime: new Date("2026-01-20T09:00:00Z"),
      endTime: new Date("2026-01-20T10:00:00Z"),
      roomName: "Room A",
    };

    beforeEach(() => {
      // Reset class mock for conflict tests
      mockTenantedClient.class.findUnique = vi.fn();
    });

    it("should detect room conflict when same room has overlapping session", async () => {
      const conflictingSession = {
        id: "session-existing",
        classId: "class-789",
        startTime: new Date("2026-01-20T09:30:00Z"),
        endTime: new Date("2026-01-20T10:30:00Z"),
        roomName: "Room A",
        status: "SCHEDULED",
        class: {
          name: "Math 101",
          course: { name: "Math" },
          teacher: { name: "Mr. Smith" },
        },
      };

      mockTenantedClient.class.findUnique.mockResolvedValue({
        id: "class-456",
        teacherId: null,
      });
      mockTenantedClient.classSession.findMany.mockResolvedValue([
        conflictingSession,
      ]);

      const result = await sessionsService.checkConflicts(centerId, baseInput);

      expect(result.hasConflicts).toBe(true);
      expect(result.roomConflicts).toHaveLength(1);
      expect(result.roomConflicts[0]!.id).toBe("session-existing");
    });

    it("should detect teacher conflict when same teacher has overlapping session", async () => {
      const conflictingSession = {
        id: "session-existing",
        classId: "class-789",
        startTime: new Date("2026-01-20T09:30:00Z"),
        endTime: new Date("2026-01-20T10:30:00Z"),
        roomName: "Room B",
        status: "SCHEDULED",
        class: {
          name: "Science 101",
          course: { name: "Science" },
          teacher: { id: "teacher-1", name: "Mr. Jones" },
          teacherId: "teacher-1",
        },
      };

      mockTenantedClient.class.findUnique.mockResolvedValue({
        id: "class-456",
        teacherId: "teacher-1",
      });
      // When roomName is null, room conflict check is skipped, so only teacher conflict findMany is called
      mockTenantedClient.classSession.findMany.mockResolvedValueOnce([
        conflictingSession,
      ]); // teacher conflicts only

      const inputWithNoRoom = { ...baseInput, roomName: null };
      const result = await sessionsService.checkConflicts(
        centerId,
        inputWithNoRoom,
      );

      expect(result.hasConflicts).toBe(true);
      expect(result.teacherConflicts).toHaveLength(1);
      expect(result.teacherConflicts[0]!.id).toBe("session-existing");
    });

    it("should return no conflicts when time slots do not overlap", async () => {
      mockTenantedClient.class.findUnique.mockResolvedValue({
        id: "class-456",
        teacherId: "teacher-1",
      });
      mockTenantedClient.classSession.findMany.mockResolvedValue([]);

      const result = await sessionsService.checkConflicts(centerId, baseInput);

      expect(result.hasConflicts).toBe(false);
      expect(result.roomConflicts).toHaveLength(0);
      expect(result.teacherConflicts).toHaveLength(0);
    });

    it("should exclude the session being edited from conflict results", async () => {
      mockTenantedClient.class.findUnique.mockResolvedValue({
        id: "class-456",
        teacherId: null,
      });
      // The query should have excludeSessionId filter so this shouldn't be returned
      mockTenantedClient.classSession.findMany.mockResolvedValue([]);

      const inputWithExclude = {
        ...baseInput,
        excludeSessionId: "session-being-edited",
      };
      const result = await sessionsService.checkConflicts(
        centerId,
        inputWithExclude,
      );

      expect(result.hasConflicts).toBe(false);
      // Verify the query includes the exclusion
      expect(mockTenantedClient.classSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { not: "session-being-edited" },
          }),
        }),
      );
    });

    it("should skip room conflict check when roomName is null", async () => {
      mockTenantedClient.class.findUnique.mockResolvedValue({
        id: "class-456",
        teacherId: null,
      });
      mockTenantedClient.classSession.findMany.mockResolvedValue([]);

      const inputNoRoom = { ...baseInput, roomName: null };
      const result = await sessionsService.checkConflicts(
        centerId,
        inputNoRoom,
      );

      expect(result.hasConflicts).toBe(false);
      // Should only be called once for teacher conflicts (since no room)
      expect(mockTenantedClient.classSession.findMany).toHaveBeenCalledTimes(0);
    });

    it("should skip teacher conflict check when class has no teacher", async () => {
      mockTenantedClient.class.findUnique.mockResolvedValue({
        id: "class-456",
        teacherId: null,
      });
      mockTenantedClient.classSession.findMany.mockResolvedValue([]);

      await sessionsService.checkConflicts(centerId, baseInput);

      // Only room conflict check should happen
      expect(mockTenantedClient.classSession.findMany).toHaveBeenCalledTimes(1);
    });

    it("should detect both room and teacher conflicts simultaneously", async () => {
      const roomConflictSession = {
        id: "session-room-conflict",
        classId: "class-789",
        startTime: new Date("2026-01-20T09:30:00Z"),
        endTime: new Date("2026-01-20T10:30:00Z"),
        roomName: "Room A",
        status: "SCHEDULED",
        class: {
          name: "Math 101",
          course: { name: "Math" },
          teacher: { id: "teacher-2", name: "Mr. Smith" },
        },
      };

      const teacherConflictSession = {
        id: "session-teacher-conflict",
        classId: "class-999",
        startTime: new Date("2026-01-20T09:15:00Z"),
        endTime: new Date("2026-01-20T09:45:00Z"),
        roomName: "Room B",
        status: "SCHEDULED",
        class: {
          name: "Science 101",
          course: { name: "Science" },
          teacher: { id: "teacher-1", name: "Mr. Jones" },
          teacherId: "teacher-1",
        },
      };

      mockTenantedClient.class.findUnique.mockResolvedValue({
        id: "class-456",
        teacherId: "teacher-1",
      });
      // First call for room conflicts, second for teacher conflicts
      mockTenantedClient.classSession.findMany
        .mockResolvedValueOnce([roomConflictSession])
        .mockResolvedValueOnce([teacherConflictSession]);

      const result = await sessionsService.checkConflicts(centerId, baseInput);

      expect(result.hasConflicts).toBe(true);
      expect(result.roomConflicts).toHaveLength(1);
      expect(result.roomConflicts[0]!.id).toBe("session-room-conflict");
      expect(result.teacherConflicts).toHaveLength(1);
      expect(result.teacherConflicts[0]!.id).toBe("session-teacher-conflict");
    });
  });
});
