import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useHighlightValue,
  useScrollTargetValue,
} from "../hooks/use-highlight-context";
import type { AnchorStatus } from "../hooks/use-anchor-validation";

interface HighlightFeedbackItem {
  id: string;
  startOffset: number;
  endOffset: number;
  severity?: "error" | "warning" | "suggestion" | null;
  anchorStatus: AnchorStatus;
}

interface HighlightedTextProps {
  text: string;
  feedbackItems: HighlightFeedbackItem[];
}

type Severity = "error" | "warning" | "suggestion";

const SEVERITY_PRIORITY: Record<string, number> = {
  error: 3,
  warning: 2,
  suggestion: 1,
  teacher: 0, // teacher comments are lowest priority for overlapping ranges
};

const ACTIVE_BG: Record<string, string> = {
  error: "bg-red-100 dark:bg-red-900/30",
  warning: "bg-amber-100 dark:bg-amber-900/30",
  suggestion: "bg-blue-100 dark:bg-blue-900/30",
  teacher: "bg-emerald-100 dark:bg-emerald-900/30",
};

interface TextSegment {
  text: string;
  feedbackId: string | null;
  allFeedbackIds: string[];
  severity: Severity | null;
  anchorStatus: AnchorStatus | null;
}

function buildSegments(
  text: string,
  items: HighlightFeedbackItem[],
): TextSegment[] {
  // Filter to only valid/drifted items with valid ranges
  const validItems = items.filter(
    (item) =>
      (item.anchorStatus === "valid" || item.anchorStatus === "drifted") &&
      item.startOffset >= 0 &&
      item.endOffset > item.startOffset &&
      item.endOffset <= text.length,
  );

  if (validItems.length === 0) {
    return [
      { text, feedbackId: null, allFeedbackIds: [], severity: null, anchorStatus: null },
    ];
  }

  // Collect all boundaries
  type Boundary = { pos: number; isStart: boolean; item: HighlightFeedbackItem };
  const boundaries: Boundary[] = [];
  for (const item of validItems) {
    boundaries.push({ pos: item.startOffset, isStart: true, item });
    boundaries.push({ pos: item.endOffset, isStart: false, item });
  }
  boundaries.sort((a, b) => a.pos - b.pos || (a.isStart ? -1 : 1));

  // Build non-overlapping segments
  const segments: TextSegment[] = [];
  const activeItems = new Set<HighlightFeedbackItem>();
  let cursor = 0;

  for (const boundary of boundaries) {
    if (boundary.pos > cursor) {
      const segText = text.slice(cursor, boundary.pos);
      if (segText) {
        const topItem = getHighestSeverityItem(activeItems);
        segments.push({
          text: segText,
          feedbackId: topItem?.id ?? null,
          allFeedbackIds: [...activeItems].map((i) => i.id),
          severity: (topItem?.severity as Severity) ?? null,
          anchorStatus: topItem?.anchorStatus ?? null,
        });
      }
    }

    if (boundary.isStart) {
      activeItems.add(boundary.item);
    } else {
      activeItems.delete(boundary.item);
    }
    cursor = boundary.pos;
  }

  // Remaining text after last boundary
  if (cursor < text.length) {
    segments.push({
      text: text.slice(cursor),
      feedbackId: null,
      allFeedbackIds: [],
      severity: null,
      anchorStatus: null,
    });
  }

  return segments;
}

function getHighestSeverityItem(
  items: Set<HighlightFeedbackItem>,
): HighlightFeedbackItem | null {
  let best: HighlightFeedbackItem | null = null;
  let bestPriority = -1;
  for (const item of items) {
    const sevKey = item.severity === null ? "teacher" : (item.severity ?? "suggestion");
    const priority = SEVERITY_PRIORITY[sevKey] ?? 0;
    if (priority > bestPriority) {
      bestPriority = priority;
      best = item;
    }
  }
  return best;
}

const FLASH_BG: Record<string, string> = {
  error: "var(--highlight-flash-error, rgba(239, 68, 68, 0.3))",
  warning: "var(--highlight-flash-warning, rgba(245, 158, 11, 0.3))",
  suggestion: "var(--highlight-flash-suggestion, rgba(59, 130, 246, 0.3))",
  teacher: "var(--highlight-flash-teacher, rgba(16, 185, 129, 0.3))",
};

const FLASH_STYLE_ID = "highlight-flash-keyframes";
function ensureFlashStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById(FLASH_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = FLASH_STYLE_ID;
  style.textContent = `
    @keyframes highlight-flash {
      0% { background-color: var(--flash-color); }
      100% { background-color: transparent; }
    }
    .animate-highlight-flash {
      animation: highlight-flash 1.5s ease-out forwards;
    }
  `;
  document.head.appendChild(style);
}

