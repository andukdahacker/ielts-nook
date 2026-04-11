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
import { Calendar, Clock, MapPin, Users, User, Trash2, ClipboardList, Pencil } from "lucide-react";
import { RBACWrapper } from "@/features/auth/components/RBACWrapper";

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
  onDeleteFuture?: (sessionId: string) => void;
  isDeleting?: boolean;
  onMarkAttendance?: (session: SessionWithDetails) => void;
  onEdit?: (session: SessionWithDetails) => void;
}

export function SessionDetailsPopover({
  session,
  children,
  open,
  onOpenChange,
  onDelete,
  onDeleteFuture,
  isDeleting,
  onMarkAttendance,
  onEdit,
}: SessionDetailsPopoverProps) {
  const { t } = useTranslation("logistics");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const startTime = new Date(session.startTime);
  const endTime = new Date(session.endTime);
  const courseColor = session.class?.course?.color ?? "#2563EB";
  const courseName = session.class?.course?.name ?? "Course";
  const className = session.class?.name ?? "Class";
  const teacherName = session.class?.teacher?.name ?? null;
  const studentCount = session.class?._count?.students ?? 0;
  const isRecurring = !!session.scheduleId;

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

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2 border-t">
              {/* Mark Attendance - Only for non-cancelled sessions */}
              {session.status !== "CANCELLED" && onMarkAttendance && (
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

              {/* Edit - Admin/Owner only */}
              {onEdit && (
                <RBACWrapper requiredRoles={["OWNER", "ADMIN"]}>
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
          </div>
        </PopoverContent>
      </Popover>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
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
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>{t("button.cancel", { ns: "common" })}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRecurring ? t("sessionDetails.deleteThisOnly") : t("button.delete", { ns: "common" })}
            </AlertDialogAction>
            {isRecurring && onDeleteFuture && (
              <AlertDialogAction
                onClick={handleDeleteAllFuture}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t("sessionDetails.deleteAllFuture")}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
