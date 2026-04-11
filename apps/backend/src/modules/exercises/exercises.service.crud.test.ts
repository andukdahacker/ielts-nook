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
      submission: {
        count: vi.fn().mockResolvedValue(0),
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
      moderationTermList: {
        findUnique: vi.fn().mockResolvedValue({
          id: "tl-1",
          centerId,
          terms: [],
          isCustom: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        create: vi.fn(),
        upsert: vi.fn().mockResolvedValue({
          id: "tl-1",
          centerId,
          terms: [],
          isCustom: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
      contentModerationFlag: {
        create: vi.fn(),
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

  describe("listExercises", () => {
    it("should return all exercises ordered by updatedAt desc", async () => {
      const mockExercises = [mockExercise];
      mockDb.exercise.findMany.mockResolvedValue(mockExercises);

      const result = await service.listExercises(centerId);

      expect(result).toEqual(mockExercises);
      expect(mockDb.exercise.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { updatedAt: "desc" },
        }),
      );
    });

    it("should filter by skill when provided", async () => {
      mockDb.exercise.findMany.mockResolvedValue([]);

      await service.listExercises(centerId, { skill: "READING" });

      expect(mockDb.exercise.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { skill: "READING" },
        }),
      );
    });

    it("should filter by status when provided", async () => {
      mockDb.exercise.findMany.mockResolvedValue([]);

      await service.listExercises(centerId, { status: "PUBLISHED" });

      expect(mockDb.exercise.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "PUBLISHED" },
        }),
      );
    });
  });

  describe("getExercise", () => {
    it("should return exercise with sections and questions", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockExercise);

      const result = await service.getExercise(centerId, "ex-1");

      expect(result).toEqual(mockExercise);
      expect(mockDb.exercise.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ex-1" },
          include: expect.objectContaining({
            sections: expect.any(Object),
            createdBy: expect.any(Object),
          }),
        }),
      );
    });

    it("should throw 404 if exercise not found", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(null);

      await expect(service.getExercise(centerId, "nonexistent")).rejects.toThrow(
        "Exercise not found",
      );
    });
  });

  describe("createExercise", () => {
    it("should resolve Firebase UID and create exercise", async () => {
      mockPrisma.authAccount.findUnique.mockResolvedValue({
        userId,
        provider: "FIREBASE",
        providerUserId: firebaseUid,
      });
      mockDb.exercise.create.mockResolvedValue(mockExercise);

      const result = await service.createExercise(centerId, {
        title: "Reading Test 1",
        skill: "READING",
      }, firebaseUid);

      expect(result).toEqual(mockExercise);
      expect(mockPrisma.authAccount.findUnique).toHaveBeenCalledWith({
        where: {
          provider_providerUserId: {
            provider: "FIREBASE",
            providerUserId: firebaseUid,
          },
        },
      });
      expect(mockDb.exercise.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            centerId,
            title: "Reading Test 1",
            skill: "READING",
            createdById: userId,
          }),
        }),
      );
    });

    it("should throw if auth account not found", async () => {
      mockPrisma.authAccount.findUnique.mockResolvedValue(null);

      await expect(
        service.createExercise(centerId, {
          title: "Test",
          skill: "READING",
        }, "unknown-uid"),
      ).rejects.toThrow("User account not found");
    });
  });

  describe("updateExercise", () => {
    it("should update a draft exercise", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockExercise);
      mockDb.exercise.update.mockResolvedValue({
        ...mockExercise,
        title: "Updated Title",
      });

      const result = await service.updateExercise(centerId, "ex-1", {
        title: "Updated Title",
      });

      expect(result.title).toBe("Updated Title");
    });

    it("should allow title and bandLevel update on PUBLISHED exercises with submissions", async () => {
      mockDb.exercise.findUnique.mockResolvedValue({
        ...mockExercise,
        status: "PUBLISHED",
      });
      mockDb.submission.count.mockResolvedValue(3);
      mockDb.exercise.update.mockResolvedValue({
        ...mockExercise,
        status: "PUBLISHED",
        title: "New Title",
      });

      const result = await service.updateExercise(centerId, "ex-1", { title: "New Title" });

      expect(result.title).toBe("New Title");
      expect(mockDb.exercise.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { title: "New Title", bandLevel: undefined },
        }),
      );
    });

    it("should reject content fields on PUBLISHED exercises with submissions", async () => {
      mockDb.exercise.findUnique.mockResolvedValue({
        ...mockExercise,
        status: "PUBLISHED",
      });
      mockDb.submission.count.mockResolvedValue(1);

      await expect(
        service.updateExercise(centerId, "ex-1", { instructions: "new" }),
      ).rejects.toThrow("Published exercises with submissions only allow updating: title, bandLevel");
    });

    it("should allow full edit on PUBLISHED exercises with no submissions", async () => {
      mockDb.exercise.findUnique.mockResolvedValue({
        ...mockExercise,
        status: "PUBLISHED",
      });
      mockDb.submission.count.mockResolvedValue(0);
      mockDb.exercise.update.mockResolvedValue({
        ...mockExercise,
        status: "PUBLISHED",
        instructions: "updated instructions",
      });

      const result = await service.updateExercise(centerId, "ex-1", { instructions: "updated instructions" });

      expect(result.instructions).toBe("updated instructions");
    });

    it("should reject updates on ARCHIVED exercises", async () => {
      mockDb.exercise.findUnique.mockResolvedValue({
        ...mockExercise,
        status: "ARCHIVED",
      });

      await expect(
        service.updateExercise(centerId, "ex-1", { title: "New" }),
      ).rejects.toThrow("Archived exercises cannot be updated");
    });

    it("should throw 404 if exercise not found", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(null);

      await expect(
        service.updateExercise(centerId, "nonexistent", { title: "New" }),
      ).rejects.toThrow("Exercise not found");
    });

    it("should reject wordCountMax < wordCountMin when both in request", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockExercise);

      await expect(
        service.updateExercise(centerId, "ex-1", {
          wordCountMin: 250,
          wordCountMax: 100,
        }),
      ).rejects.toThrow("wordCountMax must be >= wordCountMin");
    });

    it("should reject wordCountMax < existing wordCountMin on partial update", async () => {
      mockDb.exercise.findUnique.mockResolvedValue({
        ...mockExercise,
        wordCountMin: 150,
      });

      await expect(
        service.updateExercise(centerId, "ex-1", {
          wordCountMax: 50,
        }),
      ).rejects.toThrow("wordCountMax must be >= wordCountMin");
    });

    it("should reject wordCountMin > existing wordCountMax on partial update", async () => {
      mockDb.exercise.findUnique.mockResolvedValue({
        ...mockExercise,
        wordCountMax: 200,
      });

      await expect(
        service.updateExercise(centerId, "ex-1", {
          wordCountMin: 300,
        }),
      ).rejects.toThrow("wordCountMax must be >= wordCountMin");
    });

    it("should accept valid wordCount partial update", async () => {
      mockDb.exercise.findUnique.mockResolvedValue({
        ...mockExercise,
        wordCountMin: 150,
      });
      mockDb.exercise.update.mockResolvedValue({
        ...mockExercise,
        wordCountMin: 150,
        wordCountMax: 300,
      });

      const result = await service.updateExercise(centerId, "ex-1", {
        wordCountMax: 300,
      });

      expect(result.wordCountMax).toBe(300);
    });
  });

  describe("deleteExercise", () => {
    it("should delete a draft exercise", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockExercise);
      mockDb.exercise.delete.mockResolvedValue(mockExercise);

      await service.deleteExercise(centerId, "ex-1");

      expect(mockDb.exercise.delete).toHaveBeenCalledWith({
        where: { id: "ex-1" },
      });
    });

    it("should throw if exercise is not DRAFT", async () => {
      mockDb.exercise.findUnique.mockResolvedValue({
        ...mockExercise,
        status: "PUBLISHED",
      });

      await expect(
        service.deleteExercise(centerId, "ex-1"),
      ).rejects.toThrow("Only draft exercises can be deleted");
    });

    it("should throw 404 if exercise not found", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteExercise(centerId, "nonexistent"),
      ).rejects.toThrow("Exercise not found");
    });
  });

  describe("publishExercise", () => {
    it("should publish a draft exercise", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockExercise);
      const published = { ...mockExercise, status: "PUBLISHED" };
      mockDb.exercise.update.mockResolvedValue(published);

      const result = await service.publishExercise(centerId, "ex-1");

      expect(result.status).toBe("PUBLISHED");
      expect(mockDb.exercise.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ex-1" },
          data: { status: "PUBLISHED" },
        }),
      );
    });

    it("should throw if exercise is not DRAFT", async () => {
      mockDb.exercise.findUnique.mockResolvedValue({
        ...mockExercise,
        status: "ARCHIVED",
      });

      await expect(
        service.publishExercise(centerId, "ex-1"),
      ).rejects.toThrow("Only draft exercises can be published");
    });
  });

  describe("archiveExercise", () => {
    it("should archive a published exercise", async () => {
      const published = { ...mockExercise, status: "PUBLISHED" };
      mockDb.exercise.findUnique.mockResolvedValue(published);
      const archived = { ...mockExercise, status: "ARCHIVED" };
      mockDb.exercise.update.mockResolvedValue(archived);

      const result = await service.archiveExercise(centerId, "ex-1");

      expect(result.status).toBe("ARCHIVED");
    });

    it("should throw if exercise is already archived", async () => {
      mockDb.exercise.findUnique.mockResolvedValue({
        ...mockExercise,
        status: "ARCHIVED",
      });

      await expect(
        service.archiveExercise(centerId, "ex-1"),
      ).rejects.toThrow("Exercise is already archived");
    });
  });

  describe("autosaveExercise", () => {
    it("should autosave a PUBLISHED exercise with no submissions", async () => {
      mockDb.exercise.findUnique.mockResolvedValue({
        ...mockExercise,
        status: "PUBLISHED",
      });
      mockDb.submission.count.mockResolvedValue(0);
      mockDb.exercise.update.mockResolvedValue({
        ...mockExercise,
        status: "PUBLISHED",
        title: "Autosaved",
      });

      const result = await service.autosaveExercise(centerId, "ex-1", { title: "Autosaved" });

      expect(result.title).toBe("Autosaved");
    });

    it("should throw when autosaving a PUBLISHED exercise with submissions", async () => {
      mockDb.exercise.findUnique.mockResolvedValue({
        ...mockExercise,
        status: "PUBLISHED",
      });
      mockDb.submission.count.mockResolvedValue(5);

      await expect(
        service.autosaveExercise(centerId, "ex-1", { title: "Autosaved" }),
      ).rejects.toThrow("Cannot autosave: exercise has student submissions");
    });

    it("should autosave a DRAFT exercise", async () => {
      mockDb.exercise.findUnique.mockResolvedValue(mockExercise);
      mockDb.exercise.update.mockResolvedValue({
        ...mockExercise,
        title: "Autosaved Draft",
      });

      const result = await service.autosaveExercise(centerId, "ex-1", { title: "Autosaved Draft" });

      expect(result.title).toBe("Autosaved Draft");
    });
  });

  describe("hasExerciseSubmissions", () => {
    it("should return true when submissions exist", async () => {
      mockDb.submission.count.mockResolvedValue(3);

      const result = await service.hasExerciseSubmissions(centerId, "ex-1");

      expect(result).toBe(true);
      expect(mockDb.submission.count).toHaveBeenCalledWith({
        where: { assignment: { exerciseId: "ex-1" } },
      });
    });

    it("should return false when no submissions exist", async () => {
      mockDb.submission.count.mockResolvedValue(0);

      const result = await service.hasExerciseSubmissions(centerId, "ex-1");

      expect(result).toBe(false);
    });
  });
});
