import { render, screen } from "@testing-library/react";
import { describe, it, vi, expect, beforeEach } from "vitest";
import { ExerciseEditor } from "./ExerciseEditor";
import { BrowserRouter } from "react-router";

// Mock @hello-pangea/dnd
vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="drag-drop-context">{children}</div>
  ),
  Droppable: ({
    children,
    droppableId,
  }: {
    children: (provided: unknown) => React.ReactNode;
    droppableId: string;
  }) =>
    children({
      innerRef: () => {},
      droppableProps: { "data-rbd-droppable-id": droppableId },
      placeholder: null,
    }),
  Draggable: ({
    children,
  }: {
    children: (provided: unknown) => React.ReactNode;
  }) =>
    children({
      innerRef: () => {},
      draggableProps: {},
      dragHandleProps: {},
    }),
}));

// Mock auth context
vi.mock("@/features/auth/auth-context", () => ({
  useAuth: () => ({
    user: { role: "TEACHER", centerId: "center-1", userId: "user-1" },
    loading: false,
  }),
}));

// Mock react-router
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useParams: () => ({ id: "ex-1" }),
    useNavigate: () => vi.fn(),
  };
});

// Mock hooks
const mockUseExercises = vi.fn();
const mockUseExercise = vi.fn();
const mockUseExerciseHasSubmissions = vi.fn();

vi.mock("../hooks/use-exercises", () => ({
  useExercises: (...args: unknown[]) => mockUseExercises(...args),
  useExercise: (...args: unknown[]) => mockUseExercise(...args),
  useExerciseHasSubmissions: (...args: unknown[]) =>
    mockUseExerciseHasSubmissions(...args),
}));

vi.mock("../hooks/use-sections", () => ({
  useSections: () => ({
    createSection: vi.fn(),
    updateSection: vi.fn(),
    deleteSection: vi.fn(),
    reorderSections: vi.fn(),
    createQuestion: vi.fn(),
    updateQuestion: vi.fn(),
    deleteQuestion: vi.fn(),
  }),
}));

vi.mock("../hooks/use-tags", () => ({
  useExerciseTags: () => ({
    exerciseTags: [],
    setExerciseTags: vi.fn(),
  }),
}));

vi.mock("../hooks/use-ai-generation", () => ({
  useAIGeneration: () => ({
    regenerateSection: vi.fn(),
  }),
}));

vi.mock("@/core/context/breadcrumb-context", () => ({
  useBreadcrumbOverrides: () => ({
    setLabel: vi.fn(),
    removeLabel: vi.fn(),
    setNonClickable: vi.fn(),
    removeNonClickable: vi.fn(),
  }),
}));

vi.mock("@/features/assignments/components/create-assignment-dialog", () => ({
  CreateAssignmentDialog: () => null,
}));

