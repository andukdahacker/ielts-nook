interface UsageDataPoint {
  month: string;
  count: number;
}

interface UsageChartProps {
  snapshots: UsageDataPoint[];
  currentCount: number;
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function UsageChart({ snapshots, currentCount }: UsageChartProps) {
  if (snapshots.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Student Usage (Last 6 Months)
        </h3>
        <div className="border rounded-lg p-6 text-center text-muted-foreground">
          <p>Current enrolled students: <span className="font-semibold text-foreground">{currentCount}</span></p>
          <p className="text-sm mt-1">Student count tracking starts next month.</p>
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...snapshots.map((s) => s.count), currentCount, 1);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">
        Student Usage (Last 6 Months)
      </h3>
      <div className="space-y-2">
        {snapshots.map((snapshot) => {
          const date = new Date(snapshot.month);
          const label = MONTH_LABELS[date.getMonth()];
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
