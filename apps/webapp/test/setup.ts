import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "../src/locales/en/common.json";
import enAuth from "../src/locales/en/auth.json";
import enExercises from "../src/locales/en/exercises.json";
import enGrading from "../src/locales/en/grading.json";
import enSettings from "../src/locales/en/settings.json";
import enDashboard from "../src/locales/en/dashboard.json";
import enLogistics from "../src/locales/en/logistics.json";
import enUsers from "../src/locales/en/users.json";
import enAssignments from "../src/locales/en/assignments.json";
import enSubmissions from "../src/locales/en/submissions.json";
import enStudentHealth from "../src/locales/en/student-health.json";
import enMockTests from "../src/locales/en/mock-tests.json";

import viCommon from "../src/locales/vi/common.json";
import viAuth from "../src/locales/vi/auth.json";
import viExercises from "../src/locales/vi/exercises.json";
import viGrading from "../src/locales/vi/grading.json";
import viSettings from "../src/locales/vi/settings.json";
import viDashboard from "../src/locales/vi/dashboard.json";
import viLogistics from "../src/locales/vi/logistics.json";
import viUsers from "../src/locales/vi/users.json";
import viAssignments from "../src/locales/vi/assignments.json";
import viSubmissions from "../src/locales/vi/submissions.json";
import viStudentHealth from "../src/locales/vi/student-health.json";
import viMockTests from "../src/locales/vi/mock-tests.json";

// Initialize i18n synchronously for tests so t() returns real translations
// instead of falling back to keys. Because we pass `resources` directly,
// init() resolves on the same microtask — the bootstrap is effectively sync.
if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    lng: "en",
    fallbackLng: "en",
    defaultNS: "common",
    ns: [
      "common",
      "auth",
      "exercises",
      "grading",
      "settings",
      "dashboard",
      "logistics",
      "users",
      "assignments",
      "submissions",
      "student-health",
      "mock-tests",
    ],
    resources: {
      en: {
        common: enCommon,
        auth: enAuth,
        exercises: enExercises,
        grading: enGrading,
        settings: enSettings,
        dashboard: enDashboard,
        logistics: enLogistics,
        users: enUsers,
        assignments: enAssignments,
        submissions: enSubmissions,
        "student-health": enStudentHealth,
        "mock-tests": enMockTests,
      },
      vi: {
        common: viCommon,
        auth: viAuth,
        exercises: viExercises,
        grading: viGrading,
        settings: viSettings,
        dashboard: viDashboard,
        logistics: viLogistics,
        users: viUsers,
        assignments: viAssignments,
        submissions: viSubmissions,
        "student-health": viStudentHealth,
        "mock-tests": viMockTests,
      },
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

// Mock ResizeObserver for Radix UI components
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(() => {
  cleanup();
});
