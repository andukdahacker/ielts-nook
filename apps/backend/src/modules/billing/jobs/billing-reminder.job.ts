import { inngest } from "../../inngest/client.js";
import { createPrisma } from "../../../plugins/create-prisma.js";
import { getTenantedClient } from "@workspace/db";
import { Resend } from "resend";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export const billingReminderJob = inngest.createFunction(
  {
    id: "billing-renewal-reminder",
    retries: 3,
  },
  { cron: "0 9 * * *" }, // Daily at 9am UTC (4pm Vietnam)
  async ({ step }) => {
    // Step 1: Find subscriptions with upcoming renewals
    const upcomingRenewals = await step.run("find-upcoming-renewals", async () => {
      const prisma = createPrisma();
      try {
        const subscriptions = await prisma.subscription.findMany({
          where: {
            status: "active",
            currentPeriodEnd: { not: null },
          },
          select: {
            centerId: true,
            currentPeriodEnd: true,
            tier: true,
          },
        });

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        return subscriptions
          .filter((sub) => {
            const renewalDate = new Date(sub.currentPeriodEnd!);
            renewalDate.setUTCHours(0, 0, 0, 0);
            const diffDays = Math.round(
              (renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
            );
            return diffDays === 7 || diffDays === 1;
          })
          .map((sub) => {
            const renewalDate = new Date(sub.currentPeriodEnd!);
            renewalDate.setUTCHours(0, 0, 0, 0);
            const diffDays = Math.round(
              (renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
            );
            return {
              centerId: sub.centerId,
              tier: sub.tier,
              renewalDate: sub.currentPeriodEnd!.toISOString(),
              daysUntilRenewal: diffDays,
            };
          });
      } finally {
        await prisma.$disconnect();
      }
    });

    if (upcomingRenewals.length === 0) {
      return { status: "completed", remindersSent: 0 };
    }

    // Step 2: Send reminder email for each center
    let remindersSent = 0;
    for (const renewal of upcomingRenewals) {
      const sent = await step.run(`send-reminder-${renewal.centerId}`, async () => {
        const prisma = createPrisma();
        try {
          // Find center owner email (tenanted query)
          const db = getTenantedClient(prisma, renewal.centerId);
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

          const renewalDateFormatted = new Date(renewal.renewalDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });

          const subject =
            renewal.daysUntilRenewal === 7
              ? "Your ClassLite subscription renews in 7 days"
              : "Your ClassLite subscription renews tomorrow";

          const escTier = escapeHtml(renewal.tier);
          const escDate = escapeHtml(renewalDateFormatted);
          const escUrl = escapeHtml(`${frontendUrl}/${renewal.centerId}/dashboard/settings/billing`);

          await resend.emails.send({
            from: emailFrom,
            to: ownerMembership.user.email,
            subject,
            html: `
              <h1>Subscription Renewal Reminder</h1>
              <p>Your ClassLite <strong>${escTier}</strong> subscription will renew on <strong>${escDate}</strong>.</p>
              <p>No action is needed if you'd like to continue your subscription.</p>
              <p>To manage your billing settings, visit:</p>
              <a href="${escUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 6px;">Manage Billing</a>
            `,
          });

          return true;
        } finally {
          await prisma.$disconnect();
        }
      });
      if (sent) remindersSent++;
    }

    return { status: "completed", remindersSent };
  },
);
