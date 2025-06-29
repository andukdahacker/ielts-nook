import { Static, Type } from "@sinclair/typebox";

export const GetClassInputSchema = Type.Object({
  classId: Type.String(),
});

export type GetClassInput = Static<typeof GetClassInputSchema>;
