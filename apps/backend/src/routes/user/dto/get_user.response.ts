import { Static } from '@sinclair/typebox';
import { BaseResponseSchema } from '../../../types/response';
import { UserSchema } from '../schema/user.schema';

export const GetUserResponseSchema = BaseResponseSchema(UserSchema);

export type GetUserResponse = Static<typeof GetUserResponseSchema>;
