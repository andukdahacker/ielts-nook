import { memo } from "react";
import type { StudentHealthCard as StudentHealthCardType } from "@workspace/types";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Flag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TrafficLightBadge } from "./TrafficLightBadge";

const BORDER_COLORS = {
  "at-risk": "border-l-red-500",
  warning: "border-l-amber-500",
  "on-track": "border-l-emerald-500",
} as const;

const DOT_COLORS = {
  "at-risk": "bg-red-500",
  warning: "bg-amber-500",
  "on-track": "bg-emerald-500",
} as const;

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const MAX_VISIBLE_CLASSES = 3;

interface StudentHealthCardProps {
  student: StudentHealthCardType;
  onClick?: () => void;
}

export const StudentHealthCardComponent = memo(function StudentHealthCard({
  student,
  onClick,
}: StudentHealthCardProps) {
  const { t } = useTranslation("student-health");
  const visibleClasses = student.classes.slice(0, MAX_VISIBLE_CLASSES);
  const overflowCount = student.classes.length - MAX_VISIBLE_CLASSES;

  return (
    <Card
      className={`border-l-4 ${BORDER_COLORS[student.healthStatus]} cursor-pointer hover:shadow-md transition-shadow`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && onClick) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <CardContent className="pt-6">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage
                src={student.avatarUrl ?? undefined}
                alt={student.name ?? t("student.defaultAlt")}
              />
              <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
            </Avatar>
            <span className="font-semibold">{student.name ?? t("student.unknown")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {student.hasOpenFlags && (
              <Flag className="h-4 w-4 text-orange-500" aria-label={t("card.hasFlags")} />
            )}
            <TrafficLightBadge status={student.healthStatus} />
          </div>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{t("card.attendance")}</p>
            <div className="flex items-center gap-1.5">
              <span className="font-medium">
                {student.metrics.attendanceRate}%
              </span>
              <span
                className={`w-2 h-2 rounded-full ${DOT_COLORS[student.metrics.attendanceStatus]}`}
              />
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">{t("card.assignments")}</p>
            <div className="flex items-center gap-1.5">
              <span className="font-medium">
                {student.metrics.completedAssignments}/
                {student.metrics.totalAssignments}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${DOT_COLORS[student.metrics.assignmentStatus]}`}
              />
            </div>
          </div>
        </div>

        {/* Class badges */}
        {student.classes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {visibleClasses.map((cls) => (
              <Badge key={cls.id} variant="secondary">
                {cls.name}
              </Badge>
            ))}
            {overflowCount > 0 && (
              <Badge variant="outline">{t("card.moreClasses", { count: overflowCount })}</Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
