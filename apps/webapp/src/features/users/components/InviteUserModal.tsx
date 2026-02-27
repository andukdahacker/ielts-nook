import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreateInvitationRequestSchema,
  type CreateInvitationRequest,
} from "@workspace/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Button } from "@workspace/ui/components/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createInvitation } from "../invitation.api";
import { toast } from "sonner";
import { Plus, AlertTriangle } from "lucide-react";
import { useBillingOverview } from "@/features/settings/billing.api";

interface InviteUserModalProps {
  onSuccess?: () => void;
}

export function InviteUserModal({ onSuccess }: InviteUserModalProps = {}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: billingData } = useBillingOverview({ staleTime: 5 * 60 * 1000 });

  const form = useForm<CreateInvitationRequest>({
    resolver: zodResolver(CreateInvitationRequestSchema),
    defaultValues: {
      email: "",
      role: "STUDENT",
      personalMessage: "",
    },
  });

  const mutation = useMutation({
    mutationFn: createInvitation,
    onSuccess: () => {
      toast.success("Invitation sent successfully");
      setOpen(false);
      form.reset();
      // Invalidate users and invitations lists
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      // Handle duplicate email error inline
      const errorMessage = error.message || "Failed to send invitation";
      if (
        errorMessage.toLowerCase().includes("already") ||
        errorMessage.toLowerCase().includes("duplicate") ||
        errorMessage.toLowerCase().includes("exists")
      ) {
        form.setError("email", {
          type: "manual",
          message: "This email has already been invited or is already a member",
        });
      } else {
        toast.error(errorMessage);
      }
    },
  });

  function onSubmit(values: CreateInvitationRequest) {
    mutation.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Invite a new teacher or student to your center.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="email@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="TEACHER">Teacher</SelectItem>
                      <SelectItem value="STUDENT">Student</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="personalMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personal Message (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a personal message to the invitation email..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Maximum 500 characters
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            {billingData?.subscription.status === "inactive" &&
              form.watch("role") === "STUDENT" && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-800">
                    New student enrollments are paused. Please update your billing to invite students.
                  </p>
                </div>
              )}
            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={
                  mutation.isPending ||
                  (billingData?.subscription.status === "inactive" &&
                    form.watch("role") === "STUDENT")
                }
              >
                {mutation.isPending ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
