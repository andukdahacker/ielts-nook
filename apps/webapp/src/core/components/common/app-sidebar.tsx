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
import { Badge } from "@workspace/ui/components/badge";
import { useTenant } from "@/features/tenants/tenant-context";
import { useAuth } from "@/features/auth/auth-context";
import { useTranslation } from "react-i18next";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import { getNavigationGroups } from "@/core/config/navigation";

function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const { t } = useTranslation();
  const centerId = user?.centerId;

  const navGroups = getNavigationGroups(centerId || "default");

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
                {user?.role && (
                  <Badge
                    variant={user.role === "OWNER" ? "default" : user.role === "ADMIN" ? "secondary" : "outline"}
                    className="w-fit text-[10px] px-1.5 py-0 group-data-[collapsible=icon]:hidden"
                  >
                    {String(t(`role.${user.role.toLowerCase()}`))}
                  </Badge>
                )}
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          groups={navGroups}
          userRole={user?.role}
          teacherClassesBadge={
            user?.role === "TEACHER" ? t("sidebar.readOnlyBadge") : undefined
          }
        />
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
