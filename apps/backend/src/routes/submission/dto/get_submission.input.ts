import { Static, Type } from "@sinclair/typebox";

export const GetSubmissionInputSchema = Type.Object({
  id: Type.String(),
});

export type GetSubmissionInput = Static<typeof GetSubmissionInputSchema>;
