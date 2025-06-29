import { Static, Type } from "@sinclair/typebox";

export const GetClassListInputSchema = Type.Object(
  {
    take: Type.Number(),
    cursor: Type.Optional(Type.String()),
    centerId: Type.String(),
    searchString: Type.Optional(Type.String()),
  },
  { $id: "GetClassListInput" },
);

export type GetClassListInput = Static<typeof GetClassListInputSchema>;
