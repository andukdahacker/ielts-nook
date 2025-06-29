import { Static, Type } from '@sinclair/typebox';

export const ClassMemberSchema = Type.Object(
    {
        classId: Type.String(),
        userId: Type.String(),
    },
    { $id: 'ClassMember' },
);

export type ClassMember = Static<typeof ClassMemberSchema>;
