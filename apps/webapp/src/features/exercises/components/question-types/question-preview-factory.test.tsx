import { render, screen } from "@testing-library/react";
import { describe, it, vi, expect } from "vitest";
import { QuestionPreviewFactory } from "./QuestionPreviewFactory";

// Mock useDiagramUpload for consistent module resolution
vi.mock("../../hooks/use-diagram-upload", () => ({
  useDiagramUpload: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe("QuestionPreviewFactory", () => {
  const baseQuestion = {
    id: "q1",
    sectionId: "s1",
    centerId: "c1",
    questionText: "Test question",
    questionType: "R1_MCQ_SINGLE",
    options: null,
    correctAnswer: null,
    orderIndex: 0,
    wordLimit: null,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  };

  it("renders MCQPreview for R1_MCQ_SINGLE", () => {
    render(
      <QuestionPreviewFactory
        sectionType="R1_MCQ_SINGLE"
        question={{
          ...baseQuestion,
          options: { items: [{ label: "A", text: "Opt A" }] },
        }}
        questionIndex={0}
      />,
    );
    expect(screen.getByText("Test question")).toBeInTheDocument();
  });

  it("renders TFNGPreview for R3_TFNG", () => {
    render(
      <QuestionPreviewFactory
        sectionType="R3_TFNG"
        question={baseQuestion}
        questionIndex={0}
      />,
    );
    expect(screen.getByText("True")).toBeInTheDocument();
    expect(screen.getByText("False")).toBeInTheDocument();
  });

  it("renders TextInputPreview for R5_SENTENCE_COMPLETION", () => {
    render(
      <QuestionPreviewFactory
        sectionType="R5_SENTENCE_COMPLETION"
        question={baseQuestion}
        questionIndex={0}
      />,
    );
    expect(screen.getByPlaceholderText("Type your answer...")).toBeInTheDocument();
  });

  it("renders WordBankPreview for R7_SUMMARY_WORD_BANK", () => {
    render(
      <QuestionPreviewFactory
        sectionType="R7_SUMMARY_WORD_BANK"
        question={{
          ...baseQuestion,
          options: { wordBank: ["word1"], summaryText: "Text ___1___." },
        }}
        questionIndex={0}
      />,
    );
    expect(screen.getByText("Text")).toBeInTheDocument();
  });

  it("renders MatchingPreview for R9_MATCHING_HEADINGS", () => {
    render(
      <QuestionPreviewFactory
        sectionType="R9_MATCHING_HEADINGS"
        question={{
          ...baseQuestion,
          options: {
            sourceItems: ["A", "B"],
            targetItems: ["Heading 1", "Heading 2", "Heading 3"],
          },
        }}
        questionIndex={0}
      />,
    );
    expect(screen.getByText("Test question")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("renders MatchingPreview for R10_MATCHING_INFORMATION", () => {
    render(
      <QuestionPreviewFactory
        sectionType="R10_MATCHING_INFORMATION"
        question={{
          ...baseQuestion,
          options: {
            sourceItems: ["Statement 1"],
            targetItems: ["A", "B"],
          },
        }}
        questionIndex={0}
      />,
    );
    expect(screen.getByText("Test question")).toBeInTheDocument();
    expect(screen.getByText("Statement 1")).toBeInTheDocument();
  });

  it("renders MatchingPreview for R12_MATCHING_SENTENCE_ENDINGS", () => {
    render(
      <QuestionPreviewFactory
        sectionType="R12_MATCHING_SENTENCE_ENDINGS"
        question={{
          ...baseQuestion,
          options: {
            sourceItems: ["The writer suggests that"],
            targetItems: ["ending A", "ending B", "ending C"],
          },
        }}
        questionIndex={0}
      />,
    );
    expect(screen.getByText("Test question")).toBeInTheDocument();
    expect(screen.getByText("The writer suggests that")).toBeInTheDocument();
  });

  it("renders NoteTableFlowchartPreview for R13_NOTE_TABLE_FLOWCHART", () => {
    render(
      <QuestionPreviewFactory
        sectionType="R13_NOTE_TABLE_FLOWCHART"
        question={{
          ...baseQuestion,
          options: {
            subFormat: "note",
            structure: "Main Topic\n• Impact ___1___",
            wordLimit: 2,
          },
        }}
        questionIndex={0}
      />,
    );
    expect(screen.getByText("Test question")).toBeInTheDocument();
    expect(screen.getByText(/Main Topic/)).toBeInTheDocument();
  });

  it("renders NoteTableFlowchartPreview empty state for R13 with null options", () => {
    render(
      <QuestionPreviewFactory
        sectionType="R13_NOTE_TABLE_FLOWCHART"
        question={baseQuestion}
        questionIndex={0}
      />,
    );
    expect(screen.getByText(/No structure configured/i)).toBeInTheDocument();
  });

  it("renders MatchingPreview gracefully with empty questionText", () => {
    render(
      <QuestionPreviewFactory
        sectionType="R9_MATCHING_HEADINGS"
        question={{
          ...baseQuestion,
          questionText: "",
          options: {
            sourceItems: ["A"],
            targetItems: ["Heading 1"],
          },
        }}
        questionIndex={0}
      />,
    );
    expect(screen.queryByText("Test question")).not.toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("renders NoteTableFlowchartPreview gracefully with empty questionText", () => {
    render(
      <QuestionPreviewFactory
        sectionType="R13_NOTE_TABLE_FLOWCHART"
        question={{
          ...baseQuestion,
          questionText: "",
          options: {
            subFormat: "note",
            structure: "Topic ___1___",
            wordLimit: 2,
          },
        }}
        questionIndex={0}
      />,
    );
    expect(screen.queryByText("Test question")).not.toBeInTheDocument();
    expect(screen.getByText(/Topic/)).toBeInTheDocument();
  });

  it("renders DiagramLabellingPreview for R14_DIAGRAM_LABELLING", () => {
    render(
      <QuestionPreviewFactory
        sectionType="R14_DIAGRAM_LABELLING"
        question={{
          ...baseQuestion,
          options: {
            diagramUrl: "",
            labelPositions: ["outer shell", "membrane"],
            wordLimit: 2,
          },
        }}
        questionIndex={0}
      />,
    );
    expect(screen.getByText("outer shell")).toBeInTheDocument();
    expect(screen.getByText("membrane")).toBeInTheDocument();
  });

  it("renders DiagramLabellingPreview empty state for R14 with null options", () => {
    render(
      <QuestionPreviewFactory
        sectionType="R14_DIAGRAM_LABELLING"
        question={baseQuestion}
        questionIndex={0}
      />,
    );
    expect(screen.getByText(/No diagram configured/i)).toBeInTheDocument();
  });

  it("renders writing preview with question text and rubric note for W1", () => {
    render(
      <QuestionPreviewFactory
        sectionType="W1_TASK1_ACADEMIC"
        question={baseQuestion}
        questionIndex={0}
      />,
    );
    expect(screen.getByText("Test question")).toBeInTheDocument();
  });

  it("renders writing preview for W2_TASK1_GENERAL", () => {
    render(
      <QuestionPreviewFactory
        sectionType="W2_TASK1_GENERAL"
        question={baseQuestion}
        questionIndex={0}
      />,
    );
    expect(screen.getByText("Test question")).toBeInTheDocument();
  });

  it("renders writing preview for W3_TASK2_ESSAY", () => {
    render(
      <QuestionPreviewFactory
        sectionType="W3_TASK2_ESSAY"
        question={baseQuestion}
        questionIndex={0}
      />,
    );
    expect(screen.getByText("Test question")).toBeInTheDocument();
  });

  it("displays writingPrompt instead of questionText when provided for Writing types", () => {
    render(
      <QuestionPreviewFactory
        sectionType="W1_TASK1_ACADEMIC"
        question={baseQuestion}
        questionIndex={0}
        writingPrompt="Describe the chart below"
      />,
    );
    expect(screen.getByText("Describe the chart below")).toBeInTheDocument();
    expect(screen.queryByText("Test question")).not.toBeInTheDocument();
  });

  it("falls back to questionText when writingPrompt is not provided for Writing types", () => {
    render(
      <QuestionPreviewFactory
        sectionType="W1_TASK1_ACADEMIC"
        question={baseQuestion}
        questionIndex={0}
      />,
    );
    expect(screen.getByText("Test question")).toBeInTheDocument();
  });

  it("displays empty writingPrompt (empty string) instead of falling back to questionText", () => {
    render(
      <QuestionPreviewFactory
        sectionType="W1_TASK1_ACADEMIC"
        question={baseQuestion}
        questionIndex={0}
        writingPrompt=""
      />,
    );
    expect(screen.queryByText("Test question")).not.toBeInTheDocument();
  });

  // --- S1/S2/S3 Speaking question type preview wiring ---

  it("renders S1_PART1_QA preview with question text and record prompt", () => {
    render(
      <QuestionPreviewFactory
        sectionType="S1_PART1_QA"
        question={baseQuestion}
        questionIndex={0}
      />,
    );
    expect(screen.getByText("Test question")).toBeInTheDocument();
    expect(screen.getByText(/Record your answer/)).toBeInTheDocument();
  });

  it("renders S2_PART2_CUE_CARD preview with cue card layout", () => {
    render(
      <QuestionPreviewFactory
        sectionType="S2_PART2_CUE_CARD"
        question={{
          ...baseQuestion,
          options: {
            topic: "Describe a memorable trip",
            bulletPoints: ["Where did you go?", "Who were you with?"],
          },
        }}
        questionIndex={0}
      />,
    );
    expect(screen.getByText("Describe a memorable trip")).toBeInTheDocument();
    expect(screen.getByText("Where did you go?")).toBeInTheDocument();
    expect(screen.getByText("Who were you with?")).toBeInTheDocument();
  });

  it("renders S2_PART2_CUE_CARD preview with null options gracefully", () => {
    render(
      <QuestionPreviewFactory
        sectionType="S2_PART2_CUE_CARD"
        question={baseQuestion}
        questionIndex={0}
      />,
    );
    expect(screen.getByText(/graded using IELTS band descriptors/)).toBeInTheDocument();
  });

  it("renders S3_PART3_DISCUSSION preview with question text and record prompt", () => {
    render(
      <QuestionPreviewFactory
        sectionType="S3_PART3_DISCUSSION"
        question={baseQuestion}
        questionIndex={0}
      />,
    );
    expect(screen.getByText("Test question")).toBeInTheDocument();
    expect(screen.getByText(/Record your answer/)).toBeInTheDocument();
  });

  // --- L1-L6 Listening question type preview wiring ---

  it("renders NoteTableFlowchartPreview for L1_FORM_NOTE_TABLE", () => {
    render(
      <QuestionPreviewFactory
        sectionType="L1_FORM_NOTE_TABLE"
        question={baseQuestion}
        questionIndex={0}
      />,
    );
    expect(screen.getByText(/No structure configured/i)).toBeInTheDocument();
  });

  it("renders NoteTableFlowchartPreview with data for L1_FORM_NOTE_TABLE", () => {
    render(
      <QuestionPreviewFactory
        sectionType="L1_FORM_NOTE_TABLE"
        question={{
          ...baseQuestion,
          options: {
            subFormat: "note",
            structure: "Main Topic\n• Impact ___1___",
            wordLimit: 2,
          },
        }}
        questionIndex={0}
      />,
    );
    expect(screen.getByText("Test question")).toBeInTheDocument();
    expect(screen.getByText(/Main Topic/)).toBeInTheDocument();
  });

  it("renders MCQPreview for L2_MCQ", () => {
    render(
      <QuestionPreviewFactory
        sectionType="L2_MCQ"
        question={{
          ...baseQuestion,
          options: {
            items: [
              { label: "A", text: "Option A" },
              { label: "B", text: "Option B" },
            ],
          },
        }}
        questionIndex={0}
      />,
    );
    expect(screen.getByText("Test question")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("renders MCQPreview with radio buttons for L2_MCQ even with maxSelections > 1", () => {
    render(
      <QuestionPreviewFactory
        sectionType="L2_MCQ"
        question={{
          ...baseQuestion,
          options: {
            items: [
              { label: "A", text: "Option A" },
              { label: "B", text: "Option B" },
            ],
            maxSelections: 2,
          },
        }}
        questionIndex={0}
      />,
    );
    // L2_MCQ is always single-answer (radio buttons)
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("renders MatchingPreview for L3_MATCHING", () => {
    render(
      <QuestionPreviewFactory
        sectionType="L3_MATCHING"
        question={{
          ...baseQuestion,
          options: {
            sourceItems: ["Speaker 1", "Speaker 2"],
            targetItems: ["Opinion A", "Opinion B", "Opinion C"],
          },
        }}
        questionIndex={0}
      />,
    );
    expect(screen.getByText("Test question")).toBeInTheDocument();
    expect(screen.getByText("Speaker 1")).toBeInTheDocument();
    expect(screen.getByText("Speaker 2")).toBeInTheDocument();
  });

  it("renders DiagramLabellingPreview for L4_MAP_PLAN_LABELLING", () => {
    render(
      <QuestionPreviewFactory
        sectionType="L4_MAP_PLAN_LABELLING"
        question={baseQuestion}
        questionIndex={0}
      />,
    );
    expect(screen.getByText(/No diagram configured/i)).toBeInTheDocument();
  });

  it("renders TextInputPreview for L5_SENTENCE_COMPLETION", () => {
    render(
      <QuestionPreviewFactory
        sectionType="L5_SENTENCE_COMPLETION"
        question={baseQuestion}
        questionIndex={0}
      />,
    );
    expect(screen.getByPlaceholderText("Type your answer...")).toBeInTheDocument();
  });

  it("renders TextInputPreview for L6_SHORT_ANSWER", () => {
    render(
      <QuestionPreviewFactory
        sectionType="L6_SHORT_ANSWER"
        question={baseQuestion}
        questionIndex={0}
      />,
    );
    expect(screen.getByPlaceholderText("Type your answer...")).toBeInTheDocument();
  });
});
