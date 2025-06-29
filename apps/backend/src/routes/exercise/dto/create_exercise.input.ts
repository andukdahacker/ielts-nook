import { Static, Type } from "@sinclair/typebox";
import { ExerciseTypeSchema } from "../schema/exercise_type.schema";

export const CreateExerciseInputSchema = Type.Object(
  {
    name: Type.String(),
    content: Type.Any(),
    type: ExerciseTypeSchema,
  },
  { $id: "CreateExerciseInput" },
);

export type CreateExerciseInput = Static<typeof CreateExerciseInputSchema>;
