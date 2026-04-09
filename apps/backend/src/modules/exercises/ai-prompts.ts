import { z } from "zod";

// Common system prompt for IELTS question generation
const IELTS_SYSTEM_PROMPT = `You are an experienced IELTS examiner and question writer. Generate high-quality IELTS Reading questions based on the provided passage. Follow these rules strictly:
- Questions must be answerable ONLY from the passage text provided
- Each question must test a different aspect of the passage
- Difficulty calibration matters — follow the specified difficulty level
- Generate exactly the requested number of questions
- All answers must be verifiable against the passage`;

const DIFFICULTY_INSTRUCTIONS: Record<string, string> = {
  easy: "Easy difficulty: Use straightforward vocabulary, correct answers use passage words directly, obvious distractors that are clearly wrong.",
  medium: "Medium difficulty: Use paraphrased statements, plausible distractors using passage vocabulary, some inference required.",
  hard: "Hard difficulty: Heavy paraphrasing, subtle distractors requiring careful reading, NOT_GIVEN requires deep topic understanding, synonym variants in answers.",
};

// --- Output schemas for each question type ---

const MCQSingleOutputSchema = z.object({
  questions: z.array(z.object({
    questionText: z.string(),
    options: z.array(z.object({
      label: z.string(),
      text: z.string(),
    })).min(4).max(4),
    correctAnswer: z.string(), // label e.g. "A"
  })),
});

const MCQMultiOutputSchema = z.object({
  questions: z.array(z.object({
    questionText: z.string(),
    options: z.array(z.object({
      label: z.string(),
      text: z.string(),
    })).min(5).max(7),
    correctAnswers: z.array(z.string()).min(2).max(3),
    maxSelections: z.number(),
  })),
});

const TFNGOutputSchema = z.object({
  questions: z.array(z.object({
    questionText: z.string(),
    correctAnswer: z.enum(["TRUE", "FALSE", "NOT_GIVEN"]),
  })),
});

const YNNGOutputSchema = z.object({
  questions: z.array(z.object({
    questionText: z.string(),
    correctAnswer: z.enum(["YES", "NO", "NOT_GIVEN"]),
  })),
});

const TextAnswerOutputSchema = z.object({
  questions: z.array(z.object({
    questionText: z.string(),
    correctAnswer: z.string(),
    acceptedVariants: z.array(z.string()),
    wordLimit: z.number().optional(),
  })),
});

const WordBankOutputSchema = z.object({
  summaryText: z.string(),
  wordBank: z.array(z.string()),
  questions: z.array(z.object({
    blankIndex: z.string(),
    correctAnswer: z.string(),
  })),
});

const MatchingOutputSchema = z.object({
  sourceItems: z.array(z.string()),
  targetItems: z.array(z.string()),
  matches: z.array(z.object({
    sourceIndex: z.string(),
    targetIndex: z.string(),
  })),
  questionText: z.string(),
});

const NoteTableFlowchartOutputSchema = z.object({
  subFormat: z.enum(["note", "table", "flowchart"]),
  structure: z.string(),
  wordLimit: z.number(),
  blanks: z.array(z.object({
    blankId: z.string(),
    answer: z.string(),
    acceptedVariants: z.array(z.string()),
  })),
  questionText: z.string(),
});

const DiagramLabellingOutputSchema = z.object({
  labels: z.array(z.object({
    labelId: z.string(),
    answer: z.string(),
    acceptedVariants: z.array(z.string()),
  })),
  questionText: z.string(),
});

// --- Prompt configs per question type ---

interface PromptConfig {
  systemPrompt: string;
  schema: z.ZodType;
}

function buildPrompt(typeInstructions: string, count: number, difficulty: string): string {
  return `${IELTS_SYSTEM_PROMPT}

${DIFFICULTY_INSTRUCTIONS[difficulty] || DIFFICULTY_INSTRUCTIONS.medium}

${typeInstructions}

Generate exactly ${count} questions.`;
}

