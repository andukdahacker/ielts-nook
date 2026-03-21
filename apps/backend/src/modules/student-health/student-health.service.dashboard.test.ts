import { describe, expect, it, vi, beforeEach } from "vitest";
import { StudentHealthService } from "./student-health.service.js";

vi.mock("../inngest/client.js", () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}));

describe("StudentHealthService - Dashboard", () => {
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

  const makeAssignment = (
    id: string,
    classId: string | null,
    dueDate?: Date,
  ) => ({
    id,
    classId,
    dueDate: dueDate ?? null,
  });

  const makeSubmission = (studentId: string, assignmentId: string) => ({
    studentId,
    assignmentId,
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

  describe("Attendance thresholds", () => {
    it("should return at-risk when attendance < 80%", async () => {
      const student = makeStudent("s1", "Alice");
      mockDb.centerMembership.findMany.mockResolvedValue([student]);
      mockDb.classStudent.findMany.mockResolvedValue([
        makeEnrollment("s1", "c1", "Class A"),
      ]);
      // 7 sessions, 5 attended = 71.4%
      mockDb.classSession.findMany.mockResolvedValue(
        Array.from({ length: 7 }, (_, i) => makeSession(`ses-${i}`, "c1")),
      );
      mockDb.attendance.findMany.mockResolvedValue(
        Array.from({ length: 5 }, (_, i) =>
          makeAttendance("s1", `ses-${i}`, "PRESENT"),
        ),
      );

      const result = await service.getDashboard("center-1", {});
      expect(result.students[0]!.metrics.attendanceStatus).toBe("at-risk");
    });

    it("should return warning when attendance is 80-90%", async () => {
      const student = makeStudent("s1", "Bob");
      mockDb.centerMembership.findMany.mockResolvedValue([student]);
      mockDb.classStudent.findMany.mockResolvedValue([
        makeEnrollment("s1", "c1", "Class A"),
      ]);
      // 10 sessions, 8 attended = 80%
      mockDb.classSession.findMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => makeSession(`ses-${i}`, "c1")),
      );
      mockDb.attendance.findMany.mockResolvedValue(
        Array.from({ length: 8 }, (_, i) =>
          makeAttendance("s1", `ses-${i}`, "PRESENT"),
        ),
      );

      const result = await service.getDashboard("center-1", {});
      expect(result.students[0]!.metrics.attendanceStatus).toBe("warning");
    });

    it("should return on-track when attendance > 90%", async () => {
      const student = makeStudent("s1", "Charlie");
      mockDb.centerMembership.findMany.mockResolvedValue([student]);
      mockDb.classStudent.findMany.mockResolvedValue([
        makeEnrollment("s1", "c1", "Class A"),
      ]);
      // 10 sessions, 10 attended = 100%
      mockDb.classSession.findMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => makeSession(`ses-${i}`, "c1")),
      );
      mockDb.attendance.findMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) =>
          makeAttendance("s1", `ses-${i}`, "PRESENT"),
        ),
      );

      const result = await service.getDashboard("center-1", {});
      expect(result.students[0]!.metrics.attendanceStatus).toBe("on-track");
    });
  });

  describe("Assignment completion thresholds", () => {
    it("should return at-risk when completion < 50%", async () => {
      const student = makeStudent("s1", "Alice");
      mockDb.centerMembership.findMany.mockResolvedValue([student]);
      mockDb.classStudent.findMany.mockResolvedValue([
        makeEnrollment("s1", "c1", "Class A"),
      ]);
      mockDb.assignment.findMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => makeAssignment(`a-${i}`, "c1")),
      );
      // 4/10 = 40%
      const mockPrisma = (service as any).prisma;
      mockPrisma.submission.findMany.mockResolvedValue(
        Array.from({ length: 4 }, (_, i) => makeSubmission("s1", `a-${i}`)),
      );

      const result = await service.getDashboard("center-1", {});
      expect(result.students[0]!.metrics.assignmentStatus).toBe("at-risk");
    });

    it("should return warning when completion is 50-75%", async () => {
      const student = makeStudent("s1", "Bob");
      mockDb.centerMembership.findMany.mockResolvedValue([student]);
      mockDb.classStudent.findMany.mockResolvedValue([
        makeEnrollment("s1", "c1", "Class A"),
      ]);
      mockDb.assignment.findMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => makeAssignment(`a-${i}`, "c1")),
      );
      // 6/10 = 60%
      const mockPrisma = (service as any).prisma;
      mockPrisma.submission.findMany.mockResolvedValue(
        Array.from({ length: 6 }, (_, i) => makeSubmission("s1", `a-${i}`)),
      );

      const result = await service.getDashboard("center-1", {});
      expect(result.students[0]!.metrics.assignmentStatus).toBe("warning");
    });

    it("should return on-track when completion > 75%", async () => {
      const student = makeStudent("s1", "Charlie");
      mockDb.centerMembership.findMany.mockResolvedValue([student]);
      mockDb.classStudent.findMany.mockResolvedValue([
        makeEnrollment("s1", "c1", "Class A"),
      ]);
      mockDb.assignment.findMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => makeAssignment(`a-${i}`, "c1")),
      );
      // 8/10 = 80%
      const mockPrisma = (service as any).prisma;
      mockPrisma.submission.findMany.mockResolvedValue(
        Array.from({ length: 8 }, (_, i) => makeSubmission("s1", `a-${i}`)),
      );

      const result = await service.getDashboard("center-1", {});
      expect(result.students[0]!.metrics.assignmentStatus).toBe("on-track");
    });
  });

  describe("Overall status (worst of both)", () => {
    const setupStudentWithMetrics = (
      attendanceCount: number,
      totalSessions: number,
      completedAssignments: number,
      totalAssignments: number,
    ) => {
      const student = makeStudent("s1", "Alice");
      mockDb.centerMembership.findMany.mockResolvedValue([student]);
      mockDb.classStudent.findMany.mockResolvedValue([
        makeEnrollment("s1", "c1", "Class A"),
      ]);
      mockDb.classSession.findMany.mockResolvedValue(
        Array.from({ length: totalSessions }, (_, i) =>
          makeSession(`ses-${i}`, "c1"),
        ),
      );
      mockDb.attendance.findMany.mockResolvedValue(
        Array.from({ length: attendanceCount }, (_, i) =>
          makeAttendance("s1", `ses-${i}`, "PRESENT"),
        ),
      );
      mockDb.assignment.findMany.mockResolvedValue(
        Array.from({ length: totalAssignments }, (_, i) =>
          makeAssignment(`a-${i}`, "c1"),
        ),
      );
      const mockPrisma = (service as any).prisma;
      mockPrisma.submission.findMany.mockResolvedValue(
        Array.from({ length: completedAssignments }, (_, i) =>
          makeSubmission("s1", `a-${i}`),
        ),
      );
    };

    it("should return at-risk when attendance is red and assignments green", async () => {
      // attendance: 5/10=50% (at-risk), assignments: 8/10=80% (on-track)
      setupStudentWithMetrics(5, 10, 8, 10);
      const result = await service.getDashboard("center-1", {});
      expect(result.students[0]!.healthStatus).toBe("at-risk");
    });

    it("should return warning when attendance is green and assignments yellow", async () => {
      // attendance: 10/10=100% (on-track), assignments: 6/10=60% (warning)
      setupStudentWithMetrics(10, 10, 6, 10);
      const result = await service.getDashboard("center-1", {});
      expect(result.students[0]!.healthStatus).toBe("warning");
    });

    it("should return on-track when both metrics are green", async () => {
      // attendance: 10/10=100% (on-track), assignments: 8/10=80% (on-track)
      setupStudentWithMetrics(10, 10, 8, 10);
      const result = await service.getDashboard("center-1", {});
      expect(result.students[0]!.healthStatus).toBe("on-track");
    });
  });

  it("should default to on-track when no data exists", async () => {
    const student = makeStudent("s1", "Alice");
    mockDb.centerMembership.findMany.mockResolvedValue([student]);

    const result = await service.getDashboard("center-1", {});
    expect(result.students[0]!.healthStatus).toBe("on-track");
    expect(result.students[0]!.metrics.attendanceRate).toBe(100);
    expect(result.students[0]!.metrics.assignmentCompletionRate).toBe(100);
  });

  it("should filter students by classId", async () => {
    const s1 = makeStudent("s1", "Alice");
    const s2 = makeStudent("s2", "Bob");
    mockDb.centerMembership.findMany.mockResolvedValue([s1, s2]);
    // Only s1 is enrolled in c1
    mockDb.classStudent.findMany.mockResolvedValue([
      makeEnrollment("s1", "c1", "Class A"),
    ]);

    const result = await service.getDashboard("center-1", { classId: "c1" });
    expect(result.students).toHaveLength(1);
    expect(result.students[0]!.id).toBe("s1");
  });

  it("should filter students by search name", async () => {
    const student = makeStudent("s1", "Alice");
    mockDb.centerMembership.findMany.mockResolvedValue([student]);

    await service.getDashboard("center-1", { search: "Alice" });

    expect(mockDb.centerMembership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          user: { name: { contains: "Alice", mode: "insensitive" } },
        }),
      }),
    );
  });

  it("should compute correct summary counts", async () => {
    const s1 = makeStudent("s1", "Alice");
    const s2 = makeStudent("s2", "Bob");
    const s3 = makeStudent("s3", "Charlie");
    mockDb.centerMembership.findMany.mockResolvedValue([s1, s2, s3]);
    mockDb.classStudent.findMany.mockResolvedValue([
      makeEnrollment("s1", "c1", "Class A"),
      makeEnrollment("s2", "c1", "Class A"),
      makeEnrollment("s3", "c1", "Class A"),
    ]);

    // s1: 5/10 sessions = 50% (at-risk)
    // s2: 8/10 sessions = 80% (warning)
    // s3: 10/10 sessions = 100% (on-track)
    mockDb.classSession.findMany.mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => makeSession(`ses-${i}`, "c1")),
    );
    mockDb.attendance.findMany.mockResolvedValue([
      ...Array.from({ length: 5 }, (_, i) =>
        makeAttendance("s1", `ses-${i}`, "PRESENT"),
      ),
      ...Array.from({ length: 8 }, (_, i) =>
        makeAttendance("s2", `ses-${i}`, "PRESENT"),
      ),
      ...Array.from({ length: 10 }, (_, i) =>
        makeAttendance("s3", `ses-${i}`, "PRESENT"),
      ),
    ]);

    const result = await service.getDashboard("center-1", {});
    expect(result.summary).toEqual({
      total: 3,
      atRisk: 1,
      warning: 1,
      onTrack: 1,
    });
  });

  it("should query only ACTIVE students, excluding deactivated", async () => {
    // The service filters at the database query level via status: 'ACTIVE'.
    // Only active students are returned by the query; deactivated users
    // are never fetched, so they never appear in results.
    const active = makeStudent("s1", "Alice");
    mockDb.centerMembership.findMany.mockResolvedValue([active]);

    const result = await service.getDashboard("center-1", {});
    expect(result.students).toHaveLength(1);
    expect(result.students[0]!.id).toBe("s1");

    // Verify the query filters by both STUDENT role and ACTIVE status
    expect(mockDb.centerMembership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: "STUDENT",
          status: "ACTIVE",
        }),
      }),
    );
  });

});
