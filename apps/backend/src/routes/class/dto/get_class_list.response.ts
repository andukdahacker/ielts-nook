import { Static, Type } from "@sinclair/typebox";
import { PaginatedBaseReponseSchema } from "../../../types/response";
import { UserSchema } from "../../user/schema/user.schema";
import { ClassSchema } from "../schema/class.schema";

export const GetClassListResponseSchema = PaginatedBaseReponseSchema(
  Type.Object({
    class: ClassSchema,
    members: Type.Array(UserSchema),
  }),
);

export type GetClassListResponse = Static<typeof GetClassListResponseSchema>;
