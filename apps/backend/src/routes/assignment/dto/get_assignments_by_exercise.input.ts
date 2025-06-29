import { Static, Type } from "@sinclair/typebox";

export const GetAssignmentsByExerciseInputSchema = Type.Object({
  exerciseId: Type.Optional(Type.String()),
});

export type GetAssignmentsByExerciseInput = Static<
  typeof GetAssignmentsByExerciseInputSchema
>;
