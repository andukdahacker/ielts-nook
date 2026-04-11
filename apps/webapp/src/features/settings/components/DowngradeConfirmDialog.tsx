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
import { useTranslation } from "react-i18next";

interface DowngradeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  tierName: string;
  maxStudents: number;
  enrolledStudents: number;
}

export function DowngradeConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  tierName,
  maxStudents,
  enrolledStudents,
}: DowngradeConfirmDialogProps) {
  const { t } = useTranslation("settings");
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("billing.downgradeTitle", { tierName })}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("billing.downgradeDescription", { enrolledStudents, tierName, maxStudents })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("button.cancel", { ns: "common" })}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {t("billing.continueToPortal")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
