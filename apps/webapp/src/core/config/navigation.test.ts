import { describe, it, expect } from "vitest";
import i18n from "i18next";
import {
  getNavigationConfig,
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

    it("ADMIN sees all nav items", () => {
      const adminItems = config.filter((item) =>
        item.allowedRoles.includes("ADMIN")
      );
      expect(adminItems).toHaveLength(10);
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
