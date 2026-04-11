import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { ClassSessionWithConflicts, Suggestion } from "@workspace/types";
import {
  format,
  addWeeks,
  subWeeks,
  startOfWeek,
  addDays,
  isSameDay,
  setHours,
  setMinutes,
  differenceInMinutes,
  startOfDay,
} from "date-fns";
import { Button } from "@workspace/ui/components/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { SessionBlock } from "./SessionBlock";
import { SessionDetailsPopover } from "./SessionDetailsPopover";
import { ConflictDrawer } from "./ConflictDrawer";
import { AttendanceModal } from "./AttendanceModal";
import { RBACWrapper } from "@/features/auth/components/RBACWrapper";
import { cn } from "@workspace/ui/lib/utils";
import { useConflictCheck } from "../hooks/use-conflict-check";

interface WeeklyCalendarProps {
  sessions: ClassSessionWithConflicts[];
  weekStart: Date;
  onWeekChange: (newWeekStart: Date) => void;
  onSessionMove?: (
    sessionId: string,
    newStartTime: Date,
    newEndTime: Date,
  ) => void;
  onSessionUpdate?: (sessionId: string, updates: { roomName?: string }) => void;
  onSessionDelete?: (sessionId: string) => void;
  onDeleteFuture?: (sessionId: string) => void;
  onEdit?: (session: ClassSessionWithConflicts) => void;
  onSlotClick?: (date: Date, startTime: string) => void;
  onDragCreate?: (date: Date, startTime: string, endTime: string) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

// Time configuration
const START_HOUR = 8; // 8 AM
const END_HOUR = 22; // 10 PM
const HOUR_HEIGHT = 60; // pixels per hour
const SLOT_MINUTES = 15; // 15-minute slots (like Google Calendar)
const SLOT_HEIGHT = (SLOT_MINUTES / 60) * HOUR_HEIGHT; // 15 pixels per slot

export function WeeklyCalendar({
  sessions,
  weekStart,
  onWeekChange,
  onSessionMove,
  onSessionUpdate,
  onSessionDelete,
  onDeleteFuture,
  onEdit,
  onSlotClick,
  onDragCreate,
  isUpdating,
  isDeleting,
}: WeeklyCalendarProps) {
  const { t } = useTranslation("logistics");
  const [selectedSession, setSelectedSession] = useState<ClassSessionWithConflicts | null>(
    null,
  );
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  // Conflict drawer state
  const [conflictDrawerOpen, setConflictDrawerOpen] = useState(false);
  const [conflictSession, setConflictSession] = useState<ClassSessionWithConflicts | null>(null);

  // Attendance modal state
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [attendanceSession, setAttendanceSession] = useState<ClassSessionWithConflicts | null>(null);

  // Drag-to-create state (mouse events on empty cells)
  const [createDragState, setCreateDragState] = useState<{
    isDragging: boolean;
    dayIndex: number;
    startSlot: number;
    endSlot: number;
  } | null>(null);

  // Generate days of the week — must be defined before callbacks that reference it
  const weekDays = useMemo(() => {
    const start = startOfWeek(weekStart, { weekStartsOn: 1 }); // Monday
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [weekStart]);

  // Convert slot index to time string "HH:mm"
  const slotToTime = useCallback((slotIndex: number): string => {
    const totalMinutes = START_HOUR * 60 + slotIndex * SLOT_MINUTES;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  }, []);

  // Handle mouse events for drag-to-create on empty grid cells
  const handleGridMouseDown = useCallback((dayIndex: number, slotIndex: number) => {
    if (!onDragCreate && !onSlotClick) return;
    setCreateDragState({ isDragging: true, dayIndex, startSlot: slotIndex, endSlot: slotIndex });
  }, [onDragCreate, onSlotClick]);

  const handleGridMouseMove = useCallback((slotIndex: number) => {
    if (!createDragState?.isDragging) return;
    setCreateDragState(prev => prev ? { ...prev, endSlot: Math.max(slotIndex, prev.startSlot) } : null);
  }, [createDragState?.isDragging]);

  const handleGridMouseUp = useCallback(() => {
    if (!createDragState?.isDragging) return;
    const { dayIndex, startSlot, endSlot } = createDragState;
    const day = weekDays[dayIndex];
    if (!day) { setCreateDragState(null); return; }

    const startTime = slotToTime(startSlot);
    const endTimeSlot = endSlot + 1; // end is exclusive
    const endTime = slotToTime(endTimeSlot);

    if (startSlot === endSlot && onSlotClick) {
      // Single click (no drag distance)
      onSlotClick(day, startTime);
    } else if (onDragCreate) {
      onDragCreate(day, startTime, endTime);
    }

    setCreateDragState(null);
  }, [createDragState, weekDays, slotToTime, onSlotClick, onDragCreate]);

  // Global mouseup listener for drag-to-create
  useEffect(() => {
    if (!createDragState?.isDragging) return;
    const handler = () => handleGridMouseUp();
    window.addEventListener("mouseup", handler);
    return () => window.removeEventListener("mouseup", handler);
  }, [createDragState?.isDragging, handleGridMouseUp]);

  // Conflict checking for selected session
  const {
    roomConflicts,
    teacherConflicts,
    suggestions,
    checkConflictsImmediate,
    clearConflicts,
  } = useConflictCheck();

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedSession, setDraggedSession] = useState<ClassSessionWithConflicts | null>(
    null,
  );
  const [dragPreview, setDragPreview] = useState<{
    dayKey: string;
    topPosition: number;
    height: number;
    hours: number;
    minutes: number;
  } | null>(null);

  // Conflict slots during drag - stores "dayKey-hour-minutes" keys that would cause conflicts
  const [conflictSlots, setConflictSlots] = useState<Set<string>>(new Set());

  // Refs for drag calculations
  const dragStartRef = useRef<{
    mouseY: number;
    sessionTopMinutes: number;
  } | null>(null);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Generate time slots for display
  const timeSlots = useMemo(() => {
    const slots: { hours: number; minutes: number; label: string }[] = [];
    for (let hour = START_HOUR; hour < END_HOUR; hour++) {
      for (let min = 0; min < 60; min += SLOT_MINUTES) {
        slots.push({
          hours: hour,
          minutes: min,
          label: format(setMinutes(setHours(new Date(), hour), min), "h:mm a"),
        });
      }
    }
    return slots;
  }, []);

  // Group sessions by day
  const sessionsByDay = useMemo(() => {
    const grouped: Record<string, ClassSessionWithConflicts[]> = {};
    weekDays.forEach((day) => {
      const dayKey = format(day, "yyyy-MM-dd");
      grouped[dayKey] = sessions.filter((session) =>
        isSameDay(new Date(session.startTime), day),
      );
    });
    return grouped;
  }, [sessions, weekDays]);

  // Compute conflict slots for a dragged session using interval-based approach
  // Returns Set of "dayKey-hour-minutes" keys that would cause conflicts
  // Optimized: Instead of checking every slot, we compute conflict intervals directly
  const computeConflictSlots = useCallback((draggedSess: ClassSessionWithConflicts) => {
    const conflicts = new Set<string>();
    const draggedDuration = new Date(draggedSess.endTime).getTime() - new Date(draggedSess.startTime).getTime();

    // Get teacher and room of dragged session
    const draggedTeacherId = draggedSess.class?.teacher?.id;
    const draggedRoomName = draggedSess.roomName;

    // If no room and no teacher, no conflicts possible
    if (!draggedRoomName && !draggedTeacherId) {
      return conflicts;
    }

    // For each day, find conflicting intervals directly from sessions
    weekDays.forEach((day) => {
      const dayKey = format(day, "yyyy-MM-dd");
      const daySessions = sessions.filter(
        (s) => s.id !== draggedSess.id && isSameDay(new Date(s.startTime), day),
      );

      // Find sessions that could cause conflicts (same room or same teacher)
      const conflictingSessions = daySessions.filter((session) => {
        if (draggedRoomName && session.roomName === draggedRoomName) return true;
        if (draggedTeacherId && session.class?.teacher?.id === draggedTeacherId) return true;
        return false;
      });

      // For each conflicting session, mark the slots that would overlap
      conflictingSessions.forEach((session) => {
        const sessStart = new Date(session.startTime);
        const sessEnd = new Date(session.endTime);
        const dayStart = setMinutes(setHours(startOfDay(day), START_HOUR), 0);

        // Calculate the range of slots that would conflict with this session
        // A slot at time T conflicts if: T < sessEnd && T + duration > sessStart
        // Rearranged: T > sessStart - duration && T < sessEnd
        const conflictWindowStart = new Date(sessStart.getTime() - draggedDuration);
        const conflictWindowEnd = sessEnd;

        // Convert to slot indices
        const startSlotMinutes = Math.max(
          0,
          differenceInMinutes(conflictWindowStart, dayStart)
        );
        const endSlotMinutes = Math.min(
          (END_HOUR - START_HOUR) * 60,
          differenceInMinutes(conflictWindowEnd, dayStart)
        );

        // Snap to slot boundaries
        const startSlot = Math.floor(startSlotMinutes / SLOT_MINUTES) * SLOT_MINUTES;
        const endSlot = Math.ceil(endSlotMinutes / SLOT_MINUTES) * SLOT_MINUTES;

        // Mark all slots in the conflict window
        for (let slotMin = startSlot; slotMin < endSlot; slotMin += SLOT_MINUTES) {
          if (slotMin >= 0 && slotMin < (END_HOUR - START_HOUR) * 60) {
            const hour = START_HOUR + Math.floor(slotMin / 60);
            const min = slotMin % 60;
            conflicts.add(`${dayKey}-${hour}-${min}`);
          }
        }
      });
    });

    return conflicts;
  }, [weekDays, sessions]);

  // Calculate session position and height
  const getSessionStyle = (session: ClassSessionWithConflicts) => {
    const start = new Date(session.startTime);
    const end = new Date(session.endTime);
    const dayStart = setMinutes(setHours(startOfDay(start), START_HOUR), 0);

    const topMinutes = differenceInMinutes(start, dayStart);
    const durationMinutes = differenceInMinutes(end, start);

    const top = (topMinutes / 60) * HOUR_HEIGHT;
    const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 20);

    return { top, height };
  };

