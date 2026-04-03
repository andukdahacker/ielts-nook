import { test, expect, TEST_USERS, loginAs, getAppUrl } from "../../fixtures/auth.fixture";
import { closeAIAssistantDialog } from "../../utils/close-ai-assistant";

/**
 * Helper: navigate to courses page and wait for content to load.
 */
async function gotoCourses(page: import("@playwright/test").Page, user: (typeof TEST_USERS)[keyof typeof TEST_USERS]) {
  await loginAs(page, user);
  await page.goto(getAppUrl("/courses"));
  await page.waitForLoadState("networkidle");
  await closeAIAssistantDialog(page);
  await page.getByRole("heading", { name: "Courses" }).first().waitFor({ timeout: 15000 });
}

test.describe("Courses - Page Structure", () => {
  test.beforeEach(async ({ page }) => {
    await gotoCourses(page, TEST_USERS.OWNER);
  });

  test("displays the Courses heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Courses" }).first()
    ).toBeVisible();
  });

  test("displays table with correct columns", async ({ page }) => {
    await expect(page.locator("th").filter({ hasText: "Color" }).first()).toBeVisible();
    await expect(page.locator("th").filter({ hasText: "Name" }).first()).toBeVisible();
    await expect(page.locator("th").filter({ hasText: "Description" }).first()).toBeVisible();
    await expect(page.locator("th").filter({ hasText: "Actions" }).first()).toBeVisible();
  });

  test("shows seeded E2E Test Course row", async ({ page }) => {
    await expect(page.locator("td").filter({ hasText: "E2E Test Course" }).first()).toBeVisible();
  });
});

test.describe("Courses - RBAC", () => {
  test("owner sees New Course button", async ({ page }) => {
    await gotoCourses(page, TEST_USERS.OWNER);

    await expect(
      page.getByRole("button", { name: "New Course" }).first()
    ).toBeVisible();
  });

  test("admin sees New Course button", async ({ page }) => {
    await gotoCourses(page, TEST_USERS.ADMIN);

    await expect(
      page.getByRole("button", { name: "New Course" }).first()
    ).toBeVisible();
  });

  test("teacher does NOT see New Course button", async ({ page }) => {
    await gotoCourses(page, TEST_USERS.TEACHER);

    await expect(
      page.getByRole("button", { name: "New Course" })
    ).toHaveCount(0);
  });

  test("student is redirected away from courses", async ({ page }) => {
    await loginAs(page, TEST_USERS.STUDENT);
    await closeAIAssistantDialog(page);
    await page.goto(getAppUrl("/courses"));
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toContain("/courses");
  });
});

test.describe("Courses - Create Course Flow", () => {
  test.beforeEach(async ({ page }) => {
    await gotoCourses(page, TEST_USERS.OWNER);
  });

  test("New Course button opens drawer with step-1 fields", async ({ page }) => {
    await page.getByRole("button", { name: "New Course" }).first().click();

    // Wait for drawer to open
    await expect(page.getByText("Create New Course")).toBeVisible({ timeout: 5000 });

    // Step 1 fields should be present
    await expect(page.getByLabel("Course Name")).toBeVisible();
    await expect(page.getByLabel("Description")).toBeVisible();
    await expect(page.getByLabel("Brand Color")).toBeVisible();
  });

  test("drawer shows step 1 fields with Next button", async ({ page }) => {
    await page.getByRole("button", { name: "New Course" }).first().click();
    await expect(page.getByText("Create New Course")).toBeVisible({ timeout: 5000 });

    // Step 1 fields should be present (use getByLabel for form fields)
    await expect(page.getByLabel("Course Name")).toBeVisible();
    await expect(page.getByLabel("Description")).toBeVisible();
    await expect(page.getByLabel("Brand Color")).toBeVisible();

    // Next button should be visible for wizard navigation
    await expect(page.getByRole("button", { name: /Next/ })).toBeVisible();
  });
});

