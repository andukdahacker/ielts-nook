import { useState } from "react";
import { formatDistanceToNow, addHours, isPast } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
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
import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useInvitations, useResendInvitation, useRevokeInvitation } from "../users.api";

const INVITATION_EXPIRY_HOURS = 48;

const roleBadgeVariants: Record<string, string> = {
  OWNER: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  ADMIN: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  TEACHER: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  STUDENT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

export function PendingInvitationsTable() {
  const { data: invitations, isLoading } = useInvitations("INVITED");
  const [revokeId, setRevokeId] = useState<string | null>(null);

  const resendMutation = useResendInvitation();
  const revokeMutation = useRevokeInvitation();

  const handleResend = async (id: string) => {
    try {
      await resendMutation.mutateAsync(id);
      toast.success("Invitation resent successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to resend invitation");
    }
  };

  const handleRevoke = async () => {
    if (!revokeId) return;

    try {
      await revokeMutation.mutateAsync(revokeId);
      toast.success("Invitation revoked successfully");
      setRevokeId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to revoke invitation");
    }
  };

  const isExpired = (createdAt: string) => {
    const expiresAt = addHours(new Date(createdAt), INVITATION_EXPIRY_HOURS);
    return isPast(expiresAt);
  };

  const getExpiresAt = (createdAt: string) => {
    return addHours(new Date(createdAt), INVITATION_EXPIRY_HOURS);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invitations || invitations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No pending invitations
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((invitation) => {
              const expired = isExpired(invitation.createdAt);
              const expiresAt = getExpiresAt(invitation.createdAt);

              return (
                <TableRow key={invitation.id}>
                  <TableCell className="font-medium">{invitation.email}</TableCell>
                  <TableCell>
                    <Badge className={roleBadgeVariants[invitation.role]} variant="outline">
                      {invitation.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(invitation.createdAt), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {expired ? (
                      <span className="text-destructive">Expired</span>
                    ) : (
                      formatDistanceToNow(expiresAt, { addSuffix: true })
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={expired ? "destructive" : "secondary"}
                      className="capitalize"
                    >
                      {expired ? "Expired" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleResend(invitation.id)}
                        disabled={resendMutation.isPending}
                        title="Resend invitation"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setRevokeId(invitation.id)}
                        disabled={revokeMutation.isPending}
                        title="Revoke invitation"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={!!revokeId} onOpenChange={(open) => !open && setRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this invitation? The user will no longer
              be able to join using this invitation link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokeMutation.isPending ? "Revoking..." : "Revoke"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
