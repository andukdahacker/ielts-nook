import { describe, it, expect } from "vitest";
import { breadcrumbConfig } from "./breadcrumb-config";

describe("breadcrumb-config", () => {
  it("contains all expected route segments as i18n keys", () => {
    expect(breadcrumbConfig.dashboard).toBe("breadcrumb.dashboard");
    expect(breadcrumbConfig.users).toBe("breadcrumb.users");
    expect(breadcrumbConfig.courses).toBe("breadcrumb.courses");
    expect(breadcrumbConfig.classes).toBe("breadcrumb.classes");
    expect(breadcrumbConfig.schedule).toBe("breadcrumb.schedule");
    expect(breadcrumbConfig.exercises).toBe("breadcrumb.exercises");
    expect(breadcrumbConfig.grading).toBe("breadcrumb.grading");
    expect(breadcrumbConfig.students).toBe("breadcrumb.students");
    expect(breadcrumbConfig.settings).toBe("breadcrumb.settings");
    expect(breadcrumbConfig.profile).toBe("breadcrumb.profile");
  });

  it("contains settings sub-navigation segments", () => {
    expect(breadcrumbConfig.general).toBe("breadcrumb.general");
    expect(breadcrumbConfig.integrations).toBe("breadcrumb.integrations");
    expect(breadcrumbConfig.privacy).toBe("breadcrumb.privacy");
    expect(breadcrumbConfig.billing).toBe("breadcrumb.billing");
  });

  it("contains generic action segments", () => {
    expect(breadcrumbConfig.new).toBe("breadcrumb.new");
    expect(breadcrumbConfig.edit).toBe("breadcrumb.edit");
  });
});
