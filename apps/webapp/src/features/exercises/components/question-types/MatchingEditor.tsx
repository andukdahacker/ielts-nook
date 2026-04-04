import type { IeltsQuestionType } from "@workspace/types";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Badge } from "@workspace/ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

export type MatchingSectionType =
  | "R9_MATCHING_HEADINGS"
  | "R10_MATCHING_INFORMATION"
  | "R11_MATCHING_FEATURES"
  | "R12_MATCHING_SENTENCE_ENDINGS"
  | "L3_MATCHING";

interface MatchingConfig {
  sourceLabel: string;
  targetLabel: string;
  sourcePlaceholder: string;
  targetPlaceholder: string;
  sourceKeyType: "value" | "index";
}

export const MATCHING_CONFIGS: Record<MatchingSectionType, MatchingConfig> = {
  R9_MATCHING_HEADINGS: {
    sourceLabel: "Paragraphs",
    targetLabel: "Headings",
    sourcePlaceholder: "e.g., A",
    targetPlaceholder: "e.g., The impact of climate change",
    sourceKeyType: "value",
  },
  R10_MATCHING_INFORMATION: {
    sourceLabel: "Statements",
    targetLabel: "Paragraphs",
    sourcePlaceholder: "e.g., a reference to the size of...",
    targetPlaceholder: "e.g., A",
    sourceKeyType: "index",
  },
  R11_MATCHING_FEATURES: {
    sourceLabel: "Items",
    targetLabel: "Categories",
    sourcePlaceholder: "e.g., Dr. Smith",
    targetPlaceholder: "e.g., Supports Theory X",
    sourceKeyType: "index",
  },
  R12_MATCHING_SENTENCE_ENDINGS: {
    sourceLabel: "Sentence Beginnings",
    targetLabel: "Sentence Endings",
    sourcePlaceholder: "e.g., The research team discovered that",
    targetPlaceholder: "e.g., climate change accelerated.",
    sourceKeyType: "index",
  },
  L3_MATCHING: {
    sourceLabel: "Items",
    targetLabel: "Options",
    sourcePlaceholder: "e.g., Speaker 1",
    targetPlaceholder: "e.g., Supports renewable energy",
    sourceKeyType: "index",
  },
};

interface MatchingEditorProps {
  sectionType: IeltsQuestionType;
  options: {
    sourceItems: string[];
    targetItems: string[];
  } | null;
  correctAnswer: {
    matches: Record<string, string>;
  } | null;
  onChange: (
    options: { sourceItems: string[]; targetItems: string[] },
    correctAnswer: { matches: Record<string, string> },
  ) => void;
}

