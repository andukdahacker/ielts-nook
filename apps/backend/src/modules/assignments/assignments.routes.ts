import {
  CreateAssignmentSchema,
  UpdateAssignmentSchema,
  ReopenAssignmentSchema,
  AssignmentStatusSchema,
  ErrorResponseSchema,
} from "@workspace/types";
import { FastifyInstance, FastifyReply } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { AppError } from "../../errors/app-error.js";
import { mapPrismaError } from "../../errors/prisma-errors.js";
import { AssignmentsController } from "./assignments.controller.js";
import { AssignmentsService } from "./assignments.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import z from "zod";

function handleRouteError(error: unknown, request: { log: { error: (e: unknown) => void } }, reply: FastifyReply) {
  request.log.error(error);
  if (error instanceof AppError) {
    return reply
      .status(error.statusCode as 500)
      .send({ message: error.message });
  }
  const mapped = mapPrismaError(error);
  if (mapped) {
    return reply
      .status(mapped.statusCode as 500)
      .send({ message: mapped.message });
  }
  return reply.status(500).send({ message: "Internal server error" });
}

export async function assignmentsRoutes(fastify: FastifyInstance) {
  const api = fastify.withTypeProvider<ZodTypeProvider>();

  const notificationsService = new NotificationsService(fastify.prisma);
  const service = new AssignmentsService(fastify.prisma, notificationsService);
  const controller = new AssignmentsController(service);

  // All routes require authentication + teacher/owner role (admin removed per Story 15-2)
  fastify.addHook("preHandler", authMiddleware);

  // CRITICAL: Register literal POST routes BEFORE parameterized routes
  // Fastify radix tree router matches literal segments before parameter segments

  // POST /counts-by-exercise - Get assignment counts for exercise IDs
  api.post("/counts-by-exercise", {
    schema: {
      body: z.object({
        exerciseIds: z.array(z.string()).min(1).max(200),
      }),
      response: {
        200: z.object({ data: z.array(z.object({ exerciseId: z.string(), count: z.number() })), message: z.string() }),
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "TEACHER"])],
    handler: async (request, reply) => {
      try {
        const { exerciseIds } = request.body as { exerciseIds: string[] };
        const result = await controller.getCountsByExercise(exerciseIds, request.jwtPayload!);
        return reply.send(result);
      } catch (error: unknown) {
        return handleRouteError(error, request, reply);
      }
    },
  });

  // GET / - List assignments
  api.get("/", {
    schema: {
      querystring: z.object({
        exerciseId: z.string().optional(),
        classId: z.string().optional(),
        status: AssignmentStatusSchema.optional(),
        skill: z.string().optional(),
        dueDateStart: z.string().datetime().optional(),
        dueDateEnd: z.string().datetime().optional(),
      }),
      response: {
        200: z.object({ data: z.array(z.unknown()), message: z.string() }),
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "TEACHER"])],
    handler: async (request, reply) => {
      try {
        const filters = request.query as {
          exerciseId?: string;
          classId?: string;
          status?: "OPEN" | "CLOSED" | "ARCHIVED";
          skill?: string;
          dueDateStart?: string;
          dueDateEnd?: string;
        };
        const result = await controller.list(request.jwtPayload!, filters);
        return reply.send(result);
      } catch (error: unknown) {
        return handleRouteError(error, request, reply);
      }
    },
  });

  // POST / - Create assignment(s)
  api.post("/", {
    schema: {
      body: CreateAssignmentSchema,
      response: {
        200: z.object({ data: z.array(z.unknown()), message: z.string() }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "TEACHER"])],
    handler: async (request, reply) => {
      try {
        const result = await controller.create(request.body as Parameters<typeof controller.create>[0], request.jwtPayload!);
        return reply.send(result);
      } catch (error: unknown) {
        return handleRouteError(error, request, reply);
      }
    },
  });

  // GET /:id - Get single assignment with student list
  api.get("/:id", {
    schema: {
      params: z.object({ id: z.string() }),
      response: {
        200: z.object({ data: z.unknown(), message: z.string() }),
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "TEACHER"])],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const result = await controller.get(id, request.jwtPayload!);
        return reply.send(result);
      } catch (error: unknown) {
        return handleRouteError(error, request, reply);
      }
    },
  });

  // PATCH /:id - Update assignment
  api.patch("/:id", {
    schema: {
      params: z.object({ id: z.string() }),
      body: UpdateAssignmentSchema,
      response: {
        200: z.object({ data: z.unknown(), message: z.string() }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "TEACHER"])],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const result = await controller.update(id, request.body as Parameters<typeof controller.update>[1], request.jwtPayload!);
        return reply.send(result);
      } catch (error: unknown) {
        return handleRouteError(error, request, reply);
      }
    },
  });

  // POST /:id/close - Close assignment
  api.post("/:id/close", {
    schema: {
      params: z.object({ id: z.string() }),
      response: {
        200: z.object({ data: z.unknown(), message: z.string() }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "TEACHER"])],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const result = await controller.close(id, request.jwtPayload!);
        return reply.send(result);
      } catch (error: unknown) {
        return handleRouteError(error, request, reply);
      }
    },
  });

  // POST /:id/reopen - Reopen assignment
  api.post("/:id/reopen", {
    schema: {
      params: z.object({ id: z.string() }),
      body: ReopenAssignmentSchema,
      response: {
        200: z.object({ data: z.unknown(), message: z.string() }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "TEACHER"])],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const result = await controller.reopen(id, request.body as { dueDate?: string | null }, request.jwtPayload!);
        return reply.send(result);
      } catch (error: unknown) {
        return handleRouteError(error, request, reply);
      }
    },
  });

  // POST /:id/archive - Archive assignment
  api.post("/:id/archive", {
    schema: {
      params: z.object({ id: z.string() }),
      response: {
        200: z.object({ data: z.unknown(), message: z.string() }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "TEACHER"])],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const result = await controller.archive(id, request.jwtPayload!);
        return reply.send(result);
      } catch (error: unknown) {
        return handleRouteError(error, request, reply);
      }
    },
  });

  // DELETE /:id - Delete assignment
  api.delete("/:id", {
    schema: {
      params: z.object({ id: z.string() }),
      response: {
        200: z.object({ data: z.null(), message: z.string() }),
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "TEACHER"])],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const result = await controller.delete(id, request.jwtPayload!);
        return reply.send(result);
      } catch (error: unknown) {
        return handleRouteError(error, request, reply);
      }
    },
  });
}
