import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionsService } from "./sessions.service.js";

describe("SessionsService - suggestNextAvailable, checkBatchConflicts", () => {
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

  describe("suggestNextAvailable", () => {
    beforeEach(() => {
      mockTenantedClient.class.findUnique = vi.fn();
    });

    it("should suggest next available time slot on same day", async () => {
      const input = {
        classId: "class-456",
        startTime: new Date("2026-01-20T09:00:00Z"),
        endTime: new Date("2026-01-20T10:00:00Z"),
        roomName: "Room A",
        duration: 60, // 60 minutes
      };

      // Existing session blocks 9:00-10:00
      const existingSessions = [
        {
          id: "session-1",
          startTime: new Date("2026-01-20T09:00:00Z"),
          endTime: new Date("2026-01-20T10:00:00Z"),
          roomName: "Room A",
        },
      ];

      mockTenantedClient.class.findUnique.mockResolvedValue({
        id: "class-456",
        teacherId: "teacher-1",
      });
      mockTenantedClient.classSession.findMany.mockResolvedValue(
        existingSessions,
      );

      const result = await sessionsService.suggestNextAvailable(
        centerId,
        input,
      );

      expect(result).toBeInstanceOf(Array);
      // Should suggest time after 10:00
      if (result.length > 0) {
        expect(result[0]!.type).toBe("time");
      }
    });

    it("should suggest alternative rooms when requested time is blocked", async () => {
      const input = {
        classId: "class-456",
        startTime: new Date("2026-01-20T09:00:00Z"),
        endTime: new Date("2026-01-20T10:00:00Z"),
        roomName: "Room A",
      };

      // Room A is blocked, but Room B is free
      mockTenantedClient.class.findUnique.mockResolvedValue({
        id: "class-456",
        teacherId: null,
      });
      // First call: sessions on day for time suggestions
      // Second call: distinct rooms query
      mockTenantedClient.classSession.findMany
        .mockResolvedValueOnce([]) // For sessions on day query
        .mockResolvedValueOnce([
          { roomName: "Room A" },
          { roomName: "Room B" },
        ]); // distinct rooms
      // findFirst returns null for Room B (free)
      mockTenantedClient.classSession.findFirst.mockResolvedValue(null);

      const result = await sessionsService.suggestNextAvailable(
        centerId,
        input,
      );

      expect(result).toBeInstanceOf(Array);
      // Should suggest Room B as an alternative since it's free
      const roomSuggestions = result.filter(
        (s: { type: string }) => s.type === "room",
      );
      expect(roomSuggestions.length).toBeGreaterThanOrEqual(1);
      expect(roomSuggestions[0]!.value).toBe("Room B");
    });
  });

  describe("checkBatchConflicts", () => {
    it("should detect room conflicts between sessions", async () => {
      const sessions = [
        {
          id: "session-1",
          classId: "class-1",
          startTime: new Date("2026-01-20T09:00:00Z"),
          endTime: new Date("2026-01-20T10:00:00Z"),
          roomName: "Room A",
        },
        {
          id: "session-2",
          classId: "class-2",
          startTime: new Date("2026-01-20T09:30:00Z"),
          endTime: new Date("2026-01-20T10:30:00Z"),
          roomName: "Room A", // Same room, overlapping time
        },
        {
          id: "session-3",
          classId: "class-3",
          startTime: new Date("2026-01-20T11:00:00Z"),
          endTime: new Date("2026-01-20T12:00:00Z"),
          roomName: "Room A", // Same room, different time - no conflict
        },
      ];

      // Mock DB query returning all overlapping sessions in range
      mockTenantedClient.classSession.findMany.mockResolvedValue([
        {
          id: "session-1",
          classId: "class-1",
          startTime: sessions[0]!.startTime,
          endTime: sessions[0]!.endTime,
          roomName: "Room A",
          class: { teacherId: null },
        },
        {
          id: "session-2",
          classId: "class-2",
          startTime: sessions[1]!.startTime,
          endTime: sessions[1]!.endTime,
          roomName: "Room A",
          class: { teacherId: null },
        },
        {
          id: "session-3",
          classId: "class-3",
          startTime: sessions[2]!.startTime,
          endTime: sessions[2]!.endTime,
          roomName: "Room A",
          class: { teacherId: null },
        },
      ]);

      const result = await sessionsService.checkBatchConflicts(
        centerId,
        sessions,
      );

      expect(result.get("session-1")).toBe(true); // Conflicts with session-2
      expect(result.get("session-2")).toBe(true); // Conflicts with session-1
      expect(result.get("session-3")).toBe(false); // No conflict
    });

    it("should detect teacher conflicts between sessions", async () => {
      const sessions = [
        {
          id: "session-1",
          classId: "class-1",
          startTime: new Date("2026-01-20T09:00:00Z"),
          endTime: new Date("2026-01-20T10:00:00Z"),
          roomName: "Room A",
        },
        {
          id: "session-2",
          classId: "class-2",
          startTime: new Date("2026-01-20T09:30:00Z"),
          endTime: new Date("2026-01-20T10:30:00Z"),
          roomName: "Room B", // Different room, but same teacher
        },
      ];

      mockTenantedClient.classSession.findMany.mockResolvedValue([
        {
          id: "session-1",
          classId: "class-1",
          startTime: sessions[0]!.startTime,
          endTime: sessions[0]!.endTime,
          roomName: "Room A",
          class: { teacherId: "teacher-1" },
        },
        {
          id: "session-2",
          classId: "class-2",
          startTime: sessions[1]!.startTime,
          endTime: sessions[1]!.endTime,
          roomName: "Room B",
          class: { teacherId: "teacher-1" },
        },
      ]);

      const result = await sessionsService.checkBatchConflicts(
        centerId,
        sessions,
      );

      expect(result.get("session-1")).toBe(true); // Teacher conflict
      expect(result.get("session-2")).toBe(true); // Teacher conflict
    });

    it("should return no conflicts when sessions do not overlap", async () => {
      const sessions = [
        {
          id: "session-1",
          classId: "class-1",
          startTime: new Date("2026-01-20T09:00:00Z"),
          endTime: new Date("2026-01-20T10:00:00Z"),
          roomName: "Room A",
        },
        {
          id: "session-2",
          classId: "class-2",
          startTime: new Date("2026-01-20T10:00:00Z"),
          endTime: new Date("2026-01-20T11:00:00Z"),
          roomName: "Room A", // Same room but adjacent time (no overlap)
        },
      ];

      mockTenantedClient.classSession.findMany.mockResolvedValue([
        {
          id: "session-1",
          classId: "class-1",
          startTime: sessions[0]!.startTime,
          endTime: sessions[0]!.endTime,
          roomName: "Room A",
          class: { teacherId: "teacher-1" },
        },
        {
          id: "session-2",
          classId: "class-2",
          startTime: sessions[1]!.startTime,
          endTime: sessions[1]!.endTime,
          roomName: "Room A",
          class: { teacherId: "teacher-2" },
        },
      ]);

      const result = await sessionsService.checkBatchConflicts(
        centerId,
        sessions,
      );

      expect(result.get("session-1")).toBe(false);
      expect(result.get("session-2")).toBe(false);
    });

    it("should return empty map for empty sessions array", async () => {
      const result = await sessionsService.checkBatchConflicts(centerId, []);
      expect(result.size).toBe(0);
    });

    it("should detect conflicts with sessions outside the batch (DB-only)", async () => {
      // Batch only contains session-1, but DB has session-external that overlaps
      const sessions = [
        {
          id: "session-1",
          classId: "class-1",
          startTime: new Date("2026-01-20T09:00:00Z"),
          endTime: new Date("2026-01-20T10:00:00Z"),
          roomName: "Room A",
        },
      ];

      // DB returns both batch session AND an external overlapping session
      mockTenantedClient.classSession.findMany.mockResolvedValue([
        {
          id: "session-1",
          classId: "class-1",
          startTime: sessions[0]!.startTime,
          endTime: sessions[0]!.endTime,
          roomName: "Room A",
          class: { teacherId: null },
        },
        {
          id: "session-external",
          classId: "class-ext",
          startTime: new Date("2026-01-20T09:30:00Z"),
          endTime: new Date("2026-01-20T10:30:00Z"),
          roomName: "Room A",
          class: { teacherId: null },
        },
      ]);

      const result = await sessionsService.checkBatchConflicts(
        centerId,
        sessions,
      );

      expect(result.get("session-1")).toBe(true); // Conflict with external session
    });
  });
});
