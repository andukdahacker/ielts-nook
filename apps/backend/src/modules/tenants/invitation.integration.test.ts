import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from "vitest";
import { PrismaClient } from "@workspace/db";
import { getTenantedClient } from "@workspace/db";
import { getTestPrisma, closeTestPrisma, isTestDatabaseAvailable } from "../../test/db.js";
import { InvitationService } from "./invitation.service.js";
import Fastify, { FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { invitationRoutes } from "./invitation.routes.js";

describe("Invitation Integration", () => {
  let prisma: PrismaClient;
  let dbAvailable = false;
  let invitationService: InvitationService;

  const centerAId = "center-inv-a";
  const centerBId = "center-inv-b";

  const mockResend = {
    emails: {
      send: vi.fn().mockResolvedValue({ id: "email-123" }),
    },
  };

  beforeAll(async () => {
    dbAvailable = await isTestDatabaseAvailable();
    if (dbAvailable) {
      prisma = await getTestPrisma();
    }
  });

  beforeEach(async () => {
    if (!dbAvailable) return;

    try {
      invitationService = new InvitationService(prisma, mockResend as any, {
        emailFrom: "test@classlite.app",
        webappUrl: "http://localhost:3000",
      });

      // Cleanup
      await prisma.centerMembership.deleteMany({
        where: { centerId: { in: [centerAId, centerBId] } },
      });
      await prisma.center.deleteMany({
        where: { id: { in: [centerAId, centerBId] } },
      });
      await prisma.user.deleteMany({
        where: { email: { in: ["invited-a@test.com", "invited-b@test.com"] } },
      });

      // Setup
      await prisma.center.create({
        data: { id: centerAId, name: "Center A", slug: "center-inv-a" },
      });
      await prisma.center.create({
        data: { id: centerBId, name: "Center B", slug: "center-inv-b" },
      });
    } catch (e) {
      console.warn("Database integration test setup failed:", e);
    }
  });

  afterAll(async () => {
    if (dbAvailable && prisma) {
      try {
        await prisma.centerMembership.deleteMany({
          where: { centerId: { in: [centerAId, centerBId] } },
        });
        await prisma.center.deleteMany({
          where: { id: { in: [centerAId, centerBId] } },
        });
        await prisma.user.deleteMany({
          where: { email: { in: ["invited-a@test.com", "invited-b@test.com"] } },
        });
      } catch {}
    }
    await closeTestPrisma();
  });

  it("should create invitation in the correct center using tenanted client", async () => {
    if (!dbAvailable) return;

    const email = "invited-a@test.com";

    const result = await invitationService.inviteUser(centerAId, {
      email,
      role: "TEACHER",
    });

    expect(result.centerId).toBe(centerAId);
    expect(result.status).toBe("INVITED");

    // Verify Center B cannot see it
    const dbB = getTenantedClient(prisma, centerBId);
    const membersB = await dbB.centerMembership.findMany();
    expect(membersB.find((m) => m.userId === result.userId)).toBeUndefined();

    // Verify Global client sees it
    const membership = await prisma.centerMembership.findFirst({
      where: { userId: result.userId, centerId: centerAId },
    });
    expect(membership).toBeDefined();
  });
});

// ─── Enrollment Restriction Route-Level Tests ──────────────────────────
describe("Invitation Routes — Enrollment Restriction", () => {
  let app: FastifyInstance;

  const centerId = "center-enroll-test";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockDb: any = {
    centerMembership: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "mem-1", centerId, userId: "user-1", role: "STUDENT", status: "INVITED" }),
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockPrisma: any = {
    $extends: vi.fn().mockReturnValue(mockDb),
    subscription: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "user-1", email: "student@test.com" }),
    },
  };

  const mockFirebaseAuth = {
    verifyIdToken: vi.fn().mockResolvedValue({
      uid: "firebase-owner-1",
      email: "owner@test.com",
      role: "OWNER",
      center_id: centerId,
    }),
  };

  const mockResend = {
    emails: {
      send: vi.fn().mockResolvedValue({ id: "email-1" }),
    },
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (app as any).resend = mockResend;

    // Stub getEnvs
    app.decorate("getEnvs", () => ({
      EMAIL_FROM: "test@classlite.app",
      NODE_ENV: "test",
    }));

    await app.register(invitationRoutes, { prefix: "/api/v1/invitations" });
    await app.ready();
  });

  it("should return 403 when inviting STUDENT with inactive subscription", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ status: "inactive" });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/invitations",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      payload: JSON.stringify({ email: "student@test.com", role: "STUDENT" }),
    });

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body);
    expect(body.message).toContain("inactive");
  });

  it("should allow TEACHER invite even when subscription is inactive", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ status: "inactive" });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/invitations",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      payload: JSON.stringify({ email: "teacher@test.com", role: "TEACHER" }),
    });

    // Should not be 403 — teacher invites are never restricted
    expect(response.statusCode).not.toBe(403);
  });

  it("should allow STUDENT invite when subscription is active", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ status: "active" });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/invitations",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      payload: JSON.stringify({ email: "student@test.com", role: "STUDENT" }),
    });

    // Should not be 403 — active subscription allows students
    expect(response.statusCode).not.toBe(403);
  });

  it("should allow STUDENT invite during grace_period", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ status: "grace_period" });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/invitations",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      payload: JSON.stringify({ email: "student@test.com", role: "STUDENT" }),
    });

    // Grace period allows normal operation per AC3
    expect(response.statusCode).not.toBe(403);
  });
});
