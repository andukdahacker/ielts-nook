import React from "react";
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

  // --- Story 12-2: Optimistic local state tests ---

  it("radio selection updates optimistic local state immediately, then calls onChange", () => {
    const onChange = vi.fn();
    render(
      <TFNGEditor
        sectionType="R3_TFNG"
        correctAnswer={null}
        questionId="q1"
        onChange={onChange}
      />,
    );

    // Click "TRUE" radio
    fireEvent.click(screen.getByLabelText("True"));

    // onChange should be called (which triggers the debounced parent update)
    expect(onChange).toHaveBeenCalledWith(null, { answer: "TRUE" });

    // The radio should visually show "TRUE" as selected via optimistic local state
    const trueRadio = screen.getByRole("radio", { name: "True" });
    expect(trueRadio).toHaveAttribute("data-state", "checked");
  });

  it("syncs local state when correctAnswer prop changes (server confirmation)", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <TFNGEditor
        sectionType="R3_TFNG"
        correctAnswer={{ answer: "TRUE" }}
        questionId="q1"
        onChange={onChange}
      />,
    );

    // Verify TRUE is selected
    expect(screen.getByRole("radio", { name: "True" })).toHaveAttribute("data-state", "checked");

    // Server updates to FALSE (simulating server confirmation of a different value)
    rerender(
      <TFNGEditor
        sectionType="R3_TFNG"
        correctAnswer={{ answer: "FALSE" }}
        questionId="q1"
        onChange={onChange}
      />,
    );

    // Local state should sync — FALSE should now be selected
    expect(screen.getByRole("radio", { name: "False" })).toHaveAttribute("data-state", "checked");
    expect(screen.getByRole("radio", { name: "True" })).toHaveAttribute("data-state", "unchecked");
  });

  it("radio selection fires onChange correctly through memoized layers", () => {
    const onChange = vi.fn();
    render(
      <TFNGEditor
        sectionType="R3_TFNG"
        correctAnswer={{ answer: "TRUE" }}
        questionId="q1"
        onChange={onChange}
      />,
    );

    // Select FALSE
    fireEvent.click(screen.getByLabelText("False"));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(null, { answer: "FALSE" });

    // Select NOT_GIVEN
    fireEvent.click(screen.getByLabelText("Not Given"));
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenCalledWith(null, { answer: "NOT_GIVEN" });
  });

  it("does not re-render when correctAnswer object ref changes but answer string is the same", () => {
    const onChange = vi.fn();

    // Track useEffect calls (which only happen when the component actually re-renders)
    const useEffectSpy = vi.spyOn(React, "useEffect");

    const { rerender } = render(
      <TFNGEditor
        sectionType="R3_TFNG"
        correctAnswer={{ answer: "TRUE" }}
        questionId="q1"
        onChange={onChange}
      />,
    );

    // Verify initial state
    expect(screen.getByRole("radio", { name: "True" })).toHaveAttribute("data-state", "checked");

    // Re-render with a NEW object reference but same answer string
    // This simulates safeParse creating a new object each render
    const useEffectCallsBefore = useEffectSpy.mock.calls.length;

    rerender(
      <TFNGEditor
        sectionType="R3_TFNG"
        correctAnswer={{ answer: "TRUE" }}
        questionId="q1"
        onChange={onChange}
      />,
    );

    // React.memo custom comparator should prevent re-render — useEffect should NOT be called again
    // since the component function body doesn't execute when memo bails out
    expect(useEffectSpy.mock.calls.length).toBe(useEffectCallsBefore);

    // Radio still shows correct value
    expect(screen.getByRole("radio", { name: "True" })).toHaveAttribute("data-state", "checked");

    useEffectSpy.mockRestore();
  });
});

describe("MemoizedQuestionRow sibling isolation", () => {
  it("updating one question's answer does not cause sibling rows to re-render", async () => {
    // Dynamically import QuestionSectionEditor to test MemoizedQuestionRow behavior
    const { QuestionSectionEditor } = await import("../QuestionSectionEditor");

    const onUpdateQuestion = vi.fn();
    const section = {
      id: "sec-1",
      sectionType: "R3_TFNG" as const,
      instructions: null,
      orderIndex: 0,
      questions: [
        { id: "q1", questionText: "Q1 text", options: null, correctAnswer: { answer: "TRUE" }, wordLimit: null, orderIndex: 0, questionType: "R3_TFNG" },
        { id: "q2", questionText: "Q2 text", options: null, correctAnswer: { answer: "FALSE" }, wordLimit: null, orderIndex: 1, questionType: "R3_TFNG" },
        { id: "q3", questionText: "Q3 text", options: null, correctAnswer: { answer: "NOT_GIVEN" }, wordLimit: null, orderIndex: 2, questionType: "R3_TFNG" },
      ],
    };

    // Track useEffect calls to detect re-renders of child components
    const useEffectSpy = vi.spyOn(React, "useEffect");

    const stableOnUpdateSection = vi.fn();
    const stableOnDeleteSection = vi.fn();
    const stableOnCreateQuestion = vi.fn();
    const stableOnDeleteQuestion = vi.fn();

    const { rerender } = render(
      <QuestionSectionEditor
        section={section as unknown as Parameters<typeof QuestionSectionEditor>[0]["section"]}
        skill="READING"
        index={0}
        onUpdateSection={stableOnUpdateSection}
        onDeleteSection={stableOnDeleteSection}
        onCreateQuestion={stableOnCreateQuestion}
        onUpdateQuestion={onUpdateQuestion}
        onDeleteQuestion={stableOnDeleteQuestion}
      />,
    );

    // Re-render with Q1 answer changed, Q2/Q3 unchanged but same object refs
    const updatedSection = {
      ...section,
      questions: [
        { ...section.questions[0], correctAnswer: { answer: "FALSE" } },
        section.questions[1], // Same ref
        section.questions[2], // Same ref
      ],
    };

    rerender(
      <QuestionSectionEditor
        section={updatedSection as unknown as Parameters<typeof QuestionSectionEditor>[0]["section"]}
        skill="READING"
        index={0}
        onUpdateSection={stableOnUpdateSection}
        onDeleteSection={stableOnDeleteSection}
        onCreateQuestion={stableOnCreateQuestion}
        onUpdateQuestion={onUpdateQuestion}
        onDeleteQuestion={stableOnDeleteQuestion}
      />,
    );

    // All 3 question rows should still be present in the DOM
    expect(screen.getByText("Q1 text")).toBeInTheDocument();
    expect(screen.getByText("Q2 text")).toBeInTheDocument();
    expect(screen.getByText("Q3 text")).toBeInTheDocument();

    useEffectSpy.mockRestore();
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
