import { CloudOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { useTranslation } from "react-i18next";

interface OfflineBannerProps {
  isOnline: boolean;
  isSubmitted: boolean;
}

export function OfflineBanner({ isOnline, isSubmitted }: OfflineBannerProps) {
  const { t } = useTranslation("submissions");
  if (isOnline || isSubmitted) return null;

  return (
    <Alert
      className="border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-200 rounded-none"
      data-testid="offline-banner"
    >
      <CloudOff className="size-4 text-amber-500 dark:text-amber-400" />
      <AlertTitle>{t("offlineBanner.title")}</AlertTitle>
      <AlertDescription>
        {t("offlineBanner.description")}
      </AlertDescription>
    </Alert>
  );
}
