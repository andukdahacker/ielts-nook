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
});
