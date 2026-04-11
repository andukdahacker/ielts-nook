import { memo } from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useTranslation } from "react-i18next";
import { useInterventionHistory } from "../hooks/use-intervention";

const STATUS_STYLES: Record<string, { className: string; labelKey: string }> = {
  PENDING: { className: "bg-amber-100 text-amber-800", labelKey: "history.statusPending" },
  SENT: { className: "bg-emerald-100 text-emerald-800", labelKey: "history.statusSent" },
  FAILED: { className: "bg-red-100 text-red-800", labelKey: "history.statusFailed" },
  SKIPPED: { className: "bg-gray-100 text-gray-800", labelKey: "history.statusSkipped" },
};

interface InterventionHistoryTabProps {
  studentId: string;
}

const InterventionRow = memo(function InterventionRow({
  recipientEmail,
  subject,
  status,
  sentAt,
}: {
  recipientEmail: string;
  subject: string;
  status: string;
  sentAt: string;
}) {
  const { t } = useTranslation("student-health");
  const style = STATUS_STYLES[status];
  const className = style?.className ?? "bg-gray-100 text-gray-800";
  const label = style ? t(style.labelKey) : status;

  return (
    <div className="flex items-start justify-between py-2 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{subject}</p>
        <p className="text-xs text-muted-foreground">{recipientEmail}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(sentAt).toLocaleDateString()}
        </p>
      </div>
      <Badge variant="secondary" className={`ml-2 ${className}`}>
        {label}
      </Badge>
    </div>
  );
});

export function InterventionHistoryTab({
  studentId,
}: InterventionHistoryTabProps) {
  const { t } = useTranslation("student-health");
  const { history, isLoading } = useInterventionHistory(studentId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        {t("history.noInterventions")}
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {history.map((item) => (
        <InterventionRow
          key={item.id}
          recipientEmail={item.recipientEmail}
          subject={item.subject}
          status={item.status}
          sentAt={item.sentAt}
        />
      ))}
    </div>
  );
}
