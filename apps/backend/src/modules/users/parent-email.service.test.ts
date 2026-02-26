import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock inngest
vi.mock("../inngest/client.js", () => ({
  inngest: { send: vi.fn().mockResolvedValue({ ids: ["test-event-id"] }) },
}));

const createMockTenantedClient = () => ({
  centerMembership: {
    findFirst: vi.fn(),
  },
});

const createMockPrisma = () => ({
  parentEmail: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
});

let mockTenantedClient = createMockTenantedClient();
let mockPrisma = createMockPrisma();

vi.mock("@workspace/db", () => ({
  getTenantedClient: vi.fn(() => mockTenantedClient),
  PrismaClient: vi.fn(() => mockPrisma),
}));

import { ParentEmailService } from "./parent-email.service.js";
import { inngest } from "../inngest/client.js";

describe("ParentEmailService", () => {
  let service: ParentEmailService;

  const centerId = "center-1";
  const studentId = "student-1";

  beforeEach(() => {
    mockTenantedClient = createMockTenantedClient();
    mockPrisma = createMockPrisma();
    vi.clearAllMocks();
    service = new ParentEmailService(mockPrisma as any);
  });

  describe("listParentEmails", () => {
    it("returns parent emails for a valid student", async () => {
      mockTenantedClient.centerMembership.findFirst.mockResolvedValue({
        id: "mem-1",
        userId: studentId,
        role: "STUDENT",
      });

      const mockEmails = [
        {
          id: "pe-1",
          email: "parent1@test.com",
          unsubscribed: false,
          createdAt: new Date("2026-01-01"),
        },
      ];
      mockPrisma.parentEmail.findMany.mockResolvedValue(mockEmails);

      const result = await service.listParentEmails(centerId, studentId);

      expect(result).toEqual(mockEmails);
      expect(mockPrisma.parentEmail.findMany).toHaveBeenCalledWith({
        where: { userId: studentId },
        orderBy: { createdAt: "asc" },
        select: { id: true, email: true, unsubscribed: true, createdAt: true },
      });
    });

    it("throws when student not found in center", async () => {
      mockTenantedClient.centerMembership.findFirst.mockResolvedValue(null);

      await expect(
        service.listParentEmails(centerId, studentId),
      ).rejects.toThrow("Student not found in this center");
    });
  });

  describe("addParentEmail", () => {
    it("adds a parent email and fires inngest event", async () => {
      mockTenantedClient.centerMembership.findFirst.mockResolvedValue({
        id: "mem-1",
        userId: studentId,
        role: "STUDENT",
      });
      mockPrisma.parentEmail.count.mockResolvedValue(0);
      mockPrisma.parentEmail.findUnique.mockResolvedValue(null);
      mockPrisma.parentEmail.create.mockResolvedValue({
        id: "pe-1",
        email: "parent@test.com",
        unsubscribed: false,
        createdAt: new Date("2026-01-01"),
      });

      const result = await service.addParentEmail(
        centerId,
        studentId,
        "Parent@Test.com",
      );

      expect(result.email).toBe("parent@test.com");
      expect(mockPrisma.parentEmail.create).toHaveBeenCalledWith({
        data: { userId: studentId, email: "parent@test.com" },
        select: { id: true, email: true, unsubscribed: true, createdAt: true },
      });
      expect(inngest.send).toHaveBeenCalledWith({
        name: "parent-email/registered",
        data: { studentId, parentEmailId: "pe-1", centerId },
      });
    });

    it("normalizes email to lowercase and trims", async () => {
      mockTenantedClient.centerMembership.findFirst.mockResolvedValue({
        id: "mem-1",
        userId: studentId,
        role: "STUDENT",
      });
      mockPrisma.parentEmail.count.mockResolvedValue(0);
      mockPrisma.parentEmail.findUnique.mockResolvedValue(null);
      mockPrisma.parentEmail.create.mockResolvedValue({
        id: "pe-1",
        email: "parent@test.com",
        unsubscribed: false,
        createdAt: new Date(),
      });

      await service.addParentEmail(centerId, studentId, "  Parent@TEST.com  ");

      expect(mockPrisma.parentEmail.findUnique).toHaveBeenCalledWith({
        where: {
          userId_email: { userId: studentId, email: "parent@test.com" },
        },
      });
    });

    it("throws when max 3 emails reached", async () => {
      mockTenantedClient.centerMembership.findFirst.mockResolvedValue({
        id: "mem-1",
        userId: studentId,
        role: "STUDENT",
      });
      mockPrisma.parentEmail.count.mockResolvedValue(3);

      await expect(
        service.addParentEmail(centerId, studentId, "new@test.com"),
      ).rejects.toThrow("Maximum 3 parent emails allowed per student");
    });

    it("throws when email already registered for student", async () => {
      mockTenantedClient.centerMembership.findFirst.mockResolvedValue({
        id: "mem-1",
        userId: studentId,
        role: "STUDENT",
      });
      mockPrisma.parentEmail.count.mockResolvedValue(1);
      mockPrisma.parentEmail.findUnique.mockResolvedValue({
        id: "pe-existing",
        email: "parent@test.com",
      });

      await expect(
        service.addParentEmail(centerId, studentId, "parent@test.com"),
      ).rejects.toThrow("This email is already registered for this student");
    });

    it("throws when student not found in center", async () => {
      mockTenantedClient.centerMembership.findFirst.mockResolvedValue(null);

      await expect(
        service.addParentEmail(centerId, studentId, "parent@test.com"),
      ).rejects.toThrow("Student not found in this center");
    });
  });

  describe("removeParentEmail", () => {
    it("removes a parent email", async () => {
      mockTenantedClient.centerMembership.findFirst.mockResolvedValue({
        id: "mem-1",
        userId: studentId,
        role: "STUDENT",
      });
      mockPrisma.parentEmail.findFirst.mockResolvedValue({
        id: "pe-1",
        userId: studentId,
      });
      mockPrisma.parentEmail.delete.mockResolvedValue({});

      await service.removeParentEmail(centerId, studentId, "pe-1");

      expect(mockPrisma.parentEmail.delete).toHaveBeenCalledWith({
        where: { id: "pe-1" },
      });
    });

    it("throws when parent email not found", async () => {
      mockTenantedClient.centerMembership.findFirst.mockResolvedValue({
        id: "mem-1",
        userId: studentId,
        role: "STUDENT",
      });
      mockPrisma.parentEmail.findFirst.mockResolvedValue(null);

      await expect(
        service.removeParentEmail(centerId, studentId, "pe-nonexistent"),
      ).rejects.toThrow("Parent email not found");
    });

    it("throws when student not found in center", async () => {
      mockTenantedClient.centerMembership.findFirst.mockResolvedValue(null);

      await expect(
        service.removeParentEmail(centerId, studentId, "pe-1"),
      ).rejects.toThrow("Student not found in this center");
    });
  });
});
