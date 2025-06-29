import { Static, Type } from "@sinclair/typebox";
import { ExerciseTypeSchema } from "../schema/exercise_type.schema";

export const GetExerciseListInputSchema = Type.Object(
  {
    take: Type.Number(),
    cursor: Type.Optional(Type.String()),
    type: Type.Optional(ExerciseTypeSchema),
    isPublic: Type.Boolean(),
    searchString: Type.Optional(Type.String()),
  },
  { $id: "GetExerciseListInput" },
);

export type GetExerciseListInput = Static<typeof GetExerciseListInputSchema>;
