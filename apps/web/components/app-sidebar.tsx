"use client";

import {
  Activity,
  BookPlus,
  GalleryVerticalEnd,
  LayoutDashboardIcon,
  LibraryBig,
  School,
  Users2,
} from "lucide-react";
import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import useMe from "@/lib/features/auth/hooks/me.hook";
import { UserRole } from "@/lib/schema/types";
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

// This is sample data.

export type NavItem = {
  title: string;
  url: string;
  icon: React.ReactNode;
  allowRole: UserRole[];
};

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: <LayoutDashboardIcon />,
    allowRole: ["ADMIN", "TEACHER", "STUDENT"],
  },
  {
    title: "Users",
    url: "/users",
    icon: <Users2 />,
    allowRole: ["ADMIN"],
  },
  {
    title: "Classes",
    url: "/class",
    icon: <School />,
    allowRole: ["ADMIN", "TEACHER", "STUDENT"],
  },
  {
    title: "Exercises",
    url: "/exercises",
    icon: <LibraryBig />,
    allowRole: ["ADMIN", "TEACHER"],
  },
  {
    title: "Exercise Builder",
    url: "/exercises-builder",
    icon: <BookPlus />,
    allowRole: ["ADMIN", "TEACHER"],
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: <Activity />,
    allowRole: ["ADMIN", "TEACHER", "STUDENT"],
  },
] as const;

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data } = useMe();
  const isCenter = data?.center;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <GalleryVerticalEnd className="size-4" />
              </div>
              <div className="flex flex-col text-left text-sm leading-tight">
                <span className="truncate font-medium">IELTS Nook</span>
                <span className="truncate text-xs">
                  {isCenter ? "ADMIN" : data?.user?.role}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={
            isCenter
              ? {
                  email: data.center?.email ?? "",
                  name: data.center?.name ?? "",
                }
              : {
                  email: data?.user?.email ?? "",
                  name: data?.user?.username ?? "",
                }
          }
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
