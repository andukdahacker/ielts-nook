import type {
  ExerciseSkill,
  IeltsQuestionType,
  QuestionSection,
  Question,
  CreateQuestionInput,
  UpdateQuestionInput,
  AudioSection,
} from "@workspace/types";
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, GripVertical, Plus, RefreshCw, Trash2 } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QuestionEditorFactory } from "./question-types/QuestionEditorFactory";
import { getAnswerCompletionStatus } from "./question-types/answer-status";

export const QUESTION_TYPES_BY_SKILL: Record<
  ExerciseSkill,
  { value: IeltsQuestionType; label: string }[]
> = {
  READING: [
    { value: "R1_MCQ_SINGLE", label: "Multiple Choice (Single)" },
    { value: "R2_MCQ_MULTI", label: "Multiple Choice (Multiple)" },
    { value: "R3_TFNG", label: "True / False / Not Given" },
    { value: "R4_YNNG", label: "Yes / No / Not Given" },
    { value: "R5_SENTENCE_COMPLETION", label: "Sentence Completion" },
    { value: "R6_SHORT_ANSWER", label: "Short Answer" },
    { value: "R7_SUMMARY_WORD_BANK", label: "Summary (Word Bank)" },
    { value: "R8_SUMMARY_PASSAGE", label: "Summary (From Passage)" },
    { value: "R9_MATCHING_HEADINGS", label: "Matching Headings" },
    { value: "R10_MATCHING_INFORMATION", label: "Matching Information" },
    { value: "R11_MATCHING_FEATURES", label: "Matching Features" },
    { value: "R12_MATCHING_SENTENCE_ENDINGS", label: "Matching Sentence Endings" },
    { value: "R13_NOTE_TABLE_FLOWCHART", label: "Note/Table/Flowchart" },
    { value: "R14_DIAGRAM_LABELLING", label: "Diagram Labelling" },
  ],
  LISTENING: [
    { value: "L1_FORM_NOTE_TABLE", label: "Form/Note/Table Completion" },
    { value: "L2_MCQ", label: "Multiple Choice" },
    { value: "L3_MATCHING", label: "Matching" },
    { value: "L4_MAP_PLAN_LABELLING", label: "Map/Plan Labelling" },
    { value: "L5_SENTENCE_COMPLETION", label: "Sentence Completion" },
    { value: "L6_SHORT_ANSWER", label: "Short Answer" },
  ],
  WRITING: [
    { value: "W1_TASK1_ACADEMIC", label: "Task 1 - Academic" },
    { value: "W2_TASK1_GENERAL", label: "Task 1 - General Training" },
    { value: "W3_TASK2_ESSAY", label: "Task 2 - Essay" },
  ],
  SPEAKING: [
    { value: "S1_PART1_QA", label: "Part 1 - Q&A" },
    { value: "S2_PART2_CUE_CARD", label: "Part 2 - Cue Card" },
    { value: "S3_PART3_DISCUSSION", label: "Part 3 - Discussion" },
  ],
};


// --- Memoized Question Row Component ---

interface MemoizedQuestionRowProps {
  questionId: string;
  questionText: string;
  questionIndex: number;
  isExpanded: boolean;
  options: unknown;
  correctAnswer: unknown;
  wordLimit?: number | null;
  sectionType: IeltsQuestionType;
  skill: ExerciseSkill;
  exerciseId?: string;
  onToggleExpand: (questionId: string) => void;
  onDelete: (questionId: string) => void;
  onEditorChange: (questionId: string, options: unknown, correctAnswer: unknown, wordLimit?: number | null) => void;
  onQuestionTextChange: (questionId: string, text: string) => void;
}

