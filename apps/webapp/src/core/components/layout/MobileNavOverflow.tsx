import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";
import { MoreHorizontal } from "lucide-react";
import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { Badge } from "@workspace/ui/components/badge";
import type { NavItemConfig, NavGroupConfig } from "@/core/config/navigation";
import { isOwnerOnly } from "@/core/config/navigation";
import type { UserRole } from "@workspace/types";

interface MobileNavOverflowProps {
  items: NavItemConfig[];
  groups?: NavGroupConfig[];
  userRole?: UserRole;
}

export function MobileNavOverflow({ items, groups, userRole }: MobileNavOverflowProps) {
  const { t } = useTranslation();
  const location = useLocation();

  if (items.length === 0) return null;

  // If groups and userRole are provided, render grouped layout
  const renderGrouped = groups && userRole;

  // Filter groups to only show items that are in the overflow set
  const overflowUrls = new Set(items.map((i) => i.url));
  const filteredGroups = renderGrouped
    ? groups
        .map((group) => ({
          ...group,
          items: group.items.filter(
            (item) =>
              overflowUrls.has(item.url) && item.allowedRoles.includes(userRole)
          ),
        }))
        .filter((group) => group.items.length > 0)
    : [];

  // Items in overflow but not in any group (e.g., Profile)
  const groupedUrls = renderGrouped
    ? new Set(filteredGroups.flatMap((g) => g.items.map((i) => i.url)))
    : new Set<string>();
  const ungroupedItems = renderGrouped
    ? items.filter((i) => !groupedUrls.has(i.url))
    : [];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
          aria-label={t("nav.moreOptions")}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] font-medium uppercase tracking-wider">
            {t("nav.more")}
          </span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto max-h-[50vh]">
        <SheetHeader>
          <SheetTitle>{t("nav.more")}</SheetTitle>
          <SheetDescription>{t("nav.additionalNavigation")}</SheetDescription>
        </SheetHeader>
        {renderGrouped ? (
          <nav className="py-4 space-y-4" aria-label={t("nav.additionalNavigation")}>
            {filteredGroups.map((group) => (
              <div key={group.label}>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">
                  {t(group.label)}
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  {group.items.map((item) => {
                    const isActive =
                      location.pathname === item.url ||
                      location.pathname.startsWith(`${item.url}/`);
                    return (
                      <Link
                        key={item.url}
                        to={item.url}
                        className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-colors ${
                          isActive
                            ? "bg-nav-active/10 text-nav-active"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <item.icon className="h-6 w-6" />
                        <span className="text-xs font-medium text-center">
                          {t(item.title)}
                        </span>
                        {isOwnerOnly(item) && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0"
                          >
                            {t("nav.ownerBadge")}
                          </Badge>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
            {ungroupedItems.length > 0 && (
              <div className="grid grid-cols-4 gap-4">
                {ungroupedItems.map((item) => {
                  const isActive =
                    location.pathname === item.url ||
                    location.pathname.startsWith(`${item.url}/`);
                  return (
                    <Link
                      key={item.url}
                      to={item.url}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-colors ${
                        isActive
                          ? "bg-nav-active/10 text-nav-active"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <item.icon className="h-6 w-6" />
                      <span className="text-xs font-medium text-center">
                        {t(item.title)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </nav>
        ) : (
          <nav className="grid grid-cols-4 gap-4 py-4" aria-label={t("nav.additionalNavigation")}>
            {items.map((item) => {
              const isActive = location.pathname === item.url ||
                location.pathname.startsWith(`${item.url}/`);
              return (
                <Link
                  key={item.url}
                  to={item.url}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-nav-active/10 text-nav-active"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <item.icon className="h-6 w-6" />
                  <span className="text-xs font-medium text-center">{t(item.title)}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </SheetContent>
    </Sheet>
  );
}
