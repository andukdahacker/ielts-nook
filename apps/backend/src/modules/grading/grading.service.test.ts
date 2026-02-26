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

  const mockSubmission = {
    id: submissionId,
    centerId,
    assignmentId: "assign-1",
    studentId: "student-1",
    status: "SUBMITTED",
    submittedAt: new Date(),
    assignment: {
      exercise: { skill: "WRITING", title: "Essay Test" },
      class: { id: "class-1", name: "IELTS A", teacherId: "teacher-1" },
    },
    answers: [],
  };

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

  const mockFeedback = {
    id: "fb-1",
    centerId,
    submissionId,
    overallScore: 6.5,
    criteriaScores: { taskAchievement: 6.0, coherence: 7.0, lexicalResource: 6.5, grammaticalRange: 6.5 },
    generalFeedback: "Good essay with room for improvement.",
    teacherFinalScore: null,
    teacherCriteriaScores: null,
    teacherGeneralFeedback: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: "item-1",
        centerId,
        submissionFeedbackId: "fb-1",
        type: "grammar",
        content: "Subject-verb agreement error",
        startOffset: 10,
        endOffset: 20,
        originalContextSnippet: "the students was",
        suggestedFix: "were",
        severity: "error",
        confidence: 0.95,
        isApproved: null,
        approvedAt: null,
        teacherOverrideText: null,
        createdAt: new Date(),
      },
    ],
  };

  const mockAuthAccount = {
    userId: "teacher-1",
    provider: "FIREBASE",
    providerUserId: firebaseUid,
  };

  const mockTeacherMembership = {
    role: "TEACHER",
  };

  const mockAdminMembership = {
    role: "ADMIN",
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

  describe("triggerAnalysis", () => {
    it("should create grading job and send inngest event for Writing submission", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.gradingJob.findUnique.mockResolvedValue(null);

      const { inngest } = await import("../inngest/client.js");
      const result = await service.triggerAnalysis(centerId, submissionId, firebaseUid);

      expect(result).toEqual(mockGradingJob);
      expect(mockDb.gradingJob.create).toHaveBeenCalledWith({
        data: { centerId, submissionId, status: "pending" },
      });
      expect(inngest.send).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "grading/analyze-submission",
          data: { jobId: mockGradingJob.id, submissionId, centerId },
        }),
      );
    });

    it("should update existing grading job on retrigger", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.gradingJob.findUnique.mockResolvedValue(mockGradingJob);

      await service.triggerAnalysis(centerId, submissionId, firebaseUid);

      expect(mockDb.gradingJob.update).toHaveBeenCalledWith({
        where: { id: mockGradingJob.id },
        data: { status: "pending", error: null, errorCategory: null },
      });
      expect(mockDb.gradingJob.create).not.toHaveBeenCalled();
    });

    it("should throw if submission not found", async () => {
      mockDb.submission.findUnique.mockResolvedValue(null);

      await expect(
        service.triggerAnalysis(centerId, submissionId, firebaseUid),
      ).rejects.toThrow("Submission not found");
    });

    it("should throw for Reading submission (not AI-gradable)", async () => {
      mockDb.submission.findUnique.mockResolvedValue({
        ...mockSubmission,
        assignment: {
          exercise: { skill: "READING" },
          class: { teacherId: "teacher-1" },
        },
      });

      await expect(
        service.triggerAnalysis(centerId, submissionId, firebaseUid),
      ).rejects.toThrow("AI analysis is only available for Writing and Speaking");
    });

    it("should throw if submission is not SUBMITTED", async () => {
      mockDb.submission.findUnique.mockResolvedValue({
        ...mockSubmission,
        status: "IN_PROGRESS",
      });

      await expect(
        service.triggerAnalysis(centerId, submissionId, firebaseUid),
      ).rejects.toThrow("Submission must be in SUBMITTED status");
    });

    it("should throw forbidden when teacher does not teach the class", async () => {
      mockDb.submission.findUnique.mockResolvedValue({
        ...mockSubmission,
        assignment: {
          exercise: { skill: "WRITING" },
          class: { teacherId: "other-teacher" },
        },
      });

      await expect(
        service.triggerAnalysis(centerId, submissionId, firebaseUid),
      ).rejects.toThrow("You can only access submissions from your classes");
    });

    it("should allow ADMIN to access submissions from any class", async () => {
      mockDb.submission.findUnique.mockResolvedValue({
        ...mockSubmission,
        assignment: {
          exercise: { skill: "WRITING" },
          class: { teacherId: "other-teacher" },
        },
      });
      mockDb.centerMembership.findFirst.mockResolvedValue(mockAdminMembership);
      mockDb.gradingJob.findUnique.mockResolvedValue(null);

      const result = await service.triggerAnalysis(centerId, submissionId, firebaseUid);

      expect(result).toEqual(mockGradingJob);
    });
  });

  describe("getAnalysisResults", () => {
    it("should return submission with analysis status and feedback", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.gradingJob.findUnique.mockResolvedValue({ ...mockGradingJob, status: "completed" });
      mockDb.submissionFeedback.findUnique.mockResolvedValue(mockFeedback);

      const result = await service.getAnalysisResults(centerId, submissionId, firebaseUid);

      expect(result.analysisStatus).toBe("ready");
      expect(result.feedback).toBeTruthy();
    });

    it("should return analyzing status when job is processing", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.gradingJob.findUnique.mockResolvedValue({ ...mockGradingJob, status: "processing" });
      mockDb.submissionFeedback.findUnique.mockResolvedValue(null);

      const result = await service.getAnalysisResults(centerId, submissionId, firebaseUid);

      expect(result.analysisStatus).toBe("analyzing");
      expect(result.feedback).toBeNull();
    });

    it("should return failed status when job failed", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.gradingJob.findUnique.mockResolvedValue({ ...mockGradingJob, status: "failed" });
      mockDb.submissionFeedback.findUnique.mockResolvedValue(null);

      const result = await service.getAnalysisResults(centerId, submissionId, firebaseUid);

      expect(result.analysisStatus).toBe("failed");
    });

    it("should return not_applicable for Reading submissions", async () => {
      mockDb.submission.findUnique.mockResolvedValue({
        ...mockSubmission,
        assignment: {
          ...mockSubmission.assignment,
          exercise: { skill: "READING", title: "Reading Test" },
        },
      });
      mockDb.gradingJob.findUnique.mockResolvedValue(null);
      mockDb.submissionFeedback.findUnique.mockResolvedValue(null);

      const result = await service.getAnalysisResults(centerId, submissionId, firebaseUid);

      expect(result.analysisStatus).toBe("not_applicable");
    });

    it("should return failed when no grading job exists for Writing", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.gradingJob.findUnique.mockResolvedValue(null);
      mockDb.submissionFeedback.findUnique.mockResolvedValue(null);

      const result = await service.getAnalysisResults(centerId, submissionId, firebaseUid);

      expect(result.analysisStatus).toBe("failed");
    });

    it("should throw if submission not found", async () => {
      mockDb.submission.findUnique.mockResolvedValue(null);

      await expect(
        service.getAnalysisResults(centerId, submissionId, firebaseUid),
      ).rejects.toThrow("Submission not found");
    });

    it("should throw forbidden when teacher does not teach the class", async () => {
      mockDb.submission.findUnique.mockResolvedValue({
        ...mockSubmission,
        assignment: {
          ...mockSubmission.assignment,
          class: { id: "class-1", name: "IELTS A", teacherId: "other-teacher" },
        },
      });

      await expect(
        service.getAnalysisResults(centerId, submissionId, firebaseUid),
      ).rejects.toThrow("You can only access submissions from your classes");
    });
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

  describe("getSubmissionFeedback", () => {
    it("should return feedback with items", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.submissionFeedback.findUnique.mockResolvedValue(mockFeedback);

      const result = await service.getSubmissionFeedback(centerId, submissionId, firebaseUid);

      expect(result).toBeTruthy();
    });

    it("should throw if submission not found", async () => {
      mockDb.submission.findUnique.mockResolvedValue(null);

      await expect(
        service.getSubmissionFeedback(centerId, submissionId, firebaseUid),
      ).rejects.toThrow("Submission not found");
    });

    it("should throw if no feedback available", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.submissionFeedback.findUnique.mockResolvedValue(null);

      await expect(
        service.getSubmissionFeedback(centerId, submissionId, firebaseUid),
      ).rejects.toThrow("No feedback available");
    });

    it("should throw forbidden when teacher does not teach the class", async () => {
      mockDb.submission.findUnique.mockResolvedValue({
        ...mockSubmission,
        assignment: {
          ...mockSubmission.assignment,
          class: { teacherId: "other-teacher" },
        },
      });

      await expect(
        service.getSubmissionFeedback(centerId, submissionId, firebaseUid),
      ).rejects.toThrow("You can only access submissions from your classes");
    });
  });

  describe("createComment", () => {
    const createData = {
      content: "Great use of vocabulary here!",
      startOffset: 10,
      endOffset: 30,
      originalContextSnippet: "the students were",
      visibility: "student_facing" as const,
    };

    const mockCreatedComment = {
      id: "comment-1",
      centerId,
      submissionId,
      authorId: "teacher-1",
      content: createData.content,
      startOffset: createData.startOffset,
      endOffset: createData.endOffset,
      originalContextSnippet: createData.originalContextSnippet,
      visibility: createData.visibility,
      createdAt: new Date(),
      updatedAt: new Date(),
      author: { name: "Teacher One", avatarUrl: null },
    };

    it("should create a comment with anchor offsets", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.teacherComment.create.mockResolvedValue(mockCreatedComment);

      const result = await service.createComment(centerId, submissionId, firebaseUid, createData);

      expect(mockDb.teacherComment.create).toHaveBeenCalledWith({
        data: {
          centerId,
          submissionId,
          authorId: "teacher-1",
          content: createData.content,
          startOffset: createData.startOffset,
          endOffset: createData.endOffset,
          originalContextSnippet: createData.originalContextSnippet,
          visibility: createData.visibility,
        },
        include: { author: { select: { name: true, avatarUrl: true } } },
      });
      expect(result.authorName).toBe("Teacher One");
    });

    it("should create a general comment (no offsets)", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.teacherComment.create.mockResolvedValue({
        ...mockCreatedComment,
        startOffset: null,
        endOffset: null,
        originalContextSnippet: null,
      });

      const result = await service.createComment(centerId, submissionId, firebaseUid, {
        content: "General comment",
        startOffset: null,
        endOffset: null,
        visibility: "student_facing",
      });

      expect(result).toBeTruthy();
      expect(mockDb.teacherComment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            startOffset: null,
            endOffset: null,
          }),
        }),
      );
    });

    it("should throw if submission not found", async () => {
      mockDb.submission.findUnique.mockResolvedValue(null);

      await expect(
        service.createComment(centerId, submissionId, firebaseUid, createData),
      ).rejects.toThrow("Submission not found");
    });

    it("should throw for negative offsets", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);

      await expect(
        service.createComment(centerId, submissionId, firebaseUid, {
          ...createData,
          startOffset: -1,
        }),
      ).rejects.toThrow("Offsets must be non-negative");
    });

    it("should throw if endOffset <= startOffset", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);

      await expect(
        service.createComment(centerId, submissionId, firebaseUid, {
          ...createData,
          startOffset: 20,
          endOffset: 10,
        }),
      ).rejects.toThrow("endOffset must be greater than startOffset");
    });
  });

  describe("getComments", () => {
    const mockComments = [
      {
        id: "c1",
        submissionId,
        content: "Comment 1",
        visibility: "student_facing",
        createdAt: new Date("2026-01-01"),
        author: { name: "Teacher", avatarUrl: null },
      },
    ];

    it("should return comments ordered by createdAt", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.teacherComment.findMany.mockResolvedValue(mockComments);

      const result = await service.getComments(centerId, submissionId, firebaseUid);

      expect(result).toHaveLength(1);
      expect(result[0]!.authorName).toBe("Teacher");
      expect(mockDb.teacherComment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "asc" },
        }),
      );
    });

    it("should filter by visibility when provided", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.teacherComment.findMany.mockResolvedValue(mockComments);

      await service.getComments(centerId, submissionId, firebaseUid, "private");

      expect(mockDb.teacherComment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { submissionId, visibility: "private" },
        }),
      );
    });

    it("should throw if submission not found", async () => {
      mockDb.submission.findUnique.mockResolvedValue(null);

      await expect(
        service.getComments(centerId, submissionId, firebaseUid),
      ).rejects.toThrow("Submission not found");
    });
  });

  describe("updateComment", () => {
    const commentId = "comment-1";
    const mockComment = {
      id: commentId,
      submissionId,
      authorId: "teacher-1",
      content: "Original",
      visibility: "student_facing",
    };

    it("should update comment content", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.teacherComment.findFirst.mockResolvedValue(mockComment);
      mockDb.teacherComment.update.mockResolvedValue({
        ...mockComment,
        content: "Updated",
        author: { name: "Teacher", avatarUrl: null },
      });

      const result = await service.updateComment(
        centerId, submissionId, commentId, firebaseUid, { content: "Updated" },
      );

      expect(result.authorName).toBe("Teacher");
      expect(mockDb.teacherComment.update).toHaveBeenCalledWith({
        where: { id: commentId },
        data: { content: "Updated" },
        include: { author: { select: { name: true, avatarUrl: true } } },
      });
    });

    it("should throw if comment not found", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.teacherComment.findFirst.mockResolvedValue(null);

      await expect(
        service.updateComment(centerId, submissionId, commentId, firebaseUid, { content: "X" }),
      ).rejects.toThrow("Comment not found");
    });

    it("should throw if teacher is not the author", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.teacherComment.findFirst.mockResolvedValue({
        ...mockComment,
        authorId: "other-teacher",
      });

      await expect(
        service.updateComment(centerId, submissionId, commentId, firebaseUid, { content: "X" }),
      ).rejects.toThrow("You can only edit your own comments");
    });
  });

  describe("deleteComment", () => {
    const commentId = "comment-1";
    const mockComment = {
      id: commentId,
      submissionId,
      authorId: "teacher-1",
    };

    it("should delete the comment", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.teacherComment.findFirst.mockResolvedValue(mockComment);
      mockDb.teacherComment.delete.mockResolvedValue(mockComment);

      await service.deleteComment(centerId, submissionId, commentId, firebaseUid);

      expect(mockDb.teacherComment.delete).toHaveBeenCalledWith({
        where: { id: commentId },
      });
    });

    it("should throw if comment not found", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.teacherComment.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteComment(centerId, submissionId, commentId, firebaseUid),
      ).rejects.toThrow("Comment not found");
    });

    it("should throw if teacher is not the author", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.teacherComment.findFirst.mockResolvedValue({
        ...mockComment,
        authorId: "other-teacher",
      });

      await expect(
        service.deleteComment(centerId, submissionId, commentId, firebaseUid),
      ).rejects.toThrow("You can only delete your own comments");
    });
  });

  describe("getAnalysisResults - teacherComments", () => {
    it("should include teacherComments in result", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.gradingJob.findUnique.mockResolvedValue({ ...mockGradingJob, status: "completed" });
      mockDb.submissionFeedback.findUnique.mockResolvedValue(mockFeedback);
      mockDb.teacherComment.findMany.mockResolvedValue([
        {
          id: "tc-1",
          content: "Nice work",
          submissionId,
          author: { name: "Teacher A", avatarUrl: "http://img.png" },
        },
      ]);

      const result = await service.getAnalysisResults(centerId, submissionId, firebaseUid);

      expect(result.teacherComments).toHaveLength(1);
      expect((result.teacherComments[0] as { authorName: string }).authorName).toBe("Teacher A");
    });
  });

  describe("approveFeedbackItem", () => {
    const itemId = "item-1";
    const mockItem = {
      id: itemId,
      centerId,
      submissionFeedbackId: "fb-1",
      isApproved: null,
      teacherOverrideText: null,
    };

    it("should approve an item", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.aIFeedbackItem.findFirst.mockResolvedValue(mockItem);
      mockDb.aIFeedbackItem.update.mockResolvedValue({ ...mockItem, isApproved: true });

      const result = await service.approveFeedbackItem(centerId, submissionId, itemId, firebaseUid, {
        isApproved: true,
      });

      expect(result.isApproved).toBe(true);
      expect(mockDb.aIFeedbackItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: itemId },
          data: expect.objectContaining({ isApproved: true }),
        }),
      );
    });

    it("should reject an item", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.aIFeedbackItem.findFirst.mockResolvedValue(mockItem);
      mockDb.aIFeedbackItem.update.mockResolvedValue({ ...mockItem, isApproved: false, approvedAt: null });

      const result = await service.approveFeedbackItem(centerId, submissionId, itemId, firebaseUid, {
        isApproved: false,
      });

      expect(result.isApproved).toBe(false);
      expect(mockDb.aIFeedbackItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isApproved: false, approvedAt: null }),
        }),
      );
    });

    it("should toggle back to approved", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.aIFeedbackItem.findFirst.mockResolvedValue({ ...mockItem, isApproved: false });
      mockDb.aIFeedbackItem.update.mockResolvedValue({ ...mockItem, isApproved: true });

      const result = await service.approveFeedbackItem(centerId, submissionId, itemId, firebaseUid, {
        isApproved: true,
      });

      expect(result.isApproved).toBe(true);
    });

    it("should throw access denied for wrong teacher", async () => {
      mockDb.submission.findUnique.mockResolvedValue({
        ...mockSubmission,
        assignment: {
          exercise: { skill: "WRITING" },
          class: { teacherId: "other-teacher" },
        },
      });
      mockDb.centerMembership.findFirst.mockResolvedValue({ role: "TEACHER" });

      await expect(
        service.approveFeedbackItem(centerId, submissionId, itemId, firebaseUid, { isApproved: true }),
      ).rejects.toThrow("You can only access submissions from your classes");
    });

    it("should throw 404 if item not found", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.aIFeedbackItem.findFirst.mockResolvedValue(null);

      await expect(
        service.approveFeedbackItem(centerId, submissionId, itemId, firebaseUid, { isApproved: true }),
      ).rejects.toThrow("Feedback item not found");
    });
  });

  describe("bulkApproveFeedbackItems", () => {
    it("should approve remaining items", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.submissionFeedback.findFirst.mockResolvedValue(mockFeedback);
      mockDb.aIFeedbackItem.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.bulkApproveFeedbackItems(centerId, submissionId, firebaseUid, {
        action: "approve_remaining",
      });

      expect(result.count).toBe(3);
      expect(mockDb.aIFeedbackItem.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isApproved: null }),
          data: expect.objectContaining({ isApproved: true }),
        }),
      );
    });

    it("should reject remaining items", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.submissionFeedback.findFirst.mockResolvedValue(mockFeedback);
      mockDb.aIFeedbackItem.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.bulkApproveFeedbackItems(centerId, submissionId, firebaseUid, {
        action: "reject_remaining",
      });

      expect(result.count).toBe(2);
      expect(mockDb.aIFeedbackItem.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isApproved: false, approvedAt: null }),
        }),
      );
    });

    it("should return 0 when no pending items", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.submissionFeedback.findFirst.mockResolvedValue(mockFeedback);
      mockDb.aIFeedbackItem.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.bulkApproveFeedbackItems(centerId, submissionId, firebaseUid, {
        action: "approve_remaining",
      });

      expect(result.count).toBe(0);
    });
  });

  describe("finalizeGrading", () => {
    it("should finalize with teacher score override", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.submissionFeedback.findFirst.mockResolvedValue(mockFeedback);
      mockDb.submission.findFirst.mockResolvedValue({ id: "sub-next" });

      const result = await service.finalizeGrading(centerId, submissionId, firebaseUid, {
        teacherFinalScore: 7.0,
        teacherCriteriaScores: { taskAchievement: 7.0, coherence: 7.0, lexicalResource: 7.0, grammaticalRange: 7.0 },
      });

      expect(result.status).toBe("GRADED");
      expect(result.teacherFinalScore).toBe(7.0);
      expect(result.nextSubmissionId).toBe("sub-next");
    });

    it("should finalize without score override — defaults to AI score", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.submissionFeedback.findFirst.mockResolvedValue(mockFeedback);
      mockDb.submission.findFirst.mockResolvedValue(null);

      const result = await service.finalizeGrading(centerId, submissionId, firebaseUid, {});

      expect(result.status).toBe("GRADED");
      expect(result.teacherFinalScore).toBe(6.5); // AI score
      expect(result.nextSubmissionId).toBeNull();
    });

    it("should throw 409 if already GRADED", async () => {
      mockDb.submission.findUnique.mockResolvedValue({
        ...mockSubmission,
        status: "GRADED",
      });

      await expect(
        service.finalizeGrading(centerId, submissionId, firebaseUid, {}),
      ).rejects.toThrow("already graded");
    });

    it("should throw 400 if AI_PROCESSING", async () => {
      mockDb.submission.findUnique.mockResolvedValue({
        ...mockSubmission,
        status: "AI_PROCESSING",
      });

      await expect(
        service.finalizeGrading(centerId, submissionId, firebaseUid, {}),
      ).rejects.toThrow("AI analysis is still running");
    });

    it("should finalize without feedback (manual grading)", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.submissionFeedback.findFirst.mockResolvedValue(null);
      mockDb.submission.findFirst.mockResolvedValue(null);

      const result = await service.finalizeGrading(centerId, submissionId, firebaseUid, {
        teacherFinalScore: 5.0,
      });

      expect(result.status).toBe("GRADED");
      expect(result.teacherFinalScore).toBe(5.0);
    });

    it("should auto-approve pending items during finalize", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.submissionFeedback.findFirst.mockResolvedValue(mockFeedback);
      mockDb.submission.findFirst.mockResolvedValue(null);

      await service.finalizeGrading(centerId, submissionId, firebaseUid, {});

      expect(mockTx.aIFeedbackItem.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isApproved: null }),
          data: expect.objectContaining({ isApproved: true }),
        }),
      );
      expect(mockTx.submission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: "GRADED" },
        }),
      );
    });

    it("should return nextSubmissionId when next exists", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.submissionFeedback.findFirst.mockResolvedValue(mockFeedback);
      mockDb.submission.findFirst.mockResolvedValue({ id: "next-sub-123" });

      const result = await service.finalizeGrading(centerId, submissionId, firebaseUid, {});

      expect(result.nextSubmissionId).toBe("next-sub-123");
    });
  });
});
