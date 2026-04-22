import {
  CreateClassSessionSchema,
  UpdateClassSessionSchema,
  ClassSessionResponseSchema,
  ClassSessionListResponseSchema,
  GenerateSessionsSchema,
  GenerateSessionsResponseSchema,
  ErrorResponseSchema,
  UpdateClassSessionInput,
  CreateClassSessionInput,
  GenerateSessionsInput,
  ConflictCheckInputSchema,
  ConflictCheckInput,
  ConflictResultResponseSchema,
  DeleteFutureSessionsResponseSchema,
} from "@workspace/types";
import { getTenantedClient } from "@workspace/db";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { AppError } from "../../errors/app-error.js";
import { mapPrismaError } from "../../errors/prisma-errors.js";
import { SessionsController } from "./sessions.controller.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import z from "zod";

/**
 * RBAC middleware for checking teacher access to a session.
 * - OWNER/ADMIN: always allowed
 * - TEACHER: only if assigned to the class
 * - STUDENT: forbidden
 */
async function checkTeacherSessionAccess(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = request.params as { id: string };
  const { centerId, uid, role } = request.jwtPayload!;

  if (role === "OWNER" || role === "ADMIN") {
    return;
  }

  if (role === "STUDENT") {
    return reply.status(403).send({
      message: "Students cannot access this resource",
    });
  }

  if (role === "TEACHER") {
    if (!centerId) {
      return reply.status(400).send({
        message: "Center ID missing from token",
      });
    }

    const db = getTenantedClient(request.server.prisma, centerId);
    const session = await db.classSession.findUnique({
      where: { id },
      include: { class: { select: { teacherId: true } } },
    });

    if (!session) {
      return reply.status(404).send({
        message: "Session not found",
      });
    }

    if (session.class.teacherId !== uid) {
      return reply.status(403).send({
        message: "Access denied - not assigned to this class",
      });
    }
    return;
  }

  // Default deny for unrecognized roles
  return reply.status(403).send({
    message: "Access denied",
  });
}

