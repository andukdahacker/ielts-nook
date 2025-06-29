import { Static, Type } from "@sinclair/typebox";

export const GetAssignmentInputSchema = Type.Object({
  id: Type.String(),
});

export type GetAssignmentInput = Static<typeof GetAssignmentInputSchema>;
