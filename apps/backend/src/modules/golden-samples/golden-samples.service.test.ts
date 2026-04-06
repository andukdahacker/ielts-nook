import { describe, expect, it, vi, beforeEach } from "vitest";
import { GoldenSamplesService } from "./golden-samples.service.js";

vi.mock("@workspace/db", () => ({
  getTenantedClient: vi.fn(),
}));

import { getTenantedClient } from "@workspace/db";

describe("GoldenSamplesService", () => {
  let service: GoldenSamplesService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPrisma: any;

  const centerId = "center-1";

  const sampleData = {
    id: "gs-1",
    centerId,
    title: "Sample 1",
    skillType: "WRITING",
    studentWork: "This is a test student work with enough characters to be valid for testing.",
    teacherFeedback: "This is teacher feedback with enough characters to be valid for testing purposes.",
    isActive: true,
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      goldenSample: {
        findMany: vi.fn().mockResolvedValue([sampleData]),
        findFirst: vi.fn().mockResolvedValue(sampleData),
        count: vi.fn().mockResolvedValue(3),
        create: vi.fn().mockResolvedValue(sampleData),
        update: vi.fn().mockResolvedValue(sampleData),
        delete: vi.fn().mockResolvedValue(sampleData),
      },
    };

    mockPrisma = {
      $extends: vi.fn().mockReturnValue(mockDb),
      $transaction: vi.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn(mockPrisma)),
    };

    vi.mocked(getTenantedClient).mockReturnValue(mockDb);

    service = new GoldenSamplesService(mockPrisma);
  });

  describe("list", () => {
    it("should return all samples for center ordered by order", async () => {
      const result = await service.list(centerId);

      expect(getTenantedClient).toHaveBeenCalledWith(mockPrisma, centerId);
      expect(mockDb.goldenSample.findMany).toHaveBeenCalledWith({
        orderBy: { order: "asc" },
      });
      expect(result).toEqual([sampleData]);
    });
  });

  describe("getById", () => {
    it("should return a single sample", async () => {
      const result = await service.getById(centerId, "gs-1");

      expect(mockDb.goldenSample.findFirst).toHaveBeenCalledWith({
        where: { id: "gs-1" },
      });
      expect(result).toEqual(sampleData);
    });

    it("should throw if sample not found", async () => {
      mockDb.goldenSample.findFirst.mockResolvedValue(null);

      await expect(service.getById(centerId, "gs-missing")).rejects.toThrow(
        "Golden sample not found",
      );
    });
  });

  describe("create", () => {
    it("should create a new sample with correct order", async () => {
      mockDb.goldenSample.findFirst.mockResolvedValue({ order: 2 });

      await service.create(centerId, {
        title: "New Sample",
        skillType: "WRITING",
        studentWork: "This is a test student work with enough characters to be valid for testing.",
        teacherFeedback: "This is teacher feedback with enough characters to be valid for testing purposes.",
      });

      expect(mockDb.goldenSample.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          centerId,
          title: "New Sample",
          skillType: "WRITING",
          order: 3,
        }),
      });
    });

    it("should enforce max 10 samples per skill type", async () => {
      mockDb.goldenSample.count.mockResolvedValue(10);

      await expect(
        service.create(centerId, {
          title: "11th Sample",
          skillType: "WRITING",
          studentWork: "This is a test student work with enough characters to be valid for testing.",
          teacherFeedback: "This is teacher feedback with enough characters to be valid for testing purposes.",
        }),
      ).rejects.toThrow("Maximum 10 samples per skill type");
    });

    it("should set order to 0 when no existing samples", async () => {
      mockDb.goldenSample.count.mockResolvedValue(0);
      mockDb.goldenSample.findFirst.mockResolvedValue(null);

      await service.create(centerId, {
        title: "First Sample",
        skillType: "SPEAKING",
        studentWork: "This is a test student work with enough characters to be valid for testing.",
        teacherFeedback: "This is teacher feedback with enough characters to be valid for testing purposes.",
      });

      expect(mockDb.goldenSample.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ order: 0 }),
      });
    });
  });

  describe("update", () => {
    it("should update an existing sample", async () => {
      await service.update(centerId, "gs-1", { title: "Updated Title" });

      expect(mockDb.goldenSample.update).toHaveBeenCalledWith({
        where: { id: "gs-1" },
        data: { title: "Updated Title" },
      });
    });

    it("should throw if sample not found", async () => {
      mockDb.goldenSample.findFirst.mockResolvedValue(null);

      await expect(
        service.update(centerId, "gs-missing", { title: "X" }),
      ).rejects.toThrow("Golden sample not found");
    });
  });

  describe("delete", () => {
    it("should delete an existing sample", async () => {
      await service.delete(centerId, "gs-1");

      expect(mockDb.goldenSample.delete).toHaveBeenCalledWith({
        where: { id: "gs-1" },
      });
    });

    it("should throw if sample not found", async () => {
      mockDb.goldenSample.findFirst.mockResolvedValue(null);

      await expect(service.delete(centerId, "gs-missing")).rejects.toThrow(
        "Golden sample not found",
      );
    });
  });

  describe("reorder", () => {
    it("should update order for all provided IDs", async () => {
      mockDb.goldenSample.findMany.mockResolvedValue([
        { id: "gs-1" },
        { id: "gs-2" },
        { id: "gs-3" },
      ]);

      await service.reorder(centerId, ["gs-3", "gs-1", "gs-2"]);

      expect(mockDb.goldenSample.update).toHaveBeenCalledTimes(3);
      expect(mockDb.goldenSample.update).toHaveBeenCalledWith({
        where: { id: "gs-3" },
        data: { order: 0 },
      });
      expect(mockDb.goldenSample.update).toHaveBeenCalledWith({
        where: { id: "gs-1" },
        data: { order: 1 },
      });
      expect(mockDb.goldenSample.update).toHaveBeenCalledWith({
        where: { id: "gs-2" },
        data: { order: 2 },
      });
    });

    it("should throw if some IDs not found", async () => {
      mockDb.goldenSample.findMany.mockResolvedValue([{ id: "gs-1" }]);

      await expect(
        service.reorder(centerId, ["gs-1", "gs-missing"]),
      ).rejects.toThrow("One or more sample IDs not found");
    });
  });

  describe("getActiveByCenterAndSkill", () => {
    it("should return only active samples for the given skill type", async () => {
      const activeSamples = [
        { studentWork: "work1", teacherFeedback: "feedback1" },
        { studentWork: "work2", teacherFeedback: "feedback2" },
      ];
      mockDb.goldenSample.findMany.mockResolvedValue(activeSamples);

      const result = await service.getActiveByCenterAndSkill(
        centerId,
        "WRITING",
      );

      expect(mockDb.goldenSample.findMany).toHaveBeenCalledWith({
        where: { skillType: "WRITING", isActive: true },
        orderBy: { order: "asc" },
        select: { studentWork: true, teacherFeedback: true },
      });
      expect(result).toEqual(activeSamples);
    });
  });
});
