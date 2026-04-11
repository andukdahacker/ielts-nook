import { Button } from "@workspace/ui/components/button";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface SubmissionNavProps {
  currentIndex: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onBackToQueue?: () => void;
}

export function SubmissionNav({
  currentIndex,
  total,
  onPrev,
  onNext,
  onBackToQueue,
}: SubmissionNavProps) {
  const { t } = useTranslation("grading");
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < total - 1;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "ArrowLeft" && hasPrev) {
        onPrev();
      } else if (e.key === "ArrowRight" && hasNext) {
        onNext();
      }
    },
    [hasPrev, hasNext, onPrev, onNext],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex items-center justify-between border-b px-4 py-2">
      <div className="flex items-center gap-1">
        {onBackToQueue && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToQueue}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t("submissionNav.queue")}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrev}
          disabled={!hasPrev}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          {t("submissionNav.prev")}
        </Button>
      </div>
      <span className="text-sm text-muted-foreground">
        {total > 0 ? t("submissionNav.submissions", { current: currentIndex + 1, total }) : t("submissionNav.noSubmissions")}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onNext}
        disabled={!hasNext}
      >
        {t("submissionNav.next")}
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}