// Mock sub-editors to simplify
vi.mock("./PassageEditor", () => ({ PassageEditor: () => null }));
vi.mock("./QuestionSectionEditor", () => ({
  QuestionSectionEditor: () => null,
}));
vi.mock("./SkillSelector", () => ({ SkillSelector: () => null }));
vi.mock("./AudioUploadEditor", () => ({ AudioUploadEditor: () => null }));
vi.mock("./AudioSectionMarkers", () => ({ AudioSectionMarkers: () => null }));
vi.mock("./PlaybackModeSettings", () => ({
  PlaybackModeSettings: () => null,
}));
vi.mock("./WritingTaskEditor", () => ({ WritingTaskEditor: () => null }));
vi.mock("./WritingRubricDisplay", () => ({ WritingRubricDisplay: () => null }));
vi.mock("./SpeakingTaskEditor", () => ({ SpeakingTaskEditor: () => null }));
vi.mock("./TimerSettingsEditor", () => ({ TimerSettingsEditor: () => null }));
vi.mock("./DocumentUploadPanel", () => ({ DocumentUploadPanel: () => null }));
vi.mock("./AIGenerationPanel", () => ({ AIGenerationPanel: () => null }));
vi.mock("./TagSelector", () => ({ TagSelector: () => null }));
vi.mock("./question-types/QuestionPreviewFactory", () => ({
  QuestionPreviewFactory: () => null,
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

const baseExercise = {
  id: "ex-1",
  centerId: "center-1",
  title: "Test Exercise",
  instructions: "Some instructions",
  skill: "READING" as const,
  status: "DRAFT" as const,
  passageContent: "A passage",
  passageFormat: null,
  passageSourceType: null,
  passageSourceUrl: null,
  caseSensitive: false,
  partialCredit: false,
  audioUrl: null,
  audioDuration: null,
  playbackMode: null,
  audioSections: null,
  showTranscriptAfterSubmit: false,
  stimulusImageUrl: null,
  writingPrompt: null,
  letterTone: null,
  wordCountMin: null,
  wordCountMax: null,
  wordCountMode: null,
  sampleResponse: null,
  showSampleAfterGrading: false,
  speakingPrepTime: null,
  speakingTime: null,
  maxRecordingDuration: null,
  enableTranscription: false,
  timeLimit: null,
  timerPosition: null,
  warningAlerts: null,
  autoSubmitOnExpiry: true,
  gracePeriodSeconds: null,
  enablePause: false,
  bandLevel: null,
  createdById: "user-1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: { id: "user-1", name: "Teacher" },
  sections: [],
  tags: [],
};

function renderEditor() {
  return render(
    <BrowserRouter>
      <ExerciseEditor />
    </BrowserRouter>,
  );
}

describe("ExerciseEditor — edit-after-publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseExercises.mockReturnValue({
      exercises: [],
      isLoading: false,
      createExercise: vi.fn(),
      updateExercise: vi.fn(),
      publishExercise: vi.fn(),
      archiveExercise: vi.fn(),
      duplicateExercise: vi.fn(),
      deleteExercise: vi.fn(),
      restoreExercise: vi.fn(),
      bulkArchive: vi.fn(),
      bulkDuplicate: vi.fn(),
      bulkTag: vi.fn(),
      isCreating: false,
      isUpdating: false,
      isPublishing: false,
      isArchiving: false,
      isDuplicating: false,
      isDeleting: false,
      isRestoring: false,
    });
  });

  it("DRAFT exercise shows Save Draft and Publish buttons", () => {
    mockUseExercise.mockReturnValue({
      exercise: { ...baseExercise, status: "DRAFT" },
      isLoading: false,
      autosave: vi.fn(),
      isAutosaving: false,
      refetch: vi.fn(),
    });
    mockUseExerciseHasSubmissions.mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    renderEditor();

    expect(screen.getByLabelText("Save Draft")).toBeInTheDocument();
    expect(screen.getByLabelText("Publish")).toBeInTheDocument();
  });

  it("PUBLISHED exercise with no submissions shows Save button", () => {
    mockUseExercise.mockReturnValue({
      exercise: { ...baseExercise, status: "PUBLISHED" },
      isLoading: false,
      autosave: vi.fn(),
      isAutosaving: false,
      refetch: vi.fn(),
    });
    mockUseExerciseHasSubmissions.mockReturnValue({
      data: false,
      isLoading: false,
    });

    renderEditor();

    expect(screen.getByLabelText("Save Draft")).toBeInTheDocument();
    // Publish button should NOT appear for published exercises
    expect(screen.queryByLabelText("Publish")).not.toBeInTheDocument();
  });

  it("PUBLISHED exercise with submissions shows Read-only lock indicator", () => {
    mockUseExercise.mockReturnValue({
      exercise: { ...baseExercise, status: "PUBLISHED" },
      isLoading: false,
      autosave: vi.fn(),
      isAutosaving: false,
      refetch: vi.fn(),
    });
    mockUseExerciseHasSubmissions.mockReturnValue({
      data: true,
      isLoading: false,
    });

    renderEditor();

    expect(screen.getByText("Read-only")).toBeInTheDocument();
    expect(screen.queryByLabelText("Save Draft")).not.toBeInTheDocument();
  });

  it("PUBLISHED exercise with submissions disables form via fieldset", () => {
    mockUseExercise.mockReturnValue({
      exercise: { ...baseExercise, status: "PUBLISHED" },
      isLoading: false,
      autosave: vi.fn(),
      isAutosaving: false,
      refetch: vi.fn(),
    });
    mockUseExerciseHasSubmissions.mockReturnValue({
      data: true,
      isLoading: false,
    });

    const { container } = renderEditor();

    // The fieldset wrapping the form should have disabled attribute
    const fieldset = container.querySelector("fieldset");
    expect(fieldset).toBeTruthy();
    expect(fieldset?.disabled).toBe(true);
  });

  it("PUBLISHED exercise while hasSubmissions is loading defaults to read-only", () => {
    mockUseExercise.mockReturnValue({
      exercise: { ...baseExercise, status: "PUBLISHED" },
      isLoading: false,
      autosave: vi.fn(),
      isAutosaving: false,
      refetch: vi.fn(),
    });
    mockUseExerciseHasSubmissions.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { container } = renderEditor();

    // Save button should NOT be visible during loading (safe default)
    expect(screen.queryByLabelText("Save Draft")).not.toBeInTheDocument();
    // Fieldset should be disabled (canEdit is false while loading)
    const fieldset = container.querySelector("fieldset");
    expect(fieldset).toBeTruthy();
    expect(fieldset?.disabled).toBe(true);
  });

  it("PUBLISHED exercise with no submissions enables form inputs", () => {
    mockUseExercise.mockReturnValue({
      exercise: { ...baseExercise, status: "PUBLISHED" },
      isLoading: false,
      autosave: vi.fn(),
      isAutosaving: false,
      refetch: vi.fn(),
    });
    mockUseExerciseHasSubmissions.mockReturnValue({
      data: false,
      isLoading: false,
    });

    renderEditor();

    const titleInput = screen.getByLabelText("Title") as HTMLInputElement;
    expect(titleInput.disabled).toBe(false);
  });
});
