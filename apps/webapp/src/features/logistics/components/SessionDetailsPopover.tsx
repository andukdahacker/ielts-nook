import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ClassSession } from "@workspace/types";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Calendar, Clock, MapPin, Users, User, Trash2, ClipboardList, Pencil, Ban } from "lucide-react";
import { RBACWrapper } from "@/features/auth/components/RBACWrapper";
import { useAuth } from "@/features/auth/auth-context";

type SessionWithDetails = ClassSession & {
  class?: {
    name: string;
    course?: { name: string; color?: string | null };
    teacher?: { id: string; name: string | null } | null;
    _count?: { students: number };
  };
};

interface SessionDetailsPopoverProps {
  session: SessionWithDetails;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onDelete?: (sessionId: string) => void;
  onCancel?: (sessionId: string) => void;
  onDeleteFuture?: (sessionId: string) => void;
  isDeleting?: boolean;
  isCancelling?: boolean;
  onMarkAttendance?: (session: SessionWithDetails) => void;
  onEdit?: (session: SessionWithDetails) => void;
}

export function SessionDetailsPopover({
  session,
  children,
  open,
  onOpenChange,
  onDelete,
  onCancel,
  onDeleteFuture,
  isDeleting,
  isCancelling,
  onMarkAttendance,
  onEdit,
}: SessionDetailsPopoverProps) {
  const { t } = useTranslation("logistics");
  const { user } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const startTime = new Date(session.startTime);
  const endTime = new Date(session.endTime);
  const courseColor = session.class?.course?.color ?? "#2563EB";
  const courseName = session.class?.course?.name ?? "Course";
  const className = session.class?.name ?? "Class";
  const teacherName = session.class?.teacher?.name ?? null;
  const studentCount = session.class?._count?.students ?? 0;
  const isRecurring = !!session.scheduleId;
  const isCancelled = session.status === "CANCELLED";

  // Teacher can edit/cancel only if assigned to this class
  const isAssignedTeacher = session.class?.teacher?.id === user?.id;

  // Calculate duration in minutes
  const durationMs = endTime.getTime() - startTime.getTime();
  const durationMins = Math.round(durationMs / (1000 * 60));
  const hours = Math.floor(durationMins / 60);
  const mins = durationMins % 60;
  const durationText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  const statusColors: Record<string, string> = {
    SCHEDULED: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
  };

  const statusLabels: Record<string, string> = {
    SCHEDULED: t("sessionDetails.statusScheduled"),
    COMPLETED: t("sessionDetails.statusCompleted"),
    CANCELLED: t("sessionDetails.statusCancelled"),
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    onDelete?.(session.id);
    setDeleteDialogOpen(false);
  };

  const handleDeleteAllFuture = () => {
    onDeleteFuture?.(session.id);
    setDeleteDialogOpen(false);
  };

  const handleCancelClick = () => {
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = () => {
    onCancel?.(session.id);
    setCancelDialogOpen(false);
    onOpenChange?.(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-3">
            {/* Header with course color */}
            <div
              className="rounded-md p-3 -mx-1 -mt-1"
              style={{ backgroundColor: `${courseColor}15` }}
            >
              <h4
                className="font-semibold text-lg"
                style={{ color: courseColor }}
              >
                {courseName}
              </h4>
              <p className="text-sm text-muted-foreground">{className}</p>
            </div>

            {/* Status badge */}
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={statusColors[session.status] ?? ""}
              >
                {statusLabels[session.status] ?? session.status}
              </Badge>
              {isRecurring && (
                <Badge variant="outline" className="text-xs">
                  {t("sessionDetails.recurring")}
                </Badge>
              )}
            </div>

            {/* Details */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="size-4" />
                <span>{format(startTime, "EEEE, MMMM d, yyyy")}</span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="size-4" />
                <span>
                  {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
                  <span className="ml-1 text-xs">({durationText})</span>
                </span>
              </div>

              {session.originalStartTime && (
                <div className="flex items-center gap-2 text-muted-foreground text-xs ml-6">
                  {t("sessionDetails.originalTime", {
                    date: format(new Date(session.originalStartTime), "EEE, MMM d"),
                    time: format(new Date(session.originalStartTime), "h:mm a"),
                  })}
                </div>
              )}

              {session.roomName && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-4" />
                  <span>{session.roomName}</span>
                </div>
              )}

              {teacherName && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="size-4" />
                  <span>{teacherName}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="size-4" />
                <span>{studentCount} {studentCount === 1 ? t("sessionBlock.student") : t("sessionBlock.students")}</span>
              </div>
            </div>

            {/* Cancelled status indicator */}
            {isCancelled && (
              <div className="pt-2 border-t">
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  {t("sessionBlock.cancelled")}
                </Badge>
              </div>
            )}

            {/* Actions — hidden for cancelled sessions */}
            {!isCancelled && (
              <div className="flex flex-col gap-2 pt-2 border-t">
                {/* Mark Attendance - Only for non-cancelled sessions */}
                {onMarkAttendance && (
                  <RBACWrapper requiredRoles={["OWNER", "ADMIN", "TEACHER"]}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        onMarkAttendance?.(session);
                        onOpenChange?.(false);
                      }}
                    >
                      <ClipboardList className="size-4 mr-1" />
                      {t("sessionDetails.markAttendance")}
                    </Button>
                  </RBACWrapper>
                )}

                {/* Edit - Owner/Admin + assigned Teacher */}
                {onEdit && (
                  <RBACWrapper requiredRoles={["OWNER", "ADMIN", "TEACHER"]}>
                    {(user?.role === "OWNER" || user?.role === "ADMIN" || isAssignedTeacher) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          onEdit(session);
                          onOpenChange?.(false);
                        }}
                      >
                        <Pencil className="size-4 mr-1" />
                        {t("button.edit", { ns: "common" })}
                      </Button>
                    )}
                  </RBACWrapper>
                )}

                {/* Cancel Session - Owner/Admin + assigned Teacher */}
                {onCancel && (
                  <RBACWrapper requiredRoles={["OWNER", "ADMIN", "TEACHER"]}>
                    {(user?.role === "OWNER" || user?.role === "ADMIN" || isAssignedTeacher) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        onClick={handleCancelClick}
                        disabled={isCancelling}
                      >
                        <Ban className="size-4 mr-1" />
                        {isCancelling ? t("sessionDetails.cancelling") : t("sessionDetails.cancelSession")}
                      </Button>
                    )}
                  </RBACWrapper>
                )}

                {/* Delete - Admin/Owner only */}
                <RBACWrapper requiredRoles={["OWNER", "ADMIN"]}>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={handleDeleteClick}
                    disabled={isDeleting}
                  >
                    <Trash2 className="size-4 mr-1" />
                    {isDeleting ? t("sessionDetails.deleting") : t("button.delete", { ns: "common" })}
                  </Button>
                </RBACWrapper>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isRecurring ? t("sessionDetails.deleteRecurringTitle") : t("sessionDetails.deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isRecurring
                ? t("sessionDetails.deleteRecurringDescription")
                : t("sessionDetails.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row">
            <AlertDialogCancel className="w-full sm:w-auto min-h-[44px]">{t("button.cancel", { ns: "common" })}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="w-full sm:w-auto min-h-[44px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRecurring ? t("sessionDetails.deleteThisOnly") : t("button.delete", { ns: "common" })}
            </AlertDialogAction>
            {isRecurring && onDeleteFuture && (
              <AlertDialogAction
                onClick={handleDeleteAllFuture}
                className="w-full sm:w-auto min-h-[44px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t("sessionDetails.deleteAllFuture")}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("sessionDetails.cancelTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("sessionDetails.cancelDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row">
            <AlertDialogCancel className="w-full sm:w-auto min-h-[44px]">{t("button.cancel", { ns: "common" })}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              className="w-full sm:w-auto min-h-[44px] bg-orange-600 text-white hover:bg-orange-700"
            >
              {t("sessionDetails.cancelConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
