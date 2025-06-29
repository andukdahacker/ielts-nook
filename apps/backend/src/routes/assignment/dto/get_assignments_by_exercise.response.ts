import { Static, Type } from "@sinclair/typebox";
import { BaseResponseSchema } from "../../../types/response";
import { ClassSchema } from "../../class/schema/class.schema";
import { UserSchema } from "../../user/schema/user.schema";
import { AssignmentSchema } from "../schema/assignment.schema";

export const GetAssignmentsByExerciseResponseSchema = BaseResponseSchema(
  Type.Object({
    assignments: Type.Array(
      Type.Object({
        assignment: AssignmentSchema,
        user: UserSchema,
        class: ClassSchema,
      }),
    ),
  }),
  { $id: "GetAssignmentsByExerciseResponse" },
);

export type GetAssignmentsByExerciseResponse = Static<
  typeof GetAssignmentsByExerciseResponseSchema
>;
