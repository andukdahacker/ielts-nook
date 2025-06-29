import { Static, Type } from "@sinclair/typebox";
import { BaseResponseSchema } from "../../../types/response";
import { ClassSchema } from "../schema/class.schema";

export const CreateClassResponseSchema = BaseResponseSchema(
  Type.Object({
    class: ClassSchema,
  }),
);

export type CreateClassResponse = Static<typeof CreateClassResponseSchema>;
