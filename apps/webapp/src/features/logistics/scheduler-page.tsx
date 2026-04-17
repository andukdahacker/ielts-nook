import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { startOfWeek } from "date-fns";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { useSessions } from "./hooks/use-sessions";
import { useClasses } from "./hooks/use-logistics";
import { useRooms } from "./hooks/use-rooms";
import { WeeklyCalendar } from "./components/WeeklyCalendar";
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

  const handleWeekChange = (newWeekStart: Date) => {
    setCurrentWeekStart(newWeekStart);
  };

  const handleSessionMove = async (
    sessionId: string,
    newStartTime: Date,
    newEndTime: Date
  ) => {
    try {
      await updateSession({
        id: sessionId,
        input: {
          startTime: newStartTime.toISOString(),
          endTime: newEndTime.toISOString(),
        },
      });
      toast.success(t("scheduler.toastRescheduleSuccess"));
    } catch {
      toast.error(t("scheduler.toastRescheduleError"));
    }
  };

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
          onSessionMove={handleSessionMove}
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
    </div>
  );
}

export default SchedulerPage;
