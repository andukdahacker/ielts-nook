import {
  CreateExerciseSchema,
  UpdateExerciseSchema,
  AutosaveExerciseSchema,
  ExerciseResponseSchema,
  ExerciseListResponseSchema,
  ExerciseTagListResponseSchema,
  SetExerciseTagsSchema,
  ErrorResponseSchema,
  CreateExerciseInput,
  UpdateExerciseInput,
  AutosaveExerciseInput,
  ExerciseSkillSchema,
  ExerciseStatusSchema,
  BandLevelSchema,
  IeltsQuestionTypeSchema,
  SetExerciseTagsInput,
  BulkExerciseIdsSchema,
  BulkTagSchema,
  BulkResultResponseSchema,
  BulkDuplicateResponseSchema,
} from "@workspace/types";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { AppError } from "../../errors/app-error.js";
import { mapPrismaError } from "../../errors/prisma-errors.js";
import { ExercisesController } from "./exercises.controller.js";
import { ExercisesService } from "./exercises.service.js";
import { TagsController } from "./tags.controller.js";
import { TagsService } from "./tags.service.js";
import Env from "../../env.js";
import z from "zod";

export async function exercisesRoutes(fastify: FastifyInstance) {
  const env = fastify.getEnvs<Env>();
  const api = fastify.withTypeProvider<ZodTypeProvider>();

  const exercisesService = new ExercisesService(
    fastify.prisma,
    fastify.firebaseStorage,
    env.FIREBASE_STORAGE_BUCKET,
  );
  const exercisesController = new ExercisesController(exercisesService);
  const tagsService = new TagsService(fastify.prisma);
  const tagsController = new TagsController(tagsService);

  // All exercises routes require authentication
  fastify.addHook("preHandler", authMiddleware);

  // GET / - List exercises
  api.get("/", {
    schema: {
      querystring: z.object({
        skill: ExerciseSkillSchema.optional(),
        status: ExerciseStatusSchema.optional(),
        bandLevel: BandLevelSchema.optional(),
        tagIds: z.string().optional(),
        questionType: IeltsQuestionTypeSchema.optional(),
        excludeArchived: z.coerce.boolean().optional(),
      }),
      response: {
        200: ExerciseListResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"])],
    handler: async (request, reply) => {
      try {
        const { skill, status, bandLevel, tagIds, questionType, excludeArchived } = request.query as {
          skill?: string;
          status?: string;
          bandLevel?: string;
          tagIds?: string;
          questionType?: string;
          excludeArchived?: boolean;
        };
        const tagIdsArray = tagIds?.split(",").filter(Boolean);
        const result = await exercisesController.listExercises(
          request.jwtPayload!,
          { skill, status, bandLevel, tagIds: tagIdsArray, questionType, excludeArchived },
        );
        return reply.send(result);
      } catch (error: unknown) {
        request.log.error(error);
        if (error instanceof AppError) {
          return reply
            .status(error.statusCode as 500)
            .send({ message: error.message });
        }
        const prismaErr = mapPrismaError(error);
        if (prismaErr) {
          return reply
            .status(prismaErr.statusCode as 500)
            .send({ message: prismaErr.message });
        }
        return reply.status(500).send({ message: "Failed to list exercises" });
      }
    },
  });

  // GET /:id - Get exercise with sections/questions
  api.get("/:id", {
    schema: {
      params: z.object({
        id: z.string(),
      }),
      response: {
        200: ExerciseResponseSchema,
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"])],
    handler: async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply,
    ) => {
      try {
        const result = await exercisesController.getExercise(
          request.params.id,
          request.jwtPayload!,
        );
        return reply.send(result);
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
            .status(prismaErr.statusCode as 404)
            .send({ message: prismaErr.message });
        }
        return reply
          .status(500)
          .send({ message: "Failed to get exercise" });
      }
    },
  });

  // GET /:id/has-submissions - Check if exercise has any student submissions
  const HasSubmissionsResponseSchema = z.object({ data: z.boolean() });
  api.get("/:id/has-submissions", {
    schema: {
      params: z.object({
        id: z.string(),
      }),
      response: {
        200: HasSubmissionsResponseSchema,
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"])],
    handler: async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply,
    ) => {
      try {
        const result = await exercisesController.hasSubmissions(
          request.params.id,
          request.jwtPayload!,
        );
        return reply.send(result);
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
          .send({ message: "Failed to check exercise submissions" });
      }
    },
  });

  // POST / - Create exercise
  api.post("/", {
    schema: {
      body: CreateExerciseSchema,
      response: {
        201: ExerciseResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"])],
    handler: async (
      request: FastifyRequest<{ Body: CreateExerciseInput }>,
      reply,
    ) => {
      try {
        const result = await exercisesController.createExercise(
          request.body,
          request.jwtPayload!,
        );
        return reply.status(201).send(result);
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
          .send({ message: "Failed to create exercise" });
      }
    },
  });

  // POST /bulk-archive - Bulk archive exercises
  api.post("/bulk-archive", {
    schema: {
      body: BulkExerciseIdsSchema,
      response: {
        200: BulkResultResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"])],
    handler: async (request, reply) => {
      try {
        const { exerciseIds } = request.body as { exerciseIds: string[] };
        const result = await exercisesController.bulkArchive(exerciseIds, request.jwtPayload!);
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
        return reply.status(500).send({ message: "Failed to bulk archive exercises" });
      }
    },
  });

  // POST /bulk-duplicate - Bulk duplicate exercises
  api.post("/bulk-duplicate", {
    schema: {
      body: BulkExerciseIdsSchema,
      response: {
        200: BulkDuplicateResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"])],
    handler: async (request, reply) => {
      try {
        const { exerciseIds } = request.body as { exerciseIds: string[] };
        const result = await exercisesController.bulkDuplicate(exerciseIds, request.jwtPayload!);
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
        return reply.status(500).send({ message: "Failed to bulk duplicate exercises" });
      }
    },
  });

  // POST /bulk-tag - Bulk tag exercises
  api.post("/bulk-tag", {
    schema: {
      body: BulkTagSchema,
      response: {
        200: BulkResultResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"])],
    handler: async (request, reply) => {
      try {
        const { exerciseIds, tagIds } = request.body as { exerciseIds: string[]; tagIds: string[] };
        const result = await exercisesController.bulkTag(exerciseIds, tagIds, request.jwtPayload!);
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
        return reply.status(500).send({ message: "Failed to bulk tag exercises" });
      }
    },
  });

  // PATCH /:id - Update exercise
  api.patch("/:id", {
    schema: {
      params: z.object({
        id: z.string(),
      }),
      body: UpdateExerciseSchema,
      response: {
        200: ExerciseResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"])],
    handler: async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: UpdateExerciseInput;
      }>,
      reply,
    ) => {
      try {
        const result = await exercisesController.updateExercise(
          request.params.id,
          request.body,
          request.jwtPayload!,
        );
        return reply.send(result);
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
          .send({ message: "Failed to update exercise" });
      }
    },
  });

  // PATCH /:id/autosave - Auto-save exercise
  api.patch("/:id/autosave", {
    schema: {
      params: z.object({
        id: z.string(),
      }),
      body: AutosaveExerciseSchema,
      response: {
        200: ExerciseResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"])],
    handler: async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: AutosaveExerciseInput;
      }>,
      reply,
    ) => {
      try {
        const result = await exercisesController.autosaveExercise(
          request.params.id,
          request.body,
          request.jwtPayload!,
        );
        return reply.send(result);
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
          .send({ message: "Failed to auto-save exercise" });
      }
    },
  });

  // DELETE /:id - Delete exercise
  api.delete("/:id", {
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
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"])],
    handler: async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply,
    ) => {
      try {
        const result = await exercisesController.deleteExercise(
          request.params.id,
          request.jwtPayload!,
        );
        return reply.send(result);
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
            .status(prismaErr.statusCode as 404)
            .send({ message: prismaErr.message });
        }
        return reply
          .status(500)
          .send({ message: "Failed to delete exercise" });
      }
    },
  });

  // POST /:id/publish - Publish exercise
  api.post("/:id/publish", {
    schema: {
      params: z.object({
        id: z.string(),
      }),
      response: {
        200: ExerciseResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"])],
    handler: async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply,
    ) => {
      try {
        const result = await exercisesController.publishExercise(
          request.params.id,
          request.jwtPayload!,
        );
        return reply.send(result);
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
          .send({ message: "Failed to publish exercise" });
      }
    },
  });

  // POST /:id/archive - Archive exercise
  api.post("/:id/archive", {
    schema: {
      params: z.object({
        id: z.string(),
      }),
      response: {
        200: ExerciseResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"])],
    handler: async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply,
    ) => {
      try {
        const result = await exercisesController.archiveExercise(
          request.params.id,
          request.jwtPayload!,
        );
        return reply.send(result);
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
          .send({ message: "Failed to archive exercise" });
      }
    },
  });

  // POST /:id/duplicate - Duplicate exercise
  api.post("/:id/duplicate", {
    schema: {
      params: z.object({
        id: z.string(),
      }),
      response: {
        201: ExerciseResponseSchema,
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"])],
    handler: async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply,
    ) => {
      try {
        const result = await exercisesController.duplicateExercise(
          request.params.id,
          request.jwtPayload!,
        );
        return reply.status(201).send(result);
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
          .send({ message: "Failed to duplicate exercise" });
      }
    },
  });

  // POST /:id/restore - Restore archived exercise to Draft
  api.post("/:id/restore", {
    schema: {
      params: z.object({
        id: z.string(),
      }),
      response: {
        200: ExerciseResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"])],
    handler: async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply,
    ) => {
      try {
        const result = await exercisesController.restoreExercise(
          request.params.id,
          request.jwtPayload!,
        );
        return reply.send(result);
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
          .send({ message: "Failed to restore exercise" });
      }
    },
  });

  // POST /:exerciseId/diagram - Upload diagram image for R14
  api.post("/:exerciseId/diagram", {
    schema: {
      consumes: ["multipart/form-data"],
      params: z.object({
        exerciseId: z.string(),
      }),
      body: z.object({
        file: z.any().describe("Diagram image file (PNG or JPG)"),
      }),
      response: {
        200: z.object({
          data: z.object({ diagramUrl: z.string() }),
          message: z.string(),
        }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"])],
    handler: async (
      request: FastifyRequest<{ Params: { exerciseId: string } }>,
      reply: FastifyReply,
    ) => {
      const { exerciseId } = request.params;
      const centerId = request.jwtPayload?.centerId;

      if (!centerId) {
        return reply.status(401).send({ message: "Unauthorized" });
      }

      // Verify exercise belongs to the user's center (security: prevent cross-tenant uploads)
      try {
        await exercisesService.getExercise(centerId, exerciseId);
      } catch {
        return reply.status(404).send({ message: "Exercise not found" });
      }

      // Route-level file size override: 5MB for diagrams (global is 2MB)
      const data = await request.file({
        limits: { fileSize: 5 * 1024 * 1024 },
      });

      if (!data) {
        return reply.status(400).send({ message: "No file uploaded" });
      }

      const allowedMimetypes = [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/svg+xml",
      ];
      if (!allowedMimetypes.includes(data.mimetype)) {
        return reply.status(400).send({
          message:
            "Invalid file type. Only PNG, JPG, and SVG are allowed.",
        });
      }

      try {
        const buffer = await data.toBuffer();
        const diagramUrl = await exercisesService.uploadDiagram(
          centerId,
          exerciseId,
          buffer,
          data.mimetype,
        );

        return reply.status(200).send({
          data: { diagramUrl },
          message: "Diagram uploaded",
        });
      } catch (error: unknown) {
        request.log.error(error);
        return reply
          .status(500)
          .send({ message: "Failed to upload diagram" });
      }
    },
  });

  // POST /:exerciseId/stimulus-image - Upload stimulus image for Writing W1
  api.post("/:exerciseId/stimulus-image", {
    schema: {
      consumes: ["multipart/form-data"],
      params: z.object({
        exerciseId: z.string(),
      }),
      body: z.object({
        file: z.any().describe("Stimulus image file (PNG or JPG)"),
      }),
      response: {
        200: z.object({
          data: z.object({ stimulusImageUrl: z.string() }),
          message: z.string(),
        }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"])],
    handler: async (
      request: FastifyRequest<{ Params: { exerciseId: string } }>,
      reply: FastifyReply,
    ) => {
      const { exerciseId } = request.params;
      const user = request.jwtPayload;

      if (!user?.centerId) {
        return reply.status(401).send({ message: "Unauthorized" });
      }

      // Route-level file size override: 5MB for stimulus images
      const data = await request.file({
        limits: { fileSize: 5 * 1024 * 1024 },
      });

      if (!data) {
        return reply.status(400).send({ message: "No file uploaded" });
      }

      const allowedMimetypes = [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/svg+xml",
      ];
      if (!allowedMimetypes.includes(data.mimetype)) {
        return reply.status(400).send({
          message:
            "Invalid file type. Only PNG, JPG, and SVG are allowed.",
        });
      }

      try {
        const buffer = await data.toBuffer();
        const result = await exercisesController.uploadStimulusImage(
          exerciseId,
          buffer,
          data.mimetype,
          user,
        );

        return reply.status(200).send(result);
      } catch (error: unknown) {
        if (error instanceof AppError) {
          return reply
            .status(error.statusCode)
            .send({ message: error.message });
        }
        request.log.error(error);
        return reply
          .status(500)
          .send({ message: "Failed to upload stimulus image" });
      }
    },
  });

  // DELETE /:exerciseId/stimulus-image - Remove stimulus image from exercise
  api.delete("/:exerciseId/stimulus-image", {
    schema: {
      params: z.object({
        exerciseId: z.string(),
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
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"])],
    handler: async (
      request: FastifyRequest<{ Params: { exerciseId: string } }>,
      reply: FastifyReply,
    ) => {
      const { exerciseId } = request.params;
      const user = request.jwtPayload;

      if (!user?.centerId) {
        return reply.status(401).send({ message: "Unauthorized" });
      }

      try {
        const result = await exercisesController.deleteStimulusImage(
          exerciseId,
          user,
        );

        return reply.status(200).send(result);
      } catch (error: unknown) {
        if (error instanceof AppError) {
          return reply
            .status(error.statusCode)
            .send({ message: error.message });
        }
        request.log.error(error);
        return reply
          .status(500)
          .send({ message: "Failed to delete stimulus image" });
      }
    },
  });

  // POST /:exerciseId/audio - Upload audio file for Listening exercises
  api.post("/:exerciseId/audio", {
    schema: {
      consumes: ["multipart/form-data"],
      params: z.object({
        exerciseId: z.string(),
      }),
      body: z.object({
        file: z.any().describe("Audio file (MP3, WAV, OGG, or M4A)"),
      }),
      response: {
        200: z.object({
          data: z.object({ audioUrl: z.string() }),
          message: z.string(),
        }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"])],
    handler: async (
      request: FastifyRequest<{ Params: { exerciseId: string } }>,
      reply: FastifyReply,
    ) => {
      const { exerciseId } = request.params;
      const user = request.jwtPayload;

      if (!user?.centerId) {
        return reply.status(401).send({ message: "Unauthorized" });
      }

      // Route-level file size override: 100MB for audio
      const data = await request.file({
        limits: { fileSize: 100 * 1024 * 1024 },
      });

      if (!data) {
        return reply.status(400).send({ message: "No file uploaded" });
      }

      const allowedMimetypes = [
        "audio/mpeg",
        "audio/wav",
        "audio/mp4",
        "audio/x-m4a",
      ];
      if (!allowedMimetypes.includes(data.mimetype)) {
        return reply.status(400).send({
          message:
            "Invalid file type. Only MP3, WAV, and M4A files are allowed.",
        });
      }

      try {
        const buffer = await data.toBuffer();
        const result = await exercisesController.uploadAudio(
          exerciseId,
          buffer,
          data.mimetype,
          user,
        );

        return reply.status(200).send(result);
      } catch (error: unknown) {
        if (error instanceof AppError) {
          return reply
            .status(error.statusCode)
            .send({ message: error.message });
        }
        request.log.error(error);
        return reply
          .status(500)
          .send({ message: "Failed to upload audio" });
      }
    },
  });

  // PUT /:id/tags - Set exercise tags (replace all)
  api.put("/:id/tags", {
    schema: {
      params: z.object({ id: z.string() }),
      body: SetExerciseTagsSchema,
      response: {
        200: z.object({ data: z.null(), message: z.string() }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"])],
    handler: async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: SetExerciseTagsInput;
      }>,
      reply,
    ) => {
      try {
        const result = await tagsController.setExerciseTags(
          request.params.id,
          request.body.tagIds,
          request.jwtPayload!,
        );
        return reply.send(result);
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
          .send({ message: "Failed to set exercise tags" });
      }
    },
  });

  // GET /:id/tags - Get exercise tags
  api.get("/:id/tags", {
    schema: {
      params: z.object({ id: z.string() }),
      response: {
        200: ExerciseTagListResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"])],
    handler: async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply,
    ) => {
      try {
        const result = await tagsController.getExerciseTags(
          request.params.id,
          request.jwtPayload!,
        );
        return reply.send(result);
      } catch (error: unknown) {
        request.log.error(error);
        if (error instanceof AppError) {
          return reply
            .status(error.statusCode as 500)
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
          .send({ message: "Failed to get exercise tags" });
      }
    },
  });

  // DELETE /:exerciseId/audio - Remove audio file from exercise
  api.delete("/:exerciseId/audio", {
    schema: {
      params: z.object({
        exerciseId: z.string(),
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
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"])],
    handler: async (
      request: FastifyRequest<{ Params: { exerciseId: string } }>,
      reply: FastifyReply,
    ) => {
      const { exerciseId } = request.params;
      const user = request.jwtPayload;

      if (!user?.centerId) {
        return reply.status(401).send({ message: "Unauthorized" });
      }

      try {
        const result = await exercisesController.deleteAudio(
          exerciseId,
          user,
        );

        return reply.status(200).send(result);
      } catch (error: unknown) {
        if (error instanceof AppError) {
          return reply
            .status(error.statusCode)
            .send({ message: error.message });
        }
        request.log.error(error);
        return reply
          .status(500)
          .send({ message: "Failed to delete audio" });
      }
    },
  });
}
