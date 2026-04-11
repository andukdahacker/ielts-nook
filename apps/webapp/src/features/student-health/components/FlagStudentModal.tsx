import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useCreateFlag } from "../hooks/use-student-flags";

interface FlagStudentModalProps {
  studentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FlagStudentModal({
  studentId,
  open,
  onOpenChange,
}: FlagStudentModalProps) {
  const { t } = useTranslation("student-health");
  const [note, setNote] = useState("");
  const createFlag = useCreateFlag(studentId);

  const handleSubmit = () => {
    createFlag.mutate(
      { studentId, note },
      {
        onSuccess: () => {
          toast.success(t("flagModal.toastSuccess"));
          setNote("");
          onOpenChange(false);
        },
        onError: () => {
          toast.error(t("flagModal.toastError"));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("flagModal.title")}</DialogTitle>
          <DialogDescription>
            {t("flagModal.description")}
          </DialogDescription>
        </DialogHeader>

        <Textarea
          placeholder={t("flagModal.placeholder")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          className="resize-none"
        />

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            {t("button.cancel", { ns: "common" })}
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={note.length < 10 || createFlag.isPending}
          >
            {createFlag.isPending ? t("flagModal.flagging") : t("flagModal.flagButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
