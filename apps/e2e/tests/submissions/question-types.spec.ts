import { expect } from "@playwright/test";
import {
  submissionTest as test,
  startSubmissionAsStudent,
  addSectionViaAPI,
  addQuestionViaAPI,
} from "../../fixtures/submission-fixtures";
import {
  createExerciseViaAPI,
  publishExerciseViaAPI,
  cleanupExercise,
} from "../../fixtures/exercise-fixtures";
import {
  createAssignmentViaAPI,
  cleanupAssignment,
} from "../../fixtures/assignment-fixtures";
import {
  TEST_USERS,
  loginAs,
} from "../../fixtures/auth.fixture";

test.describe("Question Type Rendering", () => {
  test("MCQ renders tap-friendly option buttons and selecting highlights", async ({
    browser,
    testIds,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await startSubmissionAsStudent(page, testIds.assignmentId);

    // Verify MCQ question text renders
    await expect(
      page.getByText("What is described as one of the most pressing issues")
    ).toBeVisible();

    // Verify all 4 options render
    await expect(page.getByText("A. Economic recession")).toBeVisible();
    await expect(page.getByText("B. Climate change")).toBeVisible();
    await expect(page.getByText("C. Political instability")).toBeVisible();
    await expect(page.getByText("D. Technological disruption")).toBeVisible();

    // Verify options are in tap-friendly labels (min-h-[44px])
    const optionLabels = page.locator("label").filter({ hasText: /^[A-D]\. / });
    const count = await optionLabels.count();
    expect(count).toBe(4);

    // Each option label should have min-h-[44px] class for touch targets
    for (let i = 0; i < count; i++) {
      await expect(optionLabels.nth(i)).toHaveClass(/min-h-\[44px\]/);
    }

    // Select option A — it should get highlighted
    await page.getByText("A. Economic recession").click();
    const optionA = page.locator("label").filter({ hasText: "A. Economic recession" });
    await expect(optionA).toHaveClass(/border-primary/);

    // Select option C — option A should un-highlight, C should highlight
    await page.getByText("C. Political instability").click();
    const optionC = page.locator("label").filter({ hasText: "C. Political instability" });
    await expect(optionC).toHaveClass(/border-primary/);
    await expect(optionA).not.toHaveClass(/border-primary/);

    await context.close();
  });

  test("text answer input renders, accepts text, and value persists after navigate", async ({
    browser,
    testIds,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await startSubmissionAsStudent(page, testIds.assignmentId);

    // Navigate to Q2 (text answer)
    await page.getByRole("button", { name: /Next/ }).click();

    // Verify text question renders
    await expect(
      page.getByText("What are rising global temperatures causing to melt?")
    ).toBeVisible();

    // Verify text input renders with placeholder
    const textInput = page.locator('input[placeholder="Type your answer..."]');
    await expect(textInput).toBeVisible();

    // Verify min-h-[44px] for touch target
    await expect(textInput).toHaveClass(/min-h-\[44px\]/);

    // Type answer
    await textInput.fill("ice caps");
    await expect(textInput).toHaveValue("ice caps");

    // Navigate away (Previous)
    await page.getByRole("button", { name: /Previous/ }).click();

    // Navigate back (Next)
    await page.getByRole("button", { name: /Next/ }).click();

    // Value should persist
    await expect(
      page.locator('input[placeholder="Type your answer..."]')
    ).toHaveValue("ice caps");

    await context.close();
  });

  test("writing input renders textarea with word count", async ({
    browser,
  }) => {
    // Create a WRITING exercise + assignment on the fly (separate from READING fixture)
    const setupContext = await browser.newContext();
    const setupPage = await setupContext.newPage();
    await loginAs(setupPage, TEST_USERS.TEACHER);

    const exercise = await createExerciseViaAPI(setupPage, { skill: "WRITING" });
    const section = await addSectionViaAPI(
      setupPage,
      exercise.id,
      "W3_TASK2_ESSAY",
      0,
      "Write an essay about technology in education."
    );
    await addQuestionViaAPI(setupPage, exercise.id, section.id, {
      questionText: "Discuss the impact of technology on modern education.",
      questionType: "W3_TASK2_ESSAY",
      orderIndex: 0,
      wordLimit: null,
    });
    await publishExerciseViaAPI(setupPage, exercise.id);
    const assignment = await createAssignmentViaAPI(setupPage, {
      exerciseId: exercise.id,
      classIds: ["e2e-test-class"],
    });
    await setupContext.close();

    // Start submission as student
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await startSubmissionAsStudent(page, assignment.id);

      // WritingInput renders a textarea with "Write your response here..." placeholder
      const textarea = page.getByPlaceholder("Write your response here...");
      await expect(textarea).toBeVisible({ timeout: 10000 });

      // Textarea should have min-h-[200px] class
      await expect(textarea).toHaveClass(/min-h-\[200px\]/);

      // Word count badge should show "0 words" initially
      const wordBadge = page.locator('[data-slot="badge"]');
      await expect(wordBadge).toHaveText("0 words");

      // Word range hint should show (min 250 words) for W3_TASK2_ESSAY
      await expect(page.getByText("(min 250 words)")).toBeVisible();

      // Type some text and verify word count updates
      await textarea.fill("Technology has transformed education in many ways");
      await expect(wordBadge).toHaveText("7 words", { timeout: 3000 });
    } finally {
      await context.close();

      // Cleanup
      const cleanupContext = await browser.newContext();
      const cleanupPage = await cleanupContext.newPage();
      await loginAs(cleanupPage, TEST_USERS.TEACHER);
      await cleanupAssignment(cleanupPage, assignment.id);
      await cleanupExercise(cleanupPage, exercise.id);
      await cleanupContext.close();
    }
  });
});
