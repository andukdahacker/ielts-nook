import { Static, Type } from "@sinclair/typebox";

export const CreateClassInputSchema = Type.Object({
  name: Type.String(),
  description: Type.Optional(Type.String()),
  classMember: Type.Array(Type.String()),
  centerId: Type.String(),
});

export type CreateClassInput = Static<typeof CreateClassInputSchema>;
