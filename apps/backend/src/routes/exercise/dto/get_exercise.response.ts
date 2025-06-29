import { Static, Type } from "@sinclair/typebox";
import { BaseResponseSchema } from "../../../types/response";
import { ExerciseSchema } from "../schema/exercise.schema";

export const GetExerciseResponseSchema = BaseResponseSchema(
  Type.Object({
    exercise: ExerciseSchema,
  }),
);

export type GetExerciseResponse = Static<typeof GetExerciseResponseSchema>;
