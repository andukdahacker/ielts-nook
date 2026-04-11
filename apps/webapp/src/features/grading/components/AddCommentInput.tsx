import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { Eye, EyeOff, MessageSquare } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CommentVisibility } from "@workspace/types";

interface AddCommentInputProps {
  onSubmit: (content: string, visibility: CommentVisibility) => void;
  isSubmitting: boolean;
}

export function AddCommentInput({ onSubmit, isSubmitting }: AddCommentInputProps) {
  const { t } = useTranslation("grading");
  const [isExpanded, setIsExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<CommentVisibility>("student_facing");

  const handleSubmit = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed) return;
    onSubmit(trimmed, visibility);
    setContent("");
    setIsExpanded(false);
  }, [content, visibility, onSubmit]);

  const handleCancel = useCallback(() => {
    setContent("");
    setIsExpanded(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === "Escape") {
        handleCancel();
      }
    },
    [handleSubmit, handleCancel],
  );

  const isPrivate = visibility === "private";

  if (!isExpanded) {
    return (
      <button
        className="flex w-full items-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(true)}
      >
        <MessageSquare className="h-4 w-4" />
        {t("addComment.addComment")}
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t("addComment.placeholder")}
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
              ? t("addComment.privateTitle")
              : t("addComment.visibleTitle")
          }
          aria-label={isPrivate ? t("addComment.privateAriaLabel") : t("addComment.visibleAriaLabel")}
        >
          {isPrivate ? (
            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </Button>

        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
          >
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}
