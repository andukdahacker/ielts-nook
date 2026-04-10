import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { NoteTableFlowchartEditor } from "./NoteTableFlowchartEditor";

// Mock AnswerVariantManager to keep tests focused
vi.mock("./AnswerVariantManager", () => ({
  AnswerVariantManager: () => <div data-testid="variant-manager" />,
}));

const noop = vi.fn();

describe("NoteTableFlowchartEditor", () => {
  describe("Correct Answers label and warning", () => {
    it("renders 'Correct Answers' label with KeyRound icon when blanks exist", () => {
      render(
        <NoteTableFlowchartEditor
          options={{ subFormat: "note", structure: "Topic ___1___", wordLimit: 2 }}
          correctAnswer={{ blanks: { "1": { answer: "climate", acceptedVariants: [], strictWordOrder: true } } }}
          onChange={noop}
        />,
      );
      expect(screen.getByText("Correct Answers")).toBeInTheDocument();
    });

    it("shows incomplete warning when a blank has an empty answer", () => {
      render(
        <NoteTableFlowchartEditor
          options={{ subFormat: "note", structure: "Topic ___1___", wordLimit: 2 }}
          correctAnswer={{ blanks: { "1": { answer: "", acceptedVariants: [], strictWordOrder: true } } }}
          onChange={noop}
        />,
      );
      expect(screen.getByTestId("ntf-incomplete-warning")).toBeInTheDocument();
      expect(screen.getByText("Some blanks need answers")).toBeInTheDocument();
    });

    it("hides incomplete warning when all blanks have answers", () => {
      render(
        <NoteTableFlowchartEditor
          options={{ subFormat: "note", structure: "Topic ___1___", wordLimit: 2 }}
          correctAnswer={{ blanks: { "1": { answer: "climate", acceptedVariants: [], strictWordOrder: true } } }}
          onChange={noop}
        />,
      );
      expect(screen.queryByTestId("ntf-incomplete-warning")).not.toBeInTheDocument();
    });

    it("shows warning when blank has no entry in correctAnswer", () => {
      render(
        <NoteTableFlowchartEditor
          options={{ subFormat: "note", structure: "Topic ___1___ and ___2___", wordLimit: 2 }}
          correctAnswer={{ blanks: { "1": { answer: "climate", acceptedVariants: [], strictWordOrder: true } } }}
          onChange={noop}
        />,
      );
      expect(screen.getByTestId("ntf-incomplete-warning")).toBeInTheDocument();
    });

    it("does not render answer section when no blanks exist", () => {
      render(
        <NoteTableFlowchartEditor
          options={{ subFormat: "note", structure: "No blanks here", wordLimit: 2 }}
          correctAnswer={{ blanks: {} }}
          onChange={noop}
        />,
      );
      expect(screen.queryByText("Correct Answers")).not.toBeInTheDocument();
    });
  });
});
