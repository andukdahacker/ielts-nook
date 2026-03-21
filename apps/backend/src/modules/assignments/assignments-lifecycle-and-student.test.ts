import { vi, describe, it, expect, beforeEach } from "vitest";
import { AssignmentsService } from "./assignments.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";

describe("AssignmentsService", () => {
  let service: AssignmentsService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPrisma: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockNotificationsService: any;

  const centerId = "center-123";
  const userId = "user-456";
  const exerciseId = "ex-1";
  const classId = "class-1";
  const assignmentId = "assign-1";

  const mockAssignment = {
    id: assignmentId,
    centerId,
    exerciseId,
    classId,
    dueDate: new Date("2026-03-01"),
    timeLimit: 3600,
    instructions: "Complete all questions",
    status: "OPEN",
    createdById: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    exercise: { id: exerciseId, title: "Reading Test 1", skill: "READING", status: "PUBLISHED" },
    class: { id: classId, name: "Class 10A" },
    createdBy: { id: userId, name: "Teacher" },
    _count: { studentAssignments: 2, submissions: 0 },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      assignment: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        groupBy: vi.fn(),
      },
      assignmentStudent: {
        createMany: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      exercise: {
        findUnique: vi.fn(),
      },
      class: {
        findUnique: vi.fn(),
      },
      authAccount: {
        findUniqueOrThrow: vi.fn(),
      },
      centerMembership: {
        findFirst: vi.fn(),
      },
      submission: {
        count: vi.fn().mockResolvedValue(0),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $transaction: vi.fn((fn: (tx: typeof mockDb) => Promise<unknown>) => fn(mockDb)),
    };

    mockPrisma = {
      $extends: vi.fn().mockReturnValue(mockDb),
    };

    mockNotificationsService = {
      createBulkNotifications: vi.fn().mockResolvedValue(2),
    };

    service = new AssignmentsService(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPrisma as any,
      mockNotificationsService as NotificationsService,
    );
  });

  describe("updateAssignment", () => {
    it("should update dueDate", async () => {
      mockDb.assignment.findUnique.mockResolvedValue(mockAssignment);
      mockDb.assignment.update.mockResolvedValue({ ...mockAssignment, dueDate: new Date("2026-04-01") });

      const result = await service.updateAssignment(centerId, assignmentId, {
        dueDate: "2026-04-01T00:00:00.000Z",
      });

      expect(mockDb.assignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dueDate: new Date("2026-04-01T00:00:00.000Z"),
          }),
        }),
      );
      expect(result).toBeDefined();
    });

    it("should update timeLimit and instructions", async () => {
      mockDb.assignment.findUnique.mockResolvedValue(mockAssignment);
      mockDb.assignment.update.mockResolvedValue({ ...mockAssignment, timeLimit: 7200, instructions: "New" });

      await service.updateAssignment(centerId, assignmentId, {
        timeLimit: 7200,
        instructions: "New",
      });

      expect(mockDb.assignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            timeLimit: 7200,
            instructions: "New",
          }),
        }),
      );
    });

    it("should reject update on ARCHIVED assignment", async () => {
      mockDb.assignment.findUnique.mockResolvedValue({ ...mockAssignment, status: "ARCHIVED" });

      await expect(
        service.updateAssignment(centerId, assignmentId, { dueDate: "2026-04-01T00:00:00.000Z" }),
      ).rejects.toThrow("Archived assignments cannot be edited");
    });
  });

  describe("closeAssignment", () => {
    it("should close OPEN assignment → CLOSED", async () => {
      mockDb.assignment.findUnique.mockResolvedValue(mockAssignment);
      mockDb.assignment.update.mockResolvedValue({ ...mockAssignment, status: "CLOSED" });

      const result = await service.closeAssignment(centerId, assignmentId);

      expect(mockDb.assignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: "CLOSED" },
        }),
      );
      expect(result.status).toBe("CLOSED");
    });

    it("should reject non-OPEN assignment", async () => {
      mockDb.assignment.findUnique.mockResolvedValue({ ...mockAssignment, status: "CLOSED" });

      await expect(
        service.closeAssignment(centerId, assignmentId),
      ).rejects.toThrow("Only open assignments can be closed");
    });
  });

  describe("reopenAssignment", () => {
    it("should reopen CLOSED → OPEN", async () => {
      mockDb.assignment.findUnique.mockResolvedValue({ ...mockAssignment, status: "CLOSED" });
      mockDb.assignment.update.mockResolvedValue({ ...mockAssignment, status: "OPEN" });

      const result = await service.reopenAssignment(centerId, assignmentId, {});

      expect(mockDb.assignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "OPEN" }),
        }),
      );
      expect(result.status).toBe("OPEN");
    });

    it("should reopen ARCHIVED → OPEN", async () => {
      mockDb.assignment.findUnique.mockResolvedValue({ ...mockAssignment, status: "ARCHIVED" });
      mockDb.assignment.update.mockResolvedValue({ ...mockAssignment, status: "OPEN" });

      const result = await service.reopenAssignment(centerId, assignmentId, {});

      expect(result.status).toBe("OPEN");
    });

    it("should reject already OPEN assignment", async () => {
      mockDb.assignment.findUnique.mockResolvedValue(mockAssignment);

      await expect(
        service.reopenAssignment(centerId, assignmentId, {}),
      ).rejects.toThrow("Assignment is already open");
    });

    it("should set new dueDate if provided", async () => {
      mockDb.assignment.findUnique.mockResolvedValue({ ...mockAssignment, status: "CLOSED" });
      mockDb.assignment.update.mockResolvedValue({ ...mockAssignment, status: "OPEN" });

      await service.reopenAssignment(centerId, assignmentId, { dueDate: "2026-05-01T00:00:00.000Z" });

      expect(mockDb.assignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dueDate: new Date("2026-05-01T00:00:00.000Z"),
          }),
        }),
      );
    });
  });

  describe("deleteAssignment", () => {
    it("should delete assignment", async () => {
      mockDb.assignment.findUnique.mockResolvedValue(mockAssignment);
      mockDb.assignment.delete.mockResolvedValue(undefined);

      await service.deleteAssignment(centerId, assignmentId);

      expect(mockDb.assignment.delete).toHaveBeenCalledWith({ where: { id: assignmentId } });
    });

    it("should throw NotFound for invalid ID", async () => {
      mockDb.assignment.findUnique.mockResolvedValue(null);

      await expect(service.deleteAssignment(centerId, "invalid-id")).rejects.toThrow("Assignment not found");
    });

    it("should reject delete when submissions exist", async () => {
      mockDb.assignment.findUnique.mockResolvedValue(mockAssignment);
      mockDb.submission.count.mockResolvedValue(2);

      await expect(service.deleteAssignment(centerId, assignmentId)).rejects.toThrow(
        "Cannot delete assignment with 2 submission(s)",
      );
    });
  });

  describe("archiveAssignment", () => {
    it("should set status to ARCHIVED", async () => {
      mockDb.assignment.findUnique.mockResolvedValue(mockAssignment);
      mockDb.assignment.update.mockResolvedValue({ ...mockAssignment, status: "ARCHIVED" });

      const result = await service.archiveAssignment(centerId, assignmentId);

      expect(mockDb.assignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: "ARCHIVED" },
        }),
      );
      expect(result.status).toBe("ARCHIVED");
    });

    it("should reject already ARCHIVED", async () => {
      mockDb.assignment.findUnique.mockResolvedValue({ ...mockAssignment, status: "ARCHIVED" });

      await expect(
        service.archiveAssignment(centerId, assignmentId),
      ).rejects.toThrow("Assignment is already archived");
    });
  });

  describe("listStudentAssignments", () => {
    const studentFirebaseUid = "student-firebase-uid-1";
    const studentUserId = "student-1";

    const mockStudentAssignment = {
      id: "sa-1",
      studentId: studentUserId,
      assignmentId: assignmentId,
      centerId,
      assignment: {
        id: assignmentId,
        centerId,
        exerciseId,
        classId,
        dueDate: new Date("2026-03-01"),
        timeLimit: 3600,
        instructions: "Complete all questions",
        status: "OPEN",
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        exercise: { id: exerciseId, title: "Reading Test 1", skill: "READING", status: "PUBLISHED" },
        class: { id: classId, name: "Class 10A" },
        createdBy: { id: userId, name: "Teacher" },
        submissions: [],
      },
    };

    beforeEach(() => {
      mockDb.authAccount.findUniqueOrThrow.mockResolvedValue({ userId: studentUserId });
    });

    it("should return only assignments for this student", async () => {
      mockDb.assignmentStudent.findMany.mockResolvedValue([mockStudentAssignment]);

      const result = await service.listStudentAssignments(centerId, studentFirebaseUid);

      const { submissions, centerId: _cid, createdById: _cbid, updatedAt: _ua, ...expectedAssignment } = mockStudentAssignment.assignment;
      expect(result).toEqual([{ ...expectedAssignment, submissionStatus: null, submissionId: null }]);
      expect(mockDb.assignmentStudent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            studentId: studentUserId,
          }),
        }),
      );
    });

    it("should return empty array for student with no assignments", async () => {
      mockDb.assignmentStudent.findMany.mockResolvedValue([]);

      const result = await service.listStudentAssignments(centerId, studentFirebaseUid);

      expect(result).toEqual([]);
    });

    it("should exclude ARCHIVED assignments by default", async () => {
      mockDb.assignmentStudent.findMany.mockResolvedValue([]);

      await service.listStudentAssignments(centerId, studentFirebaseUid);

      expect(mockDb.assignmentStudent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignment: expect.objectContaining({
              status: { not: "ARCHIVED" },
            }),
          }),
        }),
      );
    });

    it("should filter by skill", async () => {
      mockDb.assignmentStudent.findMany.mockResolvedValue([]);

      await service.listStudentAssignments(centerId, studentFirebaseUid, { skill: "READING" });

      expect(mockDb.assignmentStudent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignment: expect.objectContaining({
              exercise: { skill: "READING" },
            }),
          }),
        }),
      );
    });

    it("should filter by status (OPEN)", async () => {
      mockDb.assignmentStudent.findMany.mockResolvedValue([]);

      await service.listStudentAssignments(centerId, studentFirebaseUid, { status: "OPEN" });

      expect(mockDb.assignmentStudent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignment: expect.objectContaining({
              status: { equals: "OPEN" },
            }),
          }),
        }),
      );
    });

    it("should order by dueDate ascending", async () => {
      mockDb.assignmentStudent.findMany.mockResolvedValue([]);

      await service.listStudentAssignments(centerId, studentFirebaseUid);

      expect(mockDb.assignmentStudent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { assignment: { dueDate: "asc" } },
        }),
      );
    });

    it("should resolve Firebase UID to userId via authAccount", async () => {
      mockDb.assignmentStudent.findMany.mockResolvedValue([]);

      await service.listStudentAssignments(centerId, studentFirebaseUid);

      expect(mockDb.authAccount.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { provider_providerUserId: { provider: "FIREBASE", providerUserId: studentFirebaseUid } },
      });
    });
  });

  describe("getStudentAssignment", () => {
    const studentFirebaseUid = "student-firebase-uid-1";
    const studentUserId = "student-1";

    const mockStudentAssignmentRecord = {
      id: "sa-1",
      studentId: studentUserId,
      assignmentId,
      assignment: {
        id: assignmentId,
        centerId,
        exerciseId,
        classId,
        dueDate: new Date("2026-03-01"),
        timeLimit: 3600,
        instructions: "Complete all questions",
        status: "OPEN",
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        exercise: { id: exerciseId, title: "Reading Test 1", skill: "READING", status: "PUBLISHED" },
        class: { id: classId, name: "Class 10A" },
        createdBy: { id: userId, name: "Teacher" },
        submissions: [],
      },
    };

    beforeEach(() => {
      mockDb.authAccount.findUniqueOrThrow.mockResolvedValue({ userId: studentUserId });
    });

    it("should return assignment when student is assigned", async () => {
      mockDb.assignmentStudent.findFirst.mockResolvedValue(mockStudentAssignmentRecord);

      const result = await service.getStudentAssignment(centerId, assignmentId, studentFirebaseUid);

      const { submissions, centerId: _cid, createdById: _cbid, updatedAt: _ua, ...expectedAssignment } = mockStudentAssignmentRecord.assignment;
      expect(result).toEqual({ ...expectedAssignment, submissionStatus: null, submissionId: null });
    });

    it("should throw NotFound when student is NOT assigned", async () => {
      mockDb.assignmentStudent.findFirst.mockResolvedValue(null);

      await expect(
        service.getStudentAssignment(centerId, assignmentId, studentFirebaseUid),
      ).rejects.toThrow("Assignment not found");
    });

    it("should throw NotFound for non-existent assignment ID", async () => {
      mockDb.assignmentStudent.findFirst.mockResolvedValue(null);

      await expect(
        service.getStudentAssignment(centerId, "non-existent-id", studentFirebaseUid),
      ).rejects.toThrow("Assignment not found");
    });
  });

  describe("getAssignmentCountsByExercise", () => {
    it("should return correct counts grouped by exerciseId", async () => {
      mockDb.assignment.groupBy.mockResolvedValue([
        { exerciseId: "ex-1", _count: { id: 3 } },
        { exerciseId: "ex-2", _count: { id: 1 } },
      ]);

      const result = await service.getAssignmentCountsByExercise(centerId, ["ex-1", "ex-2"]);

      expect(result).toEqual([
        { exerciseId: "ex-1", count: 3 },
        { exerciseId: "ex-2", count: 1 },
      ]);
    });

    it("should return empty array for exercises with no assignments", async () => {
      mockDb.assignment.groupBy.mockResolvedValue([]);

      const result = await service.getAssignmentCountsByExercise(centerId, ["ex-99"]);

      expect(result).toEqual([]);
    });
  });
});
