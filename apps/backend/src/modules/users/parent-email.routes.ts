import {
  AddParentEmailSchema,
  ErrorResponseSchema,
  ParentEmailSchema,
  type AddParentEmailInput,
} from "@workspace/types";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { AppError } from "../../errors/app-error.js";
import { mapPrismaError } from "../../errors/prisma-errors.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { ParentEmailService } from "./parent-email.service.js";

export async function parentEmailRoutes(fastify: FastifyInstance) {
  const api = fastify.withTypeProvider<ZodTypeProvider>();
  const service = new ParentEmailService(fastify.prisma);

  // GET /api/v1/users/:userId/parent-emails
  api.get("/", {
    schema: {
      params: z.object({ userId: z.string() }),
      response: {
        200: z.object({
          data: z.array(ParentEmailSchema),
          message: z.string(),
        }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN"])],
    handler: async (
      request: FastifyRequest<{ Params: { userId: string } }>,
      reply,
    ) => {
      try {
        const payload = request.jwtPayload!;
        if (!payload.centerId) {
          return reply
            .status(400)
            .send({ message: "Center ID required" });
        }
        const emails = await service.listParentEmails(
          payload.centerId,
          request.params.userId,
        );
        return reply.send({
          data: emails.map((e) => ({
            ...e,
            createdAt: e.createdAt.toISOString(),
          })),
          message: "Parent emails retrieved",
        });
      } catch (error: unknown) {
        request.log.error(error);
        if (error instanceof AppError) {
          return reply
            .status(error.statusCode as 404)
            .send({ message: error.message });
        }
        const prismaErr = mapPrismaError(error);
        if (prismaErr) {
          return reply
            .status(prismaErr.statusCode as 500)
            .send({ message: prismaErr.message });
        }
        return reply
          .status(500)
          .send({ message: "Failed to list parent emails" });
      }
    },
  });

  // POST /api/v1/users/:userId/parent-emails
  api.post("/", {
    schema: {
      params: z.object({ userId: z.string() }),
      body: AddParentEmailSchema,
      response: {
        201: z.object({
          data: ParentEmailSchema,
          message: z.string(),
        }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        409: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN"])],
    handler: async (
      request: FastifyRequest<{
        Params: { userId: string };
        Body: AddParentEmailInput;
      }>,
      reply,
    ) => {
      try {
        const payload = request.jwtPayload!;
        if (!payload.centerId) {
          return reply
            .status(400)
            .send({ message: "Center ID required" });
        }
        const result = await service.addParentEmail(
          payload.centerId,
          request.params.userId,
          request.body.email,
        );
        return reply.status(201).send({
          data: {
            ...result,
            createdAt: result.createdAt.toISOString(),
          },
          message: "Parent email added",
        });
      } catch (error: unknown) {
        request.log.error(error);
        if (error instanceof AppError) {
          return reply
            .status(error.statusCode as 400)
            .send({ message: error.message });
        }
        const prismaErr = mapPrismaError(error);
        if (prismaErr) {
          return reply
            .status(prismaErr.statusCode as 400)
            .send({ message: prismaErr.message });
        }
        return reply
          .status(500)
          .send({ message: "Failed to add parent email" });
      }
    },
  });

  // DELETE /api/v1/users/:userId/parent-emails/:parentEmailId
  api.delete("/:parentEmailId", {
    schema: {
      params: z.object({
        userId: z.string(),
        parentEmailId: z.string(),
      }),
      response: {
        200: z.object({ message: z.string() }),
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
        Params: { userId: string; parentEmailId: string };
      }>,
      reply,
    ) => {
      try {
        const payload = request.jwtPayload!;
        if (!payload.centerId) {
          return reply
            .status(400)
            .send({ message: "Center ID required" });
        }
        await service.removeParentEmail(
          payload.centerId,
          request.params.userId,
          request.params.parentEmailId,
        );
        return reply.send({ message: "Parent email removed" });
      } catch (error: unknown) {
        request.log.error(error);
        if (error instanceof AppError) {
          return reply
            .status(error.statusCode as 404)
            .send({ message: error.message });
        }
        const prismaErr = mapPrismaError(error);
        if (prismaErr) {
          return reply
            .status(prismaErr.statusCode as 500)
            .send({ message: prismaErr.message });
        }
        return reply
          .status(500)
          .send({ message: "Failed to remove parent email" });
      }
    },
  });
}
