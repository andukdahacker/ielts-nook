import { Static, Type } from "@sinclair/typebox";

export const DeleteUserInputSchema = Type.Object({
  userId: Type.String(),
});

export type DeleteUserInput = Static<typeof DeleteUserInputSchema>;
