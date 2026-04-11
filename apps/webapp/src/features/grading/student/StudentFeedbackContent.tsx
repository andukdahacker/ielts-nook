import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Badge } from "@workspace/ui/components/badge";
import { computeAnswerRanges, findAnswerIndex } from "../utils/offset-utils";

interface FeedbackItem {
  id: string;
  type: string;
  content: string;
  startOffset?: number | null;
  endOffset?: number | null;
  originalContextSnippet?: string | null;
  suggestedFix?: string | null;
  severity?: string | null;
}

interface TeacherComment {
  id: string;
  content: string;
  startOffset: number | null;
  endOffset: number | null;
  authorName: string;
}

interface Answer {
  id: string;
  questionId?: string;
  answer: Record<string, unknown> | null;
}

interface StudentFeedbackContentProps {
  answers: Answer[];
  feedbackItems: FeedbackItem[];
  teacherComments: TeacherComment[];
  skill: string;
}

interface Annotation {
  id: string;
  startOffset: number;
  endOffset: number;
  type: "grammar" | "ai" | "teacher";
  content: string;
  suggestedFix?: string | null;
  severity?: string | null;
  authorName?: string;
}

export function StudentFeedbackContent({
  answers,
  feedbackItems,
  teacherComments,
  skill,
}: StudentFeedbackContentProps) {
  const { t } = useTranslation("grading");
  const answerTexts = useMemo(() => {
    return answers.map((a) => {
      const ans = a.answer as { text?: string; transcript?: string } | null;
      return skill === "WRITING" || skill === "SPEAKING"
        ? (ans?.text ?? ans?.transcript ?? "")
        : (ans?.text ?? "");
    });
  }, [answers, skill]);

  // Compute per-answer annotations using shared offset logic
  const answerAnnotationsMap = useMemo(() => {
    const answerRanges = computeAnswerRanges(answerTexts);

    const allAnnotations: Annotation[] = [];

    // AI feedback items (anchored only)
    for (const item of feedbackItems) {
      if (item.startOffset == null || item.endOffset == null) continue;
      allAnnotations.push({
        id: item.id,
        startOffset: item.startOffset,
        endOffset: item.endOffset,
        type: item.type === "grammar" ? "grammar" : "ai",
        content: item.content,
        suggestedFix: item.suggestedFix,
        severity: item.severity,
      });
    }

    // Teacher comments (anchored only)
    for (const comment of teacherComments) {
      if (comment.startOffset == null || comment.endOffset == null) continue;
      allAnnotations.push({
        id: comment.id,
        startOffset: comment.startOffset,
        endOffset: comment.endOffset,
        type: "teacher",
        content: comment.content,
        authorName: comment.authorName,
      });
    }

    // Map to per-answer local offsets
    const map = new Map<number, Annotation[]>();
    for (const ann of allAnnotations) {
      const answerIdx = findAnswerIndex(ann.startOffset, ann.endOffset, answerRanges);
      if (answerIdx === -1) continue;

      const range = answerRanges[answerIdx];
      const localAnn = {
        ...ann,
        startOffset: ann.startOffset - range.globalStart,
        endOffset: ann.endOffset - range.globalStart,
      };
      const existing = map.get(answerIdx) ?? [];
      existing.push(localAnn);
      map.set(answerIdx, existing);
    }

    return map;
  }, [answerTexts, feedbackItems, teacherComments]);

  return (
    <div className="space-y-4">
      {answerTexts.map((text, idx) => (
        <div key={answers[idx]?.id ?? idx}>
          {answerTexts.length > 1 && (
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              {t("studentFeedback.answer", { number: idx + 1 })}
            </h3>
          )}
          <div className="rounded-lg border p-4">
            {text ? (
              <AnnotatedText
                text={text}
                annotations={answerAnnotationsMap.get(idx) ?? []}
              />
            ) : (
              <p className="text-sm italic text-muted-foreground">
                {t("studentFeedback.noAnswer")}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function AnnotatedText({
  text,
  annotations,
}: {
  text: string;
  annotations: Annotation[];
}) {
  const { t } = useTranslation("grading");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Sort annotations by start offset
  const sorted = useMemo(
    () => [...annotations].sort((a, b) => a.startOffset - b.startOffset),
    [annotations],
  );

  // Build segments with non-overlapping ranges
  const segments = useMemo(() => {
    const result: Array<{
      text: string;
      annotation: Annotation | null;
      charOffset: number;
    }> = [];
    let pos = 0;

    for (const ann of sorted) {
      if (ann.startOffset < 0 || ann.endOffset > text.length) continue;
      if (ann.startOffset < pos) continue; // skip overlapping

      // Plain text before annotation
      if (ann.startOffset > pos) {
        result.push({
          text: text.slice(pos, ann.startOffset),
          annotation: null,
          charOffset: pos,
        });
      }

      result.push({
        text: text.slice(ann.startOffset, ann.endOffset),
        annotation: ann,
        charOffset: ann.startOffset,
      });
      pos = ann.endOffset;
    }

    // Remaining text
    if (pos < text.length) {
      result.push({ text: text.slice(pos), annotation: null, charOffset: pos });
    }

    return result;
  }, [text, sorted]);

  // Split into paragraphs for rendering
  return (
    <div className="text-sm leading-relaxed whitespace-pre-wrap">
      {segments.map((seg, i) => {
        if (!seg.annotation) {
          return <span key={i}>{seg.text}</span>;
        }

        const ann = seg.annotation;

        // Grammar corrections: tracked-change style
        if (ann.type === "grammar" && ann.suggestedFix) {
          return (
            <Popover
              key={ann.id}
              open={expandedId === ann.id}
              onOpenChange={(open) => setExpandedId(open ? ann.id : null)}
            >
              <PopoverTrigger asChild>
                <span className="cursor-pointer">
                  <span className="line-through text-red-500 decoration-red-400">
                    {seg.text}
                  </span>
                  <span className="text-green-600 font-medium dark:text-green-400">
                    {ann.suggestedFix}
                  </span>
                </span>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" side="top">
                <p className="text-xs text-muted-foreground mb-1">
                  {t("studentFeedback.grammarCorrection")}
                </p>
                <p className="text-sm">{ann.content}</p>
              </PopoverContent>
            </Popover>
          );
        }

        // AI feedback highlights
        if (ann.type === "ai") {
          return (
            <Popover
              key={ann.id}
              open={expandedId === ann.id}
              onOpenChange={(open) => setExpandedId(open ? ann.id : null)}
            >
              <PopoverTrigger asChild>
                <span className="cursor-pointer bg-blue-100 dark:bg-blue-900/30 rounded-sm px-0.5">
                  {seg.text}
                </span>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3" side="top">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-[10px]">
                    AI
                  </Badge>
                  {ann.severity && (
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {ann.severity}
                    </span>
                  )}
                </div>
                <p className="text-sm">{ann.content}</p>
              </PopoverContent>
            </Popover>
          );
        }

        // Teacher comment highlights
        return (
          <Popover
            key={ann.id}
            open={expandedId === ann.id}
            onOpenChange={(open) => setExpandedId(open ? ann.id : null)}
          >
            <PopoverTrigger asChild>
              <span className="cursor-pointer bg-emerald-100 dark:bg-emerald-900/30 rounded-sm px-0.5 underline decoration-dotted decoration-emerald-400">
                {seg.text}
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" side="top">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-emerald-600 text-[10px]">Teacher</Badge>
                {ann.authorName && (
                  <span className="text-[10px] text-muted-foreground">
                    {ann.authorName}
                  </span>
                )}
              </div>
              <p className="text-sm">{ann.content}</p>
            </PopoverContent>
          </Popover>
        );
      })}
    </div>
  );
}
