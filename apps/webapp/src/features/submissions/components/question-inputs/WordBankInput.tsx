import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { splitByBlanks, formatBlankDisplay } from "../../../exercises/components/question-types/blank-format";

interface WordBankInputProps {
  questionIndex: number;
  options: { wordBank: string[]; summaryText: string } | null;
  value: { blanks?: Record<string, string> } | null;
  onChange: (answer: unknown) => void;
  readOnly?: boolean;
}

export function WordBankInput({
  questionIndex,
  options,
  value,
  onChange,
  readOnly,
}: WordBankInputProps) {
  const summaryText = options?.summaryText ?? "";
  const wordBank = options?.wordBank ?? [];
  const blanks = (value as { blanks?: Record<string, string> })?.blanks ?? {};

  const parts = splitByBlanks(summaryText);

  const handleBlankChange = (blankNum: string, word: string) => {
    onChange({ blanks: { ...blanks, [blankNum]: word } });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{questionIndex + 1}.</p>
      <div className="text-sm leading-relaxed">
        {parts.map((part, idx) => {
          if (idx % 2 === 0) {
            return <span key={idx}>{part}</span>;
          }
          const blankNum = part;
          return (
            <span key={idx} className="inline-flex items-center mx-1 align-bottom">
              <Select
                value={blanks[blankNum] ?? ""}
                onValueChange={(val) => handleBlankChange(blankNum, val)}
                disabled={readOnly}
              >
                <SelectTrigger className="h-8 text-xs w-[160px] inline-flex">
                  <SelectValue placeholder={formatBlankDisplay(blankNum)} />
                </SelectTrigger>
                <SelectContent>
                  {wordBank.map((word, wi) => (
                    <SelectItem key={wi} value={word}>
                      {word}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </span>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {wordBank.map((word, wi) => {
          const isUsed = Object.values(blanks).includes(word);
          return (
            <span
              key={wi}
              className={`px-2 py-1 rounded border text-xs ${
                isUsed ? "bg-muted text-muted-foreground line-through" : "bg-card"
              }`}
            >
              {word}
            </span>
          );
        })}
      </div>
    </div>
  );
}
