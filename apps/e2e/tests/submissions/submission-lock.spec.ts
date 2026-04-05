import { expect } from "@playwright/test";
import { TEST_USERS, loginAs, E2E_CENTER_ID } from "../../fixtures/auth.fixture";
import {
  submissionTest as test,
  startSubmissionAsStudent,
  waitForSubmissionReady,
} from "../../fixtures/submission-fixtures";

function getBackendUrl(): string {
  return process.env.VITE_API_URL || "http://localhost:4000";
}

async function getAuthToken(page: import("@playwright/test").Page): Promise<string> {
  const token = await page.evaluate(() => localStorage.getItem("token"));
  if (!token) throw new Error("No auth token found");
  return token;
}

/**
 * Submit the current submission via the UI: navigate to last question, click Submit, confirm.
 */
async function submitViaUI(page: import("@playwright/test").Page): Promise<void> {
  // Navigate to last question (Submit button only shows on last)
  const nextBtn = page.getByRole("button", { name: /Next/i });
  if (await nextBtn.isVisible()) {
    await nextBtn.click();
  }

  // Click Submit
  await page.getByRole("button", { name: /Submit/i }).click();

  // Confirm in dialog
  const confirmBtn = page.getByRole("button", { name: /^Submit$/i });
  await confirmBtn.waitFor({ timeout: 5000 });
  await confirmBtn.click();

  // Wait for completion page or locked view
  await page.waitForTimeout(2000);
}

/**
 * Unlock a submission via the backend API (teacher action).
 */
async function unlockSubmissionViaAPI(
  page: import("@playwright/test").Page,
  submissionId: string,
): Promise<void> {
  const token = await getAuthToken(page);
  const response = await page.request.post(
    `${getBackendUrl()}/api/v1/grading/submissions/${submissionId}/unlock`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Failed to unlock submission: ${response.status()} ${body}`);
  }
}

/**
 * Get the submissionId from the page's data attribute.
 */
async function getSubmissionId(page: import("@playwright/test").Page): Promise<string> {
  const el = page.locator("[data-submission-id]");
  await el.waitFor({ timeout: 15000 });
  const id = await el.getAttribute("data-submission-id");
  if (!id) throw new Error("No submission ID on page");
  return id;
}

test.describe("Submission Lock (Story 11.7)", () => {
  test.setTimeout(120000);

  test("student sees read-only view with 'Submitted' indicator after submitting", async ({
    browser,
    testIds,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Student submits the exercise
    await startSubmissionAsStudent(page, testIds.assignmentId);
    await waitForSubmissionReady(page);

    // Answer Q1 (MCQ)
    await page.getByText("B. Climate change").click();

    // Submit
    await submitViaUI(page);

    // Navigate back to the submission page
    await page.goto(`/${E2E_CENTER_ID}/assignments/${testIds.assignmentId}/take`);
    await page.waitForLoadState("networkidle");

    // Should see "Submitted" badge (in header or stepper)
    await expect(page.getByTestId("status-badge").or(page.getByTestId("submitted-badge"))).toBeVisible({ timeout: 15000 });

    await context.close();
  });

  test("student cannot modify answers in locked state", async ({
    browser,
    testIds,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Student submits the exercise
    await startSubmissionAsStudent(page, testIds.assignmentId);
    await waitForSubmissionReady(page);
    await page.getByText("B. Climate change").click();
    await submitViaUI(page);

    // Navigate back to the submission page
    await page.goto(`/${E2E_CENTER_ID}/assignments/${testIds.assignmentId}/take`);
    await page.waitForLoadState("networkidle");

    // Wait for locked state to render
    await expect(page.getByTestId("status-badge").or(page.getByTestId("submitted-badge"))).toBeVisible({ timeout: 15000 });

    // MCQ buttons should be disabled
    const mcqOption = page.locator("button").filter({ hasText: "Climate change" });
    if (await mcqOption.isVisible()) {
      await expect(mcqOption).toBeDisabled();
    }

    // Navigate to Q2 — text input should be disabled
    const nextBtn = page.getByRole("button", { name: /Next/i });
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
    }
    const textInput = page.locator('input[placeholder="Type your answer..."]');
    if (await textInput.isVisible()) {
      await expect(textInput).toBeDisabled();
    }

    await context.close();
  });

  test("teacher unlocks submission — student can re-submit", async ({
    browser,
    testIds,
  }) => {
    // 1. Student submits
    const studentContext = await browser.newContext();
    const studentPage = await studentContext.newPage();
    await startSubmissionAsStudent(studentPage, testIds.assignmentId);
    await waitForSubmissionReady(studentPage);
    await studentPage.getByText("B. Climate change").click();
    const submissionId = await getSubmissionId(studentPage);
    await submitViaUI(studentPage);
    await studentContext.close();

    // 2. Teacher unlocks
    const teacherContext = await browser.newContext();
    const teacherPage = await teacherContext.newPage();
    await loginAs(teacherPage, TEST_USERS.TEACHER);
    await unlockSubmissionViaAPI(teacherPage, submissionId);
    await teacherContext.close();

    // 3. Student can now re-submit — sees interactive form
    const resubmitContext = await browser.newContext();
    const resubmitPage = await resubmitContext.newPage();
    await startSubmissionAsStudent(resubmitPage, testIds.assignmentId);
    await waitForSubmissionReady(resubmitPage);

    // Should see interactive form (Submit button available, no "Submitted" badge)
    await expect(resubmitPage.getByTestId("submitted-badge")).not.toBeVisible();

    // Should be able to navigate and interact
    const nextBtn = resubmitPage.getByRole("button", { name: /Next/i });
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();

    // Text input should be enabled
    const textInput = resubmitPage.locator('input[placeholder="Type your answer..."]');
    await expect(textInput).toBeEnabled();

    await resubmitContext.close();
  });
});
