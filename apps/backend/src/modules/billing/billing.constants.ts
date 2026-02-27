export interface TierConfig {
  name: string;
  displayName: string;
  perStudentCents: number; // Monthly per-student rate in cents
  maxStudents: number | null; // null = unlimited
}

export const TIERS: Record<string, TierConfig> = {
  pilot: {
    name: "pilot",
    displayName: "Free Pilot",
    perStudentCents: 0,
    maxStudents: null,
  },
  starter: {
    name: "starter",
    displayName: "Starter",
    perStudentCents: 500, // $5.00/student/month
    maxStudents: 30,
  },
  growth: {
    name: "growth",
    displayName: "Growth",
    perStudentCents: 400, // $4.00/student/month
    maxStudents: 100,
  },
  enterprise: {
    name: "enterprise",
    displayName: "Enterprise",
    perStudentCents: 300, // $3.00/student/month
    maxStudents: null,
  },
};

export function calculateMonthlyEstimate(tier: string, studentCount: number): number {
  const config = TIERS[tier];
  if (!config) return 0;
  return config.perStudentCents * studentCount;
}
