import { Badge } from "@workspace/ui/components/badge";
import { useNavigate, useLocation, Outlet } from "react-router";
import { settingsTabs } from "../config/settings-nav";
import { useAuth } from "@/features/auth/auth-context";

export function SettingsLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const visibleTabs = settingsTabs.filter(
    (tab) => !tab.roles || (user?.role && tab.roles.includes(user.role)),
  );

  const currentTab =
    visibleTabs.find(
      (tab) =>
        (tab.path && location.pathname.endsWith(`/settings/${tab.path}`)) ||
        (tab.path === "" && location.pathname.endsWith("/settings"))
    )?.id || "general";

  const handleTabChange = (tabId: string) => {
    const tab = visibleTabs.find((t) => t.id === tabId);
    if (tab && !tab.disabled) {
      navigate(tab.path || ".");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your center settings and preferences.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Desktop: Vertical tabs */}
        <aside className="hidden md:block w-48 shrink-0">
          <nav className="flex flex-col gap-1" aria-label="Settings navigation">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                disabled={tab.disabled}
                aria-current={currentTab === tab.id ? "page" : undefined}
                className={`flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors text-left ${
                  currentTab === tab.id
                    ? "bg-nav-active text-nav-active-foreground"
                    : tab.disabled
                      ? "text-muted-foreground opacity-50 cursor-not-allowed"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {tab.label}
                {tab.badge && (
                  <Badge variant="secondary" className="text-[10px] ml-2">
                    {tab.badge}
                  </Badge>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile: Horizontal scrollable tabs */}
        <div className="md:hidden overflow-x-auto">
          <nav
            className="flex gap-1 pb-2 min-w-max"
            aria-label="Settings navigation"
          >
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                disabled={tab.disabled}
                aria-current={currentTab === tab.id ? "page" : undefined}
                className={`flex items-center gap-1 px-3 py-2 text-sm rounded-md transition-colors whitespace-nowrap ${
                  currentTab === tab.id
                    ? "bg-nav-active text-nav-active-foreground"
                    : tab.disabled
                      ? "text-muted-foreground opacity-50 cursor-not-allowed"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {tab.label}
                {tab.badge && (
                  <Badge variant="secondary" className="text-[10px]">
                    {tab.badge}
                  </Badge>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
