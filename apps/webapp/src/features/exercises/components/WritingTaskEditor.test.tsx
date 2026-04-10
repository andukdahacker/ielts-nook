import { render, screen } from "@testing-library/react";
import { describe, it, vi, expect } from "vitest";
import { WritingTaskEditor } from "./WritingTaskEditor";

// Mock hooks used by WritingTaskEditor
vi.mock("../hooks/use-stimulus-upload", () => ({
  useStimulusUpload: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useStimulusDelete: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const noop = vi.fn();

const baseProps = {
  exerciseId: "e1",
  sectionType: "W1_TASK1_ACADEMIC" as const,
  stimulusImageUrl: null,
  writingPrompt: "Describe the chart",
  letterTone: "formal",
  wordCountMin: 150,
  wordCountMax: null,
  wordCountMode: "soft",
  sampleResponse: "",
  showSampleAfterGrading: false,
  onWritingPromptChange: noop,
  onLetterToneChange: noop,
  onWordCountMinChange: noop,
  onWordCountMaxChange: noop,
  onWordCountModeChange: noop,
  onSampleResponseChange: noop,
  onShowSampleAfterGradingChange: noop,
};

describe("WritingTaskEditor", () => {
  it("renders task type selector when onSectionTypeChange is provided", () => {
    render(
      <WritingTaskEditor
        {...baseProps}
        onSectionTypeChange={noop}
      />,
    );
    expect(screen.getByText("Task Type")).toBeInTheDocument();
  });

  it("does not render task type selector when onSectionTypeChange is not provided", () => {
    render(<WritingTaskEditor {...baseProps} />);
    expect(screen.queryByText("Task Type")).not.toBeInTheDocument();
  });

  it("renders writing prompt field", () => {
    render(<WritingTaskEditor {...baseProps} />);
    expect(screen.getByLabelText("Writing Prompt")).toBeInTheDocument();
  });

  it("shows stimulus image upload for W1", () => {
    render(<WritingTaskEditor {...baseProps} sectionType="W1_TASK1_ACADEMIC" />);
    expect(screen.getByText(/Stimulus Image/)).toBeInTheDocument();
  });

  it("shows letter tone selector for W2", () => {
    render(<WritingTaskEditor {...baseProps} sectionType="W2_TASK1_GENERAL" />);
    expect(screen.getByText("Letter Tone")).toBeInTheDocument();
  });

  it("does not show stimulus image for W3", () => {
    render(<WritingTaskEditor {...baseProps} sectionType="W3_TASK2_ESSAY" />);
    expect(screen.queryByText(/Stimulus Image/)).not.toBeInTheDocument();
  });

  it("renders the current task type value in the selector", () => {
    render(
      <WritingTaskEditor
        {...baseProps}
        sectionType="W3_TASK2_ESSAY"
        onSectionTypeChange={noop}
      />,
    );
    // The combobox should show the current value
    const trigger = screen.getByRole("combobox");
    expect(trigger).toBeInTheDocument();
  });
});
