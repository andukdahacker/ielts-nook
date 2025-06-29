import { Static, Type } from "@sinclair/typebox";
import { BaseResponseSchema } from "../../../types/response";
import { CenterSchema } from "../../center/schema/center.schema";
import { UserSchema } from "../../user/schema/user.schema";

export const GetMeResponseSchema = BaseResponseSchema(
  Type.Object({
    center: Type.Optional(CenterSchema),
    user: Type.Optional(UserSchema),
  }),
);

export type GetMeResponse = Static<typeof GetMeResponseSchema>;
