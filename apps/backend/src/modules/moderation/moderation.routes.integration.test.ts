import Fastify, { FastifyInstance } from "fastify";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { moderationRoutes } from "./moderation.routes.js";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

vi.mock("@workspace/db", () => ({
  getTenantedClient: vi.fn(),
}));

import { getTenantedClient } from "@workspace/db";

describe("Moderation Routes Integration", () => {
  let app: FastifyInstance;

  const sampleDate = new Date("2026-04-10T00:00:00Z");

  const mockFlag = {
    id: "flag-1",
    centerId: "center-1",
    contentType: "EXERCISE",
    contentId: "exercise-1",
    flaggedText: "Content with phản động term",
    matchedTerms: ["phản động"],
    status: "PENDING",
    resolvedById: null,
    resolvedAt: null,
    redactedText: null,
    createdAt: sampleDate,
    updatedAt: sampleDate,
  };

  const mockTermList = {
    id: "tl-1",
    centerId: "center-1",
    terms: ["phản động", "lật đổ chính quyền"],
    isCustom: false,
    createdAt: sampleDate,
    updatedAt: sampleDate,
    updatedBy: null,
  };

  const mockMembership = {
    id: "membership-1",
    centerId: "center-1",
    userId: "user-1",
  };

  const mockDb = {
    contentModerationFlag: {
      findMany: vi.fn().mockResolvedValue([mockFlag]),
      findFirst: vi.fn().mockResolvedValue(mockFlag),
      count: vi.fn().mockResolvedValue(1),
      create: vi.fn().mockResolvedValue(mockFlag),
      update: vi.fn().mockResolvedValue({ ...mockFlag, status: "APPROVED", resolvedAt: sampleDate }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    moderationTermList: {
      findUnique: vi.fn().mockResolvedValue(mockTermList),
      create: vi.fn().mockResolvedValue(mockTermList),
      upsert: vi.fn().mockResolvedValue(mockTermList),
    },
    authAccount: {
      findUnique: vi.fn().mockResolvedValue({ userId: "user-1" }),
    },
    centerMembership: {
      findUnique: vi.fn().mockResolvedValue(mockMembership),
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockPrisma: any = {
    $extends: vi.fn().mockReturnValue(mockDb),
    authAccount: mockDb.authAccount,
    centerMembership: mockDb.centerMembership,
  };

  const mockFirebaseAuth = {
    verifyIdToken: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Re-setup mocks
    mockDb.contentModerationFlag.findMany.mockResolvedValue([mockFlag]);
    mockDb.contentModerationFlag.findFirst.mockResolvedValue(mockFlag);
    mockDb.contentModerationFlag.count.mockResolvedValue(1);
    mockDb.contentModerationFlag.create.mockResolvedValue(mockFlag);
    mockDb.contentModerationFlag.update.mockResolvedValue({
      ...mockFlag,
      status: "APPROVED",
      resolvedAt: sampleDate,
    });
    mockDb.contentModerationFlag.updateMany.mockResolvedValue({ count: 1 });
    mockDb.moderationTermList.findUnique.mockResolvedValue(mockTermList);
    mockDb.moderationTermList.create.mockResolvedValue(mockTermList);
    mockDb.moderationTermList.upsert.mockResolvedValue(mockTermList);
    mockDb.authAccount.findUnique.mockResolvedValue({ userId: "user-1" });
    mockDb.centerMembership.findUnique.mockResolvedValue(mockMembership);
    mockPrisma.$extends.mockReturnValue(mockDb);
    vi.mocked(getTenantedClient).mockReturnValue(mockDb);

    // Default: authenticated OWNER
    mockFirebaseAuth.verifyIdToken.mockResolvedValue({
      uid: "firebase-owner-1",
      email: "owner@test.com",
      role: "OWNER",
      center_id: "center-1",
    });

    app = Fastify();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (app as any).prisma = mockPrisma;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (app as any).firebaseAuth = mockFirebaseAuth;

    await app.register(moderationRoutes, { prefix: "/api/v1/moderation" });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── Auth & RBAC ─────────────────────────────────────────────────

  describe("RBAC", () => {
    it("should return 401 without auth header", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/moderation/flags",
      });
      expect(response.statusCode).toBe(401);
    });

    it("should allow ADMIN access to flags", async () => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValue({
        uid: "firebase-admin-1",
        email: "admin@test.com",
        role: "ADMIN",
        center_id: "center-1",
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/moderation/flags",
        headers: { authorization: "Bearer valid-token" },
      });
      expect(response.statusCode).toBe(200);
    });

    it("should deny TEACHER access to flags", async () => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValue({
        uid: "firebase-teacher-1",
        email: "teacher@test.com",
        role: "TEACHER",
        center_id: "center-1",
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/moderation/flags",
        headers: { authorization: "Bearer valid-token" },
      });
      expect(response.statusCode).toBe(403);
    });

    it("should deny STUDENT access to flags", async () => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValue({
        uid: "firebase-student-1",
        email: "student@test.com",
        role: "STUDENT",
        center_id: "center-1",
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/moderation/flags",
        headers: { authorization: "Bearer valid-token" },
      });
      expect(response.statusCode).toBe(403);
    });

    it("should deny ADMIN access to PUT terms (OWNER only)", async () => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValue({
        uid: "firebase-admin-1",
        email: "admin@test.com",
        role: "ADMIN",
        center_id: "center-1",
      });

      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/moderation/terms",
        headers: {
          authorization: "Bearer valid-token",
          "content-type": "application/json",
        },
        payload: { terms: ["test"] },
      });
      expect(response.statusCode).toBe(403);
    });

    it("should deny ADMIN access to POST terms/reset (OWNER only)", async () => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValue({
        uid: "firebase-admin-1",
        email: "admin@test.com",
        role: "ADMIN",
        center_id: "center-1",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/moderation/terms/reset",
        headers: { authorization: "Bearer valid-token" },
      });
      expect(response.statusCode).toBe(403);
    });
  });

  // ── Flags ───────────────────────────────────────────────────────

  describe("GET /api/v1/moderation/flags", () => {
    it("should return paginated list of flags", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/moderation/flags",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
      expect(body.total).toBe(1);
      expect(body.message).toBe("Moderation flags retrieved");
    });

    it("should support status filter", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/moderation/flags?status=PENDING",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(200);
    });

    it("should support contentType filter", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/moderation/flags?contentType=EXERCISE",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe("GET /api/v1/moderation/flags/:id", () => {
    it("should return a single flag", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/moderation/flags/flag-1",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.id).toBe("flag-1");
    });

    it("should return 404 when flag not found", async () => {
      mockDb.contentModerationFlag.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/moderation/flags/missing",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("PATCH /api/v1/moderation/flags/:id/resolve", () => {
    it("should approve a flag", async () => {
      // After updateMany succeeds, findFirst returns the updated flag
      mockDb.contentModerationFlag.findFirst
        .mockResolvedValueOnce({ ...mockFlag, status: "APPROVED", resolvedAt: sampleDate });

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/moderation/flags/flag-1/resolve",
        headers: {
          authorization: "Bearer valid-token",
          "content-type": "application/json",
        },
        payload: { action: "APPROVED" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Flag approved");
    });

    it("should return 400 when redacting without text", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/moderation/flags/flag-1/resolve",
        headers: {
          authorization: "Bearer valid-token",
          "content-type": "application/json",
        },
        payload: { action: "REDACTED" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 404 for non-existent flag", async () => {
      mockDb.contentModerationFlag.updateMany.mockResolvedValue({ count: 0 });
      mockDb.contentModerationFlag.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/moderation/flags/missing/resolve",
        headers: {
          authorization: "Bearer valid-token",
          "content-type": "application/json",
        },
        payload: { action: "APPROVED" },
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 400 when flag already resolved", async () => {
      mockDb.contentModerationFlag.updateMany.mockResolvedValue({ count: 0 });
      mockDb.contentModerationFlag.findFirst.mockResolvedValue({
        ...mockFlag,
        status: "APPROVED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/moderation/flags/flag-1/resolve",
        headers: {
          authorization: "Bearer valid-token",
          "content-type": "application/json",
        },
        payload: { action: "APPROVED" },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ── Terms ───────────────────────────────────────────────────────

  describe("GET /api/v1/moderation/terms", () => {
    it("should return the term list", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/moderation/terms",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.terms).toEqual(["phản động", "lật đổ chính quyền"]);
    });
  });

  describe("PUT /api/v1/moderation/terms", () => {
    it("should update the term list (OWNER)", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/moderation/terms",
        headers: {
          authorization: "Bearer valid-token",
          "content-type": "application/json",
        },
        payload: { terms: ["new term 1", "new term 2"] },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Term list updated");
    });

    it("should validate term length", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/moderation/terms",
        headers: {
          authorization: "Bearer valid-token",
          "content-type": "application/json",
        },
        payload: { terms: ["a".repeat(101)] },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("POST /api/v1/moderation/terms/reset", () => {
    it("should reset to defaults (OWNER)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/moderation/terms/reset",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Term list reset to defaults");
    });
  });

  // ── Scan ────────────────────────────────────────────────────────

  describe("POST /api/v1/moderation/scan", () => {
    it("should scan text for prohibited terms", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/moderation/scan",
        headers: {
          authorization: "Bearer valid-token",
          "content-type": "application/json",
        },
        payload: { text: "This text is clean" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveProperty("matches");
      expect(body.data).toHaveProperty("clean");
    });

    it("should return 400 for empty text", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/moderation/scan",
        headers: {
          authorization: "Bearer valid-token",
          "content-type": "application/json",
        },
        payload: { text: "" },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ── Tenant Isolation ────────────────────────────────────────────

  describe("Tenant Isolation", () => {
    it("should pass centerId from JWT to service", async () => {
      await app.inject({
        method: "GET",
        url: "/api/v1/moderation/flags",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(getTenantedClient).toHaveBeenCalledWith(mockPrisma, "center-1");
    });
  });
});