  // Calculate layout for overlapping sessions
  const getSessionsLayout = (daySessions: ClassSessionWithConflicts[]) => {
    if (daySessions.length === 0) return new Map<string, { column: number; totalColumns: number }>();

    // Sort sessions by start time, then by duration (longer first)
    const sorted = [...daySessions].sort((a, b) => {
      const startDiff = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      if (startDiff !== 0) return startDiff;
      // If same start, longer sessions first
      const aDuration = new Date(a.endTime).getTime() - new Date(a.startTime).getTime();
      const bDuration = new Date(b.endTime).getTime() - new Date(b.startTime).getTime();
      return bDuration - aDuration;
    });

    // Track columns - each column has the end time of its last session
    const columns: number[] = [];
    const sessionColumns = new Map<string, number>();

    // Assign each session to a column
    for (const session of sorted) {
      const start = new Date(session.startTime).getTime();
      const end = new Date(session.endTime).getTime();

      // Find a column where this session can fit (no overlap)
      let assignedColumn = -1;
      for (let i = 0; i < columns.length; i++) {
        if (columns[i] <= start) {
          assignedColumn = i;
          columns[i] = end;
          break;
        }
      }

      // If no column available, create a new one
      if (assignedColumn === -1) {
        assignedColumn = columns.length;
        columns.push(end);
      }

      sessionColumns.set(session.id, assignedColumn);
    }

    // Now calculate total overlapping columns for each session
    const result = new Map<string, { column: number; totalColumns: number }>();

    for (const session of daySessions) {
      const start = new Date(session.startTime).getTime();
      const end = new Date(session.endTime).getTime();
      const column = sessionColumns.get(session.id) ?? 0;

      // Find all sessions that overlap with this one
      let maxColumn = column;
      for (const other of daySessions) {
        const otherStart = new Date(other.startTime).getTime();
        const otherEnd = new Date(other.endTime).getTime();

        // Check if they overlap
        if (start < otherEnd && end > otherStart) {
          const otherColumn = sessionColumns.get(other.id) ?? 0;
          maxColumn = Math.max(maxColumn, otherColumn);
        }
      }

      result.set(session.id, {
        column,
        totalColumns: maxColumn + 1,
      });
    }

    return result;
  };

