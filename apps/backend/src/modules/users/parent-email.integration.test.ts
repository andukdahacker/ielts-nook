import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from "vitest";
import { PrismaClient, CenterRole, MembershipStatus } from "@workspace/db";
import { getTestPrisma, closeTestPrisma, isTestDatabaseAvailable } from "../../test/db.js";

// Mock inngest
vi.mock("../inngest/client.js", () => ({
  inngest: { send: vi.fn().mockResolvedValue({ ids: ["test-event-id"] }) },
}));

import { ParentEmailService } from "./parent-email.service.js";

describe("ParentEmail Integration", () => {
  let prisma: PrismaClient;
  let dbAvailable = false;
  let service: ParentEmailService;

  const centerId = "center-pe-integ-73";
  const studentId = "student-pe-integ-73";
  const ownerId = "owner-pe-integ-73";

  beforeAll(async () => {
    dbAvailable = await isTestDatabaseAvailable();
    if (dbAvailable) {
      prisma = await getTestPrisma();
    }
  });

  beforeEach(async () => {
    if (!dbAvailable) return;

    service = new ParentEmailService(prisma);

    // Cleanup (order matters for FK)
    await prisma.parentEmail.deleteMany({
      where: { userId: { in: [studentId, ownerId] } },
    });
    await prisma.centerMembership.deleteMany({
      where: { centerId },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [studentId, ownerId] } },
    });
    await prisma.center.deleteMany({
      where: { id: centerId },
    });

    // Setup
    await prisma.center.create({
      data: { id: centerId, name: "PE Test Center", slug: "center-pe-integ-73" },
    });
    await prisma.user.createMany({
      data: [
        { id: studentId, email: "pe-student-73@test.com", name: "Student PE" },
        { id: ownerId, email: "pe-owner-73@test.com", name: "Owner PE" },
      ],
    });
    await prisma.centerMembership.createMany({
      data: [
        { centerId, userId: studentId, role: CenterRole.STUDENT, status: MembershipStatus.ACTIVE },
        { centerId, userId: ownerId, role: CenterRole.OWNER, status: MembershipStatus.ACTIVE },
      ],
    });
  });

  afterAll(async () => {
    if (dbAvailable) {
      await prisma.parentEmail.deleteMany({
        where: { userId: { in: [studentId, ownerId] } },
      });
      await prisma.centerMembership.deleteMany({
        where: { centerId },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [studentId, ownerId] } },
      });
      await prisma.center.deleteMany({
        where: { id: centerId },
      });
      await closeTestPrisma();
    }
  });

  it("adds and lists parent emails", async () => {
    if (!dbAvailable) return;

    const added = await service.addParentEmail(centerId, studentId, "parent1@pe-test.com");
    expect(added.email).toBe("parent1@pe-test.com");
    expect(added.unsubscribed).toBe(false);

    const list = await service.listParentEmails(centerId, studentId);
    expect(list).toHaveLength(1);
    expect(list[0]!.email).toBe("parent1@pe-test.com");
  });

  it("enforces max 3 parent emails", async () => {
    if (!dbAvailable) return;

    await service.addParentEmail(centerId, studentId, "p1@pe-test.com");
    await service.addParentEmail(centerId, studentId, "p2@pe-test.com");
    await service.addParentEmail(centerId, studentId, "p3@pe-test.com");

    await expect(
      service.addParentEmail(centerId, studentId, "p4@pe-test.com"),
    ).rejects.toThrow("Maximum 3 parent emails allowed per student");
  });

  it("prevents duplicate emails for same student", async () => {
    if (!dbAvailable) return;

    await service.addParentEmail(centerId, studentId, "dup@pe-test.com");

    await expect(
      service.addParentEmail(centerId, studentId, "dup@pe-test.com"),
    ).rejects.toThrow("This email is already registered for this student");
  });

  it("normalizes email case", async () => {
    if (!dbAvailable) return;

    await service.addParentEmail(centerId, studentId, "Case@PE-Test.com");

    await expect(
      service.addParentEmail(centerId, studentId, "case@pe-test.com"),
    ).rejects.toThrow("This email is already registered for this student");
  });

  it("removes a parent email", async () => {
    if (!dbAvailable) return;

    const added = await service.addParentEmail(centerId, studentId, "remove@pe-test.com");
    await service.removeParentEmail(centerId, studentId, added.id);

    const list = await service.listParentEmails(centerId, studentId);
    expect(list).toHaveLength(0);
  });

  it("rejects non-student user", async () => {
    if (!dbAvailable) return;

    await expect(
      service.listParentEmails(centerId, ownerId),
    ).rejects.toThrow("Student not found in this center");
  });
});
