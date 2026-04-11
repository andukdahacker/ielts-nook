import { vi, describe, it, expect, beforeEach } from "vitest";
import { SectionsService } from "./sections.service.js";

describe("SectionsService", () => {
  let service: SectionsService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPrisma: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;
  const centerId = "center-123";
  const exerciseId = "ex-1";
  const sectionId = "sec-1";
  const questionId = "q-1";

  const mockDraftExercise = {
    id: exerciseId,
    centerId,
    status: "DRAFT",
  };

  const mockPublishedExercise = {
    ...mockDraftExercise,
    status: "PUBLISHED",
  };

  const mockSection = {
    id: sectionId,
    exerciseId,
    centerId,
    sectionType: "R1_MCQ_SINGLE",
    instructions: null,
    orderIndex: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    questions: [],
  };

  const mockQuestion = {
    id: questionId,
    sectionId,
    centerId,
    questionText: "What is the answer?",
    questionType: "R1_MCQ_SINGLE",
    options: null,
    correctAnswer: null,
    orderIndex: 0,
    wordLimit: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      exercise: {
        findUnique: vi.fn(),
      },
      questionSection: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      question: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      submission: {
        count: vi.fn().mockResolvedValue(0),
      },
    };

    mockPrisma = {
      $extends: vi.fn().mockReturnValue(mockDb),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new SectionsService(mockPrisma as any);
  });

  describe("listSections", () => {
    it("should return sections ordered by orderIndex", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockDraftExercise);
      mockDb.questionSection.findMany.mockResolvedValue([mockSection]);

      const result = await service.listSections(centerId, exerciseId);

      expect(result).toEqual([mockSection]);
      expect(mockDb.questionSection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { exerciseId },
          orderBy: { orderIndex: "asc" },
        }),
      );
    });

    it("should throw 404 if exercise not found", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(null);

      await expect(
        service.listSections(centerId, "nonexistent"),
      ).rejects.toThrow("Exercise not found");
    });
  });

  describe("createSection", () => {
    it("should create section on draft exercise", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockDraftExercise);
      mockDb.questionSection.create.mockResolvedValue(mockSection);

      const result = await service.createSection(centerId, exerciseId, {
        sectionType: "R1_MCQ_SINGLE",
        orderIndex: 0,
      });

      expect(result).toEqual(mockSection);
    });

    it("should throw if exercise is PUBLISHED with submissions", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockPublishedExercise);
      mockDb.submission.count.mockResolvedValue(3);

      await expect(
        service.createSection(centerId, exerciseId, {
          sectionType: "R1_MCQ_SINGLE",
          orderIndex: 0,
        }),
      ).rejects.toThrow("editable exercises");
    });

    it("should throw 404 if exercise not found", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(null);

      await expect(
        service.createSection(centerId, "nonexistent", {
          sectionType: "R1_MCQ_SINGLE",
          orderIndex: 0,
        }),
      ).rejects.toThrow("Exercise not found");
    });
  });

  describe("updateSection", () => {
    it("should update section on draft exercise", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockDraftExercise);
      mockDb.questionSection.findUnique.mockResolvedValue(mockSection);
      const updated = { ...mockSection, instructions: "New instructions" };
      mockDb.questionSection.update.mockResolvedValue(updated);

      const result = await service.updateSection(
        centerId,
        exerciseId,
        sectionId,
        { instructions: "New instructions" },
      );

      expect(result.instructions).toBe("New instructions");
    });

    it("should throw if exercise is PUBLISHED with submissions", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockPublishedExercise);
      mockDb.submission.count.mockResolvedValue(3);

      await expect(
        service.updateSection(centerId, exerciseId, sectionId, {
          instructions: "New",
        }),
      ).rejects.toThrow("editable exercises");
    });

    it("should throw 404 if section not found", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockDraftExercise);
      mockDb.questionSection.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSection(centerId, exerciseId, "bad-id", {
          instructions: "New",
        }),
      ).rejects.toThrow("Section not found");
    });

    it("should throw 404 if section belongs to different exercise", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockDraftExercise);
      mockDb.questionSection.findUnique.mockResolvedValue({
        ...mockSection,
        exerciseId: "other-exercise",
      });

      await expect(
        service.updateSection(centerId, exerciseId, sectionId, {
          instructions: "New",
        }),
      ).rejects.toThrow("Section not found");
    });
  });

  describe("deleteSection", () => {
    it("should delete section on draft exercise", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockDraftExercise);
      mockDb.questionSection.findUnique.mockResolvedValue(mockSection);
      mockDb.questionSection.delete.mockResolvedValue(mockSection);

      await service.deleteSection(centerId, exerciseId, sectionId);

      expect(mockDb.questionSection.delete).toHaveBeenCalledWith({
        where: { id: sectionId },
      });
    });

    it("should throw if exercise is PUBLISHED with submissions", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockPublishedExercise);
      mockDb.submission.count.mockResolvedValue(3);

      await expect(
        service.deleteSection(centerId, exerciseId, sectionId),
      ).rejects.toThrow("editable exercises");
    });

    it("should throw 404 if section not found", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockDraftExercise);
      mockDb.questionSection.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteSection(centerId, exerciseId, "bad-id"),
      ).rejects.toThrow("Section not found");
    });
  });

  describe("createQuestion", () => {
    it("should create question on draft exercise", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockDraftExercise);
      mockDb.questionSection.findUnique.mockResolvedValue(mockSection);
      mockDb.question.create.mockResolvedValue(mockQuestion);

      const result = await service.createQuestion(
        centerId,
        exerciseId,
        sectionId,
        {
          questionText: "What is the answer?",
          questionType: "R1_MCQ_SINGLE",
          orderIndex: 0,
        },
      );

      expect(result).toEqual(mockQuestion);
    });

    it("should throw if exercise is PUBLISHED with submissions", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockPublishedExercise);
      mockDb.submission.count.mockResolvedValue(3);

      await expect(
        service.createQuestion(centerId, exerciseId, sectionId, {
          questionText: "Q",
          questionType: "R1_MCQ_SINGLE",
          orderIndex: 0,
        }),
      ).rejects.toThrow("editable exercises");
    });

    it("should throw 404 if section not found", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockDraftExercise);
      mockDb.questionSection.findUnique.mockResolvedValue(null);

      await expect(
        service.createQuestion(centerId, exerciseId, "bad-id", {
          questionText: "Q",
          questionType: "R1_MCQ_SINGLE",
          orderIndex: 0,
        }),
      ).rejects.toThrow("Section not found");
    });
  });

  describe("updateQuestion", () => {
    it("should update question on draft exercise", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockDraftExercise);
      mockDb.question.findUnique.mockResolvedValue(mockQuestion);
      mockDb.questionSection.findUnique.mockResolvedValue(mockSection);
      const updated = { ...mockQuestion, questionText: "Updated?" };
      mockDb.question.update.mockResolvedValue(updated);

      const result = await service.updateQuestion(
        centerId,
        exerciseId,
        sectionId,
        questionId,
        { questionText: "Updated?" },
      );

      expect(result.questionText).toBe("Updated?");
    });

    it("should throw if exercise is PUBLISHED with submissions", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockPublishedExercise);
      mockDb.submission.count.mockResolvedValue(3);

      await expect(
        service.updateQuestion(centerId, exerciseId, sectionId, questionId, {
          questionText: "Updated?",
        }),
      ).rejects.toThrow("editable exercises");
    });

    it("should throw 404 if question not found", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockDraftExercise);
      mockDb.question.findUnique.mockResolvedValue(null);

      await expect(
        service.updateQuestion(centerId, exerciseId, sectionId, "bad-id", {
          questionText: "Updated?",
        }),
      ).rejects.toThrow("Question not found");
    });

    it("should throw 404 if question belongs to different section", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockDraftExercise);
      mockDb.question.findUnique.mockResolvedValue({
        ...mockQuestion,
        sectionId: "other-section",
      });

      await expect(
        service.updateQuestion(centerId, exerciseId, sectionId, questionId, {
          questionText: "Updated?",
        }),
      ).rejects.toThrow("Question not found");
    });
  });

  describe("deleteQuestion", () => {
    it("should delete question on draft exercise", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockDraftExercise);
      mockDb.question.findUnique.mockResolvedValue(mockQuestion);
      mockDb.questionSection.findUnique.mockResolvedValue(mockSection);
      mockDb.question.delete.mockResolvedValue(mockQuestion);

      await service.deleteQuestion(
        centerId,
        exerciseId,
        sectionId,
        questionId,
      );

      expect(mockDb.question.delete).toHaveBeenCalledWith({
        where: { id: questionId },
      });
    });

    it("should throw if exercise is PUBLISHED with submissions", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockPublishedExercise);
      mockDb.submission.count.mockResolvedValue(3);

      await expect(
        service.deleteQuestion(centerId, exerciseId, sectionId, questionId),
      ).rejects.toThrow("editable exercises");
    });

    it("should throw 404 if question not found", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockDraftExercise);
      mockDb.question.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteQuestion(centerId, exerciseId, sectionId, "bad-id"),
      ).rejects.toThrow("Question not found");
    });
  });

  // --- Timer & Test Conditions (Story 3.10) ---

  describe("createSection — sectionTimeLimit", () => {
    it("should pass sectionTimeLimit through to Prisma create", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockDraftExercise);
      mockDb.questionSection.create.mockResolvedValue(mockSection);

      await service.createSection(centerId, exerciseId, {
        sectionType: "R1_MCQ_SINGLE",
        orderIndex: 0,
        sectionTimeLimit: 1200,
      });

      expect(mockDb.questionSection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sectionTimeLimit: 1200,
          }),
        }),
      );
    });

    it("should not include sectionTimeLimit when not provided", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockDraftExercise);
      mockDb.questionSection.create.mockResolvedValue(mockSection);

      await service.createSection(centerId, exerciseId, {
        sectionType: "R1_MCQ_SINGLE",
        orderIndex: 0,
      });

      const callArgs = mockDb.questionSection.create.mock.calls[0][0];
      expect(callArgs.data).not.toHaveProperty("sectionTimeLimit");
    });
  });

  describe("updateSection — sectionTimeLimit", () => {
    it("should update sectionTimeLimit", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockDraftExercise);
      mockDb.questionSection.findUnique.mockResolvedValue(mockSection);
      mockDb.questionSection.update.mockResolvedValue(mockSection);

      await service.updateSection(centerId, exerciseId, sectionId, {
        sectionTimeLimit: 900,
      });

      expect(mockDb.questionSection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sectionTimeLimit: 900,
          }),
        }),
      );
    });

    it("should clear sectionTimeLimit when set to null", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockDraftExercise);
      mockDb.questionSection.findUnique.mockResolvedValue(mockSection);
      mockDb.questionSection.update.mockResolvedValue(mockSection);

      await service.updateSection(centerId, exerciseId, sectionId, {
        sectionTimeLimit: null,
      });

      expect(mockDb.questionSection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sectionTimeLimit: null,
          }),
        }),
      );
    });
  });
});
