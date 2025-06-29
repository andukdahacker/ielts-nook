import { Static, Type } from "@sinclair/typebox";

export const GetExerciseInputSchema = Type.Object({
  id: Type.String(),
});

export type GetExerciseInput = Static<typeof GetExerciseInputSchema>;
