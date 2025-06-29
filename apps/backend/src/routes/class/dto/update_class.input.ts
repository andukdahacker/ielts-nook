import { Static, Type } from "@sinclair/typebox";

export const UpdateClassInputSchema = Type.Object(
  {
    classId: Type.String(),
    name: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
    addMembers: Type.Optional(Type.Array(Type.String())),
    removeMembers: Type.Optional(Type.Array(Type.String())),
  },
  { $id: "UpdateClassInput" },
);

export type UpdateClassInput = Static<typeof UpdateClassInputSchema>;
