import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Badge } from "@workspace/ui/components/badge";
import { Textarea } from "@workspace/ui/components/textarea";
import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/radio-group";
import { Plus, Trash2 } from "lucide-react";
import { AnswerVariantManager } from "./AnswerVariantManager";
import { safeParseJson } from "./utils";
import { BLANK_PATTERN, extractBlankNumbers } from "./blank-format";

type SubFormat = "note" | "table" | "flowchart";

interface NoteTableFlowchartOptions {
  subFormat: SubFormat;
  structure: string;
  wordLimit: number;
}

interface StructuredBlank {
  answer: string;
  acceptedVariants: string[];
  strictWordOrder: boolean;
}

interface NoteTableFlowchartAnswer {
  blanks: Record<string, StructuredBlank>;
}

interface NoteTableFlowchartEditorProps {
  options: NoteTableFlowchartOptions | null;
  correctAnswer: NoteTableFlowchartAnswer | null;
  onChange: (
    options: NoteTableFlowchartOptions,
    correctAnswer: NoteTableFlowchartAnswer,
  ) => void;
}

interface TableStructure {
  columns: string[];
  rows: string[][];
}

interface FlowchartStructure {
  steps: string[];
}

/** Parse ___N___ blanks from text, filtering empty IDs (H3 fix) */
function parseBlanks(text: string): string[] {
  return extractBlankNumbers(text);
}


/** Extract all blank IDs from a table structure */
function parseTableBlanks(structure: TableStructure): string[] {
  const blanks: string[] = [];
  for (const row of structure.rows) {
    for (const cell of row) {
      blanks.push(...parseBlanks(cell));
    }
  }
  return blanks;
}

/** Extract all blank IDs from a flowchart structure */
function parseFlowchartBlanks(structure: FlowchartStructure): string[] {
  const blanks: string[] = [];
  for (const step of structure.steps) {
    blanks.push(...parseBlanks(step));
  }
  return blanks;
}

