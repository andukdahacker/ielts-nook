import { Static } from "@sinclair/typebox";
import { BaseResponseSchema } from "../../../types/response";
import { ExerciseSchema } from "../schema/exercise.schema";

export const UploadWritingImageResponseSchema = BaseResponseSchema(ExerciseSchema);

export type UploadWritingImageResponse = Static<typeof UploadWritingImageResponseSchema>
