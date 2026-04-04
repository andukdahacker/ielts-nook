import { test, expect, TEST_USERS } from "../../fixtures/auth.fixture";
import { loginAs, getAppUrl } from "../../fixtures/auth.fixture";
import { closeAIAssistantDialog } from "../../utils/close-ai-assistant";
import {
  createExerciseViaAPI,
  cleanupExercise,
} from "../../fixtures/exercise-fixtures";

/**
 * Story 11.6: Exercise Edit Breadcrumbs
 * Verifies breadcrumb navigation on exercise edit and new exercise pages.
 */
test.describe("Exercise Edit Breadcrumbs (Story 11.6)", () => {
  let exerciseId: string | null = null;

  test.afterEach(async ({ page }) => {
    if (exerciseId) {
      await cleanupExercise(page, exerciseId);
      exerciseId = null;
    }
  });

  test("breadcrumb shows exercise title instead of UUID on edit page (AC2, AC4)", async ({
    page,
  }) => {
    await loginAs(page, TEST_USERS.OWNER);

    const created = await createExerciseViaAPI(page, {
      skill: "READING",
      title: "Breadcrumb Test Exercise",
    });
    exerciseId = created.id;

    await page.goto(getAppUrl(`/exercises/${created.id}/edit`));
    await page.waitForLoadState("networkidle");
    await closeAIAssistantDialog(page);

    // Wait for exercise data to load
    await expect(page.locator("#exercise-title")).not.toHaveValue("", {
      timeout: 10000,
    });

    const breadcrumbNav = page.locator("nav[aria-label='breadcrumb']");
    await expect(breadcrumbNav).toBeVisible();

    // Should show exercise title, not UUID
    await expect(breadcrumbNav.getByText("Breadcrumb Test Exercise")).toBeVisible();
    // UUID should not appear in breadcrumb
    await expect(breadcrumbNav.getByText(created.id)).not.toBeVisible();
    // Should show "Edit" as last segment
    await expect(breadcrumbNav.getByText("Edit")).toBeVisible();
  });

  test("clicking Exercises breadcrumb link navigates to exercise list (AC1, AC3)", async ({
    page,
  }) => {
    await loginAs(page, TEST_USERS.OWNER);

    const created = await createExerciseViaAPI(page, {
      skill: "READING",
      title: "Breadcrumb Nav Test",
    });
    exerciseId = created.id;

    await page.goto(getAppUrl(`/exercises/${created.id}/edit`));
    await page.waitForLoadState("networkidle");
    await closeAIAssistantDialog(page);
    await expect(page.locator("#exercise-title")).not.toHaveValue("", {
      timeout: 10000,
    });

    const breadcrumbNav = page.locator("nav[aria-label='breadcrumb']");

    // Click the "Exercises" link in breadcrumb
    await breadcrumbNav.getByRole("link", { name: "Exercises" }).click();

    // Should navigate to exercises list page
    await expect(page).toHaveURL(/\/exercises$/);
    await expect(
      page.getByRole("heading", { name: "Exercises" }).first()
    ).toBeVisible();
  });

  test("exercise name segment is NOT a link (AC3)", async ({ page }) => {
    await loginAs(page, TEST_USERS.OWNER);

    const created = await createExerciseViaAPI(page, {
      skill: "READING",
      title: "Non Clickable Test",
    });
    exerciseId = created.id;

    await page.goto(getAppUrl(`/exercises/${created.id}/edit`));
    await page.waitForLoadState("networkidle");
    await closeAIAssistantDialog(page);
    await expect(page.locator("#exercise-title")).not.toHaveValue("", {
      timeout: 10000,
    });

    const breadcrumbNav = page.locator("nav[aria-label='breadcrumb']");
    await expect(breadcrumbNav.getByText("Non Clickable Test")).toBeVisible();

    // Exercise name should NOT be wrapped in an <a> tag
    const exerciseNameLink = breadcrumbNav.locator(
      "a",
      { hasText: "Non Clickable Test" }
    );
    await expect(exerciseNameLink).toHaveCount(0);
  });

  test("new exercise page shows Exercises > New breadcrumbs (AC5)", async ({
    page,
  }) => {
    await loginAs(page, TEST_USERS.OWNER);

    await page.goto(getAppUrl("/exercises/new"));
    await page.waitForLoadState("networkidle");
    await closeAIAssistantDialog(page);

    // Wait for skill selector to appear
    await expect(
      page.getByRole("heading", { name: "Select Exercise Skill" })
    ).toBeVisible({ timeout: 10000 });

    const breadcrumbNav = page.locator("nav[aria-label='breadcrumb']");
    await expect(breadcrumbNav).toBeVisible();

    // Should show "Exercises > New"
    await expect(breadcrumbNav.getByText("Exercises")).toBeVisible();
    await expect(breadcrumbNav.getByText("New")).toBeVisible();

    // Exercises should be a clickable link
    await expect(
      breadcrumbNav.getByRole("link", { name: "Exercises" })
    ).toBeVisible();
  });
});
