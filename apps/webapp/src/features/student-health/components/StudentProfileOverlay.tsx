import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@workspace/ui/components/sheet";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Button } from "@workspace/ui/components/button";
import { TrafficLightBadge } from "./TrafficLightBadge";
import { InterventionComposeModal } from "./InterventionComposeModal";
import { InterventionHistoryTab } from "./InterventionHistoryTab";
import { FlagStudentModal } from "./FlagStudentModal";
import { StudentFlagsSection } from "./StudentFlagsSection";
import { useStudentProfile } from "../hooks/use-student-profile";
import { useStudentFlags } from "../hooks/use-student-flags";
import { useAuth } from "@/features/auth/auth-context";
import { useState } from "react";
import { Flag } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { HealthStatus } from "@workspace/types";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const DOT_COLORS: Record<HealthStatus, string> = {
  "at-risk": "bg-red-500",
  warning: "bg-amber-500",
  "on-track": "bg-emerald-500",
};

const ATTENDANCE_STATUS_STYLES: Record<
  string,
  string
> = {
  PRESENT: "bg-emerald-100 text-emerald-800",
  LATE: "bg-amber-100 text-amber-800",
  EXCUSED: "bg-blue-100 text-blue-800",
  ABSENT: "bg-red-100 text-red-800",
};

const SUBMISSION_STATUS_STYLES: Record<
  string,
  { className: string; labelKey: string }
> = {
  "not-submitted": {
    className: "bg-gray-100 text-gray-800",
    labelKey: "submission.notSubmitted",
  },
  "in-progress": {
    className: "bg-blue-100 text-blue-800",
    labelKey: "submission.inProgress",
  },
  submitted: {
    className: "bg-amber-100 text-amber-800",
    labelKey: "submission.submitted",
  },
  graded: {
    className: "bg-emerald-100 text-emerald-800",
    labelKey: "submission.graded",
  },
};

interface StudentProfileOverlayProps {
  studentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudentProfileOverlay({
  studentId,
  open,
  onOpenChange,
}: StudentProfileOverlayProps) {
  const { t } = useTranslation("student-health");
  const { profile, isLoading, isError, refetch } = useStudentProfile(
    open ? studentId : null,
  );
  const { user } = useAuth();
  const [composeOpen, setComposeOpen] = useState(false);
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const userRole = user?.role;
  const isTeacher = userRole === "TEACHER";
  const isAdminOrOwner = userRole === "OWNER" || userRole === "ADMIN";
  const { flags } = useStudentFlags(open ? studentId : null);
  const openFlagCount = flags.filter((f) => f.status === "OPEN").length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col">
        {isLoading ? (
          <LoadingSkeleton />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : profile ? (
          <>
            <SheetHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={profile.student.avatarUrl ?? undefined}
                      alt={profile.student.name ?? t("student.defaultAlt")}
                    />
                    <AvatarFallback>
                      {getInitials(profile.student.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="text-lg">
                      {profile.student.name ?? t("student.unknown")}
                    </SheetTitle>
                    <SheetDescription>
                      {profile.student.email ?? ""}
                    </SheetDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdminOrOwner && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setComposeOpen(true)}
                    >
                      {t("profile.contactParent")}
                    </Button>
                  )}
                  {isTeacher && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFlagModalOpen(true)}
                    >
                      <Flag className="h-4 w-4 mr-1" />
                      {t("profile.flagStudent")}
                    </Button>
                  )}
                  {isAdminOrOwner && openFlagCount > 0 && (
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500" title={t("profile.openFlagsTitle", { count: openFlagCount })} />
                  )}
                  <TrafficLightBadge
                    status={profile.student.healthStatus}
                    size="md"
                  />
                </div>
              </div>
              {profile.student.classes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {profile.student.classes.map((cls) => (
                    <Badge key={cls.id} variant="secondary">
                      {cls.name}
                    </Badge>
                  ))}
                </div>
              )}
            </SheetHeader>

