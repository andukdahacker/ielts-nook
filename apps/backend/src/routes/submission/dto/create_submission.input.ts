import { Static, Type } from "@sinclair/typebox";

export const CreateSubmissionInputSchema = Type.Object(
  {
    assignmentId: Type.String(),
    content: Type.Any(),
  },
  { $id: "CreateSubmissionInput" },
);

export type CreateSubmissionInput = Static<typeof CreateSubmissionInputSchema>;
