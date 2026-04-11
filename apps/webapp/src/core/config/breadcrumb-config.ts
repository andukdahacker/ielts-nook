/**
 * Static route segment to translation key mapping for breadcrumbs.
 * Values are i18n keys resolved at render time via t().
 * Dynamic segments (e.g., user IDs) should be passed via customLabels prop.
 */
export const breadcrumbConfig: Record<string, string> = {
  dashboard: "breadcrumb.dashboard",
  users: "breadcrumb.users",
  courses: "breadcrumb.courses",
  classes: "breadcrumb.classes",
  schedule: "breadcrumb.schedule",
  exercises: "breadcrumb.exercises",
  grading: "breadcrumb.grading",
  students: "breadcrumb.students",
  settings: "breadcrumb.settings",
  profile: "breadcrumb.profile",
  general: "breadcrumb.general",
  integrations: "breadcrumb.integrations",
  privacy: "breadcrumb.privacy",
  billing: "breadcrumb.billing",
  new: "breadcrumb.new",
  edit: "breadcrumb.edit",
  assignments: "breadcrumb.assignments",
  "mock-tests": "breadcrumb.mockTests",
  "student-health": "breadcrumb.studentHealth",
  rooms: "breadcrumb.rooms",
  tags: "breadcrumb.tags",
  compliance: "breadcrumb.compliance",
  moderation: "breadcrumb.moderation",
  feedback: "breadcrumb.feedback",
  take: "breadcrumb.take",
  preview: "breadcrumb.preview",
};
