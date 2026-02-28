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
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Downgrade to {tierName}?</AlertDialogTitle>
          <AlertDialogDescription>
            You have{" "}
            <span className="font-medium text-foreground">
              {enrolledStudents} students
            </span>{" "}
            enrolled. The {tierName} plan supports up to{" "}
            <span className="font-medium text-foreground">
              {maxStudents} students
            </span>
            . Excess students may be affected when the downgrade takes effect at
            the next billing cycle.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Continue to Portal
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
