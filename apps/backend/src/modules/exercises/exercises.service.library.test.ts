import { vi, describe, it, expect, beforeEach } from "vitest";
import { ExercisesService } from "./exercises.service.js";

describe("ExercisesService", () => {
  let service: ExercisesService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPrisma: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockStorage: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockFile: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockBucket: any;
  const centerId = "center-123";
  const firebaseUid = "firebase-uid-456";
  const userId = "user-456";
  const bucketName = "test-bucket";

  const mockExercise = {
    id: "ex-1",
    centerId,
    title: "Reading Test 1",
    instructions: null,
    skill: "READING",
    status: "DRAFT",
    passageContent: null,
    passageFormat: null,
    createdById: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: { id: userId, name: "Teacher" },
    sections: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockFile = {
      save: vi.fn().mockResolvedValue(undefined),
      makePublic: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    mockBucket = {
      name: bucketName,
      file: vi.fn().mockReturnValue(mockFile),
    };

    mockStorage = {
      bucket: vi.fn().mockReturnValue(mockBucket),
    };

    mockDb = {
      exercise: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
      },
      questionSection: {
        create: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      question: {
        create: vi.fn(),
      },
      exerciseTagAssignment: {
        create: vi.fn(),
        createMany: vi.fn(),
      },
      authAccount: {
        findUniqueOrThrow: vi.fn(),
      },
      $transaction: vi.fn((fn: (tx: typeof mockDb) => Promise<unknown>) => fn(mockDb)),
    };

    mockPrisma = {
      $extends: vi.fn().mockReturnValue(mockDb),
      authAccount: {
        findUnique: vi.fn(),
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new ExercisesService(mockPrisma as any, mockStorage, bucketName);
  });

  // --- Story 3.14: Exercise Library Management ---

  describe("listExercises — questionType filter", () => {
    it("should filter by questionType", async () => {
      mockDb.exercise.findMany.mockResolvedValue([]);

      await service.listExercises(centerId, { questionType: "R1_MCQ_SINGLE" });

      expect(mockDb.exercise.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sections: { some: { sectionType: "R1_MCQ_SINGLE" } },
          }),
        }),
      );
    });
  });

  describe("listExercises — excludeArchived filter", () => {
    it("should exclude archived exercises when excludeArchived=true", async () => {
      mockDb.exercise.findMany.mockResolvedValue([]);

      await service.listExercises(centerId, { excludeArchived: true });

      expect(mockDb.exercise.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { not: "ARCHIVED" },
          }),
        }),
      );
    });

    it("should let explicit status filter take precedence over excludeArchived", async () => {
      mockDb.exercise.findMany.mockResolvedValue([]);

      await service.listExercises(centerId, { excludeArchived: true, status: "ARCHIVED" });

      expect(mockDb.exercise.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "ARCHIVED",
          }),
        }),
      );
    });
  });

  describe("duplicateExercise", () => {
    const sourceExercise = {
      ...mockExercise,
      status: "PUBLISHED",
      instructions: "Read carefully",
      passageContent: "A long passage",
      passageFormat: "plain",
      passageSourceType: null,
      passageSourceUrl: null,
      caseSensitive: false,
      partialCredit: true,
      audioUrl: null,
      audioDuration: null,
      playbackMode: null,
      audioSections: null,
      showTranscriptAfterSubmit: false,
      stimulusImageUrl: null,
      writingPrompt: null,
      letterTone: null,
      wordCountMin: null,
      wordCountMax: null,
      wordCountMode: null,
      sampleResponse: null,
      showSampleAfterGrading: false,
      speakingPrepTime: null,
      speakingTime: null,
      maxRecordingDuration: null,
      enableTranscription: false,
      timeLimit: 3600,
      timerPosition: "top-bar",
      warningAlerts: [300],
      autoSubmitOnExpiry: true,
      gracePeriodSeconds: 60,
      enablePause: false,
      bandLevel: "6-7",
      sections: [
        {
          id: "sec-1",
          sectionType: "R1_MCQ_SINGLE",
          instructions: "Choose one",
          orderIndex: 0,
          audioSectionIndex: null,
          sectionTimeLimit: null,
          questions: [
            {
              id: "q-1",
              questionText: "What is?",
              questionType: "R1_MCQ_SINGLE",
              options: { items: [{ label: "A", text: "Option A" }] },
              correctAnswer: { answer: "A" },
              orderIndex: 0,
              wordLimit: null,
            },
          ],
        },
      ],
      tagAssignments: [{ tagId: "tag-1" }],
    };

    beforeEach(() => {
      mockDb.authAccount.findUniqueOrThrow.mockResolvedValue({ userId });
    });

    it("should create a copy in DRAFT with 'Copy of' title", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(sourceExercise);
      mockDb.exercise.create.mockResolvedValue({ ...mockExercise, id: "ex-copy" });
      mockDb.questionSection.create.mockResolvedValue({ id: "sec-copy" });
      mockDb.question.create.mockResolvedValue({});
      mockDb.exerciseTagAssignment.createMany.mockResolvedValue({ count: 1 });
      mockDb.exercise.findFirst.mockResolvedValue({
        ...mockExercise,
        id: "ex-copy",
        title: `Copy of ${sourceExercise.title}`,
        status: "DRAFT",
      });

      const result = await service.duplicateExercise(centerId, "ex-1", firebaseUid);

      expect(result.title).toBe(`Copy of ${sourceExercise.title}`);
      expect(result.status).toBe("DRAFT");
      expect(mockDb.exercise.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: `Copy of ${sourceExercise.title}`,
            status: "DRAFT",
            timeLimit: 3600,
            bandLevel: "6-7",
            createdById: userId,
          }),
        }),
      );
    });

    it("should copy sections and questions", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(sourceExercise);
      mockDb.exercise.create.mockResolvedValue({ ...mockExercise, id: "ex-copy" });
      mockDb.questionSection.create.mockResolvedValue({ id: "sec-copy" });
      mockDb.question.create.mockResolvedValue({});
      mockDb.exerciseTagAssignment.createMany.mockResolvedValue({ count: 1 });
      mockDb.exercise.findFirst.mockResolvedValue({ ...mockExercise, id: "ex-copy" });

      await service.duplicateExercise(centerId, "ex-1", firebaseUid);

      expect(mockDb.questionSection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            exerciseId: "ex-copy",
            sectionType: "R1_MCQ_SINGLE",
          }),
        }),
      );
      expect(mockDb.question.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sectionId: "sec-copy",
            questionText: "What is?",
          }),
        }),
      );
    });

    it("should copy tag assignments", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(sourceExercise);
      mockDb.exercise.create.mockResolvedValue({ ...mockExercise, id: "ex-copy" });
      mockDb.questionSection.create.mockResolvedValue({ id: "sec-copy" });
      mockDb.question.create.mockResolvedValue({});
      mockDb.exerciseTagAssignment.createMany.mockResolvedValue({ count: 1 });
      mockDb.exercise.findFirst.mockResolvedValue({ ...mockExercise, id: "ex-copy" });

      await service.duplicateExercise(centerId, "ex-1", firebaseUid);

      expect(mockDb.exerciseTagAssignment.createMany).toHaveBeenCalledWith({
        data: [{ exerciseId: "ex-copy", tagId: "tag-1", centerId }],
      });
    });

    it("should throw 404 if source exercise not found", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(null);

      await expect(
        service.duplicateExercise(centerId, "nonexistent", firebaseUid),
      ).rejects.toThrow("Exercise not found");
    });
  });

  describe("restoreExercise", () => {
    it("should transition ARCHIVED → DRAFT", async () => {
      mockDb.exercise.findUnique.mockResolvedValue({
        ...mockExercise,
        status: "ARCHIVED",
      });
      mockDb.exercise.update.mockResolvedValue({
        ...mockExercise,
        status: "DRAFT",
      });

      const result = await service.restoreExercise(centerId, "ex-1");

      expect(result.status).toBe("DRAFT");
      expect(mockDb.exercise.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: "DRAFT" },
        }),
      );
    });

    it("should reject non-ARCHIVED exercises", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockExercise); // status: DRAFT

      await expect(
        service.restoreExercise(centerId, "ex-1"),
      ).rejects.toThrow("Only archived exercises can be restored");
    });

    it("should reject PUBLISHED exercises", async () => {
      mockDb.exercise.findUnique.mockResolvedValue({
        ...mockExercise,
        status: "PUBLISHED",
      });

      await expect(
        service.restoreExercise(centerId, "ex-1"),
      ).rejects.toThrow("Only archived exercises can be restored");
    });

    it("should throw 404 if exercise not found", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(null);

      await expect(
        service.restoreExercise(centerId, "nonexistent"),
      ).rejects.toThrow("Exercise not found");
    });
  });
});
