import { Static, Type } from '@sinclair/typebox';

export const WritingSubmissionGradeSchema = Type.Object(
    {
        taskAchievement: Type.Number(),
        taskAchievementComment: Type.String(),
        coherenceAndCohesion: Type.Number(),
        coherenceAndCohesionComment: Type.String(),
        lexicalResource: Type.Number(),
        lexicalResourceComment: Type.String(),
        grammaticalRangeAndAccuracy: Type.Number(),
        grammaticalRangeAndAccuracyComment: Type.String(),
    },
    { $id: 'WritingSubmissionGrade' },
);

export type WritingSubmissionGrade = Static<typeof WritingSubmissionGradeSchema>;
