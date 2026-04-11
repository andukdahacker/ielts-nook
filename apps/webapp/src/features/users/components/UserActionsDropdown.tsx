import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { MoreHorizontal, User, UserCog, UserMinus, UserCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
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
import { Button } from "@workspace/ui/components/button";
import { toast } from "sonner";
import type { UserListItem } from "@workspace/types";
import { useAuth } from "@/features/auth/auth-context";
import { RBACWrapper } from "@/features/auth/components/RBACWrapper";
import { useDeactivateUser, useReactivateUser } from "../users.api";
import { RoleChangeModal } from "./RoleChangeModal";

interface UserActionsDropdownProps {
  user: UserListItem;
}

export function UserActionsDropdown({ user }: UserActionsDropdownProps) {
  const { t } = useTranslation("users");
  const navigate = useNavigate();
  const { centerId } = useParams<{ centerId: string }>();
  const { user: currentUser } = useAuth();
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showRoleChangeModal, setShowRoleChangeModal] = useState(false);

  const deactivateMutation = useDeactivateUser();
  const reactivateMutation = useReactivateUser();

  const isCurrentUser = currentUser?.userId === user.id;
  const isOwner = user.role === "OWNER";
  const isDeactivated = user.status === "SUSPENDED";

  const handleViewProfile = () => {
    navigate(`/${centerId}/dashboard/profile/${user.id}`);
  };

  const handleDeactivate = async () => {
    try {
      await deactivateMutation.mutateAsync(user.id);
      toast.success(t("userActions.deactivateSuccess"));
      setShowDeactivateDialog(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("userActions.deactivateError"));
    }
  };

  const handleReactivate = async () => {
    try {
      await reactivateMutation.mutateAsync(user.id);
      toast.success(t("userActions.reactivateSuccess"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("userActions.reactivateError"));
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">{t("userActions.menuTrigger")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleViewProfile}>
            <User className="mr-2 h-4 w-4" />
            {t("userActions.viewProfile")}
          </DropdownMenuItem>

          <RBACWrapper requiredRoles={["OWNER"]}>
            {!isOwner && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowRoleChangeModal(true)}>
                  <UserCog className="mr-2 h-4 w-4" />
                  {t("userActions.changeRole")}
                </DropdownMenuItem>
              </>
            )}
          </RBACWrapper>

          {!isOwner && !isCurrentUser && (
            <>
              <DropdownMenuSeparator />
              {isDeactivated ? (
                <DropdownMenuItem
                  onClick={handleReactivate}
                  disabled={reactivateMutation.isPending}
                >
                  <UserCheck className="mr-2 h-4 w-4" />
                  {t("userActions.reactivate")}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => setShowDeactivateDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <UserMinus className="mr-2 h-4 w-4" />
                  {t("userActions.deactivate")}
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("userActions.deactivateTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("userActions.deactivateDescription", { user: user.name || user.email })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deactivateMutation.isPending ? t("userActions.deactivateConfirming") : t("userActions.deactivateConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Role Change Modal */}
      <RoleChangeModal
        user={user}
        open={showRoleChangeModal}
        onOpenChange={setShowRoleChangeModal}
      />
    </>
  );
}
