import type { IeltsQuestionType } from "@workspace/types";
import { MCQInput } from "./MCQInput";
import { TextAnswerInput } from "./TextAnswerInput";
import { WordBankInput } from "./WordBankInput";
import { MatchingInput } from "./MatchingInput";
import { NoteTableFlowchartInput } from "./NoteTableFlowchartInput";
import { DiagramLabellingInput } from "./DiagramLabellingInput";
import { WritingInput } from "./WritingInput";
import { SpeakingInput } from "./SpeakingInput";
import { PhotoCaptureInput } from "./PhotoCaptureInput";

/** Minimal question shape needed for rendering inputs — avoids requiring full Question type */
interface QuestionForInput {
  id: string;
  questionText: string;
  questionType: string;
  options: unknown;
  wordLimit: number | null;
}

interface QuestionInputFactoryProps {
  sectionType: IeltsQuestionType;
  question: QuestionForInput;
  questionIndex: number;
  value: unknown;
  onChange: (answer: unknown) => void;
  onPhotoCapture?: (file: File) => void;
  speakingPrepTime?: number | null;
  speakingTime?: number | null;
  readOnly?: boolean;
}

export function QuestionInputFactory({
  sectionType,
  question,
  questionIndex,
  value,
  onChange,
  onPhotoCapture,
  speakingPrepTime,
  speakingTime,
  readOnly,
}: QuestionInputFactoryProps) {
  switch (sectionType) {
    case "R1_MCQ_SINGLE":
    case "R2_MCQ_MULTI":
    case "R3_TFNG":
    case "R4_YNNG":
    case "L2_MCQ":
      return (
        <MCQInput
          sectionType={sectionType}
          questionText={question.questionText}
          questionIndex={questionIndex}
          options={question.options as { items: { label: string; text: string }[]; maxSelections?: number } | null}
          value={value as { answer?: string; answers?: string[] } | null}
          onChange={onChange}
          readOnly={readOnly}
        />
      );

    case "R5_SENTENCE_COMPLETION":
    case "R6_SHORT_ANSWER":
    case "R8_SUMMARY_PASSAGE":
    case "L5_SENTENCE_COMPLETION":
    case "L6_SHORT_ANSWER":
      return (
        <TextAnswerInput
          questionText={question.questionText}
          questionIndex={questionIndex}
          wordLimit={question.wordLimit}
          value={value as { answer?: string } | null}
          onChange={onChange}
          readOnly={readOnly}
        />
      );

    case "R7_SUMMARY_WORD_BANK":
      return (
        <WordBankInput
          questionIndex={questionIndex}
          options={question.options as { wordBank: string[]; summaryText: string } | null}
          value={value as { blanks?: Record<string, string> } | null}
          onChange={onChange}
          readOnly={readOnly}
        />
      );

    case "R9_MATCHING_HEADINGS":
    case "R10_MATCHING_INFORMATION":
    case "R11_MATCHING_FEATURES":
    case "R12_MATCHING_SENTENCE_ENDINGS":
    case "L3_MATCHING":
      return (
        <MatchingInput
          sectionType={sectionType}
          questionIndex={questionIndex}
          options={question.options as { sourceItems: string[]; targetItems: string[] } | null}
          value={value as { matches?: Record<string, string> } | null}
          onChange={onChange}
          readOnly={readOnly}
        />
      );

    case "R13_NOTE_TABLE_FLOWCHART":
    case "L1_FORM_NOTE_TABLE":
      return (
        <NoteTableFlowchartInput
          questionIndex={questionIndex}
          options={question.options as { subFormat: "note" | "table" | "flowchart"; structure: string; wordLimit?: number } | null}
          value={value as { blanks?: Record<string, string> } | null}
          onChange={onChange}
          readOnly={readOnly}
        />
      );

    case "R14_DIAGRAM_LABELLING":
    case "L4_MAP_PLAN_LABELLING":
      return (
        <DiagramLabellingInput
          questionIndex={questionIndex}
          options={question.options as { diagramUrl: string; labelPositions: string[]; wordBank?: string[]; wordLimit?: number } | null}
          value={value as { labels?: Record<string, string> } | null}
          onChange={onChange}
          readOnly={readOnly}
        />
      );

    case "W1_TASK1_ACADEMIC":
    case "W2_TASK1_GENERAL":
    case "W3_TASK2_ESSAY":
      return (
        <WritingInput
          questionText={question.questionText}
          questionIndex={questionIndex}
          wordCountMin={sectionType === "W3_TASK2_ESSAY" ? 250 : 150}
          wordCountMax={null}
          value={value as { text?: string } | null}
          onChange={onChange}
          readOnly={readOnly}
        />
      );

    case "S1_PART1_QA":
    case "S3_PART3_DISCUSSION":
      return (
        <SpeakingInput
          questionText={question.questionText}
          questionIndex={questionIndex}
          speakingTime={speakingTime}
          value={value as { audioUrl?: string; duration?: number } | null}
          onChange={onChange}
          readOnly={readOnly}
        />
      );

    case "S2_PART2_CUE_CARD":
      return (
        <SpeakingInput
          questionText={question.questionText}
          questionIndex={questionIndex}
          speakingPrepTime={speakingPrepTime}
          speakingTime={speakingTime}
          cueCard={question.options as { topic: string; bulletPoints: string[] } | null}
          value={value as { audioUrl?: string; duration?: number } | null}
          onChange={onChange}
          readOnly={readOnly}
        />
      );

    default:
      return (
        <PhotoCaptureInput
          questionIndex={questionIndex}
          value={value as { photoUrl?: string } | null}
          onChange={onChange}
          onPhotoCapture={onPhotoCapture}
          readOnly={readOnly}
        />
      );
  }
}
