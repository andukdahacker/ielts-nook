import { Static, Type } from "@sinclair/typebox";
import { WritingSubmissionContentSchema } from "./writing_submission_content.schema";
import { ReadingSubmissionContentSchema } from "./reading_submission_content.schema";
import { ListeningSubmissionContentSchema } from "./listening_submission_content.schema";

export const SubmissionContentSchema = Type.Union(
  [
    WritingSubmissionContentSchema,
    ReadingSubmissionContentSchema,
    ListeningSubmissionContentSchema,
  ],
  { $id: "SubmissionContent" },
);

export type SubmissionContentSchema = Static<typeof SubmissionContentSchema>;
