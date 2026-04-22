import Fastify, { FastifyInstance } from "fastify";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { gradingRoutes } from "./grading.routes.js";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

describe("Grading Routes Integration", () => {
  let app: FastifyInstance;

  const mockGradingJob = {
    id: "job-1",
    centerId: "center-1",
    submissionId: "sub-1",
    status: "pending",
    error: null,
    errorCategory: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSubmission = {
    id: "sub-1",
    centerId: "center-1",
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

  const mockFeedback = {
    id: "fb-1",
    centerId: "center-1",
    submissionId: "sub-1",
    overallScore: 6.5,
    criteriaScores: { taskAchievement: 6.0 },
    generalFeedback: "Good essay.",
    teacherFinalScore: null,
    teacherCriteriaScores: null,
    teacherGeneralFeedback: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [],
  };

  const mockPrisma = {
    $extends: vi.fn(),
  };

  const mockDb = {
    submission: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
    },
    gradingJob: {
      create: vi.fn().mockResolvedValue(mockGradingJob),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    submissionFeedback: {
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
    authAccount: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        userId: "teacher-1",
        provider: "FIREBASE",
        providerUserId: "firebase-teacher-1",
      }),
    },
    centerMembership: {
      findFirst: vi.fn().mockResolvedValue({ role: "TEACHER" }),
    },
    teacherComment: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };

  const mockFirebaseAuth = {
    verifyIdToken: vi.fn().mockResolvedValue({
      uid: "firebase-teacher-1",
      email: "teacher@test.com",
      role: "TEACHER",
      center_id: "center-1",
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockPrisma.$extends.mockReturnValue(mockDb);

    app = Fastify();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (app as any).prisma = mockPrisma;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (app as any).firebaseAuth = mockFirebaseAuth;

    await app.register(gradingRoutes, { prefix: "/api/v1/grading" });
    await app.ready();
  });

  describe("GET /submissions", () => {
    it("should return 200 with grading queue", async () => {
      mockDb.submission.count.mockResolvedValue(1);
      mockDb.submission.findMany.mockResolvedValue([
        {
          id: "sub-1",
          status: "SUBMITTED",
          isPriority: false,
          submittedAt: new Date("2026-02-16"),
          student: { name: "Student A" },
          assignment: {
            id: "assign-1",
            title: "Essay 1",
            dueDate: null,
            classId: "class-1",
            class: { id: "class-1", name: "IELTS A" },
            exercise: { title: "Essay 1", skill: "WRITING" },
          },
          gradingJob: { status: "completed", error: null, errorCategory: null },
          feedback: { items: [] },
          _count: { teacherComments: 0 },
        },
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/grading/submissions",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.items).toHaveLength(1);
      expect(body.message).toBe("Grading queue retrieved");
    });

    it("should return 401 without auth header", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/grading/submissions",
      });

      expect(response.statusCode).toBe(401);
    });

    it("should return 403 for STUDENT role", async () => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce({
        uid: "firebase-student-1",
        email: "student@test.com",
        role: "STUDENT",
        center_id: "center-1",
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/grading/submissions",
        headers: { authorization: "Bearer student-token" },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("ADMIN role access (Story 15-2)", () => {
    it("should return 403 for ADMIN on GET /submissions", async () => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce({
        uid: "firebase-admin-1",
        email: "admin@test.com",
        role: "ADMIN",
        center_id: "center-1",
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/grading/submissions",
        headers: { authorization: "Bearer admin-token" },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should return 403 for ADMIN on GET /submissions/:submissionId", async () => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce({
        uid: "firebase-admin-1",
        email: "admin@test.com",
        role: "ADMIN",
        center_id: "center-1",
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/grading/submissions/sub-1",
        headers: { authorization: "Bearer admin-token" },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should return 403 for ADMIN on POST /submissions/:submissionId/comments", async () => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce({
        uid: "firebase-admin-1",
        email: "admin@test.com",
        role: "ADMIN",
        center_id: "center-1",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/grading/submissions/sub-1/comments",
        headers: { authorization: "Bearer admin-token" },
        payload: { content: "Test", visibility: "student_facing" },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should return 403 for ADMIN on POST /submissions/:submissionId/finalize", async () => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce({
        uid: "firebase-admin-1",
        email: "admin@test.com",
        role: "ADMIN",
        center_id: "center-1",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/grading/submissions/sub-1/finalize",
        headers: { authorization: "Bearer admin-token" },
        payload: { teacherFinalScore: 7.0 },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should allow ADMIN on student-facing GET /student/submissions/:submissionId", async () => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce({
        uid: "firebase-admin-1",
        email: "admin@test.com",
        role: "ADMIN",
        center_id: "center-1",
      });

      mockDb.authAccount.findUniqueOrThrow.mockResolvedValueOnce({
        userId: "admin-user-1",
        provider: "FIREBASE",
        providerUserId: "firebase-admin-1",
      });
      mockDb.centerMembership.findFirst.mockResolvedValueOnce({ role: "ADMIN" });
      mockDb.submission.findUnique.mockResolvedValue({
        ...mockSubmission,
        studentId: "admin-user-1",
      });
      mockDb.submissionFeedback.findUnique.mockResolvedValue(mockFeedback);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/grading/student/submissions/sub-1",
        headers: { authorization: "Bearer admin-token" },
      });

      // Should not be 403 - ADMIN is allowed on student-facing routes
      expect(response.statusCode).not.toBe(403);
    });

    it("should allow ADMIN on student-facing GET /student/submissions/:submissionId/history (AC7)", async () => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce({
        uid: "firebase-admin-1",
        email: "admin@test.com",
        role: "ADMIN",
        center_id: "center-1",
      });

      mockDb.authAccount.findUniqueOrThrow.mockResolvedValueOnce({
        userId: "admin-user-1",
        provider: "FIREBASE",
        providerUserId: "firebase-admin-1",
      });
      mockDb.centerMembership.findFirst.mockResolvedValueOnce({ role: "ADMIN" });
      mockDb.submission.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/grading/student/submissions/sub-1/history",
        headers: { authorization: "Bearer admin-token" },
      });

      // Should not be 403 - ADMIN is allowed on student-facing routes (AC7)
      expect(response.statusCode).not.toBe(403);
    });
  });

  describe("GET /submissions/:submissionId", () => {
    it("should return 200 with submission detail", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.gradingJob.findUnique.mockResolvedValue({ ...mockGradingJob, status: "completed" });
      mockDb.submissionFeedback.findUnique.mockResolvedValue(mockFeedback);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/grading/submissions/sub-1",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.analysisStatus).toBe("ready");
      expect(body.message).toBe("Submission detail retrieved");
    });

    it("should return 404 when submission not found", async () => {
      mockDb.submission.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/grading/submissions/nonexistent",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 403 when teacher does not teach the class", async () => {
      mockDb.submission.findUnique.mockResolvedValue({
        ...mockSubmission,
        assignment: {
          ...mockSubmission.assignment,
          class: { id: "class-1", name: "IELTS A", teacherId: "other-teacher" },
        },
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/grading/submissions/sub-1",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("GET /submissions/:submissionId/feedback", () => {
    it("should return 200 with feedback data", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.submissionFeedback.findUnique.mockResolvedValue(mockFeedback);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/grading/submissions/sub-1/feedback",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Feedback retrieved");
    });

    it("should return 404 when no feedback exists", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.submissionFeedback.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/grading/submissions/sub-1/feedback",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("POST /submissions/:submissionId/comments", () => {
    const mockCreatedComment = {
      id: "comment-1",
      centerId: "center-1",
      submissionId: "sub-1",
      authorId: "teacher-1",
      content: "Nice vocabulary!",
      startOffset: 10,
      endOffset: 25,
      originalContextSnippet: "the students were",
      visibility: "student_facing",
      createdAt: new Date(),
      updatedAt: new Date(),
      author: { name: "Teacher One", avatarUrl: null },
    };

    it("should return 200 when creating a comment", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.teacherComment.create.mockResolvedValue(mockCreatedComment);

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/grading/submissions/sub-1/comments",
        headers: { authorization: "Bearer valid-token" },
        payload: {
          content: "Nice vocabulary!",
          startOffset: 10,
          endOffset: 25,
          originalContextSnippet: "the students were",
          visibility: "student_facing",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Comment created");
      expect(body.data.authorName).toBe("Teacher One");
    });

    it("should return 400 for empty content", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/grading/submissions/sub-1/comments",
        headers: { authorization: "Bearer valid-token" },
        payload: { content: "", visibility: "student_facing" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 404 when submission not found", async () => {
      mockDb.submission.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/grading/submissions/nonexistent/comments",
        headers: { authorization: "Bearer valid-token" },
        payload: { content: "Test comment", visibility: "student_facing" },
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 401 without auth", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/grading/submissions/sub-1/comments",
        payload: { content: "Test", visibility: "student_facing" },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /submissions/:submissionId/comments", () => {
    it("should return 200 with comments list", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.teacherComment.findMany.mockResolvedValue([
        {
          id: "c1",
          centerId: "center-1",
          submissionId: "sub-1",
          authorId: "teacher-1",
          content: "Good work",
          startOffset: null,
          endOffset: null,
          originalContextSnippet: null,
          visibility: "student_facing",
          createdAt: new Date(),
          updatedAt: new Date(),
          author: { name: "Teacher", avatarUrl: null },
        },
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/grading/submissions/sub-1/comments",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Comments retrieved");
      expect(body.data).toHaveLength(1);
    });

    it("should accept visibility query param", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.teacherComment.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/grading/submissions/sub-1/comments?visibility=student_facing",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe("PATCH /submissions/:submissionId/comments/:commentId", () => {
    it("should return 200 when updating a comment", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.teacherComment.findFirst.mockResolvedValue({
        id: "c1",
        centerId: "center-1",
        submissionId: "sub-1",
        authorId: "teacher-1",
        content: "Original",
        startOffset: null,
        endOffset: null,
        originalContextSnippet: null,
        visibility: "student_facing",
      });
      mockDb.teacherComment.update.mockResolvedValue({
        id: "c1",
        centerId: "center-1",
        submissionId: "sub-1",
        authorId: "teacher-1",
        content: "Updated",
        startOffset: null,
        endOffset: null,
        originalContextSnippet: null,
        visibility: "student_facing",
        createdAt: new Date(),
        updatedAt: new Date(),
        author: { name: "Teacher", avatarUrl: null },
      });

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/grading/submissions/sub-1/comments/c1",
        headers: { authorization: "Bearer valid-token" },
        payload: { content: "Updated" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Comment updated");
    });

    it("should return 403 when editing someone else's comment", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.teacherComment.findFirst.mockResolvedValue({
        id: "c1",
        centerId: "center-1",
        submissionId: "sub-1",
        authorId: "other-teacher",
        content: "Original",
        startOffset: null,
        endOffset: null,
        originalContextSnippet: null,
        visibility: "student_facing",
      });

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/grading/submissions/sub-1/comments/c1",
        headers: { authorization: "Bearer valid-token" },
        payload: { content: "Hijacked" },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("DELETE /submissions/:submissionId/comments/:commentId", () => {
    it("should return 200 when deleting own comment", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.teacherComment.findFirst.mockResolvedValue({
        id: "c1",
        centerId: "center-1",
        submissionId: "sub-1",
        authorId: "teacher-1",
        content: "To delete",
        startOffset: null,
        endOffset: null,
        originalContextSnippet: null,
        visibility: "student_facing",
      });
      mockDb.teacherComment.delete.mockResolvedValue({});

      const response = await app.inject({
        method: "DELETE",
        url: "/api/v1/grading/submissions/sub-1/comments/c1",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Comment deleted");
    });

    it("should return 404 when comment not found", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmission);
      mockDb.teacherComment.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: "DELETE",
        url: "/api/v1/grading/submissions/sub-1/comments/nonexistent",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("PATCH /submissions/:submissionId/priority", () => {
    const mockSubmissionForPriority = {
      id: "sub-1",
      centerId: "center-1",
      isPriority: false,
      assignment: {
        class: { teacherId: "teacher-1" },
      },
    };

    it("should return 200 when toggling priority on", async () => {
      mockDb.submission.findUnique.mockResolvedValue(mockSubmissionForPriority);
      mockDb.submission.update.mockResolvedValue({ ...mockSubmissionForPriority, isPriority: true });

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/grading/submissions/sub-1/priority",
        headers: { authorization: "Bearer valid-token" },
        payload: { isPriority: true },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.submissionId).toBe("sub-1");
      expect(body.data.isPriority).toBe(true);
      expect(body.message).toBe("Priority updated");
    });

    it("should return 200 when toggling priority off", async () => {
      mockDb.submission.findUnique.mockResolvedValue({ ...mockSubmissionForPriority, isPriority: true });
      mockDb.submission.update.mockResolvedValue({ ...mockSubmissionForPriority, isPriority: false });

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/grading/submissions/sub-1/priority",
        headers: { authorization: "Bearer valid-token" },
        payload: { isPriority: false },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.isPriority).toBe(false);
    });

    it("should return 401 without auth header", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/grading/submissions/sub-1/priority",
        payload: { isPriority: true },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should return 403 for STUDENT role", async () => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce({
        uid: "firebase-student-1",
        email: "student@test.com",
        role: "STUDENT",
        center_id: "center-1",
      });

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/grading/submissions/sub-1/priority",
        headers: { authorization: "Bearer student-token" },
        payload: { isPriority: true },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should return 404 when submission not found", async () => {
      mockDb.submission.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/grading/submissions/nonexistent/priority",
        headers: { authorization: "Bearer valid-token" },
        payload: { isPriority: true },
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 400 for invalid body", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/grading/submissions/sub-1/priority",
        headers: { authorization: "Bearer valid-token" },
        payload: { isPriority: "not-a-boolean" },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("POST /submissions/:submissionId/analyze", () => {
    it("should return 200 when triggering analysis", async () => {
      mockDb.submission.findUnique
        .mockResolvedValueOnce(mockSubmission) // retriggerAnalysis lookup
        .mockResolvedValueOnce(mockSubmission); // triggerAnalysis lookup
      mockDb.gradingJob.findUnique.mockResolvedValue(null);

      // Mock inngest.send
      const inngestModule = await import("../inngest/client.js");
      vi.spyOn(inngestModule.inngest, "send").mockResolvedValue(undefined as never);

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/grading/submissions/sub-1/analyze",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("AI analysis triggered");
    });
  });
});
