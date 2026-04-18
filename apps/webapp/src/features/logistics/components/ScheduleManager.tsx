import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { cn } from "@workspace/ui/lib/utils";
import type { ClassSchedule } from "@workspace/types";
import { format, setHours, setMinutes } from "date-fns";
import { Check, ChevronsUpDown, Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { RBACWrapper } from "@/features/auth/components/RBACWrapper";
import { useSchedules } from "../hooks/use-logistics";
import { useRooms } from "../hooks/use-rooms";

function getTodayISO(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

function getMaxEndDateISO(): string {
  const m = new Date();
  m.setMonth(m.getMonth() + 12);
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}-${String(m.getDate()).padStart(2, "0")}`;
}

const scheduleSchema = z
  .object({
    // Coerce to number so the form input (which is a string from the Select)
    // becomes a valid `dayOfWeek: number` matching CreateClassScheduleSchema
    // without a manual parseInt at submit time. The chained `.int().min(0).max(6)`
    // doubles as the "please select a day" check (an empty string coerces to NaN).
    dayOfWeek: z.coerce
      .number()
      .int("Please select a day")
      .min(0, "Please select a day")
      .max(6, "Please select a day"),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    roomName: z.string().optional(),
    frequency: z.enum(["WEEKLY", "BIWEEKLY"]),
    // Empty string from a date input → undefined so the optional check passes.
    endDate: z
      .preprocess(
        (val) => (val === "" || val == null ? undefined : val),
        z.string().optional(),
      )
      .refine(
        (val) => {
          if (!val) return true;
          return val >= getTodayISO();
        },
        { message: "End date must be today or later" },
      )
      .refine(
        (val) => {
          if (!val) return true;
          return val <= getMaxEndDateISO();
        },
        { message: "End date must be within 12 months" },
      ),
  })
  .refine((vals) => vals.endTime > vals.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

type ScheduleFormInput = z.input<typeof scheduleSchema>;
type ScheduleFormOutput = z.output<typeof scheduleSchema>;

interface ScheduleManagerProps {
  classId: string;
  centerId: string;
  onScheduleCreated?: () => Promise<void>;
}

export function ScheduleManager({ classId, centerId, onScheduleCreated }: ScheduleManagerProps) {
  const { t } = useTranslation("logistics");
  const [isAdding, setIsAdding] = useState(false);
  const [roomComboOpen, setRoomComboOpen] = useState(false);

  const DAYS_OF_WEEK = [
    { value: "1", label: t("weeklyCalendar.monday") },
    { value: "2", label: t("weeklyCalendar.tuesday") },
    { value: "3", label: t("weeklyCalendar.wednesday") },
    { value: "4", label: t("weeklyCalendar.thursday") },
    { value: "5", label: t("weeklyCalendar.friday") },
    { value: "6", label: t("weeklyCalendar.saturday") },
    { value: "0", label: t("weeklyCalendar.sunday") },
  ];
  const {
    schedules,
    isLoading,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    previewScheduleUpdate,
    isCreating,
    isUpdating,
    isDeleting,
  } = useSchedules(classId, centerId);
  const { rooms } = useRooms(centerId);
  const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | null>(null);

  const form = useForm<ScheduleFormInput, unknown, ScheduleFormOutput>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      // Stored as string in the form (Select gives strings); the Zod
      // `z.coerce.number()` converts at parse time.
      dayOfWeek: "" as unknown as number,
      startTime: "09:00",
      endTime: "10:00",
      roomName: "",
      frequency: "WEEKLY",
      endDate: "",
    },
  });

  async function onSubmit(values: ScheduleFormOutput) {
    try {
      const result = await createSchedule({
        classId,
        dayOfWeek: values.dayOfWeek,
        startTime: values.startTime,
        endTime: values.endTime,
        roomName: values.roomName || undefined,
        frequency: values.frequency,
        endDate: values.endDate || undefined,
      });

      // Sessions are now auto-generated by the backend on schedule create.
      // Invalidate session queries via the parent callback (registered by
      // ClassDrawer to refetch the calendar view).
      if (onScheduleCreated) {
        await onScheduleCreated();
      }

      // Surface the conflict count from the backend response. Without this
      // toast a user adding a recurring schedule that collides with existing
      // sessions would see no warning at all — they'd discover the collision
      // by accident on the calendar later.
      const generatedCount =
        (result as { generatedCount?: number } | null | undefined)?.generatedCount ?? 0;
      const conflictCount =
        (result as { conflicts?: unknown[] } | null | undefined)?.conflicts?.length ?? 0;
      if (conflictCount > 0) {
        toast.warning(
          t("scheduleManager.generatedWithConflicts", {
            count: generatedCount,
            conflicts: conflictCount,
          }),
        );
      } else {
        toast.success(t("scheduleManager.toastAddSuccess"));
      }
      form.reset();
      setIsAdding(false);
    } catch {
      toast.error(t("scheduleManager.toastAddError"));
    }
  }

  async function handleDelete(scheduleId: string) {
    if (!confirm(t("scheduleManager.deleteConfirm"))) return;
    try {
      await deleteSchedule(scheduleId);
      toast.success(t("scheduleManager.toastDeleteSuccess"));
    } catch {
      toast.error(t("scheduleManager.toastDeleteError"));
    }
  }

  // Generate time options
  const timeOptions: { value: string; label: string }[] = [];
  for (let hour = 6; hour <= 22; hour++) {
    for (const min of [0, 30]) {
      if (hour === 22 && min === 30) continue;
      const time = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
      const label = format(
        setMinutes(setHours(new Date(), hour), min),
        "h:mm a",
      );
      timeOptions.push({ value: time, label });
    }
  }

  const getDayLabel = (dayOfWeek: number) => {
    return (
      DAYS_OF_WEEK.find((d) => d.value === String(dayOfWeek))?.label ??
      t("attendance.unknown")
    );
  };

  const formatTime = (time: string) => {
    const [hour, min] = time.split(":").map(Number);
    return format(setMinutes(setHours(new Date(), hour), min), "h:mm a");
  };

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">{t("scheduleManager.loadingSchedules")}</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">{t("scheduleManager.recurringSchedule")}</h4>
          <p className="text-xs text-muted-foreground">
            {t("scheduleManager.recurringSubtitle")}
          </p>
        </div>
        {!isAdding && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="mr-1 size-3" />
            {t("button.add", { ns: "common" })}
          </Button>
        )}
      </div>

      {/* Existing schedules */}
      {schedules.length > 0 ? (
        <div className="space-y-2">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <Badge variant="secondary">
                  {getDayLabel(schedule.dayOfWeek)}
                </Badge>
                <div className="flex items-center gap-1 text-sm">
                  <Clock className="size-3 text-muted-foreground" />
                  <span>
                    {formatTime(schedule.startTime)} -{" "}
                    {formatTime(schedule.endTime)}
                  </span>
                </div>
                {schedule.frequency === "BIWEEKLY" && (
                  <Badge variant="outline">
                    {t("scheduleManager.frequencyBiweekly")}
                  </Badge>
                )}
                {schedule.roomName && (
                  <span className="text-sm text-muted-foreground">
                    ({schedule.roomName})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <RBACWrapper requiredRoles={["OWNER", "ADMIN"]}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setEditingSchedule(schedule)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </RBACWrapper>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(schedule.id)}
                  disabled={isDeleting}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !isAdding && (
          <div className="text-sm text-muted-foreground py-4 text-center border rounded-lg border-dashed">
            {t("scheduleManager.emptyState")}
          </div>
        )
      )}

      {/* Edit schedule dialog */}
      {editingSchedule && (
        <EditScheduleDialog
          schedule={editingSchedule}
          classId={classId}
          centerId={centerId}
          timeOptions={timeOptions}
          daysOfWeek={DAYS_OF_WEEK}
          rooms={rooms}
          onClose={() => setEditingSchedule(null)}
          updateSchedule={updateSchedule}
          previewScheduleUpdate={previewScheduleUpdate}
          isUpdating={isUpdating}
          onScheduleCreated={onScheduleCreated}
        />
      )}

      {/* Add schedule form */}
      {isAdding && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t("scheduleManager.newSchedule")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="dayOfWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("scheduleManager.dayOfWeek")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("scheduleManager.dayPlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DAYS_OF_WEEK.map((day) => (
                            <SelectItem key={day.value} value={day.value}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("scheduleManager.start")}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {timeOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("scheduleManager.end")}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {timeOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("scheduleManager.frequency")}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="WEEKLY">
                              {t("scheduleManager.frequencyWeekly")}
                            </SelectItem>
                            <SelectItem value="BIWEEKLY">
                              {t("scheduleManager.frequencyBiweekly")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("scheduleManager.endDate")}</FormLabel>
                        <FormControl>
                          <input
                            type="date"
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          {t("scheduleManager.noEndDateHint")}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="roomName"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t("editSession.roomOptional")}</FormLabel>
                      <Popover open={roomComboOpen} onOpenChange={setRoomComboOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value || t("editSession.roomPlaceholder")}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput
                              placeholder={t("editSession.searchRooms")}
                              onValueChange={(val) => field.onChange(val)}
                            />
                            <CommandList>
                              <CommandEmpty>
                                {field.value ? t("editSession.useRoomQuoted", { room: field.value }) : t("editSession.noRoomsFound")}
                              </CommandEmpty>
                              <CommandGroup>
                                {rooms.map((room) => (
                                  <CommandItem
                                    key={room.id}
                                    value={room.name}
                                    onSelect={() => {
                                      field.onChange(room.name);
                                      setRoomComboOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === room.name ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {room.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsAdding(false);
                      form.reset();
                    }}
                  >
                    {t("button.cancel", { ns: "common" })}
                  </Button>
                  <Button type="submit" size="sm" disabled={isCreating}>
                    {isCreating ? t("scheduleManager.adding") : t("scheduleManager.addSchedule")}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// --- Edit Schedule Dialog ---

const editScheduleSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    roomName: z.string().optional(),
    frequency: z.enum(["WEEKLY", "BIWEEKLY"]),
    endDate: z
      .preprocess(
        (val) => (val === "" || val == null ? undefined : val),
        z.string().optional(),
      )
      .refine(
        (val) => {
          if (!val) return true;
          return val >= getTodayISO();
        },
        { message: "End date must be today or later" },
      )
      .refine(
        (val) => {
          if (!val) return true;
          return val <= getMaxEndDateISO();
        },
        { message: "End date must be within 12 months" },
      ),
  })
  .refine((vals) => vals.endTime > vals.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

type EditScheduleFormInput = z.input<typeof editScheduleSchema>;
type EditScheduleFormOutput = z.output<typeof editScheduleSchema>;

interface EditScheduleDialogProps {
  schedule: ClassSchedule;
  classId: string;
  centerId: string;
  timeOptions: { value: string; label: string }[];
  daysOfWeek: { value: string; label: string }[];
  rooms: { id: string; name: string }[];
  onClose: () => void;
  updateSchedule: (args: { id: string; input: Record<string, unknown> }) => Promise<unknown>;
  previewScheduleUpdate: (scheduleId: string) => Promise<{
    deletableCount: number;
    preservedExceptions: number;
    preservedCompleted: number;
    totalFutureAffected: number;
  } | undefined>;
  isUpdating: boolean;
  onScheduleCreated?: () => Promise<void>;
}

function EditScheduleDialog({
  schedule,
  timeOptions,
  daysOfWeek,
  rooms,
  onClose,
  updateSchedule,
  previewScheduleUpdate,
  isUpdating,
  onScheduleCreated,
}: EditScheduleDialogProps) {
  const { t } = useTranslation("logistics");
  const [roomComboOpen, setRoomComboOpen] = useState(false);
  const [confirmStep, setConfirmStep] = useState<{
    deletableCount: number;
    preservedExceptions: number;
    preservedCompleted: number;
  } | null>(null);
  const [pendingInput, setPendingInput] = useState<Record<string, unknown> | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const endDateStr = schedule.endDate
    ? new Date(schedule.endDate).toISOString().slice(0, 10)
    : "";

  const editForm = useForm<EditScheduleFormInput, unknown, EditScheduleFormOutput>({
    resolver: zodResolver(editScheduleSchema),
    defaultValues: {
      dayOfWeek: String(schedule.dayOfWeek) as unknown as number,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      roomName: schedule.roomName ?? "",
      frequency: schedule.frequency,
      endDate: endDateStr,
    },
  });

  function buildChangedInput(values: EditScheduleFormOutput): Record<string, unknown> {
    const input: Record<string, unknown> = {};
    if (values.dayOfWeek !== schedule.dayOfWeek) input.dayOfWeek = values.dayOfWeek;
    if (values.startTime !== schedule.startTime) input.startTime = values.startTime;
    if (values.endTime !== schedule.endTime) input.endTime = values.endTime;
    if (values.frequency !== schedule.frequency) input.frequency = values.frequency;
    const newRoom = values.roomName || null;
    const oldRoom = schedule.roomName ?? null;
    if (newRoom !== oldRoom) input.roomName = newRoom;
    const newEndDate = values.endDate || null;
    const oldEndDate = endDateStr || null;
    if (newEndDate !== oldEndDate) input.endDate = newEndDate;
    return input;
  }

  async function handleEditSubmit(values: EditScheduleFormOutput) {
    const input = buildChangedInput(values);

    if (Object.keys(input).length === 0) {
      toast.info(t("scheduleManager.noChanges"));
      return;
    }

    // Check if anchor fields changed — if so, show preview confirmation
    const anchorFields = ["dayOfWeek", "startTime", "endTime", "frequency"];
    const anchorChanged = anchorFields.some((f) => f in input);

    if (anchorChanged) {
      setIsLoadingPreview(true);
      try {
        const preview = await previewScheduleUpdate(schedule.id);
        if (preview) {
          setConfirmStep({
            deletableCount: preview.deletableCount,
            preservedExceptions: preview.preservedExceptions,
            preservedCompleted: preview.preservedCompleted,
          });
          setPendingInput(input);
          return;
        }
      } catch {
        // Preview failed — proceed without confirmation
      } finally {
        setIsLoadingPreview(false);
      }
    }

    await executeUpdate(input);
  }

  async function executeUpdate(input: Record<string, unknown>) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await updateSchedule({ id: schedule.id, input });
      const generatedCount = (result as { generatedCount?: number } | null)?.generatedCount ?? 0;
      toast.success(t("scheduleManager.updateSuccess", { generatedCount }));
      if (onScheduleCreated) await onScheduleCreated();
      onClose();
    } catch {
      toast.error(t("scheduleManager.updateError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirm() {
    if (!pendingInput) return;
    await executeUpdate(pendingInput);
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("scheduleManager.editSchedule")}</DialogTitle>
          <DialogDescription>{t("scheduleManager.editScheduleDescription")}</DialogDescription>
        </DialogHeader>

        {confirmStep ? (
          <div className="space-y-4">
            <p className="text-sm font-medium">{t("scheduleManager.confirmUpdateTitle")}</p>
            <p className="text-sm text-muted-foreground">
              {t("scheduleManager.confirmUpdateBody", { deletableCount: confirmStep.deletableCount })}
            </p>
            {confirmStep.preservedExceptions > 0 && (
              <p className="text-sm text-muted-foreground">
                {t("scheduleManager.preservedExceptions", { count: confirmStep.preservedExceptions })}
              </p>
            )}
            {confirmStep.preservedCompleted > 0 && (
              <p className="text-sm text-muted-foreground">
                {t("scheduleManager.preservedCompleted", { count: confirmStep.preservedCompleted })}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setConfirmStep(null); setPendingValues(null); }}>
                {t("button.cancel", { ns: "common" })}
              </Button>
              <Button size="sm" onClick={handleConfirm} disabled={isUpdating || isSubmitting}>
                {isUpdating || isSubmitting ? "..." : t("button.confirm", { ns: "common" })}
              </Button>
            </div>
          </div>
        ) : (
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="dayOfWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("scheduleManager.dayOfWeek")}</FormLabel>
                    <Select onValueChange={field.onChange} value={String(field.value)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("scheduleManager.dayPlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {daysOfWeek.map((day) => (
                          <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={editForm.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("scheduleManager.start")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timeOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("scheduleManager.end")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timeOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={editForm.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("scheduleManager.frequency")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="WEEKLY">{t("scheduleManager.frequencyWeekly")}</SelectItem>
                          <SelectItem value="BIWEEKLY">{t("scheduleManager.frequencyBiweekly")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("scheduleManager.endDate")}</FormLabel>
                      <FormControl>
                        <input
                          type="date"
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">{t("scheduleManager.noEndDateHint")}</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="roomName"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t("editSession.roomOptional")}</FormLabel>
                    <Popover open={roomComboOpen} onOpenChange={setRoomComboOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value || t("editSession.roomPlaceholder")}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput
                            placeholder={t("editSession.searchRooms")}
                            onValueChange={(val) => field.onChange(val)}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {field.value ? t("editSession.useRoomQuoted", { room: field.value }) : t("editSession.noRoomsFound")}
                            </CommandEmpty>
                            <CommandGroup>
                              {rooms.map((room) => (
                                <CommandItem
                                  key={room.id}
                                  value={room.name}
                                  onSelect={() => {
                                    field.onChange(room.name);
                                    setRoomComboOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === room.name ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {room.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                  {t("button.cancel", { ns: "common" })}
                </Button>
                <Button type="submit" size="sm" disabled={isUpdating || isLoadingPreview || isSubmitting}>
                  {isLoadingPreview || isUpdating || isSubmitting
                    ? "..."
                    : t("button.update", { ns: "common" })}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
