import {
  GradingQueueFiltersSchema,
  GradingQueueResponseSchema,
  SubmissionDetailResponseSchema,
  SubmissionFeedbackResponseSchema,
  GradingJobResponseSchema,
  ErrorResponseSchema,
  CreateTeacherCommentSchema,
  UpdateTeacherCommentSchema,
  TeacherCommentResponseSchema,
  TeacherCommentListResponseSchema,
  CommentVisibilitySchema,
  ApproveFeedbackItemSchema,
  BulkApproveFeedbackItemsSchema,
  FinalizeGradingSchema,
  FinalizeGradingResponseSchema,
  AIFeedbackItemSchema,
  TogglePrioritySchema,
  StudentFeedbackResponseSchema,
  SubmissionHistoryResponseSchema,
  UnlockSubmissionResponseSchema,
} from "@workspace/types";
import { FastifyInstance, FastifyReply } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { AppError } from "../../errors/app-error.js";
import { mapPrismaError } from "../../errors/prisma-errors.js";
import { GradingController } from "./grading.controller.js";
import { GradingService } from "./grading.service.js";
import z from "zod";

function handleRouteError(
  error: unknown,
  request: { log: { error: (e: unknown) => void } },
  reply: FastifyReply,
) {
  request.log.error(error);
  if (error instanceof AppError) {
    return reply.status(error.statusCode as 500).send({ message: error.message });
  }
  const mapped = mapPrismaError(error);
  if (mapped) {
    return reply.status(mapped.statusCode as 500).send({ message: mapped.message });
  }
  return reply.status(500).send({ message: "Internal server error" });
}

