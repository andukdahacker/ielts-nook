import type { IeltsQuestionType } from "@workspace/types";
import { Label } from "@workspace/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/radio-group";
import React, { useEffect, useState } from "react";

interface TFNGEditorProps {
  sectionType: IeltsQuestionType;
  correctAnswer: { answer: string } | null;
  onChange: (options: null, correctAnswer: { answer: string }) => void;
  questionId?: string;
}

const TFNG_OPTIONS = ["TRUE", "FALSE", "NOT_GIVEN"] as const;
const YNNG_OPTIONS = ["YES", "NO", "NOT_GIVEN"] as const;

const DISPLAY_LABELS: Record<string, string> = {
  TRUE: "True",
  FALSE: "False",
  NOT_GIVEN: "Not Given",
  YES: "Yes",
  NO: "No",
};

export const TFNGEditor = React.memo(function TFNGEditor({
  sectionType,
  correctAnswer,
  onChange,
  questionId = "default",
}: TFNGEditorProps) {
  const isYNNG = sectionType === "R4_YNNG";
  const choices = isYNNG ? YNNG_OPTIONS : TFNG_OPTIONS;
  const idPrefix = `tfng-${questionId}`;

  // Optimistic local state for instant radio feedback (AC2)
  const [localAnswer, setLocalAnswer] = useState(correctAnswer?.answer ?? "");

  // Sync from server when prop changes
  useEffect(() => {
    setLocalAnswer(correctAnswer?.answer ?? "");
  }, [correctAnswer?.answer]);

  return (
    <div className="space-y-2">
      <Label className="text-xs">Correct Answer</Label>
      <RadioGroup
        value={localAnswer}
        onValueChange={(val) => {
          setLocalAnswer(val); // Instant visual feedback
          onChange(null, { answer: val }); // Trigger debounced parent update
        }}
        className="flex gap-4"
      >
        {choices.map((choice) => (
          <div key={choice} className="flex items-center gap-1.5">
            <RadioGroupItem
              value={choice}
              id={`${idPrefix}-${choice}`}
              aria-label={DISPLAY_LABELS[choice]}
            />
            <Label htmlFor={`${idPrefix}-${choice}`} className="text-sm cursor-pointer">
              {DISPLAY_LABELS[choice]}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}, (prev, next) => {
  // Custom comparator: compare answer string, not object reference (safeParse creates new objects)
  return (
    prev.sectionType === next.sectionType &&
    prev.correctAnswer?.answer === next.correctAnswer?.answer &&
    prev.onChange === next.onChange &&
    prev.questionId === next.questionId
  );
});
