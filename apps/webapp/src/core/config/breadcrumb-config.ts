/**
 * Static route segment to label mapping for breadcrumbs.
 * Dynamic segments (e.g., user IDs) should be passed via customLabels prop.
 */
export const breadcrumbConfig: Record<string, string> = {
  dashboard: "Dashboard",
  users: "Users",
  courses: "Courses",
  classes: "Classes",
  schedule: "Schedule",
  exercises: "Exercises",
  grading: "Grading",
  students: "Students",
  settings: "Settings",
  profile: "My Profile",
  general: "General",
  integrations: "Integrations",
  privacy: "Privacy",
  billing: "Billing",
  new: "New",
  edit: "Edit",
};
