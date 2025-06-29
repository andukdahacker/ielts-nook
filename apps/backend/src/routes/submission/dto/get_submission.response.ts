import { Static, Type } from "@sinclair/typebox";
import { BaseResponseSchema } from "../../../types/response";
import { SubmissionSchema } from "../schema/submission.schema";
import { ExerciseSchema } from "../../exercise/schema/exercise.schema";
import { AssignmentSchema } from "../../assignment/schema/assignment.schema";

export const GetSubmissionResponseSchema = BaseResponseSchema(
  Type.Object({
    submission: SubmissionSchema,
    exercise: ExerciseSchema,
    assignment: AssignmentSchema,
  }),
);

export type GetSubmissionResponse = Static<typeof GetSubmissionResponseSchema>;
