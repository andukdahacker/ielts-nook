import { describe, it, expect } from "vitest";
import { breadcrumbConfig } from "./breadcrumb-config";

describe("breadcrumb-config", () => {
  it("contains all expected route segments", () => {
    expect(breadcrumbConfig.dashboard).toBe("Dashboard");
    expect(breadcrumbConfig.users).toBe("Users");
    expect(breadcrumbConfig.courses).toBe("Courses");
    expect(breadcrumbConfig.classes).toBe("Classes");
    expect(breadcrumbConfig.schedule).toBe("Schedule");
    expect(breadcrumbConfig.exercises).toBe("Exercises");
    expect(breadcrumbConfig.grading).toBe("Grading");
    expect(breadcrumbConfig.students).toBe("Students");
    expect(breadcrumbConfig.settings).toBe("Settings");
    expect(breadcrumbConfig.profile).toBe("My Profile");
  });

  it("contains settings sub-navigation segments", () => {
    expect(breadcrumbConfig.general).toBe("General");
    expect(breadcrumbConfig.integrations).toBe("Integrations");
    expect(breadcrumbConfig.privacy).toBe("Privacy");
    expect(breadcrumbConfig.billing).toBe("Billing");
  });

  it("contains generic action segments", () => {
    expect(breadcrumbConfig.new).toBe("New");
    expect(breadcrumbConfig.edit).toBe("Edit");
  });
});
