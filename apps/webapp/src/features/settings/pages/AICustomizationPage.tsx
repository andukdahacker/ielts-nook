import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { useAuth } from "@/features/auth/auth-context";
import {
  useGoldenSamples,
  useCreateGoldenSample,
  useUpdateGoldenSample,
  useDeleteGoldenSample,
  useToggleGoldenSample,
  useReorderGoldenSamples,
  goldenSampleKeys,
} from "../golden-samples.api";
import { GoldenSampleForm } from "../components/GoldenSampleForm";
import { Button } from "@workspace/ui/components/button";
import { Switch } from "@workspace/ui/components/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { Plus, Pencil, Trash2, Loader2, GripVertical } from "lucide-react";

const MAX_SAMPLES_PER_SKILL = 10;

interface GoldenSample {
  id: string;
  title: string;
  skillType: "WRITING" | "SPEAKING";
  studentWork: string;
  teacherFeedback: string;
  isActive: boolean;
  order: number;
  createdAt: string;
}

export function AICustomizationPage() {
  const { t } = useTranslation("settings");
  const { t: tCommon } = useTranslation("common");
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";
  const queryClient = useQueryClient();

  const { data: samples, isLoading } = useGoldenSamples();
  const createMutation = useCreateGoldenSample();
  const updateMutation = useUpdateGoldenSample();
  const deleteMutation = useDeleteGoldenSample();
  const toggleMutation = useToggleGoldenSample();
  const reorderMutation = useReorderGoldenSamples();

  const [activeTab, setActiveTab] = useState<"WRITING" | "SPEAKING">("WRITING");
  const [formOpen, setFormOpen] = useState(false);
  const [editingSample, setEditingSample] = useState<GoldenSample | null>(null);
  const [deletingSample, setDeletingSample] = useState<GoldenSample | null>(null);

  const writingSamples = (samples ?? []).filter((s: GoldenSample) => s.skillType === "WRITING").sort((a: GoldenSample, b: GoldenSample) => a.order - b.order);
  const speakingSamples = (samples ?? []).filter((s: GoldenSample) => s.skillType === "SPEAKING").sort((a: GoldenSample, b: GoldenSample) => a.order - b.order);

  const handleCreate = useCallback(async (values: { title: string; skillType: "WRITING" | "SPEAKING"; studentWork: string; teacherFeedback: string }) => {
    try {
      await createMutation.mutateAsync(values);
      toast.success(t("ai.toastCreated"));
      setFormOpen(false);
    } catch {
      toast.error(t("ai.toastErrorCreate"));
    }
  }, [createMutation, t]);

  const handleUpdate = useCallback(async (values: { title: string; skillType: "WRITING" | "SPEAKING"; studentWork: string; teacherFeedback: string }) => {
    if (!editingSample) return;
    try {
      await updateMutation.mutateAsync({
        id: editingSample.id,
        title: values.title,
        studentWork: values.studentWork,
        teacherFeedback: values.teacherFeedback,
      });
      toast.success(t("ai.toastUpdated"));
      setEditingSample(null);
    } catch {
      toast.error(t("ai.toastErrorUpdate"));
    }
  }, [editingSample, updateMutation, t]);

  const handleDelete = useCallback(async () => {
    if (!deletingSample) return;
    try {
      await deleteMutation.mutateAsync(deletingSample.id);
      toast.success(t("ai.toastDeleted"));
      setDeletingSample(null);
    } catch {
      toast.error(t("ai.toastErrorDelete"));
    }
  }, [deletingSample, deleteMutation, t]);

  const handleToggle = useCallback(async (sample: GoldenSample) => {
    try {
      await toggleMutation.mutateAsync({ id: sample.id, isActive: !sample.isActive });
      toast.success(sample.isActive ? t("ai.toastDeactivated") : t("ai.toastActivated"));
    } catch {
      toast.error(t("ai.toastErrorToggle"));
    }
  }, [toggleMutation, t]);

  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;

    const skillType = result.source.droppableId as "WRITING" | "SPEAKING";
    const items = skillType === "WRITING" ? [...writingSamples] : [...speakingSamples];
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);

    const reorderedIds = items.map((s) => s.id);

    // Optimistic update
    queryClient.setQueryData(goldenSampleKeys.list(), (old: GoldenSample[] | undefined) => {
      if (!old) return old;
      const orderMap = new Map(reorderedIds.map((id, idx) => [id, idx]));
      return old.map((s) => orderMap.has(s.id) ? { ...s, order: orderMap.get(s.id)! } : s);
    });

    try {
      await reorderMutation.mutateAsync(reorderedIds);
    } catch {
      queryClient.invalidateQueries({ queryKey: goldenSampleKeys.all });
      toast.error(t("ai.toastErrorReorder"));
    }
  }, [writingSamples, speakingSamples, reorderMutation, queryClient, t]);

  if (!isOwner) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">{t("ai.errorTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("ai.errorMessage")}</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const renderTabContent = (skillType: "WRITING" | "SPEAKING", skillSamples: GoldenSample[]) => {
    const isAtLimit = skillSamples.length >= MAX_SAMPLES_PER_SKILL;
    const emptyKey = skillType === "WRITING" ? "ai.emptyWriting" : "ai.emptySpeaking";

    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          {isAtLimit ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button disabled>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("ai.addSample")}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {t("ai.maxSamplesTooltip", { max: MAX_SAMPLES_PER_SKILL })}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("ai.addSample")}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : skillSamples.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">{t(emptyKey)}</p>
        ) : (
          <Droppable droppableId={skillType}>
            {(droppableProvided) => (
              <div
                ref={droppableProvided.innerRef}
                {...droppableProvided.droppableProps}
                className="space-y-3"
              >
                {skillSamples.map((sample, index) => (
                  <Draggable key={sample.id} draggableId={sample.id} index={index}>
                    {(draggableProvided) => (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                        className="flex items-start gap-4 rounded-lg border p-4 bg-background"
                      >
                        <div
                          {...draggableProvided.dragHandleProps}
                          className="mt-1 cursor-grab text-muted-foreground"
                        >
                          <GripVertical className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">{sample.title}</h4>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {t("ai.uploadDate")} {formatDate(sample.createdAt)}
                          </p>
                          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                            <div>
                              <p className="text-xs font-medium mb-1">{t("ai.studentWork")}</p>
                              <p className="line-clamp-2 whitespace-pre-wrap">{sample.studentWork}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium mb-1">{t("ai.teacherFeedback")}</p>
                              <p className="line-clamp-2 whitespace-pre-wrap">{sample.teacherFeedback}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={sample.isActive}
                                  onCheckedChange={() => handleToggle(sample)}
                                  aria-label={t("ai.toggleActive")}
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {sample.isActive ? t("ai.sampleActive") : t("ai.sampleInactive")}
                            </TooltipContent>
                          </Tooltip>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingSample(sample)}
                            aria-label={tCommon("button.update")}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingSample(sample)}
                            aria-label={tCommon("button.delete")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {droppableProvided.placeholder}
              </div>
            )}
          </Droppable>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t("ai.heading")}</h3>
        <p className="text-sm text-muted-foreground">{t("ai.description")}</p>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Tabs defaultValue="WRITING" onValueChange={(v) => setActiveTab(v as "WRITING" | "SPEAKING")}>
          <TabsList>
            <TabsTrigger value="WRITING">
              {t("ai.tabWriting", { current: writingSamples.length, max: MAX_SAMPLES_PER_SKILL })}
            </TabsTrigger>
            <TabsTrigger value="SPEAKING">
              {t("ai.tabSpeaking", { current: speakingSamples.length, max: MAX_SAMPLES_PER_SKILL })}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="WRITING">
            {renderTabContent("WRITING", writingSamples)}
          </TabsContent>
          <TabsContent value="SPEAKING">
            {renderTabContent("SPEAKING", speakingSamples)}
          </TabsContent>
        </Tabs>
      </DragDropContext>

      {/* Create form — key forces remount on tab change to reset defaults */}
      <GoldenSampleForm
        key={`create-${activeTab}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        initialData={{ skillType: activeTab }}
        isSubmitting={createMutation.isPending}
      />

      {/* Edit form — key forces remount when editing different sample */}
      <GoldenSampleForm
        key={`edit-${editingSample?.id ?? "none"}`}
        open={!!editingSample}
        onOpenChange={(open) => { if (!open) setEditingSample(null); }}
        onSubmit={handleUpdate}
        initialData={editingSample ?? undefined}
        isSubmitting={updateMutation.isPending}
        isEdit
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingSample} onOpenChange={(open) => { if (!open) setDeletingSample(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("ai.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("ai.deleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("button.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{tCommon("button.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
