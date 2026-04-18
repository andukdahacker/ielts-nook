import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { startOfWeek, format } from "date-fns";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { useAuth } from "@/features/auth/auth-context";
import { useSessions } from "./hooks/use-sessions";
import { useClasses } from "./hooks/use-logistics";
import { useRooms } from "./hooks/use-rooms";
import { useConflictCheck } from "./hooks/use-conflict-check";
import { WeeklyCalendar } from "./components/WeeklyCalendar";
import { ConflictWarningBanner } from "./components/ConflictWarningBanner";
import { CreateSessionDialog } from "./components/CreateSessionDialog";
import { EditSessionDialog } from "./components/EditSessionDialog";
import { RBACWrapper } from "@/features/auth/components/RBACWrapper";
import type { ClassSessionWithConflicts } from "@workspace/types";

export function SchedulerPage() {
  const { t } = useTranslation("logistics");
  const { user } = useAuth();
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const {
    sessions,
    isLoading,
    createSession,
    isCreating,
    updateSession,
    isUpdating,
    cancelSession,
    isCancelling,
    deleteSession,
    isDeleting,
    deleteFutureSessions,
  } = useSessions(user?.centerId, currentWeekStart);

  const { classes } = useClasses(user?.centerId ?? undefined);
  const { rooms } = useRooms(user?.centerId);

  // Create dialog state (for slot click / drag-to-create)
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDefaults, setCreateDefaults] = useState<{
    date?: Date;
    startTime?: string;
    endTime?: string;
  }>({});

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editSession, setEditSession] = useState<ClassSessionWithConflicts | null>(null);

  // Reschedule confirmation state
  const [pendingReschedule, setPendingReschedule] = useState<{
    sessionId: string;
    session: ClassSessionWithConflicts;
    newStartTime: Date;
    newEndTime: Date;
  } | null>(null);

  const {
    hasConflicts: rescheduleHasConflicts,
    roomConflicts: rescheduleRoomConflicts,
    teacherConflicts: rescheduleTeacherConflicts,
    suggestions: rescheduleSuggestions,
    checkConflictsImmediate: checkRescheduleConflicts,
    clearConflicts: clearRescheduleConflicts,
    isChecking: isCheckingRescheduleConflicts,
  } = useConflictCheck();

  const handleWeekChange = (newWeekStart: Date) => {
    setCurrentWeekStart(newWeekStart);
  };

  const handleSessionMove = useCallback((
    sessionId: string,
    newStartTime: Date,
    newEndTime: Date,
    session: ClassSessionWithConflicts,
  ) => {
    setPendingReschedule({ sessionId, session, newStartTime, newEndTime });
    checkRescheduleConflicts({
      classId: session.classId,
      startTime: newStartTime.toISOString(),
      endTime: newEndTime.toISOString(),
      roomName: session.roomName,
      excludeSessionId: session.id,
    });
  }, [checkRescheduleConflicts]);

  const handleConfirmReschedule = useCallback(async () => {
    if (!pendingReschedule) return;
    try {
      await updateSession({
        id: pendingReschedule.sessionId,
        input: {
          startTime: pendingReschedule.newStartTime.toISOString(),
          endTime: pendingReschedule.newEndTime.toISOString(),
        },
      });
      toast.success(t("scheduler.toastRescheduleSuccess"));
      setPendingReschedule(null);
      clearRescheduleConflicts();
    } catch {
      toast.error(t("scheduler.toastRescheduleError"));
    }
  }, [pendingReschedule, updateSession, t, clearRescheduleConflicts]);

  const handleCancelReschedule = useCallback(() => {
    setPendingReschedule(null);
    clearRescheduleConflicts();
  }, [clearRescheduleConflicts]);

  const handleSessionUpdate = async (
    sessionId: string,
    updates: { roomName?: string },
  ) => {
    try {
      await updateSession({
        id: sessionId,
        input: updates,
      });
      toast.success(t("scheduler.toastUpdateSuccess"));
    } catch {
      toast.error(t("scheduler.toastUpdateError"));
    }
  };

  const handleSessionDelete = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      toast.success(t("scheduler.toastDeleteSuccess"));
    } catch {
      toast.error(t("scheduler.toastDeleteError"));
    }
  };

  const handleDeleteFuture = async (sessionId: string) => {
    try {
      const result = await deleteFutureSessions(sessionId);
      toast.success(t("scheduler.toastDeleteFutureSuccess", { count: result?.deletedCount ?? 0 }));
    } catch {
      toast.error(t("scheduler.toastDeleteFutureError"));
    }
  };

  const handleSessionCancel = useCallback(async (sessionId: string) => {
    try {
      await cancelSession(sessionId);
      toast.success(t("scheduler.toastCancelSuccess"));
    } catch {
      toast.error(t("scheduler.toastCancelError"));
    }
  }, [cancelSession, t]);

  const handleEdit = useCallback((session: ClassSessionWithConflicts) => {
    setEditSession(session);
    setEditDialogOpen(true);
  }, []);

  const handleSlotClick = useCallback((date: Date, startTime: string) => {
    // Calculate end time 1 hour after start
    const [h, m] = startTime.split(":").map(Number);
    const endH = h + 1;
    const endTime = `${endH.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;

    setCreateDefaults({ date, startTime, endTime });
    setCreateDialogOpen(true);
  }, []);

  const handleDragCreate = useCallback((date: Date, startTime: string, endTime: string) => {
    setCreateDefaults({ date, startTime, endTime });
    setCreateDialogOpen(true);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("scheduler.pageTitle")}</h1>
          <p className="text-muted-foreground">
            {t("scheduler.pageSubtitle")}
          </p>
        </div>
        <RBACWrapper requiredRoles={["OWNER", "ADMIN"]}>
          <CreateSessionDialog
            classes={classes}
            rooms={rooms}
            onCreateSession={createSession}
            isCreating={isCreating}
          />
        </RBACWrapper>
      </div>

      <div className="flex-1 border rounded-lg overflow-hidden bg-card">
        <WeeklyCalendar
          sessions={sessions}
          weekStart={currentWeekStart}
          onWeekChange={handleWeekChange}
          onSessionMove={user?.role !== "STUDENT" ? handleSessionMove : undefined}
          onSessionUpdate={handleSessionUpdate}
          onSessionDelete={handleSessionDelete}
          onSessionCancel={handleSessionCancel}
          onDeleteFuture={handleDeleteFuture}
          onEdit={handleEdit}
          onSlotClick={handleSlotClick}
          onDragCreate={handleDragCreate}
          isUpdating={isUpdating}
          isDeleting={isDeleting}
          isCancelling={isCancelling}
        />
      </div>

      {/* Create dialog opened by slot click / drag-to-create */}
      <CreateSessionDialog
        classes={classes}
        rooms={rooms}
        onCreateSession={createSession}
        isCreating={isCreating}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultDate={createDefaults.date}
        defaultStartTime={createDefaults.startTime}
        defaultEndTime={createDefaults.endTime}
        hideTrigger
      />

      {/* Edit dialog */}
      {editSession && (
        <EditSessionDialog
          session={editSession}
          rooms={rooms}
          onUpdateSession={updateSession}
          isUpdating={isUpdating}
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setEditSession(null);
          }}
        />
      )}

      {/* Reschedule Confirmation Dialog */}
      <AlertDialog open={!!pendingReschedule} onOpenChange={(open) => { if (!open) handleCancelReschedule(); }}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("scheduler.confirmRescheduleTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingReschedule && t("scheduler.confirmRescheduleBody", {
                courseName: pendingReschedule.session.class?.course?.name ?? t("sessionBlock.courseFallback"),
                className: pendingReschedule.session.class?.name ?? t("sessionBlock.classFallback"),
                newDate: format(pendingReschedule.newStartTime, "EEEE, MMMM d"),
                newTime: format(pendingReschedule.newStartTime, "h:mm a"),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {rescheduleHasConflicts && (
            <>
              <ConflictWarningBanner
                roomConflicts={rescheduleRoomConflicts}
                teacherConflicts={rescheduleTeacherConflicts}
                suggestions={rescheduleSuggestions}
                onForceSave={handleConfirmReschedule}
                isForcing={isUpdating}
              />
              <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row">
                <AlertDialogCancel className="w-full sm:w-auto min-h-[44px]">
                  {t("button.cancel", { ns: "common" })}
                </AlertDialogCancel>
              </AlertDialogFooter>
            </>
          )}

          {!rescheduleHasConflicts && (
            <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row">
              <AlertDialogCancel className="w-full sm:w-auto min-h-[44px]">
                {t("button.cancel", { ns: "common" })}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmReschedule}
                className="w-full sm:w-auto min-h-[44px]"
                disabled={isUpdating || isCheckingRescheduleConflicts}
              >
                {isUpdating ? t("editSession.saving") : isCheckingRescheduleConflicts ? t("editSession.saving") : t("button.confirm", { ns: "common" })}
              </AlertDialogAction>
            </AlertDialogFooter>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default SchedulerPage;
