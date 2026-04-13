import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  SpellCheck,
  BookOpen,
  Link,
  Star,
  MessageCircle,
  Check,
  X,
} from "lucide-react";
import { AnchorStatusIndicator } from "./AnchorStatusIndicator";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AnchorStatus } from "../hooks/use-anchor-validation";

type FeedbackType =
  | "grammar"
  | "vocabulary"
  | "coherence"
  | "score_suggestion"
  | "general";
type Severity = "error" | "warning" | "suggestion";

interface FeedbackItem {
  id: string;
  type: FeedbackType;
  content: string;
  suggestedFix?: string | null;
  severity?: Severity | null;
  confidence?: number | null;
  originalContextSnippet?: string | null;
  startOffset?: number | null;
  endOffset?: number | null;
  isApproved?: boolean | null;
  approvedAt?: string | null;
  teacherOverrideText?: string | null;
}

const TYPE_ICONS: Record<FeedbackType, React.ElementType> = {
  grammar: SpellCheck,
  vocabulary: BookOpen,
  coherence: Link,
  score_suggestion: Star,
  general: MessageCircle,
};

const SEVERITY_STYLES: Record<
  Severity,
  { variant: "destructive" | "outline" | "secondary"; className?: string }
> = {
  error: { variant: "destructive" },
  warning: { variant: "outline", className: "border-amber-400 text-amber-600" },
  suggestion: { variant: "secondary" },
};

const HIGHLIGHT_RING: Record<Severity, string> = {
  error: "ring-2 ring-red-500",
  warning: "ring-2 ring-amber-500",
  suggestion: "ring-2 ring-primary",
};

interface FeedbackItemCardProps {
  item: FeedbackItem;
  anchorStatus?: AnchorStatus;
  isHighlighted?: boolean;
  onHighlight?: (id: string | null, debounce?: boolean) => void;
  onScrollTo?: (id: string) => void;
  onApprove?: (itemId: string, isApproved: boolean) => void;
  onOverrideText?: (itemId: string, text: string | null) => void;
  isFinalized?: boolean;
}

