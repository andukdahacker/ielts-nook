import { Static, Type } from "@sinclair/typebox";

export const CreateAssignmentsInputSchema = Type.Object(
  {
    title: Type.String(),
    exerciseId: Type.String(),
    dueDate: Type.Optional(Type.Any()),
    students: Type.Array(
      Type.Object({
        classId: Type.String(),
        userId: Type.String(),
      }),
    ),
  },
  { $id: "CreateAssignmentsInput" },
);

export type CreateAssignmentsInput = Static<
  typeof CreateAssignmentsInputSchema
>;