  // Handle drag start
  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    session: ClassSessionWithConflicts,
  ) => {
    // Set drag data
    e.dataTransfer.setData("text/plain", session.id);
    e.dataTransfer.effectAllowed = "move";

    // Create invisible drag image
    const emptyImg = document.createElement("img");
    emptyImg.src =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    e.dataTransfer.setDragImage(emptyImg, 0, 0);

    // Calculate session duration for preview height
    const duration =
      new Date(session.endTime).getTime() -
      new Date(session.startTime).getTime();
    const durationMinutes = duration / (1000 * 60);
    const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 20);

    // Store initial position
    const sessionStart = new Date(session.startTime);
    const sessionTopMinutes =
      (sessionStart.getHours() - START_HOUR) * 60 + sessionStart.getMinutes();

    dragStartRef.current = {
      mouseY: e.clientY,
      sessionTopMinutes,
    };

    setDraggedSession(session);
    setIsDragging(true);

    // Compute conflict slots for visual feedback
    const conflicts = computeConflictSlots(session);
    setConflictSlots(conflicts);

    // Set initial preview at current position
    const dayKey = format(sessionStart, "yyyy-MM-dd");
    const topPosition = (sessionTopMinutes / 60) * HOUR_HEIGHT;
    setDragPreview({
      dayKey,
      topPosition,
      height,
      hours: sessionStart.getHours(),
      minutes: sessionStart.getMinutes(),
    });
  };

  // Handle drag over day column
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (!draggedSession || !dragStartRef.current) return;

    const dayColumn = (e.currentTarget as HTMLElement).closest("[data-day]");
    if (!dayColumn) return;

    const dayKey = dayColumn.getAttribute("data-day");
    if (!dayKey) return;

    // Get the grid area position
    const gridArea = e.currentTarget;
    const rect = gridArea.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;

    // Convert to minutes and snap to 15-min intervals
    const minutesFromStart = (relativeY / HOUR_HEIGHT) * 60;
    const snappedMinutes =
      Math.round(minutesFromStart / SLOT_MINUTES) * SLOT_MINUTES;

    // Clamp to valid range
    const clampedMinutes = Math.max(
      0,
      Math.min(snappedMinutes, (END_HOUR - START_HOUR) * 60 - SLOT_MINUTES),
    );

    const hours = START_HOUR + Math.floor(clampedMinutes / 60);
    const minutes = clampedMinutes % 60;
    const topPosition = (clampedMinutes / 60) * HOUR_HEIGHT;

    // Calculate height from session duration
    const duration =
      new Date(draggedSession.endTime).getTime() -
      new Date(draggedSession.startTime).getTime();
    const durationMinutes = duration / (1000 * 60);
    const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 20);

    setDragPreview({
      dayKey,
      topPosition,
      height,
      hours,
      minutes,
    });
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (!draggedSession || !dragPreview || !onSessionMove) {
      handleDragEnd();
      return;
    }

    const duration =
      new Date(draggedSession.endTime).getTime() -
      new Date(draggedSession.startTime).getTime();

    const destDay = new Date(dragPreview.dayKey);
    const newStartTime = setMinutes(
      setHours(destDay, dragPreview.hours),
      dragPreview.minutes,
    );
    const newEndTime = new Date(newStartTime.getTime() + duration);

    onSessionMove(draggedSession.id, newStartTime, newEndTime);
    handleDragEnd();
  };

  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedSession(null);
    setDragPreview(null);
    setConflictSlots(new Set());
    dragStartRef.current = null;
  };

  const handleGoToToday = () => {
    onWeekChange(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const handleSessionClick = (session: ClassSessionWithConflicts) => {
    if (!isDragging) {
      setSelectedSession(session);
      setPopoverOpen(true);
    }
  };

  // Handle opening attendance modal
  const handleMarkAttendance = useCallback((session: ClassSessionWithConflicts) => {
    setAttendanceSession(session);
    setAttendanceModalOpen(true);
  }, []);

  // Handle conflict icon click - fetch conflict details and show drawer
  const handleConflictClick = async (session: ClassSessionWithConflicts) => {
    setConflictSession(session);
    // Fetch fresh conflict details
    await checkConflictsImmediate({
      classId: session.classId,
      startTime: session.startTime,
      endTime: session.endTime,
      roomName: session.roomName,
      excludeSessionId: session.id,
    });
    setConflictDrawerOpen(true);
  };

  // Handle applying a suggestion from the conflict drawer
  const handleApplySuggestionFromDrawer = useCallback((suggestion: Suggestion) => {
    if (!conflictSession) return;

    if (suggestion.type === "time" && suggestion.startTime && suggestion.endTime) {
      if (!onSessionMove) return;
      const newStartTime = new Date(suggestion.startTime);
      const newEndTime = new Date(suggestion.endTime);
      onSessionMove(conflictSession.id, newStartTime, newEndTime);
    } else if (suggestion.type === "room") {
      if (!onSessionUpdate) return;
      onSessionUpdate(conflictSession.id, { roomName: suggestion.value });
    }

    setConflictDrawerOpen(false);
    setConflictSession(null);
    clearConflicts();
  }, [conflictSession, onSessionMove, onSessionUpdate, clearConflicts]);

  // Handle force save from conflict drawer (keeps existing session with conflicts)
  const handleForceSaveFromDrawer = useCallback(() => {
    // Force save means accepting the session as-is with conflicts
    // Just close the drawer - the session already exists and conflicts are acknowledged
    setConflictDrawerOpen(false);
    setConflictSession(null);
    clearConflicts();
  }, [clearConflicts]);

  // Mobile: get the selected day
  const mobileSelectedDay = weekDays[selectedDayIndex] ?? weekDays[0];

  // Render a session block
  const renderSessionBlock = (
    session: ClassSessionWithConflicts,
    canDrag: boolean = false,
  ) => (
    <SessionDetailsPopover
      session={session}
      open={popoverOpen && selectedSession?.id === session.id && !isDragging}
      onOpenChange={(open) => {
        setPopoverOpen(open);
        if (!open) setSelectedSession(null);
      }}
      onDelete={onSessionDelete}
      onDeleteFuture={onDeleteFuture}
      isDeleting={isDeleting}
      onMarkAttendance={handleMarkAttendance}
      onEdit={onEdit}
    >
      <div
        className={cn(
          "h-full cursor-grab active:cursor-grabbing",
          canDrag && "select-none",
        )}
        draggable={canDrag}
        onDragStart={canDrag ? (e) => handleDragStart(e, session) : undefined}
        onDragEnd={canDrag ? handleDragEnd : undefined}
      >
        <SessionBlock
          session={session}
          onClick={() => handleSessionClick(session)}
          isDragging={isDragging && draggedSession?.id === session.id}
          className="h-full overflow-hidden"
          hasConflicts={session.hasConflicts}
          onConflictClick={() => handleConflictClick(session)}
        />
      </div>
    </SessionDetailsPopover>
  );

  // Render grid lines
  const renderGridLines = () => (
    <>
      {timeSlots.map((slot, slotIndex) => {
        const slotTop = slotIndex * SLOT_HEIGHT;
        const isHourMark = slot.minutes === 0;
        const isHalfHourMark = slot.minutes === 30;
        return (
          <div
            key={`slot-guide-${slot.hours}-${slot.minutes}`}
            className="absolute left-0 right-0 pointer-events-none"
            style={{ top: slotTop, height: SLOT_HEIGHT }}
          >
            {isHourMark && slotIndex > 0 && (
              <div className="absolute top-0 left-0 right-0 border-t border-muted-foreground/20" />
            )}
            {isHalfHourMark && (
              <div className="absolute top-0 left-0 right-0 border-t border-dashed border-muted-foreground/10" />
            )}
            {!isHourMark && !isHalfHourMark && (
              <div className="absolute top-0 left-0 right-0 border-t border-dotted border-muted-foreground/5" />
            )}
          </div>
        );
      })}
    </>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header with navigation */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onWeekChange(subWeeks(weekStart, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onWeekChange(addWeeks(weekStart, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            onClick={handleGoToToday}
            className="hidden sm:flex"
          >
            <Calendar className="size-4 mr-2" />
            {t("weeklyCalendar.today")}
          </Button>
        </div>
        <h2 className="text-lg font-semibold hidden sm:block">
          {format(weekDays[0], "MMM d")} - {format(weekDays[6], "MMM d, yyyy")}
        </h2>
        <h2 className="text-lg font-semibold sm:hidden">
          {format(mobileSelectedDay, "MMM d, yyyy")}
        </h2>
      </div>

      {/* Mobile: Horizontal Date Picker */}
      {isMobileView && (
        <div className="flex items-center gap-1 p-2 border-b overflow-x-auto">
          {weekDays.map((day, index) => {
            const isSelected = index === selectedDayIndex;
            const isToday = isSameDay(day, new Date());
            return (
              <button
                key={format(day, "yyyy-MM-dd")}
                onClick={() => setSelectedDayIndex(index)}
                className={cn(
                  "flex flex-col items-center min-w-[48px] py-2 px-3 rounded-lg transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : isToday
                      ? "bg-primary/10"
                      : "hover:bg-muted",
                )}
              >
                <span className="text-xs font-medium">
                  {format(day, "EEE")}
                </span>
                <span
                  className={cn(
                    "text-lg font-semibold",
                    isToday && !isSelected && "text-primary",
                  )}
                >
                  {format(day, "d")}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto">
        <div className={cn("flex", !isMobileView && "min-w-[800px]")}>
          {/* Time column */}
          <div className="w-16 flex-shrink-0 border-r bg-muted/30">
            {!isMobileView && <div className="h-12 border-b" />}
            {timeSlots
              .filter((slot) => slot.minutes === 0)
              .map((slot) => (
                <div
                  key={`time-${slot.hours}`}
                  className="h-[60px] pr-2 text-right text-xs text-muted-foreground"
                >
                  {slot.label}
                </div>
              ))}
          </div>

          {/* Day columns */}
          {(isMobileView ? [mobileSelectedDay] : weekDays).map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const daySessions = sessionsByDay[dayKey] ?? [];
            const isToday = isSameDay(day, new Date());
            const sessionsLayout = getSessionsLayout(daySessions);

            return (
              <div
                key={dayKey}
                data-day={dayKey}
                className={cn(
                  "flex-1 border-r last:border-r-0",
                  !isMobileView && "min-w-[100px]",
                )}
              >
                {/* Day header */}
                {!isMobileView && (
                  <div
                    className={cn(
                      "h-12 border-b p-2 text-center sticky top-0 bg-background z-10",
                      isToday && "bg-primary/10",
                    )}
                  >
                    <div className="text-xs text-muted-foreground">
                      {format(day, "EEE")}
                    </div>
                    <div
                      className={cn(
                        "text-sm font-medium",
                        isToday && "text-primary",
                      )}
                    >
                      {format(day, "d")}
                    </div>
                  </div>
                )}

                {/* Day content with time slots */}
                <RBACWrapper
                  requiredRoles={["OWNER", "ADMIN"]}
                  fallback={
                    <div
                      className="relative"
                      style={{
                        height: (END_HOUR - START_HOUR) * HOUR_HEIGHT,
                      }}
                    >
                      {renderGridLines()}
                      {/* Sessions (non-draggable) */}
                      {daySessions.map((session) => {
                        const style = getSessionStyle(session);
                        const layout = sessionsLayout.get(session.id);
                        const column = layout?.column ?? 0;
                        const totalColumns = layout?.totalColumns ?? 1;
                        const widthPercent = 100 / totalColumns;
                        const leftPercent = column * widthPercent;

                        return (
                          <div
                            key={session.id}
                            className="absolute z-10 px-0.5"
                            style={{
                              top: style.top,
                              height: style.height,
                              left: `calc(${leftPercent}% + 2px)`,
                              width: `calc(${widthPercent}% - 4px)`,
                            }}
                          >
                            {renderSessionBlock(session, false)}
                          </div>
                        );
                      })}
                    </div>
                  }
                >
                  {/* Droppable area for admins */}
                  <div
                    className={cn(
                      "relative",
                      isDragging && "bg-primary/5",
                    )}
                    style={{
                      height: (END_HOUR - START_HOUR) * HOUR_HEIGHT,
                    }}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    {renderGridLines()}

                    {/* Slot interaction layer for click/drag-to-create (mouse events) */}
                    {(onSlotClick || onDragCreate) && !isDragging && timeSlots.map((slot, slotIndex) => {
                      const dayIndex = weekDays.findIndex(d => format(d, "yyyy-MM-dd") === dayKey);
                      return (
                        <div
                          key={`create-slot-${slot.hours}-${slot.minutes}`}
                          role="button"
                          tabIndex={0}
                          className="absolute left-0 right-0 z-[5] hover:bg-primary/5 cursor-pointer transition-colors"
                          style={{
                            top: slotIndex * SLOT_HEIGHT,
                            height: SLOT_HEIGHT,
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleGridMouseDown(dayIndex, slotIndex);
                          }}
                          onMouseMove={() => handleGridMouseMove(slotIndex)}
                        />
                      );
                    })}

                    {/* Drag-to-create ghost preview */}
                    {createDragState?.isDragging && (() => {
                      const createDayIndex = weekDays.findIndex(d => format(d, "yyyy-MM-dd") === dayKey);
                      if (createDayIndex !== createDragState.dayIndex) return null;

                      const top = createDragState.startSlot * SLOT_HEIGHT;
                      const height = (createDragState.endSlot - createDragState.startSlot + 1) * SLOT_HEIGHT;

                      return (
                        <div
                          className="absolute left-1 right-1 z-20 pointer-events-none border-2 border-dashed border-green-500 bg-green-100/50 rounded-md flex items-center justify-center"
                          style={{ top, height }}
                        >
                          <span className="text-xs font-medium text-green-700 truncate px-1">
                            {slotToTime(createDragState.startSlot)} - {slotToTime(createDragState.endSlot + 1)}
                          </span>
                        </div>
                      );
                    })()}

                    {/* Drag preview ghost with conflict highlighting */}
                    {dragPreview && dragPreview.dayKey === dayKey && (() => {
                      const slotKey = `${dayKey}-${dragPreview.hours}-${dragPreview.minutes}`;
                      const hasConflict = conflictSlots.has(slotKey);
                      return (
                        <div
                          className="absolute left-1 right-1 z-20 pointer-events-none"
                          style={{
                            top: dragPreview.topPosition,
                            height: dragPreview.height,
                          }}
                        >
                          <div
                            className={cn(
                              "h-full rounded-md border-2 border-dashed flex items-center justify-center",
                              hasConflict
                                ? "border-red-500 bg-red-100/50"
                                : "border-green-500 bg-green-100/50",
                            )}
                          >
                            <span
                              className={cn(
                                "text-xs font-medium truncate px-1",
                                hasConflict ? "text-red-700" : "text-green-700",
                              )}
                            >
                              {draggedSession?.class?.name || t("weeklyCalendar.sessionFallback")}
                              {hasConflict && ` (${t("weeklyCalendar.conflictLabel")})`}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Sessions (draggable) */}
                    {daySessions.map((session) => {
                      const style = getSessionStyle(session);
                      const layout = sessionsLayout.get(session.id);
                      const column = layout?.column ?? 0;
                      const totalColumns = layout?.totalColumns ?? 1;
                      const widthPercent = 100 / totalColumns;
                      const leftPercent = column * widthPercent;
                      const isBeingDragged =
                        isDragging && draggedSession?.id === session.id;

                      return (
                        <div
                          key={session.id}
                          className={cn(
                            "absolute z-10 px-0.5",
                            isBeingDragged && "opacity-30",
                          )}
                          style={{
                            top: style.top,
                            height: style.height,
                            left: `calc(${leftPercent}% + 2px)`,
                            width: `calc(${widthPercent}% - 4px)`,
                          }}
                        >
                          {renderSessionBlock(session, true)}
                        </div>
                      );
                    })}
                  </div>
                </RBACWrapper>
              </div>
            );
          })}
        </div>
      </div>

      {isUpdating && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
          <div className="text-muted-foreground">{t("weeklyCalendar.updating")}</div>
        </div>
      )}

      {/* Conflict Drawer */}
      <ConflictDrawer
        open={conflictDrawerOpen}
        onOpenChange={(open) => {
          setConflictDrawerOpen(open);
          if (!open) {
            setConflictSession(null);
            clearConflicts();
          }
        }}
        sessionName={
          conflictSession
            ? `${conflictSession.class?.course?.name ?? t("sessionBlock.courseFallback")} - ${conflictSession.class?.name ?? t("sessionBlock.classFallback")}`
            : undefined
        }
        roomConflicts={roomConflicts}
        teacherConflicts={teacherConflicts}
        suggestions={suggestions}
        onApplySuggestion={handleApplySuggestionFromDrawer}
        onForceSave={handleForceSaveFromDrawer}
      />

      {/* Attendance Modal */}
      <AttendanceModal
        session={attendanceSession}
        open={attendanceModalOpen}
        onOpenChange={(open) => {
          setAttendanceModalOpen(open);
          if (!open) {
            setAttendanceSession(null);
          }
        }}
      />
    </div>
  );
}
