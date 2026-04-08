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
import React, { useCallback, useMemo, useRef, useState } from "react";

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

// --- Memoized Row Components ---

interface MatchingSourceRowProps {
  defaultValue: string;
  sourcePlaceholder: string;
  sourceLabel: string;
  targetLabel: string;
  targetItems: string[];
  matchedTargetIndex: string;
  onBlur: (index: number, value: string) => void;
  onMatchChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  index: number;
}

const MatchingSourceRow = React.memo(function MatchingSourceRow({
  defaultValue,
  sourcePlaceholder,
  sourceLabel,
  targetLabel,
  targetItems,
  matchedTargetIndex,
  onBlur,
  onMatchChange,
  onRemove,
  index,
}: MatchingSourceRowProps) {
  return (
    <div className="flex items-center gap-2">
      <Input
        defaultValue={defaultValue}
        onBlur={(e) => onBlur(index, e.target.value)}
        placeholder={sourcePlaceholder}
        className="flex-1 h-7 text-xs"
      />
      <Select
        value={matchedTargetIndex}
        onValueChange={(val) => onMatchChange(index, val)}
      >
        <SelectTrigger className="h-7 text-xs w-[200px]">
          <SelectValue placeholder={`Select ${targetLabel.toLowerCase()}...`} />
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
        onClick={() => onRemove(index)}
        aria-label={`Remove ${sourceLabel.toLowerCase()} item`}
      >
        <Trash2 className="size-3" />
      </Button>
    </div>
  );
});

interface MatchingTargetRowProps {
  defaultValue: string;
  targetPlaceholder: string;
  targetLabel: string;
  onBlur: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  index: number;
}

const MatchingTargetRow = React.memo(function MatchingTargetRow({
  defaultValue,
  targetPlaceholder,
  targetLabel,
  onBlur,
  onRemove,
  index,
}: MatchingTargetRowProps) {
  return (
    <div className="flex items-center gap-2">
      <Input
        defaultValue={defaultValue}
        onBlur={(e) => onBlur(index, e.target.value)}
        placeholder={targetPlaceholder}
        className="flex-1 h-7 text-xs"
      />
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={() => onRemove(index)}
        aria-label={`Remove ${targetLabel.toLowerCase()} item`}
      >
        <Trash2 className="size-3" />
      </Button>
    </div>
  );
});

