import { z } from "zod";

// Tier definitions
export const BillingTierSchema = z.enum(["pilot", "starter", "growth", "enterprise"]);
export type BillingTier = z.infer<typeof BillingTierSchema>;

// Subscription status
export const SubscriptionStatusSchema = z.enum([
  "pilot", "active", "past_due", "canceled", "grace_period", "inactive",
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

// Billing overview response
export const BillingOverviewSchema = z.object({
  subscription: z.object({
    status: SubscriptionStatusSchema,
    tier: BillingTierSchema,
    currentPeriodEnd: z.string().nullable(),
    cancelAtPeriodEnd: z.boolean(),
    polarCustomerId: z.string().nullable(),
  }),
  usage: z.object({
    enrolledStudents: z.number(),
    monthlyEstimateCents: z.number(),
    currency: z.string(),
  }),
  portalUrl: z.string().nullable(),
});
export type BillingOverview = z.infer<typeof BillingOverviewSchema>;

// Payment history item
export const BillingEventResponseSchema = z.object({
  id: z.string(),
  type: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
  description: z.string().nullable(),
  invoiceUrl: z.string().nullable(),
  occurredAt: z.string(),
});
export type BillingEventResponse = z.infer<typeof BillingEventResponseSchema>;

// Payment history paginated response
export const PaymentHistorySchema = z.object({
  items: z.array(BillingEventResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
export type PaymentHistory = z.infer<typeof PaymentHistorySchema>;

// Usage chart data point
export const UsageDataPointSchema = z.object({
  month: z.string(), // ISO date string (first of month)
  count: z.number(),
});
export type UsageDataPoint = z.infer<typeof UsageDataPointSchema>;

// Usage history response
export const UsageHistorySchema = z.object({
  snapshots: z.array(UsageDataPointSchema),
  currentCount: z.number(),
});
export type UsageHistory = z.infer<typeof UsageHistorySchema>;
