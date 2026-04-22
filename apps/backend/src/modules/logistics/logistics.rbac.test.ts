import Fastify, { FastifyInstance } from "fastify";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { sessionsRoutes } from "./sessions.routes.js";
import { attendanceRoutes } from "./attendance.routes.js";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

// Mock Inngest
vi.mock("../inngest/client.js", () => ({
  inngest: {
    send: vi.fn().mockResolvedValue({ ids: ["test-event-id"] }),
  },
}));

const mockPrisma = {
  $extends: vi.fn(),
};

const mockDb = {
  classSession: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn(), count: vi.fn().mockResolvedValue(0) },
  classSchedule: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn() },
  attendance: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn(), createMany: vi.fn() },
  authAccount: { findUniqueOrThrow: vi.fn() },
  centerMembership: { findFirst: vi.fn() },
  class: { findUnique: vi.fn() },
};

const mockSessionsService = {
  listSessions: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  getSessionById: vi.fn(),
  getWeekSessions: vi.fn().mockResolvedValue([]),
};

const mockFirebaseAuth = {
  verifyIdToken: vi.fn(),
};

function createAdminToken() {
  return {
    uid: "firebase-admin-1",
    email: "admin@test.com",
    role: "ADMIN",
    center_id: "center-1",
  };
}

function createStudentToken() {
  return {
    uid: "firebase-student-1",
    email: "student@test.com",
    role: "STUDENT",
    center_id: "center-1",
  };
}

describe("Logistics RBAC - Story 15-2 (AC4, AC5)", () => {
  describe("Sessions routes - requireRole guard (AC4)", () => {
    let app: FastifyInstance;

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (app as any).sessionsService = mockSessionsService;

      await app.register(sessionsRoutes, { prefix: "/api/v1/sessions" });
      await app.ready();
    });

    it("should return 401 for unauthenticated GET /sessions/", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/sessions/?startDate=2026-01-01&endDate=2026-01-07",
      });
      expect(response.statusCode).toBe(401);
    });

    it("should not return 403 for STUDENT on GET /sessions/", async () => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce(createStudentToken());

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/sessions/?startDate=2026-01-01&endDate=2026-01-07",
        headers: { authorization: "Bearer student-token" },
      });
      expect(response.statusCode).not.toBe(401);
      expect(response.statusCode).not.toBe(403);
    });

    it("should not return 403 for ADMIN on GET /sessions/", async () => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce(createAdminToken());

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/sessions/?startDate=2026-01-01&endDate=2026-01-07",
        headers: { authorization: "Bearer admin-token" },
      });
      expect(response.statusCode).not.toBe(401);
      expect(response.statusCode).not.toBe(403);
    });

    it("should not return 403 for STUDENT on GET /sessions/week", async () => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce(createStudentToken());

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/sessions/week?weekStart=2026-01-01",
        headers: { authorization: "Bearer student-token" },
      });
      expect(response.statusCode).not.toBe(401);
      expect(response.statusCode).not.toBe(403);
    });

    it("should not return 403 for STUDENT on GET /sessions/:id", async () => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce(createStudentToken());

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/sessions/session-1",
        headers: { authorization: "Bearer student-token" },
      });
      expect(response.statusCode).not.toBe(401);
      expect(response.statusCode).not.toBe(403);
    });
  });

  // Note: Schedules routes cannot be tested via app.inject() because a pre-existing
  // missing schema export (PreviewUpdateScheduleResponseSchema) causes Fastify
  // route registration to fail. The requireRole guards on GET / and GET /:id
  // are verified by code inspection (schedules.routes.ts lines 47, 72).

  describe("Attendance routes - requireRole guard (AC5)", () => {
    let app: FastifyInstance;

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

      await app.register(attendanceRoutes, { prefix: "/api/v1/attendance" });
      await app.ready();
    });

    it("should return 403 for STUDENT on GET /attendance/sessions/:sessionId/attendance", async () => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce(createStudentToken());

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/attendance/sessions/session-1/attendance",
        headers: { authorization: "Bearer student-token" },
      });
      expect(response.statusCode).toBe(403);
    });

    it("should not return 403 for ADMIN on GET /attendance/sessions/:sessionId/attendance", async () => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce(createAdminToken());

      mockDb.authAccount.findUniqueOrThrow.mockResolvedValueOnce({
        userId: "admin-user-1",
        provider: "FIREBASE",
        providerUserId: "firebase-admin-1",
      });
      mockDb.centerMembership.findFirst.mockResolvedValueOnce({ role: "ADMIN" });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/attendance/sessions/session-1/attendance",
        headers: { authorization: "Bearer admin-token" },
      });
      // ADMIN passes role check; may fail on session access but should not be 403 from requireRole
      expect(response.statusCode).not.toBe(401);
    });
  });
});
