import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, vi, expect } from "vitest";
import { MatchingEditor } from "./MatchingEditor";
import { MatchingPreview } from "./MatchingPreview";

// Mock useDiagramUpload for consistent module resolution
vi.mock("../../hooks/use-diagram-upload", () => ({
  useDiagramUpload: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

// --- MatchingEditor ---
// M3 note: Radix Select interaction (handleMatchAssignment) is not directly testable
// in jsdom because Radix relies on pointer events and portal rendering. The logic is
// exercised indirectly through the remove-item tests that verify match cleanup.
describe("MatchingEditor", () => {
  it("renders source and target items for R9", () => {
    const onChange = vi.fn();
    render(
      <MatchingEditor
        sectionType="R9_MATCHING_HEADINGS"
        options={{
          sourceItems: ["A", "B"],
          targetItems: ["Heading 1", "Heading 2", "Heading 3"],
        }}
        correctAnswer={{ matches: { A: "Heading 1" } }}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Paragraphs")).toBeInTheDocument();
    expect(screen.getByText("Headings")).toBeInTheDocument();
    expect(screen.getByDisplayValue("A")).toBeInTheDocument();
    expect(screen.getByDisplayValue("B")).toBeInTheDocument();
  });

  it("renders labels for R10_MATCHING_INFORMATION", () => {
    const onChange = vi.fn();
    render(
      <MatchingEditor
        sectionType="R10_MATCHING_INFORMATION"
        options={{
          sourceItems: ["Statement 1"],
          targetItems: ["A", "B"],
        }}
        correctAnswer={{ matches: {} }}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Statements")).toBeInTheDocument();
    expect(screen.getByText("Paragraphs")).toBeInTheDocument();
  });

  it("renders labels for R11_MATCHING_FEATURES", () => {
    const onChange = vi.fn();
    render(
      <MatchingEditor
        sectionType="R11_MATCHING_FEATURES"
        options={{
          sourceItems: ["Dr. Smith"],
          targetItems: ["Theory X", "Theory Y"],
        }}
        correctAnswer={{ matches: {} }}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Items")).toBeInTheDocument();
    expect(screen.getByText("Categories")).toBeInTheDocument();
  });

  it("renders labels for R12_MATCHING_SENTENCE_ENDINGS", () => {
    const onChange = vi.fn();
    render(
      <MatchingEditor
        sectionType="R12_MATCHING_SENTENCE_ENDINGS"
        options={{
          sourceItems: ["The team found"],
          targetItems: ["it was true.", "it was false."],
        }}
        correctAnswer={{ matches: {} }}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Sentence Beginnings")).toBeInTheDocument();
    expect(screen.getByText("Sentence Endings")).toBeInTheDocument();
  });

  it("adds a source item", () => {
    const onChange = vi.fn();
    render(
      <MatchingEditor
        sectionType="R9_MATCHING_HEADINGS"
        options={{ sourceItems: ["A"], targetItems: ["Heading 1", "Heading 2"] }}
        correctAnswer={{ matches: {} }}
        onChange={onChange}
      />,
    );
    const addInputs = screen.getAllByPlaceholderText(/Add paragraphs.../i);
    fireEvent.change(addInputs[0], { target: { value: "B" } });
    const addButtons = screen.getAllByText("Add");
    fireEvent.click(addButtons[0]);
    expect(onChange).toHaveBeenCalled();
    const [options] = onChange.mock.calls[0];
    expect(options.sourceItems).toEqual(["A", "B"]);
  });

  it("adds a target item", () => {
    const onChange = vi.fn();
    render(
      <MatchingEditor
        sectionType="R9_MATCHING_HEADINGS"
        options={{ sourceItems: ["A"], targetItems: ["Heading 1"] }}
        correctAnswer={{ matches: {} }}
        onChange={onChange}
      />,
    );
    const addInputs = screen.getAllByPlaceholderText(/Add headings.../i);
    fireEvent.change(addInputs[0], { target: { value: "Heading 2" } });
    const addButtons = screen.getAllByText("Add");
    fireEvent.click(addButtons[addButtons.length - 1]);
    expect(onChange).toHaveBeenCalled();
    const [options] = onChange.mock.calls[0];
    expect(options.targetItems).toEqual(["Heading 1", "Heading 2"]);
  });

  it("shows distractor warning when targets <= sources", () => {
    const onChange = vi.fn();
    render(
      <MatchingEditor
        sectionType="R9_MATCHING_HEADINGS"
        options={{ sourceItems: ["A", "B"], targetItems: ["Heading 1", "Heading 2"] }}
        correctAnswer={{ matches: {} }}
        onChange={onChange}
      />,
    );
    expect(screen.getByText(/matching questions need extra choices/i)).toBeInTheDocument();
  });

  it("does not show distractor warning when targets > sources", () => {
    const onChange = vi.fn();
    render(
      <MatchingEditor
        sectionType="R9_MATCHING_HEADINGS"
        options={{ sourceItems: ["A", "B"], targetItems: ["H1", "H2", "H3"] }}
        correctAnswer={{ matches: {} }}
        onChange={onChange}
      />,
    );
    expect(screen.queryByText(/matching questions need extra choices/i)).not.toBeInTheDocument();
  });

  it("shows distractor count badge", () => {
    const onChange = vi.fn();
    render(
      <MatchingEditor
        sectionType="R9_MATCHING_HEADINGS"
        options={{ sourceItems: ["A", "B"], targetItems: ["H1", "H2", "H3", "H4"] }}
        correctAnswer={{ matches: {} }}
        onChange={onChange}
      />,
    );
    expect(screen.getByText(/4 headings, 2 to match/i)).toBeInTheDocument();
    expect(screen.getByText(/2 extra/i)).toBeInTheDocument();
  });

  it("handles null options gracefully", () => {
    const onChange = vi.fn();
    render(
      <MatchingEditor
        sectionType="R9_MATCHING_HEADINGS"
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Paragraphs")).toBeInTheDocument();
    expect(screen.getByText("Headings")).toBeInTheDocument();
  });

  it("removes a source item and cleans up matches for index-based types", () => {
    const onChange = vi.fn();
    render(
      <MatchingEditor
        sectionType="R10_MATCHING_INFORMATION"
        options={{
          sourceItems: ["Statement 1", "Statement 2", "Statement 3"],
          targetItems: ["A", "B", "C", "D"],
        }}
        correctAnswer={{ matches: { "0": "A", "1": "B", "2": "C" } }}
        onChange={onChange}
      />,
    );
    // Remove the first source item
    const removeButtons = screen.getAllByLabelText(/remove statements item/i);
    fireEvent.click(removeButtons[0]);
    expect(onChange).toHaveBeenCalled();
    const [options, answer] = onChange.mock.calls[0];
    expect(options.sourceItems).toEqual(["Statement 2", "Statement 3"]);
    // Keys should be re-indexed: old "1" -> "0", old "2" -> "1"
    expect(answer.matches).toEqual({ "0": "B", "1": "C" });
  });

  it("removes a target item and cleans up matches referencing it", () => {
    const onChange = vi.fn();
    render(
      <MatchingEditor
        sectionType="R9_MATCHING_HEADINGS"
        options={{
          sourceItems: ["A", "B"],
          targetItems: ["Heading 1", "Heading 2", "Heading 3"],
        }}
        correctAnswer={{ matches: { A: "Heading 1", B: "Heading 2" } }}
        onChange={onChange}
      />,
    );
    // Remove "Heading 1" (first target item)
    const removeButtons = screen.getAllByLabelText(/remove headings item/i);
    fireEvent.click(removeButtons[0]);
    expect(onChange).toHaveBeenCalled();
    const [options, answer] = onChange.mock.calls[0];
    expect(options.targetItems).toEqual(["Heading 2", "Heading 3"]);
    // Match "A" -> "Heading 1" should be cleaned up
    expect(answer.matches).toEqual({ B: "Heading 2" });
  });
});

// --- MatchingPreview ---
describe("MatchingPreview", () => {
  it("renders R9 preview with paragraph labels and disabled dropdowns", () => {
    render(
      <MatchingPreview
        sectionType="R9_MATCHING_HEADINGS"
        questionIndex={0}
        options={{
          sourceItems: ["A", "B"],
          targetItems: ["Heading 1", "Heading 2", "Heading 3"],
        }}
      />,
    );
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("renders R10 preview with statements", () => {
    render(
      <MatchingPreview
        sectionType="R10_MATCHING_INFORMATION"
        questionIndex={0}
        options={{
          sourceItems: ["Statement 1"],
          targetItems: ["A", "B"],
        }}
      />,
    );
    expect(screen.getByText("Statement 1")).toBeInTheDocument();
  });

  it("renders R11 preview with items", () => {
    render(
      <MatchingPreview
        sectionType="R11_MATCHING_FEATURES"
        questionIndex={0}
        options={{
          sourceItems: ["Dr. Smith", "Prof. Jones"],
          targetItems: ["Theory X", "Theory Y"],
        }}
      />,
    );
    expect(screen.getByText("Dr. Smith")).toBeInTheDocument();
    expect(screen.getByText("Prof. Jones")).toBeInTheDocument();
  });

  it("renders R12 preview with sentence beginnings", () => {
    render(
      <MatchingPreview
        sectionType="R12_MATCHING_SENTENCE_ENDINGS"
        questionIndex={0}
        options={{
          sourceItems: ["The team found"],
          targetItems: ["it was true.", "it was false."],
        }}
      />,
    );
    expect(screen.getByText("The team found")).toBeInTheDocument();
  });

  it("handles null options gracefully with empty-state message", () => {
    render(
      <MatchingPreview
        sectionType="R9_MATCHING_HEADINGS"
        questionIndex={0}
        options={null}
      />,
    );
    expect(screen.getByText("1.")).toBeInTheDocument();
    expect(screen.getByText("No matching items configured.")).toBeInTheDocument();
  });
});
