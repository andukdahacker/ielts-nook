import { describe, expect, it, vi, beforeEach } from "vitest";
import { StudentHealthService } from "./student-health.service.js";

vi.mock("../inngest/client.js", () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}));

describe("StudentHealthService - Student Profile", () => {
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

  describe("getStudentProfile", () => {
    const centerId = "center-1";
    const studentId = "s1";

    const mockMembership = {
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
      },
    };

    const setupProfileMocks = () => {
      mockDb.centerMembership.findFirst = vi
        .fn()
        .mockResolvedValue(mockMembership);
      mockDb.classStudent.findMany.mockResolvedValue([
        {
          classId: "c1",
          studentId,
          class: { id: "c1", name: "IELTS A" },
        },
      ]);
      mockDb.classSession.findMany.mockResolvedValue([]);
      mockDb.attendance.findMany.mockResolvedValue([]);
      mockDb.assignment.findMany.mockResolvedValue([]);
      mockDb.assignmentStudent.findMany.mockResolvedValue([]);
      const mockPrisma = (service as any).prisma;
      mockPrisma.submission.findMany.mockResolvedValue([]);
    };

    it("should return correct student data", async () => {
      setupProfileMocks();
      const result = await service.getStudentProfile(centerId, studentId);
      expect(result.student.id).toBe(studentId);
      expect(result.student.name).toBe("Alice Smith");
      expect(result.student.email).toBe("alice@test.com");
      expect(result.student.classes).toHaveLength(1);
      expect(result.student.classes[0]!.name).toBe("IELTS A");
    });

    it("should return attendance history sorted by date desc", async () => {
      setupProfileMocks();
      const jan1 = new Date("2026-01-01T10:00:00Z");
      const jan2 = new Date("2026-01-02T10:00:00Z");
      const jan3 = new Date("2026-01-03T10:00:00Z");
      mockDb.classSession.findMany.mockResolvedValue([
        { id: "ses-1", classId: "c1", startTime: jan1 },
        { id: "ses-2", classId: "c1", startTime: jan2 },
        { id: "ses-3", classId: "c1", startTime: jan3 },
      ]);
      mockDb.attendance.findMany.mockResolvedValue([
        { sessionId: "ses-1", status: "PRESENT" },
        { sessionId: "ses-3", status: "LATE" },
      ]);

      const result = await service.getStudentProfile(centerId, studentId);
      expect(result.attendanceHistory).toHaveLength(3);
      // Most recent first
      expect(result.attendanceHistory[0]!.sessionId).toBe("ses-3");
      expect(result.attendanceHistory[1]!.sessionId).toBe("ses-2");
      expect(result.attendanceHistory[2]!.sessionId).toBe("ses-1");
    });

    it("should return assignment history with scores from feedback", async () => {
      setupProfileMocks();
      const dueDate = new Date("2026-02-01");
      mockDb.assignment.findMany.mockResolvedValue([
        {
          id: "a1",
          classId: "c1",
          dueDate,
          status: "OPEN",
          exercise: { title: "Reading Task 1", skill: "reading" },
          class: { name: "IELTS A" },
        },
      ]);
      const mockPrisma = (service as any).prisma;
      mockPrisma.submission.findMany.mockResolvedValue([
        {
          assignmentId: "a1",
          status: "GRADED",
          submittedAt: new Date("2026-01-30"),
          feedback: { overallScore: 7.0, teacherFinalScore: 7.5 },
        },
      ]);

      const result = await service.getStudentProfile(centerId, studentId);
      expect(result.assignmentHistory).toHaveLength(1);
      expect(result.assignmentHistory[0]!.exerciseTitle).toBe("Reading Task 1");
      expect(result.assignmentHistory[0]!.submissionStatus).toBe("graded");
      // teacherFinalScore takes precedence
      expect(result.assignmentHistory[0]!.score).toBe(7.5);
    });

    it("should compute weekly trends for last 8 weeks", async () => {
      setupProfileMocks();
      const result = await service.getStudentProfile(centerId, studentId);
      expect(result.weeklyTrends).toHaveLength(8);
      // Sorted chronologically (oldest first)
      const firstWeek = new Date(result.weeklyTrends[0]!.weekStart);
      const lastWeek = new Date(result.weeklyTrends[7]!.weekStart);
      expect(firstWeek.getTime()).toBeLessThan(lastWeek.getTime());
    });

    it("should throw 404 for non-existent student", async () => {
      mockDb.centerMembership.findFirst = vi.fn().mockResolvedValue(null);

      await expect(
        service.getStudentProfile(centerId, "non-existent"),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Student not found",
      });
    });

    it("should throw 404 for student in different center", async () => {
      // Student not found in the given center
      mockDb.centerMembership.findFirst = vi.fn().mockResolvedValue(null);

      await expect(
        service.getStudentProfile("different-center", studentId),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Student not found",
      });
    });

    it("should mark sessions with no attendance record as ABSENT", async () => {
      setupProfileMocks();
      const sessionDate = new Date("2026-01-15T10:00:00Z");
      mockDb.classSession.findMany.mockResolvedValue([
        { id: "ses-no-record", classId: "c1", startTime: sessionDate },
      ]);
      mockDb.attendance.findMany.mockResolvedValue([]); // No records

      const result = await service.getStudentProfile(centerId, studentId);
      expect(result.attendanceHistory).toHaveLength(1);
      expect(result.attendanceHistory[0]!.status).toBe("ABSENT");
    });

    it("should return not-submitted for assignments without submissions", async () => {
      setupProfileMocks();
      mockDb.assignment.findMany.mockResolvedValue([
        {
          id: "a1",
          classId: "c1",
          dueDate: new Date("2026-02-01"),
          status: "OPEN",
          exercise: { title: "Writing Task 1", skill: "writing" },
          class: { name: "IELTS A" },
        },
      ]);
      // No submissions
      const mockPrisma = (service as any).prisma;
      mockPrisma.submission.findMany.mockResolvedValue([]);

      const result = await service.getStudentProfile(centerId, studentId);
      expect(result.assignmentHistory).toHaveLength(1);
      expect(result.assignmentHistory[0]!.submissionStatus).toBe(
        "not-submitted",
      );
      expect(result.assignmentHistory[0]!.score).toBeNull();
    });
  });

  describe("getStudentProfile teacher access", () => {
    const centerId = "center-1";

    const setupProfileMocks = () => {
      mockDb.centerMembership.findFirst = vi.fn().mockResolvedValue({
        id: "membership-s1",
        centerId,
        userId: "s1",
        role: "STUDENT",
        status: "ACTIVE",
        user: {
          id: "s1",
          name: "Alice",
          email: "alice@test.com",
          avatarUrl: null,
        },
      });
      mockDb.classStudent.findMany.mockResolvedValue([
        {
          classId: "c1",
          studentId: "s1",
          class: { id: "c1", name: "IELTS A" },
        },
      ]);
      mockDb.classSession.findMany.mockResolvedValue([]);
      mockDb.attendance.findMany.mockResolvedValue([]);
      mockDb.assignment.findMany.mockResolvedValue([]);
      mockDb.assignmentStudent.findMany.mockResolvedValue([]);
      const mockPrisma = (service as any).prisma;
      mockPrisma.submission.findMany.mockResolvedValue([]);
    };

    it("should succeed when teacher has access to student's class", async () => {
      setupProfileMocks();
      mockDb.classStudent.findFirst = vi.fn().mockResolvedValue({
        classId: "c1",
        studentId: "s1",
      });

      const result = await service.getStudentProfile(
        centerId,
        "s1",
        "teacher-1",
      );
      expect(result.student.id).toBe("s1");
    });

    it("should throw 403 when teacher does not have access to student", async () => {
      setupProfileMocks();
      mockDb.classStudent.findFirst = vi.fn().mockResolvedValue(null);

      await expect(
        service.getStudentProfile(centerId, "s1", "teacher-no-access"),
      ).rejects.toMatchObject({
        statusCode: 403,
        message: "You can only view students in your classes",
      });
    });
  });
});
