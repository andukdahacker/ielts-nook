import { describe, expect, it, vi, beforeEach } from "vitest";
import { StudentHealthService } from "./student-health.service.js";

vi.mock("../inngest/client.js", () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}));

describe("StudentHealthService - Email Preview", () => {
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

  describe("getEmailPreview", () => {
    const centerId = "center-1";
    const studentId = "s1";

    const setupPreviewMocks = (
      parentEmailAddr: string | null,
      attendanceRate: number,
      completionRate: number,
    ) => {
      mockDb.centerMembership.findFirst = vi.fn().mockResolvedValue({
        id: "membership-s1",
        centerId,
        userId: studentId,
        role: "STUDENT",
        status: "ACTIVE",
        user: {
          id: studentId,
          name: "Alice Smith",
          email: "alice@test.com",
          avatarUrl: null,
          preferredLanguage: "en",
        },
      });
      mockDb.classStudent.findMany.mockResolvedValue([
        {
          classId: "c1",
          studentId,
          class: { id: "c1", name: "IELTS A" },
        },
      ]);
      // Configure attendance for desired rate
      const totalSessions = 10;
      const attendedCount = Math.round((attendanceRate / 100) * totalSessions);
      mockDb.classSession.findMany.mockResolvedValue(
        Array.from({ length: totalSessions }, (_, i) => ({
          id: `ses-${i}`,
          classId: "c1",
          startTime: new Date(`2026-01-${String(i + 1).padStart(2, "0")}T10:00:00Z`),
        })),
      );
      mockDb.attendance.findMany.mockResolvedValue(
        Array.from({ length: attendedCount }, (_, i) => ({
          sessionId: `ses-${i}`,
          status: "PRESENT",
        })),
      );
      // Configure assignments for desired completion rate
      const totalAssignments = 10;
      const completedCount = Math.round(
        (completionRate / 100) * totalAssignments,
      );
      mockDb.assignment.findMany.mockResolvedValue(
        Array.from({ length: totalAssignments }, (_, i) => ({
          id: `a-${i}`,
          classId: "c1",
          dueDate: new Date("2026-01-15"),
          status: "OPEN",
          exercise: { title: `Task ${i}`, skill: "reading" },
          class: { name: "IELTS A" },
        })),
      );
      mockDb.assignmentStudent = {
        findMany: vi.fn().mockResolvedValue([]),
      };
      const mockPrisma = (service as any).prisma;
      mockPrisma.submission = {
        findMany: vi.fn().mockResolvedValue(
          Array.from({ length: completedCount }, (_, i) => ({
            studentId,
            assignmentId: `a-${i}`,
            status: "SUBMITTED",
            submittedAt: new Date("2026-01-14"),
            feedback: null,
          })),
        ),
      };
      mockPrisma.center = {
        findUnique: vi
          .fn()
          .mockResolvedValue({ name: "Test Center" }),
      };
      mockPrisma.parentEmail = {
        findMany: vi.fn().mockResolvedValue(
          parentEmailAddr
            ? [{ email: parentEmailAddr }]
            : [],
        ),
      };
    };

    it("should return pre-filled template with student data", async () => {
      setupPreviewMocks("parent@test.com", 100, 100);
      const result = await service.getEmailPreview(centerId, studentId);
      expect(result.recipientEmail).toBe("parent@test.com");
      expect(result.subject).toContain("Alice Smith");
      expect(result.body).toContain("Alice Smith");
    });

    it("should return null recipientEmail when no parentEmail on record", async () => {
      setupPreviewMocks(null, 100, 100);
      const result = await service.getEmailPreview(centerId, studentId);
      expect(result.recipientEmail).toBeNull();
    });

    it("should auto-detect concern-attendance when attendance < 80%", async () => {
      setupPreviewMocks("parent@test.com", 70, 80);
      const result = await service.getEmailPreview(centerId, studentId);
      expect(result.templateUsed).toBe("concern-attendance");
    });

    it("should auto-detect concern-assignments when assignments < 50% but attendance OK", async () => {
      setupPreviewMocks("parent@test.com", 95, 40);
      const result = await service.getEmailPreview(centerId, studentId);
      expect(result.templateUsed).toBe("concern-assignments");
    });
  });
});
