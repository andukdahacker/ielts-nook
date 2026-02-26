import { useState } from "react";
import {
  useParentEmails,
  useAddParentEmail,
  useRemoveParentEmail,
} from "../users.api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const MAX_PARENT_EMAILS = 3;

export function ParentEmailSection({ userId }: { userId: string }) {
  const [newEmail, setNewEmail] = useState("");
  const { data: parentEmails, isLoading } = useParentEmails(userId);
  const addEmail = useAddParentEmail();
  const removeEmail = useRemoveParentEmail();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim();
    if (!email) return;

    try {
      await addEmail.mutateAsync({ userId, email });
      toast.success("Parent email added");
      setNewEmail("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add parent email",
      );
    }
  };

  const handleRemove = async (parentEmailId: string, email: string) => {
    if (!window.confirm(`Remove ${email}?`)) return;

    try {
      await removeEmail.mutateAsync({ userId, parentEmailId });
      toast.success("Parent email removed");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to remove parent email",
      );
    }
  };

  const atLimit = (parentEmails?.length ?? 0) >= MAX_PARENT_EMAILS;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Parent/Guardian Emails</CardTitle>
        <CardDescription>
          Manage parent email addresses for this student. Parents will receive
          achievement notifications and intervention alerts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {parentEmails && parentEmails.length > 0 ? (
              <div className="space-y-2">
                {parentEmails.map((pe) => (
                  <div
                    key={pe.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{pe.email}</span>
                      {pe.unsubscribed && (
                        <Badge variant="secondary" className="text-xs">
                          Unsubscribed
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(pe.id, pe.email)}
                      disabled={removeEmail.isPending}
                    >
                      {removeEmail.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No parent emails registered.
              </p>
            )}

            <form onSubmit={handleAdd} className="flex gap-2">
              <Input
                type="email"
                placeholder="parent@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={atLimit || addEmail.isPending}
                className="flex-1"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!newEmail.trim() || atLimit || addEmail.isPending}
              >
                {addEmail.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </>
                )}
              </Button>
            </form>
            {atLimit && (
              <p className="text-xs text-muted-foreground">
                Maximum {MAX_PARENT_EMAILS} parent emails per student.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
