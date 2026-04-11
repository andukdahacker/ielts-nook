import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, setHours, setMinutes } from "date-fns";
import { useAuth } from "@/features/auth/auth-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import { toast } from "sonner";
import { Plus, CalendarIcon, ChevronsUpDown, Check, Info } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import type { Class, CreateClassSessionInput, Room, Suggestion } from "@workspace/types";
import { useConflictCheck } from "../hooks/use-conflict-check";
import { ConflictWarningBanner } from "./ConflictWarningBanner";

const createSessionSchema = z.object({
  classId: z.string().min(1, "Please select a class"),
  date: z.date({ required_error: "Please select a date" }),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  roomName: z.string().optional(),
  recurrence: z.enum(["none", "weekly", "biweekly"]).optional(),
});

type CreateSessionFormValues = z.infer<typeof createSessionSchema>;

interface CreateSessionDialogProps {
  classes: Class[];
  rooms?: Room[];
  onCreateSession: (input: CreateClassSessionInput) => Promise<unknown>;
  isCreating: boolean;
  /** Pre-fill from slot click or drag-to-create */
  defaultDate?: Date;
  defaultStartTime?: string;
  defaultEndTime?: string;
  /** Control open state externally */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Hide the trigger button (when opened programmatically) */
  hideTrigger?: boolean;
}

