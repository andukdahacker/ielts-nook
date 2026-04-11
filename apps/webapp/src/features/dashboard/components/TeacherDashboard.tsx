import { useTranslation } from "react-i18next";
import TeacherAtRiskWidget from "@/features/student-health/components/TeacherAtRiskWidget";

export default function TeacherDashboard() {
  const { t } = useTranslation("dashboard");
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TeacherAtRiskWidget />
        <div>
          <h2 className="text-2xl font-bold mb-4">{t("teacher.gradingQueue.heading")}</h2>
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <p className="text-muted-foreground italic">
              {t("teacher.gradingQueue.noSubmissions")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
