import { Static } from "@sinclair/typebox";
import { BaseResponseSchema } from "../../../types/response";
import { SubmissionSchema } from "../schema/submission.schema";

export const CreateSubmissionResponseSchema =
  BaseResponseSchema(SubmissionSchema);

export type CreateSubmissionResponse = Static<
  typeof CreateSubmissionResponseSchema
>;
