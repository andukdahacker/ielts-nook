import { vi, describe, it, expect, beforeEach } from "vitest";
import { Prisma } from "@workspace/db";
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

  describe("createExercise — speaking fields", () => {
    it("should pass speaking fields through to Prisma create", async () => {
      mockPrisma.authAccount.findUnique.mockResolvedValue({
        userId,
        provider: "FIREBASE",
        providerUserId: firebaseUid,
      });
      mockDb.exercise.create.mockResolvedValue(mockExercise);

      await service.createExercise(centerId, {
        title: "Speaking Test",
        skill: "SPEAKING",
        speakingPrepTime: 60,
        speakingTime: 120,
        maxRecordingDuration: 60,
        enableTranscription: true,
      }, firebaseUid);

      expect(mockDb.exercise.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            speakingPrepTime: 60,
            speakingTime: 120,
            maxRecordingDuration: 60,
            enableTranscription: true,
          }),
        }),
      );
    });

    it("should default speaking fields to null/false when not provided", async () => {
      mockPrisma.authAccount.findUnique.mockResolvedValue({
        userId,
        provider: "FIREBASE",
        providerUserId: firebaseUid,
      });
      mockDb.exercise.create.mockResolvedValue(mockExercise);

      await service.createExercise(centerId, {
        title: "Speaking Test",
        skill: "SPEAKING",
      }, firebaseUid);

      expect(mockDb.exercise.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            speakingPrepTime: null,
            speakingTime: null,
            maxRecordingDuration: null,
            enableTranscription: false,
          }),
        }),
      );
    });
  });

  describe("updateExercise — speaking fields", () => {
    it("should update speaking fields via conditional spread", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockExercise);
      mockDb.exercise.update.mockResolvedValue({
        ...mockExercise,
        speakingPrepTime: 90,
        speakingTime: 150,
      });

      const result = await service.updateExercise(centerId, "ex-1", {
        speakingPrepTime: 90,
        speakingTime: 150,
      });

      expect(mockDb.exercise.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            speakingPrepTime: 90,
            speakingTime: 150,
          }),
        }),
      );
      expect(result.speakingPrepTime).toBe(90);
    });

    it("should only include provided speaking fields in update", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockExercise);
      mockDb.exercise.update.mockResolvedValue({
        ...mockExercise,
        enableTranscription: true,
      });

      await service.updateExercise(centerId, "ex-1", {
        enableTranscription: true,
      });

      const updateCall = mockDb.exercise.update.mock.calls[0][0];
      expect(updateCall.data.enableTranscription).toBe(true);
      // Other speaking fields should not be present since they weren't in input
      expect("speakingPrepTime" in updateCall.data).toBe(false);
      expect("speakingTime" in updateCall.data).toBe(false);
      expect("maxRecordingDuration" in updateCall.data).toBe(false);
    });
  });

  describe("autosaveExercise — speaking fields", () => {
    it("should autosave speaking fields through updateDraftExercise", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockExercise);
      mockDb.exercise.update.mockResolvedValue({
        ...mockExercise,
        speakingPrepTime: 60,
        speakingTime: 120,
        maxRecordingDuration: 90,
        enableTranscription: true,
      });

      const result = await service.autosaveExercise(centerId, "ex-1", {
        speakingPrepTime: 60,
        speakingTime: 120,
        maxRecordingDuration: 90,
        enableTranscription: true,
      });

      expect(mockDb.exercise.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            speakingPrepTime: 60,
            speakingTime: 120,
            maxRecordingDuration: 90,
            enableTranscription: true,
          }),
        }),
      );
      expect(result.speakingPrepTime).toBe(60);
      expect(result.enableTranscription).toBe(true);
    });
  });

  // --- Timer & Test Conditions (Story 3.10) ---

  describe("createExercise — timer fields", () => {
    it("should pass timer fields through to Prisma create", async () => {
      mockPrisma.authAccount.findUnique.mockResolvedValue({
        userId,
      });
      mockDb.exercise.create.mockResolvedValue(mockExercise);

      await service.createExercise(
        centerId,
        {
          title: "Timed Reading",
          skill: "READING",
          timeLimit: 3600,
          timerPosition: "top-bar",
          warningAlerts: [600, 300],
          autoSubmitOnExpiry: true,
          gracePeriodSeconds: 60,
          enablePause: false,
        },
        firebaseUid,
      );

      expect(mockDb.exercise.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            timeLimit: 3600,
            timerPosition: "top-bar",
            warningAlerts: [600, 300],
            autoSubmitOnExpiry: true,
            gracePeriodSeconds: 60,
            enablePause: false,
          }),
        }),
      );
    });

    it("should default timer fields when not provided", async () => {
      mockPrisma.authAccount.findUnique.mockResolvedValue({
        userId,
      });
      mockDb.exercise.create.mockResolvedValue(mockExercise);

      await service.createExercise(
        centerId,
        {
          title: "Untimed Reading",
          skill: "READING",
        },
        firebaseUid,
      );

      expect(mockDb.exercise.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            timeLimit: null,
            timerPosition: null,
            autoSubmitOnExpiry: true,
            gracePeriodSeconds: null,
            enablePause: false,
          }),
        }),
      );
      // warningAlerts is a Json field — must default to Prisma.DbNull, not null
      const callArgs = mockDb.exercise.create.mock.calls[0][0];
      expect(callArgs.data.warningAlerts).toBe(Prisma.DbNull);
    });
  });

  describe("updateExercise — timer fields", () => {
    it("should update timer fields with conditional spread", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockExercise);
      mockDb.exercise.update.mockResolvedValue(mockExercise);

      await service.updateExercise(centerId, "ex-1", {
        timeLimit: 1800,
        timerPosition: "floating",
        warningAlerts: [300],
        autoSubmitOnExpiry: false,
        gracePeriodSeconds: null,
        enablePause: true,
      });

      expect(mockDb.exercise.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            timeLimit: 1800,
            timerPosition: "floating",
            warningAlerts: [300],
            autoSubmitOnExpiry: false,
            gracePeriodSeconds: null,
            enablePause: true,
          }),
        }),
      );
    });

    it("should use Prisma.DbNull when warningAlerts is null", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockExercise);
      mockDb.exercise.update.mockResolvedValue(mockExercise);

      await service.updateExercise(centerId, "ex-1", {
        warningAlerts: null,
      });

      const callArgs = mockDb.exercise.update.mock.calls[0][0];
      expect(callArgs.data.warningAlerts).toBe(Prisma.DbNull);
    });

    it("should not include timer fields when not in input", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockExercise);
      mockDb.exercise.update.mockResolvedValue(mockExercise);

      await service.updateExercise(centerId, "ex-1", {
        title: "Updated Title",
      });

      const callArgs = mockDb.exercise.update.mock.calls[0][0];
      expect(callArgs.data).not.toHaveProperty("timeLimit");
      expect(callArgs.data).not.toHaveProperty("timerPosition");
      expect(callArgs.data).not.toHaveProperty("warningAlerts");
    });
  });

  describe("autosaveExercise — timer fields", () => {
    it("should autosave timer fields", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockExercise);
      mockDb.exercise.update.mockResolvedValue(mockExercise);

      await service.autosaveExercise(centerId, "ex-1", {
        timeLimit: 3600,
        timerPosition: "top-bar",
        warningAlerts: [600, 300],
        autoSubmitOnExpiry: true,
        gracePeriodSeconds: 60,
        enablePause: false,
      });

      expect(mockDb.exercise.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            timeLimit: 3600,
            timerPosition: "top-bar",
            autoSubmitOnExpiry: true,
            gracePeriodSeconds: 60,
            enablePause: false,
          }),
        }),
      );
    });
  });
});
