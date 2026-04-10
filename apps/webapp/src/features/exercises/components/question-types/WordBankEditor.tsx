import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Badge } from "@workspace/ui/components/badge";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { AlertCircle, KeyRound, Plus, X } from "lucide-react";
import { useState } from "react";
import { isBlankAnswered } from "./answer-status";

interface WordBankEditorProps {
  options: {
    wordBank: string[];
    summaryText: string;
  } | null;
  correctAnswer: {
    blanks: Record<string, string>;
  } | null;
  onChange: (
    options: { wordBank: string[]; summaryText: string },
    correctAnswer: { blanks: Record<string, string> },
  ) => void;
}

import { extractBlankNumbers } from "./blank-format";

/** Parse ___N___ blanks from summary text */
function parseBlanks(text: string): string[] {
  return extractBlankNumbers(text);
}

export function WordBankEditor({
  options,
  correctAnswer,
  onChange,
}: WordBankEditorProps) {
  const wordBank = options?.wordBank ?? [];
  const summaryText = options?.summaryText ?? "";
  const blanks = correctAnswer?.blanks ?? {};

  const [newWord, setNewWord] = useState("");

  const blankNumbers = parseBlanks(summaryText);

  const update = (
    newWordBank: string[],
    newSummaryText: string,
    newBlanks: Record<string, string>,
  ) => {
    onChange(
      { wordBank: newWordBank, summaryText: newSummaryText },
      { blanks: newBlanks },
    );
  };

  const addWord = () => {
    const trimmed = newWord.trim();
    if (!trimmed) return;
    if (wordBank.includes(trimmed)) return;
    update([...wordBank, trimmed], summaryText, blanks);
    setNewWord("");
  };

  const removeWord = (index: number) => {
    const removed = wordBank[index];
    const newWordBank = wordBank.filter((_, i) => i !== index);
    // Clean up any blanks that referenced the removed word
    const newBlanks = { ...blanks };
    for (const [key, val] of Object.entries(newBlanks)) {
      if (val === removed) {
        delete newBlanks[key];
      }
    }
    update(newWordBank, summaryText, newBlanks);
  };

  const handleBlankAssignment = (blankNum: string, word: string) => {
    const newBlanks = { ...blanks, [blankNum]: word };
    update(wordBank, summaryText, newBlanks);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">
          Summary Text (use ___1___, ___2___, etc. for blanks — displayed as (1), (2))
        </Label>
        <Textarea
          defaultValue={summaryText}
          onChange={(e) => update(wordBank, e.target.value, blanks)}
          placeholder="The main factor affecting urban growth was ___1___. This led to increased ___2___ in cities. (Blanks display as (1), (2) in preview)"
          className="text-sm min-h-[80px]"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Word Bank</Label>
        <div className="flex flex-wrap gap-1">
          {wordBank.map((word, i) => (
            <Badge key={i} variant="secondary" className="gap-1 text-xs">
              {word}
              <button
                type="button"
                onClick={() => removeWord(i)}
                className="hover:text-destructive"
                aria-label={`Remove word ${word}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            placeholder="Add a word to the bank..."
            className="flex-1 h-7 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addWord();
              }
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={addWord}
            disabled={!newWord.trim()}
          >
            <Plus className="mr-1 size-3" />
            Add
          </Button>
        </div>
      </div>

      {blankNumbers.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <KeyRound className="size-4 text-primary" />
            <Label className="text-primary font-semibold">Correct Answers</Label>
            {blankNumbers.some((num) => !isBlankAnswered(blanks[num])) && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-500" data-testid="wb-incomplete-warning">
                <AlertCircle className="size-3" />
                Some blanks need answers
              </span>
            )}
          </div>
          <div className="space-y-1">
            {blankNumbers.map((num) => (
              <div key={num} className="flex items-center gap-2">
                <span className="text-xs font-medium min-w-[4rem]">
                  Blank {num}:
                </span>
                <Select
                  value={blanks[num] ?? ""}
                  onValueChange={(val) => handleBlankAssignment(num, val)}
                >
                  <SelectTrigger className="h-7 text-xs flex-1">
                    <SelectValue placeholder="Select word..." />
                  </SelectTrigger>
                  <SelectContent>
                    {wordBank.map((word) => (
                      <SelectItem key={word} value={word}>
                        {word}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
