import { Static, Type } from "@sinclair/typebox";

export const DeleteAssignmentsInputSchema = Type.Object({
  id: Type.String(),
});

export type DeleteAssignmentsInput = Static<
  typeof DeleteAssignmentsInputSchema
>;
