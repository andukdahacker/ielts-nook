import { memo } from "react";
import { Link, useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { CircleCheck, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTeacherAtRiskWidget } from "../hooks/use-teacher-at-risk-widget";
import { TrafficLightBadge } from "./TrafficLightBadge";
import type { StudentHealthCard } from "@workspace/types";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const MiniStudentCard = memo(function MiniStudentCard({
  student,
}: {
  student: StudentHealthCard;
}) {
  const { t } = useTranslation("student-health");
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Avatar className="h-8 w-8">
        <AvatarImage
          src={student.avatarUrl ?? undefined}
          alt={student.name ?? t("student.defaultAlt")}
        />
        <AvatarFallback className="text-xs">
          {getInitials(student.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {student.name ?? t("student.unknown")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("widget.attendance", { rate: student.metrics.attendanceRate })}
        </p>
      </div>
      <TrafficLightBadge status={student.healthStatus} />
    </div>
  );
});

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TeacherAtRiskWidget() {
  const { t } = useTranslation("student-health");
  const { widget, isLoading } = useTeacherAtRiskWidget();
  const { centerId } = useParams<{ centerId: string }>();

  const atRiskCount = widget?.summary.atRisk ?? 0;
  const warningCount = widget?.summary.warning ?? 0;
  const totalConcern = atRiskCount + warningCount;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          {t("widget.title")}
          {totalConcern > 0 && (
            <Badge variant="destructive" className="ml-1">
              {totalConcern}
            </Badge>
          )}
        </CardTitle>
        <Link
          to={`/${centerId}/dashboard/students`}
          className="text-sm text-primary hover:underline"
        >
          {t("widget.viewAll")}
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSkeleton />
        ) : !widget || widget.students.length === 0 ? (
          <div className="flex items-center gap-2 py-4 text-muted-foreground">
            <CircleCheck className="h-5 w-5 text-emerald-500" />
            <span>{t("widget.allOnTrack")}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {widget.students.map((student) => (
              <MiniStudentCard key={student.id} student={student} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
