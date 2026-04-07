import { useAuth } from "@/features/auth/auth-context";
import { useExercise, useExercises } from "../hooks/use-exercises";
import { useExerciseTags } from "../hooks/use-tags";
import { useSections } from "../hooks/use-sections";
import { TagSelector } from "./TagSelector";
import type {
  ExerciseSkill,
  IeltsQuestionType,
  CreateQuestionInput,
  UpdateQuestionInput,
  AudioSection,
  PlaybackMode,
  TimerPosition,
} from "@workspace/types";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
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
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  Eye,
  Loader2,
  Plus,
  Save,
  Settings,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { PassageEditor } from "./PassageEditor";
import { QuestionSectionEditor } from "./QuestionSectionEditor";
import { QuestionPreviewFactory } from "./question-types/QuestionPreviewFactory";
import { SkillSelector } from "./SkillSelector";
import { AudioUploadEditor } from "./AudioUploadEditor";
import { AudioSectionMarkers } from "./AudioSectionMarkers";
import { PlaybackModeSettings } from "./PlaybackModeSettings";
import { WritingTaskEditor } from "./WritingTaskEditor";
import { WritingRubricDisplay } from "./WritingRubricDisplay";
import { SpeakingTaskEditor } from "./SpeakingTaskEditor";
import { TimerSettingsEditor } from "./TimerSettingsEditor";
import { DocumentUploadPanel } from "./DocumentUploadPanel";
import { AIGenerationPanel } from "./AIGenerationPanel";
import { useAIGeneration } from "../hooks/use-ai-generation";
import { useBreadcrumbOverrides } from "@/core/context/breadcrumb-context";
import type { Exercise } from "@workspace/types";

// Default first question type per skill
const DEFAULT_SECTION_TYPE: Record<ExerciseSkill, IeltsQuestionType> = {
  READING: "R1_MCQ_SINGLE",
  LISTENING: "L1_FORM_NOTE_TABLE",
  WRITING: "W1_TASK1_ACADEMIC",
  SPEAKING: "S1_PART1_QA",
};

type SaveStatus = "saved" | "saving" | "unsaved";

interface ExercisePreviewProps {
  title: string;
  instructions: string;
  passageContent: string;
  showPassage: boolean;
  sections: Exercise["sections"];
  skill: ExerciseSkill | null;
  audioUrl?: string | null;
  audioDuration?: number | null;
  audioSections?: AudioSection[];
  showTranscriptAfterSubmit?: boolean;
  writingPrompt?: string;
  stimulusImageUrl?: string | null;
  letterTone?: string;
  wordCountMin?: number | null;
  speakingPrepTime?: number | null;
  speakingTime?: number | null;
  maxRecordingDuration?: number | null;
  enableTranscription?: boolean;
  timeLimit?: number | null;
  timerPosition?: string | null;
  warningAlerts?: number[] | null;
  autoSubmitOnExpiry?: boolean;
  gracePeriodSeconds?: number | null;
  enablePause?: boolean;
  onBack: () => void;
}

function formatPreviewDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function ExercisePreview({
  title,
  instructions,
  passageContent,
  showPassage,
  sections,
  skill,
  audioUrl,
  audioDuration,
  audioSections,
  showTranscriptAfterSubmit,
  writingPrompt,
  stimulusImageUrl,
  letterTone,
  wordCountMin,
  speakingPrepTime,
  speakingTime,
  maxRecordingDuration,
  enableTranscription,
  timeLimit,
  timerPosition,
  warningAlerts,
  autoSubmitOnExpiry,
  gracePeriodSeconds,
  enablePause,
  onBack,
}: ExercisePreviewProps) {
  const isListening = skill === "LISTENING";
  const isWriting = skill === "WRITING";
  const isSpeaking = skill === "SPEAKING";

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 size-4" />
          Back to Editor
        </Button>
        <h2 className="text-xl font-bold">Preview Mode</h2>
      </div>
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold">{title}</h1>

        {/* Timer Info */}
        {timeLimit != null && timeLimit > 0 && (
          <div className="rounded-md border p-4 space-y-1">
            <p className="text-sm font-medium">Time Limit: {Math.round(timeLimit / 60)} minutes</p>
            <p className="text-sm text-muted-foreground">
              Timer position: {timerPosition === "floating" ? "Floating Widget" : "Top Bar"}
            </p>
            {warningAlerts && warningAlerts.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Warnings at: {warningAlerts.map((s) => `${Math.round(s / 60)} min`).join(", ")}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Auto-submit: {autoSubmitOnExpiry ? "Yes" : "No"}
            </p>
            {gracePeriodSeconds != null && (
              <p className="text-sm text-muted-foreground">
                Grace period: {Math.round(gracePeriodSeconds / 60)} min
              </p>
            )}
            {enablePause && (
              <p className="text-sm text-muted-foreground">Pause allowed: Yes</p>
            )}
          </div>
        )}
        {instructions && (
          <p className="text-muted-foreground italic">{instructions}</p>
        )}

        {/* Audio Player (LISTENING only) */}
        {isListening && audioUrl && (
          <div className="rounded-md border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Audio</h3>
              {audioDuration != null && (
                <span className="text-sm text-muted-foreground">
                  ({formatPreviewDuration(audioDuration)})
                </span>
              )}
            </div>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio controls src={audioUrl} className="w-full" preload="metadata">
              Your browser does not support the audio element.
            </audio>
            {audioSections && audioSections.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Sections:</p>
                {audioSections.map((s, i) => (
                  <p key={i} className="text-sm text-muted-foreground">
                    {s.label}: {formatPreviewDuration(s.startTime)} - {formatPreviewDuration(s.endTime)}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Writing Task Preview */}
        {isWriting && (
          <div className="space-y-4">
            {stimulusImageUrl && (
              <div className="rounded-md border p-2">
                <img src={stimulusImageUrl} alt="Stimulus" className="max-h-64 w-auto mx-auto" />
              </div>
            )}
            {letterTone && (
              <p className="text-sm text-muted-foreground">
                Tone: <span className="capitalize font-medium">{letterTone}</span>
              </p>
            )}
            {writingPrompt && (
              <div className="rounded-md border p-4">
                <p className="text-sm whitespace-pre-wrap">{writingPrompt}</p>
              </div>
            )}
            {wordCountMin != null && (
              <p className="text-sm text-muted-foreground">
                Write at least {wordCountMin} words.
              </p>
            )}
            {/* Determine task type from first section */}
            {(() => {
              const firstSectionType = sections?.[0]?.sectionType;
              const taskType = firstSectionType === "W3_TASK2_ESSAY" ? "W3" as const
                : firstSectionType === "W2_TASK1_GENERAL" ? "W2" as const
                : "W1" as const;
              return <WritingRubricDisplay taskType={taskType} />;
            })()}
          </div>
        )}

        {/* Speaking Preview */}
        {isSpeaking && (
          <div className="space-y-2">
            {speakingPrepTime != null && (
              <p className="text-sm text-muted-foreground">
                Preparation time: {speakingPrepTime}s
              </p>
            )}
            {speakingTime != null && (
              <p className="text-sm text-muted-foreground">
                Speaking time: {speakingTime}s
              </p>
            )}
            {maxRecordingDuration != null && (
              <p className="text-sm text-muted-foreground">
                Max recording: {maxRecordingDuration}s per question
              </p>
            )}
            {enableTranscription && (
              <p className="text-sm text-muted-foreground">
                AI Transcription: Enabled
              </p>
            )}
            <p className="text-xs text-muted-foreground italic">
              This task is graded using IELTS band descriptors
            </p>
          </div>
        )}

        {/* Passage / Transcript */}
        {showPassage && passageContent && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{isListening ? "Transcript" : "Passage"}</h3>
              {isListening && (
                <span className="text-xs rounded-full border px-2 py-0.5 text-muted-foreground">
                  {showTranscriptAfterSubmit
                    ? "Visible after submission"
                    : "Hidden until submission"}
                </span>
              )}
            </div>
            <div className="rounded-md border p-6 space-y-3">
              {passageContent
                .split(/\n\n+/)
                .filter((p) => p.trim())
                .map((para, idx) => (
                  <div key={idx} className="flex gap-3">
                    <span className="font-bold text-primary min-w-[1.5rem] text-right">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <p className="leading-relaxed">{para.trim()}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {(sections ?? []).map((section, sIdx) => (
          <div key={section.id} className="space-y-3">
            <h3 className="font-semibold">
              Section {sIdx + 1}: {section.sectionType.replace(/_/g, " ")}
            </h3>
            {section.instructions && (
              <p className="text-sm text-muted-foreground italic">
                {section.instructions}
              </p>
            )}
            {(section.questions ?? []).map((q, qIdx) => (
              <QuestionPreviewFactory
                key={q.id}
                sectionType={section.sectionType}
                question={q}
                questionIndex={qIdx}
                speakingPrepTime={isSpeaking ? speakingPrepTime : undefined}
                speakingTime={isSpeaking ? speakingTime : undefined}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExerciseEditor() {
  const { user } = useAuth();
  const centerId = user?.centerId || undefined;
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  // State
  const [selectedSkill, setSelectedSkill] = useState<ExerciseSkill | null>(
    null,
  );
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [passageContent, setPassageContent] = useState("");
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode | undefined>(undefined);
  const [audioSections, setAudioSections] = useState<AudioSection[]>([]);
  const [showTranscriptAfterSubmit, setShowTranscriptAfterSubmit] = useState(false);
  const [writingPrompt, setWritingPrompt] = useState("");
  const [letterTone, setLetterTone] = useState("formal");
  const [wordCountMin, setWordCountMin] = useState<number | null>(null);
  const [wordCountMax, setWordCountMax] = useState<number | null>(null);
  const [wordCountMode, setWordCountMode] = useState("soft");
  const [sampleResponse, setSampleResponse] = useState("");
  const [showSampleAfterGrading, setShowSampleAfterGrading] = useState(false);
  const [speakingPrepTime, setSpeakingPrepTime] = useState<number | null>(null);
  const [speakingTime, setSpeakingTime] = useState<number | null>(null);
  const [maxRecordingDuration, setMaxRecordingDuration] = useState<number | null>(null);
  const [enableTranscription, setEnableTranscription] = useState(false);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [timerPosition, setTimerPosition] = useState<TimerPosition | null>(null);
  const [warningAlerts, setWarningAlerts] = useState<number[] | null>(null);
  const [autoSubmitOnExpiry, setAutoSubmitOnExpiry] = useState(true);
  const [gracePeriodSeconds, setGracePeriodSeconds] = useState<number | null>(null);
  const [enablePause, setEnablePause] = useState(false);
  const [bandLevel, setBandLevel] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [showPreview, setShowPreview] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [deleteSectionId, setDeleteSectionId] = useState<string | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userHasEdited = useRef(false);
  const editCountRef = useRef(0);
  const sectionFlushCallbacks = useRef(new Set<() => void>());

  const registerSectionFlush = useCallback((flush: () => void) => {
    sectionFlushCallbacks.current.add(flush);
    return () => { sectionFlushCallbacks.current.delete(flush); };
  }, []);

  // Hooks
  const { createExercise, updateExercise, publishExercise } = useExercises(centerId);
  const { exercise, isLoading, autosave, isAutosaving, refetch: refetchExercise } = useExercise(
    centerId,
    id,
  );
  const {
    createSection,
    updateSection,
    deleteSection,
    reorderSections,
    createQuestion,
    updateQuestion,
    deleteQuestion,
  } = useSections(id);
  const { exerciseTags, setExerciseTags } = useExerciseTags(centerId, id);
  const { regenerateSection } = useAIGeneration(id);
  const { setLabel, removeLabel, setNonClickable, removeNonClickable } = useBreadcrumbOverrides();

  // Set breadcrumb labels for exercise edit page
  useEffect(() => {
    if (id) {
      setLabel(id, exercise?.title || "Loading...");
      setNonClickable(id);
    }
    return () => {
      if (id) {
        removeLabel(id);
        removeNonClickable(id);
      }
    };
  }, [id, exercise?.title, setLabel, removeLabel, setNonClickable, removeNonClickable]);

  // Reset edit tracking when switching to a different exercise
  useEffect(() => {
    userHasEdited.current = false;
  }, [id]);

  // Load existing exercise data — only on initial load or when user hasn't edited.
  // This prevents refetches (e.g. after auto-section creation) from overwriting user edits.
  useEffect(() => {
    if (exercise && !userHasEdited.current) {
      setTitle(exercise.title);
      setInstructions(exercise.instructions ?? "");
      setPassageContent(exercise.passageContent ?? "");
      setSelectedSkill(exercise.skill);
      setPlaybackMode((exercise.playbackMode as PlaybackMode) ?? undefined);
      setAudioSections(
        Array.isArray(exercise.audioSections)
          ? (exercise.audioSections as AudioSection[])
          : [],
      );
      setShowTranscriptAfterSubmit(
        exercise.showTranscriptAfterSubmit ?? false,
      );
      setWritingPrompt(exercise.writingPrompt ?? "");
      setLetterTone(exercise.letterTone ?? "formal");
      setWordCountMin(exercise.wordCountMin ?? null);
      setWordCountMax(exercise.wordCountMax ?? null);
      setWordCountMode(exercise.wordCountMode ?? "soft");
      setSampleResponse(exercise.sampleResponse ?? "");
      setShowSampleAfterGrading(exercise.showSampleAfterGrading ?? false);
      setSpeakingPrepTime(exercise.speakingPrepTime ?? null);
      setSpeakingTime(exercise.speakingTime ?? null);
      setMaxRecordingDuration(exercise.maxRecordingDuration ?? null);
      setEnableTranscription(exercise.enableTranscription ?? false);
      setTimeLimit(exercise.timeLimit ?? null);
      setTimerPosition((exercise.timerPosition as TimerPosition) ?? null);
      setWarningAlerts(
        Array.isArray(exercise.warningAlerts)
          ? (exercise.warningAlerts as number[])
          : null,
      );
      setAutoSubmitOnExpiry(exercise.autoSubmitOnExpiry ?? true);
      setGracePeriodSeconds(exercise.gracePeriodSeconds ?? null);
      setEnablePause(exercise.enablePause ?? false);
      setBandLevel(exercise.bandLevel ?? null);
    }
  }, [exercise]);

  // Mark as user-edited when form fields change (not on initial load)
  const handleFieldChange = useCallback(
    (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
      setter(value);
      userHasEdited.current = true;
      editCountRef.current++;
    },
    [],
  );

  // W2 section type check — extracted so `exercise` is not a dependency of scheduleAutosave
  const isW2SectionType = exercise?.sections?.[0]?.sectionType === "W2_TASK1_GENERAL";

  // Auto-save effect (30 second debounce)
  const scheduleAutosave = useCallback(() => {
    if (!id || !userHasEdited.current) return;
    setSaveStatus("unsaved");
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      const editCountAtSave = editCountRef.current;
      try {
        setSaveStatus("saving");
        const isW2 = isW2SectionType;
        await autosave({
          title: title || undefined,
          instructions: instructions || null,
          passageContent: passageContent || null,
          playbackMode: playbackMode || undefined,
          audioSections: audioSections.length > 0 ? audioSections : null,
          showTranscriptAfterSubmit,
          writingPrompt: writingPrompt || null,
          letterTone: isW2 ? (letterTone as "formal" | "informal" | "semi-formal") || null : null,
          wordCountMin: wordCountMin,
          wordCountMax: wordCountMax,
          wordCountMode: (wordCountMode as "soft" | "hard") || null,
          sampleResponse: sampleResponse || null,
          showSampleAfterGrading,
          speakingPrepTime,
          speakingTime,
          maxRecordingDuration,
          enableTranscription,
          timeLimit,
          timerPosition,
          warningAlerts,
          autoSubmitOnExpiry,
          gracePeriodSeconds,
          enablePause,
          bandLevel: bandLevel as "4-5" | "5-6" | "6-7" | "7-8" | "8-9" | null | undefined,
        });
        setSaveStatus("saved");
        if (editCountRef.current === editCountAtSave) {
          userHasEdited.current = false;
        }
      } catch {
        setSaveStatus("unsaved");
      }
    }, 30000);
  }, [id, title, instructions, passageContent, playbackMode, audioSections, showTranscriptAfterSubmit, writingPrompt, letterTone, wordCountMin, wordCountMax, wordCountMode, sampleResponse, showSampleAfterGrading, speakingPrepTime, speakingTime, maxRecordingDuration, enableTranscription, timeLimit, timerPosition, warningAlerts, autoSubmitOnExpiry, gracePeriodSeconds, enablePause, bandLevel, autosave, isW2SectionType]);

  useEffect(() => {
    if (isEditing && userHasEdited.current) {
      scheduleAutosave();
    }
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [title, instructions, passageContent, playbackMode, audioSections, showTranscriptAfterSubmit, writingPrompt, letterTone, wordCountMin, wordCountMax, wordCountMode, sampleResponse, showSampleAfterGrading, speakingPrepTime, speakingTime, maxRecordingDuration, enableTranscription, bandLevel, isEditing, scheduleAutosave]);

  // Handlers
  const handleSkillSelect = async (skill: ExerciseSkill) => {
    setSelectedSkill(skill);
    try {
      const created = await createExercise({
        title: "Untitled Exercise",
        skill,
      });
      navigate(`../exercises/${created.id}/edit`, { replace: true });
      toast.success("Exercise created");
    } catch {
      toast.error("Failed to create exercise");
      setSelectedSkill(null);
    }
  };

  // Auto-create section for WRITING/SPEAKING exercises (exactly 1 section per exercise)
  useEffect(() => {
    if (
      isEditing &&
      exercise &&
      (exercise.skill === "WRITING" || exercise.skill === "SPEAKING") &&
      exercise.status === "DRAFT" &&
      exercise.sections &&
      exercise.sections.length === 0
    ) {
      createSection({
        sectionType: DEFAULT_SECTION_TYPE[exercise.skill],
        orderIndex: 0,
      }).catch(() => {
        // Silently fail — user can add manually
      });
    }
  }, [isEditing, exercise, createSection]);

  const handleSaveDraft = async () => {
    if (!id) return;
    // Flush any pending uncontrolled input values (e.g., un-blurred MatchingEditor fields)
    (document.activeElement as HTMLElement)?.blur();
    await new Promise((r) => setTimeout(r, 0));
    // Flush all pending question-level debounce timers so mutations fire before save
    for (const flush of sectionFlushCallbacks.current) flush();
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    const editCountAtSave = editCountRef.current;
    try {
      setSaveStatus("saving");
      const isW2 = exercise?.sections?.[0]?.sectionType === "W2_TASK1_GENERAL";
      await autosave({
        title: title || undefined,
        instructions: instructions || null,
        passageContent: passageContent || null,
        playbackMode: playbackMode || undefined,
        audioSections: audioSections.length > 0 ? audioSections : null,
        showTranscriptAfterSubmit,
        writingPrompt: writingPrompt || null,
        letterTone: isW2 ? (letterTone as "formal" | "informal" | "semi-formal") || null : null,
        wordCountMin: wordCountMin,
        wordCountMax: wordCountMax,
        wordCountMode: (wordCountMode as "soft" | "hard") || null,
        sampleResponse: sampleResponse || null,
        showSampleAfterGrading,
        speakingPrepTime,
        speakingTime,
        maxRecordingDuration,
        enableTranscription,
        timeLimit,
        timerPosition,
        warningAlerts,
        autoSubmitOnExpiry,
        gracePeriodSeconds,
        enablePause,
        bandLevel: bandLevel as "4-5" | "5-6" | "6-7" | "7-8" | "8-9" | null | undefined,
      });
      setSaveStatus("saved");
      if (editCountRef.current === editCountAtSave) {
        userHasEdited.current = false;
      }
      toast.success("Draft saved");
    } catch {
      setSaveStatus("unsaved");
      toast.error("Failed to save");
    }
  };

  const handlePublish = async () => {
    if (!id) return;
    try {
      await handleSaveDraft();
      await publishExercise(id);
      toast.success("Exercise published");
      navigate("../exercises", { replace: true });
    } catch {
      toast.error("Failed to publish exercise");
    } finally {
      setShowPublishDialog(false);
    }
  };

  const handleAddSection = async () => {
    if (!id || !selectedSkill) return;
    try {
      await createSection({
        sectionType: DEFAULT_SECTION_TYPE[selectedSkill],
        orderIndex: exercise?.sections?.length ?? 0,
      });
    } catch {
      toast.error("Failed to add section");
    }
  };

  const handleUpdateSection = async (
    sectionId: string,
    data: { sectionType?: IeltsQuestionType; instructions?: string | null; audioSectionIndex?: number | null; sectionTimeLimit?: number | null },
  ) => {
    try {
      await updateSection({ sectionId, input: data });
    } catch {
      toast.error("Failed to update section");
    }
  };

  const handleDeleteSectionConfirm = async () => {
    if (!deleteSectionId) return;
    try {
      await deleteSection(deleteSectionId);
    } catch {
      toast.error("Failed to delete section");
    } finally {
      setDeleteSectionId(null);
    }
  };

  const handleCreateQuestion = async (
    sectionId: string,
    input: CreateQuestionInput,
  ) => {
    try {
      await createQuestion({ sectionId, input });
    } catch {
      toast.error("Failed to add question");
    }
  };

  const handleUpdateQuestion = async (
    sectionId: string,
    questionId: string,
    input: UpdateQuestionInput,
  ) => {
    try {
      await updateQuestion({ sectionId, questionId, input });
    } catch {
      toast.error("Failed to update question");
    }
  };

  const handleDeleteQuestion = async (
    sectionId: string,
    questionId: string,
  ) => {
    try {
      await deleteQuestion({ sectionId, questionId });
    } catch {
      toast.error("Failed to delete question");
    }
  };

  const handleAnswerKeySettingChange = async (field: "caseSensitive" | "partialCredit", value: boolean) => {
    if (!id) return;
    try {
      await updateExercise({ id, input: { [field]: value } });
    } catch {
      toast.error("Failed to update answer key settings");
    }
  };

  const handleAudioChange = useCallback(() => {
    if (id) {
      // Refetch exercise data to get updated audioUrl
      // The query will be invalidated by the upload/delete mutation
    }
  }, [id]);

  const handleDurationExtracted = useCallback(
    async (duration: number) => {
      if (!id) return;
      try {
        await updateExercise({ id, input: { audioDuration: duration } });
      } catch {
        toast.error("Failed to save audio duration");
      }
    },
    [id, updateExercise],
  );

  const handlePlaybackModeChange = useCallback(
    (mode: "TEST_MODE" | "PRACTICE_MODE") => {
      setPlaybackMode(mode);
      userHasEdited.current = true;
      editCountRef.current++;
    },
    [],
  );

  const handleAudioSectionsChange = useCallback(
    (sections: AudioSection[]) => {
      setAudioSections(sections);
      userHasEdited.current = true;
      editCountRef.current++;
    },
    [],
  );

  const handleShowTranscriptChange = useCallback(
    async (checked: boolean) => {
      setShowTranscriptAfterSubmit(checked);
      if (!id) return;
      try {
        await updateExercise({ id, input: { showTranscriptAfterSubmit: checked } });
      } catch {
        toast.error("Failed to update transcript setting");
      }
    },
    [id, updateExercise],
  );

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;

    const sections = exercise?.sections ?? [];
    const reordered = Array.from(sections);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    try {
      await reorderSections(reordered.map((s) => s.id));
    } catch {
      toast.error("Failed to reorder sections");
    }
  };

  // New exercise: show skill selector
  if (!isEditing && !selectedSkill) {
    return (
      <div className="container py-10">
        <Button variant="ghost" onClick={() => navigate("../exercises")} className="mb-6">
          <ArrowLeft className="mr-2 size-4" />
          Back to Exercises
        </Button>
        <SkillSelector onSelect={handleSkillSelect} />
      </div>
    );
  }

  // Loading existing exercise
  if (isEditing && isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const showPassage = selectedSkill === "READING" || selectedSkill === "LISTENING";
  const isWriting = selectedSkill === "WRITING";
  const isSpeaking = selectedSkill === "SPEAKING";

  if (showPreview) {
    return (
      <ExercisePreview
        title={title}
        instructions={instructions}
        passageContent={passageContent}
        showPassage={showPassage}
        sections={exercise?.sections}
        skill={selectedSkill}
        audioUrl={exercise?.audioUrl}
        audioDuration={exercise?.audioDuration}
        audioSections={audioSections}
        showTranscriptAfterSubmit={showTranscriptAfterSubmit}
        writingPrompt={writingPrompt}
        stimulusImageUrl={exercise?.stimulusImageUrl}
        letterTone={letterTone}
        wordCountMin={wordCountMin}
        speakingPrepTime={speakingPrepTime}
        speakingTime={speakingTime}
        maxRecordingDuration={maxRecordingDuration}
        enableTranscription={enableTranscription}
        timeLimit={timeLimit}
        timerPosition={timerPosition}
        warningAlerts={warningAlerts}
        autoSubmitOnExpiry={autoSubmitOnExpiry}
        gracePeriodSeconds={gracePeriodSeconds}
        enablePause={enablePause}
        onBack={() => setShowPreview(false)}
      />
    );
  }

  return (
    <div>
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          <Button variant="ghost" aria-label="Back to Exercises" onClick={() => navigate("../exercises")}>
            <ArrowLeft className="sm:mr-2 size-4" />
            <span className="hidden sm:inline">Back to Exercises</span>
          </Button>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-sm text-muted-foreground">
              <span className="hidden sm:inline">
                {saveStatus === "saving" || isAutosaving
                  ? "Saving..."
                  : saveStatus === "unsaved"
                    ? "Unsaved changes"
                    : "Saved"}
              </span>
              <span className="sm:hidden" aria-label={saveStatus === "saving" || isAutosaving ? "Saving" : saveStatus === "unsaved" ? "Unsaved changes" : "Saved"}>
                {saveStatus === "saving" || isAutosaving
                  ? <Loader2 className="size-4 animate-spin" />
                  : saveStatus === "unsaved"
                    ? <AlertCircle className="size-4" />
                    : <Check className="size-4 text-green-500" />}
              </span>
            </span>
            <Button variant="outline" size="sm" aria-label="Preview" onClick={() => setShowPreview(true)}>
              <Eye className="sm:mr-2 size-4" />
              <span className="hidden sm:inline">Preview</span>
            </Button>
            <Button variant="outline" size="sm" aria-label="Save Draft" onClick={handleSaveDraft}>
              <Save className="sm:mr-2 size-4" />
              <span className="hidden sm:inline">Save Draft</span>
            </Button>
            {exercise?.status === "DRAFT" && (
              <Button size="sm" onClick={() => setShowPublishDialog(true)}>
                Publish
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="py-6 space-y-6">
      {/* Title & Instructions */}
      <div className="space-y-4 max-w-3xl">
        <div className="space-y-2">
          <Label htmlFor="exercise-title">Title</Label>
          <Input
            id="exercise-title"
            value={title}
            onChange={(e) => handleFieldChange(setTitle, e.target.value)}
            placeholder="Exercise title"
            className="text-lg font-semibold"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="exercise-instructions">Instructions</Label>
          <Textarea
            id="exercise-instructions"
            value={instructions}
            onChange={(e) => handleFieldChange(setInstructions, e.target.value)}
            placeholder="General instructions for the exercise..."
            className="min-h-[80px]"
          />
        </div>
      </div>

      {/* Audio Upload & Settings (LISTENING only) */}
      {selectedSkill === "LISTENING" && isEditing && id && (
        <div className="max-w-3xl space-y-4">
          <AudioUploadEditor
            exerciseId={id}
            audioUrl={exercise?.audioUrl ?? null}
            audioDuration={exercise?.audioDuration}
            onAudioChange={handleAudioChange}
            onDurationExtracted={handleDurationExtracted}
          />
          <PlaybackModeSettings
            playbackMode={playbackMode}
            onPlaybackModeChange={handlePlaybackModeChange}
          />
          {exercise?.audioUrl && (
            <AudioSectionMarkers
              sections={audioSections}
              audioDuration={exercise?.audioDuration}
              onSectionsChange={handleAudioSectionsChange}
            />
          )}
          <div className="flex items-start gap-3">
            <Checkbox
              id="show-transcript"
              checked={showTranscriptAfterSubmit}
              onCheckedChange={(checked) =>
                handleShowTranscriptChange(checked === true)
              }
            />
            <div className="space-y-1">
              <Label htmlFor="show-transcript" className="text-sm font-medium cursor-pointer">
                Show transcript after submit
              </Label>
              <p className="text-xs text-muted-foreground">
                Display the passage/transcript to students after they submit their answers.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Writing Task Settings (WRITING only) */}
      {isWriting && isEditing && id && (
        <div className="max-w-3xl">
          <WritingTaskEditor
            exerciseId={id}
            sectionType={exercise?.sections?.[0]?.sectionType ?? null}
            stimulusImageUrl={exercise?.stimulusImageUrl ?? null}
            writingPrompt={writingPrompt}
            letterTone={letterTone}
            wordCountMin={wordCountMin}
            wordCountMax={wordCountMax}
            wordCountMode={wordCountMode}
            sampleResponse={sampleResponse}
            showSampleAfterGrading={showSampleAfterGrading}
            onWritingPromptChange={(v) => { setWritingPrompt(v); userHasEdited.current = true; editCountRef.current++; }}
            onLetterToneChange={(v) => { setLetterTone(v); userHasEdited.current = true; editCountRef.current++; }}
            onWordCountMinChange={(v) => { setWordCountMin(v); userHasEdited.current = true; editCountRef.current++; }}
            onWordCountMaxChange={(v) => { setWordCountMax(v); userHasEdited.current = true; editCountRef.current++; }}
            onWordCountModeChange={(v) => { setWordCountMode(v); userHasEdited.current = true; editCountRef.current++; }}
            onSampleResponseChange={(v) => { setSampleResponse(v); userHasEdited.current = true; editCountRef.current++; }}
            onShowSampleAfterGradingChange={(v) => { setShowSampleAfterGrading(v); userHasEdited.current = true; editCountRef.current++; }}
          />
        </div>
      )}

      {/* Speaking Task Settings (SPEAKING only) */}
      {isSpeaking && isEditing && id && (
        <div className="max-w-3xl">
          <SpeakingTaskEditor
            sectionType={exercise?.sections?.[0]?.sectionType ?? null}
            speakingPrepTime={speakingPrepTime}
            speakingTime={speakingTime}
            maxRecordingDuration={maxRecordingDuration}
            enableTranscription={enableTranscription}
            onSpeakingPrepTimeChange={(v) => { setSpeakingPrepTime(v); userHasEdited.current = true; editCountRef.current++; }}
            onSpeakingTimeChange={(v) => { setSpeakingTime(v); userHasEdited.current = true; editCountRef.current++; }}
            onMaxRecordingDurationChange={(v) => { setMaxRecordingDuration(v); userHasEdited.current = true; editCountRef.current++; }}
            onEnableTranscriptionChange={(v) => { setEnableTranscription(v); userHasEdited.current = true; editCountRef.current++; }}
          />
        </div>
      )}

      {/* Document Upload (Reading only) */}
      {isEditing && id && centerId && selectedSkill === "READING" && (
        <div className="max-w-3xl">
          <DocumentUploadPanel
            exerciseId={id}
            currentPassageContent={passageContent}
            currentSourceType={exercise?.passageSourceType ?? null}
            onPassageUpdated={(text) => {
              setPassageContent(text);
              userHasEdited.current = true;
              editCountRef.current++;
            }}
          />
        </div>
      )}

      {/* Passage Editor */}
      {showPassage && (
        <div className="max-w-3xl">
          <PassageEditor
            value={passageContent}
            onChange={(v) => handleFieldChange(setPassageContent, v)}
            label={selectedSkill === "LISTENING" ? "Transcript (Optional)" : undefined}
            placeholder={selectedSkill === "LISTENING" ? "Enter the transcript here. Use blank lines to separate paragraphs..." : undefined}
          />
        </div>
      )}

      {/* AI Generation (Reading only) */}
      {isEditing && id && centerId && selectedSkill === "READING" && (
        <div className="max-w-3xl">
          <AIGenerationPanel
            exerciseId={id}
            hasPassage={!!passageContent?.trim()}
            existingSections={exercise?.sections ?? []}
            onGenerationComplete={() => {
              refetchExercise();
            }}
          />
        </div>
      )}

      {/* Answer Key Settings (hidden for WRITING/SPEAKING — rubric-graded) */}
      {isEditing && exercise && !isWriting && !isSpeaking && (
        <div className="max-w-3xl">
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
              <Settings className="size-4" />
              Answer Key Settings
              <ChevronDown className="size-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-4 pl-6">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="case-sensitive"
                  checked={exercise.caseSensitive ?? false}
                  onCheckedChange={(checked) =>
                    handleAnswerKeySettingChange("caseSensitive", checked === true)
                  }
                />
                <div className="space-y-1">
                  <Label htmlFor="case-sensitive" className="text-sm font-medium cursor-pointer">
                    Case-sensitive matching
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Default: case-insensitive. Enable for exact capitalization matching.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="partial-credit"
                  checked={exercise.partialCredit ?? false}
                  onCheckedChange={(checked) =>
                    handleAnswerKeySettingChange("partialCredit", checked === true)
                  }
                />
                <div className="space-y-1">
                  <Label htmlFor="partial-credit" className="text-sm font-medium cursor-pointer">
                    Enable partial credit
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Award proportional marks for partially correct multi-answer questions.
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">
                Whitespace is automatically normalized: leading/trailing spaces trimmed, internal spacing collapsed.
              </p>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Timer Settings (all skills) */}
      {isEditing && id && (
        <div className="max-w-3xl">
          <TimerSettingsEditor
            timeLimit={timeLimit}
            timerPosition={timerPosition}
            warningAlerts={warningAlerts}
            autoSubmitOnExpiry={autoSubmitOnExpiry}
            gracePeriodSeconds={gracePeriodSeconds}
            enablePause={enablePause}
            onTimeLimitChange={(v) => { setTimeLimit(v); userHasEdited.current = true; editCountRef.current++; }}
            onTimerPositionChange={(v) => { setTimerPosition(v); userHasEdited.current = true; editCountRef.current++; }}
            onWarningAlertsChange={(v) => { setWarningAlerts(v); userHasEdited.current = true; editCountRef.current++; }}
            onAutoSubmitOnExpiryChange={(v) => { setAutoSubmitOnExpiry(v); userHasEdited.current = true; editCountRef.current++; }}
            onGracePeriodSecondsChange={(v) => { setGracePeriodSeconds(v); userHasEdited.current = true; editCountRef.current++; }}
            onEnablePauseChange={(v) => { setEnablePause(v); userHasEdited.current = true; editCountRef.current++; }}
          />
        </div>
      )}

      {/* Tags & Organization */}
      {isEditing && id && centerId && (
        <div className="max-w-3xl">
          <TagSelector
            centerId={centerId}
            bandLevel={bandLevel}
            selectedTagIds={exerciseTags?.map((t) => t.id) ?? []}
            questionTypes={exercise?.sections?.map((s) => s.sectionType).filter(Boolean) ?? []}
            onBandLevelChange={(v) => { setBandLevel(v); userHasEdited.current = true; editCountRef.current++; }}
            onTagsChange={(tagIds) => setExerciseTags({ tagIds })}
          />
        </div>
      )}

      {/* Question Sections */}
      <div className="space-y-4 max-w-3xl">
        <div className="flex items-center justify-between">
          <Label>Question Sections</Label>
          {!isWriting && !isSpeaking && (
            <Button variant="outline" size="sm" onClick={handleAddSection}>
              <Plus className="mr-1 size-4" />
              Add Section
            </Button>
          )}
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="sections">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-4"
              >
                {(exercise?.sections ?? []).map((section, idx) => (
                  <Draggable
                    key={section.id}
                    draggableId={section.id}
                    index={idx}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                      >
                        <QuestionSectionEditor
                          section={section}
                          skill={selectedSkill!}
                          index={idx}
                          exerciseId={exercise?.id}
                          audioSections={selectedSkill === "LISTENING" ? audioSections : undefined}
                          exerciseHasTimeLimit={timeLimit !== null && timeLimit > 0}
                          onUpdateSection={handleUpdateSection}
                          onDeleteSection={setDeleteSectionId}
                          onCreateQuestion={handleCreateQuestion}
                          onUpdateQuestion={handleUpdateQuestion}
                          onDeleteQuestion={handleDeleteQuestion}
                          onRegenerate={selectedSkill === "READING" ? (sectionId, difficulty) => {
                            regenerateSection({ sectionId, difficulty: difficulty as "easy" | "medium" | "hard" | undefined });
                          } : undefined}
                          dragHandleProps={provided.dragHandleProps}
                          registerFlush={registerSectionFlush}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {(exercise?.sections?.length ?? 0) === 0 && (
          <div className="text-center py-8 text-muted-foreground rounded-md border border-dashed">
            No question sections yet. Click &ldquo;Add Section&rdquo; to start
            building questions.
          </div>
        )}
      </div>

      <AlertDialog
        open={showPublishDialog}
        onOpenChange={setShowPublishDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish Exercise</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to publish this exercise? Students will be
              able to see it and editing will be limited.
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

      <AlertDialog
        open={!!deleteSectionId}
        onOpenChange={(open) => !open && setDeleteSectionId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section</AlertDialogTitle>
            <AlertDialogDescription>
              Delete this section and all its questions? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSectionConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}
