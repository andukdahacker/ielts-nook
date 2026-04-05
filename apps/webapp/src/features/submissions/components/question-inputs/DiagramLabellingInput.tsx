import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

interface DiagramLabellingInputProps {
  questionIndex: number;
  options: { diagramUrl: string; labelPositions: string[]; wordBank?: string[]; wordLimit?: number } | null;
  value: { labels?: Record<string, string> } | null;
  onChange: (answer: unknown) => void;
  readOnly?: boolean;
}

export function DiagramLabellingInput({
  questionIndex,
  options,
  value,
  onChange,
  readOnly,
}: DiagramLabellingInputProps) {
  if (!options) {
    return (
      <div className="text-sm text-muted-foreground italic">
        {questionIndex + 1}. No diagram configured.
      </div>
    );
  }

  const { diagramUrl, labelPositions, wordBank, wordLimit = 2 } = options;
  const useWordBank = Array.isArray(wordBank) && wordBank.length > 0;
  const labels = (value as { labels?: Record<string, string> })?.labels ?? {};

  const handleLabelChange = (position: string, label: string) => {
    onChange({ labels: { ...labels, [position]: label } });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{questionIndex + 1}.</p>

      {diagramUrl ? (
        <div className="max-w-full">
          <img
            src={diagramUrl}
            alt="Diagram"
            className="max-w-full h-auto rounded border"
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">No diagram uploaded.</p>
      )}

      <div className="space-y-2">
        {labelPositions.map((pos, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-sm font-medium min-w-[2rem]">{i + 1}.</span>
            <span className="text-xs text-muted-foreground min-w-[6rem]">{pos}</span>
            {useWordBank ? (
              <Select
                value={labels[String(i + 1)] ?? ""}
                onValueChange={(val) => handleLabelChange(String(i + 1), val)}
                disabled={readOnly}
              >
                <SelectTrigger className="min-h-[44px] text-sm w-[180px]">
                  <SelectValue placeholder="Select label..." />
                </SelectTrigger>
                <SelectContent>
                  {wordBank!.map((word, wi) => (
                    <SelectItem key={wi} value={word}>
                      {word}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Input
                  value={labels[String(i + 1)] ?? ""}
                  onChange={(e) => handleLabelChange(String(i + 1), e.target.value)}
                  placeholder="..."
                  className="min-h-[44px] w-32 text-sm"
                  disabled={readOnly}
                />
                <Badge variant="outline" className="text-[9px] h-4 shrink-0">
                  {wordLimit}w
                </Badge>
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
