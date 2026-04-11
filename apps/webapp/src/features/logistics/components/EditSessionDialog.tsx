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
import { ChevronsUpDown, Check, CalendarIcon } from "lucide-react";
import { Calendar } from "@workspace/ui/components/calendar";
import { cn } from "@workspace/ui/lib/utils";
import type { ClassSession, Room, Suggestion, UpdateClassSessionInput } from "@workspace/types";
import { useConflictCheck } from "../hooks/use-conflict-check";
import { ConflictWarningBanner } from "./ConflictWarningBanner";

type SessionWithDetails = ClassSession & {
  class?: {
    name: string;
    course?: { name: string; color?: string | null };
    teacher?: { id: string; name: string | null } | null;
    _count?: { students: number };
  };
};

const editSessionSchema = z.object({
  date: z.date({ required_error: "Please select a date" }),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  roomName: z.string().optional(),
});

type EditSessionFormValues = z.infer<typeof editSessionSchema>;

interface EditSessionDialogProps {
  session: SessionWithDetails;
  rooms?: Room[];
  onUpdateSession: (params: { id: string; input: UpdateClassSessionInput }) => Promise<unknown>;
  isUpdating: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditSessionDialog({
  session,
  rooms = [],
  onUpdateSession,
  isUpdating,
  open,
  onOpenChange,
}: EditSessionDialogProps) {
  const { t } = useTranslation("logistics");
  const [forceSubmit, setForceSubmit] = useState(false);
  const [roomComboOpen, setRoomComboOpen] = useState(false);
  const { user } = useAuth();
  const hasValidFormData = useRef(false);
  const canForceSave = user?.role === "OWNER" || user?.role === "ADMIN";

  const startDate = new Date(session.startTime);
  const endDate = new Date(session.endTime);

  const form = useForm<EditSessionFormValues>({
    resolver: zodResolver(editSessionSchema),
    defaultValues: {
      date: startDate,
      startTime: format(startDate, "HH:mm"),
      endTime: format(endDate, "HH:mm"),
      roomName: session.roomName ?? "",
    },
  });

  // Reset when session changes
  useEffect(() => {
    if (open) {
      const start = new Date(session.startTime);
      const end = new Date(session.endTime);
      form.reset({
        date: start,
        startTime: format(start, "HH:mm"),
        endTime: format(end, "HH:mm"),
        roomName: session.roomName ?? "",
      });
    }
  }, [open, session, form]);

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

  const watchedValues = useWatch({ control: form.control });

  useEffect(() => {
    const { date, startTime, endTime, roomName } = watchedValues;
    if (!date || !startTime || !endTime) {
      hasValidFormData.current = false;
      return;
    }

    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);
    const startDateTime = setMinutes(setHours(date, startHour), startMin);
    const endDateTime = setMinutes(setHours(date, endHour), endMin);

    if (endDateTime <= startDateTime) {
      hasValidFormData.current = false;
      return;
    }

    hasValidFormData.current = true;

    checkConflicts({
      classId: session.classId,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      roomName: roomName || undefined,
      excludeSessionId: session.id,
    });
  }, [watchedValues, checkConflicts, session.classId, session.id]);

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

  const handleForceSave = () => {
    setForceSubmit(true);
    form.handleSubmit(onSubmit)();
  };

  async function onSubmit(values: EditSessionFormValues) {
    try {
      const [startHour, startMin] = values.startTime.split(":").map(Number);
      const [endHour, endMin] = values.endTime.split(":").map(Number);

      const newStartTime = setMinutes(setHours(values.date, startHour), startMin);
      const newEndTime = setMinutes(setHours(values.date, endHour), endMin);

      if (newEndTime <= newStartTime) {
        form.setError("endTime", { message: t("editSession.errorEndTime") });
        return;
      }

      if (hasConflicts && !forceSubmit) {
        if (!canForceSave) {
          toast.error(t("editSession.toastResolveConflicts"));
          return;
        }
        toast.warning(t("editSession.toastConflictWarning"));
        return;
      }

      await onUpdateSession({
        id: session.id,
        input: {
          startTime: newStartTime.toISOString(),
          endTime: newEndTime.toISOString(),
          roomName: values.roomName || undefined,
        },
      });

      toast.success(t("editSession.toastSuccess"));
      onOpenChange(false);
      clearConflicts();
      setForceSubmit(false);
    } catch {
      toast.error(t("editSession.toastError"));
      setForceSubmit(false);
    }
  }

  // Generate time options
  const timeOptions = [];
  for (let hour = 6; hour <= 22; hour++) {
    for (const min of [0, 30]) {
      if (hour === 22 && min === 30) continue;
      const time = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
      const label = format(setMinutes(setHours(new Date(), hour), min), "h:mm a");
      timeOptions.push({ value: time, label });
    }
  }

  const courseName = session.class?.course?.name ?? t("sessionBlock.courseFallback");
  const className = session.class?.name ?? t("sessionBlock.classFallback");
  const teacherName = session.class?.teacher?.name ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("editSession.title")}</DialogTitle>
          <DialogDescription>
            {courseName} - {className}
          </DialogDescription>
        </DialogHeader>
        {teacherName && (
          <div className="text-sm text-muted-foreground">
            {t("conflictDrawer.teacher")} <span className="font-medium text-foreground">{teacherName}</span>
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            {checkError && (
              <p className="text-sm text-destructive">
                {t("editSession.errorConflictCheck")}
              </p>
            )}

            {hasConflicts && (
              <ConflictWarningBanner
                roomConflicts={roomConflicts}
                teacherConflicts={teacherConflicts}
                suggestions={suggestions}
                onApplySuggestion={handleApplySuggestion}
                onForceSave={handleForceSave}
                isForcing={isUpdating && forceSubmit}
              />
            )}

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isUpdating || isChecking}>
                {isUpdating ? t("editSession.saving") : isChecking ? t("editSession.checking") : t("button.saveChanges", { ns: "common" })}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
