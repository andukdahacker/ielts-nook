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
      allowedRoles: ["OWNER", "TEACHER"],
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
      allowedRoles: ["OWNER", "TEACHER"],
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

export interface NavGroupConfig {
  label: string;
  items: NavItemConfig[];
}

/** True when an item is accessible only to OWNER (used for badge rendering). */
export const isOwnerOnly = (item: NavItemConfig) =>
  item.allowedRoles.length === 1 && item.allowedRoles[0] === "OWNER";

/**
 * Get navigation items organized into logical groups for sidebar display.
 * Profile is excluded — handled separately in sidebar footer (NavUser).
 */
export const getNavigationGroups = (centerId: string): NavGroupConfig[] => {
  const allItems = getNavigationConfig(centerId);
  const grouped = allItems.filter((i) => i.title !== "nav.profile");

  // Preserves the order of `titles`, not the source array order.
  const findByTitles = (titles: string[]) => {
    const itemMap = new Map(grouped.map((i) => [i.title, i]));
    return titles
      .map((t) => itemMap.get(t))
      .filter((i): i is NavItemConfig => i !== undefined);
  };

  return [
    {
      label: "nav.group.overview",
      items: findByTitles(["nav.dashboard", "nav.schedule"]),
    },
    {
      label: "nav.group.teaching",
      items: findByTitles([
        "nav.classes",
        "nav.exercises",
        "nav.mockTests",
        "nav.assignments",
        "nav.grading",
      ]),
    },
    {
      label: "nav.group.people",
      items: findByTitles(["nav.students"]),
    },
    {
      label: "nav.group.administration",
      items: findByTitles(["nav.settings"]),
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
