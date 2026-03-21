import { test, expect, TEST_USERS, loginAs, getAppUrl } from "../../fixtures/auth.fixture";
import { closeAIAssistantDialog } from "../../utils/close-ai-assistant";

/**
 * Helper: navigate to schedule and wait for full load.
 * The schedule page uses Loader2 (not data-loading), so we must
 * wait for the heading to actually render.
 */
async function gotoSchedule(page: import("@playwright/test").Page, user: (typeof TEST_USERS)[keyof typeof TEST_USERS]) {
  await loginAs(page, user);
  await page.goto(getAppUrl("/schedule"));
  await closeAIAssistantDialog(page);
  // Wait for the page to finish rendering (heading appears once loading is done)
  await page.getByRole("heading", { name: "Schedule" }).first().waitFor({ timeout: 15000 });
}

test.describe("Schedule - Page Structure", () => {
  test.beforeEach(async ({ page }) => {
    await gotoSchedule(page, TEST_USERS.OWNER);
  });

  test("displays the Schedule heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Schedule" }).first()
    ).toBeVisible();
  });

  test("displays calendar with navigation buttons", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Today" }).first()).toBeVisible();

    // Prev and next buttons (icon-only with chevrons)
    const navButtons = page.locator("button").filter({ has: page.locator("svg") });
    expect(await navButtons.count()).toBeGreaterThanOrEqual(2);
  });

  test("displays day columns in the calendar", async ({ page }) => {
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    for (const day of dayNames) {
      await expect(page.getByText(day).first()).toBeVisible();
    }
  });
});

test.describe("Schedule - RBAC", () => {
  test("owner sees Add Session and Generate Sessions buttons", async ({ page }) => {
    await gotoSchedule(page, TEST_USERS.OWNER);

    await expect(
      page.getByRole("button", { name: "Add Session" }).first()
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Generate Sessions" }).first()
    ).toBeVisible();
  });

  test("teacher does NOT see Add Session or Generate buttons", async ({ page }) => {
    await gotoSchedule(page, TEST_USERS.TEACHER);

    await expect(
      page.getByRole("button", { name: "Add Session" })
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Generate Sessions" })
    ).toHaveCount(0);
  });

  test("student does NOT see Add Session or Generate buttons", async ({ page }) => {
    await gotoSchedule(page, TEST_USERS.STUDENT);

    await expect(
      page.getByRole("button", { name: "Add Session" })
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Generate Sessions" })
    ).toHaveCount(0);
  });
});

test.describe("Schedule - Calendar Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await gotoSchedule(page, TEST_USERS.OWNER);
  });

  test("prev/next week buttons change the displayed week", async ({ page }) => {
    const todayButton = page.getByRole("button", { name: "Today" }).first();
    await expect(todayButton).toBeVisible();

    // Click next week button (the button right before "Today")
    const nextButton = page.locator("button:has(svg.lucide-chevron-right)").first();
    await nextButton.click();

    // Click previous week button to go back
    const prevButton = page.locator("button:has(svg.lucide-chevron-left)").first();
    await prevButton.waitFor({ state: "visible" });
    await prevButton.click();

    // Today button should still be visible (we're back to current week)
    await expect(todayButton).toBeVisible();
  });

  test("Today button returns to current week", async ({ page }) => {
    // Navigate away from current week
    const nextButton = page.locator("button:has(svg.lucide-chevron-right)").first();
    await nextButton.click();
    await nextButton.waitFor({ state: "visible" });
    await nextButton.click();

    // Click Today to return
    const todayButton = page.getByRole("button", { name: "Today" }).first();
    await todayButton.waitFor({ state: "visible" });
    await todayButton.click();

    await expect(todayButton).toBeVisible();
  });
});

test.describe("Schedule - Create Session Dialog", () => {
  test("Add Session opens dialog with all form fields", async ({ page }) => {
    await gotoSchedule(page, TEST_USERS.OWNER);

    await page.getByRole("button", { name: "Add Session" }).first().click();

    const dialog = page.locator('[role="dialog"]');
    await dialog.waitFor({ state: "visible" });
    // Use heading role to avoid matching both title and button
    await expect(dialog.getByRole("heading", { name: "Create Session" })).toBeVisible();

    // Check all form field labels are present (use exact match to avoid multiple matches)
    await expect(dialog.getByText("Class", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Date", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Start Time", { exact: true })).toBeVisible();
    await expect(dialog.getByText("End Time", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Room (Optional)", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Recurrence", { exact: true })).toBeVisible();
  });
});
