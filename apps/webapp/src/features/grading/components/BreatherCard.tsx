import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Coffee } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

interface BreatherCardProps {
  sessionGradedCount: number;
  sessionApprovedCount: number;
  sessionRejectedCount: number;
  sessionStartTime: number;
  onContinue: () => void;
}

export function BreatherCard({
  sessionGradedCount,
  sessionApprovedCount,
  sessionRejectedCount,
  sessionStartTime,
  onContinue,
}: BreatherCardProps) {
  const { t } = useTranslation("grading");
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  const elapsedMs = Date.now() - sessionStartTime;
  const elapsedMinutes = Math.max(1, Math.round(elapsedMs / 60000));
  const avgMinutes =
    sessionGradedCount > 0
      ? Math.round(elapsedMs / sessionGradedCount / 60000)
      : 0;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Coffee className="h-8 w-8 text-amber-500" />
            <h2 className="text-lg font-semibold">{t("breather.title")}</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md bg-muted/50 px-3 py-2">
              <span className="text-xs text-muted-foreground">{t("breather.submissionsGraded")}</span>
              <p className="text-lg font-semibold">{sessionGradedCount}</p>
            </div>
            <div className="rounded-md bg-muted/50 px-3 py-2">
              <span className="text-xs text-muted-foreground">{t("breather.itemsApproved")}</span>
              <p className="text-lg font-semibold">{sessionApprovedCount}</p>
            </div>
            <div className="rounded-md bg-muted/50 px-3 py-2">
              <span className="text-xs text-muted-foreground">{t("breather.itemsRejected")}</span>
              <p className="text-lg font-semibold">{sessionRejectedCount}</p>
            </div>
            <div className="rounded-md bg-muted/50 px-3 py-2">
              <span className="text-xs text-muted-foreground">{t("breather.sessionTime")}</span>
              <p className="text-lg font-semibold">{elapsedMinutes}m</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {avgMinutes > 0
              ? t("breather.messageWithPace", {
                  sessionGradedCount,
                  avgMinutes,
                })
              : t("breather.message", { sessionGradedCount })}
          </p>

          <Button ref={buttonRef} className="w-full" onClick={onContinue}>
            {t("breather.continue")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
