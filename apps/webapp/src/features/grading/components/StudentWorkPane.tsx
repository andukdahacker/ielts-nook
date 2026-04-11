import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Separator } from "@workspace/ui/components/separator";
import { ChevronDown } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CommentVisibility, TeacherComment } from "@workspace/types";
import { HighlightedText } from "./HighlightedText";
import { CommentPopover } from "./CommentPopover";
import type { AnchorStatus } from "../hooks/use-anchor-validation";
import { useTextSelection } from "../hooks/use-text-selection";
import { ANSWER_SEPARATOR, computeAnswerRanges, findAnswerIndex } from "../utils/offset-utils";

interface Answer {
  id: string;
  questionId: string;
  answer: { text?: string; transcript?: string };
  score?: number;
}

interface Question {
  id: string;
  prompt?: string;
}

interface Section {
  type: string;
  instructions: string;
  questions: Question[];
}

interface StudentWorkFeedbackItem {
  id: string;
  startOffset?: number | null;
  endOffset?: number | null;
  originalContextSnippet?: string | null;
  severity?: "error" | "warning" | "suggestion" | null;
}

interface CreateCommentData {
  content: string;
  startOffset: number;
  endOffset: number;
  originalContextSnippet: string;
  visibility: CommentVisibility;
}

interface StudentWorkPaneProps {
  exerciseTitle: string;
  exerciseSkill: "WRITING" | "SPEAKING";
  sections: Section[];
  answers: Answer[];
  feedbackItems?: StudentWorkFeedbackItem[];
  teacherComments?: TeacherComment[];
  anchorStatuses?: Map<string, AnchorStatus>;
  onCreateComment?: (data: CreateCommentData) => void;
}

function getWordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function getMinWordCount(skill: string, sectionType?: string): number | null {
  if (skill !== "WRITING") return null;
  if (sectionType?.toLowerCase().includes("task 1") || sectionType?.toLowerCase().includes("w1")) return 150;
  return 250;
}

