import type { IeltsQuestionType } from "@workspace/types";
import type { MCQOption } from "@workspace/types";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/radio-group";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface MCQEditorProps {
  sectionType: IeltsQuestionType;
  options: { items: MCQOption[]; maxSelections?: number } | null;
  correctAnswer: { answer?: string; answers?: string[] } | null;
  onChange: (options: unknown, correctAnswer: unknown) => void;
}

const LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];

function OptionTextInput({
  idx,
  value,
  onCommit,
  pendingTextsRef,
  placeholder,
  className,
}: {
  idx: number;
  value: string;
  onCommit: (text: string) => void;
  pendingTextsRef: React.RefObject<Map<number, string>>;
  placeholder: string;
  className: string;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => {
    setLocal(value);
  }, [value]);
  return (
    <Input
      value={local}
      onChange={(e) => {
        setLocal(e.target.value);
        pendingTextsRef.current?.set(idx, e.target.value);
      }}
      onBlur={() => {
        pendingTextsRef.current?.delete(idx);
        if (local !== value) onCommit(local);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          pendingTextsRef.current?.delete(idx);
          if (local !== value) onCommit(local);
          (e.target as HTMLInputElement).blur();
        }
      }}
      placeholder={placeholder}
      className={className}
    />
  );
}

export function MCQEditor({
  sectionType,
  options,
  correctAnswer,
  onChange,
}: MCQEditorProps) {
  const isMulti = sectionType === "R2_MCQ_MULTI";
  const items: MCQOption[] = options?.items ?? [];
  const pendingTextsRef = useRef<Map<number, string>>(new Map());

  const flushPendingTexts = (currentItems: MCQOption[]): MCQOption[] => {
    if (pendingTextsRef.current.size === 0) return currentItems;
    const flushed = currentItems.map((item, i) => {
      const pending = pendingTextsRef.current.get(i);
      return pending !== undefined && pending !== item.text
        ? { ...item, text: pending }
        : item;
    });
    pendingTextsRef.current.clear();
    return flushed;
  };
  const maxSelections = options?.maxSelections ?? 2;
  const [localMaxSelections, setLocalMaxSelections] = useState(maxSelections);

  useEffect(() => {
    setLocalMaxSelections(maxSelections);
  }, [maxSelections]);

  // For single: correctAnswer.answer = "A"
  // For multi: correctAnswer.answers = ["A", "C"]
  const selectedSingle = correctAnswer?.answer ?? "";
  const selectedMulti = correctAnswer?.answers ?? [];

  const updateItems = (newItems: MCQOption[]) => {
    const newOptions = isMulti
      ? { items: newItems, maxSelections }
      : { items: newItems };
    onChange(newOptions, correctAnswer);
  };

  const addOption = () => {
    if (items.length >= LABELS.length) return;
    const flushed = flushPendingTexts(items);
    const nextLabel = LABELS[flushed.length];
    const newItems = [...flushed, { label: nextLabel, text: "" }];
    const newOptions = isMulti
      ? { items: newItems, maxSelections }
      : { items: newItems };
    onChange(newOptions, correctAnswer);
  };

  const removeOption = (index: number) => {
    const flushed = flushPendingTexts(items);
    const newItems = flushed.filter((_, i) => i !== index);
    // Re-label sequentially and build old→new label mapping
    const labelMap = new Map<string, string>();
    const relabeled = newItems.map((item, i) => {
      const newLabel = LABELS[i] ?? `${i + 1}`;
      labelMap.set(item.label, newLabel);
      return { ...item, label: newLabel };
    });
    // Remap correct answer references to new labels
    if (isMulti) {
      const newAnswers = selectedMulti
        .map((a) => labelMap.get(a))
        .filter((a): a is string => a !== undefined);
      onChange(
        { items: relabeled, maxSelections },
        { answers: newAnswers },
      );
    } else {
      const newAnswer = labelMap.get(selectedSingle) ?? "";
      onChange({ items: relabeled }, { answer: newAnswer });
    }
  };

  const updateOptionText = (index: number, text: string) => {
    const newItems = items.map((item, i) =>
      i === index ? { ...item, text } : item,
    );
    updateItems(newItems);
  };

  const handleSingleSelect = (label: string) => {
    onChange(
      isMulti ? { items, maxSelections } : { items },
      { answer: label },
    );
  };

  const handleMultiToggle = (label: string) => {
    const newAnswers = selectedMulti.includes(label)
      ? selectedMulti.filter((a) => a !== label)
      : [...selectedMulti, label];
    onChange({ items, maxSelections }, { answers: newAnswers });
  };

  const handleMaxSelectionsChange = (val: number) => {
    const clamped = Math.max(1, val);
    setLocalMaxSelections(clamped);
    onChange({ items, maxSelections: clamped }, correctAnswer);
  };

  return (
    <div className="space-y-3">
      {isMulti && (
        <div className="flex items-center gap-2">
          <Label className="text-xs">Max Selections</Label>
          <Input
            type="number"
            min={1}
            value={localMaxSelections}
            onChange={(e) => handleMaxSelectionsChange(Number(e.target.value))}
            className="w-20 h-8 text-sm"
          />
        </div>
      )}

      {isMulti ? (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={item.label} className="flex items-center gap-2">
              <Checkbox
                checked={selectedMulti.includes(item.label)}
                onCheckedChange={() => handleMultiToggle(item.label)}
                aria-label={`Mark ${item.label} as correct`}
              />
              <span className="text-sm font-medium min-w-[1.5rem]">
                {item.label}.
              </span>
              <OptionTextInput
                idx={idx}
                value={item.text}
                onCommit={(text) => updateOptionText(idx, text)}
                pendingTextsRef={pendingTextsRef}
                placeholder={`Option ${item.label} text...`}
                className="flex-1 h-8 text-sm"
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-destructive hover:text-destructive"
                onClick={() => removeOption(idx)}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <RadioGroup
          value={selectedSingle}
          onValueChange={handleSingleSelect}
          className="space-y-2"
        >
          {items.map((item, idx) => (
            <div key={item.label} className="flex items-center gap-2">
              <RadioGroupItem
                value={item.label}
                aria-label={`Mark ${item.label} as correct`}
              />
              <span className="text-sm font-medium min-w-[1.5rem]">
                {item.label}.
              </span>
              <OptionTextInput
                idx={idx}
                value={item.text}
                onCommit={(text) => updateOptionText(idx, text)}
                pendingTextsRef={pendingTextsRef}
                placeholder={`Option ${item.label} text...`}
                className="flex-1 h-8 text-sm"
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-destructive hover:text-destructive"
                onClick={() => removeOption(idx)}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
        </RadioGroup>
      )}

      <Button variant="outline" size="sm" onClick={addOption} disabled={items.length >= LABELS.length}>
        <Plus className="mr-1 size-3" />
        Add Option
      </Button>
    </div>
  );
}
