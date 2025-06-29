import { Static } from "@sinclair/typebox";
import { PaginatedBaseReponseSchema } from "../../../types/response";
import { SubmissionSchema } from "../schema/submission.schema";

export const GetSubmissionListResponseSchema =
  PaginatedBaseReponseSchema(SubmissionSchema);

export type GetSubmissionListResponse = Static<
  typeof GetSubmissionListResponseSchema
>;
