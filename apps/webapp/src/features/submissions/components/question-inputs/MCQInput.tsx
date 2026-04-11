import type { IeltsQuestionType } from "@workspace/types";
import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/radio-group";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { cn } from "@workspace/ui/lib/utils";
import { useTranslation } from "react-i18next";

interface MCQInputProps {
  sectionType: IeltsQuestionType;
  questionText: string;
  questionIndex: number;
  options: { items: { label: string; text: string }[]; maxSelections?: number } | null;
  value: { answer?: string; answers?: string[] } | null;
  onChange: (answer: unknown) => void;
  readOnly?: boolean;
}

export function MCQInput({
  sectionType,
  questionText,
  questionIndex,
  options,
  value,
  onChange,
  readOnly,
}: MCQInputProps) {
  const { t } = useTranslation("submissions");
  const items = options?.items ?? [];
  const maxSelections = options?.maxSelections;

  // L2_MCQ can be single or multi — check maxSelections
  const isMulti = sectionType === "R2_MCQ_MULTI" || (sectionType === "L2_MCQ" && maxSelections && maxSelections > 1);

  // TFNG/YNNG use fixed options
  const isTFNG = sectionType === "R3_TFNG";
  const isYNNG = sectionType === "R4_YNNG";

  if (isTFNG || isYNNG) {
    const labels = isTFNG
      ? [
          { label: "TRUE", text: t("mcq.tfng.true") },
          { label: "FALSE", text: t("mcq.tfng.false") },
          { label: "NOT_GIVEN", text: t("mcq.tfng.notGiven") },
        ]
      : [
          { label: "YES", text: t("mcq.ynng.yes") },
          { label: "NO", text: t("mcq.ynng.no") },
          { label: "NOT_GIVEN", text: t("mcq.ynng.notGiven") },
        ];

    const selected = (value as { answer?: string })?.answer ?? "";

    return (
      <div className="space-y-3">
        <p className="text-sm">
          <span className="font-medium">{questionIndex + 1}.</span> {questionText}
        </p>
        <div className="flex flex-wrap gap-2">
          {labels.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => !readOnly && onChange({ answer: item.label })}
              disabled={readOnly}
              className={cn(
                "min-h-[44px] px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                selected === item.label
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card hover:bg-accent border-input",
                readOnly && "opacity-70 cursor-not-allowed",
              )}
            >
              {item.text}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (isMulti) {
    const selectedAnswers = (value as { answers?: string[] })?.answers ?? [];

    return (
      <div className="space-y-3">
        <p className="text-sm">
          <span className="font-medium">{questionIndex + 1}.</span> {questionText}
        </p>
        {maxSelections && (
          <p className="text-xs text-muted-foreground">
            {t("mcq.selectMultiple", { maxSelections, count: maxSelections })}
          </p>
        )}
        <div className="space-y-2">
          {items.map((item) => {
            const isSelected = selectedAnswers.includes(item.label);
            return (
              <label
                key={item.label}
                className={cn(
                  "flex items-center gap-3 w-full min-h-[44px] px-4 py-2 rounded-lg border text-sm transition-colors",
                  isSelected
                    ? "bg-primary/10 border-primary"
                    : "bg-card hover:bg-accent border-input",
                  readOnly ? "opacity-70 cursor-not-allowed" : "cursor-pointer",
                )}
              >
                <Checkbox
                  checked={isSelected}
                  disabled={readOnly}
                  onCheckedChange={() => {
                    if (readOnly) return;
                    const newAnswers = isSelected
                      ? selectedAnswers.filter((a) => a !== item.label)
                      : [...selectedAnswers, item.label];
                    onChange({ answers: newAnswers });
                  }}
                />
                <span className="text-sm">
                  {item.label}. {item.text}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  // Single-select MCQ
  const selectedSingle = (value as { answer?: string })?.answer ?? "";

  return (
    <div className="space-y-3">
      <p className="text-sm">
        <span className="font-medium">{questionIndex + 1}.</span> {questionText}
      </p>
      <RadioGroup
        value={selectedSingle}
        onValueChange={(label) => !readOnly && onChange({ answer: label })}
        disabled={readOnly}
        className="space-y-2"
      >
        {items.map((item) => (
          <label
            key={item.label}
            className={cn(
              "flex items-center gap-3 w-full min-h-[44px] px-4 py-2 rounded-lg border text-sm transition-colors",
              selectedSingle === item.label
                ? "bg-primary/10 border-primary"
                : "bg-card hover:bg-accent border-input",
              readOnly ? "opacity-70 cursor-not-allowed" : "cursor-pointer",
            )}
          >
            <RadioGroupItem value={item.label} disabled={readOnly} />
            <span>{item.label}. {item.text}</span>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}
