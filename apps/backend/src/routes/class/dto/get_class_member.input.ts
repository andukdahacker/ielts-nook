import { Static, Type } from '@sinclair/typebox';

export const GetClassMemberInputSchema = Type.Object(
    {
        userId: Type.String(),
        classId: Type.String(),
    },
    { $id: 'GetClassMemberInput' },
);

export type GetClassMemberInput = Static<typeof GetClassMemberInputSchema>;
