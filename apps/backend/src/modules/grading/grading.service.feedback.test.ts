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
