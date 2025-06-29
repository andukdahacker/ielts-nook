import { Static, Type } from "@sinclair/typebox";
import { Nullable } from "../../../types/nullable";

export const ClassSchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    description: Nullable(Type.String()),
    createdAt: Type.Any(),
    updatedAt: Type.Any(),
  },
  { $id: "Class" },
);

export type Class = Static<typeof ClassSchema>;
