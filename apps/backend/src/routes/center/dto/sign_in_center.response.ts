import { Static, Type } from "@sinclair/typebox";
import { BaseResponseSchema } from "../../../types/response";
import { CenterSchema } from "../schema/center.schema";

export const SignInCenterResponseSchema = BaseResponseSchema(
  Type.Object({
    token: Type.String(),
    center: CenterSchema,
  }),
);

export type SignInCenterResponse = Static<typeof SignInCenterResponseSchema>
