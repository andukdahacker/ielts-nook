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
});
