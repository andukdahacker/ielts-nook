import { Static, Type } from "@sinclair/typebox";

export const DeleteClassInputSchema = Type.Object({
  classId: Type.String(),
});

export type DeleteClassInput = Static<typeof DeleteClassInputSchema>;
