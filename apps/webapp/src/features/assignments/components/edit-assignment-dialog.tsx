import { useAuth } from "@/features/auth/auth-context";
import type { Assignment } from "@workspace/types";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAssignments } from "../hooks/use-assignments";

interface EditAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: Assignment;
}

export function EditAssignmentDialog({
  open,
  onOpenChange,
  assignment,
}: EditAssignmentDialogProps) {
  const { t } = useTranslation("assignments");
  const { user } = useAuth();
  const centerId = user?.centerId;
  const { updateAssignment, isUpdating } = useAssignments(centerId ?? undefined);

  const [dueDate, setDueDate] = useState("");
  const [timeLimit, setTimeLimit] = useState("");
  const [instructions, setInstructions] = useState("");

  useEffect(() => {
    if (assignment) {
      setDueDate(
        assignment.dueDate
          ? new Date(assignment.dueDate).toISOString().slice(0, 16)
          : "",
      );
      setTimeLimit(assignment.timeLimit ? String(Math.floor(assignment.timeLimit / 60)) : "");
      setInstructions(assignment.instructions ?? "");
    }
  }, [assignment]);

  const handleSubmit = async () => {
    if (timeLimit && (isNaN(Number(timeLimit)) || Number(timeLimit) <= 0)) {
      toast.error(t("edit.toastPositiveTime"));
      return;
    }

    try {
      await updateAssignment({
        id: assignment.id,
        input: {
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          timeLimit: timeLimit ? Number(timeLimit) * 60 : null,
          instructions: instructions || null,
        },
      });
      toast.success(t("edit.toastSuccess"));
      onOpenChange(false);
    } catch {
      toast.error(t("edit.toastError"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{t("edit.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">{assignment?.exercise?.title}</p>
            <p className="text-xs text-muted-foreground">
              {assignment?.class?.name ?? t("edit.individual")}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{t("edit.dueDateLabel")}</Label>
            <Input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("edit.timeLimitLabel")}</Label>
            <Input
              type="number"
              min="1"
              placeholder={t("edit.timeLimitPlaceholder")}
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("edit.instructionsLabel")}</Label>
            <Textarea
              placeholder={t("edit.instructionsPlaceholder")}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              maxLength={2000}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("button.cancel", { ns: "common" })}
          </Button>
          <Button onClick={handleSubmit} disabled={isUpdating}>
            {isUpdating && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("button.save", { ns: "common" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
