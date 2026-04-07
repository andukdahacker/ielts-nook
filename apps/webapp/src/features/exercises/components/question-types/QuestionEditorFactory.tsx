import type { IeltsQuestionType } from "@workspace/types";
import { z } from "zod";
import { MCQEditor } from "./MCQEditor";
import { TFNGEditor } from "./TFNGEditor";
import { TextInputEditor } from "./TextInputEditor";
import { WordBankEditor } from "./WordBankEditor";
import { MatchingEditor } from "./MatchingEditor";
import { NoteTableFlowchartEditor } from "./NoteTableFlowchartEditor";
import { DiagramLabellingEditor } from "./DiagramLabellingEditor";
import { SpeakingCueCardEditor } from "./SpeakingCueCardEditor";

interface QuestionEditorFactoryProps {
  sectionType: IeltsQuestionType;
  options: unknown;
  correctAnswer: unknown;
  wordLimit?: number | null;
  questionId?: string;
  exerciseId?: string;
  onChange: (options: unknown, correctAnswer: unknown, wordLimit?: number | null) => void;
}

// Lenient editor schemas — check shape only, not completeness (min counts).
// The strict schemas in @workspace/types are for validation; these are for
// safely coercing DB data during editing (where 0-1 items is valid WIP).
const LenientMCQOptions = z.object({
  items: z.array(z.object({ label: z.string(), text: z.string() })),
  maxSelections: z.number().optional(),
});
const LenientMCQAnswer = z.object({
  answer: z.string().optional(),
  answers: z.array(z.string()).optional(),
});
const LenientTFNGAnswer = z.object({ answer: z.string() });
const LenientTextAnswer = z.object({
  answer: z.string(),
  acceptedVariants: z.array(z.string()).default([]),
  strictWordOrder: z.boolean().default(true),
});
const LenientWordBankOptions = z.object({
  wordBank: z.array(z.string()),
  summaryText: z.string(),
});
const LenientWordBankAnswer = z.object({
  blanks: z.record(z.string(), z.string()),
});
const LenientMatchingOptions = z.object({
  sourceItems: z.array(z.string()),
  targetItems: z.array(z.string()),
});
const LenientMatchingAnswer = z.object({
  matches: z.record(z.string(), z.string()),
});
const LenientNoteTableFlowchartOptions = z.object({
  subFormat: z.enum(["note", "table", "flowchart"]).default("note"),
  structure: z.string(),
  wordLimit: z.number().default(2),
});
const LenientNoteTableFlowchartBlank = z.object({
  answer: z.string(),
  acceptedVariants: z.array(z.string()).default([]),
  strictWordOrder: z.boolean().default(true),
});
const LenientNoteTableFlowchartAnswer = z.object({
  blanks: z.record(z.string(), z.union([z.string(), LenientNoteTableFlowchartBlank])),
});
const LenientDiagramLabellingOptions = z.object({
  diagramUrl: z.string(),
  labelPositions: z.array(z.string()),
  wordBank: z.array(z.string()).optional(),
  wordLimit: z.number().default(2),
});
const LenientDiagramLabellingStructuredLabel = z.object({
  answer: z.string(),
  acceptedVariants: z.array(z.string()).default([]),
  strictWordOrder: z.boolean().default(true),
});
const LenientDiagramLabellingAnswer = z.object({
  labels: z.record(z.string(), z.union([z.string(), LenientDiagramLabellingStructuredLabel])),
});
const LenientSpeakingCueCard = z.object({
  topic: z.string(),
  bulletPoints: z.array(z.string()),
});

/** Migrate NTF blanks from flat string to structured format */
function migrateNtfBlanks(
  parsed: { blanks: Record<string, string | { answer: string; acceptedVariants: string[]; strictWordOrder: boolean }> } | null,
): { blanks: Record<string, { answer: string; acceptedVariants: string[]; strictWordOrder: boolean }> } | null {
  if (!parsed) return null;
  const migrated: Record<string, { answer: string; acceptedVariants: string[]; strictWordOrder: boolean }> = {};
  for (const [key, value] of Object.entries(parsed.blanks)) {
    if (typeof value === "string") {
      migrated[key] = { answer: value, acceptedVariants: [], strictWordOrder: true };
    } else {
      migrated[key] = value;
    }
  }
  return { blanks: migrated };
}

/** Safely parse unknown data, returning null on failure */
function safeParse<T>(schema: { safeParse: (data: unknown) => { success: boolean; data?: T } }, data: unknown): T | null {
  if (data == null) return null;
  const result = schema.safeParse(data);
  return result.success ? (result.data as T) : null;
}

