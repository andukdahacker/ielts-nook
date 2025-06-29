import { Static, Type } from '@sinclair/typebox';

export const ReadingExerciseTypeSchema = Type.Union([
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

//Multiple choice
export const ReadingMultipleChoiceQuestionOptionSchema = Type.Object(
    {
        content: Type.String(),
        order: Type.Number(),
        value: Type.String(),
    },
    { $id: 'ReadingMultipleChoiceQuestionOption' },
);

export const ReadingMultipleChoiceQuestionSchema = Type.Object(
    {
        content: Type.String(),
        correctAnswer: Type.String(),
        order: Type.Number(),
        options: Type.Array(ReadingMultipleChoiceQuestionOptionSchema),
    },
    { $id: 'ReadingMultipleChoiceQuestion' },
);

export const ReadingMultipleChoiceTaskSchema = Type.Object(
    {
        order: Type.Number(),
        type: ReadingExerciseTypeSchema,
        instructions: Type.Any(),
        questions: Type.Array(ReadingMultipleChoiceQuestionSchema),
    },
    { $id: 'ReadingMultipleChoiceTask' },
);

//True/false/Not given
export const ReadingTFNGOptionSchema = Type.Union(
    [Type.Literal('TRUE'), Type.Literal('FALSE'), Type.Literal('NOT GIVEN')],
    { $id: 'ReadingTFNGOption' },
);

export const ReadingTFNGQuestionSchema = Type.Object(
    {
        order: Type.Number(),
        content: Type.String(),
        correctAnswer: ReadingTFNGOptionSchema,
    },
    { $id: 'ReadingTFNGQuestion' },
);

export const ReadingTFNGTaskSchema = Type.Object(
    {
        order: Type.Number(),
        type: ReadingExerciseTypeSchema,
        instructions: Type.Any(),
        questions: Type.Array(ReadingTFNGQuestionSchema),
    },
    { $id: 'ReadingTFNGTask' },
);

//Yes/No/Not Given
export const ReadingYNNGOptionSchema = Type.Union(
    [Type.Literal('YES'), Type.Literal('NO'), Type.Literal('NOT GIVEN')],
    { $id: 'ReadingYNNGOption' },
);

export const ReadingYNNGQuestionSchema = Type.Object(
    {
        order: Type.Number(),
        content: Type.String(),
        correctAnswer: ReadingYNNGOptionSchema,
    },
    { $id: 'ReadingYNNGQuestion' },
);

export const ReadingYNNGTaskSchema = Type.Object(
    {
        order: Type.Number(),
        instructions: Type.Any(),
        type: ReadingExerciseTypeSchema,
        questions: Type.Array(ReadingYNNGQuestionSchema),
    },
    { $id: 'ReadingYNNGTask' },
);

//Summary completion
export const ReadingSummaryCompletionOptionSchema = Type.Object(
    {
        order: Type.Number(),
        value: Type.String(),
        content: Type.String(),
    },
    { $id: 'ReadingSummaryCompletionOption' },
);

export const ReadingSummaryCompletionQuestionSchema = Type.Object(
    {
        order: Type.Number(),
        options: Type.Array(ReadingSummaryCompletionOptionSchema),
        correctAnswer: Type.String(),
    },
    { $id: 'ReadingSummaryCompletionQuestion' },
);

export const ReadingSummaryCompletionTaskSchema = Type.Object(
    {
        order: Type.Number(),
        type: ReadingExerciseTypeSchema,
        instruction: Type.Any(),
        title: Type.String(),
        content: Type.String(),
        questions: Type.Array(ReadingSummaryCompletionQuestionSchema),
    },
    { $id: 'ReadingSummaryCompletionTask' },
);

//Sentence completion
export const ReadingSentenceCompletionQuestionSchema = Type.Object(
    {
        order: Type.Number(),
        correctAnswer: Type.String(),
    },
    { $id: 'ReadingSentenceCompletionQuestion' },
);

export const ReadingSentenceCompletionTaskSchema = Type.Object(
    {
        order: Type.Number(),
        instruction: Type.Any(),
        questions: Type.Array(ReadingSentenceCompletionQuestionSchema),
        type: ReadingExerciseTypeSchema,
    },
    { $id: 'ReadingSentenceCompletionTask' },
);

//Note completion
export const ReadingNoteCompletionQuestionSchema = Type.Object(
    {
        order: Type.Number(),
        content: Type.String(),
        correctAnswer: Type.String(),
    },
    { $id: 'ReadingNoteCompletionQuestion' },
);

export const ReadingNoteCompletionTaskSchema = Type.Object(
    {
        order: Type.Number(),
        instructions: Type.Any(),
        questions: Type.Array(ReadingNoteCompletionQuestionSchema),
    },
    { $id: 'ReadingNoteCompletionTask' },
);

//Table completion
export const ReadingTableCompletionQuestionSchema = Type.Object(
    {
        order: Type.Number(),
        correctAnswer: Type.String(),
    },
    { $id: 'ReadingTableCompletionQuestion' },
);

export const ReadingTableCompletionTaskSchema = Type.Object(
    {
        order: Type.Number(),
        instructions: Type.Any(),
        table: Type.Any(),
        questions: Type.Array(ReadingTableCompletionQuestionSchema),
    },
    { $id: 'ReadingTableCompletionTask' },
);

//Flowchart completion
export const ReadingFlowchartCompletionQuestionSchema = Type.Object(
    {
        order: Type.Number(),
        correctAnswer: Type.String(),
    },
    { $id: 'ReadingFlowchartCompletionQuestion' },
);

export const ReadingFlowchartCompletionTaskSchema = Type.Object(
    {
        instructions: Type.Any(),
        table: Type.Any(),
        questions: Type.Array(ReadingFlowchartCompletionQuestionSchema),
    },
    { $id: 'ReadingFlowchartCompletionTask' },
);

//Diagram label
export const ReadingDiagramLabelCompletionQuestionSchema = Type.Object(
    {
        order: Type.Number(),
        correctAnswer: Type.String(),
    },
    { $id: 'ReadingDiagramLabelCompletionQuestion' },
);

export const ReadingDiagramLabelCompletionTaskSchema = Type.Object(
    {
        order: Type.Number(),
        instructions: Type.Any(),
        diagram: Type.Any(),
    },
    { $id: 'ReadingDiagramLabelCompletionTask' },
);

//Match headings to paragraph
export const ReadingMatchHTPOptionSchema = Type.Object(
    {
        order: Type.Number(),
        value: Type.String(),
        content: Type.String(),
    },
    { $id: 'ReadingMatchHTPOption' },
);

export const ReadingMatchHTPQuestionSchema = Type.Object(
    {
        order: Type.Number(),
        content: Type.String(),
        correctAnswer: Type.String(),
    },
    { $id: 'ReadingMatchHTPQuestion' },
);

export const ReadingMatchHTPTaskSchema = Type.Object(
    {
        order: Type.Number(),
        instructions: Type.Any(),
        questions: Type.Array(ReadingMatchHTPQuestionSchema),
        options: Type.Array(ReadingMatchHTPOptionSchema),
    },
    { $id: 'ReadingMatchHTPTask' },
);

//Reading exercise
export const ReadingExerciseSchema = Type.Object(
    {
        title: Type.String(),
        content: Type.Any(),
        tasks: Type.Array(
            Type.Union([
                ReadingMultipleChoiceTaskSchema,
                ReadingTFNGTaskSchema,
                ReadingSummaryCompletionTaskSchema,
                ReadingYNNGTaskSchema,
                ReadingSentenceCompletionTaskSchema,
            ]),
        ),
    },
    { $id: 'ReadingExercise' },
);

export type ReadingExercise = Static<typeof ReadingExerciseSchema>;
