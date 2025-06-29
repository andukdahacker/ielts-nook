import fastifyMultipart from "@fastify/multipart";
import { FastifyInstance } from "fastify";
import { FastifyReply } from "fastify/types/reply";
import { FastifyRequest } from "fastify/types/request";
import Env from "../../env";
import authMiddleware from "../../middlewares/auth.middleware";
import roleMiddleware from "../../middlewares/role.middleware";
import S3Service from "../../services/s3_service";
import {
    BaseResponseErrorSchema,
    NoDataResponseSchema,
} from "../../types/response";
import {
    CreateExerciseInput,
    CreateExerciseInputSchema,
} from "./dto/create_exercise.input";
import { CreateExerciseResponseSchema } from "./dto/create_exercise.response";
import {
    DeleteExerciseInput,
    DeleteExerciseInputSchema,
} from "./dto/delete_exercise.input";
import {
    DeleteListeningFileInput,
    DeleteListeningFileInputSchema,
} from "./dto/delete_listening_file.input";
import {
    DeleteWritingImageInput,
    DeleteWritingImageInputSchema,
} from "./dto/delete_writing_image.input";
import {
    GetExerciseInput,
    GetExerciseInputSchema,
} from "./dto/get_exercise.input";
import { GetExerciseResponseSchema } from "./dto/get_exercise.response";
import {
    GetExerciseListInput,
    GetExerciseListInputSchema,
} from "./dto/get_exercise_list.input";
import { GetExerciseListResponseSchema } from "./dto/get_exercise_list.response";
import {
    UpdateExerciseInput,
    UpdateExerciseInputSchema,
} from "./dto/update_exercise.input";
import { UpdateExerciseResponseSchema } from "./dto/update_exercise.response";
import {
    UploadListeningFileInput,
    UploadListeningFileInputSchema,
} from "./dto/upload_listening_file.input";
import { UploadListeningFileResponseSchema } from "./dto/upload_listening_file.response";
import {
    UploadWritingImageInput,
    UploadWritingImageInputSchema,
} from "./dto/upload_writing_image.input";
import { UploadWritingImageResponseSchema } from "./dto/upload_writing_image.response";
import ExerciseController from "./exercise.controller";
import ExerciseService from "./exercise.service";
import { ExerciseSchema } from "./schema/exercise.schema";
import { ExerciseTypeSchema } from "./schema/exercise_type.schema";
import { ListeningExerciseSchema } from "./schema/listening_exercise.schema";
import { ReadingExerciseSchema } from "./schema/reading_exercise.schema";
import { WritingExerciseSchema } from "./schema/writing_exercise_schema";

function addSchema(fastify: FastifyInstance) {
  //Reading

  fastify.addSchema(ReadingExerciseSchema);

  //Listening
  fastify.addSchema(ListeningExerciseSchema);

  //Writing
  fastify.addSchema(WritingExerciseSchema);

  //Exercise
  fastify.addSchema(ExerciseTypeSchema);
  fastify.addSchema(ExerciseSchema);
  fastify.addSchema(GetExerciseListInputSchema);
  fastify.addSchema(CreateExerciseInputSchema);
  fastify.addSchema(UpdateExerciseInputSchema);
  fastify.addSchema(CreateExerciseResponseSchema);
  fastify.addSchema(UploadListeningFileInputSchema);
  fastify.addSchema(DeleteListeningFileInputSchema);
  fastify.addSchema(UploadWritingImageInputSchema);
  fastify.addSchema(DeleteWritingImageInputSchema);
}

