import { Static, Type } from "@sinclair/typebox";
import { Nullable } from "../../../types/nullable";
import { ExerciseTypeSchema } from "./exercise_type.schema";

export const ExerciseSchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    type: ExerciseTypeSchema,
    content: Type.Any(),
    centerId: Nullable(Type.String()),
    createdAt: Type.Any(),
    updatedAt: Type.Any(),
  },
  { $id: "Exercise" },
);

export type Exercise = Static<typeof ExerciseSchema>;
