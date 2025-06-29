import { Static } from "@sinclair/typebox";
import { PaginatedBaseReponseSchema } from "../../../types/response";
import { ExerciseSchema } from "../schema/exercise.schema";

export const GetExerciseListResponseSchema =
  PaginatedBaseReponseSchema(ExerciseSchema);

export type GetExerciseListResponse = Static<
  typeof GetExerciseListResponseSchema
>;
