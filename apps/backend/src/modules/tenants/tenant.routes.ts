import crypto from "node:crypto";
import {
  CreateTenantInput,
  CreateTenantSchema,
  UpdateCenterInput,
  UpdateCenterSchema,
  TenantResponseSchema,
  ErrorResponseSchema,
} from "@workspace/types";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import Env from "../../env.js";
import { TenantController } from "./tenant.controller.js";
import { TenantService } from "./tenant.service.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { AppError } from "../../errors/app-error.js";
import { mapPrismaError } from "../../errors/prisma-errors.js";

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function tenantRoutes(fastify: FastifyInstance) {
  const env = fastify.getEnvs<Env>();
  const api = fastify.withTypeProvider<ZodTypeProvider>();

  const tenantService = new TenantService(
    fastify.prisma,
    fastify.firebaseAuth,
    fastify.firebaseStorage,
    fastify.resend,
    {
      emailFrom: env.EMAIL_FROM || "ClassLite <no-reply@notifications.classlite.app>",
      bucketName: env.FIREBASE_STORAGE_BUCKET,
    },
  );
  const tenantController = new TenantController(tenantService);

  api.get("/:id", {
    schema: {
      params: z.object({ id: z.string() }),
      response: {
        200: TenantResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [
      authMiddleware,
      // Intentional: all roles allowed — requireRole used for RBAC documentation and middleware chain consistency
      requireRole(["OWNER", "ADMIN", "TEACHER", "STUDENT"]),
    ],
    handler: async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      const { id } = request.params;

      if (request.jwtPayload?.centerId !== id) {
        return reply.status(403).send({
          message: "Forbidden: Cannot access other center",
        });
      }

      try {
        const result = await tenantController.getTenant(id);
        return reply.status(200).send(result);
      } catch (error: unknown) {
        request.log.error(error);
        if (error instanceof AppError) {
          return reply.status(error.statusCode as 404).send({ message: error.message });
        }
        const prismaErr = mapPrismaError(error);
        if (prismaErr) {
          return reply.status(prismaErr.statusCode as 404).send({ message: prismaErr.message });
        }
        return reply.status(500).send({ message: "Failed to fetch tenant" });
      }
    },
  });

  api.post("/", {
    schema: {
      body: CreateTenantSchema,
      response: {
        201: TenantResponseSchema,
        401: ErrorResponseSchema,
        409: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      headers: z.object({
        "x-platform-admin-key": z.string(),
      }),
    },
    preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
      const adminKey = request.headers["x-platform-admin-key"];
      if (
        typeof adminKey !== "string" ||
        !safeCompare(adminKey, env.PLATFORM_ADMIN_API_KEY)
      ) {
        return reply
          .status(401)
          .send({ message: "Unauthorized: Invalid platform admin key" });
      }
    },
    handler: async (
      request: FastifyRequest<{ Body: CreateTenantInput }>,
      reply: FastifyReply,
    ) => {
      try {
        const result = await tenantController.provision(request.body);
        return reply.status(201).send(result);
      } catch (error: unknown) {
        request.log.error(error);
        if (error instanceof AppError) {
          return reply.status(error.statusCode as 409).send({ message: error.message });
        }
        const prismaErr = mapPrismaError(error);
        if (prismaErr) {
          return reply.status(prismaErr.statusCode as 409).send({ message: prismaErr.message });
        }
        return reply.status(500).send({
          message: "Failed to provision tenant",
        });
      }
    },
  });

  api.patch("/:id", {
    schema: {
      params: z.object({ id: z.string() }),
      body: UpdateCenterSchema,
      response: {
        200: TenantResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [authMiddleware, requireRole(["OWNER", "ADMIN"])],
    handler: async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: UpdateCenterInput;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const { id } = request.params;

        // Security check: ensure user belongs to this center
        if (request.jwtPayload?.centerId !== id) {
          return reply.status(403).send({
            message: "Forbidden: Cannot update other center",
          });
        }

        const result = await tenantController.update(id, request.body);
        return reply.status(200).send(result);
      } catch (error: unknown) {
        request.log.error(error);
        if (error instanceof AppError) {
          return reply.status(error.statusCode as 400).send({ message: error.message });
        }
        const prismaErr = mapPrismaError(error);
        if (prismaErr) {
          return reply.status(prismaErr.statusCode as 404).send({ message: prismaErr.message });
        }
        return reply.status(500).send({
          message: "Failed to update center",
        });
      }
    },
  });

  api.post("/:id/logo", {
    schema: {
      consumes: ["multipart/form-data"],
      params: z.object({ id: z.string() }),
      body: z.object({
        file: z.any().describe("Logo image file (PNG or JPG)"),
      }),
      response: {
        200: z.object({
          data: z.object({ logoUrl: z.string() }),
          message: z.string(),
        }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [authMiddleware, requireRole(["OWNER", "ADMIN"])],
    handler: async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      const { id } = request.params;

      if (request.jwtPayload?.centerId !== id) {
        return reply.status(403).send({
          message: "Forbidden: Cannot update other center",
        });
      }

      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ message: "No file uploaded" });
      }

      const allowedMimetypes = ["image/png", "image/jpeg", "image/jpg"];
      if (!allowedMimetypes.includes(data.mimetype)) {
        return reply.status(400).send({
          message: "Invalid file type. Only PNG and JPG are allowed.",
        });
      }

      try {
        const buffer = await data.toBuffer();
        const logoUrl = await tenantService.uploadLogo(
          id,
          buffer,
          data.mimetype,
        );

        return reply.status(200).send({
          data: { logoUrl },
          message: "Logo uploaded successfully",
        });
      } catch (error: unknown) {
        request.log.error(error);
        return reply.status(500).send({ message: "Failed to upload logo" });
      }
    },
  });
}
