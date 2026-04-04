import { test, expect, TEST_USERS } from "../../fixtures/auth.fixture";
import { loginAs } from "../../fixtures/auth.fixture";
import { waitForToast } from "../../utils/test-helpers";
import { closeAIAssistantDialog } from "../../utils/close-ai-assistant";
import {
  uniqueName,
  gotoExercises,
  cleanupExercise,
} from "../../fixtures/exercise-fixtures";

/**
 * Story 11.2: Option Not Saved on Add
 * Verifies that clicking "Add Option" commits the current input value
 * regardless of blur state, and that existing typed text is never lost.
 */
test.describe("MCQ Option Add — Text Preservation (Story 11.2)", () => {
  let createdExerciseId: string | null = null;

  test.afterEach(async ({ page }) => {
    if (createdExerciseId) {
      await cleanupExercise(page, createdExerciseId);
      createdExerciseId = null;
    }
  });

  /**
   * Helper: create a Reading exercise, navigate to editor, add a section,
   * add an MCQ question, expand it, and return with the editor ready.
   */
  async function setupMCQQuestion(page: import("@playwright/test").Page) {
    const exerciseTitle = uniqueName("E2E MCQ Option Add");

    await loginAs(page, TEST_USERS.OWNER);
    await gotoExercises(page);

    // Create exercise
    await page.getByRole("button", { name: "Create Exercise" }).click();
    await page
      .getByRole("heading", { name: "Select Exercise Skill" })
      .waitFor();
    await page.locator("button").filter({ hasText: "Reading" }).first().click();
    await page.waitForURL(/.*\/exercises\/[^/]+\/edit/);
    await waitForToast(page, "Exercise created");
    await closeAIAssistantDialog(page);
    await expect(page.locator("#exercise-title")).not.toHaveValue("", {
      timeout: 10000,
    });

    // Extract exercise ID for cleanup
    const url = page.url();
    createdExerciseId = url.match(/exercises\/([^/]+)\/edit/)?.[1] ?? null;

    // Fill title
    await page.locator("#exercise-title").clear();
    await page.locator("#exercise-title").fill(exerciseTitle);

    // Ensure section exists
    const sectionHeading = page.getByText(/Section 1/).first();
    const addSectionBtn = page.getByRole("button", { name: /Add Section/i });
    const hasSectionAlready = await sectionHeading
      .isVisible()
      .catch(() => false);
    if (
      !hasSectionAlready &&
      (await addSectionBtn.isVisible().catch(() => false))
    ) {
      await addSectionBtn.click();
    }
    await expect(sectionHeading).toBeVisible({ timeout: 10000 });

    // Add a question
    const questionInput = page.getByPlaceholder(/Type a question/i).first();
    await expect(questionInput).toBeVisible({ timeout: 10000 });
    await questionInput.fill("Test question for option add");
    await page.locator("button").filter({ hasText: /^Add$/ }).first().click();

    // Expand the question
    const questionRow = page
      .locator('[role="button"]')
      .filter({ hasText: /Q1/ })
      .first();
    await questionRow.click();
  }

  // AC1: Clicking "Add Option" commits the current input value regardless of blur state
  test("type text in option, click Add Option without blurring — text is preserved", async ({
    page,
  }) => {
    await setupMCQQuestion(page);

    const optionInputSelector =
      'input[placeholder*="Option"]';

    // Add first option
    await page.getByRole("button", { name: /Add Option/i }).click();
    const firstOption = page.locator(optionInputSelector).first();
    await expect(firstOption).toBeVisible({ timeout: 10000 });

    // Type text into the first option WITHOUT blurring
    await firstOption.fill("Artificial intelligence");

    // Click "Add Option" — this should NOT lose the typed text
    await page.getByRole("button", { name: /Add Option/i }).click();

    // Wait for second option to appear
    await expect(page.locator(optionInputSelector).nth(1)).toBeVisible({
      timeout: 10000,
    });

    // AC1: Verify the first option's text is preserved (not lost due to remount)
    await expect(page.locator(optionInputSelector).first()).toHaveValue(
      "Artificial intelligence"
    );

    // AC2: Verify the second option appeared (blank)
    await expect(page.locator(optionInputSelector).nth(1)).toHaveValue("");
  });

  // AC2 + AC3: Multiple options — all text preserved across add operations
  test("add multiple options with text, verify all text is saved", async ({
    page,
  }) => {
    await setupMCQQuestion(page);

    const optionInputSelector =
      'input[placeholder*="Option"]';

    // Add first option and fill it
    await page.getByRole("button", { name: /Add Option/i }).click();
    const firstOption = page.locator(optionInputSelector).first();
    await expect(firstOption).toBeVisible({ timeout: 10000 });
    await firstOption.fill("Option A text");

    // Add second option (without blurring first) and fill it
    await page.getByRole("button", { name: /Add Option/i }).click();
    const secondOption = page.locator(optionInputSelector).nth(1);
    await expect(secondOption).toBeVisible({ timeout: 10000 });
    await secondOption.fill("Option B text");

    // Add third option (without blurring second)
    await page.getByRole("button", { name: /Add Option/i }).click();
    const thirdOption = page.locator(optionInputSelector).nth(2);
    await expect(thirdOption).toBeVisible({ timeout: 10000 });

    // Verify ALL previous text is preserved
    await expect(page.locator(optionInputSelector).nth(0)).toHaveValue(
      "Option A text"
    );
    await expect(page.locator(optionInputSelector).nth(1)).toHaveValue(
      "Option B text"
    );
    await expect(page.locator(optionInputSelector).nth(2)).toHaveValue("");

    // Fill third and blur to trigger save, then verify form save works
    await thirdOption.fill("Option C text");
    await thirdOption.blur();

    // Save draft and verify
    await page.getByRole("button", { name: "Save Draft" }).click();
    await waitForToast(page, "Draft saved");

    // Reload and verify text was persisted
    await page.reload();
    await closeAIAssistantDialog(page);

    // Expand the question again
    const questionRow = page
      .locator('[role="button"]')
      .filter({ hasText: /Q1/ })
      .first();
    await questionRow.click();

    // Verify all option text was saved
    await expect(page.locator(optionInputSelector).nth(0)).toHaveValue(
      "Option A text"
    );
    await expect(page.locator(optionInputSelector).nth(1)).toHaveValue(
      "Option B text"
    );
    await expect(page.locator(optionInputSelector).nth(2)).toHaveValue(
      "Option C text"
    );
  });

  // AC1 + AC3: Multi-select (checkbox) variant — text preserved on Add Option
  test("multi-select variant: type text, click Add Option — text preserved", async ({
    page,
  }) => {
    await setupMCQQuestion(page);

    // Switch section type to "Multiple Choice (Multiple)" via Radix Select
    // Find the trigger button next to the "Question Type" label
    const questionTypeSection = page.locator('.space-y-2').filter({ hasText: "Question Type" }).first();
    await questionTypeSection.getByRole("combobox").click();
    await page.getByRole("option", { name: /Multiple Choice \(Multiple\)/i }).click();

    const optionInputSelector = 'input[placeholder*="Option"]';

    // Add first option and type text
    await page.getByRole("button", { name: /Add Option/i }).click();
    const firstOption = page.locator(optionInputSelector).first();
    await expect(firstOption).toBeVisible({ timeout: 10000 });
    await firstOption.fill("Multi-select option A");

    // Click "Add Option" without blurring — text must be preserved
    await page.getByRole("button", { name: /Add Option/i }).click();
    await expect(page.locator(optionInputSelector).nth(1)).toBeVisible({
      timeout: 10000,
    });

    // Verify first option text preserved and second is blank
    await expect(page.locator(optionInputSelector).first()).toHaveValue(
      "Multi-select option A"
    );
    await expect(page.locator(optionInputSelector).nth(1)).toHaveValue("");

    // Verify checkboxes are present (confirms multi-select variant)
    await expect(page.locator('button[role="checkbox"]').first()).toBeVisible();
  });
});
