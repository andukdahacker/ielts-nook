import Fastify, { FastifyInstance } from "fastify";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { goldenSamplesRoutes } from "./golden-samples.routes.js";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

vi.mock("@workspace/db", () => ({
  getTenantedClient: vi.fn(),
}));

import { getTenantedClient } from "@workspace/db";

describe("Golden Samples Routes Integration", () => {
  let app: FastifyInstance;

  const sampleDate = new Date("2026-01-15T00:00:00Z");

  const mockSample = {
    id: "gs-1",
    centerId: "center-1",
    title: "Writing Sample 1",
    skillType: "WRITING",
    studentWork: "This is a test student work with enough characters to be valid for testing purposes here.",
    teacherFeedback: "This is teacher feedback with enough characters to be valid for testing purposes here.",
    isActive: true,
    order: 0,
    createdAt: sampleDate,
    updatedAt: sampleDate,
  };

  const mockDb = {
    goldenSample: {
      findMany: vi.fn().mockResolvedValue([mockSample]),
      findFirst: vi.fn().mockResolvedValue(mockSample),
      count: vi.fn().mockResolvedValue(1),
      create: vi.fn().mockResolvedValue(mockSample),
      update: vi.fn().mockResolvedValue(mockSample),
      delete: vi.fn().mockResolvedValue(mockSample),
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockPrisma: any = {
    $extends: vi.fn().mockReturnValue(mockDb),
    $transaction: vi.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn(mockPrisma)),
  };

  const mockFirebaseAuth = {
    verifyIdToken: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Re-setup mock return values after clearAllMocks
    mockDb.goldenSample.findMany.mockResolvedValue([mockSample]);
    mockDb.goldenSample.findFirst.mockResolvedValue(mockSample);
    mockDb.goldenSample.count.mockResolvedValue(1);
    mockDb.goldenSample.create.mockResolvedValue(mockSample);
    mockDb.goldenSample.update.mockResolvedValue(mockSample);
    mockDb.goldenSample.delete.mockResolvedValue(mockSample);
    mockPrisma.$extends.mockReturnValue(mockDb);
    mockPrisma.$transaction.mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn(mockPrisma));
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

    await app.register(goldenSamplesRoutes, {
      prefix: "/api/v1/golden-samples",
    });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("GET /api/v1/golden-samples", () => {
    it("should return 200 with list of samples for OWNER", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/golden-samples",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].title).toBe("Writing Sample 1");
      expect(body.message).toBe("Golden samples retrieved");
    });

    it("should return 403 for non-OWNER roles", async () => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValue({
        uid: "firebase-teacher-1",
        email: "teacher@test.com",
        role: "TEACHER",
        center_id: "center-1",
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/golden-samples",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should return 401 without auth header", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/golden-samples",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /api/v1/golden-samples/:id", () => {
    it("should return 200 with a single sample", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/golden-samples/gs-1",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.id).toBe("gs-1");
    });

    it("should return 404 when sample not found", async () => {
      mockDb.goldenSample.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/golden-samples/gs-missing",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("POST /api/v1/golden-samples", () => {
    const validBody = {
      title: "New Sample",
      skillType: "WRITING",
      studentWork: "This is a test student work with enough characters to be valid for testing purposes here.",
      teacherFeedback: "This is teacher feedback with enough characters to be valid for testing purposes here.",
    };

    it("should return 201 when creating a sample", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/golden-samples",
        headers: {
          authorization: "Bearer valid-token",
          "content-type": "application/json",
        },
        payload: validBody,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Golden sample created");
    });

    it("should return 400 with validation errors for missing fields", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/golden-samples",
        headers: {
          authorization: "Bearer valid-token",
          "content-type": "application/json",
        },
        payload: { title: "Only title" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when student work too short", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/golden-samples",
        headers: {
          authorization: "Bearer valid-token",
          "content-type": "application/json",
        },
        payload: {
          ...validBody,
          studentWork: "Too short",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 403 for ADMIN role", async () => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValue({
        uid: "firebase-admin-1",
        email: "admin@test.com",
        role: "ADMIN",
        center_id: "center-1",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/golden-samples",
        headers: {
          authorization: "Bearer valid-token",
          "content-type": "application/json",
        },
        payload: validBody,
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("PATCH /api/v1/golden-samples/:id", () => {
    it("should return 200 when updating a sample", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/golden-samples/gs-1",
        headers: {
          authorization: "Bearer valid-token",
          "content-type": "application/json",
        },
        payload: { title: "Updated Title" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Golden sample updated");
    });

    it("should return 404 when sample not found", async () => {
      mockDb.goldenSample.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/golden-samples/gs-missing",
        headers: {
          authorization: "Bearer valid-token",
          "content-type": "application/json",
        },
        payload: { title: "Updated" },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("DELETE /api/v1/golden-samples/:id", () => {
    it("should return 200 when deleting a sample", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/v1/golden-samples/gs-1",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Golden sample deleted");
    });

    it("should return 404 when sample not found", async () => {
      mockDb.goldenSample.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: "DELETE",
        url: "/api/v1/golden-samples/gs-missing",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("POST /api/v1/golden-samples/reorder", () => {
    it("should return 200 when reordering samples", async () => {
      mockDb.goldenSample.findMany.mockResolvedValue([
        { id: "gs-1" },
        { id: "gs-2" },
      ]);

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/golden-samples/reorder",
        headers: {
          authorization: "Bearer valid-token",
          "content-type": "application/json",
        },
        payload: { ids: ["gs-2", "gs-1"] },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Golden samples reordered");
    });

    it("should return 400 with empty ids array", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/golden-samples/reorder",
        headers: {
          authorization: "Bearer valid-token",
          "content-type": "application/json",
        },
        payload: { ids: [] },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
