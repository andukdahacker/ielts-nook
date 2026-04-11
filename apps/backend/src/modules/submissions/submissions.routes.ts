import {
  StartSubmissionSchema,
  SaveAnswersRequestSchema,
  SubmitSubmissionSchema,
  ErrorResponseSchema,
} from "@workspace/types";
import { FastifyInstance, FastifyReply } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { AppError } from "../../errors/app-error.js";
import { mapPrismaError } from "../../errors/prisma-errors.js";
import { SubmissionsController } from "./submissions.controller.js";
import { SubmissionsService } from "./submissions.service.js";
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

export async function submissionsRoutes(fastify: FastifyInstance) {
  const api = fastify.withTypeProvider<ZodTypeProvider>();

  const env = fastify.getEnvs<{ FIREBASE_STORAGE_BUCKET: string }>();
  const service = new SubmissionsService(
    fastify.prisma,
    fastify.firebaseStorage,
    env.FIREBASE_STORAGE_BUCKET,
  );
  const controller = new SubmissionsController(service);

  // All routes require authentication + STUDENT role
  fastify.addHook("preHandler", authMiddleware);

  // POST / — Start a submission
  api.post("/", {
    schema: {
      body: StartSubmissionSchema,
      response: {
        200: z.object({ data: z.unknown(), message: z.string() }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        409: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["STUDENT"])],
    handler: async (request, reply) => {
      try {
        const payload = request.jwtPayload!;
        if (!payload.centerId) {
          return reply.status(400).send({ message: "User does not belong to a center" });
        }
        const result = await controller.start(
          { uid: payload.uid, centerId: payload.centerId },
          request.body as { assignmentId: string },
        );
        return reply.send(result);
      } catch (error: unknown) {
        return handleRouteError(error, request, reply);
      }
    },
  });

  // GET /assignment/:assignmentId — Get full assignment with exercise content (for taking)
  api.get("/assignment/:assignmentId", {
    schema: {
      params: z.object({ assignmentId: z.string() }),
      response: {
        200: z.object({ data: z.unknown(), message: z.string() }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["STUDENT"])],
    handler: async (request, reply) => {
      try {
        const payload = request.jwtPayload!;
        if (!payload.centerId) {
          return reply.status(400).send({ message: "User does not belong to a center" });
        }
        const { assignmentId } = request.params as { assignmentId: string };
        const result = await controller.getAssignmentDetail(
          assignmentId,
          { uid: payload.uid, centerId: payload.centerId },
        );
        return reply.send(result);
      } catch (error: unknown) {
        return handleRouteError(error, request, reply);
      }
    },
  });

  // GET /:id — Get submission with all answers
  api.get("/:id", {
    schema: {
      params: z.object({ id: z.string() }),
      response: {
        200: z.object({ data: z.unknown(), message: z.string() }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["STUDENT"])],
    handler: async (request, reply) => {
      try {
        const payload = request.jwtPayload!;
        if (!payload.centerId) {
          return reply.status(400).send({ message: "User does not belong to a center" });
        }
        const { id } = request.params as { id: string };
        const result = await controller.get(id, {
          uid: payload.uid,
          centerId: payload.centerId,
        });
        return reply.send(result);
      } catch (error: unknown) {
        return handleRouteError(error, request, reply);
      }
    },
  });

  // PATCH /:id/answers — Batch upsert answers (partial save)
  api.patch("/:id/answers", {
    schema: {
      params: z.object({ id: z.string() }),
      body: SaveAnswersRequestSchema,
      response: {
        200: z.object({ data: z.unknown(), message: z.string() }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["STUDENT"])],
    handler: async (request, reply) => {
      try {
        const payload = request.jwtPayload!;
        if (!payload.centerId) {
          return reply.status(400).send({ message: "User does not belong to a center" });
        }
        const { id } = request.params as { id: string };
        const result = await controller.saveAnswers(
          id,
          request.body as { answers: Array<{ questionId: string; answer?: unknown }> },
          { uid: payload.uid, centerId: payload.centerId },
        );
        return reply.send(result);
      } catch (error: unknown) {
        return handleRouteError(error, request, reply);
      }
    },
  });

  // POST /:id/submit — Final submission
  api.post("/:id/submit", {
    schema: {
      params: z.object({ id: z.string() }),
      body: SubmitSubmissionSchema,
      response: {
        200: z.object({ data: z.unknown(), message: z.string() }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["STUDENT"])],
    handler: async (request, reply) => {
      try {
        const payload = request.jwtPayload!;
        if (!payload.centerId) {
          return reply.status(400).send({ message: "User does not belong to a center" });
        }
        const { id } = request.params as { id: string };
        const result = await controller.submit(
          id,
          request.body as { timeSpentSec?: number },
          { uid: payload.uid, centerId: payload.centerId },
        );
        return reply.send(result);
      } catch (error: unknown) {
        return handleRouteError(error, request, reply);
      }
    },
  });

  // POST /:id/photo — Upload photo for handwritten answer
  api.post("/:id/photo", {
    schema: {
      consumes: ["multipart/form-data"],
      params: z.object({ id: z.string() }),
      body: z.object({
        file: z.any().describe("Photo of handwritten answer"),
        questionId: z.string().describe("ID of the question this photo answers"),
      }),
      response: {
        200: z.object({ data: z.object({ photoUrl: z.string() }), message: z.string() }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["STUDENT"])],
    handler: async (request, reply) => {
      try {
        const payload = request.jwtPayload!;
        if (!payload.centerId) {
          return reply.status(400).send({ message: "User does not belong to a center" });
        }
        const { id } = request.params as { id: string };
        const data = await request.file();
        if (!data) {
          return reply.status(400).send({ message: "No file uploaded" });
        }

        const questionId = (data.fields.questionId as { value: string } | undefined)?.value;
        if (!questionId) {
          return reply.status(400).send({ message: "questionId is required" });
        }

        const buffer = await data.toBuffer();
        const result = await controller.uploadPhoto(
          id,
          questionId,
          buffer,
          data.mimetype,
          { uid: payload.uid, centerId: payload.centerId },
        );
        return reply.send(result);
      } catch (error: unknown) {
        return handleRouteError(error, request, reply);
      }
    },
  });
}
