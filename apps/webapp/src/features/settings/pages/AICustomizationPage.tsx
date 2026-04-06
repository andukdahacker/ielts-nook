import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Switch } from "@workspace/ui/components/switch";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
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
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { Plus, Pencil, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/auth-context";
import {
  useGoldenSamples,
  useCreateGoldenSample,
  useUpdateGoldenSample,
  useDeleteGoldenSample,
  useToggleGoldenSample,
} from "../golden-samples.api";
import { GoldenSampleForm } from "../components/GoldenSampleForm";

const MAX_SAMPLES_PER_SKILL = 10;

type SkillType = "WRITING" | "SPEAKING";

interface SampleData {
  id: string;
  title: string;
  skillType: string;
  studentWork: string;
  teacherFeedback: string;
  isActive: boolean;
  order: number;
}

export function AICustomizationPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";

  if (!isOwner) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">AI Customization</h2>
          <p className="text-muted-foreground">
            Train the AI to match your center&apos;s feedback style.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
          <AlertCircle className="h-8 w-8 text-muted-foreground mb-4" />
          <h3 className="text-base font-semibold">Requires Owner Access</h3>
          <p className="text-muted-foreground max-w-sm mt-2">
            Only the center owner can manage AI customization settings.
          </p>
        </div>
      </div>
    );
  }

  return <GoldenSamplesManager />;
}

function GoldenSamplesManager() {
  const { data: samples, isLoading } = useGoldenSamples();
  const createMutation = useCreateGoldenSample();
  const updateMutation = useUpdateGoldenSample();
  const deleteMutation = useDeleteGoldenSample();
  const toggleMutation = useToggleGoldenSample();

  const [formOpen, setFormOpen] = useState(false);
  const [editingSample, setEditingSample] = useState<SampleData | null>(null);
  const [deletingSampleId, setDeletingSampleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SkillType>("WRITING");

  const writingSamples = (samples ?? []).filter((s) => s.skillType === "WRITING");
  const speakingSamples = (samples ?? []).filter((s) => s.skillType === "SPEAKING");

  const currentSamples = activeTab === "WRITING" ? writingSamples : speakingSamples;
  const sampleCount = currentSamples.length;
  const isAtLimit = sampleCount >= MAX_SAMPLES_PER_SKILL;

  const handleCreate = async (values: {
    title: string;
    skillType: "WRITING" | "SPEAKING";
    studentWork: string;
    teacherFeedback: string;
  }) => {
    try {
      await createMutation.mutateAsync(values);
      toast.success("Golden sample created");
      setFormOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create sample");
    }
  };

  const handleUpdate = async (values: {
    title: string;
    skillType: "WRITING" | "SPEAKING";
    studentWork: string;
    teacherFeedback: string;
  }) => {
    if (!editingSample) return;
    try {
      await updateMutation.mutateAsync({
        id: editingSample.id,
        title: values.title,
        studentWork: values.studentWork,
        teacherFeedback: values.teacherFeedback,
      });
      toast.success("Golden sample updated");
      setEditingSample(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update sample");
    }
  };

  const handleDelete = async () => {
    if (!deletingSampleId) return;
    try {
      await deleteMutation.mutateAsync(deletingSampleId);
      toast.success("Golden sample deleted");
      setDeletingSampleId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete sample");
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await toggleMutation.mutateAsync({ id, isActive });
      toast.success(isActive ? "Sample activated" : "Sample deactivated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to toggle sample");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">AI Customization</h2>
        <p className="text-muted-foreground">
          Upload Golden Samples to train the AI on your center&apos;s feedback
          style. The AI will adopt the tone, vocabulary, and pedagogical approach
          from your samples.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SkillType)}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="WRITING">
              Writing ({writingSamples.length}/{MAX_SAMPLES_PER_SKILL})
            </TabsTrigger>
            <TabsTrigger value="SPEAKING">
              Speaking ({speakingSamples.length}/{MAX_SAMPLES_PER_SKILL})
            </TabsTrigger>
          </TabsList>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    onClick={() => setFormOpen(true)}
                    disabled={isAtLimit}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Sample
                  </Button>
                </span>
              </TooltipTrigger>
              {isAtLimit && (
                <TooltipContent>
                  Maximum {MAX_SAMPLES_PER_SKILL} samples per skill type
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>

        {isLoading ? (
          <div className="space-y-3 mt-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <>
            <TabsContent value="WRITING" className="space-y-3">
              {writingSamples.length === 0 ? (
                <EmptyState skill="Writing" />
              ) : (
                writingSamples.map((sample) => (
                  <SampleCard
                    key={sample.id}
                    sample={sample}
                    onEdit={() => setEditingSample(sample)}
                    onDelete={() => setDeletingSampleId(sample.id)}
                    onToggle={(isActive) => handleToggle(sample.id, isActive)}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="SPEAKING" className="space-y-3">
              {speakingSamples.length === 0 ? (
                <EmptyState skill="Speaking" />
              ) : (
                speakingSamples.map((sample) => (
                  <SampleCard
                    key={sample.id}
                    sample={sample}
                    onEdit={() => setEditingSample(sample)}
                    onDelete={() => setDeletingSampleId(sample.id)}
                    onToggle={(isActive) => handleToggle(sample.id, isActive)}
                  />
                ))
              )}
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Create dialog */}
      <GoldenSampleForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        initialData={{ skillType: activeTab }}
        isSubmitting={createMutation.isPending}
      />

      {/* Edit dialog */}
      {editingSample && (
        <GoldenSampleForm
          open={!!editingSample}
          onOpenChange={(open) => !open && setEditingSample(null)}
          onSubmit={handleUpdate}
          initialData={editingSample as { title: string; skillType: "WRITING" | "SPEAKING"; studentWork: string; teacherFeedback: string }}
          isSubmitting={updateMutation.isPending}
          isEdit
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingSampleId}
        onOpenChange={(open) => !open && setDeletingSampleId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Golden Sample</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this golden sample. The AI will no longer
              use it as a style reference.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SampleCard({
  sample,
  onEdit,
  onDelete,
  onToggle,
}: {
  sample: SampleData;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (isActive: boolean) => void;
}) {
  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm">{sample.title}</h4>
          <Badge variant={sample.isActive ? "default" : "secondary"}>
            {sample.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={sample.isActive}
            onCheckedChange={onToggle}
            aria-label="Toggle active"
          />
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Student Work</p>
          <p className="text-sm line-clamp-2">{sample.studentWork}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Teacher Feedback</p>
          <p className="text-sm line-clamp-2">{sample.teacherFeedback}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ skill }: { skill: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg border-dashed">
      <p className="text-muted-foreground">
        No {skill} golden samples yet. Add samples to train the AI on your
        feedback style.
      </p>
    </div>
  );
}
