import { Static, Type } from "@sinclair/typebox";
import { Nullable } from "../../../types/nullable";

export const AssignmentStatusSchema = Type.Union([
  Type.Literal("ASSIGNED"),
  Type.Literal("SUBMITTED"),
  Type.Literal("REVIEWED"),
]);

export type AssignmentStatus = Static<typeof AssignmentStatusSchema>;

export const AssignmentSchema = Type.Object(
  {
    id: Type.String(),
    title: Type.String(),
    dueDate: Nullable(Type.Any()),
    classMemberClassId: Type.String(),
    classMemberUserId: Type.String(),
    exerciseId: Type.String(),
    status: AssignmentStatusSchema,
    createdAt: Type.Any(),
    updatedAt: Type.Any(),
  },
  { $id: "Assignment" },
);

export type Assignment = Static<typeof AssignmentSchema>;
