import type { IeltsQuestionType } from "@workspace/types";
import { MATCHING_CONFIGS, type MatchingSectionType } from "./MatchingEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

interface MatchingPreviewProps {
  sectionType: IeltsQuestionType;
  questionText?: string;
  questionIndex: number;
  options: {
    sourceItems: string[];
    targetItems: string[];
  } | null;
}

export function MatchingPreview({
  sectionType,
  questionText = "",
  questionIndex,
  options,
}: MatchingPreviewProps) {
  const sourceItems = options?.sourceItems ?? [];
  const targetItems = options?.targetItems ?? [];
  const config = MATCHING_CONFIGS[sectionType as MatchingSectionType];

  if (!config) return null;

  // M1 fix: show message when no items configured
  if (sourceItems.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm">
          <span className="font-medium">{questionIndex + 1}.</span> {questionText}
        </p>
        <p className="pl-4 text-xs text-muted-foreground italic">
          No matching items configured.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm">
        <span className="font-medium">{questionIndex + 1}.</span> {questionText}
      </p>
      <div className="pl-4 space-y-1.5">
        {sourceItems.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-sm min-w-[1.5rem] font-medium">
              {i + 1}.
            </span>
            <span className="text-sm flex-1">{item}</span>
            <Select disabled>
              <SelectTrigger className="h-7 text-xs w-[180px]">
                <SelectValue placeholder={`Select ${config.previewTargetLabel}...`} />
              </SelectTrigger>
              <SelectContent>
                {targetItems.map((target, ti) => (
                  <SelectItem key={ti} value={String(ti)}>
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
