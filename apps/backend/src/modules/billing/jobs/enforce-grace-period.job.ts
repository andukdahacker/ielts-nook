import { inngest } from "../../inngest/client.js";
import { createPrisma } from "../../../plugins/create-prisma.js";
import { getTenantedClient } from "@workspace/db";
import { Resend } from "resend";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export const enforceGracePeriodJob = inngest.createFunction(
  {
    id: "billing-enforce-grace-period",
    retries: 3,
  },
  { cron: "0 0 * * *" }, // Daily at midnight UTC
  async ({ step }) => {
    // Step 1: Find expired grace periods
    const expiredCenters = await step.run("check-expired-grace-periods", async () => {
      const prisma = createPrisma();
      try {
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setUTCDate(fourteenDaysAgo.getUTCDate() - 14);

        const expired = await prisma.subscription.findMany({
          where: {
            status: "grace_period",
            gracePeriodStartedAt: { lt: fourteenDaysAgo },
          },
          select: { centerId: true },
        });

        return expired.map((s) => s.centerId);
      } finally {
        await prisma.$disconnect();
      }
    });

    if (expiredCenters.length === 0) {
      return { status: "completed", centersEnforced: 0 };
    }

    // Step 2: Enforce each expired center
    let centersEnforced = 0;
    for (const centerId of expiredCenters) {
      const enforced = await step.run(`enforce-${centerId}`, async () => {
        const prisma = createPrisma();
        try {
          // Update subscription to inactive
          await prisma.subscription.update({
            where: { centerId },
            data: {
              status: "inactive",
              gracePeriodStartedAt: null,
            },
          });

          // Send expiry notification to center owner (tenanted query)
          const db = getTenantedClient(prisma, centerId);
          const ownerMembership = await db.centerMembership.findFirst({
            where: {
              role: "OWNER",
              status: "ACTIVE",
            },
            select: { user: { select: { email: true } } },
          });

          if (!ownerMembership?.user?.email) return false;

          const resendApiKey = process.env.RESEND_API_KEY;
          if (!resendApiKey) return false;

          const resend = new Resend(resendApiKey);
          const emailFrom = process.env.EMAIL_FROM || "ClassLite <notifications@classlite.app>";
          const frontendUrl = process.env.FRONTEND_URL || "https://classlite.app";
          const escUrl = escapeHtml(`${frontendUrl}/${centerId}/dashboard/settings/billing`);

          await resend.emails.send({
            from: emailFrom,
            to: ownerMembership.user.email,
            subject: "Your ClassLite subscription grace period has expired",
            html: `
              <h1>Grace Period Expired</h1>
              <p>Your ClassLite subscription grace period has ended. New student enrollments are now restricted.</p>
              <p>Existing students can still access their submitted work and grades.</p>
              <p>To restore full access, please update your billing:</p>
              <a href="${escUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 6px;">Update Billing</a>
            `,
          });

          return true;
        } finally {
          await prisma.$disconnect();
        }
      });
      if (enforced) centersEnforced++;
    }

    return { status: "completed", centersEnforced };
  },
);
