import {
  CreateClassScheduleSchema,
  UpdateClassScheduleSchema,
  ClassScheduleResponseSchema,
  ClassScheduleListResponseSchema,
  CreateScheduleResponseSchema,
  ErrorResponseSchema,
  UpdateClassScheduleInput,
  CreateClassScheduleInput,
} from "@workspace/types";
import { FastifyInstance, FastifyRequest } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { SchedulesController } from "./schedules.controller.js";
import { SchedulesService } from "./schedules.service.js";
import z from "zod";

export async function schedulesRoutes(fastify: FastifyInstance) {
  const api = fastify.withTypeProvider<ZodTypeProvider>();

  // Reuse the shared SessionsService singleton (decorated by services.plugin)
  // so schedule create/update goes through the same in-memory cache as
  // sessions.routes — no risk of multiple in-flight instances drifting.
  const schedulesService = new SchedulesService(
    fastify.prisma,
    fastify.sessionsService,
  );
  const schedulesController = new SchedulesController(schedulesService);

  // All schedules routes require authentication
  fastify.addHook("preHandler", authMiddleware);

  api.get("/", {
    schema: {
      querystring: z.object({
        classId: z.string().optional(),
      }),
      response: {
        200: ClassScheduleListResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    handler: async (
      request: FastifyRequest<{ Querystring: { classId?: string } }>,
      reply,
    ) => {
      const result = await schedulesController.listSchedules(
        request.jwtPayload!,
        request.query.classId,
      );
      return reply.send(result);
    },
  });

  api.get("/:id", {
    schema: {
      params: z.object({
        id: z.string(),
      }),
      response: {
        200: ClassScheduleResponseSchema,
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    handler: async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply,
    ) => {
      const result = await schedulesController.getSchedule(
        request.params.id,
        request.jwtPayload!,
      );
      return reply.send(result);
    },
  });

  api.post("/", {
    schema: {
      body: CreateClassScheduleSchema,
      response: {
        201: CreateScheduleResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN"])],
    handler: async (
      request: FastifyRequest<{ Body: CreateClassScheduleInput }>,
      reply,
    ) => {
      const result = await schedulesController.createSchedule(
        request.body,
        request.jwtPayload!,
        request.log,
      );
      return reply.status(201).send(result);
    },
  });

  api.patch("/:id", {
    schema: {
      params: z.object({
        id: z.string(),
      }),
      body: UpdateClassScheduleSchema,
      response: {
        200: ClassScheduleResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN"])],
    handler: async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: UpdateClassScheduleInput;
      }>,
      reply,
    ) => {
      const result = await schedulesController.updateSchedule(
        request.params.id,
        request.body,
        request.jwtPayload!,
      );
      return reply.send(result);
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
      const result = await schedulesController.deleteSchedule(
        request.params.id,
        request.jwtPayload!,
      );
      return reply.send(result);
    },
  });
}
