import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, vi, expect } from "vitest";
import { DiagramLabellingEditor } from "./DiagramLabellingEditor";
import { DiagramLabellingPreview } from "./DiagramLabellingPreview";

// Mock useDiagramUpload for DiagramLabellingEditor tests
vi.mock("../../hooks/use-diagram-upload", () => ({
  useDiagramUpload: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

// --- DiagramLabellingPreview ---
describe("DiagramLabellingPreview", () => {
  it("renders label positions without word bank", () => {
    render(
      <DiagramLabellingPreview
        questionIndex={0}
        options={{
          diagramUrl: "",
          labelPositions: ["outer shell", "membrane"],
          wordLimit: 2,
        }}
      />,
    );
    expect(screen.getByText("outer shell")).toBeInTheDocument();
    expect(screen.getByText("membrane")).toBeInTheDocument();
    expect(screen.getAllByText("2w")).toHaveLength(2);
    expect(screen.getByText(/No diagram uploaded/i)).toBeInTheDocument();
  });

  it("renders diagram image when URL provided", () => {
    render(
      <DiagramLabellingPreview
        questionIndex={0}
        options={{
          diagramUrl: "https://example.com/diagram.png",
          labelPositions: ["shell"],
          wordLimit: 2,
        }}
      />,
    );
    const img = screen.getByAltText("Diagram");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/diagram.png");
  });

  it("renders distractor badge with word bank", () => {
    render(
      <DiagramLabellingPreview
        questionIndex={0}
        options={{
          diagramUrl: "",
          labelPositions: ["Pos 1", "Pos 2"],
          wordBank: ["shell", "membrane", "air cell", "yolk"],
          wordLimit: 2,
        }}
      />,
    );
    expect(screen.getByText(/4 labels, 2 positions/)).toBeInTheDocument();
    expect(screen.getByText(/2 distractors/)).toBeInTheDocument();
  });

  it("renders empty state when options is null", () => {
    render(
      <DiagramLabellingPreview questionIndex={0} options={null} />,
    );
    expect(screen.getByText(/No diagram configured/i)).toBeInTheDocument();
  });
});

// --- DiagramLabellingEditor ---
describe("DiagramLabellingEditor", () => {
  it("renders upload prompt when no diagram URL", () => {
    const onChange = vi.fn();
    render(
      <DiagramLabellingEditor
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Diagram Image")).toBeInTheDocument();
    expect(screen.getByText("Upload Diagram")).toBeInTheDocument();
  });

  it("renders label positions and correct label inputs", () => {
    const onChange = vi.fn();
    render(
      <DiagramLabellingEditor
        options={{
          diagramUrl: "",
          labelPositions: ["outer shell", "membrane"],
          wordLimit: 2,
        }}
        correctAnswer={{ labels: { "0": { answer: "answer1", acceptedVariants: [], strictWordOrder: true } } }}
        onChange={onChange}
      />,
    );
    // Label position inputs
    expect(screen.getByDisplayValue("outer shell")).toBeInTheDocument();
    expect(screen.getByDisplayValue("membrane")).toBeInTheDocument();
    // Correct answer input
    expect(screen.getByDisplayValue("answer1")).toBeInTheDocument();
  });

  it("adds a label position", () => {
    const onChange = vi.fn();
    render(
      <DiagramLabellingEditor
        options={{
          diagramUrl: "",
          labelPositions: ["Position 1"],
          wordLimit: 2,
        }}
        correctAnswer={{ labels: {} }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText("Add Position"));
    expect(onChange).toHaveBeenCalled();
    const [options] = onChange.mock.calls[0];
    expect(options.labelPositions).toHaveLength(2);
    expect(options.labelPositions[1]).toBe("Position 2");
  });

  it("removes a label position and re-indexes labels", () => {
    const onChange = vi.fn();
    render(
      <DiagramLabellingEditor
        options={{
          diagramUrl: "",
          labelPositions: ["shell", "membrane", "yolk"],
          wordBank: ["shell", "membrane", "yolk", "albumen"],
          wordLimit: 2,
        }}
        correctAnswer={{ labels: { "0": "shell", "1": "membrane", "2": "yolk" } }}
        onChange={onChange}
      />,
    );
    const removeButtons = screen.getAllByLabelText("Remove position");
    // Remove the first position
    fireEvent.click(removeButtons[0]);
    expect(onChange).toHaveBeenCalled();
    const [options, answer] = onChange.mock.calls[0];
    expect(options.labelPositions).toEqual(["membrane", "yolk"]);
    // Labels should be re-indexed: old "1" -> "0", old "2" -> "1"
    expect(answer.labels).toEqual({ "0": "membrane", "1": "yolk" });
  });

  it("toggles word bank on and off", () => {
    const onChange = vi.fn();
    render(
      <DiagramLabellingEditor
        options={{
          diagramUrl: "",
          labelPositions: ["Position 1"],
          wordLimit: 2,
        }}
        correctAnswer={{ labels: {} }}
        onChange={onChange}
      />,
    );
    // Toggle word bank on
    fireEvent.click(screen.getByLabelText("Use Word Bank"));
    expect(onChange).toHaveBeenCalled();
    const [options] = onChange.mock.calls[0];
    expect(options.wordBank).toEqual([]);
  });

  it("shows word limit only when word bank is not used", () => {
    const onChange = vi.fn();
    render(
      <DiagramLabellingEditor
        options={{
          diagramUrl: "",
          labelPositions: ["Position 1"],
          wordLimit: 3,
        }}
        correctAnswer={{ labels: {} }}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Word Limit")).toBeInTheDocument();
    expect(screen.getByDisplayValue("3")).toBeInTheDocument();
  });

  it("hides word limit when word bank is used", () => {
    const onChange = vi.fn();
    render(
      <DiagramLabellingEditor
        options={{
          diagramUrl: "",
          labelPositions: ["Position 1"],
          wordBank: ["shell", "membrane"],
          wordLimit: 2,
        }}
        correctAnswer={{ labels: {} }}
        onChange={onChange}
      />,
    );
    expect(screen.queryByText("Word Limit")).not.toBeInTheDocument();
  });

  it("handles null options gracefully", () => {
    const onChange = vi.fn();
    render(
      <DiagramLabellingEditor
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Diagram Image")).toBeInTheDocument();
    expect(screen.getByText("Add Position")).toBeInTheDocument();
  });

  it("shows diagram image when URL is provided", () => {
    const onChange = vi.fn();
    render(
      <DiagramLabellingEditor
        options={{
          diagramUrl: "https://example.com/diagram.png",
          labelPositions: [],
          wordLimit: 2,
        }}
        correctAnswer={{ labels: {} }}
        onChange={onChange}
      />,
    );
    const img = screen.getByAltText("Diagram");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/diagram.png");
  });

  it("shows distractor badge when word bank has more items than positions", () => {
    const onChange = vi.fn();
    render(
      <DiagramLabellingEditor
        options={{
          diagramUrl: "",
          labelPositions: ["Pos 1", "Pos 2"],
          wordBank: ["shell", "membrane", "air cell", "yolk"],
          wordLimit: 2,
        }}
        correctAnswer={{ labels: {} }}
        onChange={onChange}
      />,
    );
    expect(screen.getByText(/4 labels, 2 positions/)).toBeInTheDocument();
    expect(screen.getByText(/2 distractors/)).toBeInTheDocument();
  });
});
