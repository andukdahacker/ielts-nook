import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuestionInputFactory } from "./QuestionInputFactory";

interface QuestionForInput {
  id: string;
  questionText: string;
  questionType: string;
  options: unknown;
  wordLimit: number | null;
}

function makeQuestion(overrides: Partial<QuestionForInput> = {}): QuestionForInput {
  return {
    id: "q1",
    questionText: "Test question text",
    questionType: "R1_MCQ_SINGLE",
    options: null,
    wordLimit: null,
    ...overrides,
  };
}

describe("QuestionInputFactory", () => {
  it("renders MCQInput for R1_MCQ_SINGLE", () => {
    const onChange = vi.fn();
    render(
      <QuestionInputFactory
        sectionType="R1_MCQ_SINGLE"
        question={makeQuestion({
          options: { items: [{ label: "A", text: "Option A" }], maxSelections: 1 },
        })}
        questionIndex={0}
        value={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Test question text")).toBeInTheDocument();
    expect(screen.getByText("A. Option A")).toBeInTheDocument();
  });

  it("renders MCQInput for R3_TFNG with fixed options", () => {
    const onChange = vi.fn();
    render(
      <QuestionInputFactory
        sectionType="R3_TFNG"
        question={makeQuestion()}
        questionIndex={0}
        value={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("True")).toBeInTheDocument();
    expect(screen.getByText("False")).toBeInTheDocument();
    expect(screen.getByText("Not Given")).toBeInTheDocument();
  });

  it("renders TextAnswerInput for R5_SENTENCE_COMPLETION", () => {
    const onChange = vi.fn();
    render(
      <QuestionInputFactory
        sectionType="R5_SENTENCE_COMPLETION"
        question={makeQuestion({ wordLimit: 3 })}
        questionIndex={1}
        value={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByPlaceholderText("Type your answer...")).toBeInTheDocument();
    expect(screen.getByText("Max 3 words")).toBeInTheDocument();
  });

  it("renders WritingInput for W3_TASK2_ESSAY", () => {
    const onChange = vi.fn();
    render(
      <QuestionInputFactory
        sectionType="W3_TASK2_ESSAY"
        question={makeQuestion()}
        questionIndex={0}
        value={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByPlaceholderText("Write your response here...")).toBeInTheDocument();
    expect(screen.getByText("0 words")).toBeInTheDocument();
  });

  it("renders SpeakingInput for S1_PART1_QA", () => {
    const onChange = vi.fn();
    render(
      <QuestionInputFactory
        sectionType="S1_PART1_QA"
        question={makeQuestion()}
        questionIndex={0}
        value={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Start Recording")).toBeInTheDocument();
  });

  it("renders PhotoCaptureInput for unknown type (default)", () => {
    const onChange = vi.fn();
    const onPhotoCapture = vi.fn();
    render(
      <QuestionInputFactory
        sectionType={"UNKNOWN_TYPE" as never}
        question={makeQuestion()}
        questionIndex={0}
        value={null}
        onChange={onChange}
        onPhotoCapture={onPhotoCapture}
      />,
    );
    expect(screen.getByText("Take Photo or Choose File")).toBeInTheDocument();
  });
});

describe("MCQInput", () => {
  it("calls onChange when TFNG option clicked", () => {
    const onChange = vi.fn();
    render(
      <QuestionInputFactory
        sectionType="R3_TFNG"
        question={makeQuestion()}
        questionIndex={0}
        value={null}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText("True"));
    expect(onChange).toHaveBeenCalledWith({ answer: "TRUE" });
  });

  it("highlights selected YNNG answer", () => {
    const onChange = vi.fn();
    render(
      <QuestionInputFactory
        sectionType="R4_YNNG"
        question={makeQuestion()}
        questionIndex={0}
        value={{ answer: "YES" }}
        onChange={onChange}
      />,
    );
    const yesBtn = screen.getByText("Yes").closest("button")!;
    expect(yesBtn.className).toContain("bg-primary");
  });

  it("renders multi-select MCQ with checkboxes", () => {
    const onChange = vi.fn();
    render(
      <QuestionInputFactory
        sectionType="R2_MCQ_MULTI"
        question={makeQuestion({
          options: {
            items: [
              { label: "A", text: "First" },
              { label: "B", text: "Second" },
            ],
            maxSelections: 2,
          },
        })}
        questionIndex={0}
        value={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Choose 2 answers")).toBeInTheDocument();
    fireEvent.click(screen.getByText("A. First").closest("label")!);
    expect(onChange).toHaveBeenCalledWith({ answers: ["A"] });
  });
});

describe("TextAnswerInput", () => {
  it("calls onChange when typing", () => {
    const onChange = vi.fn();
    render(
      <QuestionInputFactory
        sectionType="R6_SHORT_ANSWER"
        question={makeQuestion()}
        questionIndex={0}
        value={null}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("Type your answer..."), {
      target: { value: "hello" },
    });
    expect(onChange).toHaveBeenCalledWith({ answer: "hello" });
  });

  it("displays existing value", () => {
    render(
      <QuestionInputFactory
        sectionType="R6_SHORT_ANSWER"
        question={makeQuestion()}
        questionIndex={0}
        value={{ answer: "existing" }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue("existing")).toBeInTheDocument();
  });
});

describe("WritingInput", () => {
  it("updates word count as user types", () => {
    const onChange = vi.fn();
    render(
      <QuestionInputFactory
        sectionType="W1_TASK1_ACADEMIC"
        question={makeQuestion()}
        questionIndex={0}
        value={{ text: "one two three" }}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("3 words")).toBeInTheDocument();
  });

  it("shows word count range for writing tasks", () => {
    render(
      <QuestionInputFactory
        sectionType="W1_TASK1_ACADEMIC"
        question={makeQuestion()}
        questionIndex={0}
        value={null}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/min 150 words/)).toBeInTheDocument();
  });
});

describe("MatchingInput", () => {
  it("renders source items with select dropdowns", () => {
    render(
      <QuestionInputFactory
        sectionType="R9_MATCHING_HEADINGS"
        question={makeQuestion({
          options: {
            sourceItems: ["Statement A", "Statement B"],
            targetItems: ["Heading 1", "Heading 2"],
          },
        })}
        questionIndex={0}
        value={null}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Statement A")).toBeInTheDocument();
    expect(screen.getByText("Statement B")).toBeInTheDocument();
  });

  it("shows fallback when no items configured", () => {
    render(
      <QuestionInputFactory
        sectionType="R9_MATCHING_HEADINGS"
        question={makeQuestion({ options: { sourceItems: [], targetItems: [] } })}
        questionIndex={0}
        value={null}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/no matching items configured/i)).toBeInTheDocument();
  });
});

describe("NoteTableFlowchartInput", () => {
  it("renders note format with blanks", () => {
    render(
      <QuestionInputFactory
        sectionType="R13_NOTE_TABLE_FLOWCHART"
        question={makeQuestion({
          options: { subFormat: "note", structure: "The answer is ___1___ and ___2___", wordLimit: 2 },
        })}
        questionIndex={0}
        value={null}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/The answer is/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("(1)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("(2)")).toBeInTheDocument();
  });

  it("shows fallback when no structure", () => {
    render(
      <QuestionInputFactory
        sectionType="R13_NOTE_TABLE_FLOWCHART"
        question={makeQuestion({ options: null })}
        questionIndex={0}
        value={null}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/no structure configured/i)).toBeInTheDocument();
  });
});

describe("DiagramLabellingInput", () => {
  it("renders label positions with inputs", () => {
    render(
      <QuestionInputFactory
        sectionType="R14_DIAGRAM_LABELLING"
        question={makeQuestion({
          options: {
            diagramUrl: "https://example.com/diagram.png",
            labelPositions: ["Top left", "Bottom right"],
            wordLimit: 2,
          },
        })}
        questionIndex={0}
        value={null}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Top left")).toBeInTheDocument();
    expect(screen.getByText("Bottom right")).toBeInTheDocument();
    expect(screen.getByAltText("Diagram")).toBeInTheDocument();
  });

  it("shows fallback when no diagram configured", () => {
    render(
      <QuestionInputFactory
        sectionType="R14_DIAGRAM_LABELLING"
        question={makeQuestion({ options: null })}
        questionIndex={0}
        value={null}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/no diagram configured/i)).toBeInTheDocument();
  });
});

describe("PhotoCaptureInput", () => {
  it("renders capture button initially", () => {
    render(
      <QuestionInputFactory
        sectionType={"UNKNOWN_TYPE" as never}
        question={makeQuestion()}
        questionIndex={0}
        value={null}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Take Photo or Choose File")).toBeInTheDocument();
  });

  it("shows preview when value has photoUrl", () => {
    render(
      <QuestionInputFactory
        sectionType={"UNKNOWN_TYPE" as never}
        question={makeQuestion()}
        questionIndex={0}
        value={{ photoUrl: "https://example.com/photo.jpg" }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByAltText("Captured answer")).toBeInTheDocument();
    expect(screen.getByText("Retake")).toBeInTheDocument();
    expect(screen.getByText("Remove")).toBeInTheDocument();
  });
});
