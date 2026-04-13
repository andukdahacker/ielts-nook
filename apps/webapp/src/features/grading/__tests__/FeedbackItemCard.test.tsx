import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FeedbackItemCard } from "../components/FeedbackItemCard";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  SpellCheck: (props: Record<string, unknown>) => <span data-testid="icon-spellcheck" {...props} />,
  BookOpen: (props: Record<string, unknown>) => <span data-testid="icon-bookopen" {...props} />,
  Link: (props: Record<string, unknown>) => <span data-testid="icon-link" {...props} />,
  Star: (props: Record<string, unknown>) => <span data-testid="icon-star" {...props} />,
  MessageCircle: (props: Record<string, unknown>) => <span data-testid="icon-message" {...props} />,
  Unlink: (props: Record<string, unknown>) => <span data-testid="icon-unlink" {...props} />,
  Check: (props: Record<string, unknown>) => <span data-testid="icon-check" {...props} />,
  X: (props: Record<string, unknown>) => <span data-testid="icon-x" {...props} />,
}));

vi.mock("@workspace/ui/components/badge", () => ({
  Badge: ({ children, ...props }: { children: React.ReactNode; variant?: string; className?: string }) => (
    <span data-testid="badge" {...props}>{children}</span>
  ),
}));

vi.mock("@workspace/ui/components/card", () => ({
  Card: ({ children, ...props }: { children: React.ReactNode; className?: string; [key: string]: unknown }) => (
    <div data-testid="card" {...props}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
}));

vi.mock("@workspace/ui/components/button", () => ({
  Button: ({ children, onClick, ...props }: { children: React.ReactNode; onClick?: () => void; [key: string]: unknown }) => (
    <button data-testid={props["aria-label"] ? `btn-${props["aria-label"]}` : "button"} onClick={onClick} {...props}>{children}</button>
  ),
}));

vi.mock("@workspace/ui/components/textarea", () => ({
  Textarea: (props: Record<string, unknown>) => <textarea data-testid="textarea" {...props} />,
}));

const baseItem = {
  id: "item-1",
  type: "grammar" as const,
  content: "Subject-verb agreement error",
  severity: "error" as const,
  confidence: 0.95,
  originalContextSnippet: null,
  suggestedFix: null,
};

describe("FeedbackItemCard", () => {
  it("calls onHighlight with id and debounce=true on mouse enter", () => {
    const onHighlight = vi.fn();
    render(
      <FeedbackItemCard
        item={baseItem}
        anchorStatus="valid"
        onHighlight={onHighlight}
      />,
    );

    fireEvent.mouseEnter(screen.getByTestId("card"));
    expect(onHighlight).toHaveBeenCalledWith("item-1", true);
  });

  it("calls onHighlight with null and debounce=true on mouse leave", () => {
    const onHighlight = vi.fn();
    render(
      <FeedbackItemCard
        item={baseItem}
        anchorStatus="valid"
        onHighlight={onHighlight}
      />,
    );

    fireEvent.mouseLeave(screen.getByTestId("card"));
    expect(onHighlight).toHaveBeenCalledWith(null, true);
  });

  it("calls onHighlight with id and debounce=false on focus (immediate)", () => {
    const onHighlight = vi.fn();
    render(
      <FeedbackItemCard
        item={baseItem}
        anchorStatus="valid"
        onHighlight={onHighlight}
      />,
    );

    fireEvent.focus(screen.getByTestId("card"));
    expect(onHighlight).toHaveBeenCalledWith("item-1", false);
  });

  it("calls onHighlight with null and debounce=false on blur (immediate)", () => {
    const onHighlight = vi.fn();
    render(
      <FeedbackItemCard
        item={baseItem}
        anchorStatus="valid"
        onHighlight={onHighlight}
      />,
    );

    fireEvent.blur(screen.getByTestId("card"));
    expect(onHighlight).toHaveBeenCalledWith(null, false);
  });

  it("shows 'Anchor lost' text for orphaned items", () => {
    render(
      <FeedbackItemCard item={baseItem} anchorStatus="orphaned" />,
    );

    expect(
      screen.getByText(/Anchor lost — text changed since analysis/),
    ).toBeInTheDocument();
    expect(screen.getByTestId("icon-unlink")).toBeInTheDocument();
  });

  it("does NOT fire onHighlight for orphaned items", () => {
    const onHighlight = vi.fn();
    render(
      <FeedbackItemCard
        item={baseItem}
        anchorStatus="orphaned"
        onHighlight={onHighlight}
      />,
    );

    fireEvent.mouseEnter(screen.getByTestId("card"));
    fireEvent.focus(screen.getByTestId("card"));
    expect(onHighlight).not.toHaveBeenCalled();
  });

  it("shows amber dot for drifted items", () => {
    const { container } = render(
      <FeedbackItemCard item={baseItem} anchorStatus="drifted" />,
    );

    const dot = container.querySelector(".bg-amber-400");
    expect(dot).toBeInTheDocument();
  });

  it("no-anchor items have no hover behavior", () => {
    const onHighlight = vi.fn();
    render(
      <FeedbackItemCard
        item={{ ...baseItem, type: "general" }}
        anchorStatus="no-anchor"
        onHighlight={onHighlight}
      />,
    );

    fireEvent.mouseEnter(screen.getByTestId("card"));
    expect(onHighlight).not.toHaveBeenCalled();
  });

  it("has correct aria-details attribute for valid anchors", () => {
    render(
      <FeedbackItemCard item={baseItem} anchorStatus="valid" />,
    );

    const card = screen.getByTestId("card");
    expect(card).toHaveAttribute("aria-details", "anchor-item-1");
  });

  it("has data-card-id attribute", () => {
    render(<FeedbackItemCard item={baseItem} />);

    const card = screen.getByTestId("card");
    expect(card).toHaveAttribute("data-card-id", "item-1");
  });

  // --- Approval tests (Story 5.4) ---

  it("calls onApprove with (itemId, true) on approve button click", () => {
    const onApprove = vi.fn();
    render(
      <FeedbackItemCard item={baseItem} onApprove={onApprove} />,
    );

    fireEvent.click(screen.getByTestId("btn-Approve"));
    expect(onApprove).toHaveBeenCalledWith("item-1", true);
  });

  it("calls onApprove with (itemId, false) on reject button click", () => {
    const onApprove = vi.fn();
    render(
      <FeedbackItemCard item={baseItem} onApprove={onApprove} />,
    );

    fireEvent.click(screen.getByTestId("btn-Reject"));
    expect(onApprove).toHaveBeenCalledWith("item-1", false);
  });

  it("applies approved styling when isApproved is true", () => {
    render(
      <FeedbackItemCard item={{ ...baseItem, isApproved: true }} />,
    );

    const card = screen.getByTestId("card");
    expect(card.className).toContain("border-l-green-500");
  });

  it("applies rejected styling with line-through when isApproved is false", () => {
    render(
      <FeedbackItemCard item={{ ...baseItem, isApproved: false }} />,
    );

    const card = screen.getByTestId("card");
    expect(card.className).toContain("border-l-red-300");
    expect(screen.getByText("Subject-verb agreement error").className).toContain("line-through");
  });

  it("does NOT show approve/reject buttons on score_suggestion items", () => {
    const onApprove = vi.fn();
    render(
      <FeedbackItemCard
        item={{ ...baseItem, type: "score_suggestion" }}
        onApprove={onApprove}
      />,
    );

    expect(screen.queryByTestId("btn-Approve")).not.toBeInTheDocument();
    expect(screen.queryByTestId("btn-Reject")).not.toBeInTheDocument();
  });

  it("does NOT show approve/reject buttons when isFinalized", () => {
    const onApprove = vi.fn();
    render(
      <FeedbackItemCard
        item={baseItem}
        onApprove={onApprove}
        isFinalized={true}
      />,
    );

    expect(screen.queryByTestId("btn-Approve")).not.toBeInTheDocument();
    expect(screen.queryByTestId("btn-Reject")).not.toBeInTheDocument();
  });

  it("shows 'Edited' badge when teacherOverrideText is set", () => {
    render(
      <FeedbackItemCard
        item={{ ...baseItem, isApproved: true, teacherOverrideText: "Override text" }}
      />,
    );

    expect(screen.getByText("Edited")).toBeInTheDocument();
    expect(screen.getByText("Override text")).toBeInTheDocument();
  });

  it("keyboard A key approves when card is focused", () => {
    const onApprove = vi.fn();
    render(
      <FeedbackItemCard item={baseItem} onApprove={onApprove} />,
    );

    const card = screen.getByTestId("card");
    fireEvent.keyDown(card, { key: "a" });
    expect(onApprove).toHaveBeenCalledWith("item-1", true);
  });

  // --- Click-to-scroll tests (Story 13.1) ---

  it("calls onScrollTo with item id when card is clicked with valid anchor", () => {
    const onScrollTo = vi.fn();
    render(
      <FeedbackItemCard
        item={baseItem}
        anchorStatus="valid"
        onScrollTo={onScrollTo}
      />,
    );

    fireEvent.click(screen.getByTestId("card"));
    expect(onScrollTo).toHaveBeenCalledWith("item-1");
  });

  it("calls onScrollTo on click with drifted anchor", () => {
    const onScrollTo = vi.fn();
    render(
      <FeedbackItemCard
        item={baseItem}
        anchorStatus="drifted"
        onScrollTo={onScrollTo}
      />,
    );

    fireEvent.click(screen.getByTestId("card"));
    expect(onScrollTo).toHaveBeenCalledWith("item-1");
  });

  it("does NOT call onScrollTo on click for orphaned items", () => {
    const onScrollTo = vi.fn();
    render(
      <FeedbackItemCard
        item={baseItem}
        anchorStatus="orphaned"
        onScrollTo={onScrollTo}
      />,
    );

    fireEvent.click(screen.getByTestId("card"));
    expect(onScrollTo).not.toHaveBeenCalled();
  });

  it("does NOT call onScrollTo on click for no-anchor items", () => {
    const onScrollTo = vi.fn();
    render(
      <FeedbackItemCard
        item={baseItem}
        anchorStatus="no-anchor"
        onScrollTo={onScrollTo}
      />,
    );

    fireEvent.click(screen.getByTestId("card"));
    expect(onScrollTo).not.toHaveBeenCalled();
  });

  it("hovering does NOT call onScrollTo", () => {
    const onScrollTo = vi.fn();
    render(
      <FeedbackItemCard
        item={baseItem}
        anchorStatus="valid"
        onScrollTo={onScrollTo}
      />,
    );

    fireEvent.mouseEnter(screen.getByTestId("card"));
    fireEvent.mouseLeave(screen.getByTestId("card"));
    // onScrollTo should NOT be called by hover
    expect(onScrollTo).not.toHaveBeenCalled();
  });

  it("has cursor-pointer class when anchor is valid", () => {
    render(
      <FeedbackItemCard item={baseItem} anchorStatus="valid" />,
    );

    const card = screen.getByTestId("card");
    expect(card.className).toContain("cursor-pointer");
  });

  it("does NOT have cursor-pointer class for no-anchor items", () => {
    render(
      <FeedbackItemCard item={baseItem} anchorStatus="no-anchor" />,
    );

    const card = screen.getByTestId("card");
    expect(card.className).not.toContain("cursor-pointer");
  });

  it("has title tooltip when anchor is valid", () => {
    render(
      <FeedbackItemCard item={baseItem} anchorStatus="valid" />,
    );

    const card = screen.getByTestId("card");
    expect(card).toHaveAttribute("title", "Click to scroll to text");
  });
});
