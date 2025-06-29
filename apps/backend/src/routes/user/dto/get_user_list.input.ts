import { Static, Type } from "@sinclair/typebox";

export const GetUserListInputSchema = Type.Object(
  {
    take: Type.Number(),
    cursor: Type.Optional(Type.String()),
    searchString: Type.Optional(Type.String()),
  },
  {
    $id: "GetUserListInput",
  },
);

export type GetUserListInput = Static<typeof GetUserListInputSchema>;
