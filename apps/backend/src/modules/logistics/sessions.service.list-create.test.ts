import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionsService } from "./sessions.service.js";

describe("SessionsService - listSessions, createSession, deleteSession", () => {
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

  describe("listSessions", () => {
    it("should list sessions within date range", async () => {
      const startDate = new Date("2026-01-20");
      const endDate = new Date("2026-01-26");
      const mockSessions = [
        {
          id: "s1",
          classId: "c1",
          startTime: new Date("2026-01-21T09:00:00Z"),
        },
        {
          id: "s2",
          classId: "c1",
          startTime: new Date("2026-01-22T09:00:00Z"),
        },
      ];
      mockTenantedClient.classSession.findMany.mockResolvedValue(mockSessions);

      const result = await sessionsService.listSessions(
        centerId,
        startDate,
        endDate,
      );

      expect(result).toHaveLength(2);
      expect(mockTenantedClient.classSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startTime: { gte: startDate },
            endTime: { lte: endDate },
          }),
        }),
      );
    });

    it("should filter by classId when provided", async () => {
      const startDate = new Date("2026-01-20");
      const endDate = new Date("2026-01-26");
      const classId = "class-456";

      await sessionsService.listSessions(centerId, startDate, endDate, classId);

      expect(mockTenantedClient.classSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ classId }),
        }),
      );
    });

    it("should include class, course, teacher, and student count relations", async () => {
      const startDate = new Date("2026-01-20");
      const endDate = new Date("2026-01-26");

      await sessionsService.listSessions(centerId, startDate, endDate);

      expect(mockTenantedClient.classSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            class: expect.objectContaining({
              include: expect.objectContaining({
                course: true,
                teacher: { select: { id: true, name: true } },
                _count: { select: { students: true } },
              }),
            }),
          }),
        }),
      );
    });
  });

  describe("createSession", () => {
    it("should verify class exists before creating session", async () => {
      const input = {
        classId: "class-456",
        startTime: new Date("2026-01-20T09:00:00Z"),
        endTime: new Date("2026-01-20T10:00:00Z"),
      };

      mockTenantedClient.class.findUniqueOrThrow.mockResolvedValue({
        id: "class-456",
      });
      mockTenantedClient.classSession.create.mockResolvedValue({
        id: "session-1",
        ...input,
        centerId,
        status: "SCHEDULED",
      });

      await sessionsService.createSession(centerId, input);

      expect(mockTenantedClient.class.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: input.classId },
      });
    });

    it("should create session with provided data and centerId", async () => {
      const input = {
        classId: "class-456",
        startTime: new Date("2026-01-20T09:00:00Z"),
        endTime: new Date("2026-01-20T10:00:00Z"),
        roomName: "Room A",
      };

      mockTenantedClient.class.findUniqueOrThrow.mockResolvedValue({
        id: "class-456",
      });
      mockTenantedClient.classSession.create.mockResolvedValue({
        id: "session-1",
        ...input,
        centerId,
        status: "SCHEDULED",
      });

      const result = await sessionsService.createSession(centerId, input);

      expect(mockTenantedClient.classSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            classId: input.classId,
            centerId,
            roomName: "Room A",
            status: "SCHEDULED",
          }),
        }),
      );
      expect(result.id).toBe("session-1");
    });

    it("should set default status to SCHEDULED", async () => {
      const input = {
        classId: "class-456",
        startTime: new Date("2026-01-20T09:00:00Z"),
        endTime: new Date("2026-01-20T10:00:00Z"),
      };

      mockTenantedClient.class.findUniqueOrThrow.mockResolvedValue({
        id: "class-456",
      });
      mockTenantedClient.classSession.create.mockResolvedValue({
        id: "session-1",
        ...input,
        centerId,
        status: "SCHEDULED",
      });

      await sessionsService.createSession(centerId, input);

      expect(mockTenantedClient.classSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "SCHEDULED",
          }),
        }),
      );
    });

    it("should create only the requested session without generating extras", async () => {
      const baseInput = {
        classId: "class-1",
        startTime: "2026-02-10T09:00:00Z",
        endTime: "2026-02-10T10:00:00Z",
        roomName: "Room A",
      };

      mockTenantedClient.class.findUniqueOrThrow.mockResolvedValue({
        id: "class-1",
      });
      const mockSession = {
        id: "session-1",
        ...baseInput,
        centerId,
        status: "SCHEDULED",
      };
      mockTenantedClient.classSession.create.mockResolvedValue(mockSession);

      const result = await sessionsService.createSession(centerId, baseInput);

      expect(result).toEqual(mockSession);
      expect(mockTenantedClient.classSchedule.create).not.toHaveBeenCalled();
      expect(mockTenantedClient.classSession.createMany).not.toHaveBeenCalled();
    });
  });

  describe("deleteSession", () => {
    it("should delete session by id", async () => {
      const sessionId = "session-1";
      mockTenantedClient.classSession.delete.mockResolvedValue({
        id: sessionId,
      });

      await sessionsService.deleteSession(centerId, sessionId);

      expect(mockTenantedClient.classSession.delete).toHaveBeenCalledWith({
        where: { id: sessionId },
      });
    });
  });
});