export async function gradingRoutes(fastify: FastifyInstance) {
  const api = fastify.withTypeProvider<ZodTypeProvider>();

  const service = new GradingService(fastify.prisma);
  const controller = new GradingController(service);

  // All grading routes require authentication + TEACHER/OWNER role (ADMIN removed per Story 15-2)
  fastify.addHook("preHandler", authMiddleware);

  // GET /submissions — List submissions with AI analysis status (grading queue)
  api.get("/submissions", {
    schema: {
      querystring: GradingQueueFiltersSchema,
      response: {
        200: GradingQueueResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["TEACHER", "OWNER"])],
    handler: async (request, reply) => {
      try {
        const payload = request.jwtPayload!;
        if (!payload.centerId) {
          return reply.status(400).send({ message: "User does not belong to a center" });
        }
        const filters = request.query as z.infer<typeof GradingQueueFiltersSchema>;
        const result = await controller.getGradingQueue(
          { uid: payload.uid, centerId: payload.centerId },
          filters,
        );
        return reply.send(result);
      } catch (error: unknown) {
        return handleRouteError(error, request, reply);
      }
    },
  });

  // PATCH /submissions/:submissionId/priority — Toggle priority flag
  api.patch("/submissions/:submissionId/priority", {
    schema: {
      params: z.object({ submissionId: z.string() }),
      body: TogglePrioritySchema,
      response: {
        200: z.object({
          data: z.object({ submissionId: z.string(), isPriority: z.boolean() }),
          message: z.string(),
        }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["TEACHER", "OWNER"])],
    handler: async (request, reply) => {
      try {
        const payload = request.jwtPayload!;
        if (!payload.centerId) {
          return reply.status(400).send({ message: "User does not belong to a center" });
        }
        const { submissionId } = request.params as { submissionId: string };
        const result = await controller.togglePriority(
          submissionId,
          { uid: payload.uid, centerId: payload.centerId },
          request.body as z.infer<typeof TogglePrioritySchema>,
        );
        return reply.send(result);
      } catch (error: unknown) {
        return handleRouteError(error, request, reply);
      }
    },
  });

  // GET /submissions/:submissionId — Get full submission detail with AI feedback
  api.get("/submissions/:submissionId", {
    schema: {
      params: z.object({ submissionId: z.string() }),
      response: {
        200: SubmissionDetailResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["TEACHER", "OWNER"])],
    handler: async (request, reply) => {
      try {
        const payload = request.jwtPayload!;
        if (!payload.centerId) {
          return reply.status(400).send({ message: "User does not belong to a center" });
        }
        const { submissionId } = request.params as { submissionId: string };
        const result = await controller.getSubmissionDetail(
          submissionId,
          { uid: payload.uid, centerId: payload.centerId },
        );
        return reply.send(result);
      } catch (error: unknown) {
        return handleRouteError(error, request, reply);
      }
    },
  });

  // GET /submissions/:submissionId/feedback — Get AI-generated feedback
  api.get("/submissions/:submissionId/feedback", {
    schema: {
      params: z.object({ submissionId: z.string() }),
      response: {
        200: SubmissionFeedbackResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["TEACHER", "OWNER"])],
    handler: async (request, reply) => {
      try {
        const payload = request.jwtPayload!;
        if (!payload.centerId) {
          return reply.status(400).send({ message: "User does not belong to a center" });
        }
        const { submissionId } = request.params as { submissionId: string };
        const result = await controller.getSubmissionFeedback(
          submissionId,
          { uid: payload.uid, centerId: payload.centerId },
        );
        return reply.send(result);
      } catch (error: unknown) {
        return handleRouteError(error, request, reply);
      }
    },
  });

  // POST /submissions/:submissionId/comments — Create teacher comment
  api.post("/submissions/:submissionId/comments", {
    schema: {
      params: z.object({ submissionId: z.string() }),
      body: CreateTeacherCommentSchema,
      response: {
        200: TeacherCommentResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["TEACHER", "OWNER"])],
    handler: async (request, reply) => {
      try {
        const payload = request.jwtPayload!;
        if (!payload.centerId) {
          return reply.status(400).send({ message: "User does not belong to a center" });
        }
        const { submissionId } = request.params as { submissionId: string };
        const result = await controller.createComment(
          submissionId,
          { uid: payload.uid, centerId: payload.centerId },
          request.body as z.infer<typeof CreateTeacherCommentSchema>,
        );
        return reply.send(result);
      } catch (error: unknown) {
        return handleRouteError(error, request, reply);
      }
    },
  });

  // GET /submissions/:submissionId/comments — List teacher comments
  api.get("/submissions/:submissionId/comments", {
    schema: {
      params: z.object({ submissionId: z.string() }),
      querystring: z.object({ visibility: CommentVisibilitySchema.optional() }),
      response: {
        200: TeacherCommentListResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["TEACHER", "OWNER"])],
    handler: async (request, reply) => {
      try {
        const payload = request.jwtPayload!;
        if (!payload.centerId) {
          return reply.status(400).send({ message: "User does not belong to a center" });
        }
        const { submissionId } = request.params as { submissionId: string };
        const query = request.query as { visibility?: z.infer<typeof CommentVisibilitySchema> };
        const result = await controller.getComments(
          submissionId,
          { uid: payload.uid, centerId: payload.centerId },
          query.visibility,
        );
        return reply.send(result);
      } catch (error: unknown) {
        return handleRouteError(error, request, reply);
      }
    },
  });

  // PATCH /submissions/:submissionId/comments/:commentId — Update teacher comment
  api.patch("/submissions/:submissionId/comments/:commentId", {
    schema: {
      params: z.object({ submissionId: z.string(), commentId: z.string() }),
      body: UpdateTeacherCommentSchema,
      response: {
        200: TeacherCommentResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["TEACHER", "OWNER"])],
    handler: async (request, reply) => {
      try {
        const payload = request.jwtPayload!;
        if (!payload.centerId) {
          return reply.status(400).send({ message: "User does not belong to a center" });
        }
        const { submissionId, commentId } = request.params as { submissionId: string; commentId: string };
        const result = await controller.updateComment(
          submissionId,
          commentId,
          { uid: payload.uid, centerId: payload.centerId },
          request.body as z.infer<typeof UpdateTeacherCommentSchema>,
        );
        return reply.send(result);
      } catch (error: unknown) {
        return handleRouteError(error, request, reply);
      }
    },
  });

  // DELETE /submissions/:submissionId/comments/:commentId — Delete teacher comment
  api.delete("/submissions/:submissionId/comments/:commentId", {
    schema: {
      params: z.object({ submissionId: z.string(), commentId: z.string() }),
      response: {
        200: z.object({ data: z.null(), message: z.string() }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["TEACHER", "OWNER"])],
    handler: async (request, reply) => {
      try {
        const payload = request.jwtPayload!;
        if (!payload.centerId) {
          return reply.status(400).send({ message: "User does not belong to a center" });
        }
        const { submissionId, commentId } = request.params as { submissionId: string; commentId: string };
        const result = await controller.deleteComment(
          submissionId,
          commentId,
          { uid: payload.uid, centerId: payload.centerId },
        );
        return reply.send(result);
      } catch (error: unknown) {
        return handleRouteError(error, request, reply);
      }
    },
  });

  // PATCH /submissions/:submissionId/feedback/items/bulk — Bulk approve/reject remaining items
  api.patch("/submissions/:submissionId/feedback/items/bulk", {
    schema: {
      params: z.object({ submissionId: z.string() }),
      body: BulkApproveFeedbackItemsSchema,
      response: {
        200: z.object({ data: z.object({ count: z.number() }), message: z.string() }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["TEACHER", "OWNER"])],
    handler: async (request, reply) => {
      try {
        const payload = request.jwtPayload!;
        if (!payload.centerId) {
          return reply.status(400).send({ message: "User does not belong to a center" });
        }
        const { submissionId } = request.params as { submissionId: string };
        const result = await controller.bulkApproveFeedbackItems(
          payload.centerId,
          submissionId,
          payload.uid,
          request.body as z.infer<typeof BulkApproveFeedbackItemsSchema>,
        );
        return reply.send(result);
      } catch (error: unknown) {
        return handleRouteError(error, request, reply);
      }
    },
  });

  // PATCH /submissions/:submissionId/feedback/items/:itemId — Approve/reject single AI feedback item
  api.patch("/submissions/:submissionId/feedback/items/:itemId", {
    schema: {
      params: z.object({ submissionId: z.string(), itemId: z.string() }),
      body: ApproveFeedbackItemSchema,
      response: {
        200: z.object({ data: AIFeedbackItemSchema, message: z.string() }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["TEACHER", "OWNER"])],
    handler: async (request, reply) => {
      try {
        const payload = request.jwtPayload!;
        if (!payload.centerId) {
          return reply.status(400).send({ message: "User does not belong to a center" });
        }
        const { submissionId, itemId } = request.params as { submissionId: string; itemId: string };
        const result = await controller.approveFeedbackItem(
          payload.centerId,
          submissionId,
          itemId,
          payload.uid,
          request.body as z.infer<typeof ApproveFeedbackItemSchema>,
        );
        return reply.send(result);
      } catch (error: unknown) {
        return handleRouteError(error, request, reply);
      }
    },
  });

  // POST /submissions/:submissionId/finalize — Finalize grading
  api.post("/submissions/:submissionId/finalize", {
    schema: {
      params: z.object({ submissionId: z.string() }),
      body: FinalizeGradingSchema,
      response: {
        200: FinalizeGradingResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        409: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["TEACHER", "OWNER"])],
    handler: async (request, reply) => {
      try {
        const payload = request.jwtPayload!;
        if (!payload.centerId) {
          return reply.status(400).send({ message: "User does not belong to a center" });
        }
        const { submissionId } = request.params as { submissionId: string };
        const result = await controller.finalizeGrading(
          payload.centerId,
          submissionId,
          payload.uid,
          request.body as z.infer<typeof FinalizeGradingSchema>,
        );
        return reply.send(result);
      } catch (error: unknown) {
        return handleRouteError(error, request, reply);
      }
    },
  });

  // POST /submissions/:submissionId/unlock — Unlock submission for re-submission (Story 11.7)
  api.post("/submissions/:submissionId/unlock", {
    schema: {
      params: z.object({ submissionId: z.string() }),
      response: {
        200: UnlockSubmissionResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["TEACHER", "OWNER"])],
    handler: async (request, reply) => {
      try {
        const payload = request.jwtPayload!;
        if (!payload.centerId) {
          return reply.status(400).send({ message: "User does not belong to a center" });
        }
        const { submissionId } = request.params as { submissionId: string };
        const result = await controller.unlockSubmission(
          payload.centerId,
          submissionId,
          payload.uid,
        );
        return reply.send(result);
      } catch (error: unknown) {
        return handleRouteError(error, request, reply);
      }
    },
  });

  // --- Student Feedback Routes (Story 5.6) ---
  // These routes allow STUDENT role access (ownership enforced in service)

  // GET /student/submissions/:submissionId — Get student feedback view
  api.get("/student/submissions/:submissionId", {
    schema: {
      params: z.object({ submissionId: z.string() }),
      response: {
        200: StudentFeedbackResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["STUDENT", "TEACHER", "ADMIN", "OWNER"])],
    handler: async (request, reply) => {
      try {
        const payload = request.jwtPayload!;
        if (!payload.centerId) {
          return reply.status(400).send({ message: "User does not belong to a center" });
        }
        const { submissionId } = request.params as { submissionId: string };
        const result = await controller.getStudentFeedback(
          submissionId,
          { uid: payload.uid, centerId: payload.centerId },
        );
        return reply.send(result);
      } catch (error: unknown) {
        return handleRouteError(error, request, reply);
      }
    },
  });

  // GET /student/submissions/:submissionId/history — Get submission history
  api.get("/student/submissions/:submissionId/history", {
    schema: {
      params: z.object({ submissionId: z.string() }),
      response: {
        200: SubmissionHistoryResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["STUDENT", "TEACHER", "ADMIN", "OWNER"])],
    handler: async (request, reply) => {
      try {
        const payload = request.jwtPayload!;
        if (!payload.centerId) {
          return reply.status(400).send({ message: "User does not belong to a center" });
        }
        const { submissionId } = request.params as { submissionId: string };
        const result = await controller.getSubmissionHistory(
          submissionId,
          { uid: payload.uid, centerId: payload.centerId },
        );
        return reply.send(result);
      } catch (error: unknown) {
        return handleRouteError(error, request, reply);
      }
    },
  });

  // POST /submissions/:submissionId/analyze — Trigger or re-trigger AI analysis
  api.post("/submissions/:submissionId/analyze", {
    schema: {
      params: z.object({ submissionId: z.string() }),
      response: {
        200: GradingJobResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["TEACHER", "OWNER"])],
    handler: async (request, reply) => {
      try {
        const payload = request.jwtPayload!;
        if (!payload.centerId) {
          return reply.status(400).send({ message: "User does not belong to a center" });
        }
        const { submissionId } = request.params as { submissionId: string };
        const result = await controller.triggerAnalysis(
          submissionId,
          { uid: payload.uid, centerId: payload.centerId },
        );
        return reply.send(result);
      } catch (error: unknown) {
        return handleRouteError(error, request, reply);
      }
    },
  });
}
