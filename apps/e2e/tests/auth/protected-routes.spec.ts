import {
  expect,
  getAppUrl,
  loginAs,
  test,
  TEST_USERS,
} from "../../fixtures/auth.fixture";

test.describe("Protected Routes", () => {
  test.describe("Unauthenticated Access", () => {
    test("redirects to sign-in when accessing dashboard without auth", async ({
      page,
    }) => {
      await page.goto(getAppUrl("/dashboard"));

      // Should redirect to sign-in
      await page.waitForURL(/.*sign-in/);
      expect(page.url()).toContain("sign-in");
    });

    test("redirects to sign-in when accessing settings without auth", async ({
      page,
    }) => {
      await page.goto(getAppUrl("/settings"));

      await page.waitForURL(/.*sign-in/);
      expect(page.url()).toContain("sign-in");
    });

    test("redirects to sign-in when accessing users page without auth", async ({
      page,
    }) => {
      await page.goto(getAppUrl("/settings/users"));

      await page.waitForURL(/.*sign-in/);
      expect(page.url()).toContain("sign-in");
    });

    test("redirects to sign-in when accessing courses page without auth", async ({
      page,
    }) => {
      await page.goto(getAppUrl("/courses"));

      await page.waitForURL(/.*sign-in/);
      expect(page.url()).toContain("sign-in");
    });

    test("redirects to sign-in when accessing classes page without auth", async ({
      page,
    }) => {
      await page.goto(getAppUrl("/classes"));

      await page.waitForURL(/.*sign-in/);
      expect(page.url()).toContain("sign-in");
    });
  });

  test.describe("Role-Based Access - Owner", () => {
    test("owner can access dashboard", async ({ page }) => {
      await loginAs(page, TEST_USERS.OWNER);

      // After login, we're already on dashboard
      expect(page.url()).toContain("dashboard");
      expect(page.url()).not.toContain("sign-in");
    });

    test("owner can access user management", async ({ page }) => {
      await loginAs(page, TEST_USERS.OWNER);
      await page.goto(getAppUrl("/settings/users"));

      // Should be able to access users page
      expect(page.url()).toContain("users");
    });

    test("owner can access settings", async ({ page }) => {
      await loginAs(page, TEST_USERS.OWNER);
      await page.goto(getAppUrl("/settings"));

      // Should be able to access settings
      expect(page.url()).toContain("settings");
    });
  });

  test.describe("Role-Based Access - Admin", () => {
    test("admin can access dashboard", async ({ page }) => {
      await loginAs(page, TEST_USERS.ADMIN);

      // After login, we're already on dashboard
      expect(page.url()).toContain("dashboard");
      expect(page.url()).not.toContain("sign-in");
    });

    test("admin can access user management", async ({ page }) => {
      await loginAs(page, TEST_USERS.ADMIN);
      await page.goto(getAppUrl("/settings/users"));

      expect(page.url()).toContain("users");
    });
  });

  test.describe("Role-Based Access - Teacher", () => {
    test("teacher can access dashboard", async ({ page }) => {
      await loginAs(page, TEST_USERS.TEACHER);

      // After login, we're already on dashboard
      expect(page.url()).toContain("dashboard");
      expect(page.url()).not.toContain("sign-in");
    });

    test("teacher cannot access user management", async ({ page }) => {
      await loginAs(page, TEST_USERS.TEACHER);
      await page.goto(getAppUrl("/settings/users"));

      // Should be redirected (settings requires OWNER or ADMIN)
      await page.waitForURL((url) => !url.pathname.includes("settings/users"));

      // Teacher should be redirected away from settings
      expect(page.url().includes("settings/users")).toBeFalsy();
    });
  });

  test.describe("Role-Based Access - Student", () => {
    test("student can access dashboard", async ({ page }) => {
      await loginAs(page, TEST_USERS.STUDENT);

      // After login, we're already on dashboard
      expect(page.url()).toContain("dashboard");
      expect(page.url()).not.toContain("sign-in");
    });

    test("student cannot access user management", async ({ page }) => {
      await loginAs(page, TEST_USERS.STUDENT);
      await page.goto(getAppUrl("/settings/users"));

      // Should be redirected (settings requires OWNER or ADMIN)
      await page.waitForURL((url) => !url.pathname.includes("settings/users"));

      // Student should be redirected away from settings
      expect(page.url().includes("settings/users")).toBeFalsy();
    });

    test("student cannot access courses management", async ({ page }) => {
      await loginAs(page, TEST_USERS.STUDENT);
      await page.goto(getAppUrl("/courses"));

      // Should be redirected (courses requires OWNER, ADMIN, or TEACHER)
      await page.waitForURL((url) => !url.pathname.includes("/courses"));

      // Student should be redirected away from courses
      expect(page.url().includes("/courses")).toBeFalsy();
    });
  });

  test.describe("Return URL Handling", () => {
    test("preserves return URL after sign-in", async ({ page }) => {
      // Try to access a protected page
      await page.goto(getAppUrl("/settings/users"));

      // Should redirect to sign-in with return URL
      await page.waitForURL(/.*sign-in/);

      // Login
      await page.fill('input[type="email"]', TEST_USERS.OWNER.email);
      await page.fill('input[type="password"]', TEST_USERS.OWNER.password);
      await page.click('button[type="submit"]');

      // Should redirect back to the originally requested page or dashboard
      await page.waitForURL(/.*\/(users|dashboard)/, { timeout: 10000 });
    });
  });
});
