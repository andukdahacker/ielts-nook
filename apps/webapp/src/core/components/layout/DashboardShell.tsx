import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar";
import { AppSidebar } from "../common/app-sidebar";
import { Link, useLocation } from "react-router";
import { useAuth } from "@/features/auth/auth-context";
import {
  getNavigationConfig,
  getNavigationGroups,
  getMobileNavItems,
  getOverflowNavItems,
} from "@/core/config/navigation";
import { NotificationBell } from "@/features/dashboard/components/NotificationBell";
import { Separator } from "@workspace/ui/components/separator";
import { MobileNavOverflow } from "./MobileNavOverflow";
import { Breadcrumbs } from "./Breadcrumbs";
import { GracePeriodBanner } from "@/features/settings/components/GracePeriodBanner";
import { BreadcrumbProvider } from "@/core/context/breadcrumb-context";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useTranslation } from "react-i18next";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const centerId = user?.centerId;

  const navConfig = getNavigationConfig(centerId || "default");
  const filteredNavItems = navConfig
    .filter((item) => user?.role && item.allowedRoles.includes(user.role))
    .sort((a, b) => a.order - b.order);

  // Mobile bottom bar: top 4 mobileVisible items + overflow
  const mobileNavItems = getMobileNavItems(filteredNavItems);
  const overflowNavItems = getOverflowNavItems(filteredNavItems);
  const navGroups = getNavigationGroups(centerId || "default");

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-background font-sans">
        <div className="flex flex-1 overflow-hidden relative">
          <div className="hidden md:flex">
            <AppSidebar />
          </div>

          <SidebarInset>
            <BreadcrumbProvider>
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
              <div className="flex items-center justify-between gap-2 px-4 w-full">
                <div className="gap-2 items-center flex">
                  <SidebarTrigger className="-ml-1" />
                  <Separator
                    orientation="vertical"
                    className="mr-2 data-[orientation=vertical]:h-4"
                  />
                  <Breadcrumbs />
                </div>
                <div className="flex items-center gap-2">
                  <LanguageToggle compact />
                  <NotificationBell />
                </div>
              </div>
            </header>
            {user?.role === "OWNER" && <GracePeriodBanner />}
            <main className="flex-1 min-w-0 overflow-y-auto relative">
              <div className="container mx-auto max-w-7xl px-4 py-6 pb-24 md:pb-6">
                {children}
              </div>
            </main>
            </BreadcrumbProvider>
          </SidebarInset>
        </div>

        {/* Mobile Bottom Bar */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-background px-4 md:hidden"
          aria-label={t("nav.mainNavigation")}
        >
          {mobileNavItems.map((item) => {
            const isActive =
              location.pathname === item.url ||
              location.pathname.startsWith(`${item.url}/`);
            return (
              <Link
                key={item.url}
                to={item.url}
                className={`flex flex-col items-center gap-1 transition-colors ${
                  isActive
                    ? "text-nav-active"
                    : "text-muted-foreground hover:text-primary"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium uppercase tracking-wider">
                  {t(item.title)}
                </span>
              </Link>
            );
          })}
          {overflowNavItems.length > 0 && (
            <MobileNavOverflow items={overflowNavItems} groups={navGroups} userRole={user?.role} />
          )}
        </nav>
      </div>
    </SidebarProvider>
  );
}