export function NoteTableFlowchartEditor({
  options,
  correctAnswer,
  onChange,
}: NoteTableFlowchartEditorProps) {
  const subFormat = options?.subFormat ?? "note";
  const structure = options?.structure ?? "";
  const wordLimit = options?.wordLimit ?? 2;
  const blanks = correctAnswer?.blanks ?? {};

  const update = (
    newSubFormat: SubFormat,
    newStructure: string,
    newWordLimit: number,
    newBlanks: Record<string, StructuredBlank>,
  ) => {
    onChange(
      { subFormat: newSubFormat, structure: newStructure, wordLimit: newWordLimit },
      { blanks: newBlanks },
    );
  };

  // Sub-format switch resets structure
  const handleSubFormatChange = (value: string) => {
    const newSubFormat = value as SubFormat;
    let defaultStructure = "";
    if (newSubFormat === "table") {
      defaultStructure = JSON.stringify({
        columns: ["Column 1", "Column 2"],
        rows: [["", ""]],
      });
    } else if (newSubFormat === "flowchart") {
      defaultStructure = JSON.stringify({ steps: [""] });
    }
    update(newSubFormat, defaultStructure, wordLimit, {} as Record<string, StructuredBlank>);
  };

  // Determine blank IDs from current structure
  let blankIds: string[] = [];
  if (subFormat === "note") {
    blankIds = parseBlanks(structure);
  } else if (subFormat === "table") {
    const parsed = safeParseJson<TableStructure>(structure);
    blankIds = parsed ? parseTableBlanks(parsed) : [];
  } else if (subFormat === "flowchart") {
    const parsed = safeParseJson<FlowchartStructure>(structure);
    blankIds = parsed ? parseFlowchartBlanks(parsed) : [];
  }

  return (
    <div className="space-y-3">
      {/* Sub-format selector */}
      <div className="space-y-1.5">
        <Label className="text-xs">Sub-Format</Label>
        <RadioGroup
          value={subFormat}
          onValueChange={handleSubFormatChange}
          className="flex gap-4"
        >
          {(["note", "table", "flowchart"] as const).map((fmt) => (
            <div key={fmt} className="flex items-center gap-1.5">
              <RadioGroupItem value={fmt} id={`subformat-${fmt}`} />
              <Label htmlFor={`subformat-${fmt}`} className="text-xs capitalize cursor-pointer">
                {fmt}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Sub-format specific editor */}
      {subFormat === "note" && (
        <NoteEditor
          structure={structure}
          onStructureChange={(s) => update(subFormat, s, wordLimit, blanks)}
        />
      )}
      {subFormat === "table" && (
        <TableEditor
          structure={structure}
          onStructureChange={(s) => update(subFormat, s, wordLimit, blanks)}
        />
      )}
      {subFormat === "flowchart" && (
        <FlowchartEditor
          structure={structure}
          onStructureChange={(s) => update(subFormat, s, wordLimit, blanks)}
        />
      )}

      {/* Answer assignment panel */}
      {blankIds.length > 0 && (
        <div className="space-y-3">
          <Label className="text-xs">Answer Assignment</Label>
          {blankIds.map((id) => {
            const rawBlank = blanks[id];
            // Handle both old flat format (string) and new structured format
            const blank: StructuredBlank = rawBlank
              ? (typeof rawBlank === "string"
                ? { answer: rawBlank, acceptedVariants: [], strictWordOrder: true }
                : { answer: rawBlank.answer ?? "", acceptedVariants: rawBlank.acceptedVariants ?? [], strictWordOrder: rawBlank.strictWordOrder ?? true })
              : { answer: "", acceptedVariants: [], strictWordOrder: true };
            const hasMultipleWords = blank.answer.trim().split(/\s+/).filter(Boolean).length >= 2;
            return (
              <div key={id} className="space-y-1.5 pl-2 border-l-2 border-muted">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium min-w-[4rem]">
                    Blank {id}:
                  </span>
                  <Input
                    defaultValue={blank.answer}
                    onBlur={(e) => {
                      const newBlanks = { ...blanks, [id]: { ...blank, answer: e.target.value } };
                      update(subFormat, structure, wordLimit, newBlanks);
                    }}
                    placeholder="Correct answer..."
                    className="flex-1 h-7 text-xs"
                  />
                </div>
                {hasMultipleWords && (
                  <div className="flex items-center gap-2 pl-[4.5rem]">
                    <Checkbox
                      id={`word-order-${id}`}
                      checked={!blank.strictWordOrder}
                      onCheckedChange={(checked) => {
                        const newBlanks = { ...blanks, [id]: { ...blank, strictWordOrder: checked !== true } };
                        update(subFormat, structure, wordLimit, newBlanks);
                      }}
                    />
                    <Label htmlFor={`word-order-${id}`} className="text-xs cursor-pointer">
                      Allow any word order
                    </Label>
                  </div>
                )}
                <div className="pl-[4.5rem]">
                  <AnswerVariantManager
                    variants={blank.acceptedVariants}
                    onVariantsChange={(newVariants) => {
                      const newBlanks = { ...blanks, [id]: { ...blank, acceptedVariants: newVariants } };
                      update(subFormat, structure, wordLimit, newBlanks);
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Word limit control */}
      <div className="space-y-1.5">
        <Label className="text-xs">Word Limit</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={5}
            defaultValue={wordLimit}
            onBlur={(e) => {
              const val = parseInt(e.target.value, 10);
              if (val >= 1 && val <= 5) {
                update(subFormat, structure, val, blanks);
              }
            }}
            className="w-20 h-7 text-xs"
          />
          <span className="text-xs text-muted-foreground">words</span>
        </div>
      </div>
    </div>
  );
}

/* ---- Note Editor ---- */

function NoteEditor({
  structure,
  onStructureChange,
}: {
  structure: string;
  onStructureChange: (s: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        Structured Text (use ___1___, ___2___, etc. for blanks — displayed as (1), (2))
      </Label>
      <Textarea
        defaultValue={structure}
        onBlur={(e) => onStructureChange(e.target.value)}
        placeholder={`Main Topic: Climate Change\n• Impact on agriculture\n  - Crop yields decreased by ___1___\n  - Water scarcity affects ___2___\n• Solutions proposed\n  - Renewable energy reduces ___3___`}
        className="text-sm min-h-[120px] font-mono"
      />
    </div>
  );
}

/* ---- Table Editor ---- */

function TableEditor({
  structure,
  onStructureChange,
}: {
  structure: string;
  onStructureChange: (s: string) => void;
}) {
  const parsed = safeParseJson<TableStructure>(structure);
  const columns = parsed?.columns ?? ["Column 1", "Column 2"];
  const rows = parsed?.rows ?? [["", ""]];

  const emitUpdate = (newColumns: string[], newRows: string[][]) => {
    onStructureChange(JSON.stringify({ columns: newColumns, rows: newRows }));
  };

  const addColumn = () => {
    const newColumns = [...columns, `Column ${columns.length + 1}`];
    const newRows = rows.map((row) => [...row, ""]);
    emitUpdate(newColumns, newRows);
  };

  const removeColumn = (colIndex: number) => {
    if (columns.length <= 2) return;
    const newColumns = columns.filter((_, i) => i !== colIndex);
    const newRows = rows.map((row) => row.filter((_, i) => i !== colIndex));
    emitUpdate(newColumns, newRows);
  };

  const addRow = () => {
    const newRow = columns.map(() => "");
    emitUpdate(columns, [...rows, newRow]);
  };

  const removeRow = (rowIndex: number) => {
    if (rows.length <= 1) return;
    emitUpdate(columns, rows.filter((_, i) => i !== rowIndex));
  };

  const updateColumnHeader = (colIndex: number, value: string) => {
    const newColumns = [...columns];
    newColumns[colIndex] = value;
    emitUpdate(newColumns, rows);
  };

  const toggleCellBlank = (rowIndex: number, colIndex: number) => {
    const newRows = rows.map((row) => [...row]);
    const cell = newRows[rowIndex][colIndex];
    if (BLANK_PATTERN.test(cell)) {
      // Convert blank back to empty text
      newRows[rowIndex][colIndex] = "";
    } else {
      // Find next available blank number
      const allBlanks = parseTableBlanks({ columns, rows: newRows });
      const usedNums = new Set(allBlanks.map(Number));
      let next = 1;
      while (usedNums.has(next)) next++;
      newRows[rowIndex][colIndex] = `___${next}___`;
    }
    emitUpdate(columns, newRows);
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = rows.map((row) => [...row]);
    newRows[rowIndex][colIndex] = value;
    emitUpdate(columns, newRows);
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Table Structure</Label>
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse">
          <thead>
            <tr>
              {columns.map((col, ci) => (
                <th key={ci} className="border p-1">
                  <div className="flex items-center gap-1">
                    <Input
                      defaultValue={col}
                      onBlur={(e) => updateColumnHeader(ci, e.target.value)}
                      className="h-6 text-xs min-w-[80px]"
                    />
                    {columns.length > 2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => removeColumn(ci)}
                        aria-label="Remove column"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    )}
                  </div>
                </th>
              ))}
              <th className="border p-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={addColumn}
                >
                  <Plus className="size-3" />
                </Button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => {
                  const isBlank = BLANK_PATTERN.test(cell);
                  return (
                    <td key={ci} className="border p-1">
                      {isBlank ? (
                        <Badge
                          variant="secondary"
                          className="cursor-pointer text-xs"
                          onClick={() => toggleCellBlank(ri, ci)}
                        >
                          {cell}
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Input
                            defaultValue={cell}
                            onBlur={(e) => updateCell(ri, ci, e.target.value)}
                            placeholder="Text or click blank"
                            className="h-6 text-xs min-w-[80px]"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => toggleCellBlank(ri, ci)}
                            aria-label="Make blank"
                            title="Toggle blank"
                          >
                            <span className="text-[10px]">_</span>
                          </Button>
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="border p-1">
                  {rows.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => removeRow(ri)}
                      aria-label="Remove row"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={addRow}
      >
        <Plus className="mr-1 size-3" />
        Add Row
      </Button>
    </div>
  );
}

/* ---- Flowchart Editor ---- */

function FlowchartEditor({
  structure,
  onStructureChange,
}: {
  structure: string;
  onStructureChange: (s: string) => void;
}) {
  const parsed = safeParseJson<FlowchartStructure>(structure);
  const steps = parsed?.steps ?? [""];

  const emitUpdate = (newSteps: string[]) => {
    onStructureChange(JSON.stringify({ steps: newSteps }));
  };

  const addStep = () => {
    emitUpdate([...steps, ""]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    emitUpdate(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = value;
    emitUpdate(newSteps);
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        Flowchart Steps (use ___1___, ___2___, etc. for blanks — displayed as (1), (2))
      </Label>
      <div className="space-y-0">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex flex-col items-center">
              {/* Step box */}
              <div className="flex items-center gap-1 border rounded px-2 py-1 bg-muted/50 min-w-[300px]">
                <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                  {i + 1}
                </Badge>
                <Input
                  defaultValue={step}
                  onBlur={(e) => updateStep(i, e.target.value)}
                  placeholder="Step text with ___1___ blanks (displayed as (1))..."
                  className="h-6 text-xs border-0 shadow-none bg-transparent"
                />
                {steps.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 shrink-0"
                    onClick={() => removeStep(i)}
                    aria-label="Remove step"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                )}
              </div>
              {/* Arrow connector */}
              {i < steps.length - 1 && (
                <div className="flex flex-col items-center">
                  <div className="w-px h-3 bg-border" />
                  <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-border" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={addStep}
      >
        <Plus className="mr-1 size-3" />
        Add Step
      </Button>
    </div>
  );
}
