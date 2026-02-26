import { inngest } from "../../inngest/client.js";
import { getTenantedClient } from "@workspace/db";
import { createPrisma } from "../../../plugins/create-prisma.js";
import { Resend } from "resend";
import { escapeHtml } from "../../logistics/emails/format-utils.js";

export type InterventionEmailEvent = {
  name: "student-health/intervention.send";
  data: {
    interventionLogId: string;
    centerId: string;
    recipientEmail: string;
    subject: string;
    body: string;
  };
};

export const interventionEmailJob = inngest.createFunction(
  {
    id: "intervention-email",
    retries: 3,
  },
  { event: "student-health/intervention.send" },
  async ({ event, step }) => {
    const {
      interventionLogId,
      centerId,
      recipientEmail,
      subject,
      body,
    } = event.data;

    // Early-return guard: skip if RESEND_API_KEY is not set
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      await step.run("mark-skipped", async () => {
        const prisma = createPrisma();
        try {
          const db = getTenantedClient(prisma, centerId);
          await db.interventionLog.update({
            where: { id: interventionLogId },
            data: { status: "SKIPPED" },
          });
        } finally {
          await prisma.$disconnect();
        }
      });
      console.warn(
        `[intervention-email] Skipping send for ${interventionLogId}: RESEND_API_KEY not set`,
      );
      return { status: "skipped", reason: "no-api-key" };
    }

    // Look up unsubscribe token for this parent email
    const unsubscribeUrl = await step.run("lookup-unsubscribe", async () => {
      const prisma = createPrisma();
      try {
        // Fetch studentId from intervention log
        const db = getTenantedClient(prisma, centerId);
        const intervention = await db.interventionLog.findUnique({
          where: { id: interventionLogId },
          select: { studentId: true },
        });
        if (!intervention) return null;

        // ParentEmail is NOT tenanted — use raw prisma
        const parentEmailRecord = await prisma.parentEmail.findFirst({
          where: { userId: intervention.studentId, email: recipientEmail },
          select: { unsubscribeToken: true },
        });
        if (!parentEmailRecord) return null;

        const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";
        return `${backendUrl}/api/v1/unsubscribe/${parentEmailRecord.unsubscribeToken}`;
      } finally {
        await prisma.$disconnect();
      }
    });

    // Inject unsubscribe link into body HTML if available
    let finalBody = body;
    if (unsubscribeUrl) {
      const unsubLink = `<p style="margin:8px 0 0;font-size:12px;color:#a1a1aa;text-align:center;"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#a1a1aa;text-decoration:underline;">Unsubscribe from these notifications</a></p>`;
      finalBody = body.replace("</body>", `${unsubLink}</body>`);
    }

    // Send email via Resend
    const sendResult = await step.run("send-email", async () => {
      const resend = new Resend(resendApiKey);
      const emailFrom = process.env.EMAIL_FROM ?? "noreply@classlite.com";

      try {
        await resend.emails.send({
          from: emailFrom,
          to: recipientEmail,
          subject,
          html: finalBody,
        });
        return { sent: true, error: null };
      } catch (err) {
        return { sent: false, error: String(err) };
      }
    });

    // Update InterventionLog status
    await step.run("update-intervention-log", async () => {
      const prisma = createPrisma();
      try {
        const db = getTenantedClient(prisma, centerId);
        await db.interventionLog.update({
          where: { id: interventionLogId },
          data: {
            status: sendResult.sent ? "SENT" : "FAILED",
            error: sendResult.error,
            sentAt: sendResult.sent ? new Date() : undefined,
          },
        });
      } finally {
        await prisma.$disconnect();
      }
    });

    // Log to EmailLog for delivery tracking
    await step.run("log-email", async () => {
      const prisma = createPrisma();
      try {
        const db = getTenantedClient(prisma, centerId);
        // Fetch the intervention to get studentId for EmailLog recipientId
        const intervention = await db.interventionLog.findUnique({
          where: { id: interventionLogId },
          select: { studentId: true },
        });
        if (intervention) {
          await db.emailLog.create({
            data: {
              recipientId: intervention.studentId,
              centerId,
              type: "intervention",
              status: sendResult.sent ? "sent" : "failed",
              subject,
              error: sendResult.error,
            },
          });
        }
      } finally {
        await prisma.$disconnect();
      }
    });

    return {
      status: sendResult.sent ? "sent" : "failed",
      error: sendResult.error,
    };
  },
);
