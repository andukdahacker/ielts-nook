import { Static, Type } from "@sinclair/typebox";

export const CenterSchema = Type.Object(
  {
    id: Type.String(),
    email: Type.String(),
    name: Type.String(),
    createdAt: Type.Any(),
    updatedAt: Type.Any(),
  },
  {
    $id: "Center",
  },
);

export type Center = Static<typeof CenterSchema>;
