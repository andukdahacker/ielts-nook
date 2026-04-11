import {
  GenerateQuestionsRequestSchema,
  RegenerateQuestionsSectionRequestSchema,
  AIGenerationJobResponseSchema,
  ErrorResponseSchema,
} from "@workspace/types";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { AppError } from "../../errors/app-error.js";
import { AIGenerationController } from "./ai-generation.controller.js";
import { AIGenerationService } from "./ai-generation.service.js";
import { DocumentExtractionService } from "./document-extraction.service.js";
import { ExercisesService } from "./exercises.service.js";
import Env from "../../env.js";
import z from "zod";
import { createResponseSchema } from "@workspace/types";

export async function aiGenerationRoutes(fastify: FastifyInstance) {
  const env = fastify.getEnvs<Env>();
  const api = fastify.withTypeProvider<ZodTypeProvider>();

  const aiService = new AIGenerationService(fastify.prisma, {
    geminiApiKey: env.GEMINI_API_KEY,
    geminiModel: env.GEMINI_MODEL,
  });
  const controller = new AIGenerationController(aiService);
  const extractionService = new DocumentExtractionService();
  const exercisesService = new ExercisesService(
    fastify.prisma,
    fastify.firebaseStorage,
    env.FIREBASE_STORAGE_BUCKET,
  );

  // Apply auth middleware to all routes
  api.addHook("onRequest", authMiddleware);

  // POST /:exerciseId/upload-document — Upload PDF/DOCX, extract text, update passage
  api.post("/:exerciseId/upload-document", {
    schema: {
      consumes: ["multipart/form-data"],
      params: z.object({ exerciseId: z.string() }),
      body: z.object({
        file: z.any().describe("Document file (PDF or DOCX)"),
      }),
      response: {
        200: createResponseSchema(
          z.object({
            extractedText: z.string(),
            passageSourceType: z.string(),
            passageSourceUrl: z.string().nullable(),
          }),
        ),
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

      // Route-level file size override: 10MB for documents
      const data = await request.file({
        limits: { fileSize: 10 * 1024 * 1024 },
      });

      if (!data) {
        return reply.status(400).send({ message: "No file uploaded" });
      }

      const allowedMimes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!allowedMimes.includes(data.mimetype)) {
        return reply.status(400).send({
          message: "Only PDF and DOCX files are supported",
        });
      }

      try {
        const buffer = await data.toBuffer();
        const extractedText = await extractionService.extractText(
          buffer,
          data.mimetype,
        );

        const sourceType = data.mimetype.includes("pdf") ? "PDF" : "DOCX";
        const sourceUrl = await exercisesService.uploadDocument(
          user.centerId,
          exerciseId,
          buffer,
          data.mimetype,
        );

        await exercisesService.updatePassageFromDocument(
          user.centerId,
          exerciseId,
          extractedText,
          sourceType,
          sourceUrl,
        );

        return reply.status(200).send({
          data: {
            extractedText,
            passageSourceType: sourceType,
            passageSourceUrl: sourceUrl,
          },
          message: "Document uploaded and text extracted successfully",
        });
      } catch (error: unknown) {
        if (error instanceof AppError) {
          return reply
            .status(error.statusCode)
            .send({ message: error.message });
        }
        request.log.error(error);
        return reply
          .status(500)
          .send({ message: "Failed to upload and extract document" });
      }
    },
  });

  // POST /:exerciseId/generate — Request AI question generation
  api.post("/:exerciseId/generate", {
    schema: {
      params: z.object({ exerciseId: z.string() }),
      body: GenerateQuestionsRequestSchema,
      response: {
        200: AIGenerationJobResponseSchema,
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
        Params: { exerciseId: string };
        Body: z.infer<typeof GenerateQuestionsRequestSchema>;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const result = await controller.requestGeneration(
          request.params.exerciseId,
          request.body,
          request.jwtPayload!,
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
          .send({ message: "Failed to start AI generation" });
      }
    },
  });

  // GET /:exerciseId/generation-status — Get latest generation job status (polling)
  api.get("/:exerciseId/generation-status", {
    schema: {
      params: z.object({ exerciseId: z.string() }),
      response: {
        200: AIGenerationJobResponseSchema,
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
      try {
        const result = await controller.getLatestJob(
          request.params.exerciseId,
          request.jwtPayload!,
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
          .send({ message: "Failed to get generation status" });
      }
    },
  });

  // GET /generation-jobs/:jobId — Get specific job status
  api.get("/generation-jobs/:jobId", {
    schema: {
      params: z.object({ jobId: z.string() }),
      response: {
        200: AIGenerationJobResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"])],
    handler: async (
      request: FastifyRequest<{ Params: { jobId: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const result = await controller.getJobStatus(
          request.params.jobId,
          request.jwtPayload!,
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
          .send({ message: "Failed to get job status" });
      }
    },
  });

  // POST /:exerciseId/regenerate-section — Regenerate a specific section
  api.post("/:exerciseId/regenerate-section", {
    schema: {
      params: z.object({ exerciseId: z.string() }),
      body: RegenerateQuestionsSectionRequestSchema,
      response: {
        200: AIGenerationJobResponseSchema,
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
        Params: { exerciseId: string };
        Body: z.infer<typeof RegenerateQuestionsSectionRequestSchema>;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const result = await controller.regenerateSection(
          request.params.exerciseId,
          request.body,
          request.jwtPayload!,
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
          .send({ message: "Failed to regenerate section" });
      }
    },
  });
}
