import { Static, Type } from '@sinclair/typebox';

export const UpdateSubmissionInputSchema = Type.Object(
    {
        id: Type.String(),
        content: Type.Optional(Type.Any()),
        grade: Type.Optional(Type.Any()),
        feedback: Type.Optional(Type.Any()),
        isReviewed: Type.Optional(Type.Boolean()),
    },
    {
        $id: 'UpdateSubmissionInput',
    },
);

export type UpdateSubmissionInput = Static<typeof UpdateSubmissionInputSchema>;
