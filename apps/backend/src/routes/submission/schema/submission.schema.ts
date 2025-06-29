import { Static, Type } from "@sinclair/typebox";

export const SubmissionSchema = Type.Object(
  {
    id: Type.String(),
    assignmentId: Type.String(),
    content: Type.Any(),
    grade: Type.Any(),
    feedback: Type.Any(),
    createdAt: Type.Any(),
    updatedAt: Type.Any(),
  },
  { $id: "Submission" },
);

export type Submission = Static<typeof SubmissionSchema>;
