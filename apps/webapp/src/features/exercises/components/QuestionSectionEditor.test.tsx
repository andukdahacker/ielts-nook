import { render, screen } from "@testing-library/react";
import { describe, it, vi, expect } from "vitest";
import { QuestionSectionEditor } from "./QuestionSectionEditor";

// Mock QuestionEditorFactory to avoid pulling in heavy dependencies
vi.mock("./question-types/QuestionEditorFactory", () => ({
  QuestionEditorFactory: () => <div data-testid="question-editor" />,
}));

const baseSection = {
  id: "s1",
  centerId: "c1",
  exerciseId: "e1",
  sectionType: "R1_MCQ_SINGLE" as const,
  instructions: "Choose the correct answer",
  orderIndex: 0,
  audioSectionIndex: null,
  sectionTimeLimit: null,
  questions: [
    {
      id: "q1",
      sectionId: "s1",
      centerId: "c1",
      questionText: "What is the answer?",
      questionType: "R1_MCQ_SINGLE",
      options: null,
      correctAnswer: null,
      orderIndex: 0,
      wordLimit: null,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
  ],
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

const noop = vi.fn();

describe("QuestionSectionEditor", () => {
  describe("non-WRITING skill", () => {
    it("renders section header, question type selector, and section instructions", () => {
      render(
        <QuestionSectionEditor
          section={baseSection}
          skill="READING"
          index={0}
          onUpdateSection={noop}
          onDeleteSection={noop}
          onCreateQuestion={noop}
          onUpdateQuestion={noop}
          onDeleteQuestion={noop}
        />,
      );
      expect(screen.getByText("Section 1")).toBeInTheDocument();
      expect(screen.getByText("Question Type")).toBeInTheDocument();
      expect(screen.getByText("Section Instructions")).toBeInTheDocument();
    });

    it("renders questionText input when question is expanded", async () => {
      const { user } = await import("@testing-library/user-event").then((m) => ({
        user: m.default.setup(),
      }));
      render(
        <QuestionSectionEditor
          section={baseSection}
          skill="READING"
          index={0}
          onUpdateSection={noop}
          onDeleteSection={noop}
          onCreateQuestion={noop}
          onUpdateQuestion={noop}
          onDeleteQuestion={noop}
        />,
      );
      // Click to expand question
      const expandButton = screen.getByText("Q1").closest('[role="button"]')!;
      await user.click(expandButton);
      // After expand, questionText label should appear
      expect(screen.getByText("Question Text")).toBeInTheDocument();
    });
  });

  describe("WRITING skill", () => {
    const writingSection = {
      ...baseSection,
      sectionType: "W1_TASK1_ACADEMIC" as const,
      questions: [
        {
          ...baseSection.questions[0],
          questionType: "W1_TASK1_ACADEMIC",
        },
      ],
    };

    it("hides section header for WRITING", () => {
      render(
        <QuestionSectionEditor
          section={writingSection}
          skill="WRITING"
          index={0}
          onUpdateSection={noop}
          onDeleteSection={noop}
          onCreateQuestion={noop}
          onUpdateQuestion={noop}
          onDeleteQuestion={noop}
        />,
      );
      expect(screen.queryByText("Section 1")).not.toBeInTheDocument();
    });

    it("hides question type selector for WRITING", () => {
      render(
        <QuestionSectionEditor
          section={writingSection}
          skill="WRITING"
          index={0}
          onUpdateSection={noop}
          onDeleteSection={noop}
          onCreateQuestion={noop}
          onUpdateQuestion={noop}
          onDeleteQuestion={noop}
        />,
      );
      expect(screen.queryByText("Question Type")).not.toBeInTheDocument();
    });

    it("hides section instructions for WRITING", () => {
      render(
        <QuestionSectionEditor
          section={writingSection}
          skill="WRITING"
          index={0}
          onUpdateSection={noop}
          onDeleteSection={noop}
          onCreateQuestion={noop}
          onUpdateQuestion={noop}
          onDeleteQuestion={noop}
        />,
      );
      expect(screen.queryByText("Section Instructions")).not.toBeInTheDocument();
    });

    it("hides add question input for WRITING", () => {
      render(
        <QuestionSectionEditor
          section={writingSection}
          skill="WRITING"
          index={0}
          onUpdateSection={noop}
          onDeleteSection={noop}
          onCreateQuestion={noop}
          onUpdateQuestion={noop}
          onDeleteQuestion={noop}
        />,
      );
      expect(screen.queryByPlaceholderText("Type a question...")).not.toBeInTheDocument();
    });

    it("hides questionText input when expanded for WRITING", async () => {
      const { user } = await import("@testing-library/user-event").then((m) => ({
        user: m.default.setup(),
      }));
      render(
        <QuestionSectionEditor
          section={writingSection}
          skill="WRITING"
          index={0}
          onUpdateSection={noop}
          onDeleteSection={noop}
          onCreateQuestion={noop}
          onUpdateQuestion={noop}
          onDeleteQuestion={noop}
        />,
      );
      // Expand the question row
      const expandButton = screen.getByText("Q1").closest('[role="button"]')!;
      await user.click(expandButton);
      // questionText label should NOT appear for Writing
      expect(screen.queryByText("Question Text")).not.toBeInTheDocument();
    });
  });
});
