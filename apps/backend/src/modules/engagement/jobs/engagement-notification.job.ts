import { inngest } from "../../inngest/client.js";
import { createPrisma } from "../../../plugins/create-prisma.js";
import { getTenantedClient } from "@workspace/db";
import { Resend } from "resend";
import { buildEngagementEmail } from "../emails/engagement-notification.template.js";
import type { AchievementType } from "../emails/engagement-notification.template.js";
import {
  checkStreak,
  checkPersonalBest,
  wasEngagementEmailSentToday,
  getParentEmails,
} from "../engagement.service.js";

export type EngagementSubmissionGradedEvent = {
  name: "engagement/submission.graded";
  data: {
    studentId: string;
    centerId: string;
    submissionId: string;
    score: number | null;
  };
};

/** Send an email via Resend and log the result to EmailLog. */
async function sendAndLogEmail(opts: {
  to: string;
  studentId: string;
  centerId: string;
  subject: string;
  html: string;
  emailFrom: string;
  resendApiKey: string;
}): Promise<void> {
  const prisma = createPrisma();
  try {
    const resend = new Resend(opts.resendApiKey);
    const db = getTenantedClient(prisma, opts.centerId);
    try {
      await resend.emails.send({
        from: opts.emailFrom,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      });
      await db.emailLog.create({
        data: {
          recipientId: opts.studentId,
          centerId: opts.centerId,
          type: "engagement",
          status: "sent",
          subject: opts.subject,
        },
      });
    } catch (err) {
      await db.emailLog.create({
        data: {
          recipientId: opts.studentId,
          centerId: opts.centerId,
          type: "engagement",
          status: "failed",
          subject: opts.subject,
          error: String(err),
        },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

export const engagementNotificationJob = inngest.createFunction(
  { id: "engagement-email-notification", retries: 3 },
  { event: "engagement/submission.graded" },
  async ({ event, step }) => {
    const { studentId, centerId, submissionId, score } = event.data;

    // Step 1: Check achievements (streak + personal best)
    const achievements = await step.run("check-achievements", async () => {
      const prisma = createPrisma();
      try {
        const db = getTenantedClient(prisma, centerId);
        const streak = await checkStreak(db, studentId);
        const personalBest =
          score != null
            ? await checkPersonalBest(db, studentId, submissionId, score)
            : false;
        return { streak, personalBest };
      } finally {
        await prisma.$disconnect();
      }
    });

    if (!achievements.streak && !achievements.personalBest) {
      return { status: "no-achievements" };
    }

    // Step 2: Check daily batch limit (max 1 engagement email per student per day)
    const canSend = await step.run("check-batch-limit", async () => {
      const prisma = createPrisma();
      try {
        const db = getTenantedClient(prisma, centerId);
        const alreadySent = await wasEngagementEmailSentToday(
          db,
          studentId,
          centerId,
        );
        return !alreadySent;
      } finally {
        await prisma.$disconnect();
      }
    });

    if (!canSend) return { status: "batch-limited" };

    // Step 3: Fetch student details + parent emails
    const recipientData = await step.run("fetch-student", async () => {
      const prisma = createPrisma();
      try {
        const db = getTenantedClient(prisma, centerId);
        const user = await db.user.findUnique({
          where: { id: studentId },
          select: {
            id: true,
            email: true,
            name: true,
            preferredLanguage: true,
            parentEmail: true,
          },
        });
        if (!user) return null;
        const parentEmails = getParentEmails(user);
        return { ...user, parentEmails };
      } finally {
        await prisma.$disconnect();
      }
    });

    if (!recipientData?.email) return { status: "no-email" };

    // Step 4: Fetch center name (Center is NOT tenanted — use raw prisma)
    const centerName = await step.run("fetch-center", async () => {
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
    });

    // Determine achievement type
    const achievementType: AchievementType =
      achievements.streak && achievements.personalBest
        ? "combined"
        : achievements.streak
          ? "streak"
          : "personal-best";

    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM ?? "noreply@classlite.com";
    const webappUrl = process.env.WEBAPP_URL ?? "http://localhost:5173";
    const dashboardUrl = `${webappUrl}/dashboard`;

    const studentName = recipientData.name ?? "Student";
    const locale = (
      recipientData.preferredLanguage === "vi" ? "vi" : "en"
    ) as "en" | "vi";

    const { subject, html } = buildEngagementEmail({
      studentName,
      centerName,
      achievementType,
      score,
      dashboardUrl,
      locale,
    });

    // Step 5: Send email to student
    if (resendApiKey && recipientData.email) {
      await step.run("send-email-student", () =>
        sendAndLogEmail({
          to: recipientData.email!,
          studentId,
          centerId,
          subject,
          html,
          emailFrom,
          resendApiKey,
        }),
      );
    } else {
      await step.run("send-email-student", async () => {
        const prisma = createPrisma();
        try {
          const db = getTenantedClient(prisma, centerId);
          await db.emailLog.create({
            data: {
              recipientId: studentId,
              centerId,
              type: "engagement",
              status: "skipped",
              subject,
            },
          });
        } finally {
          await prisma.$disconnect();
        }
      });
    }

    // Step 6+: Send to each parent email
    for (const parentEmail of recipientData.parentEmails) {
      if (resendApiKey) {
        const safeStepId = parentEmail.replace(/[^a-zA-Z0-9@._-]/g, "_");
        await step.run(`send-email-parent-${safeStepId}`, () =>
          sendAndLogEmail({
            to: parentEmail,
            studentId,
            centerId,
            subject,
            html,
            emailFrom,
            resendApiKey,
          }),
        );
      }
    }

    return { status: "sent", achievementType };
  },
);
