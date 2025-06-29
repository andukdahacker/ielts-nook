import { Static, Type } from "@sinclair/typebox";

export const DeleteExerciseInputSchema = Type.Object({
  id: Type.String(),
});

export type DeleteExerciseInput = Static<typeof DeleteExerciseInputSchema>;