export function HighlightedText({ text, feedbackItems }: HighlightedTextProps) {
  const highlightedItemId = useHighlightValue();
  const scrollTarget = useScrollTargetValue();
  const [flashingId, setFlashingId] = useState<string | null>(null);

  // Inject flash keyframe style once per document
  useEffect(() => { ensureFlashStyle(); }, []);

  const segments = useMemo(
    () => buildSegments(text, feedbackItems),
    [text, feedbackItems],
  );

  // Scroll to target on click (not hover)
  useEffect(() => {
    if (!scrollTarget) return;
    const escaped = CSS.escape(scrollTarget.id);
    // Primary: exact data-feedback-id match. Fallback: overlapping item in data-feedback-ids.
    const el =
      document.querySelector<HTMLElement>(`[data-feedback-id="${escaped}"]`) ??
      document.querySelector<HTMLElement>(`[data-feedback-ids~="${escaped}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      // Delay flash until element is likely visible after smooth scroll
      requestAnimationFrame(() => {
        setFlashingId(scrollTarget.id);
      });
    }
  }, [scrollTarget]);

  // Clear flash after animation completes
  const handleAnimationEnd = useCallback(() => {
    setFlashingId(null);
  }, []);

  // Split text into paragraphs and render segments within each
  const paragraphs = useMemo(() => {
    const result: Array<{ segments: (TextSegment & { charOffset: number })[]; paragraphIndex: number }> =
      [];

    // Pre-compute segment positions in O(n)
    const segPositions: number[] = [];
    let pos = 0;
    for (const seg of segments) {
      segPositions.push(pos);
      pos += seg.text.length;
    }

    let charPos = 0;
    const lines = text.split("\n");

    for (let pIdx = 0; pIdx < lines.length; pIdx++) {
      const lineStart = charPos;
      const lineEnd = charPos + lines[pIdx].length;

      const lineSegments: (TextSegment & { charOffset: number })[] = [];
      for (let sIdx = 0; sIdx < segments.length; sIdx++) {
        const seg = segments[sIdx];
        const segStart = segPositions[sIdx];
        const segEnd = segStart + seg.text.length;

        // Check if segment overlaps with this line
        const overlapStart = Math.max(segStart, lineStart);
        const overlapEnd = Math.min(segEnd, lineEnd);

        if (overlapStart < overlapEnd) {
          const sliceStart = overlapStart - segStart;
          const sliceEnd = overlapEnd - segStart;
          lineSegments.push({
            ...seg,
            text: seg.text.slice(sliceStart, sliceEnd),
            charOffset: overlapStart,
          });
        }
      }

      result.push({ segments: lineSegments, paragraphIndex: pIdx });
      charPos = lineEnd + 1; // +1 for the \n character
    }

    return result;
  }, [text, segments]);

  return (
    <div className="space-y-1">
      {paragraphs.map(({ segments: lineSegs, paragraphIndex }) => (
        <p key={paragraphIndex} className="text-sm leading-relaxed">
          {lineSegs.length === 0 ? (
            "\u00A0"
          ) : (
            lineSegs.map((seg) => {
              if (!seg.feedbackId) {
                return <span key={`t-${seg.charOffset}`} data-char-start={seg.charOffset}>{seg.text || "\u00A0"}</span>;
              }

              const isActive = highlightedItemId === seg.feedbackId || seg.allFeedbackIds.includes(highlightedItemId ?? "");
              const isFlashing = flashingId === seg.feedbackId || seg.allFeedbackIds.includes(flashingId ?? "");
              const severity = seg.severity === null ? "teacher" : (seg.severity ?? "suggestion");
              const extraIds = seg.allFeedbackIds.filter((id) => id !== seg.feedbackId);

              return (
                <span
                  key={`fb-${seg.feedbackId}-${seg.charOffset}`}
                  data-feedback-id={seg.feedbackId}
                  data-feedback-ids={extraIds.length > 0 ? extraIds.join(" ") : undefined}
                  data-char-start={seg.charOffset}
                  id={`anchor-${seg.feedbackId}`}
                  className={
                    isFlashing
                      ? "animate-highlight-flash rounded-sm"
                      : isActive
                        ? `${ACTIVE_BG[severity]} rounded-sm transition-colors duration-200`
                        : severity === "teacher"
                          ? "underline decoration-dotted decoration-emerald-400/40"
                          : "underline decoration-dotted decoration-muted-foreground/40"
                  }
                  style={isFlashing ? { "--flash-color": FLASH_BG[severity] } as React.CSSProperties : undefined}
                  onAnimationEnd={isFlashing ? handleAnimationEnd : undefined}
                >
                  {seg.text}
                </span>
              );
            })
          )}
        </p>
      ))}
    </div>
  );
}
