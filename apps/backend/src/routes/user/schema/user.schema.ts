import { Static, Type } from "@sinclair/typebox";
import { Nullable } from "../../../types/nullable";

export const UserRoleSchema = Type.Union(
  [Type.Literal("ADMIN"), Type.Literal("TEACHER"), Type.Literal("STUDENT")],
  { $id: "UserRole" },
);

export type UserRole = Static<typeof UserRoleSchema>;

export const UserSchema = Type.Object(
  {
    id: Type.String(),
    email: Type.String(),
    username: Nullable(Type.String()),
    firstName: Nullable(Type.String()),
    lastName: Nullable(Type.String()),
    centerId: Type.String(),
    role: UserRoleSchema,
    phoneNumber: Nullable(Type.String()),
    createdAt: Type.Any(),
    updatedAt: Type.Any(),
  },
  { $id: "User" },
);

export type User = Static<typeof UserSchema>;
