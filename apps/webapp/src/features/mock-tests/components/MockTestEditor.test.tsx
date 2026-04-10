import { render, screen, act } from "@testing-library/react";
import { describe, it, vi, expect, beforeEach } from "vitest";
import { MockTestEditor } from "./MockTestEditor";
import { BrowserRouter } from "react-router";

// Mock @hello-pangea/dnd to capture onDragEnd for testing
const dndMock = vi.hoisted(() => ({
  onDragEnd: null as ((result: unknown) => void) | null,
}));

vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ onDragEnd, children }: { onDragEnd: (result: unknown) => void; children: React.ReactNode }) => {
    dndMock.onDragEnd = onDragEnd;
    return <div data-testid="drag-drop-context">{children}</div>;
  },
  Droppable: ({ children, droppableId }: { children: (provided: unknown, snapshot: unknown) => React.ReactNode; droppableId: string }) =>
    children(
      { innerRef: () => {}, droppableProps: { "data-rbd-droppable-id": droppableId }, placeholder: null },
      { isDraggingOver: false },
    ),
  Draggable: ({ children }: { children: (provided: unknown, snapshot: unknown) => React.ReactNode }) =>
    children(
      { innerRef: () => {}, draggableProps: {}, dragHandleProps: {} },
      { isDragging: false },
    ),
}));

// Mock auth context
vi.mock("@/features/auth/auth-context", () => ({
  useAuth: () => ({
    user: { role: "TEACHER", centerId: "center-1", userId: "user-1" },
    loading: false,
  }),
}));

// Mock react-router params
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useParams: () => ({ id: "mt-1" }),
    useNavigate: () => vi.fn(),
  };
});

// Mock hooks
const mockUseMockTest = vi.fn();
const mockUseMockTests = vi.fn();
const mockUseMockTestSections = vi.fn();

vi.mock("../hooks/use-mock-tests", () => ({
  useMockTest: (...args: unknown[]) => mockUseMockTest(...args),
  useMockTests: (...args: unknown[]) => mockUseMockTests(...args),
  useMockTestSections: (...args: unknown[]) => mockUseMockTestSections(...args),
}));

