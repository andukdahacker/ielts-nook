import { Textarea } from "@workspace/ui/components/textarea";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

interface WritingInputProps {
  questionText: string;
  writingPrompt?: string | null;
  questionIndex: number;
  wordCountMin?: number | null;
  wordCountMax?: number | null;
  value: { text?: string } | null;
  onChange: (answer: unknown) => void;
  readOnly?: boolean;
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

export function WritingInput({
  questionText,
  writingPrompt,
  questionIndex,
  wordCountMin,
  wordCountMax,
  value,
  onChange,
  readOnly,
}: WritingInputProps) {
  const text = (value as { text?: string })?.text ?? "";
  const wordCount = countWords(text);

  const isUnderMin = wordCountMin != null && wordCount < wordCountMin;
  const isOverMax = wordCountMax != null && wordCount > wordCountMax;

  return (
    <div className="space-y-3">
      <p className="text-sm">
        <span className="font-medium">{questionIndex + 1}.</span> {writingPrompt ?? questionText}
      </p>
      <Textarea
        value={text}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder="Write your response here..."
        className="min-h-[200px] text-sm"
        rows={10}
        disabled={readOnly}
      />
      <div className="flex items-center gap-2">
        <Badge
          variant={isUnderMin || isOverMax ? "destructive" : "outline"}
          className="text-xs"
        >
          {wordCount} word{wordCount !== 1 ? "s" : ""}
        </Badge>
        {(wordCountMin != null || wordCountMax != null) && (
          <span className={cn("text-xs", isUnderMin || isOverMax ? "text-destructive" : "text-muted-foreground")}>
            {wordCountMin != null && wordCountMax != null
              ? `(${wordCountMin}–${wordCountMax} words)`
              : wordCountMin != null
                ? `(min ${wordCountMin} words)`
                : `(max ${wordCountMax} words)`}
          </span>
        )}
      </div>
    </div>
  );
}
