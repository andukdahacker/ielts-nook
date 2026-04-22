import { describe, it, expect } from "vitest";
import i18n from "i18next";
import {
  getNavigationConfig,
  getNavigationGroups,
  getMobileNavItems,
  getOverflowNavItems,
} from "./navigation";

describe("navigation config", () => {
  describe("getNavigationConfig", () => {
    it("returns all nav items with correct structure", () => {
      const config = getNavigationConfig("test-center");

      expect(config).toHaveLength(10);
      expect(config[0]).toMatchObject({
        title: "nav.dashboard",
        url: "/test-center/dashboard",
        order: 1,
        mobileVisible: true,
      });
    });

    it("includes all required nav items per AC table (as i18n keys)", () => {
      const config = getNavigationConfig("test-center");
      const titles = config.map((item) => item.title);

      expect(titles).toContain("nav.dashboard");
      expect(titles).toContain("nav.schedule");
      expect(titles).toContain("nav.classes");
      expect(titles).toContain("nav.exercises");
      expect(titles).toContain("nav.assignments");
      expect(titles).toContain("nav.mockTests");
      expect(titles).toContain("nav.grading");
      expect(titles).toContain("nav.students");
      expect(titles).toContain("nav.settings");
      expect(titles).toContain("nav.profile");
    });

    it("does not include removed nav items (Users, Courses)", () => {
      const config = getNavigationConfig("test-center");
      const titles = config.map((item) => item.title);

      expect(titles).not.toContain("nav.users");
      expect(titles).not.toContain("nav.courses");
    });

    it("every nav title key resolves to a translated string", () => {
      const config = getNavigationConfig("test-center");
      for (const item of config) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const translated = (i18n.t as any)(item.title, { ns: "common" });
        expect(typeof translated).toBe("string");
        // If the key is missing in resources, i18next returns the raw key.
        // The translation should be a different (human-readable) string.
        expect(translated).not.toBe(item.title);
      }
    });
  });

  describe("role-based filtering", () => {
    const config = getNavigationConfig("test-center");

    it("OWNER sees all nav items", () => {
      const ownerItems = config.filter((item) =>
        item.allowedRoles.includes("OWNER")
      );
      expect(ownerItems).toHaveLength(10);
    });

    it("ADMIN sees nav items except grading and assignments (Story 15-2)", () => {
      const adminItems = config.filter((item) =>
        item.allowedRoles.includes("ADMIN")
      );
      const titles = adminItems.map((item) => item.title);

      expect(titles).not.toContain("nav.grading");
      expect(titles).not.toContain("nav.assignments");
      expect(titles).toContain("nav.dashboard");
      expect(titles).toContain("nav.schedule");
      expect(titles).toContain("nav.classes");
      expect(titles).toContain("nav.exercises");
      expect(titles).toContain("nav.mockTests");
      expect(titles).toContain("nav.students");
      expect(titles).toContain("nav.settings");
      expect(titles).toContain("nav.profile");
      expect(adminItems).toHaveLength(8);
    });

    it("TEACHER sees correct nav items (no Settings)", () => {
      const teacherItems = config.filter((item) =>
        item.allowedRoles.includes("TEACHER")
      );
      const titles = teacherItems.map((item) => item.title);

      expect(titles).toContain("nav.dashboard");
      expect(titles).toContain("nav.schedule");
      expect(titles).toContain("nav.classes");
      expect(titles).toContain("nav.exercises");
      expect(titles).toContain("nav.assignments");
      expect(titles).toContain("nav.mockTests");
      expect(titles).toContain("nav.grading");
      expect(titles).toContain("nav.students");
      expect(titles).toContain("nav.profile");
      expect(titles).not.toContain("nav.settings");
      expect(teacherItems).toHaveLength(9);
    });

    it("STUDENT sees only Dashboard, Schedule, and My Profile", () => {
      const studentItems = config.filter((item) =>
        item.allowedRoles.includes("STUDENT")
      );
      const titles = studentItems.map((item) => item.title);

      expect(titles).toContain("nav.dashboard");
      expect(titles).toContain("nav.schedule");
      expect(titles).toContain("nav.profile");
      expect(titles).not.toContain("nav.classes");
      expect(titles).not.toContain("nav.exercises");
      expect(titles).not.toContain("nav.grading");
      expect(titles).not.toContain("nav.students");
      expect(titles).not.toContain("nav.settings");
      expect(studentItems).toHaveLength(3);
    });
  });

  describe("getMobileNavItems", () => {
    it("returns max 4 items with mobileVisible: true", () => {
      const config = getNavigationConfig("test-center");
      const mobileItems = getMobileNavItems(config);

      expect(mobileItems.length).toBeLessThanOrEqual(4);
      expect(mobileItems.every((item) => item.mobileVisible)).toBe(true);
    });

    it("returns items sorted by order", () => {
      const config = getNavigationConfig("test-center");
      const mobileItems = getMobileNavItems(config);

      for (let i = 1; i < mobileItems.length; i++) {
        expect(mobileItems[i].order).toBeGreaterThan(mobileItems[i - 1].order);
      }
    });

    it("returns Dashboard, Schedule, Classes, Exercises for full config", () => {
      const config = getNavigationConfig("test-center");
      const mobileItems = getMobileNavItems(config);
      const titles = mobileItems.map((item) => item.title);

      expect(titles).toEqual([
        "nav.dashboard",
        "nav.schedule",
        "nav.classes",
        "nav.exercises",
      ]);
    });
  });

  describe("getNavigationGroups", () => {
    it("returns 4 groups", () => {
      const groups = getNavigationGroups("test-center");
      expect(groups).toHaveLength(4);
      expect(groups.map((g) => g.label)).toEqual([
        "nav.group.overview",
        "nav.group.teaching",
        "nav.group.people",
        "nav.group.administration",
      ]);
    });

    it("excludes Profile from all groups", () => {
      const groups = getNavigationGroups("test-center");
      const allGroupItems = groups.flatMap((g) => g.items);
      const titles = allGroupItems.map((i) => i.title);
      expect(titles).not.toContain("nav.profile");
    });

    it("Overview group contains Dashboard and Schedule", () => {
      const groups = getNavigationGroups("test-center");
      const overview = groups.find((g) => g.label === "nav.group.overview")!;
      const titles = overview.items.map((i) => i.title);
      expect(titles).toEqual(["nav.dashboard", "nav.schedule"]);
    });

    it("Teaching group contains Classes, Exercises, Mock Tests, Assignments, Grading (spec order)", () => {
      const groups = getNavigationGroups("test-center");
      const teaching = groups.find((g) => g.label === "nav.group.teaching")!;
      const titles = teaching.items.map((i) => i.title);
      expect(titles).toEqual([
        "nav.classes",
        "nav.exercises",
        "nav.mockTests",
        "nav.assignments",
        "nav.grading",
      ]);
    });

    it("People group contains Students", () => {
      const groups = getNavigationGroups("test-center");
      const people = groups.find((g) => g.label === "nav.group.people")!;
      const titles = people.items.map((i) => i.title);
      expect(titles).toEqual(["nav.students"]);
    });

    it("Administration group contains Settings", () => {
      const groups = getNavigationGroups("test-center");
      const admin = groups.find(
        (g) => g.label === "nav.group.administration"
      )!;
      const titles = admin.items.map((i) => i.title);
      expect(titles).toEqual(["nav.settings"]);
    });

    it("OWNER sees 9 grouped items (all except Profile which is in footer) (AC1)", () => {
      const groups = getNavigationGroups("test-center");
      const ownerItems = groups.flatMap((g) =>
        g.items.filter((i) => i.allowedRoles.includes("OWNER"))
      );
      expect(ownerItems).toHaveLength(9);

      // Verify all non-Profile items are accessible to OWNER
      const config = getNavigationConfig("test-center");
      const ownerConfigItems = config.filter(
        (i) => i.allowedRoles.includes("OWNER") && i.title !== "nav.profile"
      );
      expect(ownerItems).toHaveLength(ownerConfigItems.length);
    });

    it("OWNER sees all 4 groups including Administration (AC1)", () => {
      const groups = getNavigationGroups("test-center");
      const ownerVisibleGroups = groups.filter((g) =>
        g.items.some((i) => i.allowedRoles.includes("OWNER"))
      );
      expect(ownerVisibleGroups).toHaveLength(4);
      expect(ownerVisibleGroups.map((g) => g.label)).toEqual([
        "nav.group.overview",
        "nav.group.teaching",
        "nav.group.people",
        "nav.group.administration",
      ]);
    });

    it("ADMIN sees 7 grouped items in 4 groups (no grading, no assignments)", () => {
      const groups = getNavigationGroups("test-center");
      const adminItems = groups.flatMap((g) =>
        g.items.filter((i) => i.allowedRoles.includes("ADMIN"))
      );
      expect(adminItems).toHaveLength(7);
      const titles = adminItems.map((i) => i.title);
      expect(titles).not.toContain("nav.grading");
      expect(titles).not.toContain("nav.assignments");
    });

    it("TEACHER sees 8 grouped items in 3 groups (no Administration)", () => {
      const groups = getNavigationGroups("test-center");
      const teacherGroups = groups.filter((g) =>
        g.items.some((i) => i.allowedRoles.includes("TEACHER"))
      );
      expect(teacherGroups).toHaveLength(3);
      expect(teacherGroups.map((g) => g.label)).not.toContain(
        "nav.group.administration"
      );
      const teacherItems = groups.flatMap((g) =>
        g.items.filter((i) => i.allowedRoles.includes("TEACHER"))
      );
      expect(teacherItems).toHaveLength(8);
    });

    it("STUDENT sees only Overview group (Dashboard, Schedule)", () => {
      const groups = getNavigationGroups("test-center");
      const studentGroups = groups.filter((g) =>
        g.items.some((i) => i.allowedRoles.includes("STUDENT"))
      );
      expect(studentGroups).toHaveLength(1);
      expect(studentGroups[0].label).toBe("nav.group.overview");
      const studentItems = studentGroups[0].items.filter((i) =>
        i.allowedRoles.includes("STUDENT")
      );
      expect(studentItems.map((i) => i.title)).toEqual([
        "nav.dashboard",
        "nav.schedule",
      ]);
    });

    it("every non-Profile nav item appears in exactly one group", () => {
      const config = getNavigationConfig("test-center");
      const groups = getNavigationGroups("test-center");
      const nonProfileItems = config.filter((i) => i.title !== "nav.profile");
      const allGroupItems = groups.flatMap((g) => g.items);

      // Every non-Profile item must be present
      for (const item of nonProfileItems) {
        const occurrences = allGroupItems.filter(
          (gi) => gi.title === item.title
        );
        expect(occurrences).toHaveLength(1);
      }

      // No extra items in groups
      expect(allGroupItems).toHaveLength(nonProfileItems.length);
    });
  });

  describe("getOverflowNavItems", () => {
    it("returns items not in mobile bottom bar", () => {
      const config = getNavigationConfig("test-center");
      const mobileItems = getMobileNavItems(config);
      const overflowItems = getOverflowNavItems(config);

      // No overlap between mobile and overflow
      const mobileUrls = new Set(mobileItems.map((i) => i.url));
      expect(overflowItems.every((item) => !mobileUrls.has(item.url))).toBe(
        true
      );
    });

    it("returns Grading, Students, Settings, My Profile for full config", () => {
      const config = getNavigationConfig("test-center");
      const overflowItems = getOverflowNavItems(config);
      const titles = overflowItems.map((item) => item.title);

      expect(titles).toEqual([
        "nav.assignments",
        "nav.mockTests",
        "nav.grading",
        "nav.students",
        "nav.settings",
        "nav.profile",
      ]);
    });

    it("returns items sorted by order", () => {
      const config = getNavigationConfig("test-center");
      const overflowItems = getOverflowNavItems(config);

      for (let i = 1; i < overflowItems.length; i++) {
        expect(overflowItems[i].order).toBeGreaterThan(
          overflowItems[i - 1].order
        );
      }
    });
  });
});
