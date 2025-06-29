import { Static, Type } from "@sinclair/typebox";
import { BaseResponseSchema } from "../../../types/response";
import { UserSchema } from "../schema/user.schema";

export const UpdateUserResponseSchema = BaseResponseSchema(
  Type.Object({
    user: UserSchema,
  }),
);

export type UpdateUserResponse = Static<typeof UpdateUserResponseSchema>;