export function CreateSessionDialog({
  classes,
  rooms = [],
  onCreateSession,
  isCreating,
  defaultDate,
  defaultStartTime,
  defaultEndTime,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger,
}: CreateSessionDialogProps) {
  const { t } = useTranslation("logistics");
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const [forceSubmit, setForceSubmit] = useState(false);
  const [roomComboOpen, setRoomComboOpen] = useState(false);
  const { user } = useAuth();

  // Track if we have valid form data to avoid premature conflict clearing
  const hasValidFormData = useRef(false);

  // Check if user can force-save conflicts
  const canForceSave = user?.role === "OWNER" || user?.role === "ADMIN";

  const form = useForm<CreateSessionFormValues>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      classId: "",
      date: defaultDate,
      startTime: defaultStartTime ?? "09:00",
      endTime: defaultEndTime ?? "10:00",
      roomName: "",
      recurrence: "none",
    },
  });

  // Reset form when dialog opens (e.g., new slot click or re-open)
  useEffect(() => {
    if (open) {
      form.reset({
        classId: "",
        date: defaultDate,
        startTime: defaultStartTime ?? "09:00",
        endTime: defaultEndTime ?? "10:00",
        roomName: "",
        recurrence: "none",
      });
    }
  }, [open, defaultDate, defaultStartTime, defaultEndTime, form]);

  // Derive teacher name from selected class
  const selectedClassId = form.watch("classId");
  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const teacherName = selectedClass?.teacher?.name ?? null;

  // Pre-fill room from selected class's default room
  useEffect(() => {
    if (selectedClass?.defaultRoomName) {
      const currentRoom = form.getValues("roomName");
      // Only pre-fill if room is empty (don't override user's choice)
      if (!currentRoom) {
        form.setValue("roomName", selectedClass.defaultRoomName);
      }
    }
  }, [selectedClassId, selectedClass?.defaultRoomName, form]);

  // Conflict checking
  const {
    hasConflicts,
    roomConflicts,
    teacherConflicts,
    suggestions,
    checkConflicts,
    clearConflicts,
    isChecking,
    checkError,
  } = useConflictCheck();

  // Watch form values for debounced conflict checking
  const watchedValues = useWatch({
    control: form.control,
  });

  // Check for conflicts when form values change
  useEffect(() => {
    const { classId, date, startTime, endTime, roomName } = watchedValues;

    // Only check if we have enough data
    if (!classId || !date || !startTime || !endTime) {
      hasValidFormData.current = false;
      return;
    }

    // Parse times
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);

    const startDateTime = setMinutes(setHours(date, startHour), startMin);
    const endDateTime = setMinutes(setHours(date, endHour), endMin);

    // Only check if end is after start
    if (endDateTime <= startDateTime) {
      hasValidFormData.current = false;
      return;
    }

    hasValidFormData.current = true;

    // Debounced conflict check
    checkConflicts({
      classId,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      roomName: roomName || undefined,
    });
  }, [watchedValues, checkConflicts]);

  // Handle applying a suggestion
  const handleApplySuggestion = (suggestion: Suggestion) => {
    if (suggestion.type === "time" && suggestion.startTime && suggestion.endTime) {
      const start = new Date(suggestion.startTime);
      const end = new Date(suggestion.endTime);
      form.setValue(
        "startTime",
        `${start.getHours().toString().padStart(2, "0")}:${start.getMinutes().toString().padStart(2, "0")}`,
      );
      form.setValue(
        "endTime",
        `${end.getHours().toString().padStart(2, "0")}:${end.getMinutes().toString().padStart(2, "0")}`,
      );
    } else if (suggestion.type === "room") {
      form.setValue("roomName", suggestion.value);
    }
  };

  // Handle force save (submit despite conflicts)
  const handleForceSave = () => {
    setForceSubmit(true);
    form.handleSubmit(onSubmit)();
  };

  async function onSubmit(values: CreateSessionFormValues) {
    try {
      // Parse time strings and combine with date
      const [startHour, startMin] = values.startTime.split(":").map(Number);
      const [endHour, endMin] = values.endTime.split(":").map(Number);

      const startTime = setMinutes(setHours(values.date, startHour), startMin);
      const endTime = setMinutes(setHours(values.date, endHour), endMin);

      // Validate end time is after start time
      if (endTime <= startTime) {
        form.setError("endTime", { message: t("editSession.errorEndTime") });
        return;
      }

      // Block submission with conflicts unless force-saving (admins only)
      if (hasConflicts && !forceSubmit) {
        if (!canForceSave) {
          toast.error(t("createSession.toastResolveConflicts"));
          return;
        }
        // For admins, show a warning but allow them to use Force Save button
        toast.warning(t("editSession.toastConflictWarning"));
        return;
      }

      await onCreateSession({
        classId: values.classId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        roomName: values.roomName || undefined,
        recurrence: values.recurrence === "none" ? undefined : values.recurrence,
      });

      const successMessage =
        values.recurrence === "weekly"
          ? t("createSession.toastSuccessWeekly")
          : values.recurrence === "biweekly"
            ? t("createSession.toastSuccessBiweekly")
            : t("createSession.toastSuccess");
      toast.success(successMessage);
      setOpen(false);
      form.reset();
      clearConflicts();
      setForceSubmit(false);
    } catch {
      toast.error(t("createSession.toastError"));
      setForceSubmit(false);
    }
  }

  // Generate time options (every 30 minutes from 6 AM to 10 PM)
  const timeOptions = [];
  for (let hour = 6; hour <= 22; hour++) {
    for (const min of [0, 30]) {
      if (hour === 22 && min === 30) continue; // Skip 22:30
      const time = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
      const label = format(setMinutes(setHours(new Date(), hour), min), "h:mm a");
      timeOptions.push({ value: time, label });
    }
  }

  const recurrence = form.watch("recurrence");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            {t("createSession.addSession")}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("createSession.title")}</DialogTitle>
          <DialogDescription>
            {t("createSession.description")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="classId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("createSession.classLabel")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("createSession.classPlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                          {cls.course && (
                            <span className="text-muted-foreground ml-2">
                              ({cls.course.name})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Teacher (read-only, derived from class) */}
            {teacherName && (
              <div className="text-sm text-muted-foreground">
                {t("conflictDrawer.teacher")} <span className="font-medium text-foreground">{teacherName}</span>
              </div>
            )}

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t("editSession.date")}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>{t("editSession.datePlaceholder")}</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("editSession.startTime")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("editSession.startTimePlaceholder")} />
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
                    <FormLabel>{t("editSession.endTime")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("editSession.endTimePlaceholder")} />
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

            {/* Room Combobox */}
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

            {/* Recurrence */}
            <FormField
              control={form.control}
              name="recurrence"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("createSession.recurrence")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? "none"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("createSession.recurrencePlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">{t("createSession.recurrenceNone")}</SelectItem>
                      <SelectItem value="weekly">{t("createSession.recurrenceWeekly")}</SelectItem>
                      <SelectItem value="biweekly">{t("createSession.recurrenceBiweekly")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Recurrence info */}
            {recurrence && recurrence !== "none" && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  {recurrence === "weekly"
                    ? t("createSession.recurrenceWeeklyInfo")
                    : t("createSession.recurrenceBiweeklyInfo")}
                </span>
              </div>
            )}

            {/* Conflict check error */}
            {checkError && (
              <p className="text-sm text-destructive">
                {t("editSession.errorConflictCheck")}
              </p>
            )}

            {/* Conflict Warning Banner */}
            {hasConflicts && (
              <ConflictWarningBanner
                roomConflicts={roomConflicts}
                teacherConflicts={teacherConflicts}
                suggestions={suggestions}
                onApplySuggestion={handleApplySuggestion}
                onForceSave={handleForceSave}
                isForcing={isCreating && forceSubmit}
              />
            )}

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isCreating || isChecking}>
                {isCreating ? t("createSession.creating") : isChecking ? t("editSession.checking") : t("createSession.title")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
