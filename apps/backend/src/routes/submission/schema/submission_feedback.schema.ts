import { Static, Type } from '@sinclair/typebox';
import { ListeningSubmissionFeedbackSchema } from './listening_submission_feedback.schema';
import { ReadingSubmissionFeedbackSchema } from './reading_submission_feedback.schema';
import { WritingSubmissionFeedbackSchema } from './writing_submission_feedback.schema';

export const SubmissionFeedbackSchema = Type.Union(
    [WritingSubmissionFeedbackSchema, ReadingSubmissionFeedbackSchema, ListeningSubmissionFeedbackSchema],
    {
        $id: 'SubmissionFeedback',
    },
);

export type SubmissionFeedback = Static<typeof SubmissionFeedbackSchema>;
