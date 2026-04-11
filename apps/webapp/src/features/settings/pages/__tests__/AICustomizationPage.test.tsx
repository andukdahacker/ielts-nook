import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AICustomizationPage } from "../AICustomizationPage";

// Mock auth context
const mockUseAuth = vi.fn();
vi.mock("@/features/auth/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock react-query client
const mockSetQueryData = vi.fn();
const mockInvalidateQueries = vi.fn();
vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useQueryClient: () => ({
      setQueryData: mockSetQueryData,
      invalidateQueries: mockInvalidateQueries,
    }),
  };
});

// Mock golden samples API hooks
const mockCreateMutateAsync = vi.fn();
const mockUpdateMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();
const mockToggleMutateAsync = vi.fn();
const mockReorderMutateAsync = vi.fn();

const mockSamples = [
  {
    id: "s1",
    title: "Writing Sample 1",
    skillType: "WRITING" as const,
    studentWork: "A".repeat(60),
    teacherFeedback: "B".repeat(60),
    isActive: true,
    order: 1,
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "s2",
    title: "Writing Sample 2",
    skillType: "WRITING" as const,
    studentWork: "C".repeat(60),
    teacherFeedback: "D".repeat(60),
    isActive: false,
    order: 2,
    createdAt: "2026-01-02T00:00:00Z",
  },
  {
    id: "s3",
    title: "Speaking Sample 1",
    skillType: "SPEAKING" as const,
    studentWork: "E".repeat(60),
    teacherFeedback: "F".repeat(60),
    isActive: true,
    order: 1,
    createdAt: "2026-01-03T00:00:00Z",
  },
];

let mockSamplesData: typeof mockSamples | undefined = mockSamples;
let mockIsLoading = false;

vi.mock("../../golden-samples.api", () => ({
  goldenSampleKeys: {
    all: ["golden-samples"],
    list: () => ["golden-samples", "list"],
  },
  useGoldenSamples: () => ({
    data: mockSamplesData,
    isLoading: mockIsLoading,
  }),
  useCreateGoldenSample: () => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
  }),
  useUpdateGoldenSample: () => ({
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
  }),
  useDeleteGoldenSample: () => ({
    mutateAsync: mockDeleteMutateAsync,
    isPending: false,
  }),
  useToggleGoldenSample: () => ({
    mutateAsync: mockToggleMutateAsync,
    isPending: false,
  }),
  useReorderGoldenSamples: () => ({
    mutateAsync: mockReorderMutateAsync,
    isPending: false,
  }),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock @hello-pangea/dnd (renders children without DnD functionality)
vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Droppable: ({ children }: { children: (provided: unknown) => React.ReactNode }) =>
    children({
      innerRef: vi.fn(),
      droppableProps: {},
      placeholder: null,
    }),
  Draggable: ({ children }: { children: (provided: unknown) => React.ReactNode }) =>
    children({
      innerRef: vi.fn(),
      draggableProps: {},
      dragHandleProps: {},
    }),
}));

describe("AICustomizationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { centerId: "center-1", id: "user-1", role: "OWNER" },
    });
    mockSamplesData = mockSamples;
    mockIsLoading = false;
  });

  it("renders with Writing and Speaking tabs", () => {
    render(<AICustomizationPage />);
    expect(screen.getByText(/Writing \(2\/10\)/)).toBeInTheDocument();
    expect(screen.getByText(/Speaking \(1\/10\)/)).toBeInTheDocument();
  });

  it("shows sample list from mocked query", () => {
    render(<AICustomizationPage />);
    expect(screen.getByText("Writing Sample 1")).toBeInTheDocument();
    expect(screen.getByText("Writing Sample 2")).toBeInTheDocument();
  });

  it("shows upload date on sample cards", () => {
    render(<AICustomizationPage />);
    const dateElements = screen.getAllByText(/Uploaded/);
    expect(dateElements.length).toBeGreaterThanOrEqual(1);
  });

  it("shows empty state when no samples", () => {
    mockSamplesData = [];
    render(<AICustomizationPage />);
    expect(
      screen.getByText(/No Writing golden samples yet/),
    ).toBeInTheDocument();
  });

  it("Add Sample opens form dialog", async () => {
    const user = userEvent.setup();
    render(<AICustomizationPage />);
    const addButtons = screen.getAllByText("Add Sample");
    await user.click(addButtons[0]);
    expect(screen.getByText("Add Golden Sample")).toBeInTheDocument();
  });

  it("Delete opens confirmation dialog", async () => {
    const user = userEvent.setup();
    render(<AICustomizationPage />);
    const deleteButtons = screen.getAllByLabelText("Delete");
    await user.click(deleteButtons[0]);
    expect(screen.getByText("Delete Golden Sample")).toBeInTheDocument();
    expect(
      screen.getByText(/permanently remove this golden sample/),
    ).toBeInTheDocument();
  });

  it("role gate shows error for non-OWNER", () => {
    mockUseAuth.mockReturnValue({
      user: { centerId: "center-1", id: "user-1", role: "ADMIN" },
    });
    render(<AICustomizationPage />);
    expect(screen.getByText("Requires Owner Access")).toBeInTheDocument();
    expect(
      screen.getByText(/Only the center owner/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Writing/)).not.toBeInTheDocument();
  });

  it("sample counter shows correct X/10", () => {
    render(<AICustomizationPage />);
    expect(screen.getByText(/Writing \(2\/10\)/)).toBeInTheDocument();
    expect(screen.getByText(/Speaking \(1\/10\)/)).toBeInTheDocument();
  });

  it("confirms delete and calls mutation", async () => {
    mockDeleteMutateAsync.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<AICustomizationPage />);
    const deleteButtons = screen.getAllByLabelText("Delete");
    await user.click(deleteButtons[0]);
    const confirmButton = screen.getByRole("button", { name: "Delete" });
    await user.click(confirmButton);
    await waitFor(() => {
      expect(mockDeleteMutateAsync).toHaveBeenCalledWith("s1");
    });
  });

  it("shows Speaking samples when Speaking tab is clicked", async () => {
    const user = userEvent.setup();
    render(<AICustomizationPage />);
    await user.click(screen.getByText(/Speaking \(1\/10\)/));
    expect(screen.getByText("Speaking Sample 1")).toBeInTheDocument();
  });
});