            <ScrollArea className="flex-1">
              <div className="space-y-6 pr-4">
                {/* Metrics summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground mb-1">
                      {t("profile.attendanceLabel")}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-2xl font-bold">
                        {profile.student.metrics.attendanceRate}%
                      </span>
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${DOT_COLORS[profile.student.metrics.attendanceStatus]}`}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("profile.attendanceSessions", {
                        attended: profile.student.metrics.attendedSessions,
                        total: profile.student.metrics.totalSessions,
                      })}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground mb-1">
                      {t("profile.assignmentsLabel")}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-2xl font-bold">
                        {profile.student.metrics.assignmentCompletionRate}%
                      </span>
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${DOT_COLORS[profile.student.metrics.assignmentStatus]}`}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("profile.assignmentsCompleted", {
                        completed: profile.student.metrics.completedAssignments,
                        total: profile.student.metrics.totalAssignments,
                      })}
                    </p>
                    {profile.student.metrics.overdueAssignments > 0 && (
                      <p className="text-red-600 text-sm">
                        {t("profile.overdueAssignments", {
                          count: profile.student.metrics.overdueAssignments,
                        })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Root Cause Alert */}
                <RootCauseAlert
                  healthStatus={profile.student.healthStatus}
                  attendanceStatus={profile.student.metrics.attendanceStatus}
                  attendanceRate={profile.student.metrics.attendanceRate}
                  assignmentStatus={profile.student.metrics.assignmentStatus}
                  completionRate={
                    profile.student.metrics.assignmentCompletionRate
                  }
                />

                {/* Flags section for admin (above tabs when open flags exist) */}
                {isAdminOrOwner && openFlagCount > 0 && studentId && (
                  <StudentFlagsSection studentId={studentId} isAdmin />
                )}

                {/* Flags section for teacher (read-only, open flags only) */}
                {isTeacher && openFlagCount > 0 && studentId && (
                  <StudentFlagsSection studentId={studentId} />
                )}