test.describe("Courses - Step Transition (Story 11.1)", () => {
  test.beforeEach(async ({ page }) => {
    await gotoCourses(page, TEST_USERS.OWNER);
  });

  test("clicking Next with valid Step 1 data shows Step 2 content", async ({ page }) => {
    await page.getByRole("button", { name: "New Course" }).first().click();
    await expect(page.getByText("Create New Course")).toBeVisible({ timeout: 5000 });

    // Fill required Step 1 fields
    await page.getByLabel("Course Name").fill("Step Transition Test");

    // Click Next
    await page.getByRole("button", { name: /Next/ }).click();

    // Step 2 content should be visible
    await expect(page.getByText("Scheduling & Roster")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Configure scheduling and roster options.")).toBeVisible();

    // Step 2 submit button should be visible
    await expect(page.getByRole("button", { name: "Create Course" })).toBeVisible();

    // Back button should be visible
    await expect(page.getByRole("button", { name: /Back/ })).toBeVisible();
  });

  test("clicking Next with empty required fields shows validation errors", async ({ page }) => {
    await page.getByRole("button", { name: "New Course" }).first().click();
    await expect(page.getByText("Create New Course")).toBeVisible({ timeout: 5000 });

    // Leave Course Name empty, click Next
    await page.getByRole("button", { name: /Next/ }).click();

    // Should stay on Step 1 — validation error visible
    await expect(page.getByLabel("Course Name")).toBeVisible();
    // Step 2 content should NOT appear
    await expect(page.getByText("Scheduling & Roster")).not.toBeVisible();
  });

  test("full create flow: Step 1 → Next → Step 2 → Create Course", async ({ page }) => {
    await page.getByRole("button", { name: "New Course" }).first().click();
    await expect(page.getByText("Create New Course")).toBeVisible({ timeout: 5000 });

    // Fill Step 1
    const uniqueName = `E2E Flow Test ${Date.now()}`;
    await page.getByLabel("Course Name").fill(uniqueName);
    await page.getByLabel("Description").fill("Created via E2E test");

    // Advance to Step 2
    await page.getByRole("button", { name: /Next/ }).click();
    await expect(page.getByText("Scheduling & Roster")).toBeVisible({ timeout: 5000 });

    // Submit on Step 2
    await page.getByRole("button", { name: "Create Course" }).click();

    // Drawer should close and success toast should appear
    await expect(page.getByText("Course created successfully")).toBeVisible({ timeout: 5000 });

    // New course should appear in the table
    await expect(page.locator("td").filter({ hasText: uniqueName })).toBeVisible({ timeout: 10000 });

    // Cleanup: delete the created course
    page.on("dialog", (dialog) => dialog.accept());
    const createdRow = page.locator("tr").filter({ hasText: uniqueName });
    await createdRow.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Course deleted successfully")).toBeVisible({ timeout: 5000 });
  });

  test("edit flow: Step 1 → Next saves → Step 2 → Save Changes", async ({ page }) => {
    // Create a course to edit
    const editName = `Edit Flow Test ${Date.now()}`;
    await page.getByRole("button", { name: "New Course" }).first().click();
    await expect(page.getByText("Create New Course")).toBeVisible({ timeout: 5000 });
    await page.getByLabel("Course Name").fill(editName);
    await page.getByRole("button", { name: /Next/ }).click();
    await expect(page.getByText("Scheduling & Roster")).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Create Course" }).click();
    await expect(page.getByText("Course created successfully")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("td").filter({ hasText: editName })).toBeVisible({ timeout: 10000 });

    // Open edit drawer for the course we just created
    const courseRow = page.locator("tr").filter({ hasText: editName });
    await courseRow.getByRole("button", { name: "Edit" }).click();

    await expect(page.getByText("Edit Course")).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel("Course Name")).toHaveValue(editName);

    // Click Next — should save and advance
    await page.getByRole("button", { name: /Next/ }).click();

    // Should see save confirmation and Step 2
    await expect(page.getByText("Changes saved")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Scheduling & Roster")).toBeVisible({ timeout: 5000 });

    // Submit on Step 2
    await page.getByRole("button", { name: "Save Changes" }).click();

    // Drawer should close
    await expect(page.getByText("Course updated successfully")).toBeVisible({ timeout: 5000 });
  });

  test("edit flow: Next shows error and stays on Step 1 when save fails (AC4)", async ({ page }) => {
    // Create a course to edit
    const failName = `Fail Test ${Date.now()}`;
    await page.getByRole("button", { name: "New Course" }).first().click();
    await expect(page.getByText("Create New Course")).toBeVisible({ timeout: 5000 });
    await page.getByLabel("Course Name").fill(failName);
    await page.getByRole("button", { name: /Next/ }).click();
    await expect(page.getByText("Scheduling & Roster")).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Create Course" }).click();
    await expect(page.getByText("Course created successfully")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("td").filter({ hasText: failName })).toBeVisible({ timeout: 10000 });

    // Open edit drawer
    const courseRow = page.locator("tr").filter({ hasText: failName });
    await courseRow.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByText("Edit Course")).toBeVisible({ timeout: 5000 });

    // Intercept the update API call and force a failure
    await page.route("**/api/v1/logistics/courses/**", (route) => {
      if (route.request().method() === "PATCH") {
        route.fulfill({ status: 500, body: "Internal Server Error" });
      } else {
        route.continue();
      }
    });

    // Click Next — should fail and stay on Step 1
    await page.getByRole("button", { name: /Next/ }).click();

    // Error toast should appear
    await expect(page.getByText("Failed to save changes")).toBeVisible({ timeout: 5000 });

    // Should remain on Step 1
    await expect(page.getByLabel("Course Name")).toBeVisible();
    await expect(page.getByText("Scheduling & Roster")).not.toBeVisible();
  });
});

test.describe("Courses - Edit Course", () => {
  test("edit icon opens drawer pre-filled with course data", async ({ page }) => {
    await gotoCourses(page, TEST_USERS.OWNER);

    await page.locator("td").filter({ hasText: "E2E Test Course" }).first().waitFor({ timeout: 10000 });
    const courseRow = page.locator("tr").filter({ hasText: "E2E Test Course" });
    await courseRow.getByRole("button", { name: "Edit" }).click();

    await expect(page.getByText("Edit Course")).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel("Course Name")).toHaveValue("E2E Test Course");
  });
});
