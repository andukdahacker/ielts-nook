import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, vi, expect } from "vitest";
import { TFNGEditor } from "./TFNGEditor";
import { TFNGPreview } from "./TFNGPreview";

// Mock useDiagramUpload for consistent module resolution
vi.mock("../../hooks/use-diagram-upload", () => ({
  useDiagramUpload: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

// --- Task 9.2: TFNGEditor ---
describe("TFNGEditor", () => {
  it("renders TFNG options", () => {
    const onChange = vi.fn();
    render(
      <TFNGEditor
        sectionType="R3_TFNG"
        correctAnswer={{ answer: "TRUE" }}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("True")).toBeInTheDocument();
    expect(screen.getByText("False")).toBeInTheDocument();
    expect(screen.getByText("Not Given")).toBeInTheDocument();
  });

  it("renders YNNG options for R4", () => {
    const onChange = vi.fn();
    render(
      <TFNGEditor
        sectionType="R4_YNNG"
        correctAnswer={{ answer: "YES" }}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
    expect(screen.getByText("Not Given")).toBeInTheDocument();
  });

  it("calls onChange when selecting an answer", () => {
    const onChange = vi.fn();
    render(
      <TFNGEditor
        sectionType="R3_TFNG"
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    // Click on the "False" radio
    fireEvent.click(screen.getByLabelText("False"));
    expect(onChange).toHaveBeenCalledWith(null, { answer: "FALSE" });
  });

  it("handles null correctAnswer gracefully", () => {
    const onChange = vi.fn();
    render(
      <TFNGEditor
        sectionType="R3_TFNG"
        correctAnswer={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("True")).toBeInTheDocument();
  });
});

describe("TFNGPreview", () => {
  it("renders True/False/Not Given for R3_TFNG", () => {
    render(
      <TFNGPreview
        sectionType="R3_TFNG"
        questionText="The sky is blue."
        questionIndex={0}
      />,
    );
    expect(screen.getByText("The sky is blue.")).toBeInTheDocument();
    expect(screen.getByText("True")).toBeInTheDocument();
    expect(screen.getByText("False")).toBeInTheDocument();
    expect(screen.getByText("Not Given")).toBeInTheDocument();
  });

  it("renders Yes/No/Not Given for R4_YNNG", () => {
    render(
      <TFNGPreview
        sectionType="R4_YNNG"
        questionText="The author agrees."
        questionIndex={0}
      />,
    );
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
    expect(screen.getByText("Not Given")).toBeInTheDocument();
  });
});