async function exerciseRoutes(fastify: FastifyInstance, opts: any) {
  addSchema(fastify);
  const env = fastify.getEnvs<Env>();
  const exerciseService = new ExerciseService(fastify.db);
  const s3Service = new S3Service(fastify.s3, {
    cloudfrontDomain: env.S3_CLOUDFRONT_DOMAIN,
  });
  const exerciseController = new ExerciseController(exerciseService, s3Service);

  fastify.post("/", {
    schema: {
      description: "Create an exercise",
      tags: ["exercise"],
      body: CreateExerciseInputSchema,
      response: {
        200: CreateExerciseResponseSchema,
        500: BaseResponseErrorSchema,
      },
    },
    preHandler: [authMiddleware, roleMiddleware(["ADMIN", "TEACHER"])],
    handler: async (
      request: FastifyRequest<{ Body: CreateExerciseInput }>,
      _reply: FastifyReply,
    ) =>
      exerciseController.createExercise(
        request.body,
        request.jwtPayload.centerId,
      ),
  });

  fastify.put("/", {
    schema: {
      description: "Update an exercise",
      tags: ["exercise"],
      body: UpdateExerciseInputSchema,
      response: {
        200: UpdateExerciseResponseSchema,
        500: BaseResponseErrorSchema,
      },
    },
    preHandler: [authMiddleware, roleMiddleware(["ADMIN", "TEACHER"])],
    handler: async (
      request: FastifyRequest<{ Body: UpdateExerciseInput }>,
      _reply,
    ) =>
      exerciseController.updateExercise(
        request.body,
        request.jwtPayload.centerId,
      ),
  });

  fastify.delete("/deleteListeningFile", {
    schema: {
      description: "Delete listening file for an exercise",
      tags: ["exercise"],
      body: DeleteListeningFileInputSchema,
      response: {
        200: NoDataResponseSchema,
        500: BaseResponseErrorSchema,
      },
    },
    preHandler: [authMiddleware, roleMiddleware(["ADMIN", "TEACHER"])],
    handler: async (
      request: FastifyRequest<{ Body: DeleteListeningFileInput }>,
      _reply: FastifyReply,
    ) =>
      await exerciseController.removeListeningFile(
        request.body,
        env.S3_BUCKET_NAME,
      ),
  });

  fastify.delete("/:id", {
    schema: {
      description: "Delete an exercise",
      tags: ["exercise"],
      params: DeleteExerciseInputSchema,
      response: {
        200: NoDataResponseSchema,
        500: BaseResponseErrorSchema,
      },
    },
    preHandler: [authMiddleware, roleMiddleware(["ADMIN", "TEACHER"])],
    handler: async (
      request: FastifyRequest<{ Params: DeleteExerciseInput }>,
      _reply: FastifyReply,
    ) =>
      exerciseController.deleteExercise(
        request.params,
        request.jwtPayload.centerId,
        env.S3_BUCKET_NAME
      ),
  });

  fastify.get("/:id", {
    schema: {
      description: "Get an exercise with id",
      tags: ["exercise"],
      params: GetExerciseInputSchema,
      response: {
        200: GetExerciseResponseSchema,
        500: BaseResponseErrorSchema,
      },
    },
    preHandler: [authMiddleware],
    handler: async (
      request: FastifyRequest<{ Params: GetExerciseInput }>,
      _reply: FastifyReply,
    ) =>
      exerciseController.getExercise(
        request.params,
        request.jwtPayload.centerId,
      ),
  });

  fastify.get("/list", {
    schema: {
      description: "Get list of exercises",
      tags: ["exercise"],
      querystring: GetExerciseListInputSchema,
      response: {
        200: GetExerciseListResponseSchema,
        500: BaseResponseErrorSchema,
      },
    },
    preHandler: [authMiddleware],
    handler: async (
      request: FastifyRequest<{ Querystring: GetExerciseListInput }>,
      _reply: FastifyReply,
    ) =>
      exerciseController.getExerciseList(
        request.query,
        request.jwtPayload.centerId,
      ),
  });

  fastify.register(fastifyMultipart, {
    attachFieldsToBody: "keyValues",
    limits: { fileSize: 1024 * 1024 * 25 },
    throwFileSizeLimit: true,
  });

  fastify.post("/uploadListeningFile", {
    schema: {
      description: "Upload listening file for an exercise",
      tags: ["exercise"],
      consumes: ["multipart/form-data"],
      body: UploadListeningFileInputSchema,
      response: {
        200: UploadListeningFileResponseSchema,
        500: BaseResponseErrorSchema,
      },
    },
    preHandler: [authMiddleware, roleMiddleware(["ADMIN", "TEACHER"])],
    handler: async (
      request: FastifyRequest<{ Body: UploadListeningFileInput }>,
      _reply: FastifyReply,
    ) => {
      const file = await request.body.file;

      if (!file) {
        throw new Error("Cannot get file");
      }

      return exerciseController.uploadListeningFile(
        file,
        request.body,
        env.S3_BUCKET_NAME,
      );
    },
  });

  fastify.post("/uploadWritingImage", {
    schema: {
      description: "Upload image for an exercise",
      tags: ["exercise"],
      consumes: ["multipart/form-data"],
      body: UploadWritingImageInputSchema,
      response: {
        200: UploadWritingImageResponseSchema,
        500: BaseResponseErrorSchema,
      },
    },
    preHandler: [authMiddleware, roleMiddleware(["ADMIN", "TEACHER"])],
    handler: async (
      request: FastifyRequest<{ Body: UploadWritingImageInput }>,
      _reply: FastifyReply,
    ) => {
      const file = await request.body.file;

      if (!file) {
        throw new Error("Cannot get file");
      }

      return await exerciseController.uploadWritingImage(
        request.body,
        env.S3_BUCKET_NAME,
      );
    },
  });

  fastify.delete("/writingImage", {
    schema: {
      description: "Delete writing image",
      tags: ["exercise"],
      body: DeleteWritingImageInputSchema,
      response: {
        200: NoDataResponseSchema,
        500: BaseResponseErrorSchema,
      },
    },
    preHandler: [authMiddleware, roleMiddleware(["ADMIN", "TEACHER"])],
    handler: async (
      request: FastifyRequest<{ Body: DeleteWritingImageInput }>,
      _reply: FastifyReply,
    ) =>
      await exerciseController.removeWritingImage(
        request.body,
        env.S3_BUCKET_NAME,
      ),
  });
}

export default exerciseRoutes;
