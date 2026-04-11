import { Unlink } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AnchorStatus } from "../hooks/use-anchor-validation";

interface AnchorStatusIndicatorProps {
  anchorStatus: AnchorStatus;
  variant: "dot" | "label";
}

export function AnchorStatusIndicator({ anchorStatus, variant }: AnchorStatusIndicatorProps) {
  const { t } = useTranslation("grading");

  if (variant === "dot" && anchorStatus === "drifted") {
    return (
      <span
        className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-amber-400"
        title={t("anchorStatus.driftedTooltip")}
      />
    );
  }

  if (variant === "label" && anchorStatus === "orphaned") {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Unlink className="h-3 w-3" />
        <span>{t("anchorStatus.orphaned")}</span>
      </div>
    );
  }

  return null;
}
