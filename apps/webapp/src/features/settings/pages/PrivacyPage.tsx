import { Shield } from "lucide-react";
import { useTranslation } from "react-i18next";

export function PrivacyPage() {
  const { t } = useTranslation("settings");
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("privacy.heading")}</h2>
        <p className="text-muted-foreground">
          {t("privacy.description")}
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Shield className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold">{t("privacy.comingSoonTitle")}</h3>
        <p className="text-muted-foreground max-w-sm mt-2">
          {t("privacy.comingSoonDescription")}
        </p>
      </div>
    </div>
  );
}
