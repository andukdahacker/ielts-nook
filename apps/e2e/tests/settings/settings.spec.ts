import { test, expect, TEST_USERS, loginAs, getAppUrl } from "../../fixtures/auth.fixture";
import { closeAIAssistantDialog } from "../../utils/close-ai-assistant";
import { waitForToast } from "../../utils/test-helpers";
import { uniqueName } from "../../fixtures/exercise-fixtures";
import type { Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the visible Settings navigation (desktop vs. mobile layout).
 * Desktop nav is inside an aside (hidden md:block), mobile is inside a div (md:hidden).
 * Only one is visible depending on viewport width.
 */
async function getVisibleSettingsNav(page: Page) {
  const navs = page.locator('nav[aria-label="Settings navigation"]');
  const firstVisible = await navs.nth(0).isVisible();
  return firstVisible ? navs.nth(0) : navs.nth(1);
}

async function gotoSettings(page: Page, user: (typeof TEST_USERS)[keyof typeof TEST_USERS]) {
  await loginAs(page, user);
  await page.goto(getAppUrl("/settings"));
  await page.waitForLoadState("networkidle");
  await closeAIAssistantDialog(page);
  await page.getByRole("heading", { name: "Settings" }).first().waitFor({ timeout: 15000 });
}

async function gotoGeneralSettings(page: Page, user: (typeof TEST_USERS)[keyof typeof TEST_USERS]) {
  await loginAs(page, user);
  await page.goto(getAppUrl("/settings"));
  await page.waitForLoadState("networkidle");
  await closeAIAssistantDialog(page);
  await page.getByRole("heading", { name: "Center Settings" }).first().waitFor({ timeout: 15000 });
}

async function gotoTagsSettings(page: Page, user: (typeof TEST_USERS)[keyof typeof TEST_USERS]) {
  await loginAs(page, user);
  await page.goto(getAppUrl("/settings/tags"));
  await page.waitForLoadState("networkidle");
  await closeAIAssistantDialog(page);
  await page.getByText("Topic Tags").first().waitFor({ timeout: 15000 });
}

function getTagRow(page: Page, tagName: string) {
  return page.locator(".divide-y > div").filter({ hasText: tagName });
}

// ---------------------------------------------------------------------------
// Group 1: Settings Layout & Navigation
// ---------------------------------------------------------------------------

test.describe("Settings Layout & Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await gotoSettings(page, TEST_USERS.OWNER);
  });

  test("displays all settings navigation tabs", async ({ page }) => {
    const nav = await getVisibleSettingsNav(page);
    const tabNames = ["General", "Users", "Rooms", "Tags", "Integrations", "Privacy", "Billing"];
    for (const name of tabNames) {
      await expect(nav.getByRole("button", { name: new RegExp(name) })).toBeVisible();
    }
  });

  test("General tab is active by default", async ({ page }) => {
    const nav = await getVisibleSettingsNav(page);
    const generalBtn = nav.getByRole("button", { name: /^General$/ });
    await expect(generalBtn).toHaveAttribute("aria-current", "page");
  });

  test("clicking a tab navigates and updates active state", async ({ page }) => {
    const nav = await getVisibleSettingsNav(page);
    await nav.getByRole("button", { name: /^Rooms$/ }).click();
    await page.waitForURL(/.*\/settings\/rooms/);

    const navAfter = await getVisibleSettingsNav(page);
    await expect(
      navAfter.getByRole("button", { name: /^Rooms$/ })
    ).toHaveAttribute("aria-current", "page");
    await expect(
      navAfter.getByRole("button", { name: /^General$/ })
    ).not.toHaveAttribute("aria-current", "page");
  });

  test("Billing tab is enabled and navigable", async ({ page }) => {
    const nav = await getVisibleSettingsNav(page);
    const billingBtn = nav.getByRole("button", { name: /Billing/ });
    await expect(billingBtn).toBeEnabled();
    await billingBtn.click();
    await expect(page.getByText(/Billing/)).toBeVisible();
  });

  test("placeholder pages show Coming Soon", async ({ page }) => {
    const nav = await getVisibleSettingsNav(page);

    // Integrations
    await nav.getByRole("button", { name: /^Integrations$/ }).click();
    await expect(page.getByRole("heading", { name: "Coming Soon" })).toBeVisible();

    // Privacy
    const nav2 = await getVisibleSettingsNav(page);
    await nav2.getByRole("button", { name: /^Privacy$/ }).click();
    await expect(page.getByRole("heading", { name: "Coming Soon" })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Group 2: Settings RBAC
// ---------------------------------------------------------------------------

test.describe("Settings RBAC", () => {
  test("OWNER can access settings", async ({ page }) => {
    await gotoSettings(page, TEST_USERS.OWNER);
    await expect(page.getByRole("heading", { name: "Settings" }).first()).toBeVisible();
  });

  test("ADMIN can access settings", async ({ page }) => {
    await gotoSettings(page, TEST_USERS.ADMIN);
    await expect(page.getByRole("heading", { name: "Settings" }).first()).toBeVisible();
  });

  test("TEACHER is redirected away from settings", async ({ page }) => {
    await loginAs(page, TEST_USERS.TEACHER);
    await closeAIAssistantDialog(page);
    await page.goto(getAppUrl("/settings"));
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toContain("/settings");
  });

  test("STUDENT is redirected away from settings", async ({ page }) => {
    await loginAs(page, TEST_USERS.STUDENT);
    await closeAIAssistantDialog(page);
    await page.goto(getAppUrl("/settings"));
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toContain("/settings");
  });
});

// ---------------------------------------------------------------------------
// Group 3: General Settings — Center Branding
// ---------------------------------------------------------------------------

test.describe("General Settings — Center Branding", () => {
  test.beforeEach(async ({ page }) => {
    await gotoGeneralSettings(page, TEST_USERS.OWNER);
  });

  test("displays center settings form", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Center Settings" })).toBeVisible();
    await expect(page.getByText("branding and regional settings")).toBeVisible();
    await expect(page.getByLabel("Center Name")).toBeVisible();
    await expect(page.getByLabel("Brand Color")).toBeVisible();
    await expect(page.getByLabel("Timezone")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save Changes" })).toBeVisible();
  });

  test("center name is pre-populated from seed data", async ({ page }) => {
    const nameInput = page.getByLabel("Center Name");
    await expect(nameInput).toHaveValue("E2E Test Center");
    await expect(nameInput).toHaveAttribute("placeholder", "e.g. ClassLite Academy");
  });

  test("update center name and verify toast", async ({ page }) => {
    const nameInput = page.getByLabel("Center Name");
    const originalName = await nameInput.inputValue();
    const tempName = `E2E Updated ${Date.now()}`;

    await nameInput.clear();
    await nameInput.fill(tempName);
    await page.getByRole("button", { name: "Save Changes" }).click();
    await waitForToast(page, "Center settings updated successfully");

    // Restore original name via API
    const token = await page.evaluate(() => localStorage.getItem("token"));
    const backendUrl = process.env.VITE_API_URL || "http://localhost:4000";
    await page.request.patch(
      `${backendUrl}/api/v1/tenants/e2e-test-center`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: { name: originalName },
      }
    );
  });

  test("logo upload section is visible", async ({ page }) => {
    await expect(page.getByText("Change Logo")).toBeVisible();
    await expect(page.getByText(/Max size 2MB/)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Group 4: Tags Merge (supplements existing tags.spec.ts)
// ---------------------------------------------------------------------------

test.describe("Tags Merge", () => {
  test("merge dialog opens with correct UI", async ({ page }) => {
    await gotoTagsSettings(page, TEST_USERS.OWNER);

    const tag1 = uniqueName("E2E MergeUI-A");
    const tag2 = uniqueName("E2E MergeUI-B");

    // Create two tags
    await page.getByPlaceholder(/New tag name/i).fill(tag1);
    await page.getByRole("button", { name: /Add Tag/i }).click();
    await waitForToast(page, "Tag created");

    await page.getByPlaceholder(/New tag name/i).fill(tag2);
    await page.getByRole("button", { name: /Add Tag/i }).click();
    await waitForToast(page, "Tag created");

    // Click Merge on first tag
    const tagRow = getTagRow(page, tag1);
    await tagRow.locator('button[title="Merge"]').click();

    // Verify dialog
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Merge Tag")).toBeVisible();
    await expect(dialog.getByText("Select target tag")).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Merge", exact: true })
    ).toBeDisabled();
  });

  test("merge tags successfully", async ({ page }) => {
    await gotoTagsSettings(page, TEST_USERS.OWNER);

    const tag1 = uniqueName("E2E MergeSrc");
    const tag2 = uniqueName("E2E MergeTgt");

    // Create two tags
    await page.getByPlaceholder(/New tag name/i).fill(tag1);
    await page.getByRole("button", { name: /Add Tag/i }).click();
    await waitForToast(page, "Tag created");

    await page.getByPlaceholder(/New tag name/i).fill(tag2);
    await page.getByRole("button", { name: /Add Tag/i }).click();
    await waitForToast(page, "Tag created");

    // Click Merge on source tag
    const tagRow = getTagRow(page, tag1);
    await tagRow.locator('button[title="Merge"]').click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Select target tag
    await dialog.getByRole("combobox").click();
    await page.getByRole("option").filter({ hasText: tag2 }).click();

    // Click Merge
    await dialog.getByRole("button", { name: "Merge", exact: true }).click();
    await waitForToast(page, "Tags merged successfully");

    // Source tag gone, target tag still visible
    await expect(page.getByText(tag1)).not.toBeVisible();
    await expect(page.getByText(tag2)).toBeVisible();
  });

  test("merge dialog cancel closes without merging", async ({ page }) => {
    await gotoTagsSettings(page, TEST_USERS.OWNER);

    const tag1 = uniqueName("E2E MergeCancel-A");
    const tag2 = uniqueName("E2E MergeCancel-B");

    // Create two tags
    await page.getByPlaceholder(/New tag name/i).fill(tag1);
    await page.getByRole("button", { name: /Add Tag/i }).click();
    await waitForToast(page, "Tag created");

    await page.getByPlaceholder(/New tag name/i).fill(tag2);
    await page.getByRole("button", { name: /Add Tag/i }).click();
    await waitForToast(page, "Tag created");

    // Open merge dialog
    const tagRow = getTagRow(page, tag1);
    await tagRow.locator('button[title="Merge"]').click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Cancel
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).not.toBeVisible();

    // Both tags still visible
    await expect(page.getByText(tag1)).toBeVisible();
    await expect(page.getByText(tag2)).toBeVisible();
  });
});
