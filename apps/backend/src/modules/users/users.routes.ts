import {
  BulkActionResponseSchema,
  BulkUserActionRequestSchema,
  CancelDeletionResponseSchema,
  ChangePasswordResponseSchema,
  ChangePasswordSchema,
  ChangeRoleRequestSchema,
  ChangeRoleResponseSchema,
  CsvExecuteRequestSchema,
  CsvExecuteResponseSchema,
  CsvImportDetailsResponseSchema,
  CsvImportHistoryQuerySchema,
  CsvImportHistoryResponseSchema,
  CsvImportStatusResponseSchema,
  CsvRetryRequestSchema,
  CsvRetryResponseSchema,
  CsvValidationResponseSchema,
  ErrorResponseSchema,
  InvitationListQuerySchema,
  InvitationListResponseSchema,
  RequestDeletionResponseSchema,
  UpdateProfileResponseSchema,
  UpdateProfileSchema,
  UserListQuerySchema,
  UserListResponseSchema,
  UserProfileResponseSchema,
  UserStatusResponseSchema,
  type BulkUserActionRequest,
  type ChangePasswordInput,
  type ChangeRoleRequest,
  type CsvExecuteRequest,
  type CsvImportHistoryQuery,
  type CsvRetryRequest,
  type UpdateProfileInput,
  type UserListQuery,
} from "@workspace/types";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import Env from "../../env.js";
import { AppError } from "../../errors/app-error.js";
import { mapPrismaError } from "../../errors/prisma-errors.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { CsvImportController } from "./csv-import.controller.js";
import { CsvImportService } from "./csv-import.service.js";
import { parentEmailRoutes } from "./parent-email.routes.js";
import { UsersController } from "./users.controller.js";
import { UsersService } from "./users.service.js";

