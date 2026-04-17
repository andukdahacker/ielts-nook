import type { ClassSession } from "@workspace/types";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { cn } from "@workspace/ui/lib/utils";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";

interface SessionBlockProps {
  session: ClassSession;
  onClick?: () => void;
  isDragging?: boolean;
  className?: string;
  hasConflicts?: boolean;
  onConflictClick?: () => void;
}

export function SessionBlock({
  session,
  onClick,
  isDragging,
  className,
  hasConflicts,
  onConflictClick,
}: SessionBlockProps) {
  const { t } = useTranslation("logistics");
  const startTime = new Date(session.startTime);
  const endTime = new Date(session.endTime);
  const isCancelled = session.status === "CANCELLED";

  // Get course color from nested class->course relation
  const courseColor = session.class?.course?.color ?? "#2563EB";
  const courseName = session.class?.course?.name ?? t("sessionBlock.courseFallback");
  const className_ = session.class?.name ?? t("sessionBlock.classFallback");

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "relative cursor-pointer rounded-md px-2 py-1 text-xs transition-all",
        "border-l-4 shadow-sm hover:shadow-md",
        isDragging && "opacity-50 shadow-lg",
        isCancelled && "opacity-50",
        className
      )}
      style={{
        backgroundColor: `${courseColor}15`,
        borderLeftColor: courseColor,
      }}
    >
      {/* Conflict indicator icon */}
      {hasConflicts && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onConflictClick?.();
          }}
          className="absolute -top-1 -right-1 p-0.5 bg-amber-100 rounded-full hover:bg-amber-200 transition-colors"
          aria-label={t("sessionBlock.viewConflictsAria")}
        >
          <AlertTriangle className="size-3 text-amber-600" />
        </button>
      )}
      <div className={cn("font-medium truncate", isCancelled && "line-through")} style={{ color: courseColor }}>
        {courseName}
      </div>
      <div className="text-muted-foreground truncate text-[10px]">
        {className_}
      </div>
      <div className="text-muted-foreground text-[10px]">
        {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
      </div>
      {session.roomName && (
        <div className="text-muted-foreground truncate text-[10px]">
          {session.roomName}
        </div>
      )}
      {isCancelled && (
        <Badge variant="secondary" className="mt-0.5 bg-red-100 text-red-800 text-[9px] px-1 py-0">
          {t("sessionBlock.cancelled")}
        </Badge>
      )}
    </div>
  );
}
