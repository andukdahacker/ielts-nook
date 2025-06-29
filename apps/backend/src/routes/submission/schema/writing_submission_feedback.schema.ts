import { Static, Type } from '@sinclair/typebox';

export const WritingCommentSchema = Type.Object(
    {
        id: Type.String(),
        selectedText: Type.String(),
        from: Type.Number(),
        to: Type.Number(),
        comment: Type.String(),
        author: Type.String(),
        createdAt: Type.String(),
        updatedAt: Type.String(),
    },
    {
        $id: 'WritingComment',
    },
);

export type WritingComment = Static<typeof WritingCommentSchema>;

export const WritingSubmissionFeedbackSchema = Type.Object(
    {
        comments: Type.Array(WritingCommentSchema),
    },
    {
        $id: 'WritingSubmissionFeedback',
    },
);

export type WritingSubmissionFeedback = Static<typeof WritingSubmissionFeedbackSchema>;
