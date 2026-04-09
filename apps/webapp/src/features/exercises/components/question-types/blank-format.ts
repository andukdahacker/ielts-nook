/** Regex to match ___N___ blank markers (no /g flag — safe for .match() and .test()) */
export const BLANK_PATTERN = /___(\d+)___/;

/** Split text by blank markers. Returns array where odd indices are blank numbers. */
export function splitByBlanks(text: string): string[] {
  if (typeof text !== "string") return [String(text)];
  return text.split(BLANK_PATTERN);
}

/** Format a blank number for display: "1" -> "(1)" */
export function formatBlankDisplay(blankNum: string): string {
  return `(${blankNum})`;
}

/** Extract all blank number strings from text containing ___N___ markers */
export function extractBlankNumbers(text: string): string[] {
  const matches = [...text.matchAll(/___(\d+)___/g)];
  return matches.map((m) => m[1]).filter((id) => id.length > 0);
}