export function QuestionEditorFactory({
  sectionType,
  options,
  correctAnswer,
  wordLimit,
  questionId,
  exerciseId,
  onChange,
}: QuestionEditorFactoryProps) {
  switch (sectionType) {
    case "R1_MCQ_SINGLE":
    case "R2_MCQ_MULTI":
      return (
        <MCQEditor
          sectionType={sectionType}
          options={safeParse(LenientMCQOptions, options)}
          correctAnswer={safeParse(LenientMCQAnswer, correctAnswer)}
          onChange={onChange}
        />
      );

    case "R3_TFNG":
    case "R4_YNNG":
      return (
        <TFNGEditor
          sectionType={sectionType}
          correctAnswer={safeParse(LenientTFNGAnswer, correctAnswer)}
          questionId={questionId}
          onChange={onChange}
        />
      );

    case "R5_SENTENCE_COMPLETION":
    case "R6_SHORT_ANSWER":
    case "R8_SUMMARY_PASSAGE":
    case "L5_SENTENCE_COMPLETION":
    case "L6_SHORT_ANSWER":
      return (
        <TextInputEditor
          correctAnswer={safeParse(LenientTextAnswer, correctAnswer)}
          wordLimit={wordLimit ?? null}
          onChange={onChange}
        />
      );

    case "R7_SUMMARY_WORD_BANK":
      return (
        <WordBankEditor
          options={safeParse(LenientWordBankOptions, options)}
          correctAnswer={safeParse(LenientWordBankAnswer, correctAnswer)}
          onChange={(opts, ans) => onChange(opts, ans)}
        />
      );

    case "R9_MATCHING_HEADINGS":
    case "R10_MATCHING_INFORMATION":
    case "R11_MATCHING_FEATURES":
    case "R12_MATCHING_SENTENCE_ENDINGS":
      return (
        <MatchingEditor
          sectionType={sectionType}
          options={safeParse(LenientMatchingOptions, options)}
          correctAnswer={safeParse(LenientMatchingAnswer, correctAnswer)}
          onChange={(opts, ans) => onChange(opts, ans)}
        />
      );

    case "R13_NOTE_TABLE_FLOWCHART":
    case "L1_FORM_NOTE_TABLE":
      return (
        <NoteTableFlowchartEditor
          options={safeParse(LenientNoteTableFlowchartOptions, options)}
          correctAnswer={migrateNtfBlanks(safeParse(LenientNoteTableFlowchartAnswer, correctAnswer))}
          onChange={(opts, ans) => onChange(opts, ans)}
        />
      );

    case "R14_DIAGRAM_LABELLING":
    case "L4_MAP_PLAN_LABELLING":
      return (
        <DiagramLabellingEditor
          options={safeParse(LenientDiagramLabellingOptions, options)}
          correctAnswer={safeParse(LenientDiagramLabellingAnswer, correctAnswer)}
          exerciseId={exerciseId}
          onChange={(opts, ans) => onChange(opts, ans)}
        />
      );

    case "L2_MCQ":
      return (
        <MCQEditor
          sectionType={sectionType}
          options={safeParse(LenientMCQOptions, options)}
          correctAnswer={safeParse(LenientMCQAnswer, correctAnswer)}
          onChange={onChange}
        />
      );

    case "L3_MATCHING":
      return (
        <MatchingEditor
          sectionType={sectionType}
          options={safeParse(LenientMatchingOptions, options)}
          correctAnswer={safeParse(LenientMatchingAnswer, correctAnswer)}
          onChange={(opts, ans) => onChange(opts, ans)}
        />
      );

    case "W1_TASK1_ACADEMIC":
    case "W2_TASK1_GENERAL":
    case "W3_TASK2_ESSAY":
      return (
        <p className="text-xs text-muted-foreground italic rounded-md border border-dashed p-3">
          Writing task prompt is configured above in the Writing Task Settings section.
        </p>
      );

    case "S1_PART1_QA":
      return (
        <p className="text-xs text-muted-foreground italic rounded-md border border-dashed p-3">
          Part 1 questions are individual items. Add questions below using the question text field.
        </p>
      );

    case "S2_PART2_CUE_CARD":
      return (
        <SpeakingCueCardEditor
          options={safeParse(LenientSpeakingCueCard, options)}
          onChange={(opts, ans) => onChange(opts, ans)}
        />
      );

    case "S3_PART3_DISCUSSION":
      return (
        <p className="text-xs text-muted-foreground italic rounded-md border border-dashed p-3">
          Discussion questions are individual items. Add questions below using the question text field.
        </p>
      );

    default:
      return (
        <p className="text-xs text-muted-foreground italic">
          No editor available for question type: {sectionType}
        </p>
      );
  }
}
