import { Static, Type } from "@sinclair/typebox";
import { UserRoleSchema } from "../schema/user.schema";

export const CreateUserInputSchema = Type.Object(
  {
    email: Type.String(),
    password: Type.String(),
    role: UserRoleSchema,
    username: Type.Optional(Type.String()),
    firstName: Type.Optional(Type.String()),
    lastName: Type.Optional(Type.String()),
    phoneNumber: Type.Optional(Type.String()),
  },
  {
    $id: "CreateUserInput",
  },
);

export type CreateUserInput = Static<typeof CreateUserInputSchema>;
