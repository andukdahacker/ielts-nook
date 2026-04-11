import { useState } from "react";
import type { IeltsQuestionType } from "@workspace/types";
import { Badge } from "@workspace/ui/components/badge";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import { Button } from "@workspace/ui/components/button";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { useTags } from "../hooks/use-tags";
import { cn } from "@workspace/ui/lib/utils";

const QUESTION_TYPE_LABELS: Record<string, string> = {
  R1_MCQ_SINGLE: "MCQ Single",
  R2_MCQ_MULTI: "MCQ Multi",
  R3_TFNG: "TFNG",
  R4_YNNG: "YNNG",
  R5_SENTENCE_COMPLETION: "Sentence Completion",
  R6_SHORT_ANSWER: "Short Answer",
  R7_SUMMARY_WORD_BANK: "Summary (Word Bank)",
  R8_SUMMARY_PASSAGE: "Summary (Passage)",
  R9_MATCHING_HEADINGS: "Matching Headings",
  R10_MATCHING_INFORMATION: "Matching Info",
  R11_MATCHING_FEATURES: "Matching Features",
  R12_MATCHING_SENTENCE_ENDINGS: "Matching Endings",
  R13_NOTE_TABLE_FLOWCHART: "Note/Table/Flowchart",
  R14_DIAGRAM_LABELLING: "Diagram Label",
  L1_FORM_NOTE_TABLE: "Form/Note/Table",
  L2_MCQ: "MCQ",
  L3_MATCHING: "Matching",
  L4_MAP_PLAN_LABELLING: "Map/Plan Label",
  L5_SENTENCE_COMPLETION: "Sentence Completion",
  L6_SHORT_ANSWER: "Short Answer",
  W1_TASK1_ACADEMIC: "Task 1 Academic",
  W2_TASK1_GENERAL: "Task 1 General",
  W3_TASK2_ESSAY: "Task 2 Essay",
  S1_PART1_QA: "Part 1 Q&A",
  S2_PART2_CUE_CARD: "Part 2 Cue Card",
  S3_PART3_DISCUSSION: "Part 3 Discussion",
};

interface TagSelectorProps {
  centerId: string;
  bandLevel: string | null;
  selectedTagIds: string[];
  questionTypes: IeltsQuestionType[];
  onBandLevelChange: (v: string | null) => void;
  onTagsChange: (tagIds: string[]) => void;
  disabled?: boolean;
}

export function TagSelector({
  centerId,
  bandLevel,
  selectedTagIds,
  questionTypes,
  onBandLevelChange,
  onTagsChange,
  disabled,
}: TagSelectorProps) {
  const { tags, createTag, isCreating } = useTags(centerId);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");

  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));

  const handleTagToggle = (tagId: string) => {
    const newIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId];
    onTagsChange(newIds);
  };

  const handleRemoveTag = (tagId: string) => {
    onTagsChange(selectedTagIds.filter((id) => id !== tagId));
  };

  const handleCreateAndSelect = async () => {
    const trimmed = tagSearch.trim();
    if (!trimmed) return;
    try {
      const newTag = await createTag({ name: trimmed });
      onTagsChange([...selectedTagIds, newTag.id]);
      setTagSearch("");
    } catch {
      // Tag may already exist — ignore
    }
  };

  const noExactMatch =
    tagSearch.trim() &&
    !tags.some(
      (t) => t.name.toLowerCase() === tagSearch.trim().toLowerCase(),
    );

  const uniqueQuestionTypes = [...new Set(questionTypes)];

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">Tags & Organization</Label>

      {/* Band Level */}
      <div className="space-y-1.5">
        <Label className="text-sm">Target Band Level</Label>
        <Select
          value={bandLevel ?? "NONE"}
          onValueChange={(v) => onBandLevelChange(v === "NONE" ? null : v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select band level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">None</SelectItem>
            <SelectItem value="4-5">4-5</SelectItem>
            <SelectItem value="5-6">5-6</SelectItem>
            <SelectItem value="6-7">6-7</SelectItem>
            <SelectItem value="7-8">7-8</SelectItem>
            <SelectItem value="8-9">8-9</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Topic Tags */}
      <div className="space-y-1.5">
        <Label className="text-sm">Topic Tags</Label>
        <Popover open={disabled ? false : tagPopoverOpen} onOpenChange={disabled ? undefined : setTagPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={tagPopoverOpen}
              className="w-[280px] justify-between"
            >
              {selectedTagIds.length > 0
                ? `${selectedTagIds.length} tag${selectedTagIds.length > 1 ? "s" : ""} selected`
                : "Select tags..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-0">
            <Command>
              <CommandInput
                placeholder="Search or create tags..."
                value={tagSearch}
                onValueChange={setTagSearch}
              />
              <CommandList>
                <CommandEmpty>
                  {noExactMatch && (
                    <button
                      type="button"
                      className="w-full px-2 py-1.5 text-sm text-left hover:bg-accent cursor-pointer flex items-center gap-2"
                      onClick={handleCreateAndSelect}
                      disabled={isCreating}
                    >
                      {isCreating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      Create &ldquo;{tagSearch.trim()}&rdquo;
                    </button>
                  )}
                  {!noExactMatch && "No tags found."}
                </CommandEmpty>
                {tags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    value={tag.name}
                    onSelect={() => handleTagToggle(tag.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedTagIds.includes(tag.id)
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    {tag.name}
                  </CommandItem>
                ))}
                {noExactMatch && tags.length > 0 && (
                  <CommandItem
                    value={`create-${tagSearch.trim()}`}
                    onSelect={handleCreateAndSelect}
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Create &ldquo;{tagSearch.trim()}&rdquo;
                  </CommandItem>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Selected tag chips */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {selectedTags.map((tag) => (
              <Badge key={tag.id} variant="secondary" className="gap-1">
                {tag.name}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag.id)}
                  className="ml-0.5 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Question Type Tags (read-only) */}
      {uniqueQuestionTypes.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-sm text-muted-foreground">
            Question Types
          </Label>
          <div className="flex flex-wrap gap-1">
            {uniqueQuestionTypes.map((qt) => (
              <Badge
                key={qt}
                variant="outline"
                className="text-muted-foreground"
              >
                {QUESTION_TYPE_LABELS[qt] ?? qt}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
