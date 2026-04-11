import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Check, X, Loader2, Merge } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { useTags } from "@/features/exercises/hooks/use-tags";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Badge } from "@workspace/ui/components/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

export function TagsSettingsPage() {
  const { t } = useTranslation("settings");
  const { user } = useAuth();
  const { tags, isLoading, createTag, isCreating, updateTag, deleteTag, mergeTags } =
    useTags(user?.centerId);

  const [newTagName, setNewTagName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string>("");

  const handleCreate = async () => {
    const trimmed = newTagName.trim();
    if (!trimmed) return;

    try {
      await createTag({ name: trimmed });
      setNewTagName("");
      toast.success(t("tags.toastCreated"));
    } catch {
      toast.error(t("tags.toastCreateFailed"));
    }
  };

  const handleUpdate = async (id: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;

    try {
      await updateTag({ id, input: { name: trimmed } });
      setEditingId(null);
      toast.success(t("tags.toastUpdated"));
    } catch {
      toast.error(t("tags.toastUpdateFailed"));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTag(id);
      toast.success(t("tags.toastDeleted"));
    } catch {
      toast.error(t("tags.toastDeleteFailed"));
    }
  };

  const handleMerge = async () => {
    if (!mergeSourceId || !mergeTargetId) return;

    try {
      await mergeTags({
        sourceTagId: mergeSourceId,
        targetTagId: mergeTargetId,
      });
      setMergeDialogOpen(false);
      setMergeSourceId(null);
      setMergeTargetId("");
      toast.success(t("tags.toastMerged"));
    } catch {
      toast.error(t("tags.toastMergeFailed"));
    }
  };

  const startEditing = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
  };

  const openMergeDialog = (sourceId: string) => {
    setMergeSourceId(sourceId);
    setMergeTargetId("");
    setMergeDialogOpen(true);
  };

  const sourceTag = tags.find((t) => t.id === mergeSourceId);
  const mergeTargetOptions = tags.filter((t) => t.id !== mergeSourceId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("tags.heading")}</h2>
        <p className="text-muted-foreground">
          {t("tags.description")}
        </p>
      </div>

      {/* Add Tag */}
      <div className="flex gap-2">
        <Input
          placeholder={t("tags.newTagPlaceholder")}
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
          className="max-w-sm"
        />
        <Button
          onClick={handleCreate}
          disabled={isCreating || !newTagName.trim()}
          size="sm"
        >
          {isCreating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          {t("tags.addButton")}
        </Button>
      </div>

      {/* Tag List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tags.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          {t("tags.empty")}
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between px-4 py-3"
            >
              {editingId === tag.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdate(tag.id);
                      if (e.key === "Escape") cancelEditing();
                    }}
                    className="max-w-sm"
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleUpdate(tag.id)}
                    disabled={!editingName.trim()}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={cancelEditing}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{tag.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {tag._count?.tagAssignments ?? 0} exercise
                      {(tag._count?.tagAssignments ?? 0) !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startEditing(tag.id, tag.name)}
                      title="Rename"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openMergeDialog(tag.id)}
                      title="Merge"
                      disabled={tags.length < 2}
                    >
                      <Merge className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" title="Delete">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Tag</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete &quot;{tag.name}
                            &quot;? This will remove it from{" "}
                            {tag._count?.tagAssignments ?? 0} exercise
                            {(tag._count?.tagAssignments ?? 0) !== 1
                              ? "s"
                              : ""}
                            .
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(tag.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Merge Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Tag</DialogTitle>
            <DialogDescription>
              Merge &quot;{sourceTag?.name}&quot; into another tag. All
              exercises with this tag will be reassigned to the target tag,
              and &quot;{sourceTag?.name}&quot; will be deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-sm font-medium">Merge into:</Label>
            <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select target tag" />
              </SelectTrigger>
              <SelectContent>
                {mergeTargetOptions.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t._count?.tagAssignments ?? 0} exercises)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMergeDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleMerge} disabled={!mergeTargetId}>
              Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

