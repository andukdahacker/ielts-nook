import { describe, expect, it, vi, beforeEach } from "vitest";
import { StudentHealthService } from "./student-health.service.js";

vi.mock("../inngest/client.js", () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}));

describe("StudentHealthService - Flags & At-Risk Widget", () => {
  let service: StudentHealthService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;

  const makeStudent = (id: string, name: string) => ({
    user: { id, name, email: `${id}@test.com`, avatarUrl: null },
    id: `membership-${id}`,
    centerId: "center-1",
    userId: id,
    role: "STUDENT",
    status: "ACTIVE",
  });

  const makeEnrollment = (
    studentId: string,
    classId: string,
    className: string,
  ) => ({
    classId,
    studentId,
    centerId: "center-1",
    class: { id: classId, name: className },
  });

  const makeSession = (id: string, classId: string) => ({
    id,
    classId,
  });

  const makeAttendance = (
    studentId: string,
    sessionId: string,
    status: string,
  ) => ({
    studentId,
    sessionId,
    status,
  });

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

  describe("getDashboard teacher scoping", () => {
    it("should return only students in teacher's classes when teacherUserId provided", async () => {
      const s1 = makeStudent("s1", "Alice");
      const s2 = makeStudent("s2", "Bob");
      mockDb.centerMembership.findMany.mockResolvedValue([s1, s2]);
      // Teacher teaches class c1 only
      mockDb.class = {
        findMany: vi.fn().mockResolvedValue([{ id: "c1" }]),
      };
      // s1 in c1, s2 in c2
      mockDb.classStudent.findMany.mockResolvedValue([
        makeEnrollment("s1", "c1", "Class A"),
      ]);

      const result = await service.getDashboard(
        "center-1",
        {},
        "teacher-1",
      );
      expect(result.students).toHaveLength(1);
      expect(result.students[0]!.id).toBe("s1");
    });

    it("should return intersection of teacher classes and classId filter", async () => {
      const s1 = makeStudent("s1", "Alice");
      mockDb.centerMembership.findMany.mockResolvedValue([s1]);
      // Teacher teaches c1 and c2
      mockDb.class = {
        findMany: vi.fn().mockResolvedValue([{ id: "c1" }, { id: "c2" }]),
      };
      mockDb.classStudent.findMany.mockResolvedValue([
        makeEnrollment("s1", "c1", "Class A"),
      ]);

      const result = await service.getDashboard(
        "center-1",
        { classId: "c1" },
        "teacher-1",
      );
      expect(result.students).toHaveLength(1);
    });

    it("should return empty when teacher has no classes", async () => {
      mockDb.class = {
        findMany: vi.fn().mockResolvedValue([]),
      };

      const result = await service.getDashboard(
        "center-1",
        {},
        "teacher-no-classes",
      );
      expect(result.students).toEqual([]);
      expect(result.summary.total).toBe(0);
    });
  });

  describe("getTeacherAtRiskWidget", () => {
    it("should return at-risk/warning students limited to 6", async () => {
      // Setup teacher with classes
      mockDb.class = {
        findMany: vi.fn().mockResolvedValue([
          { id: "c1", name: "Class A" },
        ]),
      };
      // Create 8 students - some at risk
      const students = Array.from({ length: 8 }, (_, i) =>
        makeStudent(`s${i}`, `Student ${i}`),
      );
      mockDb.centerMembership.findMany.mockResolvedValue(students);
      mockDb.classStudent.findMany.mockResolvedValue(
        students.map((s) => makeEnrollment(s.user.id, "c1", "Class A")),
      );
      // All students have bad attendance (at-risk)
      mockDb.classSession.findMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => makeSession(`ses-${i}`, "c1")),
      );
      mockDb.attendance.findMany.mockResolvedValue(
        // Each student attended only 5/10 sessions = 50%
        students.flatMap((s) =>
          Array.from({ length: 5 }, (_, i) =>
            makeAttendance(s.user.id, `ses-${i}`, "PRESENT"),
          ),
        ),
      );

      const result = await service.getTeacherAtRiskWidget(
        "center-1",
        "teacher-1",
      );
      expect(result.students.length).toBeLessThanOrEqual(6);
      expect(
        result.students.every(
          (s) =>
            s.healthStatus === "at-risk" || s.healthStatus === "warning",
        ),
      ).toBe(true);
    });

    it("should return empty students array when all on-track", async () => {
      mockDb.class = {
        findMany: vi.fn().mockResolvedValue([
          { id: "c1", name: "Class A" },
        ]),
      };
      const student = makeStudent("s1", "Alice");
      mockDb.centerMembership.findMany.mockResolvedValue([student]);
      mockDb.classStudent.findMany.mockResolvedValue([
        makeEnrollment("s1", "c1", "Class A"),
      ]);
      // Perfect attendance
      mockDb.classSession.findMany.mockResolvedValue([
        makeSession("ses-1", "c1"),
      ]);
      mockDb.attendance.findMany.mockResolvedValue([
        makeAttendance("s1", "ses-1", "PRESENT"),
      ]);

      const result = await service.getTeacherAtRiskWidget(
        "center-1",
        "teacher-1",
      );
      expect(result.students).toHaveLength(0);
    });
  });

  describe("createFlag", () => {
    const centerId = "center-1";

    beforeEach(() => {
      mockDb.centerMembership.findFirst = vi.fn().mockResolvedValue({
        id: "membership-s1",
        centerId,
        userId: "s1",
        role: "STUDENT",
        status: "ACTIVE",
        user: { name: "Alice" },
      });
      mockDb.centerMembership.findMany.mockResolvedValue([
        { userId: "admin-1" },
      ]);
      mockDb.studentFlag = {
        create: vi.fn().mockResolvedValue({ id: "flag-1" }),
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
        update: vi.fn(),
      };
      mockDb.notification = {
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      };
      const mockPrisma = (service as any).prisma;
      mockPrisma.user = {
        findUnique: vi
          .fn()
          .mockResolvedValue({ name: "Teacher Smith" }),
      };
    });

    it("should create flag and notification", async () => {
      const result = await service.createFlag(
        centerId,
        "s1",
        "teacher-1",
        "This student needs help",
      );
      expect(result).toMatchObject({
        flagId: "flag-1",
        status: "OPEN",
      });
      expect(mockDb.studentFlag.create).toHaveBeenCalled();
      expect(mockDb.notification.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              title: "Student Flagged",
              message: expect.stringContaining("Teacher Smith"),
            }),
          ]),
        }),
      );
    });

    it("should throw 404 for non-existent student", async () => {
      mockDb.centerMembership.findFirst = vi.fn().mockResolvedValue(null);
      await expect(
        service.createFlag(centerId, "non-existent", "teacher-1", "note here!"),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Student not found",
      });
    });

    it("should throw 403 when teacher flags student not in their class", async () => {
      mockDb.classStudent.findFirst = vi.fn().mockResolvedValue(null);
      await expect(
        service.createFlag(centerId, "s1", "teacher-1", "needs attention!", "teacher-1"),
      ).rejects.toMatchObject({
        statusCode: 403,
        message: "You can only flag students in your classes",
      });
    });

    it("should succeed when teacher flags student in their class", async () => {
      mockDb.classStudent.findFirst = vi.fn().mockResolvedValue({
        classId: "c1",
        studentId: "s1",
      });
      const result = await service.createFlag(
        centerId,
        "s1",
        "teacher-1",
        "This student needs help",
        "teacher-1",
      );
      expect(result).toMatchObject({
        flagId: "flag-1",
        status: "OPEN",
      });
    });
  });

  describe("getStudentFlags", () => {
    it("should return sorted flags list", async () => {
      mockDb.studentFlag = {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "flag-1",
            studentId: "s1",
            centerId: "center-1",
            createdById: "teacher-1",
            note: "Needs help",
            status: "OPEN",
            resolvedById: null,
            resolvedNote: null,
            createdAt: new Date("2026-02-18T10:00:00Z"),
            resolvedAt: null,
            createdBy: { name: "Teacher" },
            resolvedBy: null,
          },
        ]),
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      };

      const result = await service.getStudentFlags("center-1", "s1");
      expect(result).toHaveLength(1);
      expect(result[0]!.createdByName).toBe("Teacher");
      expect(result[0]!.status).toBe("OPEN");
    });
  });

  describe("resolveFlag", () => {
    beforeEach(() => {
      mockDb.studentFlag = {
        findFirst: vi.fn().mockResolvedValue({ id: "flag-1" }),
        update: vi.fn().mockResolvedValue({
          id: "flag-1",
          status: "RESOLVED",
        }),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
      };
    });

    it("should update flag status to RESOLVED", async () => {
      const result = await service.resolveFlag(
        "center-1",
        "flag-1",
        "admin-1",
        "Issue resolved",
      );
      expect(result).toMatchObject({
        flagId: "flag-1",
        status: "RESOLVED",
      });
      expect(mockDb.studentFlag.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "flag-1" },
          data: expect.objectContaining({
            status: "RESOLVED",
            resolvedById: "admin-1",
            resolvedNote: "Issue resolved",
          }),
        }),
      );
    });

    it("should throw 404 for non-existent flag", async () => {
      mockDb.studentFlag.findFirst = vi.fn().mockResolvedValue(null);
      await expect(
        service.resolveFlag("center-1", "non-existent", "admin-1"),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Flag not found",
      });
    });

    it("should throw 409 when flag is already resolved", async () => {
      mockDb.studentFlag.findFirst = vi.fn().mockResolvedValue({
        id: "flag-1",
        status: "RESOLVED",
      });
      await expect(
        service.resolveFlag("center-1", "flag-1", "admin-1"),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: "Flag is already resolved",
      });
    });
  });
});