export function StudentWorkPane({
  exerciseTitle,
  exerciseSkill,
  sections,
  answers,
  feedbackItems,
  teacherComments,
  anchorStatuses,
  onCreateComment,
}: StudentWorkPaneProps) {
  const { t } = useTranslation("grading");
  const [promptOpen, setPromptOpen] = useState(true);
  const answerContainerRef = useRef<HTMLDivElement>(null);

  const answerMap = new Map(answers.map((a) => [a.questionId, a]));

  // Extract text from each answer
  const answerTexts = useMemo(() => {
    return answers.map((a) =>
      exerciseSkill === "WRITING" ? a.answer?.text ?? "" : a.answer?.transcript ?? "",
    );
  }, [answers, exerciseSkill]);

  // Merge teacher comments that have anchors into feedbackItems for highlighting
  const allHighlightItems = useMemo(() => {
    const base = feedbackItems ?? [];
    const teacherAnchored = (teacherComments ?? [])
      .filter((c) => c.startOffset != null && c.endOffset != null)
      .map((c) => ({
        id: c.id,
        startOffset: c.startOffset,
        endOffset: c.endOffset,
        originalContextSnippet: c.originalContextSnippet,
        severity: null as "error" | "warning" | "suggestion" | null,
      }));
    return [...base, ...teacherAnchored];
  }, [feedbackItems, teacherComments]);

  // Compute per-answer feedback items with local offsets
  const answerFeedbackMap = useMemo(() => {
    if (allHighlightItems.length === 0) return new Map<number, Array<{
      id: string;
      startOffset: number;
      endOffset: number;
      severity: "error" | "warning" | "suggestion" | null | undefined;
      anchorStatus: AnchorStatus;
    }>>();

    const map = new Map<number, Array<{
      id: string;
      startOffset: number;
      endOffset: number;
      severity: "error" | "warning" | "suggestion" | null | undefined;
      anchorStatus: AnchorStatus;
    }>>();

    const answerRanges = computeAnswerRanges(answerTexts);

    for (const item of allHighlightItems) {
      if (item.startOffset == null || item.endOffset == null) continue;

      const answerIdx = findAnswerIndex(item.startOffset, item.endOffset, answerRanges);
      if (answerIdx === -1) continue;

      const range = answerRanges[answerIdx];
      const localStart = item.startOffset - range.globalStart;
      const localEnd = item.endOffset - range.globalStart;

      const existing = map.get(answerIdx) ?? [];
      existing.push({
        id: item.id,
        startOffset: localStart,
        endOffset: localEnd,
        severity: item.severity,
        anchorStatus: anchorStatuses?.get(item.id) ?? "no-anchor",
      });
      map.set(answerIdx, existing);
    }

    return map;
  }, [allHighlightItems, answerTexts, anchorStatuses]);

  // Compute per-answer global offsets for text selection
  const answerOffsets = useMemo(() => {
    let offset = 0;
    return answerTexts.map((text) => {
      const globalStartOffset = offset;
      offset += text.length + ANSWER_SEPARATOR.length;
      return { globalStartOffset };
    });
  }, [answerTexts]);

  // Text selection for anchored commenting
  const { selectionState, clearSelection } = useTextSelection(
    answerContainerRef,
    answerOffsets,
  );

  const handleCommentSubmit = useCallback(
    (content: string, visibility: CommentVisibility) => {
      if (!selectionState || !onCreateComment) return;
      onCreateComment({
        content,
        startOffset: selectionState.startOffset,
        endOffset: selectionState.endOffset,
        originalContextSnippet: selectionState.text,
        visibility,
      });
      clearSelection();
      window.getSelection()?.removeAllRanges();
    },
    [selectionState, onCreateComment, clearSelection],
  );

  const handleCommentCancel = useCallback(() => {
    clearSelection();
    window.getSelection()?.removeAllRanges();
  }, [clearSelection]);

  // Determine whether to render from sections or directly from answers
  const hasSections = sections.length > 0;

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        <Collapsible open={promptOpen} onOpenChange={setPromptOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-muted/50 p-3 text-left text-sm font-medium hover:bg-muted/80">
            <span>{exerciseTitle}</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${promptOpen ? "rotate-180" : ""}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="space-y-3 rounded-lg border p-3">
              {sections.map((section, idx) => (
                <div key={idx}>
                  {section.instructions && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {section.instructions}
                    </p>
                  )}
                  {section.questions.map((q) =>
                    q.prompt ? (
                      <p
                        key={q.id}
                        className="mt-2 text-sm italic text-muted-foreground"
                      >
                        {q.prompt}
                      </p>
                    ) : null,
                  )}
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div ref={answerContainerRef} className="relative">
        {hasSections
          ? sections.map((section, sIdx) =>
              section.questions.map((question, qIdx) => {
                const answer = answerMap.get(question.id);
                const text =
                  exerciseSkill === "WRITING"
                    ? answer?.answer?.text
                    : answer?.answer?.transcript;
                const wordCount = text ? getWordCount(text) : 0;
                const minWords = getMinWordCount(exerciseSkill, section.type);
                const showSeparator =
                  sIdx < sections.length - 1 ||
                  qIdx < section.questions.length - 1;

                return (
                  <div key={question.id}>
                    {sections.length > 1 || section.questions.length > 1 ? (
                      <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                        {t("studentWork.question", { number: qIdx + 1 })}
                      </h3>
                    ) : null}

                    <div className="rounded-lg border p-4">
                      {text ? (
                        <HighlightedText text={text} feedbackItems={[]} />
                      ) : (
                        <p className="text-sm italic text-muted-foreground">
                          {exerciseSkill === "SPEAKING"
                            ? t("studentWork.noTranscript")
                            : t("studentWork.noAnswer")}
                        </p>
                      )}
                    </div>

                    <div className="mt-2 text-xs text-muted-foreground">
                      {minWords
                        ? t("studentWork.wordCount", { wordCount, minWords })
                        : t("studentWork.wordCountOnly", { wordCount })}
                    </div>

                    {showSeparator && <Separator className="my-4" />}
                  </div>
                );
              }),
            )
          : answers.map((answer, aIdx) => {
              const text =
                exerciseSkill === "WRITING"
                  ? answer.answer?.text
                  : answer.answer?.transcript;
              const wordCount = text ? getWordCount(text) : 0;
              const minWords = getMinWordCount(exerciseSkill);
              const showSeparator = aIdx < answers.length - 1;
              const itemFeedback = answerFeedbackMap.get(aIdx) ?? [];

              return (
                <div key={answer.id} data-answer-index={aIdx}>
                  {answers.length > 1 && (
                    <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                      {t("studentWork.answer", { number: aIdx + 1 })}
                    </h3>
                  )}

                  <div className="rounded-lg border p-4">
                    {text ? (
                      <HighlightedText text={text} feedbackItems={itemFeedback} />
                    ) : (
                      <p className="text-sm italic text-muted-foreground">
                        {exerciseSkill === "SPEAKING"
                          ? t("studentWork.noTranscript")
                          : t("studentWork.noAnswer")}
                      </p>
                    )}
                  </div>

                  <div className="mt-2 text-xs text-muted-foreground">
                    {minWords
                      ? t("studentWork.wordCount", { wordCount, minWords })
                      : t("studentWork.wordCountOnly", { wordCount })}
                  </div>

                  {showSeparator && <Separator className="my-4" />}
                </div>
              );
            })}

          {/* Comment popover for text selection */}
          {selectionState && onCreateComment && (
            <CommentPopover
              position={selectionState.containerRelativePos}
              onSubmit={handleCommentSubmit}
              onCancel={handleCommentCancel}
              selectedText={selectionState.text}
            />
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
