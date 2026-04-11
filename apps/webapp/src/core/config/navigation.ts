import {
  LayoutDashboard,
  Calendar,
  School,
  Library,
  FileCheck,
  ClipboardList,
  GraduationCap,
  Users,
  Settings,
  UserCircle,
} from "lucide-react";
import type { UserRole } from "@workspace/types";

export interface NavItemConfig {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles: UserRole[];
  order: number;
  mobileVisible: boolean;
  badge?: string;
}

export const getNavigationConfig = (centerId: string): NavItemConfig[] => {
  const dashboardPath = `/${centerId}/dashboard`;

  return [
    {
      title: "nav.dashboard",
      url: dashboardPath,
      icon: LayoutDashboard,
      allowedRoles: ["OWNER", "ADMIN", "TEACHER", "STUDENT"],
      order: 1,
      mobileVisible: true,
    },
    {
      title: "nav.schedule",
      url: `${dashboardPath}/schedule`,
      icon: Calendar,
      allowedRoles: ["OWNER", "ADMIN", "TEACHER", "STUDENT"],
      order: 2,
      mobileVisible: true,
    },
    {
      title: "nav.classes",
      url: `${dashboardPath}/classes`,
      icon: School,
      allowedRoles: ["OWNER", "ADMIN", "TEACHER"],
      order: 3,
      mobileVisible: true,
    },
    {
      title: "nav.exercises",
      url: `${dashboardPath}/exercises`,
      icon: Library,
      allowedRoles: ["OWNER", "ADMIN", "TEACHER"],
      order: 4,
      mobileVisible: true,
    },
    {
      title: "nav.assignments",
      url: `${dashboardPath}/assignments`,
      icon: FileCheck,
      allowedRoles: ["OWNER", "ADMIN", "TEACHER"],
      order: 4.5,
      mobileVisible: true,
    },
    {
      title: "nav.mockTests",
      url: `${dashboardPath}/mock-tests`,
      icon: ClipboardList,
      allowedRoles: ["OWNER", "ADMIN", "TEACHER"],
      order: 5,
      mobileVisible: false,
    },
    {
      title: "nav.grading",
      url: `${dashboardPath}/grading`,
      icon: GraduationCap,
      allowedRoles: ["OWNER", "ADMIN", "TEACHER"],
      order: 6,
      mobileVisible: false,
    },
    {
      title: "nav.students",
      url: `${dashboardPath}/students`,
      icon: Users,
      allowedRoles: ["OWNER", "ADMIN", "TEACHER"],
      order: 7,
      mobileVisible: false,
    },
    {
      title: "nav.settings",
      url: `${dashboardPath}/settings`,
      icon: Settings,
      allowedRoles: ["OWNER", "ADMIN"],
      order: 8,
      mobileVisible: false,
    },
    {
      title: "nav.profile",
      url: `${dashboardPath}/profile`,
      icon: UserCircle,
      allowedRoles: ["OWNER", "ADMIN", "TEACHER", "STUDENT"],
      order: 9,
      mobileVisible: false,
    },
  ];
};

/**
 * Get nav items visible in mobile bottom bar (mobileVisible: true, max 4)
 */
export const getMobileNavItems = (items: NavItemConfig[]): NavItemConfig[] => {
  return items
    .filter((i) => i.mobileVisible)
    .sort((a, b) => a.order - b.order)
    .slice(0, 4);
};

/**
 * Get nav items for overflow menu (items not in mobile bottom bar)
 */
export const getOverflowNavItems = (items: NavItemConfig[]): NavItemConfig[] => {
  const mobileItems = getMobileNavItems(items);
  return items
    .filter((i) => !mobileItems.includes(i))
    .sort((a, b) => a.order - b.order);
};
