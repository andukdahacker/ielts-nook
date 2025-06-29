import { Static } from "@sinclair/typebox";
import { BaseResponseSchema } from "../../../types/response";
import { AssignmentSchema } from "../schema/assignment.schema";

export const UpdateAssignmentsResponseSchema =
  BaseResponseSchema(AssignmentSchema);

export type UpdateAssignmentsResponse = Static<
  typeof UpdateAssignmentsResponseSchema
>;
