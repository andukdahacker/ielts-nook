import { useEffect } from "react";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useBillingOverview, usePaymentHistory, useUsageHistory } from "../billing.api";
import { BillingMetricCards } from "../components/BillingMetricCards";
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

export function BillingPage() {
  const { data: overview, isLoading: overviewLoading, isError: overviewError } = useBillingOverview();
  const { data: payments, isLoading: paymentsLoading, isError: paymentsError } = usePaymentHistory();
  const { data: usage, isLoading: usageLoading, isError: usageError } = useUsageHistory();

  useEffect(() => {
    if (overviewError) toast.error("Failed to load billing overview");
  }, [overviewError]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Billing</h2>
        <p className="text-muted-foreground">
          View your billing status, student usage, and payment history.
        </p>
      </div>

      {overviewLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : overviewError ? (
        <ErrorBanner message="Unable to load billing information. Only center owners can access billing." />
      ) : overview ? (
        <>
          <BillingMetricCards
            tier={overview.subscription.tier}
            enrolledStudents={overview.usage.enrolledStudents}
            monthlyEstimateCents={overview.usage.monthlyEstimateCents}
            currency={overview.usage.currency}
            currentPeriodEnd={overview.subscription.currentPeriodEnd}
          />

          <Button
            variant="outline"
            disabled={!overview.portalUrl}
            onClick={() => {
              if (overview.portalUrl) {
                window.open(overview.portalUrl, "_blank");
              }
            }}
          >
            {overview.portalUrl ? "Manage Subscription" : "Free during pilot"}
          </Button>
        </>
      ) : null}

      {usageLoading ? (
        <Skeleton className="h-48 rounded-lg" />
      ) : usageError ? (
        <ErrorBanner message="Unable to load usage data." />
      ) : usage ? (
        <UsageChart snapshots={usage.snapshots} currentCount={usage.currentCount} />
      ) : null}

      {paymentsLoading ? (
        <Skeleton className="h-32 rounded-lg" />
      ) : paymentsError ? (
        <ErrorBanner message="Unable to load payment history." />
      ) : payments ? (
        <PaymentHistoryTable items={payments.items} total={payments.total} />
      ) : null}
    </div>
  );
}
