import { PrismaClient } from "@workspace/db";
import { getTenantedClient } from "@workspace/db";
import { calculateMonthlyEstimate } from "./billing.constants.js";

export class BillingService {
  constructor(private prisma: PrismaClient) {}

  async getBillingInfo(centerId: string) {
    // Get-or-create subscription (pilot default)
    const subscription = await this.prisma.subscription.upsert({
      where: { centerId },
      create: { centerId, status: "pilot", tier: "pilot" },
      update: {}, // No-op if exists
    });

    // Count enrolled students (active STUDENT members)
    const db = getTenantedClient(this.prisma, centerId);
    const enrolledStudents = await db.centerMembership.count({
      where: { role: "STUDENT", status: "ACTIVE" },
    });

    const monthlyEstimateCents = calculateMonthlyEstimate(
      subscription.tier,
      enrolledStudents,
    );

    const portalUrl = this.getPortalUrl(subscription.polarCustomerId);

    return {
      subscription: {
        status: subscription.status,
        tier: subscription.tier,
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        polarCustomerId: subscription.polarCustomerId,
      },
      usage: {
        enrolledStudents,
        monthlyEstimateCents,
        currency: "USD",
      },
      portalUrl,
    };
  }

  async getPaymentHistory(centerId: string, page: number, limit: number) {
    const db = getTenantedClient(this.prisma, centerId);
    const [items, total] = await Promise.all([
      db.billingEvent.findMany({
        orderBy: { occurredAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          type: true,
          amount: true,
          currency: true,
          status: true,
          description: true,
          invoiceUrl: true,
          occurredAt: true,
        },
      }),
      db.billingEvent.count(),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        occurredAt: item.occurredAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  async getUsageHistory(centerId: string) {
    // Last 6 months of snapshots (UTC to match snapshot storage)
    const now = new Date();
    const sixMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 6, 1));

    const db = getTenantedClient(this.prisma, centerId);
    const snapshots = await db.studentCountSnapshot.findMany({
      where: { month: { gte: sixMonthsAgo } },
      orderBy: { month: "asc" },
      select: { month: true, count: true },
    });

    // Current live count
    const currentCount = await db.centerMembership.count({
      where: { role: "STUDENT", status: "ACTIVE" },
    });

    return {
      snapshots: snapshots.map((s) => ({
        month: s.month.toISOString(),
        count: s.count,
      })),
      currentCount,
    };
  }

  async snapshotStudentCount(centerId: string) {
    const db = getTenantedClient(this.prisma, centerId);
    const count = await db.centerMembership.count({
      where: { role: "STUDENT", status: "ACTIVE" },
    });

    const now = new Date();
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    await this.prisma.studentCountSnapshot.upsert({
      where: { centerId_month: { centerId, month } },
      create: { centerId, count, month },
      update: { count },
    });
  }

  private getPortalUrl(polarCustomerId: string | null): string | null {
    if (!polarCustomerId) return null;
    const portalBase = process.env.POLAR_PORTAL_URL;
    if (!portalBase) return null;
    return portalBase;
  }
}
