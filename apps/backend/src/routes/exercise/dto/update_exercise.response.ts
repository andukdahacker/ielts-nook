import { Static } from "@sinclair/typebox";
import { BaseResponseSchema } from "../../../types/response";
import { ExerciseSchema } from "../schema/exercise.schema";

export const UpdateExerciseResponseSchema = BaseResponseSchema(ExerciseSchema);

export type UpdateExerciseResponse = Static<
  typeof UpdateExerciseResponseSchema
>;
