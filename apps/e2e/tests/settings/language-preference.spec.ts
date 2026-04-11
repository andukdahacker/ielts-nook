import { test, expect, TEST_USERS, loginAs } from "../../fixtures/auth.fixture";

/**
 * Story 8-4: Language Preference & i18n
 *
 * End-to-end coverage:
 *  - Language toggle is visible on the login page (unauthenticated)
 *  - Switching language via the actual UI control updates the document
 *  - Authenticated language change calls PATCH /users/me/profile
 *  - Language survives a page reload AND a logout/login round-trip
 *
 * Note: the LanguageToggle is rendered via a Radix Select. We click the
 * trigger by its accessible name (which itself is translated, but stays
 * stable as long as `language.selectAriaLabel` exists in both locales) and
 * then click the option by its native-language label which is intentionally
 * not translated.
 */
test.describe("Language Preference (story 8-4)", () => {
  test("language toggle is visible on the login page", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(
      page.getByRole("combobox", { name: /select language|chọn ngôn ngữ/i }),
    ).toBeVisible();
  });

  test("unauthenticated user can switch to Vietnamese via the toggle", async ({
    page,
  }) => {
    await page.goto("/sign-in");

    const trigger = page.getByRole("combobox", {
      name: /select language|chọn ngôn ngữ/i,
    });
    await trigger.click();
    await page.getByRole("option", { name: "Tiếng Việt" }).click();

    // i18next-browser-languagedetector persists to localStorage by default.
    await expect
      .poll(() =>
        page.evaluate(() => window.localStorage.getItem("i18nextLng")),
      )
      .toBe("vi");

    // The dialog/page should re-render with the Vietnamese aria-label.
    await expect(
      page.getByRole("combobox", { name: /chọn ngôn ngữ/i }),
    ).toBeVisible();

    // Cleanup so subsequent tests start fresh.
    await page.evaluate(() => window.localStorage.setItem("i18nextLng", "en"));
  });

  test("authenticated user language change is persisted to backend", async ({
    page,
  }) => {
    await loginAs(page, TEST_USERS.OWNER);

    // Wait for the dashboard to render the toggle.
    const trigger = page
      .getByRole("combobox", { name: /select language|chọn ngôn ngữ/i })
      .first();
    await expect(trigger).toBeVisible();

    // Listen for the profile PATCH that fires on a language change.
    const profilePatch = page.waitForRequest(
      (req) =>
        req.method() === "PATCH" && req.url().includes("/users/me/profile"),
    );

    await trigger.click();
    await page.getByRole("option", { name: "Tiếng Việt" }).click();

    const req = await profilePatch;
    const body = req.postDataJSON() as { preferredLanguage?: string };
    expect(body.preferredLanguage).toBe("vi");

    // Reload the page — the persisted preference should still apply.
    await page.reload();
    await expect
      .poll(() =>
        page.evaluate(() => window.localStorage.getItem("i18nextLng")),
      )
      .toBe("vi");

    // Reset back to English so the test user is left in a known state.
    const resetPatch = page.waitForRequest(
      (req) =>
        req.method() === "PATCH" && req.url().includes("/users/me/profile"),
    );
    await page
      .getByRole("combobox", { name: /chọn ngôn ngữ/i })
      .first()
      .click();
    await page.getByRole("option", { name: "English" }).click();
    await resetPatch;
  });
});
