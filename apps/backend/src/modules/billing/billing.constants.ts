export interface TierConfig {
  name: string;
  displayName: string;
  flatPriceCents: number; // Monthly flat price in cents
  maxStudents: number | null; // null = unlimited
}

export const TIERS: Record<string, TierConfig> = {
  pilot: {
    name: "pilot",
    displayName: "Free Pilot",
    flatPriceCents: 0,
    maxStudents: null,
  },
  starter: {
    name: "starter",
    displayName: "Starter",
    flatPriceCents: 2000, // $20/month
    maxStudents: 30,
  },
  growth: {
    name: "growth",
    displayName: "Growth",
    flatPriceCents: 5000, // $50/month
    maxStudents: 100,
  },
  enterprise: {
    name: "enterprise",
    displayName: "Enterprise",
    flatPriceCents: 10000, // $100/month
    maxStudents: null,
  },
};

export function calculateMonthlyEstimate(tier: string): number {
  const config = TIERS[tier];
  if (!config) return 0;
  return config.flatPriceCents;
}
