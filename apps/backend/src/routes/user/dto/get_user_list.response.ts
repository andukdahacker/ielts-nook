import { Static, Type } from "@sinclair/typebox";
import { PaginatedBaseReponseSchema } from "../../../types/response";
import { ClassSchema } from "../../class/schema/class.schema";
import { UserSchema } from "../schema/user.schema";

export const GetUserListResponseSchema = PaginatedBaseReponseSchema(
  Type.Object({
    user: UserSchema,
    classes: Type.Array(ClassSchema),
  }),
);

export type GetUserListResponse = Static<typeof GetUserListResponseSchema>;
