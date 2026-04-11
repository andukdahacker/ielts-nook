"use client";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";
import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import type { NavItem } from "./app-sidebar";

export function NavMain({ items }: { items: NavItem[] }) {
  const { t } = useTranslation();
  const location = useLocation();

  // Find the most specific matching nav item to avoid parent routes
  // (e.g. /dashboard) staying highlighted when on child routes
  // (e.g. /dashboard/schedule).
  const activeUrl = items.reduce<string | null>((best, item) => {
    const matches =
      location.pathname === item.url ||
      location.pathname.startsWith(`${item.url}/`);
    if (!matches) return best;
    if (!best) return item.url;
    return item.url.length > best.length ? item.url : best;
  }, null);

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          const isActive = item.url === activeUrl;

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={item.title}
                className={
                  isActive
                    ? "bg-nav-active text-nav-active-foreground hover:bg-nav-active/90 hover:text-nav-active-foreground"
                    : ""
                }
              >
                <Link to={item.url} aria-current={isActive ? "page" : undefined}>
                  {item.icon}
                  <span>{t(item.title)}</span>
                </Link>
              </SidebarMenuButton>
              {item.badge && (
                <SidebarMenuBadge className="text-[10px] bg-muted text-muted-foreground">
                  {item.badge}
                </SidebarMenuBadge>
              )}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