const MemoizedQuestionRow = React.memo(function QuestionRow({
  questionId,
  questionText,
  questionIndex,
  isExpanded,
  options,
  correctAnswer,
  wordLimit,
  sectionType,
  skill,
  exerciseId,
  onToggleExpand,
  onDelete,
  onEditorChange,
  onQuestionTextChange,
}: MemoizedQuestionRowProps) {
  // Stable onChange for QuestionEditorFactory — avoids new ref on each row render
  const stableFactoryOnChange = useCallback(
    (opts: unknown, ans: unknown, wl?: number | null) => onEditorChange(questionId, opts, ans, wl),
    [questionId, onEditorChange],
  );

  const answerStatus = useMemo(
    () => getAnswerCompletionStatus(sectionType, correctAnswer, options),
    [sectionType, correctAnswer, options],
  );

  return (
    <div className="rounded border">
      {/* Question header — click to expand */}
      <div
        role="button"
        tabIndex={0}
        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-muted/50 cursor-pointer"
        onClick={() => onToggleExpand(questionId)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleExpand(questionId);
          }
        }}
      >
        {isExpanded ? (
          <ChevronDown className="size-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="size-3 text-muted-foreground shrink-0" />
        )}
        <span className="text-sm font-medium text-muted-foreground min-w-[2rem]">
          Q{questionIndex + 1}
        </span>
        {answerStatus === "complete" && <CheckCircle2 className="size-3 text-green-600 shrink-0" aria-label="Answers complete" data-testid="answer-complete" />}
        {answerStatus === "incomplete" && <AlertCircle className="size-3 text-amber-500 shrink-0" aria-label="Answers incomplete" data-testid="answer-incomplete" />}
        <span className="flex-1 text-sm truncate">{questionText}</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-destructive hover:text-destructive shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(questionId);
          }}
        >
          <Trash2 className="size-3" />
        </Button>
      </div>

      {/* Expanded inline editor */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t space-y-3">
          {skill !== "WRITING" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Question Text</Label>
              <Input
                defaultValue={questionText}
                onChange={(e) => onQuestionTextChange(questionId, e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          )}
          <QuestionEditorFactory
            sectionType={sectionType}
            options={options}
            correctAnswer={correctAnswer}
            wordLimit={wordLimit}
            questionId={questionId}
            exerciseId={exerciseId}
            onChange={stableFactoryOnChange}
          />
        </div>
      )}
    </div>
  );
}, (prev, next) => {
  // Custom comparator — deep-compare object props that get new refs from TanStack Query refetch
  return (
    prev.questionId === next.questionId &&
    prev.questionText === next.questionText &&
    prev.questionIndex === next.questionIndex &&
    prev.isExpanded === next.isExpanded &&
    prev.sectionType === next.sectionType &&
    prev.skill === next.skill &&
    prev.exerciseId === next.exerciseId &&
    prev.wordLimit === next.wordLimit &&
    prev.onToggleExpand === next.onToggleExpand &&
    prev.onDelete === next.onDelete &&
    prev.onEditorChange === next.onEditorChange &&
    prev.onQuestionTextChange === next.onQuestionTextChange &&
    JSON.stringify(prev.options) === JSON.stringify(next.options) &&
    JSON.stringify(prev.correctAnswer) === JSON.stringify(next.correctAnswer)
  );
});

interface QuestionSectionEditorProps {
  section: QuestionSection;
  skill: ExerciseSkill;
  index: number;
  exerciseId?: string;
  audioSections?: AudioSection[];
  exerciseHasTimeLimit?: boolean;
  onUpdateSection: (sectionId: string, data: { sectionType?: IeltsQuestionType; instructions?: string | null; audioSectionIndex?: number | null; sectionTimeLimit?: number | null }) => void;
  onDeleteSection: (sectionId: string) => void;
  onCreateQuestion: (sectionId: string, input: CreateQuestionInput) => void;
  onUpdateQuestion: (sectionId: string, questionId: string, input: UpdateQuestionInput) => void;
  onDeleteQuestion: (sectionId: string, questionId: string) => void;
  onRegenerate?: (sectionId: string, difficulty?: string) => void;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  registerFlush?: (flush: () => void) => () => void;
}

