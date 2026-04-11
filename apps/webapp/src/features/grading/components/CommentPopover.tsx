import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Textarea } from "@workspace/ui/components/textarea";
import { Eye, EyeOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CommentVisibility } from "@workspace/types";

interface CommentPopoverProps {
  position: { x: number; y: number };
  onSubmit: (content: string, visibility: CommentVisibility) => void;
  onCancel: () => void;
  selectedText: string;
}

export function CommentPopover({
  position,
  onSubmit,
  onCancel,
  selectedText,
}: CommentPopoverProps) {
  const { t } = useTranslation("grading");
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<CommentVisibility>("student_facing");
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed) return;
    onSubmit(trimmed, visibility);
  }, [content, visibility, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    },
    [handleSubmit, onCancel],
  );

  // Click outside to cancel
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onCancel();
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [onCancel]);

  const truncatedText =
    selectedText.length > 100
      ? selectedText.slice(0, 100) + "..."
      : selectedText;

  const isPrivate = visibility === "private";

  return (
    <div
      ref={containerRef}
      className="absolute z-20"
      style={{ left: position.x, top: position.y }}
    >
      <Card className="w-72 shadow-lg">
        <CardContent className="p-3 space-y-2">
          {/* Selected text preview */}
          <blockquote className="border-l-2 border-muted-foreground/30 pl-2 text-xs italic text-muted-foreground line-clamp-2">
            {truncatedText}
          </blockquote>

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("commentPopover.placeholder")}
            maxLength={5000}
            rows={3}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />

          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() =>
                setVisibility(isPrivate ? "student_facing" : "private")
              }
              title={
                isPrivate
                  ? t("commentPopover.privateTitle")
                  : t("commentPopover.visibleTitle")
              }
              aria-label={
                isPrivate ? t("commentPopover.privateAriaLabel") : t("commentPopover.visibleAriaLabel")
              }
            >
              {isPrivate ? (
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>

            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!content.trim()}
              >
                {t("commentPopover.comment")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
