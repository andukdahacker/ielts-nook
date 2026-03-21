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
  const firebaseUid = "firebase-uid-456";
  const userId = "user-456";
  const exerciseId = "ex-1";
  const classId = "class-1";
  const assignmentId = "assign-1";

  const mockExercise = {
    id: exerciseId,
    centerId,
    title: "Reading Test 1",
    skill: "READING",
    status: "PUBLISHED",
  };

  const mockClass = {
    id: classId,
    name: "Class 10A",
    students: [
      { studentId: "student-1" },
      { studentId: "student-2" },
    ],
  };

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

  describe("listAssignments", () => {
    it("should return all assignments ordered by dueDate ASC", async () => {
      mockDb.assignment.findMany.mockResolvedValue([mockAssignment]);

      const result = await service.listAssignments(centerId);

      expect(result).toEqual([mockAssignment]);
      expect(mockDb.assignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
        }),
      );
    });

    it("should filter by status", async () => {
      mockDb.assignment.findMany.mockResolvedValue([]);

      await service.listAssignments(centerId, { status: "CLOSED" });

      expect(mockDb.assignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "CLOSED" },
        }),
      );
    });

    it("should filter by classId", async () => {
      mockDb.assignment.findMany.mockResolvedValue([]);

      await service.listAssignments(centerId, { classId });

      expect(mockDb.assignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { classId },
        }),
      );
    });

    it("should filter by exerciseId", async () => {
      mockDb.assignment.findMany.mockResolvedValue([]);

      await service.listAssignments(centerId, { exerciseId });

      expect(mockDb.assignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { exerciseId },
        }),
      );
    });

    it("should filter by skill", async () => {
      mockDb.assignment.findMany.mockResolvedValue([]);

      await service.listAssignments(centerId, { skill: "READING" });

      expect(mockDb.assignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { exercise: { skill: "READING" } },
        }),
      );
    });

    it("should filter by due date range", async () => {
      mockDb.assignment.findMany.mockResolvedValue([]);

      await service.listAssignments(centerId, {
        dueDateStart: "2026-02-01T00:00:00.000Z",
        dueDateEnd: "2026-03-01T00:00:00.000Z",
      });

      expect(mockDb.assignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            dueDate: {
              gte: new Date("2026-02-01T00:00:00.000Z"),
              lte: new Date("2026-03-01T00:00:00.000Z"),
            },
          },
        }),
      );
    });
  });

  describe("getAssignment", () => {
    it("should return assignment with student details", async () => {
      const detailedAssignment = {
        ...mockAssignment,
        studentAssignments: [
          { id: "sa-1", studentId: "student-1", student: { id: "student-1", name: "Alice", email: "alice@test.com" } },
        ],
      };
      mockDb.assignment.findUnique.mockResolvedValue(detailedAssignment);

      const result = await service.getAssignment(centerId, assignmentId);

      expect(result).toEqual(detailedAssignment);
    });

    it("should throw NotFound for invalid ID", async () => {
      mockDb.assignment.findUnique.mockResolvedValue(null);

      await expect(service.getAssignment(centerId, "invalid-id")).rejects.toThrow("Assignment not found");
    });
  });

  describe("createAssignment", () => {
    beforeEach(() => {
      mockDb.authAccount.findUniqueOrThrow.mockResolvedValue({ userId });
      mockDb.exercise.findUnique.mockResolvedValue(mockExercise);
    });

    it("should create assignment for single class and snapshot students", async () => {
      mockDb.class.findUnique.mockResolvedValue(mockClass);
      mockDb.assignment.create.mockResolvedValue({ id: "new-assign-1" });
      mockDb.assignmentStudent.createMany.mockResolvedValue({ count: 2 });
      mockDb.assignment.findFirst.mockResolvedValue(mockAssignment);

      const result = await service.createAssignment(
        centerId,
        { exerciseId, classIds: [classId], dueDate: "2026-03-01T00:00:00.000Z" },
        firebaseUid,
      );

      expect(result).toHaveLength(1);
      expect(mockDb.assignment.create).toHaveBeenCalledTimes(1);
      expect(mockDb.assignmentStudent.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ studentId: "student-1", centerId }),
          expect.objectContaining({ studentId: "student-2", centerId }),
        ]),
      });
    });

    it("should create separate assignments for multi-class (AC3)", async () => {
      const class2 = { id: "class-2", name: "Class 10B", students: [{ studentId: "student-3" }] };
      mockDb.class.findUnique
        .mockResolvedValueOnce(mockClass)
        .mockResolvedValueOnce(class2);
      mockDb.assignment.create.mockResolvedValue({ id: "new-assign" });
      mockDb.assignmentStudent.createMany.mockResolvedValue({ count: 1 });
      mockDb.assignment.findFirst
        .mockResolvedValueOnce({ ...mockAssignment, id: "assign-a" })
        .mockResolvedValueOnce({ ...mockAssignment, id: "assign-b", classId: "class-2" });

      const result = await service.createAssignment(
        centerId,
        { exerciseId, classIds: [classId, "class-2"] },
        firebaseUid,
      );

      expect(result).toHaveLength(2);
      expect(mockDb.assignment.create).toHaveBeenCalledTimes(2);
    });

    it("should create assignment for individual students (no classId)", async () => {
      mockDb.centerMembership.findFirst
        .mockResolvedValueOnce({ userId: "student-1", role: "STUDENT" })
        .mockResolvedValueOnce({ userId: "student-2", role: "STUDENT" });
      mockDb.assignment.create.mockResolvedValue({ id: "new-assign-ind" });
      mockDb.assignmentStudent.createMany.mockResolvedValue({ count: 2 });
      mockDb.assignment.findFirst.mockResolvedValue({ ...mockAssignment, classId: null });

      const result = await service.createAssignment(
        centerId,
        { exerciseId, studentIds: ["student-1", "student-2"] },
        firebaseUid,
      );

      expect(result).toHaveLength(1);
      expect(mockDb.assignmentStudent.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ studentId: "student-1" }),
          expect.objectContaining({ studentId: "student-2" }),
        ]),
      });
    });

    it("should reject invalid student ID", async () => {
      mockDb.centerMembership.findFirst.mockResolvedValue(null);

      await expect(
        service.createAssignment(centerId, { exerciseId, studentIds: ["invalid-student"] }, firebaseUid),
      ).rejects.toThrow("Student invalid-student not found");
    });

    it("should reject DRAFT exercise", async () => {
      mockDb.exercise.findUnique.mockResolvedValue({ ...mockExercise, status: "DRAFT" });

      await expect(
        service.createAssignment(centerId, { exerciseId, classIds: [classId] }, firebaseUid),
      ).rejects.toThrow("Only published exercises can be assigned");
    });

    it("should reject ARCHIVED exercise", async () => {
      mockDb.exercise.findUnique.mockResolvedValue({ ...mockExercise, status: "ARCHIVED" });

      await expect(
        service.createAssignment(centerId, { exerciseId, classIds: [classId] }, firebaseUid),
      ).rejects.toThrow("Only published exercises can be assigned");
    });

    it("should reject when no classIds or studentIds provided", async () => {
      await expect(
        service.createAssignment(centerId, { exerciseId }, firebaseUid),
      ).rejects.toThrow("At least one class or student must be specified");
    });

    it("should trigger bulk notification to students", async () => {
      mockDb.class.findUnique.mockResolvedValue(mockClass);
      mockDb.assignment.create.mockResolvedValue({ id: "new-assign" });
      mockDb.assignmentStudent.createMany.mockResolvedValue({ count: 2 });
      mockDb.assignment.findFirst.mockResolvedValue(mockAssignment);

      await service.createAssignment(
        centerId,
        { exerciseId, classIds: [classId], dueDate: "2026-03-01T00:00:00.000Z" },
        firebaseUid,
      );

      expect(mockNotificationsService.createBulkNotifications).toHaveBeenCalledWith(
        centerId,
        ["student-1", "student-2"],
        "New Assignment",
        expect.stringContaining("Reading Test 1"),
      );
    });
  });
});
