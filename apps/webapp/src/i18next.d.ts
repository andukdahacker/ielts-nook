import "i18next";

/**
 * Module augmentation that fixes the default namespace and the namespace
 * names. We intentionally do NOT bind a strict `resources: typeof ...` map
 * because the codebase uses many dynamically-constructed keys (status maps,
 * tier maps, role maps, count discriminators, ...) that would otherwise need
 * runtime escape hatches. The goal here is to give i18next the namespace
 * shape so the wrong-namespace argument errors get caught, while keeping
 * `t(key)` ergonomic.
 *
 * Per spec Task 1.3 (story 8-4): typed augmentation is provided so that
 * `useTranslation` namespace strings are statically validated.
 */
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: {
      common: Record<string, string>;
      auth: Record<string, string>;
      exercises: Record<string, string>;
      grading: Record<string, string>;
      settings: Record<string, string>;
      dashboard: Record<string, string>;
      logistics: Record<string, string>;
      users: Record<string, string>;
      assignments: Record<string, string>;
      submissions: Record<string, string>;
      "student-health": Record<string, string>;
      "mock-tests": Record<string, string>;
    };
    returnNull: false;
  }
}
