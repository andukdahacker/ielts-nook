import { Static, Type } from '@sinclair/typebox';

export const GetClassListByUserInputSchema = Type.Object(
    {
        userId: Type.String(),
        take: Type.Number(),
        cursor: Type.Optional(Type.String()),
        searchString: Type.Optional(Type.String()),
    },
    { $id: 'GetClassListByUserInput' },
);

export type GetClassListByUserInput = Static<typeof GetClassListByUserInputSchema>;
