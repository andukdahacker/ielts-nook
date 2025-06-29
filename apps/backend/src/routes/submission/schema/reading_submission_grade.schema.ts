import { Static, Type } from '@sinclair/typebox';

export const ReadingSubmissionGradeSchema = Type.Object(
    {
        score: Type.Number(),
        total: Type.Number(),
    },
    { $id: 'ReadingSubmissionGrade' },
);

export type ReadingSubmissionGrade = Static<typeof ReadingSubmissionGradeSchema>;
