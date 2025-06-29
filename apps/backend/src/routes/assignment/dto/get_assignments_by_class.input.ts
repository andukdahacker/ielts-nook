import { Static, Type } from "@sinclair/typebox";

export const GetAssignmentsByClassInputSchema = Type.Object({
  classId: Type.String(),
});

export type GetAssignmentsByClassInput = Static<
  typeof GetAssignmentsByClassInputSchema
>;
