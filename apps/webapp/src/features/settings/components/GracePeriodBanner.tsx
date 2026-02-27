import { Link } from "react-router";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { useBillingOverview } from "../billing.api";

export function GracePeriodBanner() {
  const { user } = useAuth();
  const { data } = useBillingOverview({ staleTime: 5 * 60 * 1000 });

  const centerId = user?.centerId;
  if (!data || !centerId) return null;

  const { status, gracePeriodDaysRemaining } = data.subscription;

  if (status !== "grace_period" && status !== "inactive") return null;

  const billingUrl = `/${centerId}/dashboard/settings/billing`;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="container mx-auto max-w-7xl flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800 flex-1">
          {status === "grace_period" ? (
            <>
              Payment overdue — update billing to avoid service interruption.
              {gracePeriodDaysRemaining !== null && (
                <span className="font-medium"> {gracePeriodDaysRemaining} days remaining.</span>
              )}
            </>
          ) : (
            <>
              Your subscription has expired. New student enrollments are restricted.
              Update billing to restore full access.
            </>
          )}
        </p>
        <Link
          to={billingUrl}
          className="inline-flex items-center rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 shrink-0"
        >
          Update Billing
        </Link>
      </div>
    </div>
  );
}
