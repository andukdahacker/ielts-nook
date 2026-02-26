import { describe, it, expect, beforeEach, beforeAll, afterAll, afterEach } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { validatorCompiler, serializerCompiler } from "fastify-type-provider-zod";
import { PrismaClient, CenterRole, MembershipStatus } from "@workspace/db";
import { getTestPrisma, closeTestPrisma, isTestDatabaseAvailable } from "../../test/db.js";
import { unsubscribeRoutes } from "./unsubscribe.routes.js";

describe("Unsubscribe Routes Integration", () => {
  let prisma: PrismaClient;
  let dbAvailable = false;
  let app: FastifyInstance;

  const centerId = "center-unsub-integ";
  const studentId = "student-unsub-integ";
  const parentEmailId = "pe-unsub-integ";
  const unsubToken = "unsub-token-test-12345";

  beforeAll(async () => {
    dbAvailable = await isTestDatabaseAvailable();
    if (dbAvailable) {
      prisma = await getTestPrisma();
    }
  });

  beforeEach(async () => {
    if (!dbAvailable) return;

    // Cleanup
    await prisma.parentEmail.deleteMany({ where: { userId: studentId } });
    await prisma.centerMembership.deleteMany({ where: { centerId } });
    await prisma.user.deleteMany({ where: { id: studentId } });
    await prisma.center.deleteMany({ where: { id: centerId } });

    // Setup
    await prisma.center.create({
      data: { id: centerId, name: "Unsub Center", slug: "center-unsub-integ" },
    });
    await prisma.user.create({
      data: { id: studentId, email: "unsub-student@test.com", name: "Test Student" },
    });
    await prisma.centerMembership.create({
      data: { centerId, userId: studentId, role: CenterRole.STUDENT, status: MembershipStatus.ACTIVE },
    });
    await prisma.parentEmail.create({
      data: {
        id: parentEmailId,
        userId: studentId,
        email: "parent-unsub@test.com",
        unsubscribeToken: unsubToken,
      },
    });

    // Create minimal Fastify app with prisma and unsubscribe routes
    app = Fastify();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    (app as any).prisma = prisma;
    await app.register(unsubscribeRoutes, { prefix: "/api/v1/unsubscribe" });
    await app.ready();
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  afterAll(async () => {
    if (dbAvailable) {
      await prisma.parentEmail.deleteMany({ where: { userId: studentId } });
      await prisma.centerMembership.deleteMany({ where: { centerId } });
      await prisma.user.deleteMany({ where: { id: studentId } });
      await prisma.center.deleteMany({ where: { id: centerId } });
      await closeTestPrisma();
    }
  });

  it("GET returns confirmation page for valid token", async () => {
    if (!dbAvailable) return;

    const response = await app.inject({
      method: "GET",
      url: `/api/v1/unsubscribe/${unsubToken}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain("Confirm Unsubscribe");
    expect(response.body).toContain("Test Student");
    expect(response.body).toContain("Unsub Center");
  });

  it("GET returns invalid page for unknown token", async () => {
    if (!dbAvailable) return;

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/unsubscribe/nonexistent-token",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("Link Invalid");
  });

  it("POST unsubscribes and shows success page", async () => {
    if (!dbAvailable) return;

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/unsubscribe/${unsubToken}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("Successfully Unsubscribed");

    const record = await prisma.parentEmail.findUnique({
      where: { id: parentEmailId },
    });
    expect(record?.unsubscribed).toBe(true);
  });

  it("GET shows already unsubscribed page", async () => {
    if (!dbAvailable) return;

    await prisma.parentEmail.update({
      where: { id: parentEmailId },
      data: { unsubscribed: true },
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/v1/unsubscribe/${unsubToken}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("Already Unsubscribed");
  });

  it("POST is idempotent for already unsubscribed email", async () => {
    if (!dbAvailable) return;

    await prisma.parentEmail.update({
      where: { id: parentEmailId },
      data: { unsubscribed: true },
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/unsubscribe/${unsubToken}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("Successfully Unsubscribed");
  });
});
