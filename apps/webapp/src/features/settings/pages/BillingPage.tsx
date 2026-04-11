import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useBillingOverview, usePaymentHistory, useUsageHistory, useCreateCheckout, useTiers, billingKeys } from "../billing.api";
import { BillingMetricCards } from "../components/BillingMetricCards";
import { TierComparisonTable } from "../components/TierComparisonTable";
import { DowngradeConfirmDialog } from "../components/DowngradeConfirmDialog";
import { UsageChart } from "../components/UsageChart";
import { PaymentHistoryTable } from "../components/PaymentHistoryTable";

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="border border-destructive/50 rounded-lg p-6 text-center text-muted-foreground">
      <AlertCircle className="h-5 w-5 text-destructive mx-auto mb-2" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function getStatusConfig(t: (key: string) => string): Record<string, { label: string; className: string }> {
  return {
    active: { label: t("billing.statusActive"), className: "bg-green-100 text-green-800" },
    past_due: { label: t("billing.statusPastDue"), className: "bg-red-100 text-red-800" },
    canceled: { label: t("billing.statusCanceled"), className: "bg-gray-100 text-gray-600" },
    pilot: { label: t("billing.statusPilot"), className: "bg-blue-100 text-blue-800" },
    inactive: { label: t("billing.statusInactive"), className: "bg-gray-100 text-gray-600" },
    grace_period: { label: t("billing.statusGracePeriod"), className: "bg-amber-100 text-amber-800" },
  };
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation("settings");
  const statusConfig = getStatusConfig(t);
  const { label, className } = statusConfig[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

function SubscriptionAction({
  status,
  portalUrl,
}: {
  status: string;
  portalUrl: string | null;
}) {
  const { t } = useTranslation("settings");
  return (
    <div className="flex items-center gap-3">
      <StatusBadge status={status} />
      {(status === "past_due" || status === "grace_period" || status === "inactive") && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => portalUrl && window.open(portalUrl, "_blank")}
          disabled={!portalUrl}
        >
          {t("billing.updatePayment")}
        </Button>
      )}
      {status !== "pilot" && status !== "past_due" && status !== "grace_period" && status !== "inactive" && (
        <Button
          variant="outline"
          onClick={() => portalUrl && window.open(portalUrl, "_blank")}
          disabled={!portalUrl}
        >
          {t("billing.changePlan")}
        </Button>
      )}
    </div>
  );
}

export function BillingPage() {
  const { t } = useTranslation("settings");
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { data: overview, isLoading: overviewLoading, isError: overviewError } = useBillingOverview();
  const { data: tiers, isLoading: tiersLoading } = useTiers();
  const { data: payments, isLoading: paymentsLoading, isError: paymentsError } = usePaymentHistory();
  const { data: usage, isLoading: usageLoading, isError: usageError } = useUsageHistory();
  const checkout = useCreateCheckout();

  const [downgradeTarget, setDowngradeTarget] = useState<{
    tierName: string;
    maxStudents: number;
  } | null>(null);

  useEffect(() => {
    if (overviewError) toast.error("Failed to load billing overview");
  }, [overviewError]);

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      queryClient.invalidateQueries({ queryKey: billingKeys.all });
      toast.success(t("billing.toastSuccess"));
      const next = new URLSearchParams(searchParams);
      next.delete("checkout");
      setSearchParams(next, { replace: true });
    }
    // Dormant: fires when Polar portal return URL includes ?plan_changed=true
    if (searchParams.get("plan_changed") === "true") {
      queryClient.invalidateQueries({ queryKey: billingKeys.all });
      toast.success(t("billing.toastPlanUpdated"));
      const next = new URLSearchParams(searchParams);
      next.delete("plan_changed");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, queryClient, setSearchParams, t]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("billing.heading")}</h2>
        <p className="text-muted-foreground">
          {t("billing.description")}
        </p>
      </div>

      {overviewLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : overviewError ? (
        <ErrorBanner message={t("billing.errorOverview")} />
      ) : overview ? (
        <>
          <BillingMetricCards
            tier={overview.subscription.tier}
            enrolledStudents={overview.usage.enrolledStudents}
            monthlyEstimateCents={overview.usage.monthlyEstimateCents}
            currency={overview.usage.currency}
            currentPeriodEnd={overview.subscription.currentPeriodEnd}
          />

          <SubscriptionAction
            status={overview.subscription.status}
            portalUrl={overview.portalUrl}
          />
        </>
      ) : null}

      {tiersLoading ? (
        <Skeleton className="h-64 rounded-lg" />
      ) : tiers && overview ? (
        <TierComparisonTable
          tiers={tiers.tiers}
          currentTier={tiers.currentTier}
          enrolledStudents={tiers.enrolledStudents}
          portalUrl={overview.portalUrl}
          currency={overview.usage.currency}
          onCheckout={(tier) => {
            const popup = window.open("about:blank", "_blank");
            checkout.mutate(tier, {
              onSuccess: (data) => {
                if (popup && !popup.closed) {
                  popup.location.href = data.checkoutUrl;
                } else {
                  window.location.href = data.checkoutUrl;
                }
              },
              onError: () => {
                popup?.close();
              },
            });
          }}
          isCheckoutPending={checkout.isPending}
          onDowngradeConfirm={(tier) => {
            if (tier.maxStudents !== null) {
              setDowngradeTarget({
                tierName: tier.displayName,
                maxStudents: tier.maxStudents,
              });
            }
          }}
        />
      ) : null}

      {downgradeTarget && tiers && overview?.portalUrl && (
        <DowngradeConfirmDialog
          open={!!downgradeTarget}
          onOpenChange={(open) => {
            if (!open) setDowngradeTarget(null);
          }}
          onConfirm={() => {
            window.open(overview.portalUrl!, "_blank");
            setDowngradeTarget(null);
          }}
          tierName={downgradeTarget.tierName}
          maxStudents={downgradeTarget.maxStudents}
          enrolledStudents={tiers.enrolledStudents}
        />
      )}

      {usageLoading ? (
        <Skeleton className="h-48 rounded-lg" />
      ) : usageError ? (
        <ErrorBanner message={t("billing.errorUsage")} />
      ) : usage ? (
        <UsageChart snapshots={usage.snapshots} currentCount={usage.currentCount} />
      ) : null}

      {paymentsLoading ? (
        <Skeleton className="h-32 rounded-lg" />
      ) : paymentsError ? (
        <ErrorBanner message={t("billing.errorPayments")} />
      ) : payments ? (
        <PaymentHistoryTable items={payments.items} total={payments.total} />
      ) : null}
    </div>
  );
}