// --- Main Component ---

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

  // --- Stable IDs for source and target items (fixes key={i} anti-pattern) ---
  const idCounterRef = useRef(0);
  const sourceIdsRef = useRef<string[]>([]);
  const targetIdsRef = useRef<string[]>([]);

  // Sync IDs with items length (handles initial render and external changes)
  if (sourceIdsRef.current.length !== sourceItems.length) {
    const ids = [...sourceIdsRef.current];
    while (ids.length < sourceItems.length) {
      ids.push(`src-${++idCounterRef.current}`);
    }
    ids.length = sourceItems.length;
    sourceIdsRef.current = ids;
  }
  if (targetIdsRef.current.length !== targetItems.length) {
    const ids = [...targetIdsRef.current];
    while (ids.length < targetItems.length) {
      ids.push(`tgt-${++idCounterRef.current}`);
    }
    ids.length = targetItems.length;
    targetIdsRef.current = ids;
  }

  // Stabilize targetItems reference to avoid breaking React.memo on MatchingSourceRow
  const stableTargetItems = useMemo(() => targetItems, [targetItems.join("\0")]);

  // --- Refs for latest state (avoids stale closures in useCallback) ---
  const stateRef = useRef({ sourceItems, targetItems, matches });
  stateRef.current = { sourceItems, targetItems, matches };
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // --- Stable callbacks ---

  const update = useCallback(
    (newSourceItems: string[], newTargetItems: string[], newMatches: Record<string, string>) => {
      onChangeRef.current(
        { sourceItems: newSourceItems, targetItems: newTargetItems },
        { matches: newMatches },
      );
    },
    [],
  );

  const getSourceKey = useCallback(
    (index: number, items: string[]): string => {
      if (config?.sourceKeyType === "value") {
        const value = items[index];
        return value?.trim() ? value : String(index);
      }
      return String(index);
    },
    [config?.sourceKeyType],
  );

  const updateSourceItem = useCallback(
    (index: number, value: string) => {
      const { sourceItems, targetItems, matches } = stateRef.current;
      const oldKey = getSourceKey(index, sourceItems);
      const newSourceItems = [...sourceItems];
      newSourceItems[index] = value.trim();
      const newMatches = { ...matches };

      if (config?.sourceKeyType === "value" && oldKey in newMatches) {
        const matchedTarget = newMatches[oldKey];
        delete newMatches[oldKey];
        // Preserve match under new key (trimmed value, or index fallback for empty)
        const newKey = value.trim() || String(index);
        newMatches[newKey] = matchedTarget;
      }
      update(newSourceItems, targetItems, newMatches);
    },
    [config?.sourceKeyType, getSourceKey, update],
  );

  const updateTargetItem = useCallback(
    (index: number, value: string) => {
      const { sourceItems, targetItems, matches } = stateRef.current;
      const oldValue = targetItems[index];
      const newTargetItems = [...targetItems];
      newTargetItems[index] = value.trim();
      const newMatches = { ...matches };
      for (const [key, val] of Object.entries(newMatches)) {
        if (val === oldValue && targetItems.indexOf(val) === index) {
          newMatches[key] = value.trim();
        }
      }
      update(sourceItems, newTargetItems, newMatches);
    },
    [update],
  );

  const removeSourceItem = useCallback(
    (index: number) => {
      const { sourceItems, targetItems, matches } = stateRef.current;
      const key = getSourceKey(index, sourceItems);
      const newSourceItems = sourceItems.filter((_, i) => i !== index);
      const newMatches = { ...matches };
      delete newMatches[key];

      // Update stable IDs
      sourceIdsRef.current = sourceIdsRef.current.filter((_, i) => i !== index);

      if (config?.sourceKeyType === "index") {
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
    },
    [config?.sourceKeyType, getSourceKey, update],
  );

  const removeTargetItem = useCallback(
    (index: number) => {
      const { sourceItems, targetItems, matches } = stateRef.current;
      const removed = targetItems[index];
      const newTargetItems = targetItems.filter((_, i) => i !== index);
      const newMatches = { ...matches };
      for (const [key, val] of Object.entries(newMatches)) {
        if (val === removed && targetItems.indexOf(val) === index) {
          delete newMatches[key];
        }
      }

      // Update stable IDs
      targetIdsRef.current = targetIdsRef.current.filter((_, i) => i !== index);

      update(sourceItems, newTargetItems, newMatches);
    },
    [update],
  );

  const handleMatchAssignment = useCallback(
    (sourceIndex: number, targetValue: string) => {
      const { sourceItems, targetItems, matches } = stateRef.current;
      let key: string;
      if (config?.sourceKeyType === "value") {
        const value = sourceItems[sourceIndex];
        key = value?.trim() ? value : String(sourceIndex);
      } else {
        key = String(sourceIndex);
      }
      const newMatches = { ...matches };
      if (targetValue === "__unassign__") {
        delete newMatches[key];
      } else {
        newMatches[key] = targetItems[Number(targetValue)] ?? "";
      }
      update(sourceItems, targetItems, newMatches);
    },
    [config?.sourceKeyType, update],
  );

  // Pre-calculate matched target indices for all source rows
  const matchedIndices = useMemo(() => {
    return sourceItems.map((_, i) => {
      let key: string;
      if (config?.sourceKeyType === "value") {
        const value = sourceItems[i];
        key = value?.trim() ? value : String(i);
      } else {
        key = String(i);
      }
      const matchedText = matches[key];
      if (matchedText == null) return "";
      const idx = targetItems.indexOf(matchedText);
      return idx >= 0 ? String(idx) : "";
    });
  }, [sourceItems, targetItems, matches, config?.sourceKeyType]);

  // Detect duplicate heading assignments (R9 only — sourceKeyType "value")
  const duplicateMatches = useMemo(() => {
    if (config?.sourceKeyType !== "value") return [];
    const headingToSources: Record<string, string[]> = {};
    for (const [key, val] of Object.entries(matches)) {
      if (!val) continue;
      (headingToSources[val] ??= []).push(key);
    }
    return Object.entries(headingToSources)
      .filter(([, sources]) => sources.length > 1)
      .map(([heading, paragraphs]) => ({ heading, paragraphs }));
  }, [matches, config?.sourceKeyType]);

  if (!config) return null;

  const needsMoreTargets = targetItems.length <= sourceItems.length;

  const addSourceItem = () => {
    const trimmed = newSource.trim();
    if (!trimmed) return;
    sourceIdsRef.current = [...sourceIdsRef.current, `src-${++idCounterRef.current}`];
    update([...sourceItems, trimmed], targetItems, matches);
    setNewSource("");
  };

  const addTargetItem = () => {
    const trimmed = newTarget.trim();
    if (!trimmed) return;
    targetIdsRef.current = [...targetIdsRef.current, `tgt-${++idCounterRef.current}`];
    update(sourceItems, [...targetItems, trimmed], matches);
    setNewTarget("");
  };

  return (
    <div className="space-y-3">
      {/* Source Items Column */}
      <div className="space-y-1.5">
        <Label className="text-xs">{config.sourceLabel}</Label>
        <div className="space-y-1">
          {sourceItems.map((item, i) => (
            <MatchingSourceRow
              key={sourceIdsRef.current[i]}
              defaultValue={item}
              sourcePlaceholder={config.sourcePlaceholder}
              sourceLabel={config.sourceLabel}
              targetLabel={config.targetLabel}
              targetItems={stableTargetItems}
              matchedTargetIndex={matchedIndices[i] ?? ""}
              onBlur={updateSourceItem}
              onMatchChange={handleMatchAssignment}
              onRemove={removeSourceItem}
              index={i}
            />
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
            <MatchingTargetRow
              key={targetIdsRef.current[i]}
              defaultValue={item}
              targetPlaceholder={config.targetPlaceholder}
              targetLabel={config.targetLabel}
              onBlur={updateTargetItem}
              onRemove={removeTargetItem}
              index={i}
            />
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

      {/* Duplicate heading warning (R9 only, non-blocking) */}
      {duplicateMatches.length > 0 && (
        <div className="space-y-1" role="status">
          {duplicateMatches.map(({ heading, paragraphs }) => (
            <p key={heading} className="text-xs text-amber-600">
              Paragraphs {paragraphs.join(", ")} share the same heading: &quot;{heading}&quot;
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
