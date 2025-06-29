import { Static } from "@sinclair/typebox";
import { BaseResponseSchema } from "../../../types/response";
import { ExerciseSchema } from "../schema/exercise.schema";

export const UploadListeningFileResponseSchema =
  BaseResponseSchema(ExerciseSchema);

export type UploadListeningFileResponse = Static<
  typeof UploadListeningFileResponseSchema
>;