function FeedbackItemCardInner({
  item,
  anchorStatus = "no-anchor",
  isHighlighted = false,
  onHighlight,
  onScrollTo,
  onApprove,
  onOverrideText,
  isFinalized = false,
}: FeedbackItemCardProps) {
  const { t } = useTranslation("grading");
  const Icon = TYPE_ICONS[item.type] ?? MessageCircle;
  const severityStyle = item.severity
    ? SEVERITY_STYLES[item.severity]
    : SEVERITY_STYLES.suggestion;

  const severity = (item.severity ?? "suggestion") as Severity;
  const hasAnchor = anchorStatus === "valid" || anchorStatus === "drifted";
  const isOrphaned = anchorStatus === "orphaned";
  const suppressMouseRef = useRef(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleMouseEnter = useCallback(() => {
    if (suppressMouseRef.current) return;
    if (hasAnchor && onHighlight) onHighlight(item.id, true);
  }, [hasAnchor, onHighlight, item.id]);

  const handleMouseLeave = useCallback(() => {
    if (suppressMouseRef.current) return;
    if (hasAnchor && onHighlight) onHighlight(null, true);
  }, [hasAnchor, onHighlight]);

  const handleFocus = useCallback(() => {
    if (hasAnchor && onHighlight) onHighlight(item.id, false);
  }, [hasAnchor, onHighlight, item.id]);

  const handleBlur = useCallback(() => {
    if (hasAnchor && onHighlight) onHighlight(null, false);
  }, [hasAnchor, onHighlight]);

  const handleClick = useCallback(() => {
    if (suppressMouseRef.current) return;
    if (hasAnchor && onScrollTo) onScrollTo(item.id);
  }, [hasAnchor, onScrollTo, item.id]);

  const handleTouchStart = useCallback(
    () => {
      if (!hasAnchor) return;
      if (onScrollTo) {
        onScrollTo(item.id);
      }
      suppressMouseRef.current = true;
      setTimeout(() => { suppressMouseRef.current = false; }, 400);
    },
    [hasAnchor, onScrollTo, item.id],
  );

  const handleApprove = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    onApprove?.(item.id, true);
  }, [onApprove, item.id]);

  const handleReject = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    onApprove?.(item.id, false);
  }, [onApprove, item.id]);

  const handleStartEdit = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditText(item.teacherOverrideText ?? item.content);
    setIsEditing(true);
  }, [item.teacherOverrideText, item.content]);

  const handleSaveEdit = useCallback(() => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== item.content) {
      onOverrideText?.(item.id, trimmed);
    } else if (!trimmed || trimmed === item.content) {
      onOverrideText?.(item.id, null);
    }
    setIsEditing(false);
  }, [editText, item.content, item.id, onOverrideText]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSaveEdit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancelEdit();
      }
    },
    [handleSaveEdit, handleCancelEdit],
  );

  // Keyboard shortcuts on card
  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isFinalized) return;
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "textarea" || tag === "input" || document.activeElement?.getAttribute("contenteditable")) return;
      if (item.type === "score_suggestion") return;

      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        onApprove?.(item.id, true);
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        onApprove?.(item.id, false);
      }
    },
    [isFinalized, item.type, item.id, onApprove],
  );

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  // Build aria-label
  const confidenceStr =
    item.confidence != null ? `, confidence ${Math.round(item.confidence * 100)}%` : "";
  const anchorStr = isOrphaned
    ? ", anchor lost"
    : hasAnchor
      ? ", anchored to text"
      : "";
  const approvalStr = item.isApproved === true ? ", approved" : item.isApproved === false ? ", rejected" : "";
  const ariaLabel = `${item.type.replace("_", " ")} ${severity}: ${item.content}${confidenceStr}${anchorStr}${approvalStr}`;

  const highlightRing = isHighlighted ? HIGHLIGHT_RING[severity] : "";
  const orphanedOpacity = isOrphaned ? "opacity-75" : "";

  // Approval state styling
  const approvalBorder =
    item.isApproved === true
      ? "border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-950/20"
      : item.isApproved === false
        ? "opacity-50 border-l-4 border-l-red-300"
        : "border-l-2 border-l-muted-foreground/20";

  const showApprovalButtons = !isFinalized && item.type !== "score_suggestion" && onApprove;

  return (
    <Card
      className={`transition-shadow duration-150 ${approvalBorder} ${highlightRing} ${orphanedOpacity} ${hasAnchor ? "cursor-pointer" : ""}`}
      data-card-id={item.id}
      tabIndex={0}
      aria-label={ariaLabel}
      aria-details={hasAnchor ? `anchor-${item.id}` : undefined}
      title={hasAnchor ? t("feedbackItem.clickToScroll") : undefined}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onTouchStart={handleTouchStart}
      onKeyDown={handleCardKeyDown}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="relative mt-0.5 shrink-0">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <AnchorStatusIndicator anchorStatus={anchorStatus} variant="dot" />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            {item.teacherOverrideText && !isEditing ? (
              <>
                <p className="text-xs text-muted-foreground line-through">
                  {item.content}
                </p>
                <p className="text-sm leading-relaxed">{item.teacherOverrideText}</p>
                <Badge variant="secondary" className="text-xs">{t("feedbackItem.edited")}</Badge>
              </>
            ) : (
              <p className={`text-sm leading-relaxed ${item.isApproved === false ? "line-through" : ""}`}>
                {item.content}
              </p>
            )}

            {item.suggestedFix && item.originalContextSnippet && (
              <p className="text-xs text-muted-foreground">
                <del className="text-destructive/70">
                  {item.originalContextSnippet}
                </del>
                {" → "}
                <ins className="text-green-600 no-underline font-medium">
                  {item.suggestedFix}
                </ins>
              </p>
            )}

            {/* Override text editor */}
            {isEditing && (
              <div className="space-y-1" role="presentation" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <Textarea
                  ref={textareaRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  onBlur={handleSaveEdit}
                  rows={2}
                  maxLength={2000}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {t("feedbackItem.editHelper")}
                </p>
              </div>
            )}

            {/* Edit button for approved items */}
            {item.isApproved === true && !isEditing && !isFinalized && onOverrideText && (
              <Button variant="ghost" size="sm" onClick={handleStartEdit} className="h-6 px-2 text-xs">
                {t("feedbackItem.edit")}
              </Button>
            )}

            <div className="flex items-center gap-2">
              {item.severity && (
                <Badge
                  variant={severityStyle.variant}
                  className={severityStyle.className}
                >
                  {item.severity}
                </Badge>
              )}
              {item.confidence != null && (
                <span className="text-xs text-muted-foreground">
                  {Math.round(item.confidence * 100)}%
                </span>
              )}

              {/* Approve/Reject buttons */}
              {showApprovalButtons && (
                <div className="flex items-center gap-1 ml-auto">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 ${
                      item.isApproved === true
                        ? "bg-green-100 text-green-700"
                        : "text-green-600 hover:bg-green-100 hover:text-green-700"
                    }`}
                    onClick={handleApprove}
                    aria-label={t("feedbackItem.approve")}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 ${
                      item.isApproved === false
                        ? "bg-red-100 text-red-600"
                        : "text-red-500 hover:bg-red-100 hover:text-red-600"
                    }`}
                    onClick={handleReject}
                    aria-label={t("feedbackItem.reject")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <AnchorStatusIndicator anchorStatus={anchorStatus} variant="label" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const FeedbackItemCard = React.memo(FeedbackItemCardInner);
