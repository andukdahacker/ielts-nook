import { CheckCircle2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";

export function SubmissionCompletePage() {
  const { t } = useTranslation("submissions");
  const navigate = useNavigate();
  const { centerId } = useParams();

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <CheckCircle2 className="size-16 text-green-500" />
        <h1 className="text-2xl font-bold">{t("completePage.heading")}</h1>
        <p className="text-muted-foreground">
          {t("completePage.description")}
        </p>
        <Button
          onClick={() => navigate(`/${centerId}/dashboard`)}
          className="min-h-[44px] mt-2"
        >
          {t("completePage.button")}
        </Button>
      </div>
    </div>
  );
}
