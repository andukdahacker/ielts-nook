import type { HealthStatus, HealthSummary } from "@workspace/types";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Users, AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface HealthSummaryBarProps {
  summary: HealthSummary;
  isLoading: boolean;
  onFilterClick?: (status: HealthStatus | null) => void;
}

const METRICS = [
  {
    key: "total" as const,
    labelKey: "summary.totalStudents",
    icon: Users,
    filterValue: null as HealthStatus | null,
    color: "",
  },
  {
    key: "atRisk" as const,
    labelKey: "summary.atRisk",
    icon: AlertTriangle,
    filterValue: "at-risk" as HealthStatus,
    color: "text-red-600",
  },
  {
    key: "warning" as const,
    labelKey: "summary.warning",
    icon: AlertCircle,
    filterValue: "warning" as HealthStatus,
    color: "text-amber-600",
  },
  {
    key: "onTrack" as const,
    labelKey: "summary.onTrack",
    icon: CheckCircle,
    filterValue: "on-track" as HealthStatus,
    color: "text-emerald-600",
  },
];

export function HealthSummaryBar({
  summary,
  isLoading,
  onFilterClick,
}: HealthSummaryBarProps) {
  const { t } = useTranslation("student-health");
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {METRICS.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card
            key={metric.key}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onFilterClick?.(metric.filterValue)}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${metric.color}`} />
                <span className={`text-2xl font-bold ${metric.color}`}>
                  {summary[metric.key]}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {t(metric.labelKey)}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
