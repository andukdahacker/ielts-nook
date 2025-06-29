import { Static, Type } from '@sinclair/typebox';

export const ListeningSubmissionGradeSchema = Type.Object(
    {
        score: Type.Number(),
        total: Type.Number(),
    },
    { $id: 'ListeningSubmissionGrade' },
);

export type ListeningSubmissionGrade = Static<typeof ListeningSubmissionGradeSchema>;
