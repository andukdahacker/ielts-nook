import { PrismaClient, getTenantedClient } from "@workspace/db";
import { AppError } from "../../errors/app-error.js";
import { inngest } from "../inngest/client.js";

const MAX_PARENT_EMAILS = 3;

export class ParentEmailService {
  constructor(private readonly prisma: PrismaClient) {}

  async listParentEmails(centerId: string, studentId: string) {
    const db = getTenantedClient(this.prisma, centerId);
    const membership = await db.centerMembership.findFirst({
      where: { userId: studentId, role: "STUDENT" },
    });
    if (!membership) {
      throw AppError.notFound("Student not found in this center");
    }

    return this.prisma.parentEmail.findMany({
      where: { userId: studentId },
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, unsubscribed: true, createdAt: true },
    });
  }

  async addParentEmail(centerId: string, studentId: string, email: string) {
    const db = getTenantedClient(this.prisma, centerId);
    const membership = await db.centerMembership.findFirst({
      where: { userId: studentId, role: "STUDENT" },
    });
    if (!membership) {
      throw AppError.notFound("Student not found in this center");
    }

    const normalizedEmail = email.toLowerCase().trim();

    const count = await this.prisma.parentEmail.count({
      where: { userId: studentId },
    });
    if (count >= MAX_PARENT_EMAILS) {
      throw AppError.badRequest(
        `Maximum ${MAX_PARENT_EMAILS} parent emails allowed per student`,
      );
    }

    const existing = await this.prisma.parentEmail.findUnique({
      where: {
        userId_email: { userId: studentId, email: normalizedEmail },
      },
    });
    if (existing) {
      throw AppError.conflict(
        "This email is already registered for this student",
      );
    }

    const parentEmail = await this.prisma.parentEmail.create({
      data: { userId: studentId, email: normalizedEmail },
      select: { id: true, email: true, unsubscribed: true, createdAt: true },
    });

    await inngest.send({
      name: "parent-email/registered",
      data: { studentId, parentEmailId: parentEmail.id, centerId },
    });

    return parentEmail;
  }

  async removeParentEmail(
    centerId: string,
    studentId: string,
    parentEmailId: string,
  ) {
    const db = getTenantedClient(this.prisma, centerId);
    const membership = await db.centerMembership.findFirst({
      where: { userId: studentId, role: "STUDENT" },
    });
    if (!membership) {
      throw AppError.notFound("Student not found in this center");
    }

    const parentEmail = await this.prisma.parentEmail.findFirst({
      where: { id: parentEmailId, userId: studentId },
    });
    if (!parentEmail) {
      throw AppError.notFound("Parent email not found");
    }

    await this.prisma.parentEmail.delete({ where: { id: parentEmailId } });
  }
}
