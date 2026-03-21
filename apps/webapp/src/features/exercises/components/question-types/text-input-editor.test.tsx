import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, vi, expect } from "vitest";
import { AnswerVariantManager } from "./AnswerVariantManager";
import { TextInputEditor } from "./TextInputEditor";
import { TextInputPreview } from "./TextInputPreview";

// Mock useDiagramUpload for consistent module resolution
vi.mock("../../hooks/use-diagram-upload", () => ({
  useDiagramUpload: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

// --- Story 3.5: TextInputEditor ---
describe("TextInputEditor", () => {
  it("renders correct answer input", () => {
    const onChange = vi.fn();
    render(
      <TextInputEditor
        correctAnswer={{
          answer: "revolution",
          acceptedVariants: ["revolt"],
          strictWordOrder: true,
        }}
        wordLimit={3}
        onChange={onChange}
      />,
    );
    expect(screen.getByDisplayValue("revolution")).toBeInTheDocument();
    expect(screen.getByText("revolt")).toBeInTheDocument();
  });

  it("adds a variant via AnswerVariantManager", () => {
    const onChange = vi.fn();
    render(
      <TextInputEditor
        correctAnswer={{
          answer: "answer",
          acceptedVariants: [],
          strictWordOrder: true,
        }}
        wordLimit={null}
        onChange={onChange}
      />,
    );
    const variantInput = screen.getByPlaceholderText("Add accepted variant...");
    fireEvent.change(variantInput, { target: { value: "new variant" } });
    fireEvent.click(screen.getByText("Add"));
    expect(onChange).toHaveBeenCalled();
    const [, correctAnswer] = onChange.mock.calls[0];
    expect(correctAnswer.acceptedVariants).toContain("new variant");
  });

  it("shows word limit input", () => {
    const onChange = vi.fn();
    render(
      <TextInputEditor
        correctAnswer={{
          answer: "test",
          acceptedVariants: [],
          strictWordOrder: true,
        }}
        wordLimit={3}
        onChange={onChange}
      />,
    );
    expect(screen.getByDisplayValue("3")).toBeInTheDocument();
  });

  it("handles null correctAnswer gracefully", () => {
    const onChange = vi.fn();
    render(
      <TextInputEditor
        correctAnswer={null}
        wordLimit={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByPlaceholderText("Enter the correct answer...")).toBeInTheDocument();
  });

  it("does NOT render caseSensitive checkbox (removed)", () => {
    const onChange = vi.fn();
    render(
      <TextInputEditor
        correctAnswer={{ answer: "test", acceptedVariants: [], strictWordOrder: true }}
        wordLimit={null}
        onChange={onChange}
      />,
    );
    expect(screen.queryByText(/case.sensitive/i)).not.toBeInTheDocument();
  });

  it("shows word order toggle when answer has 2+ words", () => {
    const onChange = vi.fn();
    render(
      <TextInputEditor
        correctAnswer={{ answer: "carbon dioxide", acceptedVariants: [], strictWordOrder: true }}
        wordLimit={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByText(/Allow any word order/)).toBeInTheDocument();
  });

  it("hides word order toggle for single-word answer", () => {
    const onChange = vi.fn();
    render(
      <TextInputEditor
        correctAnswer={{ answer: "cat", acceptedVariants: [], strictWordOrder: true }}
        wordLimit={null}
        onChange={onChange}
      />,
    );
    expect(screen.queryByText(/Allow any word order/)).not.toBeInTheDocument();
  });

  it("uses onBlur for primary answer (not onChange per keystroke)", () => {
    const onChange = vi.fn();
    render(
      <TextInputEditor
        correctAnswer={{ answer: "test", acceptedVariants: [], strictWordOrder: true }}
        wordLimit={null}
        onChange={onChange}
      />,
    );
    const input = screen.getByDisplayValue("test");
    fireEvent.change(input, { target: { value: "updated" } });
    // onChange should NOT be called on change — only on blur
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalled();
  });

  it("renders Paste variants button from AnswerVariantManager", () => {
    const onChange = vi.fn();
    render(
      <TextInputEditor
        correctAnswer={{ answer: "test", acceptedVariants: [], strictWordOrder: true }}
        wordLimit={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Paste variants")).toBeInTheDocument();
  });
});

describe("TextInputPreview", () => {
  it("renders text input with word limit badge", () => {
    render(
      <TextInputPreview
        questionText="Complete the sentence."
        questionIndex={0}
        wordLimit={3}
      />,
    );
    expect(screen.getByText("Complete the sentence.")).toBeInTheDocument();
    expect(screen.getByText(/Max 3 words/)).toBeInTheDocument();
  });

  it("renders without word limit badge when null", () => {
    render(
      <TextInputPreview
        questionText="Answer the question."
        questionIndex={0}
        wordLimit={null}
      />,
    );
    expect(screen.getByText("Answer the question.")).toBeInTheDocument();
    expect(screen.queryByText(/Max/)).not.toBeInTheDocument();
  });
});

// --- Story 3.5 Task 12.1: AnswerVariantManager ---
describe("AnswerVariantManager", () => {
  it("renders variant chips", () => {
    const onVariantsChange = vi.fn();
    render(
      <AnswerVariantManager
        variants={["nineteen", "19"]}
        onVariantsChange={onVariantsChange}
      />,
    );
    expect(screen.getByText("nineteen")).toBeInTheDocument();
    expect(screen.getByText("19")).toBeInTheDocument();
  });

  it("adds a variant via input", () => {
    const onVariantsChange = vi.fn();
    render(
      <AnswerVariantManager
        variants={["existing"]}
        onVariantsChange={onVariantsChange}
      />,
    );
    const input = screen.getByPlaceholderText("Add accepted variant...");
    fireEvent.change(input, { target: { value: "new" } });
    fireEvent.click(screen.getByText("Add"));
    expect(onVariantsChange).toHaveBeenCalled();
    const newVariants = onVariantsChange.mock.calls[0][0];
    expect(newVariants).toContain("new");
    expect(newVariants).toContain("existing");
  });

  it("removes a variant", () => {
    const onVariantsChange = vi.fn();
    render(
      <AnswerVariantManager
        variants={["alpha", "beta"]}
        onVariantsChange={onVariantsChange}
      />,
    );
    fireEvent.click(screen.getByLabelText("Remove variant alpha"));
    expect(onVariantsChange).toHaveBeenCalledWith(["beta"]);
  });

  it("rejects empty input", () => {
    const onVariantsChange = vi.fn();
    render(
      <AnswerVariantManager
        variants={[]}
        onVariantsChange={onVariantsChange}
      />,
    );
    fireEvent.click(screen.getByText("Add"));
    expect(onVariantsChange).not.toHaveBeenCalled();
  });

  it("deduplicates on add", () => {
    const onVariantsChange = vi.fn();
    render(
      <AnswerVariantManager
        variants={["existing"]}
        onVariantsChange={onVariantsChange}
      />,
    );
    const input = screen.getByPlaceholderText("Add accepted variant...");
    fireEvent.change(input, { target: { value: "existing" } });
    fireEvent.click(screen.getByText("Add"));
    expect(onVariantsChange).not.toHaveBeenCalled();
  });

  it("renders empty state", () => {
    const onVariantsChange = vi.fn();
    render(
      <AnswerVariantManager
        variants={[]}
        onVariantsChange={onVariantsChange}
      />,
    );
    expect(screen.getByText("Accepted Variants")).toBeInTheDocument();
    expect(screen.getByText("Paste variants")).toBeInTheDocument();
  });

  it("shows paste variants popover", () => {
    const onVariantsChange = vi.fn();
    render(
      <AnswerVariantManager
        variants={[]}
        onVariantsChange={onVariantsChange}
      />,
    );
    fireEvent.click(screen.getByText("Paste variants"));
    expect(screen.getByPlaceholderText("e.g. 19, nineteen, Nineteen")).toBeInTheDocument();
  });
});
