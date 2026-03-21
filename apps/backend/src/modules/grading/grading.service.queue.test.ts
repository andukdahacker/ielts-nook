import { vi, describe, it, expect, beforeEach } from "vitest";
import { GradingService } from "./grading.service.js";

// Mock inngest
vi.mock("../inngest/client.js", () => ({
  inngest: {
    send: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("GradingService", () => {
  let service: GradingService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockTx: any;
  const centerId = "center-123";
  const submissionId = "sub-1";
  const firebaseUid = "firebase-teacher-1";

  const mockGradingJob = {
    id: "job-1",
    centerId,
    submissionId,
    status: "pending",
    error: null,
    errorCategory: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuthAccount = {
    userId: "teacher-1",
    provider: "FIREBASE",
    providerUserId: firebaseUid,
  };

  const mockTeacherMembership = {
    role: "TEACHER",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      submission: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
        groupBy: vi.fn(),
      },
      gradingJob: {
        create: vi.fn().mockResolvedValue(mockGradingJob),
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue(mockGradingJob),
      },
      submissionFeedback: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        deleteMany: vi.fn(),
        update: vi.fn(),
      },
      authAccount: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(mockAuthAccount),
      },
      centerMembership: {
        findFirst: vi.fn().mockResolvedValue(mockTeacherMembership),
      },
      teacherComment: {
        create: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      aIFeedbackItem: {
        findFirst: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };

    mockTx = {
      aIFeedbackItem: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      submissionFeedback: { update: vi.fn() },
      submission: { update: vi.fn() },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockPrisma = {
      $extends: vi.fn().mockReturnValue(mockDb),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $transaction: vi.fn().mockImplementation(async (fn: any) => fn(mockTx)),
    } as any;
    service = new GradingService(mockPrisma);
  });

  describe("getGradingQueue", () => {
    it("should return paginated queue of Writing/Speaking submissions", async () => {
      mockDb.submission.findMany.mockResolvedValue([
        {
          id: submissionId,
          status: "SUBMITTED",
          submittedAt: new Date("2026-02-16"),
          isPriority: false,
          student: { name: "Student A" },
          assignment: { id: "asn-1", dueDate: null, classId: "class-1", class: { name: "Class A" }, exercise: { title: "Essay 1", skill: "WRITING" } },
          gradingJob: { status: "completed", error: null, errorCategory: null },
          feedback: { items: [] },
          _count: { teacherComments: 0 },
        },
      ]);

      const result = await service.getGradingQueue(centerId, firebaseUid, {
        page: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.analysisStatus).toBe("ready");
      expect(result.items[0]!.studentName).toBe("Student A");
      expect(result.total).toBe(1);
    });

    it("should filter by analysis status with correct total", async () => {
      mockDb.submission.findMany.mockResolvedValue([
        {
          id: "sub-1",
          status: "SUBMITTED",
          submittedAt: new Date(),
          isPriority: false,
          student: { name: "A" },
          assignment: { id: "asn-1", dueDate: null, classId: "class-1", class: { name: "C1" }, exercise: { title: "E1", skill: "WRITING" } },
          gradingJob: { status: "completed", error: null, errorCategory: null },
          feedback: { items: [] },
          _count: { teacherComments: 0 },
        },
        {
          id: "sub-2",
          status: "SUBMITTED",
          submittedAt: new Date(),
          isPriority: false,
          student: { name: "B" },
          assignment: { id: "asn-2", dueDate: null, classId: "class-1", class: { name: "C1" }, exercise: { title: "E2", skill: "WRITING" } },
          gradingJob: { status: "failed", error: "timeout", errorCategory: null },
          feedback: { items: [] },
          _count: { teacherComments: 0 },
        },
      ]);

      const result = await service.getGradingQueue(centerId, firebaseUid, {
        page: 1,
        limit: 20,
        status: "failed",
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.analysisStatus).toBe("failed");
      expect(result.total).toBe(1);
    });

    // --- Story 5-5: gradingStatus derivation tests ---

    // Helper to build a queue submission mock with all required fields
    function makeQueueSubmission(overrides: Record<string, unknown> = {}) {
      return {
        id: "sub-1",
        status: "SUBMITTED",
        submittedAt: new Date("2026-02-16"),
        isPriority: false,
        student: { name: "Student A" },
        assignment: {
          id: "asn-1",
          title: "Assignment Title",
          dueDate: new Date("2026-03-01"),
          classId: "class-1",
          class: { name: "Class A" },
          exercise: { title: "Essay 1", skill: "WRITING" },
        },
        gradingJob: { status: "completed", error: null, errorCategory: null },
        feedback: { items: [] },
        _count: { teacherComments: 0 },
        ...overrides,
      };
    }

    it("should derive gradingStatus 'graded' when submission.status is GRADED", async () => {
      mockDb.submission.findMany.mockResolvedValue([
        makeQueueSubmission({
          id: "sub-graded",
          status: "GRADED",
          gradingJob: { status: "completed", error: null, errorCategory: null },
        }),
      ]);

      const result = await service.getGradingQueue(centerId, firebaseUid, { page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.gradingStatus).toBe("graded");
    });

    it("should derive gradingStatus 'pending_ai' when gradingJob.status is null, pending, processing, or failed", async () => {
      mockDb.submission.findMany.mockResolvedValue([
        makeQueueSubmission({ id: "sub-no-job", gradingJob: null }),
        makeQueueSubmission({ id: "sub-pending", gradingJob: { status: "pending", error: null, errorCategory: null } }),
        makeQueueSubmission({ id: "sub-processing", gradingJob: { status: "processing", error: null, errorCategory: null } }),
        makeQueueSubmission({ id: "sub-failed", gradingJob: { status: "failed", error: "timeout", errorCategory: null } }),
      ]);

      const result = await service.getGradingQueue(centerId, firebaseUid, { page: 1, limit: 20 });

      const statuses = result.items.map((i) => ({ id: i.submissionId, gs: i.gradingStatus }));
      expect(statuses).toEqual([
        { id: "sub-no-job", gs: "pending_ai" },
        { id: "sub-pending", gs: "pending_ai" },
        { id: "sub-processing", gs: "pending_ai" },
        { id: "sub-failed", gs: "pending_ai" },
      ]);
    });

    it("should derive gradingStatus 'ready' when AI completed and no teacher actions", async () => {
      mockDb.submission.findMany.mockResolvedValue([
        makeQueueSubmission({
          id: "sub-ready",
          gradingJob: { status: "completed", error: null, errorCategory: null },
          feedback: { items: [] },
          _count: { teacherComments: 0 },
        }),
      ]);

      const result = await service.getGradingQueue(centerId, firebaseUid, { page: 1, limit: 20 });

      expect(result.items[0]!.gradingStatus).toBe("ready");
    });

    it("should derive gradingStatus 'in_progress' when AI completed and has teacher actions", async () => {
      mockDb.submission.findMany.mockResolvedValue([
        // Has approved feedback item (isApproved not null)
        makeQueueSubmission({
          id: "sub-approved",
          gradingJob: { status: "completed", error: null, errorCategory: null },
          feedback: { items: [{ id: "item-1" }] },
          _count: { teacherComments: 0 },
        }),
        // Has teacher comment
        makeQueueSubmission({
          id: "sub-commented",
          gradingJob: { status: "completed", error: null, errorCategory: null },
          feedback: { items: [] },
          _count: { teacherComments: 2 },
        }),
      ]);

      const result = await service.getGradingQueue(centerId, firebaseUid, { page: 1, limit: 20 });

      expect(result.items[0]!.gradingStatus).toBe("in_progress");
      expect(result.items[1]!.gradingStatus).toBe("in_progress");
    });

    // --- Story 5-5: sorting tests ---

    it("should sort priority items first, then by submittedAt", async () => {
      const earlier = new Date("2026-02-10");
      const later = new Date("2026-02-15");

      mockDb.submission.findMany.mockResolvedValue([
        makeQueueSubmission({ id: "sub-normal-early", isPriority: false, submittedAt: earlier, student: { name: "Alice" } }),
        makeQueueSubmission({ id: "sub-normal-late", isPriority: false, submittedAt: later, student: { name: "Bob" } }),
        makeQueueSubmission({ id: "sub-priority-late", isPriority: true, submittedAt: later, student: { name: "Charlie" } }),
        makeQueueSubmission({ id: "sub-priority-early", isPriority: true, submittedAt: earlier, student: { name: "Diana" } }),
      ]);

      const result = await service.getGradingQueue(centerId, firebaseUid, {
        page: 1,
        limit: 20,
        sortBy: "submittedAt",
        sortOrder: "asc",
      });

      const ids = result.items.map((i) => i.submissionId);
      // Priority items first (sorted by submittedAt asc), then non-priority (sorted by submittedAt asc)
      expect(ids).toEqual([
        "sub-priority-early",
        "sub-priority-late",
        "sub-normal-early",
        "sub-normal-late",
      ]);
    });

    it("should sort by dueDate asc with nulls last", async () => {
      mockDb.submission.findMany.mockResolvedValue([
        makeQueueSubmission({ id: "sub-no-due", assignment: { ...makeQueueSubmission().assignment, dueDate: null } }),
        makeQueueSubmission({ id: "sub-late-due", assignment: { ...makeQueueSubmission().assignment, dueDate: new Date("2026-04-01") } }),
        makeQueueSubmission({ id: "sub-early-due", assignment: { ...makeQueueSubmission().assignment, dueDate: new Date("2026-02-01") } }),
      ]);

      const result = await service.getGradingQueue(centerId, firebaseUid, {
        page: 1,
        limit: 20,
        sortBy: "dueDate",
        sortOrder: "asc",
      });

      const ids = result.items.map((i) => i.submissionId);
      // Earliest due first, nulls last
      expect(ids).toEqual(["sub-early-due", "sub-late-due", "sub-no-due"]);
    });

    it("should sort by studentName asc", async () => {
      mockDb.submission.findMany.mockResolvedValue([
        makeQueueSubmission({ id: "sub-charlie", student: { name: "Charlie" } }),
        makeQueueSubmission({ id: "sub-alice", student: { name: "Alice" } }),
        makeQueueSubmission({ id: "sub-bob", student: { name: "Bob" } }),
      ]);

      const result = await service.getGradingQueue(centerId, firebaseUid, {
        page: 1,
        limit: 20,
        sortBy: "studentName",
        sortOrder: "asc",
      });

      const ids = result.items.map((i) => i.submissionId);
      expect(ids).toEqual(["sub-alice", "sub-bob", "sub-charlie"]);
    });

    it("should sort by submittedAt desc", async () => {
      const earlier = new Date("2026-02-10");
      const later = new Date("2026-02-15");

      mockDb.submission.findMany.mockResolvedValue([
        makeQueueSubmission({ id: "sub-early", submittedAt: earlier }),
        makeQueueSubmission({ id: "sub-late", submittedAt: later }),
      ]);

      const result = await service.getGradingQueue(centerId, firebaseUid, {
        page: 1,
        limit: 20,
        sortBy: "submittedAt",
        sortOrder: "desc",
      });

      const ids = result.items.map((i) => i.submissionId);
      // desc: latest first
      expect(ids).toEqual(["sub-late", "sub-early"]);
    });

    // --- Story 5-5: gradingStatus filter test ---

    it("should filter items by gradingStatus", async () => {
      mockDb.submission.findMany.mockResolvedValue([
        makeQueueSubmission({
          id: "sub-ready",
          gradingJob: { status: "completed", error: null, errorCategory: null },
          feedback: { items: [] },
          _count: { teacherComments: 0 },
        }),
        makeQueueSubmission({
          id: "sub-in-progress",
          gradingJob: { status: "completed", error: null, errorCategory: null },
          feedback: { items: [{ id: "item-1" }] },
          _count: { teacherComments: 0 },
        }),
        makeQueueSubmission({
          id: "sub-pending",
          gradingJob: { status: "pending", error: null, errorCategory: null },
        }),
      ]);

      const result = await service.getGradingQueue(centerId, firebaseUid, {
        page: 1,
        limit: 20,
        gradingStatus: "ready",
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.submissionId).toBe("sub-ready");
      expect(result.items[0]!.gradingStatus).toBe("ready");
      expect(result.total).toBe(1);
    });

    // --- Story 5-5: progress computation tests ---

    it("should compute progress when assignmentId filter is set", async () => {
      mockDb.submission.findMany.mockResolvedValue([
        makeQueueSubmission({ id: "sub-1" }),
      ]);
      mockDb.submission.groupBy.mockResolvedValue([
        { status: "SUBMITTED", _count: { id: 3 } },
        { status: "GRADED", _count: { id: 2 } },
      ]);

      const result = await service.getGradingQueue(centerId, firebaseUid, {
        page: 1,
        limit: 20,
        assignmentId: "asn-1",
      });

      expect(result.progress).toEqual({ graded: 2, total: 5 });
    });

    it("should return progress as null when no assignmentId filter", async () => {
      mockDb.submission.findMany.mockResolvedValue([
        makeQueueSubmission({ id: "sub-1" }),
      ]);

      const result = await service.getGradingQueue(centerId, firebaseUid, {
        page: 1,
        limit: 20,
      });

      expect(result.progress).toBeNull();
    });
  });

  // --- Story 5-5: togglePriority tests ---

  describe("togglePriority", () => {
    const mockSubmissionForPriority = {
      id: submissionId,
      centerId,
      isPriority: false,
      assignment: {
        class: { teacherId: "teacher-1" },
      },
    };

    it("should toggle priority on (isPriority = true)", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmissionForPriority);
      mockDb.submission.update.mockResolvedValue({ ...mockSubmissionForPriority, isPriority: true });

      const result = await service.togglePriority(centerId, submissionId, firebaseUid, true);

      expect(result).toEqual({ submissionId, isPriority: true });
      expect(mockDb.submission.update).toHaveBeenCalledWith({
        where: { id: submissionId },
        data: { isPriority: true },
      });
    });

    it("should toggle priority off (isPriority = false)", async () => {
      mockDb.submission.findUnique.mockResolvedValue({ ...mockSubmissionForPriority, isPriority: true });
      mockDb.submission.update.mockResolvedValue({ ...mockSubmissionForPriority, isPriority: false });

      const result = await service.togglePriority(centerId, submissionId, firebaseUid, false);

      expect(result).toEqual({ submissionId, isPriority: false });
      expect(mockDb.submission.update).toHaveBeenCalledWith({
        where: { id: submissionId },
        data: { isPriority: false },
      });
    });

    it("should throw forbidden when verifyAccess fails", async () => {
      mockDb.submission.findUnique.mockResolvedValue({
        ...mockSubmissionForPriority,
        assignment: { class: { teacherId: "other-teacher" } },
      });
      // Teacher role cannot access other teacher's class
      mockDb.centerMembership.findFirst.mockResolvedValue({ role: "TEACHER" });

      await expect(
        service.togglePriority(centerId, submissionId, firebaseUid, true),
      ).rejects.toThrow("You can only access submissions from your classes");
    });

    it("should throw 404 when submission does not exist", async () => {
      mockDb.submission.findUnique.mockResolvedValue(null);

      await expect(
        service.togglePriority(centerId, submissionId, firebaseUid, true),
      ).rejects.toThrow("Submission not found");
    });
  });
});
