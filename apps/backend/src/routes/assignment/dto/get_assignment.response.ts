import { Static, Type } from "@sinclair/typebox";
import { BaseResponseSchema } from "../../../types/response";
import { ExerciseSchema } from "../../exercise/schema/exercise.schema";
import { AssignmentSchema } from "../schema/assignment.schema";
import { Nullable } from "../../../types/nullable";
import { SubmissionSchema } from "../../submission/schema/submission.schema";

export const GetAssignmentResponseSchema = BaseResponseSchema(
  Type.Object({
    assignment: AssignmentSchema,
    exercise: ExerciseSchema,
    submission: Nullable(SubmissionSchema),
  }),
);

export type GetAssignmentResponse = Static<typeof GetAssignmentResponseSchema>;
