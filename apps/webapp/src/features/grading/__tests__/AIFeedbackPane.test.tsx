import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock @workspace/ui components
vi.mock("@workspace/ui/components/badge", () => ({
  Badge: ({ children, ...props }: { children: React.ReactNode; variant?: string; className?: string }) => (
    <span data-testid="badge" {...props}>{children}</span>
  ),
}));

vi.mock("@workspace/ui/components/button", () => ({
  Button: ({ children, onClick, disabled, ...props }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: string; size?: string }) => (
    <button onClick={onClick} disabled={disabled} data-testid="button" {...props}>{children}</button>
  ),
}));

vi.mock("@workspace/ui/components/card", () => ({
  Card: ({ children, ...props }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" {...props}>{children}</div>
  ),
  CardContent: ({ children, ...props }: { children: React.ReactNode; className?: string }) => (
    <div {...props}>{children}</div>
  ),
  CardHeader: ({ children, ...props }: { children: React.ReactNode; className?: string }) => (
    <div {...props}>{children}</div>
  ),
  CardTitle: ({ children, ...props }: { children: React.ReactNode; className?: string }) => (
    <div {...props}>{children}</div>
  ),
}));

vi.mock("@workspace/ui/components/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

vi.mock("@workspace/ui/components/skeleton", () => ({
  Skeleton: (props: { className?: string }) => <div data-testid="skeleton" {...props} />,
}));

vi.mock("@workspace/ui/components/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode; defaultOpen?: boolean }) => (
    <div data-testid="tooltip">{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="tooltip-trigger">{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode; side?: string }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

vi.mock("react-router", () => ({
  useParams: () => ({ centerId: "center-1" }),
}));

import { AIFeedbackPane } from "../components/AIFeedbackPane";

const mockFeedback = {
  id: "fb-1",
  overallScore: 6.5,
  criteriaScores: {
    taskAchievement: 7,
    coherence: 6,
    lexicalResource: 6.5,
    grammaticalRange: 6.5,
  },
  generalFeedback: "Good effort overall with room for improvement.",
  items: [
    {
      id: "item-1",
      type: "grammar" as const,
      content: "Subject-verb agreement error",
      severity: "error" as const,
      confidence: 0.95,
      suggestedFix: "are",
      originalContextSnippet: "is",
    },
    {
      id: "item-2",
      type: "vocabulary" as const,
      content: "Consider using a more academic term",
      severity: "suggestion" as const,
      confidence: 0.8,
      suggestedFix: null,
      originalContextSnippet: null,
    },
    {
      id: "item-3",
      type: "grammar" as const,
      content: "Missing article before noun",
      severity: "warning" as const,
      confidence: 0.9,
      suggestedFix: null,
      originalContextSnippet: null,
    },
  ],
};

describe("AIFeedbackPane", () => {
  const defaultProps = {
    analysisStatus: "ready" as const,
    feedback: mockFeedback,
    skill: "WRITING" as const,
    onRetrigger: vi.fn(),
    isRetriggering: false,
  };

  it("renders band score card with overall score", () => {
    render(<AIFeedbackPane {...defaultProps} />);
    // Overall score 6.5 appears along with matching criteria scores
    expect(screen.getAllByText("6.5").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Band Score")).toBeInTheDocument();
  });

  it("renders writing criteria labels", () => {
    render(<AIFeedbackPane {...defaultProps} />);
    expect(screen.getByText("Task Achievement")).toBeInTheDocument();
    expect(screen.getByText("Coherence & Cohesion")).toBeInTheDocument();
    expect(screen.getByText("Lexical Resource")).toBeInTheDocument();
    expect(screen.getByText("Grammatical Range & Accuracy")).toBeInTheDocument();
  });

  it("renders speaking criteria labels when skill is SPEAKING", () => {
    render(
      <AIFeedbackPane
        {...defaultProps}
        skill="SPEAKING"
        feedback={{
          ...mockFeedback,
          criteriaScores: {
            fluency: 7,
            lexicalResource: 6,
            grammaticalRange: 6.5,
            pronunciation: 7,
          },
        }}
      />,
    );

    expect(screen.getByText("Fluency & Coherence")).toBeInTheDocument();
    expect(screen.getByText("Pronunciation")).toBeInTheDocument();
  });

  it("renders general feedback", () => {
    render(<AIFeedbackPane {...defaultProps} />);
    expect(
      screen.getByText("Good effort overall with room for improvement."),
    ).toBeInTheDocument();
  });

  it("renders feedback items grouped by type with counts", () => {
    render(<AIFeedbackPane {...defaultProps} />);
    // Grammar has 2 items
    expect(screen.getByText("Grammar Issues (2)")).toBeInTheDocument();
    // Vocabulary has 1 item
    expect(screen.getByText("Vocabulary (1)")).toBeInTheDocument();
  });

  it("renders feedback item content", () => {
    render(<AIFeedbackPane {...defaultProps} />);
    expect(
      screen.getByText("Subject-verb agreement error"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Consider using a more academic term"),
    ).toBeInTheDocument();
  });

  it("renders severity badges", () => {
    render(<AIFeedbackPane {...defaultProps} />);
    expect(screen.getByText("error")).toBeInTheDocument();
    expect(screen.getByText("suggestion")).toBeInTheDocument();
    expect(screen.getByText("warning")).toBeInTheDocument();
  });

  it("renders confidence percentage", () => {
    render(<AIFeedbackPane {...defaultProps} />);
    expect(screen.getByText("95%")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
  });

  it("shows skeleton loading when analyzing", () => {
    render(
      <AIFeedbackPane
        {...defaultProps}
        analysisStatus="analyzing"
        feedback={null}
      />,
    );

    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
    expect(
      screen.getByText("AI is analyzing this submission..."),
    ).toBeInTheDocument();
  });

  it("shows failed state with retry button", () => {
    render(
      <AIFeedbackPane
        {...defaultProps}
        analysisStatus="failed"
        feedback={null}
        failureReason="API timeout"
      />,
    );

    expect(screen.getByText("AI Analysis Failed")).toBeInTheDocument();
    expect(screen.getByText("API timeout")).toBeInTheDocument();
    expect(screen.getByText("Re-analyze")).toBeInTheDocument();
    expect(
      screen.getByText("You can still grade manually without AI assistance."),
    ).toBeInTheDocument();
  });

  it("calls onRetrigger when retry button clicked", async () => {
    const onRetrigger = vi.fn();
    render(
      <AIFeedbackPane
        {...defaultProps}
        analysisStatus="failed"
        feedback={null}
        onRetrigger={onRetrigger}
      />,
    );

    await userEvent.click(screen.getByText("Re-analyze"));
    expect(onRetrigger).toHaveBeenCalledOnce();
  });

  it("disables retry button when retriggering", () => {
    render(
      <AIFeedbackPane
        {...defaultProps}
        analysisStatus="failed"
        feedback={null}
        isRetriggering={true}
      />,
    );

    const button = screen.getByText("Re-analyze").closest("button");
    expect(button).toBeDisabled();
  });

  it("shows empty feedback message when feedback is null and status is ready", () => {
    render(
      <AIFeedbackPane {...defaultProps} feedback={null} />
    );

    expect(
      screen.getByText("AI analysis completed with no feedback items."),
    ).toBeInTheDocument();
  });

  // --- Click-to-scroll tests (Story 13.1) ---

  // --- Manual grading discoverability tests (Story 13.3) ---

  it("renders 'Grade Manually' button in failed state when onManualMode provided", () => {
    render(
      <AIFeedbackPane
        {...defaultProps}
        analysisStatus="failed"
        feedback={null}
        failureReason="API timeout"
        onManualMode={vi.fn()}
      />,
    );

    expect(screen.getByText("Grade Manually")).toBeInTheDocument();
  });

  it("renders 'Grade Manually' button in empty (!feedback) state when onManualMode provided", () => {
    render(
      <AIFeedbackPane
        {...defaultProps}
        feedback={null}
        onManualMode={vi.fn()}
      />,
    );

    expect(screen.getByText("Grade Manually")).toBeInTheDocument();
  });

  it("renders 'Skip AI — Grade Manually' button in analyzing state when onManualMode provided", () => {
    render(
      <AIFeedbackPane
        {...defaultProps}
        analysisStatus="analyzing"
        feedback={null}
        onManualMode={vi.fn()}
      />,
    );

    expect(screen.getByText("Skip AI — Grade Manually")).toBeInTheDocument();
    expect(
      screen.getByText(/You can start entering scores now/),
    ).toBeInTheDocument();
  });

  it("calls onManualMode when 'Grade Manually' button is clicked in failed state", async () => {
    const onManualMode = vi.fn();
    render(
      <AIFeedbackPane
        {...defaultProps}
        analysisStatus="failed"
        feedback={null}
        onManualMode={onManualMode}
      />,
    );

    await userEvent.click(screen.getByText("Grade Manually"));
    expect(onManualMode).toHaveBeenCalledWith(true);
  });

  it("renders BandScoreCard and ApprovalToolbar when isManualMode is true in failed state", () => {
    render(
      <AIFeedbackPane
        {...defaultProps}
        analysisStatus="failed"
        feedback={null}
        isManualMode={true}
        onManualMode={vi.fn()}
        onFinalize={vi.fn()}
        onScoreChange={vi.fn()}
      />,
    );

    // BandScoreCard renders inside a card
    expect(screen.getByText("Band Score")).toBeInTheDocument();
    // ApprovalToolbar renders the Approve & Next button
    expect(screen.getByText("Approve & Next")).toBeInTheDocument();
  });

  it("renders BandScoreCard when isManualMode is true in empty state", () => {
    render(
      <AIFeedbackPane
        {...defaultProps}
        feedback={null}
        isManualMode={true}
        onManualMode={vi.fn()}
        onFinalize={vi.fn()}
        onScoreChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Band Score")).toBeInTheDocument();
  });

  it("renders BandScoreCard when isManualMode is true in analyzing state", () => {
    render(
      <AIFeedbackPane
        {...defaultProps}
        analysisStatus="analyzing"
        feedback={null}
        isManualMode={true}
        onManualMode={vi.fn()}
        onFinalize={vi.fn()}
        onScoreChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Band Score")).toBeInTheDocument();
  });

  it("renders 'Grade Manually' link near BandScoreCard when AI feedback IS present", () => {
    render(
      <AIFeedbackPane
        {...defaultProps}
        onManualMode={vi.fn()}
      />,
    );

    // The "Grade Manually" link should appear when feedback exists
    expect(screen.getByText("Grade Manually")).toBeInTheDocument();
  });

  it("shows onboarding tooltip on first visit (no localStorage key)", () => {
    localStorage.removeItem("classlite:manual-grading-seen:center-1");
    render(
      <AIFeedbackPane
        {...defaultProps}
        analysisStatus="failed"
        feedback={null}
        onManualMode={vi.fn()}
      />,
    );

    // Tooltip should be rendered
    expect(screen.getByTestId("tooltip")).toBeInTheDocument();
    expect(screen.getByTestId("tooltip-content")).toBeInTheDocument();
  });

  it("does not show onboarding tooltip after dismissal (localStorage key set)", () => {
    localStorage.setItem("classlite:manual-grading-seen:center-1", "1");
    render(
      <AIFeedbackPane
        {...defaultProps}
        analysisStatus="failed"
        feedback={null}
        onManualMode={vi.fn()}
      />,
    );

    // Tooltip wrapper should not render when already seen
    expect(screen.queryByTestId("tooltip")).not.toBeInTheDocument();
  });

  it("passes onScrollTo to FeedbackItemCard components", () => {
    const onScrollTo = vi.fn();
    render(
      <AIFeedbackPane
        {...defaultProps}
        onScrollTo={onScrollTo}
        feedback={{
          ...mockFeedback,
          items: [
            {
              id: "item-1",
              type: "grammar" as const,
              content: "Test error",
              severity: "error" as const,
              confidence: 0.9,
              suggestedFix: null,
              originalContextSnippet: null,
            },
          ],
        }}
        anchorStatuses={new Map([["item-1", "valid"]])}
      />,
    );

    // Click the card — if onScrollTo is threaded, cursor-pointer should be present
    const cards = screen.getAllByTestId("card");
    // The first card is the BandScoreCard, find the feedback item card
    const feedbackCard = cards.find(
      (c) => c.getAttribute("data-card-id") === "item-1",
    );
    expect(feedbackCard).toBeDefined();
    expect(feedbackCard?.className).toContain("cursor-pointer");
  });
});
