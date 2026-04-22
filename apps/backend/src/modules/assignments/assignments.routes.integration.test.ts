import Fastify, { FastifyInstance } from "fastify";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { assignmentsRoutes } from "./assignments.routes.js";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

describe("Assignments Routes - ADMIN Role Access (Story 15-2)", () => {
  let app: FastifyInstance;

  const mockPrisma = {
    $extends: vi.fn(),
  };

  const mockDb = {
    assignment: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    assignmentStudent: {
      createMany: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    exercise: {
      findUnique: vi.fn(),
    },
    class: {
      findUnique: vi.fn(),
    },
    authAccount: {
      findUniqueOrThrow: vi.fn(),
    },
    centerMembership: {
      findFirst: vi.fn(),
    },
    submission: {
      count: vi.fn().mockResolvedValue(0),
    },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(mockDb)),
  };

  const mockFirebaseAuth = {
    verifyIdToken: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockPrisma.$extends.mockReturnValue(mockDb);

    app = Fastify();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (app as any).prisma = mockPrisma;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (app as any).firebaseAuth = mockFirebaseAuth;

    await app.register(assignmentsRoutes, { prefix: "/api/v1/assignments" });
    await app.ready();
  });

  it("should return 403 for ADMIN on GET /", async () => {
    mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce({
      uid: "firebase-admin-1",
      email: "admin@test.com",
      role: "ADMIN",
      center_id: "center-1",
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/assignments",
      headers: { authorization: "Bearer admin-token" },
    });

    expect(response.statusCode).toBe(403);
  });

  it("should return 403 for ADMIN on POST /", async () => {
    mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce({
      uid: "firebase-admin-1",
      email: "admin@test.com",
      role: "ADMIN",
      center_id: "center-1",
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/assignments",
      headers: { authorization: "Bearer admin-token" },
      payload: {
        exerciseId: "ex-1",
        classIds: ["class-1"],
      },
    });

    expect(response.statusCode).toBe(403);
  });

  it("should return 403 for ADMIN on GET /:id", async () => {
    mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce({
      uid: "firebase-admin-1",
      email: "admin@test.com",
      role: "ADMIN",
      center_id: "center-1",
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/assignments/assign-1",
      headers: { authorization: "Bearer admin-token" },
    });

    expect(response.statusCode).toBe(403);
  });

  it("should return 403 for ADMIN on DELETE /:id", async () => {
    mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce({
      uid: "firebase-admin-1",
      email: "admin@test.com",
      role: "ADMIN",
      center_id: "center-1",
    });

    const response = await app.inject({
      method: "DELETE",
      url: "/api/v1/assignments/assign-1",
      headers: { authorization: "Bearer admin-token" },
    });

    expect(response.statusCode).toBe(403);
  });

  it("should allow TEACHER on GET /", async () => {
    mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce({
      uid: "firebase-teacher-1",
      email: "teacher@test.com",
      role: "TEACHER",
      center_id: "center-1",
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/assignments",
      headers: { authorization: "Bearer teacher-token" },
    });

    expect(response.statusCode).toBe(200);
  });

  it("should allow OWNER on GET /", async () => {
    mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce({
      uid: "firebase-owner-1",
      email: "owner@test.com",
      role: "OWNER",
      center_id: "center-1",
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/assignments",
      headers: { authorization: "Bearer owner-token" },
    });

    expect(response.statusCode).toBe(200);
  });
});
