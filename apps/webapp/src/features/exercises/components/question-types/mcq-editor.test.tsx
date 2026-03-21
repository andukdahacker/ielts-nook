import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, vi, expect } from "vitest";
import { MCQEditor } from "./MCQEditor";
import { MCQPreview } from "./MCQPreview";

// Mock useDiagramUpload for consistent module resolution
vi.mock("../../hooks/use-diagram-upload", () => ({
  useDiagramUpload: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

// --- Task 9.1: MCQEditor ---
describe("MCQEditor", () => {
  it("renders existing options", () => {
    const onChange = vi.fn();
    render(
      <MCQEditor
        sectionType="R1_MCQ_SINGLE"
        options={{
          items: [
            { label: "A", text: "Option A" },
            { label: "B", text: "Option B" },
          ],
        }}
        correctAnswer={{ answer: "A" }}
        onChange={onChange}
      />,
    );
    expect(screen.getByDisplayValue("Option A")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Option B")).toBeInTheDocument();
  });

  it("adds a new option", () => {
    const onChange = vi.fn();
    render(
      <MCQEditor
        sectionType="R1_MCQ_SINGLE"
        options={{ items: [{ label: "A", text: "Option A" }] }}
        correctAnswer={{ answer: "" }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText("Add Option"));
    expect(onChange).toHaveBeenCalled();
    const [options] = onChange.mock.calls[0];
    expect(options.items).toHaveLength(2);
    expect(options.items[1].label).toBe("B");
  });

  it("removes an option", () => {
    const onChange = vi.fn();
    render(
      <MCQEditor
        sectionType="R1_MCQ_SINGLE"
        options={{
          items: [
            { label: "A", text: "Option A" },
            { label: "B", text: "Option B" },
          ],
        }}
        correctAnswer={{ answer: "" }}
        onChange={onChange}
      />,
    );
    // Find trash buttons by destructive class
    const allButtons = screen.getAllByRole("button");
    const trashButton = allButtons.find(
      (btn) => btn.classList.contains("text-destructive"),
    );
    expect(trashButton).toBeTruthy();
    fireEvent.click(trashButton!);
    expect(onChange).toHaveBeenCalled();
  });

  it("renders checkboxes for MCQ Multi", () => {
    const onChange = vi.fn();
    render(
      <MCQEditor
        sectionType="R2_MCQ_MULTI"
        options={{
          items: [
            { label: "A", text: "Option A" },
            { label: "B", text: "Option B" },
          ],
          maxSelections: 2,
        }}
        correctAnswer={{ answers: [] }}
        onChange={onChange}
      />,
    );
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThanOrEqual(2);
  });

  it("handles null options gracefully", () => {
    const onChange = vi.fn();
    render(
      <MCQEditor
        sectionType="R1_MCQ_SINGLE"
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    // Should render Add Option button with no items
    expect(screen.getByText("Add Option")).toBeInTheDocument();
  });
});

describe("MCQPreview", () => {
  it("renders radio buttons for R1_MCQ_SINGLE", () => {
    render(
      <MCQPreview
        sectionType="R1_MCQ_SINGLE"
        questionText="What is the answer?"
        questionIndex={0}
        options={{
          items: [
            { label: "A", text: "Option A" },
            { label: "B", text: "Option B" },
          ],
        }}
      />,
    );
    expect(screen.getByText("What is the answer?")).toBeInTheDocument();
    expect(screen.getByText(/A\. Option A/)).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("renders checkboxes for R2_MCQ_MULTI", () => {
    render(
      <MCQPreview
        sectionType="R2_MCQ_MULTI"
        questionText="Select two answers."
        questionIndex={1}
        options={{
          items: [
            { label: "A", text: "First" },
            { label: "B", text: "Second" },
          ],
          maxSelections: 2,
        }}
      />,
    );
    expect(screen.getByText("Select two answers.")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
    expect(screen.getByText(/Choose 2 answers/)).toBeInTheDocument();
  });

  it("handles null options gracefully", () => {
    render(
      <MCQPreview
        sectionType="R1_MCQ_SINGLE"
        questionText="No options"
        questionIndex={0}
        options={null}
      />,
    );
    expect(screen.getByText("No options")).toBeInTheDocument();
  });
});
