import { Static, Type } from "@sinclair/typebox";

export const GetSubmissionListInputSchema = Type.Object({
  take: Type.Number(),
  cursor: Type.Optional(Type.String()),
});

export type GetSubmissionListInput = Static<
  typeof GetSubmissionListInputSchema
>;