export function getPromptAndSchema(
  questionType: string,
  count: number,
  difficulty: string,
): PromptConfig {
  switch (questionType) {
    case "R1_MCQ_SINGLE":
      return {
        systemPrompt: buildPrompt(
          "Generate Multiple Choice questions with 4 options (A, B, C, D). Only ONE answer is correct. Create plausible distractors that test careful reading.",
          count, difficulty,
        ),
        schema: MCQSingleOutputSchema,
      };

    case "R2_MCQ_MULTI":
      return {
        systemPrompt: buildPrompt(
          "Generate Multiple Choice questions with 5-7 options. 2-3 answers are correct. Specify maxSelections. Create plausible distractors.",
          count, difficulty,
        ),
        schema: MCQMultiOutputSchema,
      };

    case "R3_TFNG":
      return {
        systemPrompt: buildPrompt(
          "Generate True/False/Not Given statements. Each statement should be classified as TRUE (agrees with passage), FALSE (contradicts passage), or NOT_GIVEN (no information in passage). Ensure a good mix of all three answer types.",
          count, difficulty,
        ),
        schema: TFNGOutputSchema,
      };

    case "R4_YNNG":
      return {
        systemPrompt: buildPrompt(
          "Generate Yes/No/Not Given statements about the writer's views/claims. Each statement should be classified as YES (writer agrees), NO (writer disagrees), or NOT_GIVEN (writer's view not stated). Ensure a good mix.",
          count, difficulty,
        ),
        schema: YNNGOutputSchema,
      };

    case "R5_SENTENCE_COMPLETION":
      return {
        systemPrompt: buildPrompt(
          "Generate Sentence Completion questions. Each question is an incomplete sentence that must be completed using words from the passage. Provide the correct answer and accepted variants (synonyms, alternative phrasing). Include a word limit.",
          count, difficulty,
        ),
        schema: TextAnswerOutputSchema,
      };

    case "R6_SHORT_ANSWER":
      return {
        systemPrompt: buildPrompt(
          "Generate Short Answer questions (WH-questions). Answers should be brief text taken from the passage. Provide accepted variants. Include a word limit.",
          count, difficulty,
        ),
        schema: TextAnswerOutputSchema,
      };

    case "R7_SUMMARY_WORD_BANK":
      return {
        systemPrompt: buildPrompt(
          "Generate a Summary with Word Bank. Create a summary of part of the passage with blanks, and a word bank containing the correct answers plus distractors. The word bank should have more words than blanks.",
          count, difficulty,
        ),
        schema: WordBankOutputSchema,
      };

    case "R8_SUMMARY_PASSAGE":
      return {
        systemPrompt: buildPrompt(
          "Generate Summary Completion questions where answers come directly from the passage (no word bank). Each question is a sentence with a blank to fill. Provide correct answer and accepted variants.",
          count, difficulty,
        ),
        schema: TextAnswerOutputSchema,
      };

    case "R9_MATCHING_HEADINGS":
      return {
        systemPrompt: buildPrompt(
          "Generate Matching Headings. Create headings (more headings than paragraphs as distractors) that match to paragraph numbers. sourceItems = paragraph labels (e.g., 'Paragraph A'), targetItems = headings (include extras as distractors). Provide correct matches.",
          count, difficulty,
        ),
        schema: MatchingOutputSchema,
      };

    case "R10_MATCHING_INFORMATION":
      return {
        systemPrompt: buildPrompt(
          "Generate Matching Information questions. Statements must be matched to the correct paragraph. sourceItems = statements, targetItems = paragraph labels. Provide correct matches.",
          count, difficulty,
        ),
        schema: MatchingOutputSchema,
      };

    case "R11_MATCHING_FEATURES":
      return {
        systemPrompt: buildPrompt(
          "Generate Matching Features questions. Items must be matched to categories/people/features from the passage. sourceItems = items to match, targetItems = categories. Provide correct matches.",
          count, difficulty,
        ),
        schema: MatchingOutputSchema,
      };

    case "R12_MATCHING_SENTENCE_ENDINGS":
      return {
        systemPrompt: buildPrompt(
          "Generate Matching Sentence Endings. sourceItems = sentence beginnings, targetItems = sentence endings (include extras as distractors). Provide correct matches.",
          count, difficulty,
        ),
        schema: MatchingOutputSchema,
      };

    case "R13_NOTE_TABLE_FLOWCHART":
      return {
        systemPrompt: buildPrompt(
          // Storage format uses ___N___ markers; frontend renders them as (N) for display
          "Generate Note/Table/Flowchart Completion. Choose a subFormat (note, table, or flowchart). Create a structure string with blanks (marked as ___1___, ___2___, etc.). Provide answers for each blank with accepted variants. Set an appropriate word limit.",
          count, difficulty,
        ),
        schema: NoteTableFlowchartOutputSchema,
      };

    case "R14_DIAGRAM_LABELLING":
      return {
        systemPrompt: buildPrompt(
          "Generate Diagram Labelling answers. Since diagrams require images, generate label text answers based on passage content. Each label should have an ID, the correct answer text, and accepted variants. These labels would be placed on a diagram image.",
          count, difficulty,
        ),
        schema: DiagramLabellingOutputSchema,
      };

    default:
      throw new Error(`Unsupported question type for AI generation: ${questionType}`);
  }
}

