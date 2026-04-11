import { Progress } from "@workspace/ui/components/progress";
import { useTranslation } from "react-i18next";

interface QueueProgressBarProps {
  progress: { graded: number; total: number } | null;
  assignmentTitle: string | null;
}

export function QueueProgressBar({
  progress,
  assignmentTitle,
}: QueueProgressBarProps) {
  const { t } = useTranslation("grading");

  if (!progress) return null;

  const percentage =
    progress.total > 0
      ? Math.round((progress.graded / progress.total) * 100)
      : 0;
  const isComplete = progress.graded === progress.total && progress.total > 0;

  return (
    <div className="bg-muted/20 flex items-center gap-3 border-b px-4 py-2">
      <span className="text-sm whitespace-nowrap">
        {progress.graded} {t("queueProgress.graded", { total: progress.total })}
        {assignmentTitle && (
          <span className="text-muted-foreground"> — {assignmentTitle}</span>
        )}
      </span>
      <Progress
        value={percentage}
        className={`max-w-48 ${isComplete ? "[&>div]:bg-green-500" : ""}`}
      />
      <span
        className={`text-sm ${isComplete ? "font-medium text-green-600" : "text-muted-foreground"}`}
      >
        {isComplete ? t("queueProgress.complete") : `${percentage}%`}
      </span>
    </div>
  );
}
