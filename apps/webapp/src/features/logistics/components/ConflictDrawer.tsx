import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Button } from "@workspace/ui/components/button";
import { AlertTriangle, Clock, DoorOpen, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { RBACWrapper } from "@/features/auth/components/RBACWrapper";
import type { ConflictingSession, Suggestion } from "@workspace/types";
import { format } from "date-fns";

interface ConflictDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionName?: string;
  roomConflicts: ConflictingSession[];
  teacherConflicts: ConflictingSession[];
  suggestions?: Suggestion[];
  onApplySuggestion?: (suggestion: Suggestion) => void;
  onForceSave?: () => void;
  isForcing?: boolean;
}

export function ConflictDrawer({
  open,
  onOpenChange,
  sessionName,
  roomConflicts,
  teacherConflicts,
  suggestions = [],
  onApplySuggestion,
  onForceSave,
  isForcing,
}: ConflictDrawerProps) {
  const { t } = useTranslation("logistics");
  const timeSuggestions = suggestions.filter((s) => s.type === "time");
  const roomSuggestions = suggestions.filter((s) => s.type === "room");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="size-5" />
            {t("conflictDrawer.title")}
          </SheetTitle>
          <SheetDescription>
            {sessionName
              ? t("conflictDrawer.descriptionDetected", { sessionName })
              : t("conflictDrawer.descriptionGeneral")}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Room Conflicts */}
          {roomConflicts.length > 0 && (
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 font-semibold text-red-700">
                <DoorOpen className="size-4" />
                {t("conflictDrawer.roomDoubleBooking", { count: roomConflicts.length })}
              </h3>
              <div className="space-y-2">
                {roomConflicts.map((conflict) => (
                  <div
                    key={conflict.id}
                    className="rounded-lg border border-red-200 bg-red-50 p-3"
                  >
                    <div className="font-medium text-red-800">
                      {conflict.roomName}
                    </div>
                    <div className="text-sm text-red-700">
                      {conflict.courseName} - {conflict.className}
                    </div>
                    <div className="text-sm text-red-600">
                      {format(new Date(conflict.startTime), "h:mm a")} -{" "}
                      {format(new Date(conflict.endTime), "h:mm a")}
                    </div>
                    {conflict.teacherName && (
                      <div className="text-sm text-red-600">
                        {t("conflictDrawer.teacher")} {conflict.teacherName}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Teacher Conflicts */}
          {teacherConflicts.length > 0 && (
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 font-semibold text-orange-700">
                <Clock className="size-4" />
                {t("conflictDrawer.teacherDoubleBooking", { count: teacherConflicts.length })}
              </h3>
              <div className="space-y-2">
                {teacherConflicts.map((conflict) => (
                  <div
                    key={conflict.id}
                    className="rounded-lg border border-orange-200 bg-orange-50 p-3"
                  >
                    <div className="font-medium text-orange-800">
                      {conflict.teacherName ?? t("conflictDrawer.assignedTeacher")}
                    </div>
                    <div className="text-sm text-orange-700">
                      {conflict.courseName} - {conflict.className}
                    </div>
                    <div className="text-sm text-orange-600">
                      {format(new Date(conflict.startTime), "h:mm a")} -{" "}
                      {format(new Date(conflict.endTime), "h:mm a")}
                    </div>
                    {conflict.roomName && (
                      <div className="text-sm text-orange-600">
                        {t("conflictDrawer.room")} {conflict.roomName}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {(timeSuggestions.length > 0 || roomSuggestions.length > 0) && (
            <div className="space-y-3 border-t pt-4">
              <h3 className="font-semibold text-green-700">
                {t("conflictDrawer.availableAlternatives")}
              </h3>

              {timeSuggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {t("conflictDrawer.alternativeTimeslots")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {timeSuggestions.map((suggestion, idx) => (
                      <Button
                        key={`time-${idx}`}
                        variant="outline"
                        size="sm"
                        className="border-green-400 text-green-700 hover:bg-green-50"
                        onClick={() => onApplySuggestion?.(suggestion)}
                      >
                        <Clock className="mr-1 size-3" />
                        {suggestion.value}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {roomSuggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {t("conflictDrawer.availableRooms")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {roomSuggestions.map((suggestion, idx) => (
                      <Button
                        key={`room-${idx}`}
                        variant="outline"
                        size="sm"
                        className="border-green-400 text-green-700 hover:bg-green-50"
                        onClick={() => onApplySuggestion?.(suggestion)}
                      >
                        <DoorOpen className="mr-1 size-3" />
                        {suggestion.value}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="mr-1 size-4" />
              {t("button.close", { ns: "common" })}
            </Button>
            <RBACWrapper requiredRoles={["OWNER", "ADMIN"]}>
              <Button
                variant="destructive"
                onClick={onForceSave}
                disabled={isForcing}
              >
                {isForcing ? t("conflictDrawer.forceSaving") : t("conflictDrawer.forceSave")}
              </Button>
            </RBACWrapper>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
