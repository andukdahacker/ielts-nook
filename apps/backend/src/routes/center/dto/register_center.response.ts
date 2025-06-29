import { Static, Type } from "@sinclair/typebox";
import { BaseResponseSchema } from "../../../types/response";
import { CenterSchema } from "../schema/center.schema";

export const RegisterCenterResponseSchema = BaseResponseSchema(
  Type.Object({
    center: CenterSchema,
  }),
);

export type RegisterCenterResponse = Static<
  typeof RegisterCenterResponseSchema
>;
