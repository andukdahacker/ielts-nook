import { test, expect, TEST_USERS } from "../../fixtures/auth.fixture";
import { loginAs, getAppUrl } from "../../fixtures/auth.fixture";
import { closeAIAssistantDialog } from "../../utils/close-ai-assistant";

/**
 * Helper: navigate to the user's own profile page.
 */
async function gotoProfile(page: import("@playwright/test").Page) {
  await page.goto(getAppUrl("/profile"));
  await page.waitForLoadState("networkidle");
  await closeAIAssistantDialog(page);
  // Wait for the card title "My Profile" (not the nav link or breadcrumb)
  await page
    .locator('[data-slot="card-title"]')
    .filter({ hasText: "My Profile" })
    .waitFor({ timeout: 10000 });
}

/** The profile card title locator (avoids strict mode issues with nav/breadcrumb). */
function profileCardTitle(page: import("@playwright/test").Page) {
  return page
    .locator('[data-slot="card-title"]')
    .filter({ hasText: "My Profile" });
}

// ─── Profile Page — Display ────────────────────────────────────────────────

test.describe("Profile Page — Display", () => {
  test("displays profile page with user info", async ({ page }) => {
    await loginAs(page, TEST_USERS.OWNER);
    await gotoProfile(page);

    // Card title "My Profile"
    await expect(profileCardTitle(page)).toBeVisible();
    await expect(
      page.getByText("Manage your account information")
    ).toBeVisible();

    // User email
    await expect(page.getByText(TEST_USERS.OWNER.email).first()).toBeVisible();

    // Role badge
    await expect(
      page.locator('[data-slot="badge"]').filter({ hasText: /owner/i })
    ).toBeVisible();
  });

  test("shows profile detail fields", async ({ page }) => {
    await loginAs(page, TEST_USERS.OWNER);
    await gotoProfile(page);

    // Field labels
    const labels = [
      "Email",
      "Name",
      "Phone Number",
      "Preferred Language",
      "Notification Preferences",
      "Role",
    ];
    for (const label of labels) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });

  test("shows Edit Profile button for own profile", async ({ page }) => {
    await loginAs(page, TEST_USERS.OWNER);
    await gotoProfile(page);

    await expect(
      page.getByRole("button", { name: /Edit Profile/i })
    ).toBeVisible();
  });
});

// ─── Profile Edit — Form & Validation ──────────────────────────────────────

