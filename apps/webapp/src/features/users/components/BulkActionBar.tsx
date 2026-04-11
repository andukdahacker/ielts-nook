import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@workspace/ui/components/button";
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
import { UserMinus, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useBulkDeactivate, useBulkRemind } from "../users.api";

interface BulkActionBarProps {
  selectedCount: number;
  selectedUserIds: string[];
  onClear: () => void;
}

export function BulkActionBar({
  selectedCount,
  selectedUserIds,
  onClear,
}: BulkActionBarProps) {
  const { t } = useTranslation("users");
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const bulkDeactivateMutation = useBulkDeactivate();
  const bulkRemindMutation = useBulkRemind();

  const isLoading = bulkDeactivateMutation.isPending || bulkRemindMutation.isPending;

  const handleBulkDeactivate = async () => {
    try {
      const result = await bulkDeactivateMutation.mutateAsync({
        userIds: selectedUserIds,
      });
      toast.success(t("bulkDeactivate.success", { count: result.data.processed }));
      setShowDeactivateDialog(false);
      onClear();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to deactivate users");
    }
  };

  const handleBulkRemind = async () => {
    try {
      const result = await bulkRemindMutation.mutateAsync({
        userIds: selectedUserIds,
      });
      toast.success(t("bulkRemind.success", { count: result.data.processed }));
      onClear();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("bulkRemind.error"));
    }
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="flex items-center gap-4 rounded-md bg-muted p-3 mb-4">
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
        <span className="text-sm font-medium">{selectedCount} {t("bulkAction.selected")}</span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeactivateDialog(true)}
            disabled={isLoading}
          >
            <UserMinus className="mr-2 h-4 w-4" />
            {t("bulkAction.deactivate")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkRemind}
            disabled={isLoading}
          >
            <Mail className="mr-2 h-4 w-4" />
            {bulkRemindMutation.isPending ? t("bulkAction.sending") : t("bulkAction.sendReminder")}
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear} className="ml-auto" disabled={isLoading}>
          {t("bulkAction.clearSelection")}
        </Button>
      </div>

      {/* Bulk Deactivate Confirmation Dialog */}
      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("bulkDeactivate.title", { count: selectedCount })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("bulkDeactivate.description", { count: selectedCount })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeactivateMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDeactivateMutation.isPending}
            >
              {bulkDeactivateMutation.isPending ? t("bulkDeactivate.confirming") : t("bulkDeactivate.confirm", { count: selectedCount })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
