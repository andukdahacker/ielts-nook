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

interface SubmitConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  totalQuestions: number;
  answeredCount: number;
  isSubmitting: boolean;
}

export function SubmitConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  totalQuestions,
  answeredCount,
  isSubmitting,
}: SubmitConfirmDialogProps) {
  const { t } = useTranslation("submissions");
  const unanswered = totalQuestions - answeredCount;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("confirmDialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {unanswered > 0 ? (
              <>
                {t("confirmDialog.answered", { answeredCount, totalQuestions })}{" "}
                <span className="font-medium text-destructive">
                  {t("confirmDialog.unanswered", { unanswered })}
                </span>{" "}
                {t("confirmDialog.warning")}
              </>
            ) : (
              t("confirmDialog.allAnswered", { totalQuestions })
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>{t("confirmDialog.goBack")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? t("confirmDialog.submitting") : t("stepper.submit")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
