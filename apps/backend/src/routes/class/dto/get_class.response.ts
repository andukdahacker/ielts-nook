import { Static, Type } from "@sinclair/typebox";
import { BaseResponseSchema } from "../../../types/response";
import { ClassSchema } from "../schema/class.schema";
import { UserSchema } from "../../user/schema/user.schema";
import { AssignmentSchema } from "../../assignment/schema/assignment.schema";
import { SubmissionSchema } from "../../submission/schema/submission.schema";
import { ExerciseSchema } from "../../exercise/schema/exercise.schema";
import { Nullable } from "../../../types/nullable";

export const GetClassResponseSchema = BaseResponseSchema(
  Type.Object({
    class: ClassSchema,
    classMembers: Type.Array(
      Type.Object({
        user: UserSchema,
        assignments: Type.Array(
          Type.Object({
            assignment: AssignmentSchema,
            submission: Nullable(SubmissionSchema),
            exercise: ExerciseSchema
          })
        )
      })
    )
  }),
);

export type GetClassResponse = Static<typeof GetClassResponseSchema>;
