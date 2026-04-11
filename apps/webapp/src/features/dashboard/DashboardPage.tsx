import { Suspense, lazy } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth/auth-context";
import { DashboardShell } from "@/core/components/layout/DashboardShell";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useOutlet } from "react-router";
import { RBACWrapper } from "@/features/auth/components/RBACWrapper";

const OwnerDashboard = lazy(() => import("./components/OwnerDashboard"));
const TeacherDashboard = lazy(() => import("./components/TeacherDashboard"));
const StudentDashboard = lazy(() => import("./components/StudentDashboard"));

export default function DashboardPage() {
  const { t } = useTranslation("dashboard");
  const { user, loading } = useAuth();
  const outlet = useOutlet();

  // If we have a nested match (outlet), render it
  // Otherwise render the default role-based dashboard
  const isDefaultDashboard = !outlet;

  // Global Loading State: Show skeleton if auth is still loading to prevent flicker
  if (loading) {
    return (
      <DashboardShell>
        <DashboardSkeleton />
      </DashboardShell>
    );
  }

  const renderDashboard = () => {
    if (!isDefaultDashboard) {
      return outlet;
    }

    return (
      <>
        <RBACWrapper requiredRoles={["OWNER"]}>
          <OwnerDashboard />
        </RBACWrapper>
        <RBACWrapper requiredRoles={["ADMIN"]}>
          <OwnerDashboard />
        </RBACWrapper>
        <RBACWrapper requiredRoles={["TEACHER"]}>
          <TeacherDashboard />
        </RBACWrapper>
        <RBACWrapper requiredRoles={["STUDENT"]}>
          <StudentDashboard />
        </RBACWrapper>
        {user && !["OWNER", "ADMIN", "TEACHER", "STUDENT"].includes(user.role) && (
          <div className="flex h-[50vh] items-center justify-center p-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold">{t("page.unknownRoleTitle")}</h2>
              <p className="text-muted-foreground">
                {t("page.unknownRoleMessage")}
              </p>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <DashboardShell>
      <Suspense fallback={<DashboardSkeleton />}>{renderDashboard()}</Suspense>
    </DashboardShell>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
