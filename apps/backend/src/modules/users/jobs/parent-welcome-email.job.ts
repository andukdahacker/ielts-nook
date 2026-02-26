import { inngest } from "../../inngest/client.js";
import { createPrisma } from "../../../plugins/create-prisma.js";
import { getTenantedClient } from "@workspace/db";
import { Resend } from "resend";
import { buildParentWelcomeEmail } from "../emails/parent-welcome.template.js";

export type ParentEmailRegisteredEvent = {
  name: "parent-email/registered";
  data: {
    studentId: string;
    parentEmailId: string;
    centerId: string;
  };
};

export const parentWelcomeEmailJob = inngest.createFunction(
  { id: "parent-welcome-email", retries: 3 },
  { event: "parent-email/registered" },
  async ({ event, step }) => {
    const { studentId, parentEmailId, centerId } = event.data;

    // Step 1: Fetch parent email record + student name + center
    const data = await step.run("fetch-data", async () => {
      const prisma = createPrisma();
      try {
        const parentEmail = await prisma.parentEmail.findUnique({
          where: { id: parentEmailId },
          select: { email: true, unsubscribeToken: true },
        });
        if (!parentEmail) return null;

        const user = await prisma.user.findUnique({
          where: { id: studentId },
          select: { name: true, preferredLanguage: true },
        });

        const center = await prisma.center.findUnique({
          where: { id: centerId },
          select: { name: true },
        });

        return {
          email: parentEmail.email,
          unsubscribeToken: parentEmail.unsubscribeToken,
          studentName: user?.name ?? null,
          locale: (user?.preferredLanguage === "vi" ? "vi" : "en") as
            | "en"
            | "vi",
          centerName: center?.name ?? "ClassLite",
        };
      } finally {
        await prisma.$disconnect();
      }
    });

    if (!data) return { status: "parent-email-not-found" };

    // Step 2: Send welcome email
    await step.run("send-welcome-email", async () => {
      const prisma = createPrisma();
      try {
        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey) return { status: "no-resend-key" };

        const backendUrl =
          process.env.BACKEND_URL || "http://localhost:4000";
        const unsubscribeUrl = `${backendUrl}/api/v1/unsubscribe/${data.unsubscribeToken}`;

        const { subject, html } = buildParentWelcomeEmail({
          studentName: data.studentName,
          centerName: data.centerName,
          locale: data.locale,
          unsubscribeUrl,
        });

        const resend = new Resend(resendApiKey);
        const emailFrom =
          process.env.EMAIL_FROM || "ClassLite <noreply@classlite.app>";

        const db = getTenantedClient(prisma, centerId);
        try {
          await resend.emails.send({
            from: emailFrom,
            to: data.email,
            subject,
            html,
          });
          await db.emailLog.create({
            data: {
              recipientId: studentId,
              centerId,
              type: "parent-welcome",
              status: "sent",
              subject,
            },
          });
        } catch (err) {
          await db.emailLog.create({
            data: {
              recipientId: studentId,
              centerId,
              type: "parent-welcome",
              status: "failed",
              subject,
              error: String(err),
            },
          });
          throw err;
        }
      } finally {
        await prisma.$disconnect();
      }
    });

    return { status: "sent" };
  },
);
