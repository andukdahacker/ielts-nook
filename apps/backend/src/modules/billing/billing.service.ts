import { PrismaClient } from "@workspace/db";
import { getTenantedClient } from "@workspace/db";
import { TIERS, calculateMonthlyEstimate } from "./billing.constants.js";
import { getPolarClient } from "./polar.client.js";

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

    const monthlyEstimateCents = calculateMonthlyEstimate(subscription.tier);

    const portalUrl = await this.getCustomerPortalUrl(centerId);

    const gracePeriodDaysRemaining =
      subscription.status === "grace_period" && subscription.gracePeriodStartedAt
        ? Math.max(
            0,
            14 -
              Math.floor(
                (Date.now() - subscription.gracePeriodStartedAt.getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
          )
        : null;

    return {
      subscription: {
        status: subscription.status,
        tier: subscription.tier,
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        polarCustomerId: subscription.polarCustomerId,
        gracePeriodDaysRemaining,
      },
      usage: {
        enrolledStudents,
        monthlyEstimateCents,
        currency: "USD",
      },
      portalUrl,
    };
  }

  async getTierComparison(centerId: string) {
    // Get-or-create subscription (pilot default)
    const subscription = await this.prisma.subscription.upsert({
      where: { centerId },
      create: { centerId, status: "pilot", tier: "pilot" },
      update: {},
    });

    // Count enrolled students (active STUDENT members) — tenanted query
    const db = getTenantedClient(this.prisma, centerId);
    const enrolledStudents = await db.centerMembership.count({
      where: { role: "STUDENT", status: "ACTIVE" },
    });

    // Build tier comparison from TIERS constant, excluding pilot
    const tiers = Object.values(TIERS)
      .filter((t) => t.name !== "pilot")
      .map((t) => ({
        name: t.name as "starter" | "growth" | "enterprise",
        displayName: t.displayName,
        flatPriceCents: t.flatPriceCents,
        maxStudents: t.maxStudents,
        isCurrent: t.name === subscription.tier,
      }));

    return {
      tiers,
      currentTier: subscription.tier,
      enrolledStudents,
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

  async createCheckoutSession(centerId: string, ownerEmail: string, tier: string) {
    const polar = getPolarClient();
    const productId = this.getProductIdForTier(tier);
    if (!productId) {
      throw new Error(`No Polar product configured for tier: ${tier}`);
    }

    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
      throw new Error("FRONTEND_URL environment variable is required for checkout");
    }

    try {
      const checkout = await polar.checkouts.create({
        products: [productId],
        customerEmail: ownerEmail,
        metadata: { centerId },
        successUrl: `${frontendUrl}/${centerId}/dashboard/settings/billing?checkout=success`,
      });

      return { checkoutUrl: checkout.url };
    } catch (error) {
      throw new Error(
        `Failed to create checkout session: ${error instanceof Error ? error.message : "Unknown Polar API error"}`,
      );
    }
  }

  async handleSubscriptionEvent(eventType: string, data: Record<string, unknown>) {
    // Validate critical fields from webhook payload
    if (!data.id || typeof data.id !== "string") {
      throw new Error(`Invalid webhook payload: missing subscription id for ${eventType}`);
    }
    if (!data.customerId || typeof data.customerId !== "string") {
      throw new Error(`Invalid webhook payload: missing customerId for ${eventType}`);
    }

    const polarSubId = data.id as string;
    const customerId = data.customerId as string;
    const metadata = (data.metadata as Record<string, string>) ?? {};
    const centerId = metadata.centerId ?? await this.findCenterByPolarCustomer(customerId);
    if (!centerId) {
      throw new Error(`No center found for Polar customer: ${customerId}`);
    }

    const updateData: Record<string, unknown> = {
      polarSubscriptionId: polarSubId,
      polarCustomerId: customerId,
    };

    switch (eventType) {
      case "subscription.created": {
        const polarStatus = data.status as string;
        const productId = data.productId as string;
        // Only set active if Polar confirms; omit status to preserve existing
        // subscription state (prevents downgrading active → pilot from a stale
        // subscription.created webhook with status "incomplete")
        if (polarStatus === "active") {
          updateData.status = "active";
        }
        updateData.tier = this.mapProductToTier(productId);
        updateData.currentPeriodStart = data.currentPeriodStart
          ? new Date(data.currentPeriodStart as string) : undefined;
        updateData.currentPeriodEnd = data.currentPeriodEnd
          ? new Date(data.currentPeriodEnd as string) : undefined;
        updateData.cancelAtPeriodEnd = data.cancelAtPeriodEnd ?? false;
        break;
      }
      case "subscription.active": {
        const productId = data.productId as string;
        updateData.status = "active";
        updateData.tier = this.mapProductToTier(productId);
        updateData.currentPeriodStart = data.currentPeriodStart
          ? new Date(data.currentPeriodStart as string) : undefined;
        updateData.currentPeriodEnd = data.currentPeriodEnd
          ? new Date(data.currentPeriodEnd as string) : undefined;
        updateData.cancelAtPeriodEnd = data.cancelAtPeriodEnd ?? false;
        updateData.gracePeriodStartedAt = null;
        break;
      }
      case "subscription.updated": {
        const productId = data.productId as string;
        updateData.tier = this.mapProductToTier(productId);
        updateData.currentPeriodEnd = data.currentPeriodEnd
          ? new Date(data.currentPeriodEnd as string) : undefined;
        updateData.cancelAtPeriodEnd = data.cancelAtPeriodEnd ?? false;
        break;
      }
      case "subscription.past_due": {
        updateData.status = "grace_period";
        // Idempotent: only set gracePeriodStartedAt if not already in grace period
        const current = await this.prisma.subscription.findUnique({
          where: { centerId },
          select: { gracePeriodStartedAt: true },
        });
        if (!current?.gracePeriodStartedAt) {
          updateData.gracePeriodStartedAt = new Date();
        }
        break;
      }
      case "subscription.canceled":
        updateData.status = "canceled";
        updateData.cancelAtPeriodEnd = true;
        break;
      case "subscription.uncanceled":
        updateData.status = "active";
        updateData.cancelAtPeriodEnd = false;
        updateData.gracePeriodStartedAt = null;
        break;
      case "subscription.revoked":
        updateData.status = "inactive";
        updateData.gracePeriodStartedAt = null;
        break;
    }

    // Subscription is NOT tenanted — uses raw this.prisma
    await this.prisma.subscription.upsert({
      where: { centerId },
      create: {
        centerId,
        status: (updateData.status as string) ?? "pilot",
        tier: (updateData.tier as string) ?? "pilot",
        polarSubscriptionId: updateData.polarSubscriptionId as string,
        polarCustomerId: updateData.polarCustomerId as string,
        currentPeriodStart: updateData.currentPeriodStart as Date | undefined,
        currentPeriodEnd: updateData.currentPeriodEnd as Date | undefined,
        cancelAtPeriodEnd: (updateData.cancelAtPeriodEnd as boolean) ?? false,
      },
      update: updateData,
    });
  }

  async handleOrderPaidEvent(data: Record<string, unknown>) {
    const customerId = data.customerId as string;
    if (!customerId) return; // Invalid payload — skip

    const centerId = await this.findCenterByPolarCustomer(customerId);
    if (!centerId) return; // Skip if no center found

    const polarOrderId = data.id as string;
    if (!polarOrderId) return; // Invalid payload — skip

    // Use tenanted client for BillingEvent (it IS a tenanted model)
    const db = getTenantedClient(this.prisma, centerId);
    try {
      await db.billingEvent.create({
        data: {
          centerId,
          type: "payment",
          amount: (data.amount as number) ?? 0,
          currency: ((data.currency as string) ?? "usd").toUpperCase(),
          status: "paid",
          description: `Subscription payment — ${(data.product as Record<string, unknown>)?.name ?? "ClassLite"}`,
          polarOrderId,
          invoiceUrl: (data.invoiceUrl as string) ?? null,
          occurredAt: new Date((data.createdAt as string) ?? new Date().toISOString()),
        },
      });
    } catch (error: unknown) {
      // Idempotent: ignore unique constraint violation on polarOrderId (duplicate webhook)
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        return;
      }
      throw error;
    }
  }

  async getCustomerPortalUrl(centerId: string): Promise<string | null> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { centerId },
      select: { polarCustomerId: true },
    });
    if (!subscription?.polarCustomerId) return null;

    try {
      const polar = getPolarClient();
      const session = await polar.customerSessions.create({
        customerId: subscription.polarCustomerId,
      });
      return session.customerPortalUrl;
    } catch {
      // If Polar is not configured or session fails, return null gracefully
      return null;
    }
  }

  async checkEnrollmentAllowed(centerId: string): Promise<{ allowed: boolean; reason?: string }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { centerId },
      select: { status: true },
    });

    if (subscription?.status === "inactive") {
      return {
        allowed: false,
        reason: "Subscription inactive — payment required to enroll new students",
      };
    }

    return { allowed: true };
  }

  private async findCenterByPolarCustomer(polarCustomerId: string): Promise<string | null> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { polarCustomerId },
      select: { centerId: true },
    });
    return subscription?.centerId ?? null;
  }

  private getProductIdForTier(tier: string): string | null {
    const mapping: Record<string, string | undefined> = {
      starter: process.env.POLAR_PRODUCT_ID_STARTER,
      growth: process.env.POLAR_PRODUCT_ID_GROWTH,
      enterprise: process.env.POLAR_PRODUCT_ID_ENTERPRISE,
    };
    return mapping[tier] ?? null;
  }

  private mapProductToTier(productId: string): string {
    if (productId === process.env.POLAR_PRODUCT_ID_STARTER) return "starter";
    if (productId === process.env.POLAR_PRODUCT_ID_GROWTH) return "growth";
    if (productId === process.env.POLAR_PRODUCT_ID_ENTERPRISE) return "enterprise";
    return "starter"; // Default fallback
  }
}
