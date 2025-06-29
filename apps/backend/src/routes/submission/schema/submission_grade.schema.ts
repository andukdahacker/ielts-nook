import { Static, Type } from '@sinclair/typebox';
import { ListeningSubmissionGradeSchema } from './listening_submission_grade.schema';
import { ReadingSubmissionGradeSchema } from './reading_submission_grade.schema';
import { WritingSubmissionGradeSchema } from './writing_submission_grade.schema';

export const SubmissionGradeSchema = Type.Union(
    [ReadingSubmissionGradeSchema, ListeningSubmissionGradeSchema, WritingSubmissionGradeSchema],
    { $id: 'SubmissionGradeSchema' },
);

export type SubmissionGrade = Static<typeof SubmissionGradeSchema>;
