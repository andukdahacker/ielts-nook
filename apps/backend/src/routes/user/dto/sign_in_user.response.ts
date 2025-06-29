import { Static, Type } from "@sinclair/typebox";
import { BaseResponseSchema } from "../../../types/response";
import { UserSchema } from "../schema/user.schema";

export const SignInUserResponseSchema = BaseResponseSchema(
  Type.Object({
    token: Type.String(),
    user: UserSchema,
  }),
);

export type SignInUserResponse = Static<typeof SignInUserResponseSchema>;
