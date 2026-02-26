import { inngest } from "../../inngest/client.js";
import { getTenantedClient } from "@workspace/db";
import { createPrisma } from "../../../plugins/create-prisma.js";
import { Resend } from "resend";
import { buildScheduleChangeEmail } from "../emails/schedule-change.template.js";
import { buildSessionCancelledEmail } from "../emails/session-cancelled.template.js";

// Event types
export type SessionScheduleChangedEvent = {
  name: "logistics/session.schedule-changed";
  data: {
    sessionId: string;
    centerId: string;
    classId: string;
    previousStartTime: string;
    previousEndTime: string;
    newStartTime: string;
    newEndTime: string;
    previousRoomName: string | null;
    newRoomName: string | null;
  };
};

export type SessionCancelledEvent = {
  name: "logistics/session.cancelled";
  data: {
    centerId: string;
    classId: string;
    originalStartTime: string;
    originalEndTime: string;
    roomName: string | null;
    isBulk: boolean;
    deletedCount?: number;
  };
};

interface Recipient {
  id: string;
  email: string | null;
  name: string | null;
  preferredLanguage: string;
}

async function fetchRecipientsForClass(
  centerId: string,
  classId: string,
): Promise<Recipient[]> {
  const prisma = createPrisma();
  try {
    const db = getTenantedClient(prisma, centerId);
    const classData = await db.class.findUnique({
      where: { id: classId },
      include: {
        teacher: {
          select: {
            id: true,
            email: true,
            name: true,
            emailScheduleNotifications: true,
            emailNotificationsPaused: true,
            preferredLanguage: true,
          },
        },
        students: {
          include: {
            student: {
              select: {
                id: true,
                email: true,
                name: true,
                emailScheduleNotifications: true,
                emailNotificationsPaused: true,
                preferredLanguage: true,
              },
            },
          },
        },
      },
    });

    if (!classData) return [];

    const all = [
      ...(classData.teacher ? [classData.teacher] : []),
      ...classData.students.map((s) => s.student),
    ];

    return all
      .filter(
        (u) =>
          u.emailScheduleNotifications && !u.emailNotificationsPaused && u.email,
      )
      .map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        preferredLanguage: u.preferredLanguage,
      }));
  } finally {
    await prisma.$disconnect();
  }
}

