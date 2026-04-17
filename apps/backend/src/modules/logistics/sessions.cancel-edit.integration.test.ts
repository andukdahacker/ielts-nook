import { PrismaClient } from "@workspace/db";
import { addDays, setHours, setMinutes } from "date-fns";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getTestPrisma, closeTestPrisma, isTestDatabaseAvailable } from "../../test/db.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { SessionsController } from "./sessions.controller.js";
import { SessionsService } from "./sessions.service.js";

// Mock Inngest to prevent real event sending in integration tests
vi.mock("../inngest/client.js", () => ({
  inngest: {
    send: vi.fn().mockResolvedValue({ ids: ["test-event-id"] }),
  },
}));

// Import after mock setup
const { inngest } = await import("../inngest/client.js");

describe("Sessions Integration - Cancel & Edit Exception Tracking", () => {
  let prisma: PrismaClient;
  let dbAvailable = false;
  let sessionsService: SessionsService;
  let notificationsService: NotificationsService;
  let sessionsController: SessionsController;

  const centerId = "center-cancel-test";
  let classId: string;
  let teacherUserId: string;
  let studentUserId: string;
  let otherTeacherUserId: string;

  beforeAll(async () => {
    dbAvailable = await isTestDatabaseAvailable();
    if (dbAvailable) {
      prisma = await getTestPrisma();
    }
  });

  beforeEach(async () => {
    if (!dbAvailable) return;

    vi.clearAllMocks();

    try {
      sessionsService = new SessionsService(prisma);
      notificationsService = new NotificationsService(prisma);
      sessionsController = new SessionsController(
        sessionsService,
        notificationsService,
      );

      // Cleanup
      await prisma.notification.deleteMany({ where: { centerId } });
      await prisma.classSession.deleteMany({ where: { centerId } });
      await prisma.classSchedule.deleteMany({ where: { centerId } });
      await prisma.classStudent.deleteMany({ where: { centerId } });
      await prisma.class.deleteMany({ where: { centerId } });
      await prisma.course.deleteMany({ where: { centerId } });
      await prisma.centerMembership.deleteMany({ where: { centerId } });
      await prisma.center.deleteMany({ where: { id: centerId } });
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [
              "teacher-cancel@test.com",
              "student-cancel@test.com",
              "other-teacher-cancel@test.com",
            ],
          },
        },
      });

      // Setup Center
      await prisma.center.create({
        data: {
          id: centerId,
          name: "Cancel Test Center",
          slug: "center-cancel-test",
        },
      });

      // Setup Users
      const teacher = await prisma.user.create({
        data: { email: "teacher-cancel@test.com", name: "Test Teacher" },
      });
      teacherUserId = teacher.id;

      const student = await prisma.user.create({
        data: { email: "student-cancel@test.com", name: "Test Student" },
      });
      studentUserId = student.id;

      const otherTeacher = await prisma.user.create({
        data: { email: "other-teacher-cancel@test.com", name: "Other Teacher" },
      });
      otherTeacherUserId = otherTeacher.id;

      // Add users to center
      await prisma.centerMembership.create({
        data: { centerId, userId: teacherUserId, role: "TEACHER" },
      });
      await prisma.centerMembership.create({
        data: { centerId, userId: studentUserId, role: "STUDENT" },
      });
      await prisma.centerMembership.create({
        data: { centerId, userId: otherTeacherUserId, role: "TEACHER" },
      });

      // Create Course
      const course = await prisma.course.create({
        data: { name: "Cancel Test Course", centerId },
      });

      // Create Class with teacher
      const cls = await prisma.class.create({
        data: {
          name: "Cancel Test Class",
          courseId: course.id,
          teacherId: teacherUserId,
          centerId,
        },
      });
      classId = cls.id;

      // Add student to class
      await prisma.classStudent.create({
        data: { classId: cls.id, studentId: studentUserId, centerId },
      });
    } catch (e) {
      console.warn("Database integration test setup failed:", e);
    }
  });

  afterAll(async () => {
    if (dbAvailable && prisma) {
      try {
        await prisma.notification.deleteMany({ where: { centerId } });
        await prisma.classSession.deleteMany({ where: { centerId } });
        await prisma.classSchedule.deleteMany({ where: { centerId } });
        await prisma.classStudent.deleteMany({ where: { centerId } });
        await prisma.class.deleteMany({ where: { centerId } });
        await prisma.course.deleteMany({ where: { centerId } });
        await prisma.centerMembership.deleteMany({ where: { centerId } });
        await prisma.center.deleteMany({ where: { id: centerId } });
        await prisma.user.deleteMany({
          where: {
            email: {
              in: [
                "teacher-cancel@test.com",
                "student-cancel@test.com",
                "other-teacher-cancel@test.com",
              ],
            },
          },
        });
      } catch {}
    }
    await closeTestPrisma();
  });

  // Helper to create a test session
  async function createTestSession(
    status: "SCHEDULED" | "CANCELLED" | "COMPLETED" = "SCHEDULED",
    overrides: Record<string, unknown> = {},
  ) {
    const tomorrow = addDays(new Date(), 1);
    const sessionStart = setMinutes(setHours(tomorrow, 10), 0);
    const sessionEnd = setMinutes(setHours(tomorrow, 11), 0);

    return prisma.classSession.create({
      data: {
        classId,
        startTime: sessionStart,
        endTime: sessionEnd,
        status: status as any,
        centerId,
        ...overrides,
      } as any,
    });
  }

  const adminPayload = { centerId, userId: "admin-id", uid: "admin-id", role: "ADMIN" } as any;

  // ─── 2.1: Cancel sets isException + CANCELLED + preserves original times ───

  it("should set isException=true, status=CANCELLED, and preserve original times on cancel", async () => {
    if (!dbAvailable) return;

    const session = await createTestSession();

    const result = await sessionsController.cancelSession(session.id, adminPayload);

    expect(result.message).toBe("Session cancelled successfully");
    expect(result.data?.status).toBe("CANCELLED");
    expect(result.data?.isException).toBe(true);
    expect(new Date(result.data!.originalStartTime!).getTime()).toBe(session.startTime.getTime());
    expect(new Date(result.data!.originalEndTime!).getTime()).toBe(session.endTime.getTime());
  });

  // ─── 2.2: Cancel on already-cancelled session is idempotent ───

  it("should be idempotent when cancelling an already-cancelled session", async () => {
    if (!dbAvailable) return;

    const session = await createTestSession("CANCELLED", {
      isException: true,
      originalStartTime: setMinutes(setHours(addDays(new Date(), 1), 10), 0),
      originalEndTime: setMinutes(setHours(addDays(new Date(), 1), 11), 0),
    });

    const result = await sessionsController.cancelSession(session.id, adminPayload);

    expect(result.message).toBe("Session cancelled successfully");
    expect(result.data?.status).toBe("CANCELLED");
  });

  // ─── 2.2b: Idempotent cancel does NOT send duplicate notifications ───

  it("should not send notifications when cancelling an already-cancelled session", async () => {
    if (!dbAvailable) return;

    const session = await createTestSession("CANCELLED", {
      isException: true,
      originalStartTime: setMinutes(setHours(addDays(new Date(), 1), 10), 0),
      originalEndTime: setMinutes(setHours(addDays(new Date(), 1), 11), 0),
    });

    await sessionsController.cancelSession(session.id, adminPayload);

    // Inngest should NOT have been called for idempotent re-cancel
    expect(inngest.send).not.toHaveBeenCalled();

    // No in-app notifications should exist
    const notifications = await notificationsService.listNotifications(
      centerId,
      studentUserId,
    );
    expect(notifications).toHaveLength(0);
  });

  // ─── 2.3: Cancel on COMPLETED session returns 409 ───

  it("should return 409 when cancelling a completed session", async () => {
    if (!dbAvailable) return;

    const session = await createTestSession("COMPLETED");

    await expect(
      sessionsController.cancelSession(session.id, adminPayload),
    ).rejects.toThrow("Cannot cancel a completed session");
  });

  // ─── 2.4: Cancel creates in-app notification for class participants ───

  it("should create in-app notifications for teacher and students on cancel", async () => {
    if (!dbAvailable) return;

    const session = await createTestSession();

    await sessionsController.cancelSession(session.id, adminPayload);

    const teacherNotifications = await notificationsService.listNotifications(
      centerId,
      teacherUserId,
    );
    const studentNotifications = await notificationsService.listNotifications(
      centerId,
      studentUserId,
    );

    expect(teacherNotifications).toHaveLength(1);
    expect(teacherNotifications[0]?.title).toBe("Session Cancelled");

    expect(studentNotifications).toHaveLength(1);
    expect(studentNotifications[0]?.title).toBe("Session Cancelled");
  });

  // ─── 2.5: Cancel emits logistics/session.cancelled Inngest event ───

  it("should emit logistics/session.cancelled Inngest event on cancel", async () => {
    if (!dbAvailable) return;

    const session = await createTestSession();

    await sessionsController.cancelSession(session.id, adminPayload);

    expect(inngest.send).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "logistics/session.cancelled",
        data: expect.objectContaining({
          centerId,
          classId,
          isBulk: false,
        }),
      }),
    );
  });

  // ─── 2.6: Edit time sets isException + populates original times ───

  it("should set isException=true and populate original times when editing time", async () => {
    if (!dbAvailable) return;

    const session = await createTestSession();
    const newStart = setMinutes(setHours(addDays(new Date(), 2), 14), 0);
    const newEnd = setMinutes(setHours(addDays(new Date(), 2), 15), 0);

    await sessionsController.updateSession(
      session.id,
      {
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
      },
      adminPayload,
    );

    // Verify directly from DB
    const updated = await prisma.classSession.findUniqueOrThrow({
      where: { id: session.id },
    });

    expect(updated.isException).toBe(true);
    expect(updated.originalStartTime!.getTime()).toBe(session.startTime.getTime());
    expect(updated.originalEndTime!.getTime()).toBe(session.endTime.getTime());
    expect(updated.startTime.getTime()).toBe(newStart.getTime());
    expect(updated.endTime.getTime()).toBe(newEnd.getTime());
  });

  // ─── 2.7: Re-edit preserves original times ───

  it("should preserve original times on re-edit of exception", async () => {
    if (!dbAvailable) return;

    const originalStart = setMinutes(setHours(addDays(new Date(), 1), 10), 0);
    const originalEnd = setMinutes(setHours(addDays(new Date(), 1), 11), 0);

    // Create a session that's already an exception
    const session = await createTestSession("SCHEDULED", {
      isException: true,
      originalStartTime: originalStart,
      originalEndTime: originalEnd,
      startTime: setMinutes(setHours(addDays(new Date(), 2), 14), 0),
      endTime: setMinutes(setHours(addDays(new Date(), 2), 15), 0),
    });

    // Re-edit to yet another time
    const thirdStart = setMinutes(setHours(addDays(new Date(), 3), 16), 0);
    const thirdEnd = setMinutes(setHours(addDays(new Date(), 3), 17), 0);

    await sessionsController.updateSession(
      session.id,
      {
        startTime: thirdStart.toISOString(),
        endTime: thirdEnd.toISOString(),
      },
      adminPayload,
    );

    const updated = await prisma.classSession.findUniqueOrThrow({
      where: { id: session.id },
    });

    // Original times should be preserved from the first exception, NOT overwritten
    expect(updated.originalStartTime!.getTime()).toBe(originalStart.getTime());
    expect(updated.originalEndTime!.getTime()).toBe(originalEnd.getTime());
    expect(updated.startTime.getTime()).toBe(thirdStart.getTime());
    expect(updated.endTime.getTime()).toBe(thirdEnd.getTime());
  });

  // ─── 2.8: Edit room-only does NOT set isException ───

  it("should NOT set isException when editing room only", async () => {
    if (!dbAvailable) return;

    const session = await createTestSession();

    await sessionsController.updateSession(
      session.id,
      { roomName: "Room 202" },
      adminPayload,
    );

    const updated = await prisma.classSession.findUniqueOrThrow({
      where: { id: session.id },
    });

    expect(updated.isException).toBe(false);
    expect(updated.originalStartTime).toBeNull();
    expect(updated.originalEndTime).toBeNull();
    expect(updated.roomName).toBe("Room 202");
  });

  // ─── 2.9: Teacher can cancel/edit sessions for assigned class ───

  it("should allow teacher to cancel sessions for their assigned class (via controller)", async () => {
    if (!dbAvailable) return;

    const session = await createTestSession();
    const teacherPayload = {
      centerId,
      userId: teacherUserId,
      uid: teacherUserId,
      role: "TEACHER",
    } as any;

    // Controller-level cancel (RBAC is at route level, controller doesn't check assignment)
    const result = await sessionsController.cancelSession(session.id, teacherPayload);
    expect(result.message).toBe("Session cancelled successfully");
    expect(result.data?.status).toBe("CANCELLED");
  });

  // ─── 2.10: Edit time on COMPLETED session returns 409 ───

  it("should return 409 when editing time on a completed session", async () => {
    if (!dbAvailable) return;

    const session = await createTestSession("COMPLETED");
    const newStart = setMinutes(setHours(addDays(new Date(), 2), 14), 0);

    await expect(
      sessionsController.updateSession(
        session.id,
        { startTime: newStart.toISOString() },
        adminPayload,
      ),
    ).rejects.toThrow("Cannot edit time on a completed session");
  });

  // ─── Status guard: PATCH cannot set status to CANCELLED ───

  it("should reject PATCH with status CANCELLED (must use cancel endpoint)", async () => {
    if (!dbAvailable) return;

    const session = await createTestSession();

    await expect(
      sessionsController.updateSession(
        session.id,
        { status: "CANCELLED" } as any,
        adminPayload,
      ),
    ).rejects.toThrow("Use the cancel endpoint to cancel a session");
  });

  // ─── Status guard: PATCH cannot set status to COMPLETED ───

  it("should reject PATCH with status COMPLETED", async () => {
    if (!dbAvailable) return;

    const session = await createTestSession();

    await expect(
      sessionsController.updateSession(
        session.id,
        { status: "COMPLETED" } as any,
        adminPayload,
      ),
    ).rejects.toThrow("Cannot set status to COMPLETED via update");
  });

  // ─── Room edit on COMPLETED session should succeed ───

  it("should allow room-only edit on a completed session", async () => {
    if (!dbAvailable) return;

    const session = await createTestSession("COMPLETED");

    const result = await sessionsController.updateSession(
      session.id,
      { roomName: "Room 303" },
      adminPayload,
    );

    expect(result.message).toBe("Session updated successfully");
    expect(result.data?.roomName).toBe("Room 303");
  });
});
