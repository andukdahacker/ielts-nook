import { Static, Type } from "@sinclair/typebox";
import { BaseResponseSchema } from "../../../types/response";
import { UserSchema } from "../schema/user.schema";

export const CreateUserResponseSchema = BaseResponseSchema(
  Type.Object({
    user: UserSchema,
  }),
);

export type CreateUserResponse = Static<typeof CreateUserResponseSchema>;
