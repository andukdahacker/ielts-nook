import { useAuth } from "@/features/auth/auth-context";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
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
  ArrowLeft,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import {
  useMockTest,
  useMockTests,
  useMockTestSections,
} from "../hooks/use-mock-tests";
import { ExerciseSelector } from "./ExerciseSelector";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  DRAFT: "secondary",
  PUBLISHED: "default",
  ARCHIVED: "outline",
};

const TEST_TYPE_LABELS: Record<string, string> = {
  ACADEMIC: "Academic",
  GENERAL_TRAINING: "General Training",
};

const SKILL_LABELS: Record<string, string> = {
  LISTENING: "Listening",
  READING: "Reading",
  WRITING: "Writing",
  SPEAKING: "Speaking",
};

const IELTS_STANDARDS: Record<string, string> = {
  LISTENING: "4 sections, ~40 questions, 30 minutes",
  READING: "3 passages, ~40 questions, 60 minutes",
  WRITING: "Task 1 + Task 2, 60 minutes",
  SPEAKING: "Parts 1-3, 11-14 minutes",
};

export function MockTestEditor() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const centerId = user?.centerId || undefined;

  const { mockTest, isLoading, refetch } = useMockTest(centerId, id);
  const { publishMockTest } = useMockTests(centerId);
  const { updateSection, addExercise, removeExercise, reorderExercises } =
    useMockTestSections(id);

  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [timeLimits, setTimeLimits] = useState<Record<string, string>>({});
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  // Ref to avoid stale closure in handleDragEnd during concurrent mutations
  const sectionsRef = useRef(mockTest?.sections);
  sectionsRef.current = mockTest?.sections;

  // Sync time limit inputs from mock test data
  useEffect(() => {
    if (mockTest?.sections) {
      const limits: Record<string, string> = {};
      for (const section of mockTest.sections) {
        limits[section.id] = section.timeLimit
          ? String(Math.round(section.timeLimit / 60))
          : "";
      }
      setTimeLimits(limits);
    }
  }, [mockTest?.sections]);

  const handleTimeLimitChange = useCallback(
    async (sectionId: string, minutes: string) => {
      setTimeLimits((prev) => ({ ...prev, [sectionId]: minutes }));
    },
    [],
  );

  const handleTimeLimitSave = useCallback(
    async (sectionId: string) => {
      const minutes = timeLimits[sectionId];
      const seconds =
        minutes && !isNaN(Number(minutes)) ? Number(minutes) * 60 : null;
      try {
        await updateSection({ sectionId, input: { timeLimit: seconds } });
      } catch {
        toast.error("Failed to update time limit");
      }
    },
    [timeLimits, updateSection],
  );

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      if (!result.destination) return;
      if (result.source.index === result.destination.index) return;
      const sectionId = result.source.droppableId;
      const section = sectionsRef.current?.find((s) => s.id === sectionId);
      if (!section?.exercises) return;
      const items = Array.from(section.exercises);
      const [moved] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, moved);
      setIsReordering(true);
      try {
        await reorderExercises({
          sectionId,
          exerciseIds: items.map((se) => se.exerciseId),
        });
      } catch {
        toast.error("Failed to reorder exercises");
      } finally {
        setIsReordering(false);
      }
    },
    [reorderExercises],
  );

  const handleAddExercise = useCallback(
    async (exerciseId: string) => {
      try {
        await addExercise({ sectionId: selectedSectionId, exerciseId });
        refetch();
        toast.success("Exercise added");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to add exercise";
        toast.error(msg);
      }
    },
    [addExercise, selectedSectionId, refetch],
  );

  const handleRemoveExercise = useCallback(
    async (sectionId: string, exerciseId: string) => {
      try {
        await removeExercise({ sectionId, exerciseId });
        refetch();
        toast.success("Exercise removed");
      } catch {
        toast.error("Failed to remove exercise");
      }
    },
    [removeExercise, refetch],
  );

  const handlePublish = async () => {
    if (!id) return;
    try {
      await publishMockTest(id);
      refetch();
      setShowPublishConfirm(false);
      toast.success("Mock test published");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to publish";
      toast.error(msg);
      setShowPublishConfirm(false);
    }
  };

  const openExerciseSelector = (skill: string, sectionId: string) => {
    setSelectedSkill(skill);
    setSelectedSectionId(sectionId);
    setSelectorOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!mockTest) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Mock test not found.
      </div>
    );
  }

  const getQuestionCount = (exercise: { sections?: Array<{ questions?: Array<{ id: string }> }> }) => {
    if (!exercise.sections) return 0;
    return exercise.sections.reduce(
      (sum, s) => sum + (s.questions?.length ?? 0),
      0,
    );
  };

  const getTotalQuestions = (sectionSkill: string) => {
    const section = mockTest.sections?.find((s) => s.skill === sectionSkill);
    if (!section?.exercises) return 0;
    return section.exercises.reduce(
      (sum, se) => sum + (se.exercise ? getQuestionCount(se.exercise) : 0),
      0,
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{mockTest.title}</h1>
          <div className="flex gap-2 mt-1">
            <Badge variant={STATUS_VARIANTS[mockTest.status] ?? "secondary"}>
              {mockTest.status}
            </Badge>
            <Badge variant="outline">
              {TEST_TYPE_LABELS[mockTest.testType] ?? mockTest.testType}
            </Badge>
          </div>
        </div>
        {mockTest.status === "DRAFT" && (
          <Button onClick={() => setShowPublishConfirm(true)}>Publish</Button>
        )}
      </div>

      {/* Tabbed Sections */}
      <Tabs defaultValue="LISTENING">
        <TabsList>
          {(["LISTENING", "READING", "WRITING", "SPEAKING"] as const).map(
            (skill) => (
              <TabsTrigger key={skill} value={skill}>
                {SKILL_LABELS[skill]}
              </TabsTrigger>
            ),
          )}
          <TabsTrigger value="REVIEW">Review</TabsTrigger>
        </TabsList>

        {mockTest.sections?.map((section) => (
          <TabsContent key={section.id} value={section.skill}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{SKILL_LABELS[section.skill]} Section</span>
                  {mockTest.status === "DRAFT" && (
                    <Button
                      size="sm"
                      onClick={() =>
                        openExerciseSelector(section.skill, section.id)
                      }
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add Exercise
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* IELTS Standard Reference */}
                <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                  IELTS Standard: {IELTS_STANDARDS[section.skill]}
                </div>

                {/* Time Limit */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Time Limit:</span>
                  <Input
                    type="number"
                    className="w-24"
                    placeholder="min"
                    value={timeLimits[section.id] ?? ""}
                    onChange={(e) =>
                      handleTimeLimitChange(section.id, e.target.value)
                    }
                    onBlur={() => handleTimeLimitSave(section.id)}
                    disabled={mockTest.status !== "DRAFT"}
                  />
                  <span className="text-sm text-muted-foreground">minutes</span>
                </div>

                {/* Exercise List */}
                {(!section.exercises || section.exercises.length === 0) ? (
                  <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-md">
                    No exercises added yet. Click &quot;Add Exercise&quot; to start.
                  </div>
                ) : mockTest.status === "DRAFT" ? (
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId={section.id}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="space-y-2"
                        >
                          {section.exercises.map((se, idx) => (
                            <Draggable key={se.id} draggableId={se.id} index={idx} isDragDisabled={isReordering}>
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className="flex items-center gap-3 rounded-md border p-3"
                                >
                                  <div
                                    {...provided.dragHandleProps}
                                    className="cursor-grab"
                                  >
                                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                  <span className="text-sm font-mono text-muted-foreground w-6">
                                    {idx + 1}.
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">
                                      {se.exercise?.title ?? "Unknown"}
                                    </div>
                                    <div className="flex gap-2 mt-1">
                                      <Badge variant="outline" className="text-xs">
                                        {se.exercise
                                          ? getQuestionCount(se.exercise)
                                          : 0}{" "}
                                        questions
                                      </Badge>
                                      {se.exercise?.bandLevel && (
                                        <Badge variant="secondary" className="text-xs">
                                          Band {se.exercise.bandLevel}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      handleRemoveExercise(
                                        section.id,
                                        se.exerciseId,
                                      )
                                    }
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                ) : (
                  <div className="space-y-2">
                    {section.exercises.map((se, idx) => (
                      <div
                        key={se.id}
                        className="flex items-center gap-3 rounded-md border p-3"
                      >
                        <span className="text-sm font-mono text-muted-foreground w-6">
                          {idx + 1}.
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {se.exercise?.title ?? "Unknown"}
                          </div>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {se.exercise
                                ? getQuestionCount(se.exercise)
                                : 0}{" "}
                              questions
                            </Badge>
                            {se.exercise?.bandLevel && (
                              <Badge variant="secondary" className="text-xs">
                                Band {se.exercise.bandLevel}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Validation Warning */}
                {section.exercises &&
                  section.exercises.length > 0 &&
                  (section.skill === "LISTENING" ||
                    section.skill === "READING") && (
                    <div className="text-sm text-amber-600 dark:text-amber-400">
                      Total questions: {getTotalQuestions(section.skill)}.
                      Standard IELTS has 40 for this skill.
                    </div>
                  )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        {/* Review Tab */}
        <TabsContent value="REVIEW">
          <Card>
            <CardHeader>
              <CardTitle>Test Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Title</span>
                  <div className="font-medium">{mockTest.title}</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">
                    Test Type
                  </span>
                  <div className="font-medium">
                    {TEST_TYPE_LABELS[mockTest.testType] ?? mockTest.testType}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-medium">Sections</h3>
                {mockTest.sections?.map((section) => (
                  <div
                    key={section.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <div className="font-medium">
                        {SKILL_LABELS[section.skill]}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {section.exercises?.length ?? 0} exercises,{" "}
                        {getTotalQuestions(section.skill)} questions
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {section.timeLimit
                        ? `${Math.round(section.timeLimit / 60)} min`
                        : "No time limit"}
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-sm text-muted-foreground">
                Total time:{" "}
                {mockTest.sections
                  ? Math.round(
                      mockTest.sections.reduce(
                        (sum, s) => sum + (s.timeLimit ?? 0),
                        0,
                      ) / 60,
                    )
                  : 0}{" "}
                minutes
              </div>

              {mockTest.status === "DRAFT" && (
                <Button onClick={() => setShowPublishConfirm(true)}>
                  Publish Mock Test
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Exercise Selector Dialog */}
      <ExerciseSelector
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        skill={selectedSkill}
        existingExerciseIds={
          mockTest.sections
            ?.find((s) => s.id === selectedSectionId)
            ?.exercises?.map((e) => e.exerciseId) ?? []
        }
        onAdd={handleAddExercise}
      />

      {/* Publish Confirmation */}
      <AlertDialog
        open={showPublishConfirm}
        onOpenChange={setShowPublishConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish mock test?</AlertDialogTitle>
            <AlertDialogDescription>
              All 4 sections must have at least 1 exercise and all referenced
              exercises must be published.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish}>
              Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
