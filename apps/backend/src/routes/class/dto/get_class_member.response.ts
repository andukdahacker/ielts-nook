import { Static, Type } from '@sinclair/typebox';
import { Nullable } from '../../../types/nullable';
import { BaseResponseSchema } from '../../../types/response';
import { AssignmentSchema } from '../../assignment/schema/assignment.schema';
import { ExerciseSchema } from '../../exercise/schema/exercise.schema';
import { SubmissionSchema } from '../../submission/schema/submission.schema';
import { UserSchema } from '../../user/schema/user.schema';
import { ClassMemberSchema } from '../schema/classMembers.schema';

export const GetClassMemberResponseSchema = BaseResponseSchema(
    Type.Object({
        classMember: ClassMemberSchema,
        user: UserSchema,
        assignments: Type.Array(
            Type.Object({
                assignment: AssignmentSchema,
                submission: Nullable(SubmissionSchema),
                exercise: ExerciseSchema,
            }),
        ),
    }),
);

export type GetClassMemberResponse = Static<typeof GetClassMemberResponseSchema>;
