import Fastify, { FastifyInstance } from "fastify";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { billingRoutes } from "./billing.routes.js";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

describe("Billing Routes Integration", () => {
  let app: FastifyInstance;

  const mockDb = {
    centerMembership: { count: vi.fn().mockResolvedValue(5) },
    billingEvent: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    studentCountSnapshot: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  };

  const mockPrisma = {
    $extends: vi.fn(),
    subscription: {
      upsert: vi.fn().mockResolvedValue({
        id: "sub-1",
        centerId: "center-1",
        status: "pilot",
        tier: "pilot",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        polarCustomerId: null,
      }),
    },
    studentCountSnapshot: {
      upsert: vi.fn().mockResolvedValue({ id: "snap-1" }),
    },
  };

  const mockFirebaseAuth = {
    verifyIdToken: vi.fn().mockResolvedValue({
      uid: "firebase-owner-1",
      email: "owner@test.com",
      role: "OWNER",
      center_id: "center-1",
    }),
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

    await app.register(billingRoutes, { prefix: "/api/v1/billing" });
    await app.ready();
  });

  describe("GET /api/v1/billing", () => {
    it("should return 200 with billing overview", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/billing",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveProperty("subscription");
      expect(body.data).toHaveProperty("usage");
      expect(body.data).toHaveProperty("portalUrl");
      expect(body.data.subscription.status).toBe("pilot");
      expect(body.data.subscription.tier).toBe("pilot");
      expect(body.data.usage.enrolledStudents).toBe(5);
      expect(body.data.usage.monthlyEstimateCents).toBe(0);
      expect(body.data.portalUrl).toBeNull();
      expect(body.message).toBe("Billing overview retrieved");
    });

    it("should return 401 without auth", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/billing",
      });

      expect(response.statusCode).toBe(401);
    });

    it("should return 403 for non-OWNER role", async () => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce({
        uid: "firebase-admin-1",
        email: "admin@test.com",
        role: "ADMIN",
        center_id: "center-1",
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/billing",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("GET /api/v1/billing/payments", () => {
    it("should return 200 with empty payment history", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/billing/payments",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.items).toEqual([]);
      expect(body.data.total).toBe(0);
      expect(body.data.page).toBe(1);
      expect(body.data.limit).toBe(10);
    });

    it("should accept page and limit query params", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/billing/payments?page=2&limit=5",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.page).toBe(2);
      expect(body.data.limit).toBe(5);
    });
  });

  describe("GET /api/v1/billing/usage", () => {
    it("should return 200 with usage history", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/billing/usage",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveProperty("snapshots");
      expect(body.data).toHaveProperty("currentCount");
      expect(body.data.snapshots).toEqual([]);
      expect(body.data.currentCount).toBe(5);
    });
  });
});
