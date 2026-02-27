import { Card, CardContent } from "@workspace/ui/components/card";
import { CreditCard, Users, DollarSign, Calendar } from "lucide-react";

const TIER_DISPLAY: Record<string, string> = {
  pilot: "Free Pilot",
  starter: "Starter",
  growth: "Growth",
  enterprise: "Enterprise",
};

interface BillingMetricCardsProps {
  tier: string;
  enrolledStudents: number;
  monthlyEstimateCents: number;
  currency: string;
  currentPeriodEnd: string | null;
}

export function BillingMetricCards({
  tier,
  enrolledStudents,
  monthlyEstimateCents,
  currency,
  currentPeriodEnd,
}: BillingMetricCardsProps) {
  const formattedEstimate = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(monthlyEstimateCents / 100);
  const nextBilling = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString()
    : "N/A";

  const metrics = [
    {
      label: "Plan",
      value: TIER_DISPLAY[tier] ?? tier,
      icon: CreditCard,
    },
    {
      label: "Enrolled Students",
      value: enrolledStudents.toString(),
      icon: Users,
    },
    {
      label: "Monthly Estimate",
      value: formattedEstimate,
      icon: DollarSign,
    },
    {
      label: "Next Billing",
      value: nextBilling,
      icon: Calendar,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.label}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <metric.icon className="h-4 w-4" />
              <span className="text-sm">{metric.label}</span>
            </div>
            <p className="text-2xl font-bold">{metric.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
