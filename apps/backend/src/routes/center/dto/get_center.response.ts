import { Static, Type } from "@sinclair/typebox";
import { BaseResponseSchema } from "../../../types/response";
import { CenterSchema } from "../schema/center.schema";

export const GetCenterResponseSchema = BaseResponseSchema(
  Type.Object({
    center: CenterSchema,
  }),
);

export type GetCenterResponse = Static<typeof GetCenterResponseSchema>;
