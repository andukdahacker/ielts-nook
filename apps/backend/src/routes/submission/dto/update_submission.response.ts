import { Static, Type } from '@sinclair/typebox';
import { BaseResponseSchema } from '../../../types/response';
import { AssignmentSchema } from '../../assignment/schema/assignment.schema';
import { ExerciseSchema } from '../../exercise/schema/exercise.schema';
import { SubmissionSchema } from '../schema/submission.schema';

export const UpdateSubmissionResponseSchema = BaseResponseSchema(
    Type.Object({
        submission: SubmissionSchema,
        exercise: ExerciseSchema,
        assignment: AssignmentSchema,
    }),
);

export type UpdateSubmissionResponse = Static<typeof UpdateSubmissionResponseSchema>;
