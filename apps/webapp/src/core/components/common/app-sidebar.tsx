"use client";

import * as React from "react";
import { LogoMark } from "@workspace/ui/components/logo";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@workspace/ui/components/sidebar";
import { useTenant } from "@/features/tenants/tenant-context";
import { useAuth } from "@/features/auth/auth-context";
import { useTranslation } from "react-i18next";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import { getNavigationConfig } from "@/core/config/navigation";

export type NavItem = {
  title: string;
  url: string;
  icon: React.ReactNode;
  badge?: string;
};

function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const { t } = useTranslation();
  const centerId = user?.centerId;

  const navConfig = getNavigationConfig(centerId || "default");
  const filteredNavItems = navConfig
    .filter((item) => user?.role && item.allowedRoles.includes(user.role))
    .sort((a, b) => a.order - b.order)
    .map((item) => ({
      title: item.title,
      url: item.url,
      icon: <item.icon />,
      // Teachers have read-only access to Classes. Match on the URL suffix
      // (a stable identifier) rather than the i18n key string.
      badge:
        user?.role === "TEACHER" && item.url.endsWith("/classes")
          ? t("sidebar.readOnlyBadge")
          : undefined,
    }));

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <div className="flex aspect-square size-8 items-center justify-center">
                {tenant?.logoUrl ? (
                  <img
                    src={tenant.logoUrl}
                    alt={tenant.name}
                    className="size-8 rounded-lg"
                  />
                ) : (
                  <LogoMark size={32} />
                )}
              </div>
              <div className="flex flex-col text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {tenant?.name || t("sidebar.defaultName")}
                </span>
                <span className="truncate text-xs">{user?.role}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNavItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            email: user?.email || "",
            name: user?.name || "",
            avatar: user?.avatarUrl || "",
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export { AppSidebar };
