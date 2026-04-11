import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { AlertTriangle, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/locale-utils";

interface TierInfo {
  name: "starter" | "growth" | "enterprise";
  displayName: string;
  flatPriceCents: number;
  maxStudents: number | null;
  isCurrent: boolean;
}

interface TierComparisonTableProps {
  tiers: TierInfo[];
  currentTier: string;
  enrolledStudents: number;
  portalUrl: string | null;
  currency?: string;
  onCheckout: (tier: "starter" | "growth" | "enterprise") => void;
  isCheckoutPending: boolean;
  onDowngradeConfirm: (tier: TierInfo) => void;
}

const TIER_ORDER = ["starter", "growth", "enterprise"] as const;

function formatPrice(cents: number, currency = "USD"): string {
  return formatCurrency(cents / 100, currency);
}

function getTierAction(
  tier: TierInfo,
  isPilot: boolean,
  isUpgrade: boolean,
  exceedsLimit: boolean,
  portalUrl: string | null,
  onCheckout: (tier: "starter" | "growth" | "enterprise") => void,
  isCheckoutPending: boolean,
  onDowngradeConfirm: (tier: TierInfo) => void,
  t: (key: string) => string,
) {
  if (tier.isCurrent) {
    return (
      <Badge variant="secondary" className="text-sm px-3 py-1">
        {t("billing.currentPlan")}
      </Badge>
    );
  }

  if (isPilot) {
    return (
      <Button
        size="sm"
        onClick={() => onCheckout(tier.name)}
        disabled={isCheckoutPending}
      >
        {isCheckoutPending ? t("billing.processing") : t("billing.subscribe")}
      </Button>
    );
  }

  if (isUpgrade) {
    if (portalUrl) {
      return (
        <Button
          size="sm"
          onClick={() => window.open(portalUrl, "_blank")}
        >
          {t("billing.upgrade")}
        </Button>
      );
    }
    return (
      <Button size="sm" disabled>
        {t("billing.upgrade")}
      </Button>
    );
  }

  // Downgrade
  if (exceedsLimit) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => onDowngradeConfirm(tier)}
        disabled={!portalUrl}
      >
        {t("billing.downgrade")}
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => portalUrl && window.open(portalUrl, "_blank")}
      disabled={!portalUrl}
    >
      {t("billing.downgrade")}
    </Button>
  );
}

export function TierComparisonTable({
  tiers,
  currentTier,
  enrolledStudents,
  portalUrl,
  currency = "USD",
  onCheckout,
  isCheckoutPending,
  onDowngradeConfirm,
}: TierComparisonTableProps) {
  const { t } = useTranslation("settings");
  const isPilot = currentTier === "pilot";
  const currentIdx = TIER_ORDER.indexOf(currentTier as typeof TIER_ORDER[number]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("billing.availablePlans")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiers.map((tier) => {
            const targetIdx = TIER_ORDER.indexOf(tier.name);
            const isUpgrade = isPilot || targetIdx > currentIdx;
            const exceedsLimit =
              tier.maxStudents !== null && enrolledStudents > tier.maxStudents;

            return (
              <div
                key={tier.name}
                className={`rounded-lg border p-4 flex flex-col gap-3 ${
                  tier.isCurrent
                    ? "border-primary ring-2 ring-primary/20"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{tier.displayName}</h3>
                  {tier.isCurrent && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>

                <div>
                  <span className="text-2xl font-bold">
                    {formatPrice(tier.flatPriceCents, currency)}
                  </span>
                  <span className="text-muted-foreground text-sm">{t("billing.perMonth")}</span>
                </div>

                <p className="text-sm text-muted-foreground">
                  {tier.maxStudents !== null
                    ? t("billing.upToStudents", { maxStudents: tier.maxStudents })
                    : t("billing.unlimitedStudents")}
                </p>

                {exceedsLimit && (
                  <div className="flex items-start gap-2 text-amber-600 bg-amber-50 rounded-md p-2 text-xs">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>
                      {t("billing.exceedsWarning", { enrolledStudents, maxStudents: tier.maxStudents })}
                    </span>
                  </div>
                )}

                {!tier.isCurrent && !isUpgrade && (
                  <p className="text-xs text-muted-foreground">
                    {t("billing.nextCycle")}
                  </p>
                )}
                {!tier.isCurrent && isUpgrade && (
                  <p className="text-xs text-muted-foreground">
                    {t("billing.prorated")}
                  </p>
                )}

                <div className="mt-auto pt-2">
                  {getTierAction(
                    tier,
                    isPilot,
                    isUpgrade,
                    exceedsLimit,
                    portalUrl,
                    onCheckout,
                    isCheckoutPending,
                    onDowngradeConfirm,
                    t,
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
