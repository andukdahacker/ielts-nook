import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import { safeParseJson } from "./utils";

interface NoteTableFlowchartOptions {
  subFormat: "note" | "table" | "flowchart";
  structure: string;
  wordLimit?: number;
}

interface NoteTableFlowchartPreviewProps {
  questionText?: string;
  questionIndex: number;
  options: NoteTableFlowchartOptions | null;
}

interface TableStructure {
  columns: string[];
  rows: string[][];
}

interface FlowchartStructure {
  steps: string[];
}

export function NoteTableFlowchartPreview({
  questionText = "",
  questionIndex,
  options,
}: NoteTableFlowchartPreviewProps) {
  if (!options || !options.structure) {
    return (
      <div className="space-y-1">
        <p className="text-sm">
          <span className="font-medium">{questionIndex + 1}.</span> {questionText}
        </p>
        <p className="pl-4 text-sm text-muted-foreground italic">
          No structure configured.
        </p>
      </div>
    );
  }

  const { subFormat, structure, wordLimit } = options;

  return (
    <div className="space-y-2">
      <p className="text-sm">
        <span className="font-medium">{questionIndex + 1}.</span> {questionText}
      </p>
      {subFormat === "note" && (
        <NotePreviewContent structure={structure} wordLimit={wordLimit ?? 2} />
      )}
      {subFormat === "table" && (
        <TablePreviewContent structure={structure} wordLimit={wordLimit ?? 2} />
      )}
      {subFormat === "flowchart" && (
        <FlowchartPreviewContent structure={structure} wordLimit={wordLimit ?? 2} />
      )}
    </div>
  );
}

/** Render inline blank with word limit badge */
function BlankInput({ wordLimit }: { wordLimit: number }) {
  return (
    <span className="inline-flex items-center gap-1 mx-1">
      <Input
        disabled
        placeholder="..."
        className="h-6 w-24 text-xs inline-flex"
      />
      <Badge variant="outline" className="text-[9px] h-4 shrink-0">
        {wordLimit}w
      </Badge>
    </span>
  );
}

/* ---- Note Preview ---- */

function NotePreviewContent({
  structure,
  wordLimit,
}: {
  structure: string;
  wordLimit: number;
}) {
  // Render line by line to preserve indentation/hierarchy
  const lines = structure.split("\n");

  return (
    <div className="pl-4 space-y-0.5">
      {lines.map((line, lineIdx) => {
        const lineParts = line.split(/___(\d+)___/);
        return (
          <div key={lineIdx} className="text-sm whitespace-pre-wrap">
            {lineParts.map((part, partIdx) => {
              if (partIdx % 2 === 0) {
                return <span key={partIdx}>{part}</span>;
              }
              return <BlankInput key={partIdx} wordLimit={wordLimit} />;
            })}
          </div>
        );
      })}
    </div>
  );
}

/* ---- Table Preview ---- */

function TablePreviewContent({
  structure,
  wordLimit,
}: {
  structure: string;
  wordLimit: number;
}) {
  const parsed = safeParseJson<TableStructure>(structure);
  if (!parsed) {
    return (
      <p className="pl-4 text-sm text-muted-foreground italic">
        Invalid table structure.
      </p>
    );
  }

  const { columns, rows } = parsed;

  return (
    <div className="pl-4 overflow-x-auto">
      <table className="text-sm border-collapse">
        <thead>
          <tr>
            {columns.map((col, ci) => (
              <th key={ci} className="border p-2 bg-muted/50 text-left text-xs font-medium">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => {
                const isBlank = /___\d+___/.test(cell);
                return (
                  <td key={ci} className="border p-2">
                    {isBlank ? (
                      <BlankInput wordLimit={wordLimit} />
                    ) : (
                      <span className="text-sm">{cell}</span>
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

/* ---- Flowchart Preview ---- */

function FlowchartPreviewContent({
  structure,
  wordLimit,
}: {
  structure: string;
  wordLimit: number;
}) {
  const parsed = safeParseJson<FlowchartStructure>(structure);
  if (!parsed) {
    return (
      <p className="pl-4 text-sm text-muted-foreground italic">
        Invalid flowchart structure.
      </p>
    );
  }

  const { steps } = parsed;

  return (
    <div className="pl-4 flex flex-col items-start">
      {steps.map((step, i) => {
        const parts = step.split(/___(\d+)___/);
        return (
          <div key={i} className="flex flex-col items-center">
            <div className="border rounded px-3 py-2 bg-muted/30 min-w-[200px]">
              <div className="text-sm">
                {parts.map((part, partIdx) => {
                  if (partIdx % 2 === 0) {
                    return <span key={partIdx}>{part}</span>;
                  }
                  return <BlankInput key={partIdx} wordLimit={wordLimit} />;
                })}
              </div>
            </div>
            {i < steps.length - 1 && (
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
