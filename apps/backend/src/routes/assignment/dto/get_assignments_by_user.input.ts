import { Static, Type } from "@sinclair/typebox";

export const GetAssignmentsByUserInputSchema = Type.Object(
  {
    userId: Type.String(),
    take: Type.Number(),
    cursor: Type.Optional(Type.String()),
    searchString: Type.Optional(Type.String()),
  },
  { $id: "GetAssignmentByUserInput" },
);

export type GetAssignmentsByUserInput = Static<
  typeof GetAssignmentsByUserInputSchema
>;
