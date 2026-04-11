import { Card, CardContent } from "@workspace/ui/components/card";
import { CreditCard, Users, DollarSign, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatCurrency, formatDate } from "@/lib/locale-utils";

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
  const { t } = useTranslation("settings");
  const formattedEstimate = formatCurrency(monthlyEstimateCents / 100, currency);
  const nextBilling = currentPeriodEnd
    ? formatDate(currentPeriodEnd)
    : t("billing.notAvailable");

  const TIER_DISPLAY: Record<string, string> = {
    pilot: t("billing.tierPilot"),
    starter: t("billing.tierStarter"),
    growth: t("billing.tierGrowth"),
    enterprise: t("billing.tierEnterprise"),
  };

  const metrics = [
    {
      label: t("billing.metricPlan"),
      value: TIER_DISPLAY[tier] ?? tier,
      icon: CreditCard,
    },
    {
      label: t("billing.metricEnrolledStudents"),
      value: enrolledStudents.toString(),
      icon: Users,
    },
    {
      label: t("billing.metricMonthlyEstimate"),
      value: formattedEstimate,
      icon: DollarSign,
    },
    {
      label: t("billing.metricNextBilling"),
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
