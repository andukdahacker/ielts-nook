import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TeacherCommentCard } from "../components/TeacherCommentCard";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Eye: (props: Record<string, unknown>) => <span data-testid="icon-eye" {...props} />,
  EyeOff: (props: Record<string, unknown>) => <span data-testid="icon-eyeoff" {...props} />,
  MoreHorizontal: (props: Record<string, unknown>) => <span data-testid="icon-more" {...props} />,
  Pencil: (props: Record<string, unknown>) => <span data-testid="icon-pencil" {...props} />,
  Trash2: (props: Record<string, unknown>) => <span data-testid="icon-trash" {...props} />,
  User: (props: Record<string, unknown>) => <span data-testid="icon-user" {...props} />,
  Unlink: (props: Record<string, unknown>) => <span data-testid="icon-unlink" {...props} />,
}));

vi.mock("@workspace/ui/components/badge", () => ({
  Badge: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <span data-testid="badge" {...props}>{children}</span>
  ),
}));

vi.mock("@workspace/ui/components/button", () => ({
  Button: ({ children, onClick, disabled, ...props }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; [key: string]: unknown }) => (
    <button onClick={onClick} disabled={disabled} data-testid="button" {...props}>{children}</button>
  ),
}));

vi.mock("@workspace/ui/components/card", () => ({
  Card: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <div data-testid="card" {...props}>{children}</div>
  ),
  CardContent: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <div data-testid="card-content" {...props}>{children}</div>
  ),
}));

vi.mock("@workspace/ui/components/textarea", () => ({
  Textarea: (props: Record<string, unknown>) => (
    <textarea data-testid="textarea" {...props} />
  ),
}));

vi.mock("@workspace/ui/components/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown">{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick, ...props }: { children: React.ReactNode; onClick?: () => void; [key: string]: unknown }) => (
    <button data-testid="dropdown-item" onClick={onClick} {...props}>{children}</button>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => <div data-testid="dropdown-trigger">{children}</div>,
}));

vi.mock("@workspace/ui/components/alert-dialog", () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open?: boolean; onOpenChange?: (v: boolean) => void }) => (
    open ? <div data-testid="alert-dialog">{children}</div> : null
  ),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogAction: ({ children, onClick, ...props }: { children: React.ReactNode; onClick?: () => void; [key: string]: unknown }) => (
    <button data-testid="alert-action" onClick={onClick} {...props}>{children}</button>
  ),
}));

vi.mock("date-fns", () => ({
  formatDistanceToNow: () => "2 hours ago",
}));

const baseComment = {
  id: "c-1",
  centerId: "center-1",
  submissionId: "sub-1",
  authorId: "teacher-1",
  authorName: "Ms. Smith",
  authorAvatarUrl: null,
  content: "Great use of vocabulary!",
  startOffset: 10,
  endOffset: 30,
  originalContextSnippet: "the students were very engaged",
  visibility: "student_facing" as const,
  createdAt: "2026-02-17T10:00:00.000Z",
  updatedAt: "2026-02-17T10:00:00.000Z",
};

const defaultProps = {
  comment: baseComment,
  isAuthor: true,
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onVisibilityChange: vi.fn(),
};