test.describe("Profile Edit — Form & Validation", () => {
  test("edit mode shows form with pre-filled values", async ({ page }) => {
    await loginAs(page, TEST_USERS.OWNER);
    await gotoProfile(page);

    await page.getByRole("button", { name: /Edit Profile/i }).click();

    // Form fields are visible
    await expect(page.getByLabel("Display Name")).toBeVisible();
    await expect(page.getByLabel("Phone Number")).toBeVisible();
    await expect(page.getByLabel("Preferred Language")).toBeVisible();
    await expect(
      page.getByLabel(/Schedule changes/i)
    ).toBeVisible();

    // Save and Cancel buttons
    await expect(
      page.getByRole("button", { name: /Save Changes/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Cancel/i })
    ).toBeVisible();
  });

  test("cancel edit returns to view mode", async ({ page }) => {
    await loginAs(page, TEST_USERS.OWNER);
    await gotoProfile(page);

    await page.getByRole("button", { name: /Edit Profile/i }).click();
    await expect(page.getByLabel("Display Name")).toBeVisible();

    await page.getByRole("button", { name: /Cancel/i }).click();

    // Back to view mode — edit form gone, Edit Profile button visible again
    await expect(page.getByLabel("Display Name")).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: /Edit Profile/i })
    ).toBeVisible();
  });

  test("email and role fields are disabled in edit mode", async ({ page }) => {
    await loginAs(page, TEST_USERS.OWNER);
    await gotoProfile(page);

    await page.getByRole("button", { name: /Edit Profile/i }).click();

    // The email and role inputs are disabled (not FormField, just plain Input)
    const disabledInputs = page.locator("input:disabled");
    const count = await disabledInputs.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Check that the email text appears in a disabled input
    const allDisabledValues: string[] = [];
    for (let i = 0; i < count; i++) {
      const val = await disabledInputs.nth(i).inputValue();
      allDisabledValues.push(val);
    }
    expect(allDisabledValues).toContain(TEST_USERS.OWNER.email);
  });

  test("update profile name — verify toast and persistence", async ({
    page,
  }) => {
    await loginAs(page, TEST_USERS.TEACHER);
    await gotoProfile(page);

    // Enter edit mode
    await page.getByRole("button", { name: /Edit Profile/i }).click();
    await page.getByLabel("Display Name").waitFor({ state: "visible" });

    const originalName = await page.getByLabel("Display Name").inputValue();
    const newName = `E2E Updated ${Date.now()}`;

    // Change name and submit — intercept the PATCH to diagnose failures
    await page.getByLabel("Display Name").clear();
    await page.getByLabel("Display Name").fill(newName);

    const patchPromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/users/me/profile") &&
        resp.request().method() === "PATCH",
      { timeout: 15000 }
    );
    await page.getByRole("button", { name: /Save Changes/i }).click();
    const patchResp = await patchPromise;

    if (!patchResp.ok()) {
      const body = await patchResp.text().catch(() => "");
      throw new Error(
        `Profile PATCH failed: ${patchResp.status()} ${body}`
      );
    }

    // Wait for view mode to be restored (indicates mutation resolved + setIsEditing(false))
    await page
      .getByRole("button", { name: /Edit Profile/i })
      .waitFor({ state: "visible", timeout: 10000 });

    // Verify new name is displayed in view mode
    await expect(page.getByText(newName).first()).toBeVisible();

    // Verify persistence: reload and check the name still shows
    await page.reload();
    await page.waitForLoadState("networkidle");
    await closeAIAssistantDialog(page);
    await profileCardTitle(page).waitFor({ timeout: 10000 });
    await expect(page.getByText(newName).first()).toBeVisible();

    // Restore original name via API to avoid flaky UI second-save
    const token = await page.evaluate(() => localStorage.getItem("token"));
    const backendUrl = process.env.VITE_API_URL || "http://localhost:4000";
    await page.request.patch(`${backendUrl}/api/v1/users/me/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: originalName },
    });
  });

  test("name validation — empty name shows error", async ({ page }) => {
    await loginAs(page, TEST_USERS.OWNER);
    await gotoProfile(page);

    await page.getByRole("button", { name: /Edit Profile/i }).click();

    await page.getByLabel("Display Name").clear();
    await page.getByRole("button", { name: /Save Changes/i }).click();

    // Validation error
    await expect(page.getByText("Name is required")).toBeVisible();
  });
});

// ─── Password Change Section ────────────────────────────────────────────────

test.describe("Password Change Section", () => {
  test("change password card heading is visible", async ({ page }) => {
    await loginAs(page, TEST_USERS.OWNER);
    await gotoProfile(page);

    await expect(
      page
        .locator('[data-slot="card-title"]')
        .filter({ hasText: "Change Password" })
    ).toBeVisible();
    await expect(
      page.getByText("Update your password to keep your account secure")
    ).toBeVisible();
  });

  test("shows password change form fields", async ({ page }) => {
    await loginAs(page, TEST_USERS.OWNER);
    await gotoProfile(page);

    // Emulator users have a password provider, so the form is shown
    await expect(
      page.getByPlaceholder("Enter current password")
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("Enter new password")
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("Confirm new password")
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Change Password" })
    ).toBeVisible();
  });
});

// ─── Delete Account — RBAC & Modal ─────────────────────────────────────────

test.describe("Delete Account — RBAC & Modal", () => {
  test("owner does NOT see delete account section", async ({ page }) => {
    await loginAs(page, TEST_USERS.OWNER);
    await gotoProfile(page);

    await expect(
      page
        .locator('[data-slot="card-title"]')
        .filter({ hasText: "Danger Zone" })
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: /Delete My Account/i })
    ).not.toBeVisible();
  });

  test("non-owner sees danger zone section", async ({ page }) => {
    await loginAs(page, TEST_USERS.STUDENT);
    await gotoProfile(page);

    await expect(
      page
        .locator('[data-slot="card-title"]')
        .filter({ hasText: "Danger Zone" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Delete My Account/i })
    ).toBeVisible();
  });

  test("delete modal — requires typing DELETE to enable confirm", async ({
    page,
  }) => {
    await loginAs(page, TEST_USERS.STUDENT);
    await gotoProfile(page);

    await page
      .getByRole("button", { name: /Delete My Account/i })
      .click();

    // Dialog opens
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    await expect(dialog.getByText("Delete Your Account")).toBeVisible();

    // Confirm button disabled initially
    const confirmButton = dialog.getByRole("button", {
      name: /Delete My Account/i,
    });
    await expect(confirmButton).toBeDisabled();

    // Type DELETE
    await dialog.locator("#confirm-delete").fill("DELETE");
    await expect(confirmButton).toBeEnabled();

    // Clear it — button disabled again
    await dialog.locator("#confirm-delete").clear();
    await expect(confirmButton).toBeDisabled();
  });

  test("delete modal — cancel closes dialog", async ({ page }) => {
    await loginAs(page, TEST_USERS.STUDENT);
    await gotoProfile(page);

    await page
      .getByRole("button", { name: /Delete My Account/i })
      .click();
    await page.getByRole("dialog").waitFor();

    await page
      .getByRole("dialog")
      .getByRole("button", { name: /Cancel/i })
      .click();

    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});

// ─── RBAC — All Roles Can Access Profile ───────────────────────────────────

test.describe("RBAC — All Roles Access Profile", () => {
  const roles = [
    { name: "OWNER", user: TEST_USERS.OWNER },
    { name: "ADMIN", user: TEST_USERS.ADMIN },
    { name: "TEACHER", user: TEST_USERS.TEACHER },
    { name: "STUDENT", user: TEST_USERS.STUDENT },
  ] as const;

  for (const { name, user } of roles) {
    test(`${name} can access their own profile page`, async ({ page }) => {
      await loginAs(page, user);
      await gotoProfile(page);

      await expect(profileCardTitle(page)).toBeVisible();
      await expect(page.getByText(user.email).first()).toBeVisible();
    });
  }
});
