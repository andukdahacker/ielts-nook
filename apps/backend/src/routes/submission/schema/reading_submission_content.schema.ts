import { Static, Type } from "@sinclair/typebox";
import { Nullable } from "../../../types/nullable";

export const ReadingSubmissionContentSchema = Type.Object(
  {
    tasks: Type.Array(
      Type.Object({
        order: Type.Number(),
        questions: Type.Array(
          Type.Object({
            order: Type.Number(),
            answer: Nullable(Type.String()),
          }),
        ),
      }),
    ),
  },
  { $id: "ReadingSubmissionContent" },
);

export type ReadingSubmissionContent = Static<
  typeof ReadingSubmissionContentSchema
>;