describe("TeacherCommentCard", () => {
  it("renders comment content and author name", () => {
    render(<TeacherCommentCard {...defaultProps} />);

    expect(screen.getByText("Great use of vocabulary!")).toBeInTheDocument();
    expect(screen.getByText("Ms. Smith")).toBeInTheDocument();
  });

  it("renders Teacher badge", () => {
    render(<TeacherCommentCard {...defaultProps} />);

    expect(screen.getByText("Teacher")).toBeInTheDocument();
  });

  it("renders timestamp", () => {
    render(<TeacherCommentCard {...defaultProps} />);

    expect(screen.getByText("2 hours ago")).toBeInTheDocument();
  });

  it("renders quoted context snippet", () => {
    render(<TeacherCommentCard {...defaultProps} />);

    expect(screen.getByText("the students were very engaged")).toBeInTheDocument();
  });

  it("shows 'Private' label for private comments", () => {
    render(
      <TeacherCommentCard
        {...defaultProps}
        comment={{ ...baseComment, visibility: "private" }}
      />,
    );

    expect(screen.getByText("Private")).toBeInTheDocument();
  });

  it("has data-card-id attribute", () => {
    render(<TeacherCommentCard {...defaultProps} />);

    const card = screen.getByTestId("card");
    expect(card).toHaveAttribute("data-card-id", "c-1");
  });

  it("calls onHighlight with id on mouse enter for anchored comments", () => {
    const onHighlight = vi.fn();
    render(
      <TeacherCommentCard
        {...defaultProps}
        onHighlight={onHighlight}
        anchorStatus="valid"
      />,
    );

    fireEvent.mouseEnter(screen.getByTestId("card"));
    expect(onHighlight).toHaveBeenCalledWith("c-1", true);
  });

  it("calls onHighlight with null on mouse leave", () => {
    const onHighlight = vi.fn();
    render(
      <TeacherCommentCard
        {...defaultProps}
        onHighlight={onHighlight}
        anchorStatus="valid"
      />,
    );

    fireEvent.mouseLeave(screen.getByTestId("card"));
    expect(onHighlight).toHaveBeenCalledWith(null, true);
  });

  it("does NOT fire onHighlight for no-anchor comments", () => {
    const onHighlight = vi.fn();
    render(
      <TeacherCommentCard
        {...defaultProps}
        onHighlight={onHighlight}
        anchorStatus="no-anchor"
      />,
    );

    fireEvent.mouseEnter(screen.getByTestId("card"));
    expect(onHighlight).not.toHaveBeenCalled();
  });

  it("shows dropdown menu for author", () => {
    render(<TeacherCommentCard {...defaultProps} isAuthor={true} />);

    expect(screen.getByTestId("dropdown")).toBeInTheDocument();
  });

  it("does not show dropdown menu for non-author", () => {
    render(<TeacherCommentCard {...defaultProps} isAuthor={false} />);

    expect(screen.queryByTestId("dropdown")).not.toBeInTheDocument();
  });

  it("shows 'Anchor lost' text for orphaned comments", () => {
    render(
      <TeacherCommentCard {...defaultProps} anchorStatus="orphaned" />,
    );

    expect(
      screen.getByText(/Anchor lost — text changed since analysis/),
    ).toBeInTheDocument();
  });

  // --- Click-to-scroll tests (Story 13.1) ---

  it("calls onScrollTo with comment id when card is clicked with valid anchor", () => {
    const onScrollTo = vi.fn();
    render(
      <TeacherCommentCard
        {...defaultProps}
        anchorStatus="valid"
        onScrollTo={onScrollTo}
      />,
    );

    fireEvent.click(screen.getByTestId("card"));
    expect(onScrollTo).toHaveBeenCalledWith("c-1");
  });

  it("does NOT call onScrollTo on click for no-anchor comments", () => {
    const onScrollTo = vi.fn();
    render(
      <TeacherCommentCard
        {...defaultProps}
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
      <TeacherCommentCard
        {...defaultProps}
        anchorStatus="valid"
        onScrollTo={onScrollTo}
      />,
    );

    fireEvent.mouseEnter(screen.getByTestId("card"));
    fireEvent.mouseLeave(screen.getByTestId("card"));
    expect(onScrollTo).not.toHaveBeenCalled();
  });

  it("clicking interactive elements (dropdown) does NOT trigger onScrollTo", () => {
    const onScrollTo = vi.fn();
    render(
      <TeacherCommentCard
        {...defaultProps}
        anchorStatus="valid"
        onScrollTo={onScrollTo}
        isAuthor={true}
      />,
    );

    // Click on dropdown trigger area (wrapped in stopPropagation div)
    const dropdownItems = screen.getAllByTestId("dropdown-item");
    fireEvent.click(dropdownItems[0]); // Edit button
    expect(onScrollTo).not.toHaveBeenCalled();
  });

  it("has cursor-pointer class when anchor is valid", () => {
    render(
      <TeacherCommentCard {...defaultProps} anchorStatus="valid" />,
    );

    const card = screen.getByTestId("card");
    expect(card.className).toContain("cursor-pointer");
  });

  it("has title tooltip when anchor is valid", () => {
    render(
      <TeacherCommentCard {...defaultProps} anchorStatus="valid" />,
    );

    const card = screen.getByTestId("card");
    expect(card).toHaveAttribute("title", "Click to scroll to text");
  });
});
