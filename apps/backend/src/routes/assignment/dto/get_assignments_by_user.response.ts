import { Static, Type } from "@sinclair/typebox";
import { PaginatedBaseReponseSchema } from "../../../types/response";
import { ClassSchema } from "../../class/schema/class.schema";
import { ExerciseSchema } from "../../exercise/schema/exercise.schema";
import { AssignmentSchema } from "../schema/assignment.schema";

export const GetAssignmentsByUserResponseSchema = PaginatedBaseReponseSchema(
  Type.Object({
    assignment: AssignmentSchema,
    class: ClassSchema,
    exercise: ExerciseSchema,
  }),
);

export type GetAssignmentByUserResponse = Static<
  typeof GetAssignmentsByUserResponseSchema
>;
