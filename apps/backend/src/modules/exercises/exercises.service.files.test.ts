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

  describe("uploadAudio", () => {
    const fileBuffer = Buffer.from("fake-audio-data");

    it("should upload audio and return URL", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockExercise);
      mockDb.exercise.update.mockResolvedValue({
        ...mockExercise,
        audioUrl: `https://storage.googleapis.com/${bucketName}/exercises/${centerId}/ex-1/audio/12345.mp3`,
      });

      const result = await service.uploadAudio(centerId, "ex-1", fileBuffer, "audio/mpeg");

      expect(result.audioUrl).toContain(`https://storage.googleapis.com/${bucketName}/`);
      expect(result.audioUrl).toContain("/audio/");
      expect(result.audioUrl).toContain(".mp3");
      expect(mockFile.save).toHaveBeenCalledWith(
        fileBuffer,
        expect.objectContaining({
          metadata: expect.objectContaining({
            contentType: "audio/mpeg",
          }),
        }),
      );
      expect(mockFile.makePublic).toHaveBeenCalled();
      expect(mockDb.exercise.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ex-1" },
          data: expect.objectContaining({
            audioUrl: expect.stringContaining(".mp3"),
          }),
        }),
      );
    });

    it("should map audio/wav to .wav extension", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockExercise);
      mockDb.exercise.update.mockResolvedValue(mockExercise);

      await service.uploadAudio(centerId, "ex-1", fileBuffer, "audio/wav");

      expect(mockBucket.file).toHaveBeenCalledWith(
        expect.stringContaining(".wav"),
      );
    });

    it("should map audio/mp4 to .m4a extension", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockExercise);
      mockDb.exercise.update.mockResolvedValue(mockExercise);

      await service.uploadAudio(centerId, "ex-1", fileBuffer, "audio/mp4");

      expect(mockBucket.file).toHaveBeenCalledWith(
        expect.stringContaining(".m4a"),
      );
    });

    it("should map audio/x-m4a to .m4a extension", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockExercise);
      mockDb.exercise.update.mockResolvedValue(mockExercise);

      await service.uploadAudio(centerId, "ex-1", fileBuffer, "audio/x-m4a");

      expect(mockBucket.file).toHaveBeenCalledWith(
        expect.stringContaining(".m4a"),
      );
    });

    it("should include centerId and exerciseId in storage path", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockExercise);
      mockDb.exercise.update.mockResolvedValue(mockExercise);

      await service.uploadAudio(centerId, "ex-1", fileBuffer, "audio/mpeg");

      expect(mockBucket.file).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`exercises/${centerId}/ex-1/audio/\\d+\\.mp3`)),
      );
    });

    it("should throw if exercise is not DRAFT", async () => {
      mockDb.exercise.findUnique.mockResolvedValue({
        ...mockExercise,
        status: "PUBLISHED",
      });

      await expect(
        service.uploadAudio(centerId, "ex-1", fileBuffer, "audio/mpeg"),
      ).rejects.toThrow("Only draft exercises can have audio uploaded");
    });

    it("should throw if exercise not found", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadAudio(centerId, "nonexistent", fileBuffer, "audio/mpeg"),
      ).rejects.toThrow();
    });
  });

  describe("deleteAudio", () => {
    const audioUrl = `https://storage.googleapis.com/${bucketName}/exercises/${centerId}/ex-1/audio/12345.mp3`;
    const exerciseWithAudio = {
      ...mockExercise,
      audioUrl,
      audioDuration: 300,
      audioSections: [{ label: "Section 1", startTime: 0, endTime: 150 }],
    };

    it("should delete audio file from storage and clear DB fields", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(exerciseWithAudio);
      mockDb.exercise.update.mockResolvedValue(mockExercise);

      await service.deleteAudio(centerId, "ex-1");

      expect(mockFile.delete).toHaveBeenCalled();
      expect(mockDb.exercise.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ex-1" },
          data: expect.objectContaining({
            audioUrl: null,
            audioDuration: null,
          }),
        }),
      );
    });

    it("should clear audioSectionIndex on all related question sections", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(exerciseWithAudio);
      mockDb.exercise.update.mockResolvedValue(mockExercise);

      await service.deleteAudio(centerId, "ex-1");

      expect(mockDb.questionSection.updateMany).toHaveBeenCalledWith({
        where: { exerciseId: "ex-1" },
        data: { audioSectionIndex: null },
      });
    });

    it("should throw if exercise is not DRAFT", async () => {
      mockDb.exercise.findUnique.mockResolvedValue({
        ...exerciseWithAudio,
        status: "PUBLISHED",
      });

      await expect(
        service.deleteAudio(centerId, "ex-1"),
      ).rejects.toThrow("Only draft exercises can have audio removed");
    });

    it("should handle exercise with no audioUrl gracefully", async () => {
      mockDb.exercise.findUnique.mockResolvedValue({
        ...mockExercise,
        audioUrl: null,
      });
      mockDb.exercise.update.mockResolvedValue(mockExercise);

      await service.deleteAudio(centerId, "ex-1");

      // Should not attempt to delete from storage
      expect(mockFile.delete).not.toHaveBeenCalled();
      // Should still clear DB fields
      expect(mockDb.exercise.update).toHaveBeenCalled();
    });

    it("should continue if storage file deletion fails", async () => {
      mockFile.delete.mockRejectedValue(new Error("File not found"));
      mockDb.exercise.findUnique.mockResolvedValue(exerciseWithAudio);
      mockDb.exercise.update.mockResolvedValue(mockExercise);

      // Should not throw
      await service.deleteAudio(centerId, "ex-1");

      expect(mockDb.exercise.update).toHaveBeenCalled();
    });
  });

  describe("uploadStimulusImage", () => {
    const fileBuffer = Buffer.from("fake-image-data");

    it("should upload image and return URL", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockExercise);
      mockDb.exercise.update.mockResolvedValue({
        ...mockExercise,
        stimulusImageUrl: `https://storage.googleapis.com/${bucketName}/exercises/${centerId}/ex-1/stimulus-image/12345.png`,
      });

      const result = await service.uploadStimulusImage(centerId, "ex-1", fileBuffer, "image/png");

      expect(result.stimulusImageUrl).toContain(`https://storage.googleapis.com/${bucketName}/`);
      expect(result.stimulusImageUrl).toContain("/stimulus-image/");
      expect(result.stimulusImageUrl).toContain(".png");
      expect(mockFile.save).toHaveBeenCalledWith(
        fileBuffer,
        expect.objectContaining({
          metadata: expect.objectContaining({
            contentType: "image/png",
          }),
        }),
      );
      expect(mockFile.makePublic).toHaveBeenCalled();
      expect(mockDb.exercise.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ex-1" },
          data: expect.objectContaining({
            stimulusImageUrl: expect.stringContaining(".png"),
          }),
        }),
      );
    });

    it("should map image/jpeg to .jpg extension", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockExercise);
      mockDb.exercise.update.mockResolvedValue(mockExercise);

      await service.uploadStimulusImage(centerId, "ex-1", fileBuffer, "image/jpeg");

      expect(mockBucket.file).toHaveBeenCalledWith(
        expect.stringContaining(".jpg"),
      );
    });

    it("should map image/svg+xml to .svg extension", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockExercise);
      mockDb.exercise.update.mockResolvedValue(mockExercise);

      await service.uploadStimulusImage(centerId, "ex-1", fileBuffer, "image/svg+xml");

      expect(mockBucket.file).toHaveBeenCalledWith(
        expect.stringContaining(".svg"),
      );
    });

    it("should include centerId and exerciseId in storage path", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockExercise);
      mockDb.exercise.update.mockResolvedValue(mockExercise);

      await service.uploadStimulusImage(centerId, "ex-1", fileBuffer, "image/png");

      expect(mockBucket.file).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`exercises/${centerId}/ex-1/stimulus-image/\\d+\\.png`)),
      );
    });

    it("should throw if exercise is not DRAFT", async () => {
      mockDb.exercise.findUnique.mockResolvedValue({
        ...mockExercise,
        status: "PUBLISHED",
      });

      await expect(
        service.uploadStimulusImage(centerId, "ex-1", fileBuffer, "image/png"),
      ).rejects.toThrow("Only draft exercises can have stimulus images uploaded");
    });

    it("should throw if exercise not found", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadStimulusImage(centerId, "nonexistent", fileBuffer, "image/png"),
      ).rejects.toThrow();
    });
  });

  describe("deleteStimulusImage", () => {
    const stimulusImageUrl = `https://storage.googleapis.com/${bucketName}/exercises/${centerId}/ex-1/stimulus-image/12345.png`;
    const exerciseWithStimulus = {
      ...mockExercise,
      stimulusImageUrl,
    };

    it("should delete stimulus image from storage and clear DB field", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(exerciseWithStimulus);
      mockDb.exercise.update.mockResolvedValue(mockExercise);

      await service.deleteStimulusImage(centerId, "ex-1");

      expect(mockFile.delete).toHaveBeenCalled();
      expect(mockDb.exercise.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ex-1" },
          data: expect.objectContaining({
            stimulusImageUrl: null,
          }),
        }),
      );
    });

    it("should throw if exercise is not DRAFT", async () => {
      mockDb.exercise.findUnique.mockResolvedValue({
        ...exerciseWithStimulus,
        status: "PUBLISHED",
      });

      await expect(
        service.deleteStimulusImage(centerId, "ex-1"),
      ).rejects.toThrow("Only draft exercises can have stimulus images removed");
    });

    it("should handle exercise with no stimulusImageUrl gracefully", async () => {
      mockDb.exercise.findUnique.mockResolvedValue({
        ...mockExercise,
        stimulusImageUrl: null,
      });
      mockDb.exercise.update.mockResolvedValue(mockExercise);

      await service.deleteStimulusImage(centerId, "ex-1");

      expect(mockFile.delete).not.toHaveBeenCalled();
      expect(mockDb.exercise.update).toHaveBeenCalled();
    });

    it("should continue if storage file deletion fails", async () => {
      mockFile.delete.mockRejectedValue(new Error("File not found"));
      mockDb.exercise.findUnique.mockResolvedValue(exerciseWithStimulus);
      mockDb.exercise.update.mockResolvedValue(mockExercise);

      // Should not throw
      await service.deleteStimulusImage(centerId, "ex-1");

      expect(mockDb.exercise.update).toHaveBeenCalled();
    });
  });
});