                {/* Tabs */}
                <Tabs defaultValue="trends">
                  <TabsList className="w-full">
                    <TabsTrigger value="trends" className="flex-1">
                      {t("profile.tabTrends")}
                    </TabsTrigger>
                    <TabsTrigger value="attendance" className="flex-1">
                      {t("profile.tabAttendance")}
                    </TabsTrigger>
                    <TabsTrigger value="assignments" className="flex-1">
                      {t("profile.tabAssignments")}
                    </TabsTrigger>
                    {!isTeacher && (
                      <TabsTrigger value="interventions" className="flex-1">
                        {t("profile.tabInterventions")}
                      </TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="trends" className="mt-4">
                    <TrendsTab trends={profile.weeklyTrends} />
                  </TabsContent>

                  <TabsContent value="attendance" className="mt-4">
                    <AttendanceTab history={profile.attendanceHistory} />
                  </TabsContent>

                  <TabsContent value="assignments" className="mt-4">
                    <AssignmentsTab history={profile.assignmentHistory} />
                  </TabsContent>

                  {!isTeacher && (
                    <TabsContent value="interventions" className="mt-4">
                      <InterventionHistoryTab studentId={profile.student.id} />
                    </TabsContent>
                  )}
                </Tabs>
              </div>
            </ScrollArea>

            {studentId && isAdminOrOwner && (
              <InterventionComposeModal
                studentId={studentId}
                open={composeOpen}
                onOpenChange={setComposeOpen}
              />
            )}
            {studentId && isTeacher && (
              <FlagStudentModal
                studentId={studentId}
                open={flagModalOpen}
                onOpenChange={setFlagModalOpen}
              />
            )}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function RootCauseAlert({
  healthStatus,
  attendanceStatus,
  attendanceRate,
  assignmentStatus,
  completionRate,
}: {
  healthStatus: HealthStatus;
  attendanceStatus: HealthStatus;
  attendanceRate: number;
  assignmentStatus: HealthStatus;
  completionRate: number;
}) {
  const { t } = useTranslation("student-health");
  if (healthStatus === "on-track") return null;

  const isAtRisk = healthStatus === "at-risk";
  const bgClass = isAtRisk
    ? "bg-red-50 border-red-200 text-red-800"
    : "bg-amber-50 border-amber-200 text-amber-800";

  const reasons: string[] = [];
  if (attendanceStatus !== "on-track") {
    reasons.push(
      t("profile.rootCauseAttendance", {
        threshold: attendanceStatus === "at-risk" ? "80" : "90",
        rate: attendanceRate,
      }),
    );
  }
  if (assignmentStatus !== "on-track") {
    reasons.push(
      t("profile.rootCauseAssignment", {
        threshold: assignmentStatus === "at-risk" ? "50" : "75",
        rate: completionRate,
      }),
    );
  }

  return (
    <div className={`rounded-lg border p-3 ${bgClass}`} role="alert">
      <p className="font-medium mb-1">
        {isAtRisk ? t("profile.rootCauseAtRisk") : t("profile.rootCauseWarning")}
        {t("profile.rootCauseLabel")}
      </p>
      <ul className="text-sm space-y-1">
        {reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </div>
  );
}

function TrendsTab({
  trends,
}: {
  trends: Array<{
    weekStart: string;
    weekLabel: string;
    attendanceRate: number;
    completionRate: number;
  }>;
}) {
  const { t } = useTranslation("student-health");
  if (trends.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        {t("profile.noTrends")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-blue-500" />
          {t("profile.trendAttendance")}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-emerald-500" />
          {t("profile.trendAssignments")}
        </span>
      </div>
      {trends.map((week) => (
        <div key={week.weekStart} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-14 shrink-0">
            {week.weekLabel}
          </span>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-1">
              <div className="flex-1 h-3 bg-muted rounded-sm overflow-hidden">
                <div
                  className="h-full rounded-sm bg-blue-500"
                  style={{ width: `${week.attendanceRate}%` }}
                />
              </div>
              <span className="text-xs w-10 text-right">
                {week.attendanceRate}%
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex-1 h-3 bg-muted rounded-sm overflow-hidden">
                <div
                  className="h-full rounded-sm bg-emerald-500"
                  style={{ width: `${week.completionRate}%` }}
                />
              </div>
              <span className="text-xs w-10 text-right">
                {week.completionRate}%
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AttendanceTab({
  history,
}: {
  history: Array<{
    sessionId: string;
    className: string;
    date: string;
    status: string;
  }>;
}) {
  const { t } = useTranslation("student-health");
  if (history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        {t("profile.noAttendance")}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {history.map((record) => (
        <div
          key={record.sessionId}
          className="flex items-center justify-between py-2 border-b last:border-0"
        >
          <div>
            <p className="text-sm font-medium">{record.className}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(record.date).toLocaleDateString()}
            </p>
          </div>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded ${ATTENDANCE_STATUS_STYLES[record.status] ?? ""}`}
          >
            {record.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function AssignmentsTab({
  history,
}: {
  history: Array<{
    assignmentId: string;
    exerciseTitle: string;
    className: string;
    skill: string | null;
    dueDate: string;
    submissionStatus: string;
    score: number | null;
    submittedAt: string | null;
  }>;
}) {
  const { t } = useTranslation("student-health");
  if (history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        {t("profile.noAssignments")}
      </p>
    );
  }

  const now = new Date();

  return (
    <div className="space-y-3">
      {history.map((assignment) => {
        const mapped = SUBMISSION_STATUS_STYLES[assignment.submissionStatus];
        const statusStyle = {
          className: mapped?.className ?? "",
          label: mapped ? t(mapped.labelKey) : assignment.submissionStatus,
        };
        const isOverdue =
          assignment.dueDate &&
          new Date(assignment.dueDate) < now &&
          assignment.submissionStatus === "not-submitted";

        return (
          <div
            key={assignment.assignmentId}
            className="py-2 border-b last:border-0"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {assignment.exerciseTitle}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">
                    {assignment.className}
                  </span>
                  {assignment.skill && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      {assignment.skill}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("profile.assignmentDue", {
                    date: new Date(assignment.dueDate).toLocaleDateString(),
                  })}
                </p>
                {isOverdue && (
                  <p className="text-red-600 text-xs">
                    {t("profile.assignmentOverdue")}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 ml-2">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded ${statusStyle.className}`}
                >
                  {statusStyle.label}
                </span>
                {assignment.score !== null && (
                  <span className="font-bold text-sm">{assignment.score}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-full" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation("student-health");
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <SheetHeader>
        <SheetTitle>{t("profile.errorTitle")}</SheetTitle>
      </SheetHeader>
      <p className="text-muted-foreground mb-4">
        {t("profile.errorMessage")}
      </p>
      <Button onClick={onRetry}>{t("button.retry", { ns: "common" })}</Button>
    </div>
  );
}
