import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, vi, expect } from "vitest";
import { WordBankEditor } from "./WordBankEditor";
import { WordBankPreview } from "./WordBankPreview";

// Mock useDiagramUpload for consistent module resolution
vi.mock("../../hooks/use-diagram-upload", () => ({
  useDiagramUpload: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

// --- Task 9.4: WordBankEditor ---
describe("WordBankEditor", () => {
  it("renders word bank chips", () => {
    const onChange = vi.fn();
    render(
      <WordBankEditor
        options={{
          wordBank: ["climate", "population"],
          summaryText: "The ___1___ affects ___2___.",
        }}
        correctAnswer={{ blanks: { "1": "climate" } }}
        onChange={onChange}
      />,
    );
    // "climate" appears in both the badge and the dropdown, so use getAllByText
    expect(screen.getAllByText("climate").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("population").length).toBeGreaterThanOrEqual(1);
  });

  it("renders blank assignment dropdowns", () => {
    const onChange = vi.fn();
    render(
      <WordBankEditor
        options={{
          wordBank: ["word1", "word2"],
          summaryText: "Text ___1___ and ___2___.",
        }}
        correctAnswer={{ blanks: {} }}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Blank 1:")).toBeInTheDocument();
    expect(screen.getByText("Blank 2:")).toBeInTheDocument();
  });

  it("adds a word to the bank", () => {
    const onChange = vi.fn();
    render(
      <WordBankEditor
        options={{
          wordBank: ["existing"],
          summaryText: "Text ___1___.",
        }}
        correctAnswer={{ blanks: {} }}
        onChange={onChange}
      />,
    );
    const wordInput = screen.getByPlaceholderText("Add a word to the bank...");
    fireEvent.change(wordInput, { target: { value: "newword" } });
    fireEvent.click(screen.getByText("Add"));
    expect(onChange).toHaveBeenCalled();
    const [options] = onChange.mock.calls[0];
    expect(options.wordBank).toContain("newword");
  });

  it("handles null options gracefully", () => {
    const onChange = vi.fn();
    render(
      <WordBankEditor
        options={null}
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    // The placeholder contains "___1___" syntax description
    expect(screen.getByPlaceholderText(/urban growth/i)).toBeInTheDocument();
  });
});

describe("WordBankPreview", () => {
  it("renders summary text with blanks", () => {
    render(
      <WordBankPreview
        questionIndex={0}
        options={{
          wordBank: ["climate", "population"],
          summaryText: "The ___1___ affects ___2___.",
        }}
      />,
    );
    expect(screen.getByText("The")).toBeInTheDocument();
    expect(screen.getByText("affects")).toBeInTheDocument();
  });

  it("handles null options gracefully", () => {
    render(
      <WordBankPreview questionIndex={0} options={null} />,
    );
    expect(screen.getByText("1.")).toBeInTheDocument();
  });
});
