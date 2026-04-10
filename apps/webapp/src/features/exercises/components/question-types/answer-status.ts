import type { IeltsQuestionType } from "@workspace/types";
import { extractBlankNumbers } from "./blank-format";

// --- Type guards ---

function hasBlanksRecord(val: unknown): val is { blanks: Record<string, unknown> } {
  return val != null && typeof val === "object" && "blanks" in val
    && (val as { blanks: unknown }).blanks != null
    && typeof (val as { blanks: unknown }).blanks === "object";
}

function hasSummaryText(val: unknown): val is { summaryText: string } {
  return val != null && typeof val === "object" && "summaryText" in val
    && typeof (val as { summaryText: unknown }).summaryText === "string";
}

function hasStructure(val: unknown): val is { structure: string } {
  return val != null && typeof val === "object" && "structure" in val
    && typeof (val as { structure: unknown }).structure === "string";
}

// --- Blank answer check (shared by helper + inline warnings) ---

/** Check if a single blank value (structured or legacy string) has a non-empty answer */
export function isBlankAnswered(b: unknown): boolean {
  if (typeof b === "string") return b.trim().length > 0;
  if (b != null && typeof b === "object" && "answer" in b) {
    return typeof (b as { answer: unknown }).answer === "string"
      && ((b as { answer: string }).answer).trim().length > 0;
  }
  return false;
}

// --- Main helper ---

/**
 * Determine answer completion status for question types with blank-based answers.
 * Returns "complete" | "incomplete" | "not-applicable".
 *
 * For R13/L1: cross-references structure-derived blank IDs against correctAnswer.blanks
 * to detect missing entries for newly added blanks.
 * For R7: cross-references summaryText blank numbers against correctAnswer.blanks.
 */
export function getAnswerCompletionStatus(
  sectionType: IeltsQuestionType,
  correctAnswer: unknown,
  options: unknown,
): "complete" | "incomplete" | "not-applicable" {
  // R13 and L1 share the same NoteTableFlowchartEditor and blanks structure
  if (sectionType === "R13_NOTE_TABLE_FLOWCHART" || sectionType === "L1_FORM_NOTE_TABLE") {
    if (!hasBlanksRecord(correctAnswer)) return "incomplete";

    // Cross-reference structure-derived blanks if options.structure is available
    if (hasStructure(options)) {
      const structureBlankIds = extractBlanksFromStructure(options.structure);
      if (structureBlankIds.length === 0) return "incomplete";
      return structureBlankIds.every((id) => isBlankAnswered(correctAnswer.blanks[id]))
        ? "complete" : "incomplete";
    }

    // Fallback: check all entries in blanks record
    const entries = Object.values(correctAnswer.blanks);
    if (entries.length === 0) return "incomplete";
    return entries.every(isBlankAnswered) ? "complete" : "incomplete";
  }

  if (sectionType === "R7_SUMMARY_WORD_BANK") {
    if (!hasSummaryText(options)) return "not-applicable";
    const blankNums = extractBlankNumbers(options.summaryText);
    if (blankNums.length === 0) return "not-applicable";
    if (!hasBlanksRecord(correctAnswer)) return "incomplete";
    return blankNums.every((n) => {
      const val = correctAnswer.blanks[n];
      return typeof val === "string" && val.trim().length > 0;
    }) ? "complete" : "incomplete";
  }

  return "not-applicable";
}

/**
 * Extract blank IDs from R13/L1 structure string.
 * Handles plain text, JSON table ({columns, rows}), and JSON flowchart ({steps}).
 */
function extractBlanksFromStructure(structure: string): string[] {
  // Try JSON first (table or flowchart)
  const trimmed = structure.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed.rows)) {
        // Table: extract from all cells
        const blanks: string[] = [];
        for (const row of parsed.rows) {
          if (Array.isArray(row)) {
            for (const cell of row) {
              if (typeof cell === "string") blanks.push(...extractBlankNumbers(cell));
            }
          }
        }
        return blanks;
      }
      if (Array.isArray(parsed.steps)) {
        // Flowchart: extract from all steps
        const blanks: string[] = [];
        for (const step of parsed.steps) {
          if (typeof step === "string") blanks.push(...extractBlankNumbers(step));
        }
        return blanks;
      }
    } catch {
      // Not valid JSON, fall through to plain text
    }
  }
  // Plain text (note sub-format)
  return extractBlankNumbers(structure);
}
