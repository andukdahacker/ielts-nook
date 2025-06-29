import { Static, Type } from '@sinclair/typebox';
import { Nullable } from '../../../types/nullable';

export const ListeningSubmissionContentSchema = Type.Object(
    {
        tasks: Type.Array(
            Type.Object({
                order: Type.Number(),
                questions: Type.Array(
                    Type.Object({
                        order: Type.Number(),
                        answer: Nullable(Type.String()),
                    }),
                ),
            }),
        ),
    },
    { $id: 'ListeningSubmissionContent' },
);

export type ListeningSubmissionContent = Static<typeof ListeningSubmissionContentSchema>;
