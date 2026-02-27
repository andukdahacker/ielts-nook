import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useBillingOverview, usePaymentHistory, useUsageHistory, useCreateCheckout, billingKeys } from "../billing.api";
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

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-green-100 text-green-800" },
  past_due: { label: "Payment Failed", className: "bg-red-100 text-red-800" },
  canceled: { label: "Canceled", className: "bg-gray-100 text-gray-600" },
  pilot: { label: "Free Pilot", className: "bg-blue-100 text-blue-800" },
  inactive: { label: "Inactive", className: "bg-gray-100 text-gray-600" },
  grace_period: { label: "Grace Period", className: "bg-amber-100 text-amber-800" },
};

function StatusBadge({ status }: { status: string }) {
  const { label, className } = STATUS_CONFIG[status] ?? {
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
  onSubscribe,
  isCheckoutPending,
}: {
  status: string;
  portalUrl: string | null;
  onSubscribe: () => void;
  isCheckoutPending: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <StatusBadge status={status} />
      {status === "pilot" ? (
        <Button onClick={onSubscribe} disabled={isCheckoutPending}>
          {isCheckoutPending ? "Creating checkout..." : "Subscribe"}
        </Button>
      ) : status === "past_due" || status === "grace_period" || status === "inactive" ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => portalUrl && window.open(portalUrl, "_blank")}
          disabled={!portalUrl}
        >
          Update Payment Method
        </Button>
      ) : (
        <Button
          variant="outline"
          onClick={() => portalUrl && window.open(portalUrl, "_blank")}
          disabled={!portalUrl}
        >
          Manage Subscription
        </Button>
      )}
    </div>
  );
}

export function BillingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { data: overview, isLoading: overviewLoading, isError: overviewError } = useBillingOverview();
  const { data: payments, isLoading: paymentsLoading, isError: paymentsError } = usePaymentHistory();
  const { data: usage, isLoading: usageLoading, isError: usageError } = useUsageHistory();
  const checkout = useCreateCheckout();

  useEffect(() => {
    if (overviewError) toast.error("Failed to load billing overview");
  }, [overviewError]);

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      queryClient.invalidateQueries({ queryKey: billingKeys.all });
      toast.success("Subscription activated! Welcome aboard.");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, queryClient, setSearchParams]);

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

          <SubscriptionAction
            status={overview.subscription.status}
            portalUrl={overview.portalUrl}
            onSubscribe={() => checkout.mutate("starter")}
            isCheckoutPending={checkout.isPending}
          />
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