async function fetchCenterName(centerId: string): Promise<string> {
  const prisma = createPrisma();
  try {
    const center = await prisma.center.findUnique({
      where: { id: centerId },
      select: { name: true },
    });
    return center?.name ?? "ClassLite";
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Inngest job: sends email notifications when a session's schedule changes.
 *
 * Uses cancelOn + step.sleep debounce: if a new event for the same sessionId
 * arrives during the sleep window, this job is cancelled and a new one starts.
 * Only the last edit's job survives to send email.
 */
export const sessionEmailNotificationJob = inngest.createFunction(
  {
    id: "session-email-notification",
    retries: 3,
    cancelOn: [
      {
        event: "logistics/session.schedule-changed",
        match: "data.sessionId",
      },
    ],
  },
  { event: "logistics/session.schedule-changed" },
  async ({ event, step }) => {
    const { sessionId, centerId, classId } = event.data;

    // Debounce: wait 2 minutes for rapid edits to settle
    await step.sleep("debounce-rapid-edits", "2m");

    // Re-fetch current session state (gets final values after rapid edits)
    const session = await step.run("fetch-session", async () => {
      const prisma = createPrisma();
      try {
        const db = getTenantedClient(prisma, centerId);
        const result = await db.classSession.findUnique({
          where: { id: sessionId },
          include: {
            class: {
              include: {
                course: { select: { name: true } },
              },
            },
          },
        });
        if (!result) return null;
        return {
          id: result.id,
          classId: result.classId,
          startTime: result.startTime.toISOString(),
          endTime: result.endTime.toISOString(),
          roomName: result.roomName,
          className: result.class.name,
          courseName: result.class.course.name,
        };
      } finally {
        await prisma.$disconnect();
      }
    });

    // Session may have been deleted between event and execution
    if (!session) return { status: "session-deleted" };

    // Fetch recipients filtered by email preference
    const recipients = await step.run("fetch-recipients", async () => {
      return fetchRecipientsForClass(centerId, classId);
    });

    if (recipients.length === 0) return { status: "no-recipients", sent: 0 };

    // Fetch center name for email template
    const centerName = await step.run("fetch-center-name", async () => {
      return fetchCenterName(centerId);
    });

    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM ?? "noreply@classlite.com";
    const webappUrl = process.env.WEBAPP_URL ?? "http://localhost:5173";
    const scheduleUrl = `${webappUrl}/${centerId}/logistics/scheduler`;

    // Send emails — one step per recipient for resilient retries.
    // Each step returns its result so sentCount survives Inngest memoization on retries.
    const results: { sent: boolean }[] = [];

    for (const recipient of recipients) {
      const result = await step.run(
        `send-email-${recipient.id}`,
        async () => {
          const prisma = createPrisma();
          try {
            const resend = resendApiKey ? new Resend(resendApiKey) : null;
            const db = getTenantedClient(prisma, centerId);
            const locale = (
              recipient.preferredLanguage === "vi" ? "vi" : "en"
            ) as "en" | "vi";

            if (resend && recipient.email) {
              try {
                const { subject, html } = buildScheduleChangeEmail({
                  courseName: session.courseName,
                  className: session.className,
                  oldStartTime: new Date(event.data.previousStartTime),
                  oldEndTime: new Date(event.data.previousEndTime),
                  newStartTime: new Date(session.startTime),
                  newEndTime: new Date(session.endTime),
                  oldRoomName: event.data.previousRoomName,
                  newRoomName: session.roomName,
                  scheduleUrl,
                  centerName,
                  recipientName: recipient.name,
                  locale,
                });

                await resend.emails.send({
                  from: emailFrom,
                  to: recipient.email,
                  subject,
                  html,
                });

                await db.emailLog.create({
                  data: {
                    recipientId: recipient.id,
                    centerId,
                    type: "schedule-change",
                    status: "sent",
                    subject,
                  },
                });
                return { sent: true };
              } catch (err) {
                await db.emailLog.create({
                  data: {
                    recipientId: recipient.id,
                    centerId,
                    type: "schedule-change",
                    status: "failed",
                    error: String(err),
                  },
                });
                return { sent: false };
              }
            } else {
              await db.emailLog.create({
                data: {
                  recipientId: recipient.id,
                  centerId,
                  type: "schedule-change",
                  status: "skipped",
                },
              });
              return { sent: false };
            }
          } finally {
            await prisma.$disconnect();
          }
        },
      );
      results.push(result);
    }

    return {
      status: "completed",
      sent: results.filter((r) => r.sent).length,
    };
  },
);

/**
 * Inngest job: sends cancellation email notifications.
 * No debounce — cancellations are definitive and sent immediately.
 */
export const sessionCancellationEmailJob = inngest.createFunction(
  {
    id: "session-cancellation-email",
    retries: 3,
  },
  { event: "logistics/session.cancelled" },
  async ({ event, step }) => {
    const {
      centerId,
      classId,
      originalStartTime,
      originalEndTime,
      roomName,
      isBulk,
      deletedCount,
    } = event.data;

    // Fetch recipients filtered by email preference
    const recipients = await step.run("fetch-recipients", async () => {
      return fetchRecipientsForClass(centerId, classId);
    });

    if (recipients.length === 0) return { status: "no-recipients", sent: 0 };

    // Fetch class and course info
    const classInfo = await step.run("fetch-class-info", async () => {
      const prisma = createPrisma();
      try {
        const db = getTenantedClient(prisma, centerId);
        const classData = await db.class.findUnique({
          where: { id: classId },
          include: { course: { select: { name: true } } },
        });
        return {
          courseName: classData?.course.name ?? "Course",
          className: classData?.name ?? "Class",
        };
      } finally {
        await prisma.$disconnect();
      }
    });

    // Fetch center name for email template
    const centerName = await step.run("fetch-center-name", async () => {
      return fetchCenterName(centerId);
    });

    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM ?? "noreply@classlite.com";
    const webappUrl = process.env.WEBAPP_URL ?? "http://localhost:5173";
    const scheduleUrl = `${webappUrl}/${centerId}/logistics/scheduler`;

    // Each step returns its result so sentCount survives Inngest memoization on retries.
    const results: { sent: boolean }[] = [];

    for (const recipient of recipients) {
      const result = await step.run(
        `send-cancellation-${recipient.id}`,
        async () => {
          const prisma = createPrisma();
          try {
            const resend = resendApiKey ? new Resend(resendApiKey) : null;
            const db = getTenantedClient(prisma, centerId);
            const locale = (
              recipient.preferredLanguage === "vi" ? "vi" : "en"
            ) as "en" | "vi";

            if (resend && recipient.email) {
              try {
                const { subject, html } = buildSessionCancelledEmail({
                  courseName: classInfo.courseName,
                  className: classInfo.className,
                  originalStartTime: new Date(originalStartTime),
                  originalEndTime: new Date(originalEndTime),
                  roomName,
                  scheduleUrl,
                  centerName,
                  recipientName: recipient.name,
                  locale,
                  isBulk,
                  deletedCount,
                });

                await resend.emails.send({
                  from: emailFrom,
                  to: recipient.email,
                  subject,
                  html,
                });

                await db.emailLog.create({
                  data: {
                    recipientId: recipient.id,
                    centerId,
                    type: "session-cancelled",
                    status: "sent",
                    subject,
                  },
                });
                return { sent: true };
              } catch (err) {
                await db.emailLog.create({
                  data: {
                    recipientId: recipient.id,
                    centerId,
                    type: "session-cancelled",
                    status: "failed",
                    error: String(err),
                  },
                });
                return { sent: false };
              }
            } else {
              await db.emailLog.create({
                data: {
                  recipientId: recipient.id,
                  centerId,
                  type: "session-cancelled",
                  status: "skipped",
                },
              });
              return { sent: false };
            }
          } finally {
            await prisma.$disconnect();
          }
        },
      );
      results.push(result);
    }

    return {
      status: "completed",
      sent: results.filter((r) => r.sent).length,
    };
  },
);
