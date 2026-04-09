import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import { splitByBlanks, formatBlankDisplay } from "../../../exercises/components/question-types/blank-format";

interface NoteTableFlowchartInputProps {
  questionIndex: number;
  options: { subFormat: "note" | "table" | "flowchart"; structure: string; wordLimit?: number } | null;
  value: { blanks?: Record<string, string> } | null;
  onChange: (answer: unknown) => void;
  readOnly?: boolean;
}

function safeParseJson<T>(str: string): T | null {
  try {
    return JSON.parse(str) as T;
  } catch {
    return null;
  }
}

export function NoteTableFlowchartInput({
  questionIndex,
  options,
  value,
  onChange,
  readOnly,
}: NoteTableFlowchartInputProps) {
  if (!options?.structure) {
    return (
      <div className="text-sm text-muted-foreground italic">
        {questionIndex + 1}. No structure configured.
      </div>
    );
  }

  const { subFormat, structure, wordLimit = 2 } = options;
  const blanks = (value as { blanks?: Record<string, string> })?.blanks ?? {};

  const handleBlankChange = (blankNum: string, text: string) => {
    onChange({ blanks: { ...blanks, [blankNum]: text } });
  };

  const renderBlank = (blankNum: string) => (
    <span key={`blank-${blankNum}`} className="inline-flex items-center gap-1 mx-1">
      <Input
        value={blanks[blankNum] ?? ""}
        onChange={(e) => handleBlankChange(blankNum, e.target.value)}
        placeholder={formatBlankDisplay(blankNum)}
        className="h-8 w-28 text-xs inline-flex"
        disabled={readOnly}
      />
      <Badge variant="outline" className="text-[9px] h-4 shrink-0">
        {wordLimit}w
      </Badge>
    </span>
  );

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{questionIndex + 1}.</p>
      {subFormat === "note" && (
        <NoteContent structure={structure} renderBlank={renderBlank} />
      )}
      {subFormat === "table" && (
        <TableContent structure={structure} renderBlank={renderBlank} />
      )}
      {subFormat === "flowchart" && (
        <FlowchartContent structure={structure} renderBlank={renderBlank} />
      )}
    </div>
  );
}

function NoteContent({
  structure,
  renderBlank,
}: {
  structure: string;
  renderBlank: (blankNum: string) => React.ReactNode;
}) {
  const lines = structure.split("\n");
  return (
    <div className="space-y-0.5">
      {lines.map((line, lineIdx) => {
        const lineParts = splitByBlanks(line);
        return (
          <div key={lineIdx} className="text-sm whitespace-pre-wrap">
            {lineParts.map((part, partIdx) =>
              partIdx % 2 === 0 ? <span key={partIdx}>{part}</span> : renderBlank(part),
            )}
          </div>
        );
      })}
    </div>
  );
}

function TableContent({
  structure,
  renderBlank,
}: {
  structure: string;
  renderBlank: (blankNum: string) => React.ReactNode;
}) {
  const parsed = safeParseJson<{ columns: string[]; rows: string[][] }>(structure);
  if (!parsed) {
    return <p className="text-sm text-muted-foreground italic">Invalid table structure.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="text-sm border-collapse w-full">
        <thead>
          <tr>
            {parsed.columns.map((col, ci) => (
              <th key={ci} className="border p-2 bg-muted/50 text-left text-xs font-medium">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {parsed.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => {
                const parts = splitByBlanks(cell);
                return (
                  <td key={ci} className="border p-2">
                    {parts.map((part, partIdx) =>
                      partIdx % 2 === 0 ? <span key={partIdx}>{part}</span> : renderBlank(part)
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FlowchartContent({
  structure,
  renderBlank,
}: {
  structure: string;
  renderBlank: (blankNum: string) => React.ReactNode;
}) {
  const parsed = safeParseJson<{ steps: string[] }>(structure);
  if (!parsed) {
    return <p className="text-sm text-muted-foreground italic">Invalid flowchart structure.</p>;
  }

  return (
    <div className="flex flex-col items-start">
      {parsed.steps.map((step, i) => {
        const parts = splitByBlanks(step);
        return (
          <div key={i} className="flex flex-col items-center">
            <div className="border rounded px-3 py-2 bg-muted/30 min-w-[200px]">
              <div className="text-sm">
                {parts.map((part, partIdx) =>
                  partIdx % 2 === 0 ? <span key={partIdx}>{part}</span> : renderBlank(part),
                )}
              </div>
            </div>
            {i < parsed.steps.length - 1 && (
              <div className="flex flex-col items-center">
                <div className="w-px h-3 bg-border" />
                <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-border" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
