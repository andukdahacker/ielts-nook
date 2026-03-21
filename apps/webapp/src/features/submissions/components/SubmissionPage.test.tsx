import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";

// --- Module mocks ---

const mockStartMutate = vi.fn();
vi.mock("../hooks/use-start-submission", () => ({
  useStartSubmission: () => ({ mutate: mockStartMutate, isPending: false }),
}));

const mockSaveMutate = vi.fn();
const mockSaveMutateAsync = vi.fn().mockResolvedValue(undefined);
vi.mock("../hooks/use-save-answers", () => ({
  useSaveAnswers: () => ({
    mutate: mockSaveMutate,
    mutateAsync: mockSaveMutateAsync,
  }),
}));

const mockSubmitMutateAsync = vi.fn().mockResolvedValue(undefined);
vi.mock("../hooks/use-submit-submission", () => ({
  useSubmitSubmission: () => ({ mutateAsync: mockSubmitMutateAsync }),
}));

vi.mock("../hooks/use-upload-photo", () => ({
  useUploadPhoto: () => ({ mutateAsync: vi.fn().mockResolvedValue(undefined) }),
}));

const mockUseAutoSave = vi.fn();
vi.mock("../hooks/use-auto-save", () => ({
  useAutoSave: (...args: unknown[]) => mockUseAutoSave(...args),
}));

