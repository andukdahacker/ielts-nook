import { Static, Type } from "@sinclair/typebox";
import { UserRoleSchema } from "../schema/user.schema";

export const UpdateUserInputSchema = Type.Object(
  {
    userId: Type.String(),
    username: Type.Optional(Type.String()),
    firstName: Type.Optional(Type.String()),
    lastName: Type.Optional(Type.String()),
    phoneNumber: Type.Optional(Type.String()),
    role: Type.Optional(UserRoleSchema),
  },
  {
    $id: "UpdateUserInput",
  },
);

export type UpdateUserInput = Static<typeof UpdateUserInputSchema>;
