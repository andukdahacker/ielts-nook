import { Static, Type } from "@sinclair/typebox";
import { BaseResponseSchema } from "../../../types/response";
import { AssignmentSchema } from "../schema/assignment.schema";

export const CreateAssignmentsResponseSchema = BaseResponseSchema(
  Type.Object({
    assignments: Type.Array(AssignmentSchema),
  }),
  { $id: "CreateAssignmentsResponse" },
);

export type CreateAssignmentResponse = Static<
  typeof CreateAssignmentsResponseSchema
>;