// Mock ExerciseSelector to isolate editor tests
vi.mock("./ExerciseSelector", () => ({
  ExerciseSelector: () => null,
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

const mockSections = [
  {
    id: "sec-1",
    mockTestId: "mt-1",
    skill: "LISTENING",
    orderIndex: 0,
    timeLimit: 1800,
    exercises: [
      {
        id: "se-1",
        sectionId: "sec-1",
        exerciseId: "ex-1",
        orderIndex: 0,
        exercise: {
          id: "ex-1",
          title: "Listening Exercise 1",
          skill: "LISTENING",
          status: "PUBLISHED",
          bandLevel: "6.0",
          sections: [{ id: "s1", sectionType: "SECTION_1", questions: [{ id: "q1" }, { id: "q2" }] }],
        },
      },
      {
        id: "se-2",
        sectionId: "sec-1",
        exerciseId: "ex-2",
        orderIndex: 1,
        exercise: {
          id: "ex-2",
          title: "Listening Exercise 2",
          skill: "LISTENING",
          status: "PUBLISHED",
          bandLevel: "7.0",
          sections: [{ id: "s2", sectionType: "SECTION_2", questions: [{ id: "q3" }] }],
        },
      },
    ],
  },
  {
    id: "sec-2",
    mockTestId: "mt-1",
    skill: "READING",
    orderIndex: 1,
    timeLimit: 3600,
    exercises: [],
  },
  {
    id: "sec-3",
    mockTestId: "mt-1",
    skill: "WRITING",
    orderIndex: 2,
    timeLimit: 3600,
    exercises: [],
  },
  {
    id: "sec-4",
    mockTestId: "mt-1",
    skill: "SPEAKING",
    orderIndex: 3,
    timeLimit: 900,
    exercises: [],
  },
];

const defaultMockTest = {
  id: "mt-1",
  centerId: "center-1",
  title: "Practice Test 1",
  description: "A practice test",
  testType: "ACADEMIC",
  status: "DRAFT",
  createdById: "user-1",
  createdBy: { id: "user-1", name: "Teacher" },
  createdAt: "2026-02-01T00:00:00.000Z",
  updatedAt: "2026-02-01T00:00:00.000Z",
  sections: mockSections,
};

describe("MockTestEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMockTests.mockReturnValue({
      publishMockTest: vi.fn(),
    });
    mockUseMockTestSections.mockReturnValue({
      updateSection: vi.fn(),
      addExercise: vi.fn(),
      removeExercise: vi.fn(),
      reorderExercises: vi.fn(),
    });
  });

  it("shows loading spinner when loading", () => {
    mockUseMockTest.mockReturnValue({
      mockTest: undefined,
      isLoading: true,
      refetch: vi.fn(),
    });

    render(
      <BrowserRouter>
        <MockTestEditor />
      </BrowserRouter>,
    );

    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows not found when mock test does not exist", () => {
    mockUseMockTest.mockReturnValue({
      mockTest: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(
      <BrowserRouter>
        <MockTestEditor />
      </BrowserRouter>,
    );

    expect(screen.getByText("Mock test not found.")).toBeInTheDocument();
  });

  it("renders 5 tabs (4 skills + Review)", () => {
    mockUseMockTest.mockReturnValue({
      mockTest: defaultMockTest,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(
      <BrowserRouter>
        <MockTestEditor />
      </BrowserRouter>,
    );

    expect(screen.getByRole("tab", { name: "Listening" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Reading" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Writing" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Speaking" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Review" })).toBeInTheDocument();
  });

  it("renders mock test title and status", () => {
    mockUseMockTest.mockReturnValue({
      mockTest: defaultMockTest,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(
      <BrowserRouter>
        <MockTestEditor />
      </BrowserRouter>,
    );

    expect(screen.getByText("Practice Test 1")).toBeInTheDocument();
    expect(screen.getByText("DRAFT")).toBeInTheDocument();
    expect(screen.getByText("Academic")).toBeInTheDocument();
  });

  it("shows exercises in Listening section", () => {
    mockUseMockTest.mockReturnValue({
      mockTest: defaultMockTest,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(
      <BrowserRouter>
        <MockTestEditor />
      </BrowserRouter>,
    );

    // Default tab is Listening which has an exercise
    expect(screen.getByText("Listening Exercise 1")).toBeInTheDocument();
    expect(screen.getByText("2 questions")).toBeInTheDocument();
    expect(screen.getByText("Band 6.0")).toBeInTheDocument();
  });

  it("shows Add Exercise button for DRAFT mock test", () => {
    mockUseMockTest.mockReturnValue({
      mockTest: defaultMockTest,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(
      <BrowserRouter>
        <MockTestEditor />
      </BrowserRouter>,
    );

    expect(screen.getByText("Add Exercise")).toBeInTheDocument();
  });

  it("shows Publish button for DRAFT mock test", () => {
    mockUseMockTest.mockReturnValue({
      mockTest: defaultMockTest,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(
      <BrowserRouter>
        <MockTestEditor />
      </BrowserRouter>,
    );

    // Header publish button
    expect(screen.getByText("Publish")).toBeInTheDocument();
  });

  it("hides Publish button for PUBLISHED mock test", () => {
    mockUseMockTest.mockReturnValue({
      mockTest: { ...defaultMockTest, status: "PUBLISHED" },
      isLoading: false,
      refetch: vi.fn(),
    });

    render(
      <BrowserRouter>
        <MockTestEditor />
      </BrowserRouter>,
    );

    // Should not show the header publish button for non-DRAFT
    expect(screen.queryByText("Publish")).not.toBeInTheDocument();
  });

  it("shows IELTS standard reference for sections", () => {
    mockUseMockTest.mockReturnValue({
      mockTest: defaultMockTest,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(
      <BrowserRouter>
        <MockTestEditor />
      </BrowserRouter>,
    );

    // Listening tab is shown by default
    expect(
      screen.getByText("IELTS Standard: 4 sections, ~40 questions, 30 minutes"),
    ).toBeInTheDocument();
  });

  it("shows time limit input", () => {
    mockUseMockTest.mockReturnValue({
      mockTest: defaultMockTest,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(
      <BrowserRouter>
        <MockTestEditor />
      </BrowserRouter>,
    );

    expect(screen.getByText("Time Limit:")).toBeInTheDocument();
    expect(screen.getByText("minutes")).toBeInTheDocument();
  });

  it("shows empty state when section has no exercises", () => {
    const mockTestNoExercises = {
      ...defaultMockTest,
      sections: mockSections.map((s) => ({ ...s, exercises: [] })),
    };

    mockUseMockTest.mockReturnValue({
      mockTest: mockTestNoExercises,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(
      <BrowserRouter>
        <MockTestEditor />
      </BrowserRouter>,
    );

    expect(
      screen.getByText('No exercises added yet. Click "Add Exercise" to start.'),
    ).toBeInTheDocument();
  });

  it("renders drag handles with cursor-grab class for DRAFT mock tests", () => {
    mockUseMockTest.mockReturnValue({
      mockTest: defaultMockTest,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(
      <BrowserRouter>
        <MockTestEditor />
      </BrowserRouter>,
    );

    // DRAFT mock test should have functional drag handles with cursor-grab
    const grabHandles = document.querySelectorAll(".cursor-grab");
    expect(grabHandles.length).toBeGreaterThan(0);

    // Both exercises should be rendered
    expect(screen.getByText("Listening Exercise 1")).toBeInTheDocument();
    expect(screen.getByText("Listening Exercise 2")).toBeInTheDocument();
  });

  it("does not render DragDropContext for PUBLISHED mock tests", () => {
    mockUseMockTest.mockReturnValue({
      mockTest: { ...defaultMockTest, status: "PUBLISHED" },
      isLoading: false,
      refetch: vi.fn(),
    });

    render(
      <BrowserRouter>
        <MockTestEditor />
      </BrowserRouter>,
    );

    // PUBLISHED mock test should NOT have cursor-grab drag handles
    const grabHandles = document.querySelectorAll(".cursor-grab");
    expect(grabHandles.length).toBe(0);

    // Exercises should still render
    expect(screen.getByText("Listening Exercise 1")).toBeInTheDocument();
    expect(screen.getByText("Listening Exercise 2")).toBeInTheDocument();
  });

  it("calls reorderExercises when drag ends with new position", async () => {
    const mockReorderExercises = vi.fn().mockResolvedValue(undefined);
    const mockRefetch = vi.fn();
    mockUseMockTestSections.mockReturnValue({
      updateSection: vi.fn(),
      addExercise: vi.fn(),
      removeExercise: vi.fn(),
      reorderExercises: mockReorderExercises,
    });

    mockUseMockTest.mockReturnValue({
      mockTest: defaultMockTest,
      isLoading: false,
      refetch: mockRefetch,
    });

    render(
      <BrowserRouter>
        <MockTestEditor />
      </BrowserRouter>,
    );

    // DragDropContext should have captured the onDragEnd callback
    expect(dndMock.onDragEnd).toBeTruthy();

    // Simulate dragging exercise from index 0 to index 1
    await act(async () => {
      dndMock.onDragEnd!({
        source: { droppableId: "sec-1", index: 0 },
        destination: { droppableId: "sec-1", index: 1 },
      });
    });

    // reorderExercises should be called with swapped order: ex-2 first, ex-1 second
    expect(mockReorderExercises).toHaveBeenCalledWith({
      sectionId: "sec-1",
      exerciseIds: ["ex-2", "ex-1"],
    });
  });

  it("does not call reorderExercises when dropped in same position", async () => {
    const mockReorderExercises = vi.fn().mockResolvedValue(undefined);
    mockUseMockTestSections.mockReturnValue({
      updateSection: vi.fn(),
      addExercise: vi.fn(),
      removeExercise: vi.fn(),
      reorderExercises: mockReorderExercises,
    });

    mockUseMockTest.mockReturnValue({
      mockTest: defaultMockTest,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(
      <BrowserRouter>
        <MockTestEditor />
      </BrowserRouter>,
    );

    await act(async () => {
      dndMock.onDragEnd!({
        source: { droppableId: "sec-1", index: 0 },
        destination: { droppableId: "sec-1", index: 0 },
      });
    });

    expect(mockReorderExercises).not.toHaveBeenCalled();
  });
});
