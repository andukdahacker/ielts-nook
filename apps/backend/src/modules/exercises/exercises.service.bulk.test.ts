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

  describe("bulkArchive", () => {
    it("should archive multiple exercises, skip already-archived", async () => {
      mockDb.exercise.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.bulkArchive(centerId, ["ex-1", "ex-2", "ex-3"]);

      expect(result).toBe(2);
      expect(mockDb.exercise.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["ex-1", "ex-2", "ex-3"] }, status: { not: "ARCHIVED" } },
        data: { status: "ARCHIVED" },
      });
    });
  });

  describe("bulkDuplicate", () => {
    it("should create copies of multiple exercises", async () => {
      const source = {
        ...mockExercise,
        passageSourceType: null,
        passageSourceUrl: null,
        caseSensitive: false,
        partialCredit: false,
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
        timeLimit: null,
        timerPosition: null,
        warningAlerts: null,
        autoSubmitOnExpiry: true,
        gracePeriodSeconds: null,
        enablePause: false,
        bandLevel: null,
        sections: [],
        tagAssignments: [],
      };
      mockDb.authAccount.findUniqueOrThrow.mockResolvedValue({ userId });
      mockDb.exercise.findUnique.mockResolvedValue(source);
      mockDb.exercise.create.mockResolvedValue({ ...mockExercise, id: "ex-copy" });
      mockDb.exercise.findFirst.mockResolvedValue({ ...mockExercise, id: "ex-copy" });

      const result = await service.bulkDuplicate(centerId, ["ex-1", "ex-2"], firebaseUid);

      expect(result).toHaveLength(2);
    });
  });

  describe("bulkTag", () => {
    it("should add tags, ignoring duplicates", async () => {
      mockDb.exerciseTagAssignment.create.mockResolvedValue({});

      const result = await service.bulkTag(centerId, ["ex-1", "ex-2"], ["tag-1"]);

      expect(result).toBe(2);
      expect(mockDb.exerciseTagAssignment.create).toHaveBeenCalledTimes(2);
    });

    it("should count only successfully added tags (ignore P2002)", async () => {
      const uniqueError = Object.assign(new Error("unique violation"), { code: "P2002" });
      mockDb.exerciseTagAssignment.create
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(uniqueError);

      const result = await service.bulkTag(centerId, ["ex-1", "ex-2"], ["tag-1"]);

      expect(result).toBe(1);
    });

    it("should rethrow non-P2002 errors", async () => {
      const fkError = Object.assign(new Error("FK violation"), { code: "P2003" });
      mockDb.exerciseTagAssignment.create.mockRejectedValue(fkError);

      await expect(
        service.bulkTag(centerId, ["ex-1"], ["bad-tag"]),
      ).rejects.toThrow("FK violation");
    });
  });

  describe("bandLevel support", () => {
    it("should include bandLevel in createExercise", async () => {
      mockPrisma.authAccount.findUnique.mockResolvedValue({
        userId,
        provider: "FIREBASE",
        providerUserId: firebaseUid,
      });
      mockDb.exercise.create.mockResolvedValue({
        ...mockExercise,
        bandLevel: "6-7",
        tagAssignments: [],
      });

      await service.createExercise(
        centerId,
        { title: "Test", skill: "READING", bandLevel: "6-7" },
        firebaseUid,
      );

      expect(mockDb.exercise.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bandLevel: "6-7",
          }),
        }),
      );
    });

    it("should include bandLevel in updateExercise", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockExercise);
      mockDb.exercise.update.mockResolvedValue({
        ...mockExercise,
        bandLevel: "7-8",
        tagAssignments: [],
      });

      await service.updateExercise(centerId, "ex-1", { bandLevel: "7-8" });

      expect(mockDb.exercise.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bandLevel: "7-8",
          }),
        }),
      );
    });

    it("should filter by bandLevel in listExercises", async () => {
      mockDb.exercise.findMany.mockResolvedValue([]);

      await service.listExercises(centerId, { bandLevel: "5-6" });

      expect(mockDb.exercise.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            bandLevel: "5-6",
          }),
        }),
      );
    });

    it("should filter by tagIds in listExercises", async () => {
      mockDb.exercise.findMany.mockResolvedValue([]);

      await service.listExercises(centerId, { tagIds: ["t1", "t2"] });

      expect(mockDb.exercise.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tagAssignments: { some: { tagId: { in: ["t1", "t2"] } } },
          }),
        }),
      );
    });

    it("should include tagAssignments in listExercises include", async () => {
      mockDb.exercise.findMany.mockResolvedValue([]);

      await service.listExercises(centerId);

      expect(mockDb.exercise.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            tagAssignments: expect.any(Object),
          }),
        }),
      );
    });
  });
});
