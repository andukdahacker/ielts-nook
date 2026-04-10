import { render, screen } from "@testing-library/react";
import { describe, it, vi, expect } from "vitest";
import { QuestionSectionEditor } from "./QuestionSectionEditor";
import { getAnswerCompletionStatus } from "./question-types/answer-status";

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

  describe("getAnswerCompletionStatus", () => {
    it("returns 'not-applicable' for non-R7/R13/L1 types like R1 MCQ", () => {
      expect(getAnswerCompletionStatus("R1_MCQ_SINGLE", null, null)).toBe("not-applicable");
    });

    it("returns 'not-applicable' for R3 TFNG", () => {
      expect(getAnswerCompletionStatus("R3_TFNG", null, null)).toBe("not-applicable");
    });

    // R13 tests
    it("returns 'incomplete' when R13 correctAnswer is null", () => {
      expect(getAnswerCompletionStatus("R13_NOTE_TABLE_FLOWCHART", null, null)).toBe("incomplete");
    });

    it("returns 'incomplete' when R13 blanks are empty", () => {
      expect(getAnswerCompletionStatus("R13_NOTE_TABLE_FLOWCHART", { blanks: {} }, null)).toBe("incomplete");
    });

    it("returns 'complete' when all R13 blanks have answers (structured format)", () => {
      const correctAnswer = {
        blanks: {
          "1": { answer: "climate", acceptedVariants: [], strictWordOrder: true },
          "2": { answer: "water", acceptedVariants: [], strictWordOrder: true },
        },
      };
      expect(getAnswerCompletionStatus("R13_NOTE_TABLE_FLOWCHART", correctAnswer, null)).toBe("complete");
    });

    it("returns 'incomplete' when some R13 blanks have empty answers", () => {
      const correctAnswer = {
        blanks: {
          "1": { answer: "climate", acceptedVariants: [], strictWordOrder: true },
          "2": { answer: "", acceptedVariants: [], strictWordOrder: true },
        },
      };
      expect(getAnswerCompletionStatus("R13_NOTE_TABLE_FLOWCHART", correctAnswer, null)).toBe("incomplete");
    });

    it("returns 'complete' when all R13 blanks have answers (legacy flat string format)", () => {
      const correctAnswer = { blanks: { "1": "climate", "2": "water" } };
      expect(getAnswerCompletionStatus("R13_NOTE_TABLE_FLOWCHART", correctAnswer, null)).toBe("complete");
    });

    // L1 tests — should behave identically to R13
    it("returns 'complete' for L1 with all blanks answered", () => {
      const correctAnswer = {
        blanks: {
          "1": { answer: "Monday", acceptedVariants: [], strictWordOrder: true },
        },
      };
      expect(getAnswerCompletionStatus("L1_FORM_NOTE_TABLE", correctAnswer, null)).toBe("complete");
    });

    it("returns 'incomplete' for L1 with missing answers", () => {
      expect(getAnswerCompletionStatus("L1_FORM_NOTE_TABLE", { blanks: {} }, null)).toBe("incomplete");
    });

    // R7 tests
    it("returns 'not-applicable' for R7 when no summaryText in options", () => {
      expect(getAnswerCompletionStatus("R7_SUMMARY_WORD_BANK", null, null)).toBe("not-applicable");
    });

    it("returns 'not-applicable' for R7 when summaryText has no blanks", () => {
      const options = { summaryText: "No blanks here", wordBank: [] };
      expect(getAnswerCompletionStatus("R7_SUMMARY_WORD_BANK", null, options)).toBe("not-applicable");
    });

    it("returns 'complete' for R7 when all blanks are assigned", () => {
      const options = { summaryText: "The ___1___ affects ___2___", wordBank: ["climate", "water"] };
      const correctAnswer = { blanks: { "1": "climate", "2": "water" } };
      expect(getAnswerCompletionStatus("R7_SUMMARY_WORD_BANK", correctAnswer, options)).toBe("complete");
    });

    it("returns 'incomplete' for R7 when some blanks are unassigned", () => {
      const options = { summaryText: "The ___1___ affects ___2___", wordBank: ["climate", "water"] };
      const correctAnswer = { blanks: { "1": "climate" } };
      expect(getAnswerCompletionStatus("R7_SUMMARY_WORD_BANK", correctAnswer, options)).toBe("incomplete");
    });

    it("returns 'incomplete' for R7 when correctAnswer is null", () => {
      const options = { summaryText: "The ___1___ affects ___2___", wordBank: ["climate"] };
      expect(getAnswerCompletionStatus("R7_SUMMARY_WORD_BANK", null, options)).toBe("incomplete");
    });

    // P1: null blanks should not crash
    it("returns 'incomplete' when R13 blanks is null (corrupted data)", () => {
      expect(getAnswerCompletionStatus("R13_NOTE_TABLE_FLOWCHART", { blanks: null }, null)).toBe("incomplete");
    });

    it("returns 'not-applicable' when R7 blanks is null (corrupted data)", () => {
      const options = { summaryText: "The ___1___", wordBank: ["climate"] };
      expect(getAnswerCompletionStatus("R7_SUMMARY_WORD_BANK", { blanks: null }, options)).toBe("incomplete");
    });

    // P2: structure cross-reference
    it("returns 'incomplete' for R13 when structure has blank not in correctAnswer", () => {
      const correctAnswer = {
        blanks: {
          "1": { answer: "climate", acceptedVariants: [], strictWordOrder: true },
        },
      };
      const options = { subFormat: "note", structure: "Topic ___1___ and ___2___", wordLimit: 2 };
      expect(getAnswerCompletionStatus("R13_NOTE_TABLE_FLOWCHART", correctAnswer, options)).toBe("incomplete");
    });

    it("returns 'complete' for R13 when structure blanks match correctAnswer blanks", () => {
      const correctAnswer = {
        blanks: {
          "1": { answer: "climate", acceptedVariants: [], strictWordOrder: true },
          "2": { answer: "water", acceptedVariants: [], strictWordOrder: true },
        },
      };
      const options = { subFormat: "note", structure: "Topic ___1___ and ___2___", wordLimit: 2 };
      expect(getAnswerCompletionStatus("R13_NOTE_TABLE_FLOWCHART", correctAnswer, options)).toBe("complete");
    });
  });

  describe("answer status badge rendering", () => {
    it("shows green check badge for R13 with all blanks answered", () => {
      const r13Section = {
        ...baseSection,
        sectionType: "R13_NOTE_TABLE_FLOWCHART" as const,
        questions: [{
          ...baseSection.questions[0],
          questionType: "R13_NOTE_TABLE_FLOWCHART",
          correctAnswer: {
            blanks: {
              "1": { answer: "climate", acceptedVariants: [], strictWordOrder: true },
            },
          },
        }],
      };
      render(
        <QuestionSectionEditor
          section={r13Section}
          skill="READING"
          index={0}
          onUpdateSection={noop}
          onDeleteSection={noop}
          onCreateQuestion={noop}
          onUpdateQuestion={noop}
          onDeleteQuestion={noop}
        />,
      );
      expect(screen.getByTestId("answer-complete")).toBeInTheDocument();
      expect(screen.queryByTestId("answer-incomplete")).not.toBeInTheDocument();
    });

    it("shows amber alert badge for R13 with incomplete blanks", () => {
      const r13Section = {
        ...baseSection,
        sectionType: "R13_NOTE_TABLE_FLOWCHART" as const,
        questions: [{
          ...baseSection.questions[0],
          questionType: "R13_NOTE_TABLE_FLOWCHART",
          correctAnswer: {
            blanks: {
              "1": { answer: "", acceptedVariants: [], strictWordOrder: true },
            },
          },
        }],
      };
      render(
        <QuestionSectionEditor
          section={r13Section}
          skill="READING"
          index={0}
          onUpdateSection={noop}
          onDeleteSection={noop}
          onCreateQuestion={noop}
          onUpdateQuestion={noop}
          onDeleteQuestion={noop}
        />,
      );
      expect(screen.getByTestId("answer-incomplete")).toBeInTheDocument();
      expect(screen.queryByTestId("answer-complete")).not.toBeInTheDocument();
    });

    it("shows no badge for non-R7/R13/L1 types like R1 MCQ", () => {
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
      expect(screen.queryByTestId("answer-complete")).not.toBeInTheDocument();
      expect(screen.queryByTestId("answer-incomplete")).not.toBeInTheDocument();
    });

    it("shows badge for L1 type identically to R13", () => {
      const l1Section = {
        ...baseSection,
        sectionType: "L1_FORM_NOTE_TABLE" as const,
        questions: [{
          ...baseSection.questions[0],
          questionType: "L1_FORM_NOTE_TABLE",
          correctAnswer: {
            blanks: {
              "1": { answer: "Monday", acceptedVariants: [], strictWordOrder: true },
            },
          },
        }],
      };
      render(
        <QuestionSectionEditor
          section={l1Section}
          skill="LISTENING"
          index={0}
          onUpdateSection={noop}
          onDeleteSection={noop}
          onCreateQuestion={noop}
          onUpdateQuestion={noop}
          onDeleteQuestion={noop}
        />,
      );
      expect(screen.getByTestId("answer-complete")).toBeInTheDocument();
    });
  });
});
