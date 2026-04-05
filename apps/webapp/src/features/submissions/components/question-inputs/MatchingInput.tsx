import type { IeltsQuestionType } from "@workspace/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

interface MatchingInputProps {
  sectionType: IeltsQuestionType;
  questionIndex: number;
  options: { sourceItems: string[]; targetItems: string[] } | null;
  value: { matches?: Record<string, string> } | null;
  onChange: (answer: unknown) => void;
  readOnly?: boolean;
}

export function MatchingInput({
  questionIndex,
  options,
  value,
  onChange,
  readOnly,
}: MatchingInputProps) {
  const sourceItems = options?.sourceItems ?? [];
  const targetItems = options?.targetItems ?? [];
  const matches = (value as { matches?: Record<string, string> })?.matches ?? {};

  const handleMatchChange = (sourceIdx: string, target: string) => {
    onChange({ matches: { ...matches, [sourceIdx]: target } });
  };

  if (sourceItems.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">
        {questionIndex + 1}. No matching items configured.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{questionIndex + 1}.</p>
      <div className="space-y-2">
        {sourceItems.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-sm min-w-[2rem] font-medium">{i + 1}.</span>
            <span className="text-sm flex-1">{item}</span>
            <Select
              value={matches[String(i)] ?? ""}
              onValueChange={(val) => handleMatchChange(String(i), val)}
              disabled={readOnly}
            >
              <SelectTrigger className="min-h-[44px] text-sm w-[200px]">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {targetItems.map((target, ti) => (
                  <SelectItem key={ti} value={target}>
                    {target}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