export async function sessionsRoutes(fastify: FastifyInstance) {
  const api = fastify.withTypeProvider<ZodTypeProvider>();

  // Use the shared SessionsService singleton (see services.plugin.ts).
  // Both this route and schedules.routes consume the same instance.
  const notificationsService = new NotificationsService(fastify.prisma);
  const sessionsController = new SessionsController(
    fastify.sessionsService,
    notificationsService,
  );

  // All sessions routes require authentication
  fastify.addHook("preHandler", authMiddleware);

  api.get("/", {
    schema: {
      querystring: z.object({
        startDate: z.string(),
        endDate: z.string(),
        classId: z.string().optional(),
        includeConflicts: z.enum(["true", "false"]).optional(),
      }),
      response: {
        200: ClassSessionListResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER", "STUDENT"])],
    handler: async (
      request: FastifyRequest<{
        Querystring: { startDate: string; endDate: string; classId?: string; includeConflicts?: string };
      }>,
      reply,
    ) => {
      try {
        const result = await sessionsController.listSessions(
          request.jwtPayload!,
          request.query.startDate,
          request.query.endDate,
          request.query.classId,
          request.query.includeConflicts === "true",
        );
        return reply.send(result);
      } catch (error: unknown) {
        request.log.error(error);
        if (error instanceof AppError) {
          return reply.status(error.statusCode as 500).send({ message: error.message });
        }
        const prismaErr = mapPrismaError(error);
        if (prismaErr) {
          return reply.status(prismaErr.statusCode as 500).send({ message: prismaErr.message });
        }
        return reply.status(500).send({ message: "Failed to list sessions" });
      }
    },
  });

  api.get("/week", {
    schema: {
      querystring: z.object({
        weekStart: z.string(),
        classId: z.string().optional(),
      }),
      response: {
        200: ClassSessionListResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER", "STUDENT"])],
    handler: async (
      request: FastifyRequest<{
        Querystring: { weekStart: string; classId?: string };
      }>,
      reply,
    ) => {
      try {
        const result = await sessionsController.getSessionsForWeek(
          request.jwtPayload!,
          request.query.weekStart,
          request.query.classId,
        );
        return reply.send(result);
      } catch (error: unknown) {
        request.log.error(error);
        if (error instanceof AppError) {
          return reply.status(error.statusCode as 500).send({ message: error.message });
        }
        const prismaErr = mapPrismaError(error);
        if (prismaErr) {
          return reply.status(prismaErr.statusCode as 500).send({ message: prismaErr.message });
        }
        return reply.status(500).send({ message: "Failed to get sessions for week" });
      }
    },
  });

  api.get("/:id", {
    schema: {
      params: z.object({
        id: z.string(),
      }),
      response: {
        200: ClassSessionResponseSchema,
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER", "STUDENT"])],
    handler: async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply,
    ) => {
      try {
        const result = await sessionsController.getSession(
          request.params.id,
          request.jwtPayload!,
        );
        return reply.send(result);
      } catch (error: unknown) {
        request.log.error(error);
        if (error instanceof AppError) {
          return reply.status(error.statusCode as 404).send({ message: error.message });
        }
        const prismaErr = mapPrismaError(error);
        if (prismaErr) {
          return reply.status(prismaErr.statusCode as 404).send({ message: prismaErr.message });
        }
        return reply.status(500).send({ message: "Failed to get session" });
      }
    },
  });

  api.post("/", {
    schema: {
      body: CreateClassSessionSchema,
      response: {
        201: ClassSessionResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN"])],
    handler: async (
      request: FastifyRequest<{ Body: CreateClassSessionInput }>,
      reply,
    ) => {
      try {
        const result = await sessionsController.createSession(
          request.body,
          request.jwtPayload!,
        );
        return reply.status(201).send(result);
      } catch (error: unknown) {
        request.log.error(error);
        if (error instanceof AppError) {
          return reply.status(error.statusCode as 400).send({ message: error.message });
        }
        const prismaErr = mapPrismaError(error);
        if (prismaErr) {
          return reply.status(prismaErr.statusCode as 400).send({ message: prismaErr.message });
        }
        return reply.status(500).send({ message: "Failed to create session" });
      }
    },
  });

  api.patch("/:id", {
    schema: {
      params: z.object({
        id: z.string(),
      }),
      body: UpdateClassSessionSchema,
      response: {
        200: ClassSessionResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        409: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"]), checkTeacherSessionAccess],
    handler: async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: UpdateClassSessionInput;
      }>,
      reply,
    ) => {
      try {
        const result = await sessionsController.updateSession(
          request.params.id,
          request.body,
          request.jwtPayload!,
        );
        return reply.send(result);
      } catch (error: unknown) {
        request.log.error(error);
        if (error instanceof AppError) {
          return reply.status(error.statusCode as 400).send({ message: error.message });
        }
        const prismaErr = mapPrismaError(error);
        if (prismaErr) {
          return reply.status(prismaErr.statusCode as 404).send({ message: prismaErr.message });
        }
        return reply.status(500).send({ message: "Failed to update session" });
      }
    },
  });

  // Cancel a single session (preserves record with CANCELLED status)
  api.post("/:id/cancel", {
    schema: {
      params: z.object({
        id: z.string(),
      }),
      response: {
        200: ClassSessionResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        409: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"]), checkTeacherSessionAccess],
    handler: async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply,
    ) => {
      try {
        const result = await sessionsController.cancelSession(
          request.params.id,
          request.jwtPayload!,
        );
        return reply.send(result);
      } catch (error: unknown) {
        request.log.error(error);
        if (error instanceof AppError) {
          return reply.status(error.statusCode as 409).send({ message: error.message });
        }
        const prismaErr = mapPrismaError(error);
        if (prismaErr) {
          return reply.status(prismaErr.statusCode as 404).send({ message: prismaErr.message });
        }
        return reply.status(500).send({ message: "Failed to cancel session" });
      }
    },
  });

  api.delete("/:id/future", {
    schema: {
      params: z.object({
        id: z.string(),
      }),
      response: {
        200: DeleteFutureSessionsResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN"])],
    handler: async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply,
    ) => {
      try {
        const result = await sessionsController.deleteFutureSessions(
          request.params.id,
          request.jwtPayload!,
        );
        return reply.send(result);
      } catch (error: unknown) {
        request.log.error(error);
        if (error instanceof AppError) {
          return reply.status(error.statusCode as 400).send({ message: error.message });
        }
        const prismaErr = mapPrismaError(error);
        if (prismaErr) {
          return reply.status(prismaErr.statusCode as 400).send({ message: prismaErr.message });
        }
        return reply.status(500).send({ message: "Failed to delete future sessions" });
      }
    },
  });

  api.delete("/:id", {
    schema: {
      params: z.object({
        id: z.string(),
      }),
      response: {
        200: z.object({
          message: z.string(),
        }),
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN"])],
    handler: async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply,
    ) => {
      try {
        const result = await sessionsController.deleteSession(
          request.params.id,
          request.jwtPayload!,
        );
        return reply.send(result);
      } catch (error: unknown) {
        request.log.error(error);
        if (error instanceof AppError) {
          return reply.status(error.statusCode as 404).send({ message: error.message });
        }
        const prismaErr = mapPrismaError(error);
        if (prismaErr) {
          return reply.status(prismaErr.statusCode as 404).send({ message: prismaErr.message });
        }
        return reply.status(500).send({ message: "Failed to delete session" });
      }
    },
  });

  // @deprecated — Use schedule creation (POST /schedules) which auto-generates sessions.
  // Kept for backward compatibility.
  api.post("/generate", {
    schema: {
      deprecated: true,
      description: "Deprecated: Use POST /schedules which auto-generates sessions. This endpoint will be removed in a future version.",
      body: GenerateSessionsSchema,
      response: {
        201: GenerateSessionsResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN"])],
    handler: async (
      request: FastifyRequest<{ Body: GenerateSessionsInput }>,
      reply,
    ) => {
      try {
        const result = await sessionsController.generateSessions(
          request.body,
          request.jwtPayload!,
        );
        return reply.status(201).send(result);
      } catch (error: unknown) {
        request.log.error(error);
        if (error instanceof AppError) {
          return reply.status(error.statusCode as 400).send({ message: error.message });
        }
        const prismaErr = mapPrismaError(error);
        if (prismaErr) {
          return reply.status(prismaErr.statusCode as 400).send({ message: prismaErr.message });
        }
        return reply.status(500).send({ message: "Failed to generate sessions" });
      }
    },
  });

  // Check for scheduling conflicts (room and teacher double-booking)
  api.post("/check-conflicts", {
    schema: {
      body: ConflictCheckInputSchema,
      response: {
        200: ConflictResultResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"])],
    handler: async (
      request: FastifyRequest<{ Body: ConflictCheckInput }>,
      reply,
    ) => {
      try {
        const result = await sessionsController.checkConflicts(
          request.body,
          request.jwtPayload!,
        );
        return reply.send(result);
      } catch (error: unknown) {
        request.log.error(error);
        if (error instanceof AppError) {
          return reply.status(error.statusCode as 400).send({ message: error.message });
        }
        const prismaErr = mapPrismaError(error);
        if (prismaErr) {
          return reply.status(prismaErr.statusCode as 400).send({ message: prismaErr.message });
        }
        return reply.status(500).send({ message: "Failed to check conflicts" });
      }
    },
  });
}