export function MatchingEditor({
  sectionType,
  options,
  correctAnswer,
  onChange,
}: MatchingEditorProps) {
  const config = MATCHING_CONFIGS[sectionType as MatchingSectionType];
  const sourceItems = options?.sourceItems ?? [];
  const targetItems = options?.targetItems ?? [];
  const matches = correctAnswer?.matches ?? {};

  const [newSource, setNewSource] = useState("");
  const [newTarget, setNewTarget] = useState("");

  if (!config) return null;

  const update = (
    newSourceItems: string[],
    newTargetItems: string[],
    newMatches: Record<string, string>,
  ) => {
    onChange(
      { sourceItems: newSourceItems, targetItems: newTargetItems },
      { matches: newMatches },
    );
  };

  // H3 fix: guard against empty/falsy values for value-based keys
  const getSourceKey = (index: number): string => {
    if (config.sourceKeyType === "value") {
      const value = sourceItems[index];
      return value?.trim() ? value : String(index);
    }
    return String(index);
  };

  // --- Source item management ---

  const addSourceItem = () => {
    const trimmed = newSource.trim();
    if (!trimmed) return;
    update([...sourceItems, trimmed], targetItems, matches);
    setNewSource("");
  };

  const removeSourceItem = (index: number) => {
    const key = getSourceKey(index);
    const newSourceItems = sourceItems.filter((_, i) => i !== index);
    const newMatches = { ...matches };
    delete newMatches[key];

    // Re-index matches if using index-based keys
    if (config.sourceKeyType === "index") {
      const reindexed: Record<string, string> = {};
      for (const [k, v] of Object.entries(newMatches)) {
        const numKey = Number(k);
        if (numKey > index) {
          reindexed[String(numKey - 1)] = v;
        } else {
          reindexed[k] = v;
        }
      }
      update(newSourceItems, targetItems, reindexed);
    } else {
      update(newSourceItems, targetItems, newMatches);
    }
  };

  // H2 fix: called on blur, not every keystroke
  const updateSourceItem = (index: number, value: string) => {
    const oldKey = getSourceKey(index);
    const newSourceItems = [...sourceItems];
    newSourceItems[index] = value.trim();
    const newMatches = { ...matches };

    // For value-based keys, update the match key when source value changes
    if (config.sourceKeyType === "value" && oldKey in newMatches) {
      const matchedTarget = newMatches[oldKey];
      delete newMatches[oldKey];
      if (value.trim()) {
        newMatches[value.trim()] = matchedTarget;
      }
    }
    update(newSourceItems, targetItems, newMatches);
  };

  // --- Target item management ---

  const addTargetItem = () => {
    const trimmed = newTarget.trim();
    if (!trimmed) return;
    update(sourceItems, [...targetItems, trimmed], matches);
    setNewTarget("");
  };

  const removeTargetItem = (index: number) => {
    const removed = targetItems[index];
    const newTargetItems = targetItems.filter((_, i) => i !== index);
    // Clean up any matches that referenced the removed target
    const newMatches = { ...matches };
    for (const [key, val] of Object.entries(newMatches)) {
      if (val === removed) {
        delete newMatches[key];
      }
    }
    update(sourceItems, newTargetItems, newMatches);
  };

  // H2 fix: called on blur, not every keystroke
  const updateTargetItem = (index: number, value: string) => {
    const oldValue = targetItems[index];
    const newTargetItems = [...targetItems];
    newTargetItems[index] = value.trim();
    // Update any matches that referenced the old value
    const newMatches = { ...matches };
    for (const [key, val] of Object.entries(newMatches)) {
      if (val === oldValue) {
        newMatches[key] = value.trim();
      }
    }
    update(sourceItems, newTargetItems, newMatches);
  };

  // --- Match assignment ---
  // H1 fix: targetValue is now a string index, not the target text itself

  const handleMatchAssignment = (sourceIndex: number, targetValue: string) => {
    const key = getSourceKey(sourceIndex);
    const newMatches = { ...matches };
    if (targetValue === "__unassign__") {
      delete newMatches[key];
    } else {
      newMatches[key] = targetItems[Number(targetValue)] ?? "";
    }
    update(sourceItems, targetItems, newMatches);
  };

  // H1 fix: resolve current match text to a target index for the Select value
  const getMatchedTargetIndex = (sourceIndex: number): string => {
    const matchedText = matches[getSourceKey(sourceIndex)];
    if (matchedText == null) return "";
    const idx = targetItems.indexOf(matchedText);
    return idx >= 0 ? String(idx) : "";
  };

  const needsMoreTargets = targetItems.length <= sourceItems.length;

  return (
    <div className="space-y-3">
      {/* Source Items Column */}
      <div className="space-y-1.5">
        <Label className="text-xs">{config.sourceLabel}</Label>
        <div className="space-y-1">
          {sourceItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                defaultValue={item}
                onBlur={(e) => updateSourceItem(i, e.target.value)}
                placeholder={config.sourcePlaceholder}
                className="flex-1 h-7 text-xs"
              />
              <Select
                value={getMatchedTargetIndex(i)}
                onValueChange={(val) => handleMatchAssignment(i, val)}
              >
                <SelectTrigger className="h-7 text-xs w-[200px]">
                  <SelectValue placeholder={`Select ${config.targetLabel.toLowerCase()}...`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unassign__">
                    <span className="text-muted-foreground italic">Unassign</span>
                  </SelectItem>
                  {targetItems.map((target, ti) => (
                    <SelectItem key={ti} value={String(ti)}>
                      {target}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => removeSourceItem(i)}
                aria-label={`Remove ${config.sourceLabel.toLowerCase()} item`}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={newSource}
            onChange={(e) => setNewSource(e.target.value)}
            placeholder={`Add ${config.sourceLabel.toLowerCase()}...`}
            className="flex-1 h-7 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSourceItem();
              }
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={addSourceItem}
            disabled={!newSource.trim()}
          >
            <Plus className="mr-1 size-3" />
            Add
          </Button>
        </div>
      </div>

      {/* Target Items Column */}
      <div className="space-y-1.5">
        <Label className="text-xs">{config.targetLabel}</Label>
        <div className="space-y-1">
          {targetItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                defaultValue={item}
                onBlur={(e) => updateTargetItem(i, e.target.value)}
                placeholder={config.targetPlaceholder}
                className="flex-1 h-7 text-xs"
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => removeTargetItem(i)}
                aria-label={`Remove ${config.targetLabel.toLowerCase()} item`}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={newTarget}
            onChange={(e) => setNewTarget(e.target.value)}
            placeholder={`Add ${config.targetLabel.toLowerCase()}...`}
            className="flex-1 h-7 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTargetItem();
              }
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={addTargetItem}
            disabled={!newTarget.trim()}
          >
            <Plus className="mr-1 size-3" />
            Add
          </Button>
        </div>
      </div>

      {/* Distractor indicator */}
      <div className="flex items-center gap-2">
        <Badge variant={needsMoreTargets ? "destructive" : "secondary"} className="text-xs">
          {targetItems.length} {config.targetLabel.toLowerCase()}, {sourceItems.length} to match
          {targetItems.length > sourceItems.length && (
            <> — {targetItems.length - sourceItems.length} extra</>
          )}
        </Badge>
        {needsMoreTargets && sourceItems.length > 0 && (
          <span className="text-xs text-destructive">
            Add more {config.targetLabel.toLowerCase()} — matching questions need extra choices as distractors.
          </span>
        )}
      </div>
    </div>
  );
}
