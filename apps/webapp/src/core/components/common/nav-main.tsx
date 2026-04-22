"use client";

import { useState, useEffect } from "react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import { Badge } from "@workspace/ui/components/badge";
import { ChevronDown } from "lucide-react";
import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import type { NavGroupConfig } from "@/core/config/navigation";
import { isOwnerOnly } from "@/core/config/navigation";
import type { UserRole } from "@workspace/types";

interface NavMainProps {
  groups: NavGroupConfig[];
  userRole: UserRole | undefined;
  teacherClassesBadge?: string;
}

export function NavMain({ groups, userRole, teacherClassesBadge }: NavMainProps) {
  const { t } = useTranslation();
  const location = useLocation();

  // Collect all visible items across groups for active URL matching
  const allVisibleItems = userRole
    ? groups.flatMap((g) =>
        g.items.filter((item) => item.allowedRoles.includes(userRole))
      )
    : [];

  // Find the most specific matching nav item
  const activeUrl = allVisibleItems.reduce<string | null>((best, item) => {
    const matches =
      location.pathname === item.url ||
      location.pathname.startsWith(`${item.url}/`);
    if (!matches) return best;
    if (!best) return item.url;
    return item.url.length > best.length ? item.url : best;
  }, null);

  // Find the group label containing the active route
  const findActiveGroupLabel = (): string | null => {
    if (!userRole) return null;
    for (const group of groups) {
      if (
        group.items.some(
          (item) =>
            item.allowedRoles.includes(userRole) && item.url === activeUrl
        )
      ) {
        return group.label;
      }
    }
    return null;
  };

  // Find the first visible group label as fallback
  const findFirstVisibleGroupLabel = (): string | null => {
    if (!userRole) return null;
    const first = groups.find((g) =>
      g.items.some((i) => i.allowedRoles.includes(userRole))
    );
    return first?.label ?? null;
  };

  // Controlled collapsible state — tracks which groups are open
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const activeLabel = findActiveGroupLabel();
    if (activeLabel) return new Set([activeLabel]);
    const fallback = findFirstVisibleGroupLabel();
    return fallback ? new Set([fallback]) : new Set();
  });

  // Auto-expand the active group on route change
  useEffect(() => {
    const activeLabel = findActiveGroupLabel();
    if (activeLabel) {
      setOpenGroups((prev) => {
        if (prev.has(activeLabel)) return prev;
        return new Set([...prev, activeLabel]);
      });
    }
  }, [activeUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!userRole) return null;

  return (
    <>
      {groups.map((group) => {
        const visibleItems = group.items.filter((item) =>
          item.allowedRoles.includes(userRole)
        );

        if (visibleItems.length === 0) return null;

        return (
          <Collapsible
            key={group.label}
            open={openGroups.has(group.label)}
            onOpenChange={(isOpen) => {
              setOpenGroups((prev) => {
                const next = new Set(prev);
                if (isOpen) next.add(group.label);
                else next.delete(group.label);
                return next;
              });
            }}
            className="group/collapsible"
          >
            <SidebarGroup>
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="cursor-pointer select-none">
                  {t(group.label)}
                  <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visibleItems.map((item) => {
                      const isActive = item.url === activeUrl;
                      const badge =
                        userRole === "TEACHER" && item.url.endsWith("/classes")
                          ? teacherClassesBadge
                          : undefined;

                      return (
                        <SidebarMenuItem key={item.url}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            tooltip={t(item.title)}
                            className={
                              isActive
                                ? "bg-nav-active text-nav-active-foreground hover:bg-nav-active/90 hover:text-nav-active-foreground"
                                : ""
                            }
                          >
                            <Link
                              to={item.url}
                              aria-current={isActive ? "page" : undefined}
                            >
                              <item.icon className="h-4 w-4" />
                              <span>{t(item.title)}</span>
                              {isOwnerOnly(item) && (
                                <Badge
                                  variant="outline"
                                  className="ml-auto text-[10px] px-1.5 py-0"
                                >
                                  {t("nav.ownerBadge")}
                                </Badge>
                              )}
                            </Link>
                          </SidebarMenuButton>
                          {badge && (
                            <SidebarMenuBadge className="text-[10px] bg-muted text-muted-foreground">
                              {badge}
                            </SidebarMenuBadge>
                          )}
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        );
      })}
    </>
  );
}
