import { safeParseJson } from "./utils";
import { splitByBlanks, formatBlankDisplay } from "./blank-format";

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
        <NotePreviewContent structure={structure} />
      )}
      {subFormat === "table" && (
        <TablePreviewContent structure={structure} />
      )}
      {subFormat === "flowchart" && (
        <FlowchartPreviewContent structure={structure} />
      )}
    </div>
  );
}

/* ---- Note Preview ---- */

function NotePreviewContent({
  structure,
}: {
  structure: string;
}) {
  // Render line by line to preserve indentation/hierarchy
  const lines = structure.split("\n");

  return (
    <div className="pl-4 space-y-0.5">
      {lines.map((line, lineIdx) => {
        const lineParts = splitByBlanks(line);
        return (
          <div key={lineIdx} className="text-sm whitespace-pre-wrap">
            {lineParts.map((part, partIdx) => {
              if (partIdx % 2 === 0) {
                return <span key={partIdx}>{part}</span>;
              }
              return <span key={partIdx} className="font-medium text-primary">{formatBlankDisplay(part)}</span>;
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
}: {
  structure: string;
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
                const parts = splitByBlanks(cell);
                return (
                  <td key={ci} className="border p-2">
                    <span className="text-sm">
                      {parts.map((part, partIdx) =>
                        partIdx % 2 === 0
                          ? <span key={partIdx}>{part}</span>
                          : <span key={partIdx} className="font-medium text-primary">{formatBlankDisplay(part)}</span>
                      )}
                    </span>
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
}: {
  structure: string;
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
        const parts = splitByBlanks(step);
        return (
          <div key={i} className="flex flex-col items-center">
            <div className="border rounded px-3 py-2 bg-muted/30 min-w-[200px]">
              <div className="text-sm">
                {parts.map((part, partIdx) => {
                  if (partIdx % 2 === 0) {
                    return <span key={partIdx}>{part}</span>;
                  }
                  return <span key={partIdx} className="font-medium text-primary">{formatBlankDisplay(part)}</span>;
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
