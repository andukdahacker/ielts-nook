import { useTranslation } from "react-i18next";
import { getIntlLocale } from "@/lib/locale-utils";

interface UsageDataPoint {
  month: string;
  count: number;
}

interface UsageChartProps {
  snapshots: UsageDataPoint[];
  currentCount: number;
}

export function UsageChart({ snapshots, currentCount }: UsageChartProps) {
  const { t } = useTranslation("settings");
  // Locale-aware short month names instead of hardcoded English.
  const monthFormatter = new Intl.DateTimeFormat(getIntlLocale(), {
    month: "short",
  });
  if (snapshots.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {t("billing.usageTitle")}
        </h3>
        <div className="border rounded-lg p-6 text-center text-muted-foreground">
          <p>{t("billing.usageCurrent", { currentCount })}</p>
          <p className="text-sm mt-1">{t("billing.usageTrackingStarts")}</p>
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...snapshots.map((s) => s.count), currentCount, 1);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">
        {t("billing.usageTitle")}
      </h3>
      <div className="space-y-2">
        {snapshots.map((snapshot) => {
          const date = new Date(snapshot.month);
          const label = !isNaN(date.getTime())
            ? monthFormatter.format(date)
            : snapshot.month;
          const widthPercent = (snapshot.count / maxCount) * 100;

          return (
            <div key={snapshot.month} className="flex items-center gap-2">
              <span className="w-10 text-xs text-muted-foreground">{label}</span>
              <div className="flex-1 bg-muted rounded-full h-6">
                <div
                  className="bg-primary rounded-full h-6 flex items-center justify-end px-2 transition-all"
                  style={{
                    width: `${widthPercent}%`,
                    minWidth: snapshot.count > 0 ? "2rem" : 0,
                  }}
                >
                  <span className="text-xs text-primary-foreground font-medium">
                    {snapshot.count}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
