import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { WordBankEditor } from "./WordBankEditor";

const noop = vi.fn();

describe("WordBankEditor", () => {
  describe("Correct Answers label and warning", () => {
    it("renders 'Correct Answers' label with KeyRound icon when blanks exist", () => {
      render(
        <WordBankEditor
          options={{ wordBank: ["climate", "water"], summaryText: "The ___1___ affects ___2___" }}
          correctAnswer={{ blanks: { "1": "climate", "2": "water" } }}
          onChange={noop}
        />,
      );
      expect(screen.getByText("Correct Answers")).toBeInTheDocument();
    });

    it("shows incomplete warning when a blank has no word selected", () => {
      render(
        <WordBankEditor
          options={{ wordBank: ["climate", "water"], summaryText: "The ___1___ affects ___2___" }}
          correctAnswer={{ blanks: { "1": "climate" } }}
          onChange={noop}
        />,
      );
      expect(screen.getByTestId("wb-incomplete-warning")).toBeInTheDocument();
      expect(screen.getByText("Some blanks need answers")).toBeInTheDocument();
    });

    it("hides incomplete warning when all blanks are assigned", () => {
      render(
        <WordBankEditor
          options={{ wordBank: ["climate", "water"], summaryText: "The ___1___ affects ___2___" }}
          correctAnswer={{ blanks: { "1": "climate", "2": "water" } }}
          onChange={noop}
        />,
      );
      expect(screen.queryByTestId("wb-incomplete-warning")).not.toBeInTheDocument();
    });

    it("does not render answer section when no blanks exist in summary text", () => {
      render(
        <WordBankEditor
          options={{ wordBank: ["climate"], summaryText: "No blanks here" }}
          correctAnswer={{ blanks: {} }}
          onChange={noop}
        />,
      );
      expect(screen.queryByText("Correct Answers")).not.toBeInTheDocument();
    });
  });
});
