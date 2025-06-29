import { Static, Type } from '@sinclair/typebox';

export const ListeningExerciseTypeSchema = Type.Union([
    Type.Literal('Multiple choice'),
    Type.Literal('True/False/Not Given'),
    Type.Literal('Yes/No/Not Given'),
    Type.Literal('Summary Completion'),
    Type.Literal('Sentence Completion'),
    Type.Literal('Note Completion'),
    Type.Literal('Tabel Completion'),
    Type.Literal('Flowchart Completion'),
    Type.Literal('Matching heading to paragraph'),
]);

export const ListeningMultipleChoiceQuestionOptionSchema = Type.Object(
    {
        content: Type.String(),
        order: Type.Number(),
        value: Type.String(),
    },
    { $id: 'ListeningMultipleChoiceQuestionOption' },
);

export const ListeningMultipleChoiceQuestionSchema = Type.Object(
    {
        content: Type.String(),
        correctAnswer: Type.String(),
        order: Type.Number(),
        options: Type.Array(ListeningMultipleChoiceQuestionOptionSchema),
    },
    { $id: 'ListeningMultipleChoiceQuestion' },
);

export const ListeningMultipleChoiceTaskSchema = Type.Object(
    {
        order: Type.Number(),
        type: ListeningExerciseTypeSchema,
        instructions: Type.Any(),
        questions: Type.Array(ListeningMultipleChoiceQuestionSchema),
    },
    { $id: 'ListeningMultipleChoiceTask' },
);

export const ListeningExerciseSchema = Type.Object(
    {
        file: Type.Optional(
            Type.Object({
                url: Type.String(),
                key: Type.String(),
                fileName: Type.String(),
            }),
        ),
        tasks: Type.Array(Type.Union([ListeningMultipleChoiceTaskSchema])),
    },
    { $id: 'ListeningExercise' },
);

export type ListeningExercise = Static<typeof ListeningExerciseSchema>;
