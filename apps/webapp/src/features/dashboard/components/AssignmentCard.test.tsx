import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { AssignmentCard, formatRelativeDue, formatTimeLimit } from "./AssignmentCard";
import type { StudentAssignment } from "@workspace/types";

vi.mock("@/features/auth/auth-context", () => ({
  useAuth: () => ({ user: { centerId: "center-1", role: "STUDENT" } }),
}));

const baseAssignment: StudentAssignment = {
  id: "assign-1",
  exerciseId: "ex-1",
  classId: "class-1",
  dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  timeLimit: 3600,
  instructions: "Complete all reading questions carefully",
  status: "OPEN",
  createdAt: new Date().toISOString(),
  exercise: { id: "ex-1", title: "Reading Comprehension Test", skill: "READING", status: "PUBLISHED" },
  class: { id: "class-1", name: "Class 10A" },
  createdBy: { id: "user-1", name: "Ms. Smith" },
};

function renderCard(assignment: StudentAssignment = baseAssignment) {
  return render(
    <MemoryRouter>
      <AssignmentCard assignment={assignment} />
    </MemoryRouter>,
  );
}

describe("AssignmentCard", () => {
  it("renders exercise title", () => {
    renderCard();
    expect(screen.getByText("Reading Comprehension Test")).toBeInTheDocument();
  });

  it("shows class name when class-based assignment", () => {
    renderCard();
    expect(screen.getByText("Class 10A")).toBeInTheDocument();
  });

  it("shows instructions when present", () => {
    renderCard();
    expect(screen.getByText("Complete all reading questions carefully")).toBeInTheDocument();
  });

  it("does not show instructions when absent", () => {
    renderCard({ ...baseAssignment, instructions: null });
    expect(screen.queryByText("Complete all reading questions carefully")).not.toBeInTheDocument();
  });

  it("does not show class name when individual assignment", () => {
    renderCard({ ...baseAssignment, class: null, classId: null });
    expect(screen.queryByText("Class 10A")).not.toBeInTheDocument();
  });

  it("Start button is enabled when no submission", () => {
    renderCard();
    const startButton = screen.getByRole("button", { name: /Start/i });
    expect(startButton).not.toBeDisabled();
  });

  it("shows Continue button when submission is IN_PROGRESS", () => {
    renderCard({ ...baseAssignment, submissionStatus: "IN_PROGRESS", submissionId: "sub-1" } as StudentAssignment);
    expect(screen.getByRole("button", { name: /Continue/i })).toBeInTheDocument();
  });

  it("shows View Submission button when submission is SUBMITTED", () => {
    renderCard({ ...baseAssignment, submissionStatus: "SUBMITTED", submissionId: "sub-1" } as StudentAssignment);
    expect(screen.getByRole("button", { name: /View Submission/i })).toBeInTheDocument();
  });

  it("shows Submitted badge when submission is SUBMITTED", () => {
    renderCard({ ...baseAssignment, submissionStatus: "SUBMITTED", submissionId: "sub-1" } as StudentAssignment);
    expect(screen.getByText("Submitted")).toBeInTheDocument();
  });

  it("shows In Progress badge when submission is IN_PROGRESS", () => {
    renderCard({ ...baseAssignment, submissionStatus: "IN_PROGRESS", submissionId: "sub-1" } as StudentAssignment);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("shows status badge", () => {
    renderCard();
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("shows time limit formatted", () => {
    renderCard();
    expect(screen.getByText("1h")).toBeInTheDocument();
  });

  it("shows Closed badge for closed assignment", () => {
    renderCard({ ...baseAssignment, status: "CLOSED" });
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });
});

describe("formatRelativeDue", () => {
  it("returns 'No deadline' for null dueDate", () => {
    expect(formatRelativeDue(null)).toEqual({ text: "No deadline", className: "" });
  });

  it("returns 'Overdue' for past dates", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const result = formatRelativeDue(yesterday);
    expect(result.text).toBe("Overdue");
    expect(result.className).toContain("text-red-600");
  });

  it("returns 'Due today' for today's date", () => {
    const laterToday = new Date();
    laterToday.setHours(23, 59, 0, 0);
    const result = formatRelativeDue(laterToday.toISOString());
    expect(result.text).toBe("Due today");
    expect(result.className).toContain("text-orange-600");
  });

  it("returns 'Due tomorrow' for next day", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);
    const result = formatRelativeDue(tomorrow.toISOString());
    expect(result.text).toBe("Due tomorrow");
  });

  it("returns formatted date for dates beyond a week", () => {
    const farFuture = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const result = formatRelativeDue(farFuture);
    expect(result.text).not.toContain("Due in");
    expect(result.className).toBe("");
  });
});

describe("formatTimeLimit", () => {
  it("returns dash for null", () => {
    expect(formatTimeLimit(null)).toBe("—");
  });

  it("formats minutes only", () => {
    expect(formatTimeLimit(1800)).toBe("30m");
  });

  it("formats hours only", () => {
    expect(formatTimeLimit(3600)).toBe("1h");
  });

  it("formats hours and minutes", () => {
    expect(formatTimeLimit(5400)).toBe("1h 30m");
  });
});
