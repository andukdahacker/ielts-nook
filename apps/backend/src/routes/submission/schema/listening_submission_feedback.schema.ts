import { Static, Type } from '@sinclair/typebox';

export const ListeningSubmissionFeedbackSchema = Type.Object(
    {
        feedback: Type.String(),
    },
    {
        $id: 'ListeningSubmissionFeedback',
    },
);

export type ListeningSubmissionFeedback = Static<typeof ListeningSubmissionFeedbackSchema>;
