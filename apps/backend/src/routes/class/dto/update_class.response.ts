import { Static, Type } from "@sinclair/typebox";
import { BaseResponseSchema } from "../../../types/response";
import { ClassSchema } from "../schema/class.schema";

export const UpdateClassResponseSchema = BaseResponseSchema(
  Type.Object({
    class: ClassSchema,
  }),
);

export type UpdateClassResponse = Static<typeof UpdateClassResponseSchema>;
