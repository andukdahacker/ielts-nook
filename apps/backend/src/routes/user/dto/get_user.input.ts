import { Static, Type } from '@sinclair/typebox';

export const GetUserInputSchema = Type.Object({
    id: Type.String(),
});

export type GetUserInput = Static<typeof GetUserInputSchema>;