export function QuestionSectionEditor({
  section,
  skill,
  index,
  exerciseId,
  audioSections,
  exerciseHasTimeLimit,
  onUpdateSection,
  onDeleteSection,
  onCreateQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onRegenerate,
  dragHandleProps,
  registerFlush,
}: QuestionSectionEditorProps) {
  const [newQuestionText, setNewQuestionText] = useState("");
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const questionTypes = QUESTION_TYPES_BY_SKILL[skill] ?? [];
  const debounceTimers = useRef<Map<string, { timer: ReturnType<typeof setTimeout>; fire: () => void }>>(new Map());

  // --- Stable refs for latest props (avoids stale closures in useCallback) ---
  const stateRef = useRef({ section, onUpdateQuestion, onDeleteQuestion });
  stateRef.current = { section, onUpdateQuestion, onDeleteQuestion };

  const debouncedUpdate = useCallback(
    (questionId: string, input: UpdateQuestionInput) => {
      const existing = debounceTimers.current.get(questionId);
      if (existing) clearTimeout(existing.timer);
      const fire = () => {
        debounceTimers.current.delete(questionId);
        const { section, onUpdateQuestion } = stateRef.current;
        onUpdateQuestion(section.id, questionId, input);
      };
      const timer = setTimeout(fire, 500);
      debounceTimers.current.set(questionId, { timer, fire });
    },
    [], // Stable — reads from stateRef
  );

  const flushPendingUpdates = useCallback(() => {
    for (const [, { timer, fire }] of debounceTimers.current) {
      clearTimeout(timer);
      fire();
    }
  }, []);

  useEffect(() => {
    if (registerFlush) {
      return registerFlush(flushPendingUpdates);
    }
  }, [registerFlush, flushPendingUpdates]);

  const handleAddQuestion = () => {
    if (!newQuestionText.trim()) return;
    onCreateQuestion(section.id, {
      questionText: newQuestionText.trim(),
      questionType: section.sectionType,
      orderIndex: section.questions?.length ?? 0,
    });
    setNewQuestionText("");
  };

  // Stable callback for editor changes from MemoizedQuestionRow
  const handleEditorChange = useCallback(
    (questionId: string, options: unknown, correctAnswer: unknown, wordLimit?: number | null) => {
      const input: UpdateQuestionInput = {
        options,
        correctAnswer,
      };
      if (wordLimit !== undefined) {
        input.wordLimit = wordLimit;
      }
      debouncedUpdate(questionId, input);
    },
    [debouncedUpdate],
  );

  // Stable callback for question text changes
  const handleQuestionTextChange = useCallback(
    (questionId: string, text: string) => {
      debouncedUpdate(questionId, { questionText: text });
    },
    [debouncedUpdate],
  );

  // Stable toggle expand callback
  const toggleExpand = useCallback((questionId: string) => {
    setExpandedQuestionId((prev) => (prev === questionId ? null : questionId));
  }, []);

  // Stable delete callback — cancel pending debounce before deleting
  const handleDeleteQuestion = useCallback((questionId: string) => {
    const pending = debounceTimers.current.get(questionId);
    if (pending) {
      clearTimeout(pending.timer);
      debounceTimers.current.delete(questionId);
    }
    const { section, onDeleteQuestion } = stateRef.current;
    onDeleteQuestion(section.id, questionId);
  }, []);

  return (
    <div className={`${skill !== "WRITING" ? "rounded-lg border p-4 " : ""}space-y-4`}>
      {skill !== "WRITING" && (
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div {...dragHandleProps} className="cursor-grab">
              <GripVertical className="size-4 text-muted-foreground" />
            </div>
            <h4 className="font-semibold">Section {index + 1}</h4>
          </div>
          <div className="flex items-center gap-1">
            {onRegenerate && (
              <Button
                variant="ghost"
                size="icon"
                title="Regenerate this section with AI"
                onClick={() => onRegenerate(section.id)}
              >
                <RefreshCw className="size-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => onDeleteSection(section.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {skill !== "WRITING" && (
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Question Type</Label>
          <Select
            value={section.sectionType}
            onValueChange={(v) =>
              onUpdateSection(section.id, {
                sectionType: v as IeltsQuestionType,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {questionTypes.map((qt) => (
                <SelectItem key={qt.value} value={qt.value}>
                  {qt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Section Instructions</Label>
          <Input
            value={section.instructions ?? ""}
            onChange={(e) =>
              onUpdateSection(section.id, {
                instructions: e.target.value || null,
              })
            }
            placeholder="e.g., Choose the correct letter A, B, C or D"
          />
        </div>
        {audioSections && audioSections.length > 0 && (
          <div className="space-y-2">
            <Label>Audio Section</Label>
            <Select
              value={section.audioSectionIndex != null ? String(section.audioSectionIndex) : "none"}
              onValueChange={(v) =>
                onUpdateSection(section.id, {
                  audioSectionIndex: v === "none" ? null : parseInt(v, 10),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Link to audio section..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Show all at once</SelectItem>
                {audioSections.map((as_, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {as_.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {exerciseHasTimeLimit && (
          <div className="space-y-2">
            <Label>Section Time Limit (optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                value={section.sectionTimeLimit != null ? Math.round(section.sectionTimeLimit / 60) : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    onUpdateSection(section.id, { sectionTimeLimit: null });
                    return;
                  }
                  const minutes = parseInt(val, 10);
                  if (!isNaN(minutes) && minutes >= 1) {
                    onUpdateSection(section.id, { sectionTimeLimit: minutes * 60 });
                  }
                }}
                placeholder="minutes"
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Override exercise time limit for this section. Leave empty to use exercise total.
            </p>
          </div>
        )}
      </div>
      )}

      {/* Questions list */}
      <div className="space-y-2">
        <Label>Questions</Label>
        {(section.questions ?? []).map((q: Question, qIdx: number) => (
          <MemoizedQuestionRow
            key={q.id}
            questionId={q.id}
            questionText={q.questionText}
            questionIndex={qIdx}
            isExpanded={expandedQuestionId === q.id}
            options={q.options}
            correctAnswer={q.correctAnswer}
            wordLimit={q.wordLimit}
            sectionType={section.sectionType}
            skill={skill}
            exerciseId={exerciseId}
            onToggleExpand={toggleExpand}
            onDelete={handleDeleteQuestion}
            onEditorChange={handleEditorChange}
            onQuestionTextChange={handleQuestionTextChange}
          />
        ))}

        {/* Add question inline */}
        {skill !== "WRITING" && (
        <div className="flex items-center gap-2">
          <Input
            value={newQuestionText}
            onChange={(e) => setNewQuestionText(e.target.value)}
            placeholder="Type a question..."
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddQuestion();
              }
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddQuestion}
            disabled={!newQuestionText.trim()}
          >
            <Plus className="mr-1 size-3" />
            Add
          </Button>
        </div>
        )}
      </div>
    </div>
  );
}
