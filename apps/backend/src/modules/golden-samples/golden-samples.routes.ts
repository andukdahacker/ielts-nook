import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { GoldenSamplesService } from "./golden-samples.service.js";
import { GoldenSamplesController } from "./golden-samples.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import {
  ErrorResponseSchema,
  CreateGoldenSampleSchema,
  UpdateGoldenSampleSchema,
  ReorderGoldenSamplesSchema,
  GoldenSampleResponseSchema,
  GoldenSampleListResponseSchema,
  GoldenSampleNullResponseSchema,
} from "@workspace/types";

export async function goldenSamplesRoutes(fastify: FastifyInstance) {
  const api = fastify.withTypeProvider<ZodTypeProvider>();

  api.addHook("preHandler", authMiddleware);

  const service = new GoldenSamplesService(fastify.prisma);
  const controller = new GoldenSamplesController(service);

  // GET /api/v1/golden-samples — List all samples
  api.get(
    "/",
    {
      schema: {
        response: {
          200: GoldenSampleListResponseSchema,
          400: ErrorResponseSchema,
        },
      },
      preHandler: [requireRole(["OWNER"])],
    },
    async (request, reply) => {
      const centerId = request.jwtPayload!.centerId;
      if (!centerId) {
        return reply.status(400).send({ message: "No center associated" });
      }
      const result = await controller.list(centerId);
      return reply.send(result);
    },
  );

  // GET /api/v1/golden-samples/:id — Get single sample
  api.get(
    "/:id",
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: {
          200: GoldenSampleResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
      preHandler: [requireRole(["OWNER"])],
    },
    async (request, reply) => {
      const centerId = request.jwtPayload!.centerId;
      if (!centerId) {
        return reply.status(400).send({ message: "No center associated" });
      }
      try {
        const result = await controller.getById(centerId, request.params.id);
        return reply.send(result);
      } catch (error) {
        if (error instanceof Error && error.message === "Golden sample not found") {
          return reply.status(404).send({ message: "Golden sample not found" });
        }
        throw error;
      }
    },
  );

  // POST /api/v1/golden-samples — Create sample
  api.post(
    "/",
    {
      schema: {
        body: CreateGoldenSampleSchema,
        response: {
          201: GoldenSampleResponseSchema,
          400: ErrorResponseSchema,
        },
      },
      preHandler: [requireRole(["OWNER"])],
    },
    async (request, reply) => {
      const centerId = request.jwtPayload!.centerId;
      if (!centerId) {
        return reply.status(400).send({ message: "No center associated" });
      }
      try {
        const result = await controller.create(centerId, request.body);
        return reply.status(201).send(result);
      } catch (error) {
        return reply.status(400).send({
          message: error instanceof Error ? error.message : "Failed to create golden sample",
        });
      }
    },
  );

  // PATCH /api/v1/golden-samples/:id — Update sample
  api.patch(
    "/:id",
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: UpdateGoldenSampleSchema,
        response: {
          200: GoldenSampleResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
      preHandler: [requireRole(["OWNER"])],
    },
    async (request, reply) => {
      const centerId = request.jwtPayload!.centerId;
      if (!centerId) {
        return reply.status(400).send({ message: "No center associated" });
      }
      try {
        const result = await controller.update(centerId, request.params.id, request.body);
        return reply.send(result);
      } catch (error) {
        if (error instanceof Error && error.message === "Golden sample not found") {
          return reply.status(404).send({ message: "Golden sample not found" });
        }
        throw error;
      }
    },
  );

  // DELETE /api/v1/golden-samples/:id — Delete sample
  api.delete(
    "/:id",
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: {
          200: GoldenSampleNullResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
      preHandler: [requireRole(["OWNER"])],
    },
    async (request, reply) => {
      const centerId = request.jwtPayload!.centerId;
      if (!centerId) {
        return reply.status(400).send({ message: "No center associated" });
      }
      try {
        const result = await controller.delete(centerId, request.params.id);
        return reply.send(result);
      } catch (error) {
        if (error instanceof Error && error.message === "Golden sample not found") {
          return reply.status(404).send({ message: "Golden sample not found" });
        }
        throw error;
      }
    },
  );

  // POST /api/v1/golden-samples/reorder — Reorder samples
  api.post(
    "/reorder",
    {
      schema: {
        body: ReorderGoldenSamplesSchema,
        response: {
          200: GoldenSampleNullResponseSchema,
          400: ErrorResponseSchema,
        },
      },
      preHandler: [requireRole(["OWNER"])],
    },
    async (request, reply) => {
      const centerId = request.jwtPayload!.centerId;
      if (!centerId) {
        return reply.status(400).send({ message: "No center associated" });
      }
      try {
        const result = await controller.reorder(centerId, request.body.ids);
        return reply.send(result);
      } catch (error) {
        return reply.status(400).send({
          message: error instanceof Error ? error.message : "Failed to reorder golden samples",
        });
      }
    },
  );
}
