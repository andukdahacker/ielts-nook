import { vi, describe, it, expect, beforeEach } from "vitest";
import { GradingService } from "./grading.service.js";

// Mock inngest
vi.mock("../inngest/client.js", () => ({
  inngest: {
    send: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("GradingService — unlockSubmission", () => {
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
      class: { teacherId: "teacher-1" },
    },
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
      },
      authAccount: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(mockAuthAccount),
      },
      centerMembership: {
        findFirst: vi.fn().mockResolvedValue(mockTeacherMembership),
      },
    };

    mockTx = {
      submissionFeedback: {
        findFirst: vi.fn().mockResolvedValue(null),
        delete: vi.fn(),
      },
      aIFeedbackItem: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      teacherComment: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      gradingJob: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      studentAnswer: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      submission: {
        update: vi.fn(),
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockPrisma = {
      $extends: vi.fn().mockReturnValue(mockDb),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $transaction: vi.fn().mockImplementation(async (fn: any) => fn(mockTx)),
    } as any;
    service = new GradingService(mockPrisma);
  });

  it("should reset status to IN_PROGRESS", async () => {
    mockDb.submission.findUnique.mockResolvedValue(mockSubmission);

    const result = await service.unlockSubmission(centerId, submissionId, firebaseUid);

    expect(result).toEqual({ id: submissionId, status: "IN_PROGRESS" });
    expect(mockTx.submission.update).toHaveBeenCalledWith({
      where: { id: submissionId, centerId },
      data: { status: "IN_PROGRESS", submittedAt: null, timeSpentSec: 0 },
    });
  });

  it("should delete grading job, feedback, AI items, and comments", async () => {
    const mockFeedback = { id: "fb-1" };
    mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
    mockTx.submissionFeedback.findFirst.mockResolvedValue(mockFeedback);

    await service.unlockSubmission(centerId, submissionId, firebaseUid);

    // AIFeedbackItems deleted
    expect(mockTx.aIFeedbackItem.deleteMany).toHaveBeenCalledWith({
      where: { submissionFeedbackId: "fb-1", centerId },
    });
    // SubmissionFeedback deleted
    expect(mockTx.submissionFeedback.delete).toHaveBeenCalledWith({
      where: { id: "fb-1", centerId },
    });
    // TeacherComments deleted
    expect(mockTx.teacherComment.deleteMany).toHaveBeenCalledWith({
      where: { submissionId, centerId },
    });
    // GradingJob deleted
    expect(mockTx.gradingJob.deleteMany).toHaveBeenCalledWith({
      where: { submissionId, centerId },
    });
  });

  it("should reset answer scores to null", async () => {
    mockDb.submission.findUnique.mockResolvedValue(mockSubmission);

    await service.unlockSubmission(centerId, submissionId, firebaseUid);

    expect(mockTx.studentAnswer.updateMany).toHaveBeenCalledWith({
      where: { submissionId, centerId },
      data: { isCorrect: null, score: null },
    });
  });

  it("should throw for IN_PROGRESS submission (already unlocked)", async () => {
    mockDb.submission.findUnique.mockResolvedValue({
      ...mockSubmission,
      status: "IN_PROGRESS",
    });

    await expect(
      service.unlockSubmission(centerId, submissionId, firebaseUid),
    ).rejects.toThrow("Submission is already unlocked");
  });

  it("should throw for non-existent submission", async () => {
    mockDb.submission.findUnique.mockResolvedValue(null);

    await expect(
      service.unlockSubmission(centerId, submissionId, firebaseUid),
    ).rejects.toThrow("Submission not found");
  });

  it("should work for GRADED submission", async () => {
    mockDb.submission.findUnique.mockResolvedValue({
      ...mockSubmission,
      status: "GRADED",
    });

    const result = await service.unlockSubmission(centerId, submissionId, firebaseUid);
    expect(result).toEqual({ id: submissionId, status: "IN_PROGRESS" });
  });

  it("should work for AI_PROCESSING submission", async () => {
    mockDb.submission.findUnique.mockResolvedValue({
      ...mockSubmission,
      status: "AI_PROCESSING",
    });

    const result = await service.unlockSubmission(centerId, submissionId, firebaseUid);
    expect(result).toEqual({ id: submissionId, status: "IN_PROGRESS" });
  });

  it("should skip feedback cleanup when no feedback exists", async () => {
    mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
    mockTx.submissionFeedback.findFirst.mockResolvedValue(null);

    await service.unlockSubmission(centerId, submissionId, firebaseUid);

    expect(mockTx.aIFeedbackItem.deleteMany).not.toHaveBeenCalled();
    expect(mockTx.submissionFeedback.delete).not.toHaveBeenCalled();
    // Other cleanup still happens
    expect(mockTx.teacherComment.deleteMany).toHaveBeenCalled();
    expect(mockTx.gradingJob.deleteMany).toHaveBeenCalled();
  });
});
