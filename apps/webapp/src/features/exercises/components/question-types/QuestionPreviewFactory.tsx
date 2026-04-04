import type { IeltsQuestionType, Question } from "@workspace/types";
import { MCQPreview } from "./MCQPreview";
import { TFNGPreview } from "./TFNGPreview";
import { TextInputPreview } from "./TextInputPreview";
import { WordBankPreview } from "./WordBankPreview";
import { MatchingPreview } from "./MatchingPreview";
import { NoteTableFlowchartPreview } from "./NoteTableFlowchartPreview";
import { DiagramLabellingPreview } from "./DiagramLabellingPreview";

interface QuestionPreviewFactoryProps {
  sectionType: IeltsQuestionType;
  question: Question;
  questionIndex: number;
  speakingPrepTime?: number | null;
  speakingTime?: number | null;
}

export function QuestionPreviewFactory({
  sectionType,
  question,
  questionIndex,
  speakingPrepTime,
  speakingTime,
}: QuestionPreviewFactoryProps) {
  switch (sectionType) {
    case "R1_MCQ_SINGLE":
    case "R2_MCQ_MULTI":
      return (
        <MCQPreview
          sectionType={sectionType}
          questionText={question.questionText}
          questionIndex={questionIndex}
          options={question.options as { items: { label: string; text: string }[]; maxSelections?: number } | null}
        />
      );

    case "R3_TFNG":
    case "R4_YNNG":
      return (
        <TFNGPreview
          sectionType={sectionType}
          questionText={question.questionText}
          questionIndex={questionIndex}
        />
      );

    case "R5_SENTENCE_COMPLETION":
    case "R6_SHORT_ANSWER":
    case "R8_SUMMARY_PASSAGE":
    case "L5_SENTENCE_COMPLETION":
    case "L6_SHORT_ANSWER":
      return (
        <TextInputPreview
          questionText={question.questionText}
          questionIndex={questionIndex}
          wordLimit={question.wordLimit}
        />
      );

    case "R7_SUMMARY_WORD_BANK":
      return (
        <WordBankPreview
          questionIndex={questionIndex}
          options={question.options as { wordBank: string[]; summaryText: string } | null}
        />
      );

    case "R9_MATCHING_HEADINGS":
    case "R10_MATCHING_INFORMATION":
    case "R11_MATCHING_FEATURES":
    case "R12_MATCHING_SENTENCE_ENDINGS":
      return (
        <MatchingPreview
          sectionType={sectionType}
          questionText={question.questionText}
          questionIndex={questionIndex}
          options={question.options as { sourceItems: string[]; targetItems: string[] } | null}
        />
      );

    case "R13_NOTE_TABLE_FLOWCHART":
    case "L1_FORM_NOTE_TABLE":
      return (
        <NoteTableFlowchartPreview
          questionText={question.questionText}
          questionIndex={questionIndex}
          options={question.options as { subFormat: "note" | "table" | "flowchart"; structure: string; wordLimit?: number } | null}
        />
      );

    case "R14_DIAGRAM_LABELLING":
    case "L4_MAP_PLAN_LABELLING":
      return (
        <DiagramLabellingPreview
          questionIndex={questionIndex}
          options={question.options as { diagramUrl: string; labelPositions: string[]; wordBank?: string[]; wordLimit?: number } | null}
        />
      );

    case "L2_MCQ":
      return (
        <MCQPreview
          sectionType={sectionType}
          questionText={question.questionText}
          questionIndex={questionIndex}
          options={question.options as { items: { label: string; text: string }[]; maxSelections?: number } | null}
        />
      );

    case "L3_MATCHING":
      return (
        <MatchingPreview
          sectionType={sectionType}
          questionText={question.questionText}
          questionIndex={questionIndex}
          options={question.options as { sourceItems: string[]; targetItems: string[] } | null}
        />
      );

    case "W1_TASK1_ACADEMIC":
    case "W2_TASK1_GENERAL":
    case "W3_TASK2_ESSAY":
      return (
        <div className="rounded-md border border-dashed p-4 space-y-2">
          <p className="text-sm">{question.questionText}</p>
          <p className="text-xs text-muted-foreground italic">
            This task is graded using IELTS band descriptors
          </p>
        </div>
      );

    case "S1_PART1_QA":
      return (
        <div className="flex gap-3 pl-4">
          <span className="text-sm font-medium min-w-[2rem]">
            {questionIndex + 1}.
          </span>
          <div className="space-y-1">
            <span className="text-sm">{question.questionText}</span>
            <p className="text-xs text-muted-foreground italic">
              Record your answer (~1 minute)
            </p>
          </div>
        </div>
      );

    case "S2_PART2_CUE_CARD": {
      const cueCard = question.options as { topic: string; bulletPoints: string[] } | null;
      return (
        <div className="rounded-md border border-dashed p-4 space-y-3">
          {cueCard?.topic && (
            <p className="text-sm font-semibold">{cueCard.topic}</p>
          )}
          {cueCard?.bulletPoints && cueCard.bulletPoints.length > 0 && (
            <ul className="list-disc pl-6 space-y-1">
              {cueCard.bulletPoints.map((point, i) => (
                <li key={i} className="text-sm">{point}</li>
              ))}
            </ul>
          )}
          {(speakingPrepTime != null || speakingTime != null) && (
            <p className="text-xs text-muted-foreground">
              {speakingPrepTime != null && `Preparation: ${speakingPrepTime}s`}
              {speakingPrepTime != null && speakingTime != null && " | "}
              {speakingTime != null && `Speaking: ${speakingTime}s`}
            </p>
          )}
          <p className="text-xs text-muted-foreground italic">
            This task is graded using IELTS band descriptors
          </p>
        </div>
      );
    }

    case "S3_PART3_DISCUSSION":
      return (
        <div className="flex gap-3 pl-4">
          <span className="text-sm font-medium min-w-[2rem]">
            {questionIndex + 1}.
          </span>
          <div className="space-y-1">
            <span className="text-sm">{question.questionText}</span>
            <p className="text-xs text-muted-foreground italic">
              Record your answer
            </p>
          </div>
        </div>
      );

    default:
      return (
        <div className="flex gap-3 pl-4">
          <span className="text-sm font-medium min-w-[2rem]">
            {questionIndex + 1}.
          </span>
          <span className="text-sm">{question.questionText}</span>
        </div>
      );
  }
}