export async function usersRoutes(fastify: FastifyInstance) {
  const api = fastify.withTypeProvider<ZodTypeProvider>();

  const usersService = new UsersService(fastify.prisma);
  const usersController = new UsersController(usersService);

  // Register parent email routes as child plugin
  await fastify.register(parentEmailRoutes, {
    prefix: "/:userId/parent-emails",
  });

  const csvImportService = new CsvImportService(fastify.prisma);
  const csvImportController = new CsvImportController(
    csvImportService,
    (uid) => usersService.resolveFirebaseUid(uid),
  );

  // All user routes require authentication
  fastify.addHook("preHandler", authMiddleware);

  // GET /api/v1/users - List users with filters, pagination
  api.get("/", {
    schema: {
      querystring: UserListQuerySchema,
      response: {
        200: UserListResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN"])],
    handler: async (
      request: FastifyRequest<{ Querystring: UserListQuery }>,
      reply,
    ) => {
      try {
        const result = await usersController.listUsers(
          request.query,
          request.jwtPayload!,
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
        return reply.status(500).send({ message: "Failed to list users" });
      }
    },
  });

  // GET /api/v1/users/invitations - List invitations
  api.get("/invitations", {
    schema: {
      querystring: InvitationListQuerySchema,
      response: {
        200: InvitationListResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN"])],
    handler: async (
      request: FastifyRequest<{ Querystring: { status?: string } }>,
      reply,
    ) => {
      try {
        const result = await usersController.listInvitations(
          request.query.status,
          request.jwtPayload!,
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
        return reply.status(500).send({ message: "Failed to list invitations" });
      }
    },
  });

  // POST /api/v1/users/invitations/:id/resend - Resend invitation
  api.post("/invitations/:id/resend", {
    schema: {
      params: z.object({
        id: z.string(),
      }),
      response: {
        200: z.object({
          data: z.object({
            id: z.string(),
            status: z.string(),
          }),
          message: z.string(),
        }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
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
        const result = await usersController.resendInvitation(
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
        return reply.status(500).send({ message: "Failed to resend invitation" });
      }
    },
  });

  // DELETE /api/v1/users/invitations/:id - Revoke invitation
  api.delete("/invitations/:id", {
    schema: {
      params: z.object({
        id: z.string(),
      }),
      response: {
        200: z.object({
          message: z.string(),
        }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
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
        const result = await usersController.revokeInvitation(
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
        return reply.status(500).send({ message: "Failed to revoke invitation" });
      }
    },
  });

  // PATCH /api/v1/users/me/profile - Update own profile
  api.patch("/me/profile", {
    schema: {
      body: UpdateProfileSchema,
      response: {
        200: UpdateProfileResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    handler: async (
      request: FastifyRequest<{ Body: UpdateProfileInput }>,
      reply,
    ) => {
      try {
        const result = await usersController.updateMyProfile(
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
        return reply.status(500).send({ message: "Failed to update profile" });
      }
    },
  });

  // GET /api/v1/users/me/has-password - Check if user has password provider
  api.get("/me/has-password", {
    schema: {
      response: {
        200: z.object({
          hasPassword: z.boolean(),
        }),
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const result = await usersController.hasPasswordProvider(
        request.jwtPayload!,
      );
      return reply.send(result);
    },
  });

  // POST /api/v1/users/me/change-password - Change own password
  api.post("/me/change-password", {
    schema: {
      body: ChangePasswordSchema,
      response: {
        200: ChangePasswordResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    handler: async (
      request: FastifyRequest<{ Body: ChangePasswordInput }>,
      reply,
    ) => {
      try {
        const env = fastify.getEnvs<Env>();
        if (!env.FIREBASE_API_KEY) {
          return reply
            .status(500)
            .send({ message: "Password change not configured" });
        }
        const result = await usersController.changeMyPassword(
          request.body,
          request.jwtPayload!,
          env.FIREBASE_API_KEY,
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
        return reply.status(500).send({ message: "Failed to change password" });
      }
    },
  });

  // POST /api/v1/users/me/request-deletion - Request account deletion
  api.post("/me/request-deletion", {
    schema: {
      response: {
        200: RequestDeletionResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const result = await usersController.requestMyDeletion(
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
        return reply.status(500).send({ message: "Failed to request deletion" });
      }
    },
  });

  // POST /api/v1/users/me/cancel-deletion - Cancel account deletion
  api.post("/me/cancel-deletion", {
    schema: {
      response: {
        200: CancelDeletionResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const result = await usersController.cancelMyDeletion(
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
        return reply.status(500).send({ message: "Failed to cancel deletion" });
      }
    },
  });

  // POST /api/v1/users/me/avatar - Upload profile avatar
  api.post("/me/avatar", {
    schema: {
      consumes: ["multipart/form-data"],
      body: z.object({
        file: z.any().describe("Avatar image file"),
      }),
      response: {
        200: z.object({
          data: z.object({ avatarUrl: z.string() }),
          message: z.string(),
        }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ message: "No file uploaded" });
      }

      const allowedMimetypes = [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
      ];
      if (!allowedMimetypes.includes(data.mimetype)) {
        return reply.status(400).send({
          message: "Invalid file type. Only PNG, JPG, and WEBP are allowed.",
        });
      }

      const buffer = await data.toBuffer();
      // 1MB limit
      if (buffer.length > 1 * 1024 * 1024) {
        return reply.status(400).send({
          message: "File too large. Maximum size is 1MB.",
        });
      }

      try {
        const userId = await usersService.resolveFirebaseUid(request.jwtPayload!.uid);
        const centerId = request.jwtPayload!.centerId;

        const bucket = fastify.firebaseStorage.bucket();
        const filePath = `centers/${centerId}/users/${userId}/avatar`;
        const file = bucket.file(filePath);

        // Delete old avatar if exists
        try {
          await file.delete();
        } catch {
          // File might not exist, ignore
        }

        await file.save(buffer, {
          metadata: {
            contentType: data.mimetype,
            cacheControl: "public, max-age=31536000",
          },
        });

        await file.makePublic();
        const avatarUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

        // Update user avatar in database
        await fastify.prisma.user.update({
          where: { id: userId },
          data: { avatarUrl },
        });

        return reply.status(200).send({
          data: { avatarUrl },
          message: "Avatar uploaded successfully",
        });
      } catch (error: unknown) {
        request.log.error(error);
        return reply.status(500).send({ message: "Failed to upload avatar" });
      }
    },
  });

  // GET /api/v1/users/:userId - Get single user profile
  api.get("/:userId", {
    schema: {
      params: z.object({
        userId: z.string(),
      }),
      response: {
        200: UserProfileResponseSchema,
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER", "STUDENT"])],
    handler: async (
      request: FastifyRequest<{ Params: { userId: string } }>,
      reply,
    ) => {
      try {
        const result = await usersController.getUser(
          request.params.userId,
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
        return reply.status(500).send({ message: "Failed to get user" });
      }
    },
  });

  // PATCH /api/v1/users/:userId/role - Change role (Owner only)
  api.patch("/:userId/role", {
    schema: {
      params: z.object({
        userId: z.string(),
      }),
      body: ChangeRoleRequestSchema,
      response: {
        200: ChangeRoleResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER"])],
    handler: async (
      request: FastifyRequest<{
        Params: { userId: string };
        Body: ChangeRoleRequest;
      }>,
      reply,
    ) => {
      try {
        const result = await usersController.changeRole(
          request.params.userId,
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
        return reply.status(500).send({ message: "Failed to change role" });
      }
    },
  });

  // PATCH /api/v1/users/:userId/deactivate - Deactivate user
  api.patch("/:userId/deactivate", {
    schema: {
      params: z.object({
        userId: z.string(),
      }),
      response: {
        200: UserStatusResponseSchema,
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
        const result = await usersController.deactivateUser(
          request.params.userId,
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
        return reply.status(500).send({ message: "Failed to deactivate user" });
      }
    },
  });

  // PATCH /api/v1/users/:userId/reactivate - Reactivate user
  api.patch("/:userId/reactivate", {
    schema: {
      params: z.object({
        userId: z.string(),
      }),
      response: {
        200: UserStatusResponseSchema,
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
        const result = await usersController.reactivateUser(
          request.params.userId,
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
        return reply.status(500).send({ message: "Failed to reactivate user" });
      }
    },
  });

  // POST /api/v1/users/bulk-deactivate - Bulk deactivate
  api.post("/bulk-deactivate", {
    schema: {
      body: BulkUserActionRequestSchema,
      response: {
        200: BulkActionResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN"])],
    handler: async (
      request: FastifyRequest<{ Body: BulkUserActionRequest }>,
      reply,
    ) => {
      try {
        const result = await usersController.bulkDeactivate(
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
        return reply.status(500).send({ message: "Failed to bulk deactivate" });
      }
    },
  });

  // POST /api/v1/users/bulk-remind - Bulk reminder
  api.post("/bulk-remind", {
    schema: {
      body: BulkUserActionRequestSchema,
      response: {
        200: BulkActionResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN"])],
    handler: async (
      request: FastifyRequest<{ Body: BulkUserActionRequest }>,
      reply,
    ) => {
      try {
        const result = await usersController.bulkRemind(
          request.body,
          request.jwtPayload!,
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
        return reply.status(500).send({ message: "Failed to send reminders" });
      }
    },
  });

  // ============================================================
  // CSV Import Routes
  // ============================================================

  // GET /api/v1/users/import/template - Download CSV template
  api.get("/import/template", {
    schema: {
      response: {
        200: z.string(),
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN"])],
    handler: async (_request, reply) => {
      const template = csvImportController.getTemplate();
      return reply
        .header("Content-Type", "text/csv")
        .header(
          "Content-Disposition",
          'attachment; filename="classlite-import-template.csv"',
        )
        .send(template);
    },
  });

  // POST /api/v1/users/import/validate - Upload & validate CSV
  api.post("/import/validate", {
    schema: {
      consumes: ["multipart/form-data"],
      body: z.object({
        file: z.any().describe("CSV file for import validation"),
      }),
      response: {
        200: CsvValidationResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN"])],
    handler: async (request, reply) => {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ message: "No file uploaded" });
      }

      // Validate file type
      const allowedMimetypes = ["text/csv", "application/csv", "text/plain"];
      if (!allowedMimetypes.includes(data.mimetype)) {
        return reply.status(400).send({
          message: "Invalid file type. Please upload a CSV file.",
        });
      }

      // Validate file extension
      const fileName = data.filename ?? "upload.csv";
      if (!fileName.toLowerCase().endsWith(".csv")) {
        return reply.status(400).send({
          message: "Invalid file type. Please upload a CSV file.",
        });
      }

      const buffer = await data.toBuffer();

      // Validate file size (5MB)
      if (buffer.length > 5 * 1024 * 1024) {
        return reply.status(400).send({
          message: "File too large. Maximum size is 5MB.",
        });
      }

      try {
        const result = await csvImportController.validateCsv(
          buffer,
          fileName,
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
        return reply.status(500).send({ message: "Failed to validate CSV" });
      }
    },
  });

  // POST /api/v1/users/import/execute - Queue import job
  api.post("/import/execute", {
    schema: {
      body: CsvExecuteRequestSchema,
      response: {
        200: CsvExecuteResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN"])],
    handler: async (
      request: FastifyRequest<{ Body: CsvExecuteRequest }>,
      reply,
    ) => {
      try {
        const result = await csvImportController.executeImport(
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
        return reply.status(500).send({ message: "Failed to execute import" });
      }
    },
  });

  // GET /api/v1/users/import/status/:importLogId - Poll job progress
  api.get("/import/status/:importLogId", {
    schema: {
      params: z.object({
        importLogId: z.string(),
      }),
      response: {
        200: CsvImportStatusResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN"])],
    handler: async (
      request: FastifyRequest<{ Params: { importLogId: string } }>,
      reply,
    ) => {
      try {
        const result = await csvImportController.getImportStatus(
          request.params.importLogId,
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
        return reply.status(500).send({ message: "Failed to get import status" });
      }
    },
  });

  // GET /api/v1/users/import/history - Paginated import history
  api.get("/import/history", {
    schema: {
      querystring: CsvImportHistoryQuerySchema,
      response: {
        200: CsvImportHistoryResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN"])],
    handler: async (
      request: FastifyRequest<{ Querystring: CsvImportHistoryQuery }>,
      reply,
    ) => {
      try {
        const result = await csvImportController.getImportHistory(
          request.query,
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
        return reply.status(500).send({ message: "Failed to get import history" });
      }
    },
  });

  // GET /api/v1/users/import/:id/details - Single import details
  api.get("/import/:id/details", {
    schema: {
      params: z.object({
        id: z.string(),
      }),
      response: {
        200: CsvImportDetailsResponseSchema,
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
        const result = await csvImportController.getImportDetails(
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
        return reply.status(500).send({ message: "Failed to get import details" });
      }
    },
  });

  // POST /api/v1/users/import/:id/retry - Retry failed rows
  api.post("/import/:id/retry", {
    schema: {
      params: z.object({
        id: z.string(),
      }),
      body: CsvRetryRequestSchema,
      response: {
        200: CsvRetryResponseSchema,
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
        Body: CsvRetryRequest;
      }>,
      reply,
    ) => {
      try {
        const result = await csvImportController.retryImport(
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
          return reply.status(prismaErr.statusCode as 400).send({ message: prismaErr.message });
        }
        return reply.status(500).send({ message: "Failed to retry import" });
      }
    },
  });
}
