import { render, screen } from "@testing-library/react";
import { describe, it, vi, expect } from "vitest";
import { QuestionEditorFactory } from "./QuestionEditorFactory";

// Mock useDiagramUpload for DiagramLabellingEditor tests
vi.mock("../../hooks/use-diagram-upload", () => ({
  useDiagramUpload: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

// --- Task 9.5: QuestionEditorFactory ---
describe("QuestionEditorFactory", () => {
  it("renders MCQEditor for R1_MCQ_SINGLE", () => {
    const onChange = vi.fn();
    render(
      <QuestionEditorFactory
        sectionType="R1_MCQ_SINGLE"
        options={{ items: [{ label: "A", text: "Test" }, { label: "B", text: "Test B" }] }}
        correctAnswer={{ answer: "A" }}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Add Option")).toBeInTheDocument();
  });

  it("renders MCQEditor with checkboxes for R2_MCQ_MULTI", () => {
    const onChange = vi.fn();
    render(
      <QuestionEditorFactory
        sectionType="R2_MCQ_MULTI"
        options={{
          items: [{ label: "A", text: "Test" }, { label: "B", text: "Test B" }],
          maxSelections: 2,
        }}
        correctAnswer={{ answers: ["A"] }}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Max Selections")).toBeInTheDocument();
  });

  it("renders TFNGEditor for R3_TFNG", () => {
    const onChange = vi.fn();
    render(
      <QuestionEditorFactory
        sectionType="R3_TFNG"
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("True")).toBeInTheDocument();
    expect(screen.getByText("False")).toBeInTheDocument();
  });

  it("renders TFNGEditor for R4_YNNG", () => {
    const onChange = vi.fn();
    render(
      <QuestionEditorFactory
        sectionType="R4_YNNG"
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("renders TextInputEditor for R5_SENTENCE_COMPLETION", () => {
    const onChange = vi.fn();
    render(
      <QuestionEditorFactory
        sectionType="R5_SENTENCE_COMPLETION"
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByPlaceholderText("Enter the correct answer...")).toBeInTheDocument();
  });

  it("renders TextInputEditor for R6_SHORT_ANSWER", () => {
    const onChange = vi.fn();
    render(
      <QuestionEditorFactory
        sectionType="R6_SHORT_ANSWER"
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByPlaceholderText("Enter the correct answer...")).toBeInTheDocument();
  });

  it("renders WordBankEditor for R7_SUMMARY_WORD_BANK", () => {
    const onChange = vi.fn();
    render(
      <QuestionEditorFactory
        sectionType="R7_SUMMARY_WORD_BANK"
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByPlaceholderText(/urban growth/i)).toBeInTheDocument();
  });

  it("renders TextInputEditor for R8_SUMMARY_PASSAGE", () => {
    const onChange = vi.fn();
    render(
      <QuestionEditorFactory
        sectionType="R8_SUMMARY_PASSAGE"
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByPlaceholderText("Enter the correct answer...")).toBeInTheDocument();
  });

  it("renders MatchingEditor for R9_MATCHING_HEADINGS", () => {
    const onChange = vi.fn();
    render(
      <QuestionEditorFactory
        sectionType="R9_MATCHING_HEADINGS"
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Paragraphs")).toBeInTheDocument();
    expect(screen.getByText("Headings")).toBeInTheDocument();
  });

  it("renders MatchingEditor for R10_MATCHING_INFORMATION", () => {
    const onChange = vi.fn();
    render(
      <QuestionEditorFactory
        sectionType="R10_MATCHING_INFORMATION"
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Statements")).toBeInTheDocument();
    expect(screen.getByText("Paragraphs")).toBeInTheDocument();
  });

  it("renders MatchingEditor for R11_MATCHING_FEATURES", () => {
    const onChange = vi.fn();
    render(
      <QuestionEditorFactory
        sectionType="R11_MATCHING_FEATURES"
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Items")).toBeInTheDocument();
    expect(screen.getByText("Categories")).toBeInTheDocument();
  });

  it("renders MatchingEditor for R12_MATCHING_SENTENCE_ENDINGS", () => {
    const onChange = vi.fn();
    render(
      <QuestionEditorFactory
        sectionType="R12_MATCHING_SENTENCE_ENDINGS"
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Sentence Beginnings")).toBeInTheDocument();
    expect(screen.getByText("Sentence Endings")).toBeInTheDocument();
  });

  it("renders NoteTableFlowchartEditor for R13_NOTE_TABLE_FLOWCHART", () => {
    const onChange = vi.fn();
    render(
      <QuestionEditorFactory
        sectionType="R13_NOTE_TABLE_FLOWCHART"
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Sub-Format")).toBeInTheDocument();
  });

  it("renders DiagramLabellingEditor for R14_DIAGRAM_LABELLING", () => {
    const onChange = vi.fn();
    render(
      <QuestionEditorFactory
        sectionType="R14_DIAGRAM_LABELLING"
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Diagram Image")).toBeInTheDocument();
  });

  it("renders read-only notice for W1_TASK1_ACADEMIC", () => {
    const onChange = vi.fn();
    render(
      <QuestionEditorFactory
        sectionType="W1_TASK1_ACADEMIC"
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByText(/writing task prompt is configured above/i)).toBeInTheDocument();
  });

  it("renders read-only notice for W2_TASK1_GENERAL", () => {
    const onChange = vi.fn();
    render(
      <QuestionEditorFactory
        sectionType="W2_TASK1_GENERAL"
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByText(/writing task prompt is configured above/i)).toBeInTheDocument();
  });

  it("renders read-only notice for W3_TASK2_ESSAY", () => {
    const onChange = vi.fn();
    render(
      <QuestionEditorFactory
        sectionType="W3_TASK2_ESSAY"
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByText(/writing task prompt is configured above/i)).toBeInTheDocument();
  });

  // --- S1/S2/S3 Speaking question type editor wiring ---

  it("renders read-only notice for S1_PART1_QA", () => {
    const onChange = vi.fn();
    render(
      <QuestionEditorFactory
        sectionType="S1_PART1_QA"
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByText(/Part 1 questions are individual items/i)).toBeInTheDocument();
  });

  it("renders SpeakingCueCardEditor for S2_PART2_CUE_CARD", () => {
    const onChange = vi.fn();
    render(
      <QuestionEditorFactory
        sectionType="S2_PART2_CUE_CARD"
        options={{ topic: "Describe a place", bulletPoints: ["Where is it?"] }}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByDisplayValue("Describe a place")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Where is it?")).toBeInTheDocument();
  });

  it("renders SpeakingCueCardEditor with null options for S2_PART2_CUE_CARD", () => {
    const onChange = vi.fn();
    render(
      <QuestionEditorFactory
        sectionType="S2_PART2_CUE_CARD"
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Cue Card Topic")).toBeInTheDocument();
    expect(screen.getByText("Add Bullet Point")).toBeInTheDocument();
  });

  it("renders read-only notice for S3_PART3_DISCUSSION", () => {
    const onChange = vi.fn();
    render(
      <QuestionEditorFactory
        sectionType="S3_PART3_DISCUSSION"
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByText(/Discussion questions are individual items/i)).toBeInTheDocument();
  });

  it("renders fallback for truly unimplemented types", () => {
    const onChange = vi.fn();
    render(
      <QuestionEditorFactory
        sectionType={"UNKNOWN_TYPE" as never}
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByText(/no editor available/i)).toBeInTheDocument();
  });

  // --- L1-L6 Listening question type editor wiring ---

  it("renders NoteTableFlowchartEditor for L1_FORM_NOTE_TABLE", () => {
    const onChange = vi.fn();
    render(
      <QuestionEditorFactory
        sectionType="L1_FORM_NOTE_TABLE"
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.queryByText(/no editor available/i)).not.toBeInTheDocument();
    expect(screen.getByText("Sub-Format")).toBeInTheDocument();
  });

  it("renders MCQEditor for L2_MCQ", () => {
    const onChange = vi.fn();
    render(
      <QuestionEditorFactory
        sectionType="L2_MCQ"
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.queryByText(/no editor available/i)).not.toBeInTheDocument();
    expect(screen.getByText("Add Option")).toBeInTheDocument();
  });

  it("renders MCQEditor in single-answer mode by default for L2_MCQ", () => {
    const onChange = vi.fn();
    render(
      <QuestionEditorFactory
        sectionType="L2_MCQ"
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
    // Single-answer mode renders radio buttons, not checkboxes
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.queryByText("Max Selections")).not.toBeInTheDocument();
  });

  it("renders MCQEditor in single-answer mode for L2_MCQ even with maxSelections > 1", () => {
    const onChange = vi.fn();
    render(
      <QuestionEditorFactory
        sectionType="L2_MCQ"
        options={{
          items: [
            { label: "A", text: "Option A" },
            { label: "B", text: "Option B" },
          ],
          maxSelections: 2,
        }}
        correctAnswer={{ answer: "A" }}
        onChange={onChange}
      />,
    );
    // L2_MCQ is always single-answer (radio buttons)
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.queryByText("Max Selections")).not.toBeInTheDocument();
  });

  it("renders MatchingEditor for L3_MATCHING with correct labels and placeholders", () => {
    const onChange = vi.fn();
    render(
      <QuestionEditorFactory
        sectionType="L3_MATCHING"
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.queryByText(/no editor available/i)).not.toBeInTheDocument();
    expect(screen.getByText("Items")).toBeInTheDocument();
    expect(screen.getByText("Options")).toBeInTheDocument();
    // L3-specific placeholder distinguishes from R11 (which uses "e.g., Dr. Smith")
    expect(screen.getByPlaceholderText(/Add items.../i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Add options.../i)).toBeInTheDocument();
  });

  it("renders DiagramLabellingEditor for L4_MAP_PLAN_LABELLING", () => {
    const onChange = vi.fn();
    render(
      <QuestionEditorFactory
        sectionType="L4_MAP_PLAN_LABELLING"
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.queryByText(/no editor available/i)).not.toBeInTheDocument();
    expect(screen.getByText("Diagram Image")).toBeInTheDocument();
  });

  it("renders TextInputEditor for L5_SENTENCE_COMPLETION", () => {
    const onChange = vi.fn();
    render(
      <QuestionEditorFactory
        sectionType="L5_SENTENCE_COMPLETION"
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.queryByText(/no editor available/i)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter the correct answer...")).toBeInTheDocument();
  });

  it("renders TextInputEditor for L6_SHORT_ANSWER", () => {
    const onChange = vi.fn();
    render(
      <QuestionEditorFactory
        sectionType="L6_SHORT_ANSWER"
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.queryByText(/no editor available/i)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter the correct answer...")).toBeInTheDocument();
  });
});
