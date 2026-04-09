import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, vi, expect } from "vitest";
import { NoteTableFlowchartEditor } from "./NoteTableFlowchartEditor";
import { NoteTableFlowchartPreview } from "./NoteTableFlowchartPreview";

// Mock useDiagramUpload for consistent module resolution
vi.mock("../../hooks/use-diagram-upload", () => ({
  useDiagramUpload: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

// --- NoteTableFlowchartEditor ---
describe("NoteTableFlowchartEditor", () => {
  it("renders sub-format selector with note as default", () => {
    const onChange = vi.fn();
    render(
      <NoteTableFlowchartEditor
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Sub-Format")).toBeInTheDocument();
    expect(screen.getByText("note")).toBeInTheDocument();
    expect(screen.getByText("table")).toBeInTheDocument();
    expect(screen.getByText("flowchart")).toBeInTheDocument();
  });

  it("renders note mode textarea", () => {
    const onChange = vi.fn();
    render(
      <NoteTableFlowchartEditor
        options={{
          subFormat: "note",
          structure: "Topic\n• Point ___1___",
          wordLimit: 2,
        }}
        correctAnswer={{ blanks: { "1": { answer: "answer", acceptedVariants: [], strictWordOrder: true } } }}
        onChange={onChange}
      />,
    );
    expect(screen.getByText(/Structured Text/)).toBeInTheDocument();
    expect(screen.getByText("Blank 1:")).toBeInTheDocument();
  });

  it("renders table mode grid", () => {
    const onChange = vi.fn();
    render(
      <NoteTableFlowchartEditor
        options={{
          subFormat: "table",
          structure: JSON.stringify({
            columns: ["Country", "Population"],
            rows: [["Vietnam", "___1___"]],
          }),
          wordLimit: 2,
        }}
        correctAnswer={{ blanks: { "1": { answer: "98 million", acceptedVariants: [], strictWordOrder: true } } }}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Table Structure")).toBeInTheDocument();
    expect(screen.getByText("Blank 1:")).toBeInTheDocument();
  });

  it("renders flowchart mode steps", () => {
    const onChange = vi.fn();
    render(
      <NoteTableFlowchartEditor
        options={{
          subFormat: "flowchart",
          structure: JSON.stringify({
            steps: ["Step ___1___", "Step ___2___"],
          }),
          wordLimit: 2,
        }}
        correctAnswer={{ blanks: {} }}
        onChange={onChange}
      />,
    );
    expect(screen.getByText(/Flowchart Steps/)).toBeInTheDocument();
    expect(screen.getByText("Blank 1:")).toBeInTheDocument();
    expect(screen.getByText("Blank 2:")).toBeInTheDocument();
  });

  it("renders word limit control", () => {
    const onChange = vi.fn();
    render(
      <NoteTableFlowchartEditor
        options={{ subFormat: "note", structure: "text", wordLimit: 3 }}
        correctAnswer={{ blanks: {} }}
        onChange={onChange}
      />,
    );
    expect(screen.getByDisplayValue("3")).toBeInTheDocument();
    expect(screen.getByText("words")).toBeInTheDocument();
  });

  it("handles null options gracefully", () => {
    const onChange = vi.fn();
    render(
      <NoteTableFlowchartEditor
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Sub-Format")).toBeInTheDocument();
    expect(screen.getByText("Word Limit")).toBeInTheDocument();
  });

  it("switches sub-format and calls onChange", () => {
    const onChange = vi.fn();
    render(
      <NoteTableFlowchartEditor
        options={{ subFormat: "note", structure: "text", wordLimit: 2 }}
        correctAnswer={{ blanks: {} }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByLabelText("table"));
    expect(onChange).toHaveBeenCalled();
    const [options] = onChange.mock.calls[0];
    expect(options.subFormat).toBe("table");
  });

  it("handles malformed table JSON gracefully", () => {
    const onChange = vi.fn();
    render(
      <NoteTableFlowchartEditor
        options={{ subFormat: "table", structure: "not json", wordLimit: 2 }}
        correctAnswer={{ blanks: {} }}
        onChange={onChange}
      />,
    );
    // Should render table editor without crashing
    expect(screen.getByText("Table Structure")).toBeInTheDocument();
  });
});

// --- NoteTableFlowchartPreview ---
describe("NoteTableFlowchartPreview", () => {
  it("renders note preview with blanks", () => {
    render(
      <NoteTableFlowchartPreview
        questionIndex={0}
        options={{
          subFormat: "note",
          structure: "Topic\n• Impact ___1___",
          wordLimit: 2,
        }}
      />,
    );
    expect(screen.getByText("Topic")).toBeInTheDocument();
    expect(screen.getByText("(1)")).toBeInTheDocument();
  });

  it("renders table preview", () => {
    render(
      <NoteTableFlowchartPreview
        questionIndex={0}
        options={{
          subFormat: "table",
          structure: JSON.stringify({
            columns: ["Country", "Pop"],
            rows: [["Vietnam", "___1___"]],
          }),
          wordLimit: 3,
        }}
      />,
    );
    expect(screen.getByText("Country")).toBeInTheDocument();
    expect(screen.getByText("Pop")).toBeInTheDocument();
    expect(screen.getByText("Vietnam")).toBeInTheDocument();
    expect(screen.getByText("(1)")).toBeInTheDocument();
  });

  it("renders flowchart preview", () => {
    render(
      <NoteTableFlowchartPreview
        questionIndex={0}
        options={{
          subFormat: "flowchart",
          structure: JSON.stringify({ steps: ["Seeds in ___1___", "Grow ___2___"] }),
          wordLimit: 2,
        }}
      />,
    );
    expect(screen.getByText("Seeds in")).toBeInTheDocument();
    expect(screen.getByText("(1)")).toBeInTheDocument();
    expect(screen.getByText("(2)")).toBeInTheDocument();
  });

  it("renders empty state when options is null", () => {
    render(
      <NoteTableFlowchartPreview questionIndex={0} options={null} />,
    );
    expect(screen.getByText(/No structure configured/i)).toBeInTheDocument();
  });

  it("shows invalid table message for malformed JSON", () => {
    render(
      <NoteTableFlowchartPreview
        questionIndex={0}
        options={{
          subFormat: "table",
          structure: "not json",
        }}
      />,
    );
    expect(screen.getByText(/Invalid table structure/i)).toBeInTheDocument();
  });
});
