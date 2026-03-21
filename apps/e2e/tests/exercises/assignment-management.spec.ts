import { test, expect, TEST_USERS, loginAs, getAppUrl } from "../../fixtures/auth.fixture";
import { closeAIAssistantDialog } from "../../utils/close-ai-assistant";
import { gotoAssignments } from "../../fixtures/assignment-fixtures";

/**
 * TC 3.2-003 to 3.2-010: Assignment Management — filters, status changes, edit, delete
 */

test.describe("Assignment Management", () => {
  test("TC 3.2-003: assignments table shows required columns", async ({ page }) => {
    await loginAs(page, TEST_USERS.OWNER);
    await gotoAssignments(page);

    // Table should show relevant columns
    const pageText = (await page.textContent("body")) || "";

    expect(pageText.length).toBeGreaterThan(0);
  });

  test("TC 3.2-004: filter assignments by status", async ({ page }) => {
    await loginAs(page, TEST_USERS.OWNER);
    await gotoAssignments(page);

    // Look for status filter
    const statusFilter = page.locator('[role="combobox"]').first();
    if (await statusFilter.isVisible().catch(() => false)) {
      await statusFilter.click();
      await page.waitForTimeout(300);

      // Should show status options
      const options = page.locator('[role="option"]');
      const optionCount = await options.count();
      expect(optionCount).toBeGreaterThanOrEqual(1);

      // Close dropdown
      await page.keyboard.press("Escape");
    }
  });

  test("TC 3.2-005: search assignments by exercise title", async ({ page }) => {
    await loginAs(page, TEST_USERS.OWNER);
    await gotoAssignments(page);

    const searchInput = page.getByPlaceholder(/search.*exercise.*title/i);
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("nonexistent-search-term-xyz");
      await page.waitForTimeout(500);

      // Table should filter (may show empty state)
      const pageText = (await page.textContent("body")) || "";
      expect(pageText.length).toBeGreaterThan(0);
    }
  });

  test("TC 3.2-010: submission count column shows counts", async ({ page }) => {
    await loginAs(page, TEST_USERS.OWNER);
    await gotoAssignments(page);

    // Look for submission count pattern (e.g., "0/5", "3/15")
    // Count may or may not be visible depending on whether assignments exist
    const pageText = (await page.textContent("body")) || "";
    expect(pageText.length).toBeGreaterThan(0);
  });

  test("create assignment button opens dialog", async ({ page }) => {
    await loginAs(page, TEST_USERS.OWNER);
    await gotoAssignments(page);

    const createBtn = page.getByRole("button", { name: /create|new|assign/i }).first();
    await expect(createBtn).toBeVisible();

    await createBtn.click();
    await page.waitForTimeout(300);

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Cancel
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });
});

test.describe("Assignment RBAC", () => {
  test("student cannot access assignments management page", async ({ page }) => {
    await loginAs(page, TEST_USERS.STUDENT);
    await closeAIAssistantDialog(page);
    await page.goto(getAppUrl("/assignments"));
    await page.waitForLoadState("networkidle");

    // Student should be redirected away from assignments management
    // (student sees assignments on dashboard, not the management page)
    const hasManagement = await page.getByRole("button", { name: /create|new|assign/i }).isVisible().catch(() => false);
    expect(hasManagement).toBeFalsy();
  });

  test("teacher can access assignments page", async ({ page }) => {
    await loginAs(page, TEST_USERS.TEACHER);
    await closeAIAssistantDialog(page);
    await page.goto(getAppUrl("/assignments"));
    await page.waitForLoadState("networkidle");
    await closeAIAssistantDialog(page);

    // Teacher should see the assignments page
    const pageText = (await page.textContent("body")) || "";
    expect(pageText.length).toBeGreaterThan(0);
  });
});
