import type { HealthStatus } from "@workspace/types";
import { useTranslation } from "react-i18next";

const STATUS_CONFIG: Record<
  HealthStatus,
  { dotColor: string; textColor: string; labelKey: string }
> = {
  "at-risk": {
    dotColor: "bg-red-500",
    textColor: "text-red-700",
    labelKey: "trafficLight.atRisk",
  },
  warning: {
    dotColor: "bg-amber-500",
    textColor: "text-amber-700",
    labelKey: "trafficLight.warning",
  },
  "on-track": {
    dotColor: "bg-emerald-500",
    textColor: "text-emerald-700",
    labelKey: "trafficLight.onTrack",
  },
};

interface TrafficLightBadgeProps {
  status: HealthStatus;
  size?: "sm" | "md";
}

export function TrafficLightBadge({
  status,
  size = "sm",
}: TrafficLightBadgeProps) {
  const { t } = useTranslation("student-health");
  const config = STATUS_CONFIG[status];
  const dotSize = size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3";
  const label = t(config.labelKey);

  return (
    <span
      className="inline-flex items-center gap-1.5"
      aria-label={t("trafficLight.ariaLabel", { status: label.toLowerCase() })}
    >
      <span className={`${dotSize} rounded-full ${config.dotColor}`} />
      <span className={`text-sm font-medium ${config.textColor}`}>
        {label}
      </span>
    </span>
  );
}
