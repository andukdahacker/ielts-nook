import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSessionAttendance, useMarkAttendance } from "../hooks/use-attendance";
import { ToggleGroup, ToggleGroupItem } from "@workspace/ui/components/toggle-group";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { ClipboardList } from "lucide-react";
import { format } from "date-fns";
import type { AttendanceStatus, StudentWithAttendance } from "@workspace/types";
import { cn } from "@workspace/ui/lib/utils";

interface AttendanceSheetProps {
  sessionId: string;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function StatusToggle({
  student,
  onStatusChange,
  disabled,
}: {
  student: StudentWithAttendance;
  onStatusChange: (status: AttendanceStatus) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation("logistics");
  const groupRef = useRef<HTMLDivElement>(null);
  const currentStatus = student.attendance?.status ?? "";

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const statuses: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];
      const currentIndex = currentStatus ? statuses.indexOf(currentStatus as AttendanceStatus) : -1;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % statuses.length;
        onStatusChange(statuses[nextIndex]);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        const prevIndex = currentIndex <= 0 ? statuses.length - 1 : currentIndex - 1;
        onStatusChange(statuses[prevIndex]);
      }
    },
    [currentStatus, onStatusChange]
  );

  return (
    <ToggleGroup
      ref={groupRef}
      type="single"
      value={currentStatus}
      onValueChange={(value) => value && onStatusChange(value as AttendanceStatus)}
      className="gap-1"
      disabled={disabled}
      onKeyDown={handleKeyDown}
      aria-label={t("attendance.statusForStudent", { name: student.name ?? "" })}
    >
      <ToggleGroupItem
        value="PRESENT"
        className={cn(
          "h-11 w-11 text-sm font-medium",
          "data-[state=on]:bg-green-100 data-[state=on]:text-green-800 data-[state=on]:border-green-300",
          "focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
        )}
        aria-label={t("attendance.markAsPresent")}
      >
        P
      </ToggleGroupItem>
      <ToggleGroupItem
        value="ABSENT"
        className={cn(
          "h-11 w-11 text-sm font-medium",
          "data-[state=on]:bg-red-100 data-[state=on]:text-red-800 data-[state=on]:border-red-300",
          "focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
        )}
        aria-label={t("attendance.markAsAbsent")}
      >
        A
      </ToggleGroupItem>
      <ToggleGroupItem
        value="LATE"
        className={cn(
          "h-11 w-11 text-sm font-medium",
          "data-[state=on]:bg-amber-100 data-[state=on]:text-amber-800 data-[state=on]:border-amber-300",
          "focus:ring-2 focus:ring-amber-500 focus:ring-offset-1"
        )}
        aria-label={t("attendance.markAsLate")}
      >
        L
      </ToggleGroupItem>
      <ToggleGroupItem
        value="EXCUSED"
        className={cn(
          "h-11 w-11 text-sm font-medium",
          "data-[state=on]:bg-blue-100 data-[state=on]:text-blue-800 data-[state=on]:border-blue-300",
          "focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        )}
        aria-label={t("attendance.markAsExcused")}
      >
        E
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

function AttendanceSheetSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="flex gap-1">
            <Skeleton className="h-11 w-11" />
            <Skeleton className="h-11 w-11" />
            <Skeleton className="h-11 w-11" />
            <Skeleton className="h-11 w-11" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <ClipboardList className="size-12 mb-4 text-muted-foreground" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

export function AttendanceSheet({ sessionId }: AttendanceSheetProps) {
  const { t } = useTranslation("logistics");
  const { data, isLoading, error } = useSessionAttendance(sessionId);
  const markAttendanceMutation = useMarkAttendance(sessionId);

  const handleStatusChange = useCallback(
    (studentId: string, status: AttendanceStatus) => {
      markAttendanceMutation.mutate({ studentId, status });
    },
    [markAttendanceMutation]
  );

  if (isLoading) {
    return <AttendanceSheetSkeleton />;
  }

  if (error) {
    return (
      <EmptyState message={t("attendance.error")} />
    );
  }

  if (!data) {
    return <EmptyState message={t("attendance.noData")} />;
  }

  const { session, students } = data;

  if (students.length === 0) {
    return <EmptyState message={t("attendance.noStudents")} />;
  }

  const startTime = new Date(session.startTime);
  const courseName = session.class.course.name;
  const className = session.class.name;
  const courseColor = session.class.course.color ?? "#2563EB";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div
        className="rounded-lg p-4 -mx-2"
        style={{ backgroundColor: `${courseColor}15` }}
      >
        <h3 className="font-semibold text-lg" style={{ color: courseColor }}>
          {t("attendance.title")}: {courseName} - {className}
        </h3>
        <p className="text-sm text-muted-foreground">
          {format(startTime, "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Student List */}
      <div className="divide-y">
        {/* Sticky header */}
        <div className="flex items-center justify-between py-2 bg-background sticky top-0 z-10 border-b font-medium text-sm text-muted-foreground">
          <span>{t("attendance.headerStudent")}</span>
          <span className="pr-2">{t("attendance.headerStatus")}</span>
        </div>

        {/* Student rows */}
        {students.map((student) => (
          <div
            key={student.id}
            className="flex items-center justify-between py-3"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src={student.image ?? undefined} alt={student.name ?? ""} />
                <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{student.name ?? t("attendance.unknown")}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {student.email ?? t("attendance.noEmail")}
                </p>
              </div>
            </div>

            <StatusToggle
              student={student}
              onStatusChange={(status) => handleStatusChange(student.id, status)}
              disabled={markAttendanceMutation.isPending}
            />
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t">
        <div className="flex items-center gap-1">
          <span className="inline-block w-6 h-6 rounded bg-green-100 text-green-800 text-center leading-6 font-medium">P</span>
          <span>{t("attendance.present")}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-6 h-6 rounded bg-red-100 text-red-800 text-center leading-6 font-medium">A</span>
          <span>{t("attendance.absent")}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-6 h-6 rounded bg-amber-100 text-amber-800 text-center leading-6 font-medium">L</span>
          <span>{t("attendance.late")}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-6 h-6 rounded bg-blue-100 text-blue-800 text-center leading-6 font-medium">E</span>
          <span>{t("attendance.excused")}</span>
        </div>
      </div>
    </div>
  );
}