// --- Transform AI output to exercise format ---

export interface GeneratedQuestion {
  questionText: string;
  questionType: string;
  options: unknown;
  correctAnswer: unknown;
  wordLimit?: number | null;
}

export interface GeneratedSection {
  sectionType: string;
  instructions: string;
  questions: GeneratedQuestion[];
}

// Union of all AI output shapes parsed from Gemini responses
type AIOutputShape = Record<string, unknown>;

export function transformToExerciseFormat(
  questionType: string,
  parsed: AIOutputShape,
): GeneratedSection {
  switch (questionType) {
    case "R1_MCQ_SINGLE":
      return {
        sectionType: questionType,
        instructions: "Choose the correct letter, A, B, C or D.",
        questions: (parsed.questions as Array<{ questionText: string; options: { label: string; text: string }[]; correctAnswer: string }>).map((q) => ({
          questionText: q.questionText,
          questionType,
          options: { items: q.options },
          correctAnswer: { answer: q.correctAnswer },
        })),
      };

    case "R2_MCQ_MULTI":
      return {
        sectionType: questionType,
        instructions: "Choose the correct letters.",
        questions: (parsed.questions as Array<{ questionText: string; options: { label: string; text: string }[]; correctAnswers: string[]; maxSelections: number }>).map((q) => ({
          questionText: q.questionText,
          questionType,
          options: { items: q.options, maxSelections: q.maxSelections },
          correctAnswer: { answers: q.correctAnswers },
        })),
      };

    case "R3_TFNG":
      return {
        sectionType: questionType,
        instructions: "Do the following statements agree with the information given in the passage? Write TRUE, FALSE, or NOT GIVEN.",
        questions: (parsed.questions as Array<{ questionText: string; correctAnswer: string }>).map((q) => ({
          questionText: q.questionText,
          questionType,
          options: null,
          correctAnswer: { answer: q.correctAnswer },
        })),
      };

    case "R4_YNNG":
      return {
        sectionType: questionType,
        instructions: "Do the following statements agree with the views of the writer? Write YES, NO, or NOT GIVEN.",
        questions: (parsed.questions as Array<{ questionText: string; correctAnswer: string }>).map((q) => ({
          questionText: q.questionText,
          questionType,
          options: null,
          correctAnswer: { answer: q.correctAnswer },
        })),
      };

    case "R5_SENTENCE_COMPLETION":
      return {
        sectionType: questionType,
        instructions: "Complete the sentences below. Use NO MORE THAN THREE WORDS from the passage for each answer.",
        questions: (parsed.questions as Array<{ questionText: string; correctAnswer: string; acceptedVariants: string[]; wordLimit?: number }>).map((q) => ({
          questionText: q.questionText,
          questionType,
          options: null,
          correctAnswer: {
            answer: q.correctAnswer,
            acceptedVariants: q.acceptedVariants,
            strictWordOrder: true,
          },
          wordLimit: q.wordLimit ?? 3,
        })),
      };

    case "R6_SHORT_ANSWER":
      return {
        sectionType: questionType,
        instructions: "Answer the questions below. Use NO MORE THAN THREE WORDS from the passage for each answer.",
        questions: (parsed.questions as Array<{ questionText: string; correctAnswer: string; acceptedVariants: string[]; wordLimit?: number }>).map((q) => ({
          questionText: q.questionText,
          questionType,
          options: null,
          correctAnswer: {
            answer: q.correctAnswer,
            acceptedVariants: q.acceptedVariants,
            strictWordOrder: true,
          },
          wordLimit: q.wordLimit ?? 3,
        })),
      };

    case "R7_SUMMARY_WORD_BANK": {
      // R7 is a single question with all blanks in one correctAnswer record
      const allBlanks: Record<string, string> = {};
      for (const q of parsed.questions as Array<{ blankIndex: string; correctAnswer: string }>) {
        allBlanks[q.blankIndex] = q.correctAnswer;
      }
      return {
        sectionType: questionType,
        instructions: "Complete the summary below. Choose words from the box.",
        questions: [{
          questionText: parsed.summaryText as string,
          questionType,
          options: {
            wordBank: parsed.wordBank as string[],
            summaryText: parsed.summaryText as string,
          },
          correctAnswer: { blanks: allBlanks },
        }],
      };
    }

    case "R8_SUMMARY_PASSAGE":
      return {
        sectionType: questionType,
        instructions: "Complete the summary below using words from the passage.",
        questions: (parsed.questions as Array<{ questionText: string; correctAnswer: string; acceptedVariants: string[]; wordLimit?: number }>).map((q) => ({
          questionText: q.questionText,
          questionType,
          options: null,
          correctAnswer: {
            answer: q.correctAnswer,
            acceptedVariants: q.acceptedVariants,
            strictWordOrder: true,
          },
          wordLimit: q.wordLimit ?? 3,
        })),
      };

    case "R9_MATCHING_HEADINGS":
    case "R10_MATCHING_INFORMATION":
    case "R11_MATCHING_FEATURES":
    case "R12_MATCHING_SENTENCE_ENDINGS": {
      const matchMap: Record<string, string> = {};
      for (const m of parsed.matches as Array<{ sourceIndex: string; targetIndex: string }>) {
        matchMap[m.sourceIndex] = m.targetIndex;
      }
      return {
        sectionType: questionType,
        instructions: parsed.questionText as string,
        questions: [{
          questionText: parsed.questionText as string,
          questionType,
          options: {
            sourceItems: parsed.sourceItems as string[],
            targetItems: parsed.targetItems as string[],
          },
          correctAnswer: { matches: matchMap },
        }],
      };
    }

    case "R13_NOTE_TABLE_FLOWCHART": {
      const blanksMap: Record<string, { answer: string; acceptedVariants: string[]; strictWordOrder: boolean }> = {};
      for (const b of parsed.blanks as Array<{ blankId: string; answer: string; acceptedVariants: string[] }>) {
        blanksMap[b.blankId] = {
          answer: b.answer,
          acceptedVariants: b.acceptedVariants,
          strictWordOrder: true,
        };
      }
      return {
        sectionType: questionType,
        instructions: parsed.questionText as string,
        questions: [{
          questionText: parsed.questionText as string,
          questionType,
          options: {
            subFormat: parsed.subFormat as string,
            structure: parsed.structure as string,
            wordLimit: parsed.wordLimit as number,
          },
          correctAnswer: { blanks: blanksMap },
        }],
      };
    }

    case "R14_DIAGRAM_LABELLING": {
      const labelsMap: Record<string, { answer: string; acceptedVariants: string[]; strictWordOrder: boolean }> = {};
      for (const l of parsed.labels as Array<{ labelId: string; answer: string; acceptedVariants: string[] }>) {
        labelsMap[l.labelId] = {
          answer: l.answer,
          acceptedVariants: l.acceptedVariants,
          strictWordOrder: true,
        };
      }
      return {
        sectionType: questionType,
        instructions: parsed.questionText as string,
        questions: [{
          questionText: parsed.questionText as string,
          questionType,
          options: {
            diagramUrl: "pending-upload",
            labelPositions: (parsed.labels as Array<{ labelId: string }>).map((l) => l.labelId),
            wordLimit: 2,
          },
          correctAnswer: { labels: labelsMap },
        }],
      };
    }

    default:
      throw new Error(`Unsupported question type for transformation: ${questionType}`);
  }
}
