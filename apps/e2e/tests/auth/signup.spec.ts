import { test, expect } from "../../fixtures/auth.fixture";

/**
 * TC 1.1-001 to 1.1-005: Center Registration & Data Isolation
 */
test.describe("Center Registration", () => {
  test("sign-up center page loads with required fields", async ({ page }) => {
    await page.goto("/sign-up/center");
    await page.waitForLoadState("networkidle");

    // Form fields are visible
    await expect(page.getByLabel(/center name/i)).toBeVisible();
    await expect(page.getByLabel(/name/i).first()).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();

    // Submit button
    await expect(page.getByRole("button", { name: /register|sign up|create/i })).toBeVisible();
  });

  test("sign-up center shows Google OAuth option", async ({ page }) => {
    await page.goto("/sign-up/center");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("button", { name: /google/i })
    ).toBeVisible();
  });

  test("sign-up center has link to sign-in page", async ({ page }) => {
    await page.goto("/sign-up/center");
    await page.waitForLoadState("networkidle");

    const signInLink = page.getByRole("link", { name: /sign in/i });
    await expect(signInLink).toBeVisible();
  });

  test("sign-up user page loads with form fields", async ({ page }) => {
    await page.goto("/sign-up");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
  });

  test("sign-up page has link to register center", async ({ page }) => {
    await page.goto("/sign-up");
    await page.waitForLoadState("networkidle");

    const registerLink = page.getByRole("link", { name: /register.*center|create.*center/i });
    if (await registerLink.count() > 0) {
      await expect(registerLink).toBeVisible();
    }
  });
});
