import { describe, expect, it, vi, beforeEach } from "vitest";
import { ModerationService, DEFAULT_PROHIBITED_TERMS } from "./moderation.service.js";

vi.mock("@workspace/db", () => ({
  getTenantedClient: vi.fn(),
}));

import { getTenantedClient } from "@workspace/db";

describe("ModerationService", () => {
  let service: ModerationService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPrisma: any;

  const centerId = "center-1";

  const mockTermList = {
    id: "tl-1",
    centerId,
    terms: ["phản động", "lật đổ chính quyền", "khủng bố"],
    isCustom: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    updatedBy: null,
  };

  const mockFlag = {
    id: "flag-1",
    centerId,
    contentType: "EXERCISE",
    contentId: "exercise-1",
    flaggedText: "This content contains phản động",
    matchedTerms: ["phản động"],
    status: "PENDING",
    resolvedById: null,
    resolvedAt: null,
    redactedText: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      moderationTermList: {
        findUnique: vi.fn().mockResolvedValue(mockTermList),
        create: vi.fn().mockResolvedValue(mockTermList),
        upsert: vi.fn().mockResolvedValue(mockTermList),
      },
      contentModerationFlag: {
        create: vi.fn().mockResolvedValue(mockFlag),
        findMany: vi.fn().mockResolvedValue([mockFlag]),
        findFirst: vi.fn().mockResolvedValue(mockFlag),
        count: vi.fn().mockResolvedValue(1),
        update: vi.fn().mockResolvedValue({ ...mockFlag, status: "APPROVED" }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      exercise: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      submission: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      studentAnswer: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      submissionFeedback: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    mockPrisma = {
      $extends: vi.fn().mockReturnValue(mockDb),
    };

    vi.mocked(getTenantedClient).mockReturnValue(mockDb);

    service = new ModerationService(mockPrisma);
  });

  // ── scanContent ─────────────────────────────────────────────────

  describe("scanContent", () => {
    it("should return matches when text contains prohibited terms", async () => {
      const result = await service.scanContent("This text mentions phản động content", centerId);

      expect(result.matches).toContain("phản động");
      expect(result.clean).toBe(false);
    });

    it("should return clean when no prohibited terms found", async () => {
      const result = await service.scanContent("This is perfectly clean educational content", centerId);

      expect(result.matches).toHaveLength(0);
      expect(result.clean).toBe(true);
    });

    it("should perform case-insensitive matching", async () => {
      mockDb.moderationTermList.upsert.mockResolvedValue({
        ...mockTermList,
        terms: ["test term"],
      });

      const result = await service.scanContent("This has TEST TERM in it", centerId);
      expect(result.matches).toContain("test term");
      expect(result.clean).toBe(false);
    });

    it("should handle Vietnamese diacritics with NFC normalization", async () => {
      // Test with Vietnamese text
      const result = await service.scanContent("Nội dung phản động trong bài", centerId);
      expect(result.matches).toContain("phản động");
    });

    it("should lazy-create term list from defaults via upsert", async () => {
      mockDb.moderationTermList.upsert.mockResolvedValue({
        ...mockTermList,
        terms: DEFAULT_PROHIBITED_TERMS,
      });

      const result = await service.scanContent("Clean text", centerId);

      expect(mockDb.moderationTermList.upsert).toHaveBeenCalledWith({
        where: { centerId },
        update: {},
        create: {
          centerId,
          terms: DEFAULT_PROHIBITED_TERMS,
          isCustom: false,
        },
      });
      expect(result.clean).toBe(true);
    });

    it("should match multi-word terms", async () => {
      const result = await service.scanContent("Someone is trying to lật đổ chính quyền", centerId);
      expect(result.matches).toContain("lật đổ chính quyền");
    });

    it("should not match terms embedded in other words", async () => {
      mockDb.moderationTermList.upsert.mockResolvedValue({
        ...mockTermList,
        terms: ["ban"],
      });

      const result = await service.scanContent("The banana is delicious", centerId);
      expect(result.matches).toHaveLength(0);
      expect(result.clean).toBe(true);
    });
  });

  // ── flagContent ─────────────────────────────────────────────────

  describe("flagContent", () => {
    it("should create a flag record", async () => {
      await service.flagContent({
        centerId,
        contentType: "EXERCISE",
        contentId: "exercise-1",
        flaggedText: "flagged text",
        matchedTerms: ["phản động"],
      });

      expect(mockDb.contentModerationFlag.create).toHaveBeenCalledWith({
        data: {
          centerId,
          contentType: "EXERCISE",
          contentId: "exercise-1",
          flaggedText: "flagged text",
          matchedTerms: ["phản động"],
        },
      });
    });

    it("should truncate long flagged text", async () => {
      const longText = "a".repeat(3000);
      await service.flagContent({
        centerId,
        contentType: "EXERCISE",
        contentId: "exercise-1",
        flaggedText: longText,
        matchedTerms: ["phản động"],
      });

      const callData = mockDb.contentModerationFlag.create.mock.calls[0][0].data;
      expect(callData.flaggedText.length).toBeLessThanOrEqual(2006); // 2000 + "..." prefix/suffix
    });
  });

  // ── getFlags ────────────────────────────────────────────────────

  describe("getFlags", () => {
    it("should return paginated flags", async () => {
      const result = await service.getFlags(centerId, { page: 1, limit: 20 });

      expect(result.data).toEqual([mockFlag]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it("should apply status filter", async () => {
      await service.getFlags(centerId, { status: "PENDING", page: 1, limit: 20 });

      expect(mockDb.contentModerationFlag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "PENDING" },
        }),
      );
    });

    it("should apply content type filter", async () => {
      await service.getFlags(centerId, { contentType: "EXERCISE", page: 1, limit: 20 });

      expect(mockDb.contentModerationFlag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { contentType: "EXERCISE" },
        }),
      );
    });

    it("should apply contentId filter", async () => {
      await service.getFlags(centerId, { contentId: "exercise-1", page: 1, limit: 20 });

      expect(mockDb.contentModerationFlag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { contentId: "exercise-1" },
        }),
      );
    });

    it("should paginate correctly", async () => {
      await service.getFlags(centerId, { page: 2, limit: 10 });

      expect(mockDb.contentModerationFlag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });
  });

  // ── resolveFlag ─────────────────────────────────────────────────

  describe("resolveFlag", () => {
    it("should approve a pending flag atomically", async () => {
      mockDb.contentModerationFlag.findFirst.mockResolvedValue({ ...mockFlag, status: "APPROVED" });

      await service.resolveFlag(centerId, "flag-1", "APPROVED", "member-1");

      expect(mockDb.contentModerationFlag.updateMany).toHaveBeenCalledWith({
        where: { id: "flag-1", status: "PENDING" },
        data: expect.objectContaining({
          status: "APPROVED",
          resolvedById: "member-1",
        }),
      });
    });

    it("should redact a flag with redacted text and update content", async () => {
      mockDb.contentModerationFlag.findFirst.mockResolvedValue({ ...mockFlag, status: "REDACTED", contentType: "EXERCISE" });

      await service.resolveFlag(centerId, "flag-1", "REDACTED", "member-1", "clean text");

      expect(mockDb.contentModerationFlag.updateMany).toHaveBeenCalledWith({
        where: { id: "flag-1", status: "PENDING" },
        data: expect.objectContaining({
          status: "REDACTED",
          redactedText: "clean text",
        }),
      });
      // Should update exercise content
      expect(mockDb.exercise.updateMany).toHaveBeenCalledWith({
        where: { id: "exercise-1" },
        data: { passageContent: "clean text", status: "DRAFT" },
      });
    });

    it("should throw when redacting without redactedText", async () => {
      await expect(
        service.resolveFlag(centerId, "flag-1", "REDACTED", "member-1"),
      ).rejects.toThrow("redactedText is required when action is REDACT");
    });

    it("should throw when redacting with empty redactedText", async () => {
      await expect(
        service.resolveFlag(centerId, "flag-1", "REDACTED", "member-1", ""),
      ).rejects.toThrow("redactedText is required when action is REDACT");
    });

    it("should delete a flag and archive exercise", async () => {
      mockDb.contentModerationFlag.updateMany.mockResolvedValue({ count: 1 });
      mockDb.contentModerationFlag.findFirst.mockResolvedValue({ ...mockFlag, status: "DELETED", contentType: "EXERCISE" });

      await service.resolveFlag(centerId, "flag-1", "DELETED", "member-1");

      expect(mockDb.contentModerationFlag.updateMany).toHaveBeenCalledWith({
        where: { id: "flag-1", status: "PENDING" },
        data: expect.objectContaining({ status: "DELETED" }),
      });
      expect(mockDb.exercise.updateMany).toHaveBeenCalledWith({
        where: { id: "exercise-1" },
        data: { status: "ARCHIVED" },
      });
    });

    it("should throw if flag not found", async () => {
      mockDb.contentModerationFlag.updateMany.mockResolvedValue({ count: 0 });
      mockDb.contentModerationFlag.findFirst.mockResolvedValue(null);

      await expect(
        service.resolveFlag(centerId, "missing", "APPROVED", "member-1"),
      ).rejects.toThrow("Moderation flag not found");
    });

    it("should throw if flag already resolved", async () => {
      mockDb.contentModerationFlag.updateMany.mockResolvedValue({ count: 0 });
      mockDb.contentModerationFlag.findFirst.mockResolvedValue({
        ...mockFlag,
        status: "APPROVED",
      });

      await expect(
        service.resolveFlag(centerId, "flag-1", "APPROVED", "member-1"),
      ).rejects.toThrow("Flag has already been resolved");
    });

    it("should delete AI feedback when action is DELETED", async () => {
      mockDb.contentModerationFlag.updateMany.mockResolvedValue({ count: 1 });
      mockDb.contentModerationFlag.findFirst.mockResolvedValue({
        ...mockFlag,
        status: "DELETED",
        contentType: "AI_FEEDBACK",
        contentId: "feedback-1",
      });

      await service.resolveFlag(centerId, "flag-1", "DELETED", "member-1");

      expect(mockDb.submissionFeedback.deleteMany).toHaveBeenCalledWith({
        where: { id: "feedback-1" },
      });
    });
  });

  // ── Term List CRUD ──────────────────────────────────────────────

  describe("getTermList", () => {
    it("should return term list via upsert", async () => {
      const result = await service.getTermList(centerId);
      expect(result).toEqual(mockTermList);
      expect(mockDb.moderationTermList.upsert).toHaveBeenCalled();
    });
  });

  describe("updateTerms", () => {
    it("should upsert the term list", async () => {
      await service.updateTerms(centerId, ["term1", "term2"], "member-1");

      expect(mockDb.moderationTermList.upsert).toHaveBeenCalledWith({
        where: { centerId },
        update: { terms: ["term1", "term2"], isCustom: true, updatedBy: "member-1" },
        create: { centerId, terms: ["term1", "term2"], isCustom: true, updatedBy: "member-1" },
      });
    });

    it("should enforce max 500 terms", async () => {
      const tooManyTerms = Array.from({ length: 501 }, (_, i) => `term${i}`);

      await expect(
        service.updateTerms(centerId, tooManyTerms, "member-1"),
      ).rejects.toThrow("Maximum 500 terms per center");
    });

    it("should enforce max 100 characters per term", async () => {
      const longTerm = "a".repeat(101);

      await expect(
        service.updateTerms(centerId, [longTerm], "member-1"),
      ).rejects.toThrow("Each term must be at most 100 characters");
    });

    it("should normalize and deduplicate terms", async () => {
      await service.updateTerms(centerId, ["  term1  ", "term1", "term2"], "member-1");

      expect(mockDb.moderationTermList.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            terms: ["term1", "term2"],
          }),
        }),
      );
    });
  });

  describe("resetToDefaults", () => {
    it("should reset term list to defaults", async () => {
      await service.resetToDefaults(centerId, "member-1");

      expect(mockDb.moderationTermList.upsert).toHaveBeenCalledWith({
        where: { centerId },
        update: { terms: DEFAULT_PROHIBITED_TERMS, isCustom: false, updatedBy: "member-1" },
        create: { centerId, terms: DEFAULT_PROHIBITED_TERMS, isCustom: false, updatedBy: "member-1" },
      });
    });
  });
});
