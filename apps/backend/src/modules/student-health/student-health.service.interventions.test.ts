import { describe, expect, it, vi, beforeEach } from "vitest";
import { StudentHealthService } from "./student-health.service.js";

vi.mock("../inngest/client.js", () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}));

describe("StudentHealthService - Interventions", () => {
  let service: StudentHealthService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      centerMembership: { findMany: vi.fn().mockResolvedValue([]) },
      classStudent: { findMany: vi.fn().mockResolvedValue([]) },
      classSession: { findMany: vi.fn().mockResolvedValue([]) },
      attendance: { findMany: vi.fn().mockResolvedValue([]) },
      assignment: { findMany: vi.fn().mockResolvedValue([]) },
      assignmentStudent: { findMany: vi.fn().mockResolvedValue([]) },
      studentFlag: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    };

    const mockPrisma = {
      $extends: vi.fn().mockReturnValue(mockDb),
      submission: { findMany: vi.fn().mockResolvedValue([]) },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new StudentHealthService(mockPrisma as any);
  });

  describe("sendIntervention", () => {
    const centerId = "center-1";
    const createdById = "owner-1";
    const payload = {
      studentId: "s1",
      recipientEmail: "parent@test.com",
      subject: "Concern About Alice",
      body: "<html>email body</html>",
      templateUsed: "concern-attendance",
    };

    beforeEach(() => {
      mockDb.centerMembership.findFirst = vi.fn().mockResolvedValue({
        id: "membership-s1",
        centerId,
        userId: "s1",
        role: "STUDENT",
        status: "ACTIVE",
      });
      mockDb.interventionLog = {
        create: vi.fn().mockResolvedValue({ id: "il-1" }),
        findMany: vi.fn().mockResolvedValue([]),
      };
      const mockPrisma = (service as any).prisma;
      mockPrisma.center = {
        findUnique: vi
          .fn()
          .mockResolvedValue({ name: "Test Center" }),
      };
    });

    it("should create intervention log and fire Inngest event", async () => {
      const result = await service.sendIntervention(
        centerId,
        createdById,
        payload,
      );
      expect(result).toMatchObject({
        interventionId: "il-1",
        status: "pending",
      });
      expect(mockDb.interventionLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            studentId: "s1",
            centerId,
            createdById,
            recipientEmail: "parent@test.com",
            status: "PENDING",
          }),
        }),
      );
    });

    it("should throw 404 for non-existent student", async () => {
      mockDb.centerMembership.findFirst = vi.fn().mockResolvedValue(null);
      await expect(
        service.sendIntervention(centerId, createdById, payload),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Student not found",
      });
    });

    it("should throw 404 for student in different center", async () => {
      mockDb.centerMembership.findFirst = vi.fn().mockResolvedValue(null);
      await expect(
        service.sendIntervention("different-center", createdById, payload),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Student not found",
      });
    });
  });

  describe("getInterventionHistory", () => {
    const centerId = "center-1";
    const studentId = "s1";

    beforeEach(() => {
      mockDb.centerMembership.findFirst = vi.fn().mockResolvedValue({
        id: "membership-s1",
        centerId,
        userId: studentId,
        role: "STUDENT",
        status: "ACTIVE",
      });
      mockDb.interventionLog = {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
      };
    });

    it("should return sorted intervention list", async () => {
      const logs = [
        {
          id: "il-1",
          studentId,
          centerId,
          createdById: "owner-1",
          recipientEmail: "parent@test.com",
          subject: "Subject 1",
          body: "Body 1",
          templateUsed: "concern-attendance",
          status: "SENT",
          error: null,
          sentAt: new Date("2026-02-15T10:00:00Z"),
        },
        {
          id: "il-2",
          studentId,
          centerId,
          createdById: "owner-1",
          recipientEmail: "parent@test.com",
          subject: "Subject 2",
          body: "Body 2",
          templateUsed: "concern-general",
          status: "PENDING",
          error: null,
          sentAt: new Date("2026-02-16T10:00:00Z"),
        },
      ];
      mockDb.interventionLog.findMany.mockResolvedValue(logs);

      const result = await service.getInterventionHistory(centerId, studentId);
      expect(result).toHaveLength(2);
      expect(result[0]!.id).toBe("il-1");
      expect(result[0]!.sentAt).toBe("2026-02-15T10:00:00.000Z");
    });

    it("should return empty array for student with no interventions", async () => {
      mockDb.interventionLog.findMany.mockResolvedValue([]);
      const result = await service.getInterventionHistory(centerId, studentId);
      expect(result).toEqual([]);
    });

    it("should throw 404 for non-existent student", async () => {
      mockDb.centerMembership.findFirst = vi.fn().mockResolvedValue(null);
      await expect(
        service.getInterventionHistory(centerId, "non-existent"),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Student not found",
      });
    });
  });
});
