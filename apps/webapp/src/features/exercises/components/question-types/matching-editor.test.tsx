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
    expect(screen.getByText("Features")).toBeInTheDocument();
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

  it("trims whitespace from source item on blur for value-based keys (R9)", () => {
    const onChange = vi.fn();
    render(
      <MatchingEditor
        sectionType="R9_MATCHING_HEADINGS"
        options={{
          sourceItems: ["A"],
          targetItems: ["Heading 1", "Heading 2", "Heading 3"],
        }}
        correctAnswer={{ matches: { A: "Heading 1" } }}
        onChange={onChange}
      />,
    );
    const input = screen.getByDisplayValue("A");
    fireEvent.blur(input, { target: { value: "A " } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const [options, answer] = onChange.mock.calls[0];
    expect(options.sourceItems).toEqual(["A"]);
    expect(answer.matches).toEqual({ A: "Heading 1" });
  });

  it("trims whitespace from target item on blur", () => {
    const onChange = vi.fn();
    render(
      <MatchingEditor
        sectionType="R9_MATCHING_HEADINGS"
        options={{
          sourceItems: ["A"],
          targetItems: ["Heading 1", "Heading 2", "Heading 3"],
        }}
        correctAnswer={{ matches: { A: "Heading 1" } }}
        onChange={onChange}
      />,
    );
    const input = screen.getByDisplayValue("Heading 1");
    fireEvent.blur(input, { target: { value: "Heading 1 " } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const [options, answer] = onChange.mock.calls[0];
    expect(options.targetItems).toEqual(["Heading 1", "Heading 2", "Heading 3"]);
    expect(answer.matches).toEqual({ A: "Heading 1" });
  });

  it("trims whitespace from source item on blur for index-based keys (R10)", () => {
    const onChange = vi.fn();
    render(
      <MatchingEditor
        sectionType="R10_MATCHING_INFORMATION"
        options={{
          sourceItems: ["Statement 1"],
          targetItems: ["A", "B", "C"],
        }}
        correctAnswer={{ matches: { "0": "A" } }}
        onChange={onChange}
      />,
    );
    const input = screen.getByDisplayValue("Statement 1");
    fireEvent.blur(input, { target: { value: "Statement 1 " } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const [options, answer] = onChange.mock.calls[0];
    expect(options.sourceItems).toEqual(["Statement 1"]);
    expect(answer.matches).toEqual({ "0": "A" });
  });

  it("self-heals pre-existing untrimmed source data on blur (AC3)", () => {
    const onChange = vi.fn();
    render(
      <MatchingEditor
        sectionType="R9_MATCHING_HEADINGS"
        options={{
          sourceItems: [" A "],
          targetItems: ["Heading 1", "Heading 2", "Heading 3"],
        }}
        correctAnswer={{ matches: { " A ": "Heading 1" } }}
        onChange={onChange}
      />,
    );
    const inputs = screen.getAllByRole("textbox");
    const input = inputs.find((el) => el.getAttribute("value") === " A ") ?? inputs[0];
    fireEvent.blur(input, { target: { value: " A " } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const [options, answer] = onChange.mock.calls[0];
    expect(options.sourceItems).toEqual(["A"]);
    expect(answer.matches).toEqual({ A: "Heading 1" });
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

  // --- Story 12-1: Stable keys & memoization tests ---

  it("updating one source item does not change other source items' values", () => {
    const onChange = vi.fn();
    render(
      <MatchingEditor
        sectionType="R9_MATCHING_HEADINGS"
        options={{
          sourceItems: ["A", "B", "C"],
          targetItems: ["Heading 1", "Heading 2", "Heading 3", "Heading 4"],
        }}
        correctAnswer={{ matches: { A: "Heading 1", B: "Heading 2" } }}
        onChange={onChange}
      />,
    );
    // Update only the second source item
    const inputB = screen.getByDisplayValue("B");
    fireEvent.blur(inputB, { target: { value: "B-updated" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const [options] = onChange.mock.calls[0];
    expect(options.sourceItems).toEqual(["A", "B-updated", "C"]);
    // Other items unchanged
    expect(options.sourceItems[0]).toBe("A");
    expect(options.sourceItems[2]).toBe("C");
  });

  it("match assignments persist correctly after source edits (value-based keys)", () => {
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
    // Update source "A" to "A-new"
    const inputA = screen.getByDisplayValue("A");
    fireEvent.blur(inputA, { target: { value: "A-new" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const [, answer] = onChange.mock.calls[0];
    // Match should transfer from old key "A" to new key "A-new"
    expect(answer.matches["A-new"]).toBe("Heading 1");
    expect(answer.matches["A"]).toBeUndefined();
    // Other matches untouched
    expect(answer.matches["B"]).toBe("Heading 2");
  });

  it("match assignments persist correctly after target edits", () => {
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
    // Update target "Heading 1" to "Heading 1-updated"
    const targetInput = screen.getByDisplayValue("Heading 1");
    fireEvent.blur(targetInput, { target: { value: "Heading 1-updated" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const [options, answer] = onChange.mock.calls[0];
    expect(options.targetItems[0]).toBe("Heading 1-updated");
    // Match should be updated to reference the new target value
    expect(answer.matches["A"]).toBe("Heading 1-updated");
    expect(answer.matches["B"]).toBe("Heading 2");
  });

  it("adding a source item preserves existing items and renders correctly", () => {
    const onChange = vi.fn();
    const { rerender } = render(
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
    // Add a new source item
    const addInput = screen.getAllByPlaceholderText(/Add paragraphs.../i)[0];
    fireEvent.change(addInput, { target: { value: "C" } });
    fireEvent.click(screen.getAllByText("Add")[0]);
    expect(onChange).toHaveBeenCalledTimes(1);
    const [options, answer] = onChange.mock.calls[0];
    expect(options.sourceItems).toEqual(["A", "B", "C"]);
    // Existing matches preserved
    expect(answer.matches).toEqual({ A: "Heading 1" });

    // Re-render with updated items — existing items should keep their DOM values
    rerender(
      <MatchingEditor
        sectionType="R9_MATCHING_HEADINGS"
        options={{
          sourceItems: ["A", "B", "C"],
          targetItems: ["Heading 1", "Heading 2", "Heading 3"],
        }}
        correctAnswer={{ matches: { A: "Heading 1" } }}
        onChange={onChange}
      />,
    );
    expect(screen.getByDisplayValue("A")).toBeInTheDocument();
    expect(screen.getByDisplayValue("B")).toBeInTheDocument();
    expect(screen.getByDisplayValue("C")).toBeInTheDocument();
  });

  it("removing a source item preserves other items' DOM values (stable keys)", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <MatchingEditor
        sectionType="R9_MATCHING_HEADINGS"
        options={{
          sourceItems: ["A", "B", "C"],
          targetItems: ["Heading 1", "Heading 2", "Heading 3", "Heading 4"],
        }}
        correctAnswer={{ matches: { A: "Heading 1", B: "Heading 2", C: "Heading 3" } }}
        onChange={onChange}
      />,
    );
    // Remove the first source item "A"
    const removeButtons = screen.getAllByLabelText(/remove paragraphs item/i);
    fireEvent.click(removeButtons[0]);
    expect(onChange).toHaveBeenCalledTimes(1);
    const [options, answer] = onChange.mock.calls[0];
    expect(options.sourceItems).toEqual(["B", "C"]);
    expect(answer.matches["A"]).toBeUndefined();
    expect(answer.matches["B"]).toBe("Heading 2");
    expect(answer.matches["C"]).toBe("Heading 3");

    // Re-render — remaining items should be correctly displayed
    rerender(
      <MatchingEditor
        sectionType="R9_MATCHING_HEADINGS"
        options={{
          sourceItems: ["B", "C"],
          targetItems: ["Heading 1", "Heading 2", "Heading 3", "Heading 4"],
        }}
        correctAnswer={{ matches: { B: "Heading 2", C: "Heading 3" } }}
        onChange={onChange}
      />,
    );
    expect(screen.getByDisplayValue("B")).toBeInTheDocument();
    expect(screen.getByDisplayValue("C")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("A")).not.toBeInTheDocument();
  });

  it("removing a target item preserves other target items' DOM values", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <MatchingEditor
        sectionType="R9_MATCHING_HEADINGS"
        options={{
          sourceItems: ["A"],
          targetItems: ["Heading 1", "Heading 2", "Heading 3"],
        }}
        correctAnswer={{ matches: { A: "Heading 1" } }}
        onChange={onChange}
      />,
    );
    // Remove "Heading 2" (second target)
    const removeButtons = screen.getAllByLabelText(/remove headings item/i);
    fireEvent.click(removeButtons[1]);
    expect(onChange).toHaveBeenCalledTimes(1);
    const [options] = onChange.mock.calls[0];
    expect(options.targetItems).toEqual(["Heading 1", "Heading 3"]);

    // Re-render — remaining targets displayed correctly
    rerender(
      <MatchingEditor
        sectionType="R9_MATCHING_HEADINGS"
        options={{
          sourceItems: ["A"],
          targetItems: ["Heading 1", "Heading 3"],
        }}
        correctAnswer={{ matches: { A: "Heading 1" } }}
        onChange={onChange}
      />,
    );
    expect(screen.getByDisplayValue("Heading 1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Heading 3")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Heading 2")).not.toBeInTheDocument();
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

  it("renders R11 preview with items and 'Select feature...' placeholder", () => {
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
    const placeholders = screen.getAllByText("Select feature...");
    expect(placeholders).toHaveLength(2);
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

// --- Story 12-1: handleSaveDraft blur flush (AC4) ---
describe("handleSaveDraft blur flush", () => {
  it("blurs active element and flushes modified value via onBlur handler", () => {
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
    // Focus a source input and simulate typing a new value
    const inputA = screen.getByDisplayValue("A");
    fireEvent.focus(inputA);
    // Simulate what handleSaveDraft does: blur() triggers onBlur which reads e.target.value
    // In production, blur() fires the native event which React handles.
    // In jsdom, we use fireEvent.blur to trigger through React's event system.
    fireEvent.blur(inputA, { target: { value: "A-modified" } });
    // The blur triggers onBlur, which calls onChange with the flushed value
    expect(onChange).toHaveBeenCalledTimes(1);
    const [options, answer] = onChange.mock.calls[0];
    expect(options.sourceItems).toContain("A-modified");
    // Match should transfer from old key "A" to new key "A-modified"
    expect(answer.matches["A-modified"]).toBe("Heading 1");
    expect(answer.matches["A"]).toBeUndefined();
  });
});

// --- D3: Duplicate target values ---
describe("duplicate target values", () => {
  it("renaming one duplicate target does not corrupt matches for the other", () => {
    const onChange = vi.fn();
    render(
      <MatchingEditor
        sectionType="R9_MATCHING_HEADINGS"
        options={{
          sourceItems: ["A", "B"],
          targetItems: ["Same", "Same", "Different"],
        }}
        correctAnswer={{ matches: { A: "Same" } }}
        onChange={onChange}
      />,
    );
    // Rename the second "Same" (index 1) — should NOT affect match A→"Same" (index 0)
    const sameInputs = screen.getAllByDisplayValue("Same");
    fireEvent.blur(sameInputs[1], { target: { value: "Renamed" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const [options, answer] = onChange.mock.calls[0];
    expect(options.targetItems).toEqual(["Same", "Renamed", "Different"]);
    // Match A→"Same" should be untouched (it references index 0, not 1)
    expect(answer.matches["A"]).toBe("Same");
  });

  it("removing a duplicate target only cleans up matches for that specific index", () => {
    const onChange = vi.fn();
    render(
      <MatchingEditor
        sectionType="R9_MATCHING_HEADINGS"
        options={{
          sourceItems: ["A", "B"],
          targetItems: ["Same", "Same", "Different"],
        }}
        correctAnswer={{ matches: { A: "Same", B: "Different" } }}
        onChange={onChange}
      />,
    );
    // Remove the first "Same" (index 0) — should clean up match A→"Same"
    const removeButtons = screen.getAllByLabelText(/remove headings item/i);
    fireEvent.click(removeButtons[0]);
    expect(onChange).toHaveBeenCalledTimes(1);
    const [options, answer] = onChange.mock.calls[0];
    expect(options.targetItems).toEqual(["Same", "Different"]);
    expect(answer.matches["A"]).toBeUndefined();
    expect(answer.matches["B"]).toBe("Different");
  });
});

// --- Story 12-6: Duplicate heading warnings ---
describe("duplicate heading warnings", () => {
  it("shows warning when two paragraphs share the same heading (R9)", () => {
    render(
      <MatchingEditor
        sectionType="R9_MATCHING_HEADINGS"
        options={{
          sourceItems: ["A", "B"],
          targetItems: ["Same Heading", "Different Heading", "Extra"],
        }}
        correctAnswer={{ matches: { A: "Same Heading", B: "Same Heading" } }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/A, B.*share the same heading.*Same Heading/)).toBeInTheDocument();
  });

  it("lists all paragraph keys when three share a heading", () => {
    render(
      <MatchingEditor
        sectionType="R9_MATCHING_HEADINGS"
        options={{
          sourceItems: ["A", "B", "C"],
          targetItems: ["Heading X", "Extra 1", "Extra 2", "Extra 3"],
        }}
        correctAnswer={{ matches: { A: "Heading X", B: "Heading X", C: "Heading X" } }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/A, B, C/)).toBeInTheDocument();
  });

  it("warning disappears when matches are non-duplicate", () => {
    const { rerender } = render(
      <MatchingEditor
        sectionType="R9_MATCHING_HEADINGS"
        options={{
          sourceItems: ["A", "B"],
          targetItems: ["H1", "H2", "H3"],
        }}
        correctAnswer={{ matches: { A: "H1", B: "H1" } }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/share the same heading/)).toBeInTheDocument();

    rerender(
      <MatchingEditor
        sectionType="R9_MATCHING_HEADINGS"
        options={{
          sourceItems: ["A", "B"],
          targetItems: ["H1", "H2", "H3"],
        }}
        correctAnswer={{ matches: { A: "H1", B: "H2" } }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByText(/share the same heading/)).not.toBeInTheDocument();
  });

  it("does not show warning for R10 with duplicate target values", () => {
    render(
      <MatchingEditor
        sectionType="R10_MATCHING_INFORMATION"
        options={{
          sourceItems: ["Statement 1", "Statement 2"],
          targetItems: ["A", "B", "C"],
        }}
        correctAnswer={{ matches: { "0": "A", "1": "A" } }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByText(/share the same heading/)).not.toBeInTheDocument();
  });

  it("warning container has role='status' for a11y", () => {
    render(
      <MatchingEditor
        sectionType="R9_MATCHING_HEADINGS"
        options={{
          sourceItems: ["A", "B"],
          targetItems: ["Dup", "Other", "Extra"],
        }}
        correctAnswer={{ matches: { A: "Dup", B: "Dup" } }}
        onChange={vi.fn()}
      />,
    );
    const status = screen.getByRole("status");
    expect(status).toBeInTheDocument();
    expect(status).toHaveTextContent(/share the same heading/);
  });
});

// --- D4: Empty source value preserves match ---
describe("empty source value match preservation", () => {
  it("clearing a source value preserves match under index fallback key", () => {
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
    // Clear source "A" to empty
    const inputA = screen.getByDisplayValue("A");
    fireEvent.blur(inputA, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const [options, answer] = onChange.mock.calls[0];
    expect(options.sourceItems[0]).toBe("");
    // Match should be preserved under index fallback key "0"
    expect(answer.matches["0"]).toBe("Heading 1");
    expect(answer.matches["A"]).toBeUndefined();
    // Other match untouched
    expect(answer.matches["B"]).toBe("Heading 2");
  });
});