const mockLoadLocal = vi.fn();
const mockClearLocal = vi.fn();
const mockPersistSubmitPending = vi.fn();
const mockLoadSubmitPending = vi.fn();
const mockClearSubmitPending = vi.fn();
vi.mock("../lib/submission-storage", () => ({
  loadAnswersLocal: (...args: unknown[]) => mockLoadLocal(...args),
  clearAnswersLocal: (...args: unknown[]) => mockClearLocal(...args),
  persistSubmitPending: (...args: unknown[]) => mockPersistSubmitPending(...args),
  loadSubmitPending: (...args: unknown[]) => mockLoadSubmitPending(...args),
  clearSubmitPending: (...args: unknown[]) => mockClearSubmitPending(...args),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

const { mockIsOnline } = vi.hoisted(() => ({
  mockIsOnline: vi.fn().mockReturnValue(true),
}));
vi.mock("@tanstack/react-query", () => ({
  onlineManager: {
    isOnline: mockIsOnline,
  },
}));

vi.mock("../hooks/use-assignment-detail", () => ({
  useAssignmentDetail: () => ({
    data: {
      data: {
        exercise: {
          title: "Test Exercise",
          skill: "READING",
          timeLimit: null,
          autoSubmitOnExpiry: false,
          passageContent: null,
          audioUrl: null,
          sections: [
            {
              sectionType: "R1_MULTIPLE_CHOICE",
              instructions: "Choose one",
              questions: [
                { id: "q1", questionText: "Question 1?", options: ["A", "B"], wordLimit: null },
                { id: "q2", questionText: "Question 2?", options: ["C", "D"], wordLimit: null },
              ],
            },
          ],
        },
      },
    },
    isLoading: false,
    isError: false,
  }),
}));

// --- Imports (after mocks) ---

import { toast } from "sonner";
import { SubmissionPage } from "./SubmissionPage";

// --- Helpers ---

const lastServerSaveRef = { current: 0 };

function renderSubmissionPage() {
  return render(
    <MemoryRouter initialEntries={["/c1/assignments/a1/submit"]}>
      <Routes>
        <Route
          path="/:centerId/assignments/:assignmentId/submit"
          element={<SubmissionPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  vi.clearAllMocks();
  lastServerSaveRef.current = 0;
  mockLoadLocal.mockResolvedValue(undefined);
  mockClearLocal.mockResolvedValue(undefined);
  mockSaveMutateAsync.mockResolvedValue(undefined);
  mockSubmitMutateAsync.mockResolvedValue(undefined);
  mockPersistSubmitPending.mockResolvedValue(undefined);
  mockLoadSubmitPending.mockResolvedValue(false);
  mockClearSubmitPending.mockResolvedValue(undefined);
  mockIsOnline.mockReturnValue(true);

  mockUseAutoSave.mockReturnValue({
    saveStatus: "idle",
    lastSavedAt: null,
    lastServerSaveTimestamp: lastServerSaveRef,
    clearLocal: vi.fn().mockResolvedValue(undefined),
    storageAvailable: true,
    isOnline: true,
  });

  mockStartMutate.mockImplementation(
    (_: unknown, options?: { onSuccess?: (data: unknown) => void }) => {
      options?.onSuccess?.({
        data: {
          id: "sub-1",
          startedAt: new Date().toISOString(),
          answers: [],
        },
      });
    },
  );
});

describe("SubmissionPage", () => {
  describe("Task 6.3: IndexedDB restore and merge with server answers", () => {
    it("calls loadAnswersLocal with centerId and assignmentId after submission starts", async () => {
      renderSubmissionPage();

      await waitFor(() => {
        expect(mockLoadLocal).toHaveBeenCalledWith("c1", "a1");
      });
    });

    it("merges local answers over server-seeded answers (local wins)", async () => {
      mockStartMutate.mockImplementation(
        (_: unknown, options?: { onSuccess?: (data: unknown) => void }) => {
          options?.onSuccess?.({
            data: {
              id: "sub-1",
              startedAt: new Date().toISOString(),
              answers: [{ questionId: "q1", answer: { text: "server" } }],
            },
          });
        },
      );

      mockLoadLocal.mockResolvedValue({
        centerId: "c1",
        assignmentId: "a1",
        submissionId: "sub-1",
        answers: { q1: { text: "local-override" }, q2: { text: "local-only" } },
        savedAt: Date.now(),
      });

      renderSubmissionPage();

      await waitFor(() => {
        expect(mockLoadLocal).toHaveBeenCalledWith("c1", "a1");
      });

      // After merge: q2 should be answered (from local), so pill 2 gets answered style
      await waitFor(() => {
        const pill2 = screen.getByRole("button", { name: "2" });
        expect(pill2.className).toContain("bg-primary/20");
      });
    });
  });

  describe("Task 6.7: save-on-navigate skips when server saved recently", () => {
    it("skips server save when lastServerSaveTimestamp < 1s ago", async () => {
      mockStartMutate.mockImplementation(
        (_: unknown, options?: { onSuccess?: (data: unknown) => void }) => {
          options?.onSuccess?.({
            data: {
              id: "sub-1",
              startedAt: new Date().toISOString(),
              answers: [{ questionId: "q1", answer: { text: "answer" } }],
            },
          });
        },
      );

      // Server saved just now
      lastServerSaveRef.current = Date.now();

      const user = userEvent.setup();
      renderSubmissionPage();

      await waitFor(() => {
        expect(mockStartMutate).toHaveBeenCalled();
      });

      // Navigate to next question — triggers save-on-navigate effect
      const nextButton = screen.getByRole("button", { name: /next/i });
      await user.click(nextButton);

      // save-on-navigate should be skipped because server saved < 1s ago
      expect(mockSaveMutate).not.toHaveBeenCalled();
    });
  });

  describe("Task 6.8: integration — auto-save active", () => {
    it("renders with auto-save and passes correct params to useAutoSave", async () => {
      renderSubmissionPage();

      await waitFor(() => {
        expect(mockStartMutate).toHaveBeenCalled();
      });

      expect(mockUseAutoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          centerId: "c1",
          assignmentId: "a1",
          submissionId: "sub-1",
          enabled: true,
        }),
      );

      expect(screen.getByText("Test Exercise")).toBeInTheDocument();
      expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
    });
  });

  // --- Story 4.3 tests ---

  describe("OfflineBanner integration", () => {
    it("renders OfflineBanner when offline", async () => {
      mockUseAutoSave.mockReturnValue({
        saveStatus: "offline",
        lastSavedAt: null,
        lastServerSaveTimestamp: lastServerSaveRef,
        clearLocal: vi.fn().mockResolvedValue(undefined),
        storageAvailable: true,
        isOnline: false,
      });

      renderSubmissionPage();

      await waitFor(() => {
        expect(screen.getByTestId("offline-banner")).toBeInTheDocument();
      });
    });

    it("hides OfflineBanner when online", async () => {
      renderSubmissionPage();

      await waitFor(() => {
        expect(screen.queryByTestId("offline-banner")).not.toBeInTheDocument();
      });
    });
  });

  describe("Offline submit flow", () => {
    it("shows warning toast when submitting while offline", async () => {
      // Set offline state
      mockIsOnline.mockReturnValue(false);
      mockUseAutoSave.mockReturnValue({
        saveStatus: "offline",
        lastSavedAt: null,
        lastServerSaveTimestamp: lastServerSaveRef,
        clearLocal: vi.fn().mockResolvedValue(undefined),
        storageAvailable: true,
        isOnline: false,
      });

      // Make submit fail (offline — mutateAsync rejects)
      mockSubmitMutateAsync.mockRejectedValueOnce(new Error("Failed to fetch"));

      const user = userEvent.setup();
      renderSubmissionPage();

      await waitFor(() => {
        expect(mockStartMutate).toHaveBeenCalled();
      });

      // Navigate to last question to show Submit button
      const nextButton = screen.getByRole("button", { name: /next/i });
      await user.click(nextButton);

      // Open submit dialog
      const submitBtn = screen.getByRole("button", { name: /submit/i });
      await user.click(submitBtn);

      // Confirm submit in the dialog
      const confirmBtn = await screen.findByRole("button", { name: /^submit$/i });
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(toast.warning).toHaveBeenCalledWith(
          "You're offline. Your answers are saved locally and will submit automatically when you reconnect.",
        );
      });

      // Should persist submit-pending
      expect(mockPersistSubmitPending).toHaveBeenCalledWith("c1", "a1");
    });

    it("does NOT navigate to SubmissionCompletePage when offline", async () => {
      mockIsOnline.mockReturnValue(false);
      mockUseAutoSave.mockReturnValue({
        saveStatus: "offline",
        lastSavedAt: null,
        lastServerSaveTimestamp: lastServerSaveRef,
        clearLocal: vi.fn().mockResolvedValue(undefined),
        storageAvailable: true,
        isOnline: false,
      });
      mockSubmitMutateAsync.mockRejectedValueOnce(new Error("Failed to fetch"));

      const user = userEvent.setup();
      renderSubmissionPage();

      await waitFor(() => {
        expect(mockStartMutate).toHaveBeenCalled();
      });

      // Navigate to last question
      const nextButton = screen.getByRole("button", { name: /next/i });
      await user.click(nextButton);

      const submitBtn = screen.getByRole("button", { name: /submit/i });
      await user.click(submitBtn);
      const confirmBtn = await screen.findByRole("button", { name: /^submit$/i });
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(toast.warning).toHaveBeenCalled();
      });

      // Should still be on submission page, not complete page
      expect(screen.getByText("Test Exercise")).toBeInTheDocument();
    });

    it("shows success toast only after server confirms (200)", async () => {
      const user = userEvent.setup();
      renderSubmissionPage();

      await waitFor(() => {
        expect(mockStartMutate).toHaveBeenCalled();
      });

      // Navigate to last question
      const nextButton = screen.getByRole("button", { name: /next/i });
      await user.click(nextButton);

      const submitBtn = screen.getByRole("button", { name: /submit/i });
      await user.click(submitBtn);
      const confirmBtn = await screen.findByRole("button", { name: /^submit$/i });
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Submission received.");
      });

      // Should also clear submit-pending
      expect(mockClearSubmitPending).toHaveBeenCalledWith("c1", "a1");
    });

    it("shows error toast when submit fails with server error while online", async () => {
      mockSubmitMutateAsync.mockRejectedValueOnce(new Error("Internal Server Error"));

      const user = userEvent.setup();
      renderSubmissionPage();

      await waitFor(() => {
        expect(mockStartMutate).toHaveBeenCalled();
      });

      // Navigate to last question
      const nextButton = screen.getByRole("button", { name: /next/i });
      await user.click(nextButton);

      const submitBtn = screen.getByRole("button", { name: /submit/i });
      await user.click(submitBtn);
      const confirmBtn = await screen.findByRole("button", { name: /^submit$/i });
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Internal Server Error");
      });

      // Should still be on submission page
      expect(screen.getByText("Test Exercise")).toBeInTheDocument();
    });
  });

  describe("Submit-pending persistence", () => {
    it("checks for persisted submit-pending on mount", async () => {
      renderSubmissionPage();

      await waitFor(() => {
        expect(mockLoadSubmitPending).toHaveBeenCalledWith("c1", "a1");
      });
    });

    it("auto-retries submit when persisted pending flag found on mount while online", async () => {
      mockLoadSubmitPending.mockResolvedValue(true);

      renderSubmissionPage();

      await waitFor(() => {
        expect(mockLoadSubmitPending).toHaveBeenCalledWith("c1", "a1");
      });

      // Should auto-retry the submit
      await waitFor(() => {
        expect(mockSubmitMutateAsync).toHaveBeenCalled();
      });
    });

    it("shows recovery toast for offline recovery submit via persisted flag", async () => {
      mockLoadSubmitPending.mockResolvedValue(true);

      renderSubmissionPage();

      await waitFor(() => {
        expect(mockSubmitMutateAsync).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("You're back online! Submission received.");
      });
    });
  });
});
