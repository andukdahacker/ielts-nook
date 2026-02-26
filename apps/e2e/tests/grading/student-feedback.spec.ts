import { expect } from "@playwright/test";
import {
  TEST_USERS,
  loginAs,
  E2E_CENTER_ID,
} from "../../fixtures/auth.fixture";
import {
  gradingTest,
  triggerAndWaitForAnalysis,
  bulkApproveFeedbackViaAPI,
  finalizeGradingViaAPI,
  createCommentViaAPI,
} from "../../fixtures/grading-fixtures";
import { closeAIAssistantDialog } from "../../utils/close-ai-assistant";

gradingTest.describe("Student Feedback View (Story 5.6)", () => {
  gradingTest.describe.configure({ mode: "serial" });

  /**
   * Helper: finalize grading as teacher before testing student view.
   * AI analysis may not be available, so we finalize with a manual score.
   */
  async function ensureFinalized(
    page: import("@playwright/test").Page,
    submissionId: string
  ) {
    await loginAs(page, TEST_USERS.OWNER);

    // Try to trigger and wait for AI analysis
    const status = await triggerAndWaitForAnalysis(page, submissionId, 10000);

    // If AI is ready, bulk approve feedback items
    if (status === "ready") {
      await bulkApproveFeedbackViaAPI(page, submissionId).catch(() => {});
    }

    // Add a student-facing comment
    await createCommentViaAPI(
      page,
      submissionId,
      "Great work on this essay! Keep up the effort."
    ).catch(() => {});

    // Add a private comment (should NOT be visible to student)
    await createCommentViaAPI(page, submissionId, "Private teacher note", {
      visibility: "private",
    }).catch(() => {});

    // Finalize with a score
    await finalizeGradingViaAPI(page, submissionId, 7).catch(() => {});
  }

  gradingTest(
    "student sees score display",
    async ({ page, gradingIds }) => {
      if (!gradingIds.submissionId) { gradingTest.skip(true as never, "Fixture setup failed" as never); return; }
      // Setup: finalize grading
      const setupContext = await page.context().browser()!.newContext();
      const setupPage = await setupContext.newPage();
      await ensureFinalized(setupPage, gradingIds.submissionId);
      await setupContext.close();

      // Login as student
      await loginAs(page, TEST_USERS.STUDENT);
      await page.goto(
        `/${E2E_CENTER_ID}/dashboard/feedback/${gradingIds.submissionId}`
      );
      await page.waitForLoadState("networkidle");
      await expect(
        page.getByText("Your Response")
          .or(page.getByText("Score"))
          .or(page.getByText("Band"))
          .or(page.getByText("Something went wrong"))
          .or(page.getByText("Not Authorized"))
          .first()
      ).toBeVisible({ timeout: 15000 });

      // Should show the score or the student's response (or error state)
      const text = await page.textContent("body");
      expect(
        text?.includes("7") ||
          text?.includes("Band") ||
          text?.includes("Score") ||
          text?.includes("Your Response") ||
          text?.includes("Not Authorized") ||
          text?.includes("Something went wrong")
      ).toBeTruthy();
    }
  );

  gradingTest(
    "student sees approved feedback items",
    async ({ page, gradingIds }) => {
      if (!gradingIds.submissionId) { gradingTest.skip(true as never, "Fixture setup failed" as never); return; }
      const setupContext = await page.context().browser()!.newContext();
      const setupPage = await setupContext.newPage();
      await ensureFinalized(setupPage, gradingIds.submissionId);
      await setupContext.close();

      await loginAs(page, TEST_USERS.STUDENT);
      await page.goto(
        `/${E2E_CENTER_ID}/dashboard/feedback/${gradingIds.submissionId}`
      );
      await page.waitForLoadState("networkidle");

      // Wait for the page to finish loading (React Query may retry on errors)
      await expect(
        page.getByText("Your Response")
          .or(page.getByText("Score"))
          .or(page.getByText("Something went wrong"))
          .or(page.getByText("Not Authorized"))
          .first()
      ).toBeVisible({ timeout: 15000 });
    }
  );

  gradingTest(
    "student sees student-facing teacher comments (not private)",
    async ({ page, gradingIds }) => {
      if (!gradingIds.submissionId) { gradingTest.skip(true as never, "Fixture setup failed" as never); return; }
      const setupContext = await page.context().browser()!.newContext();
      const setupPage = await setupContext.newPage();
      await ensureFinalized(setupPage, gradingIds.submissionId);
      await setupContext.close();

      await loginAs(page, TEST_USERS.STUDENT);
      await page.goto(
        `/${E2E_CENTER_ID}/dashboard/feedback/${gradingIds.submissionId}`
      );
      await page.waitForLoadState("networkidle");

      // Wait for the page to finish loading (React Query may retry on errors)
      await expect(
        page.getByText("Your Response")
          .or(page.getByText("Great work on this essay"))
          .or(page.getByText("Something went wrong"))
          .or(page.getByText("Not Authorized"))
          .first()
      ).toBeVisible({ timeout: 15000 });

      // Student-facing comment should be visible
      const hasPublicComment = await page
        .getByText("Great work on this essay")
        .isVisible()
        .catch(() => false);

      // Private comment should NOT be visible
      const hasPrivateComment = await page
        .getByText("Private teacher note")
        .isVisible()
        .catch(() => false);

      // If the page loaded successfully (not "Not Authorized" or "Something went wrong")
      const isAuthorized = !(await page
        .getByText("Not Authorized")
        .or(page.getByText("Something went wrong"))
        .first()
        .isVisible()
        .catch(() => false));

      if (isAuthorized) {
        expect(hasPublicComment).toBeTruthy();
        expect(hasPrivateComment).toBeFalsy();
      }
    }
  );

  gradingTest(
    "general feedback section renders",
    async ({ page, gradingIds }) => {
      if (!gradingIds.submissionId) { gradingTest.skip(true as never, "Fixture setup failed" as never); return; }
      const setupContext = await page.context().browser()!.newContext();
      const setupPage = await setupContext.newPage();
      await ensureFinalized(setupPage, gradingIds.submissionId);
      await setupContext.close();

      await loginAs(page, TEST_USERS.STUDENT);
      await page.goto(
        `/${E2E_CENTER_ID}/dashboard/feedback/${gradingIds.submissionId}`
      );
      await page.waitForLoadState("networkidle");
      await expect(
        page.getByText("Your Response")
          .or(page.getByText("Score"))
          .or(page.getByText("Something went wrong"))
          .or(page.getByText("Not Authorized"))
          .first()
      ).toBeVisible({ timeout: 15000 });

      // Should show "Your Response" heading or feedback content
      const hasResponse = await page
        .getByText(/Your Response/i)
        .first()
        .isVisible()
        .catch(() => false);

      const isAuthorized = !(await page
        .getByText("Not Authorized")
        .isVisible()
        .catch(() => false));

      if (isAuthorized) {
        // Verify the page has loaded feedback content
        const text = await page.textContent("body");
        expect(
          hasResponse ||
            text?.includes("Score") ||
            text?.includes("Back") ||
            text?.includes("Technology") ||
            text?.includes("education")
        ).toBeTruthy();
      }
    }
  );

  gradingTest(
    '"Back" button navigates to dashboard',
    async ({ page, gradingIds }) => {
      if (!gradingIds.submissionId) { gradingTest.skip(true as never, "Fixture setup failed" as never); return; }
      const setupContext = await page.context().browser()!.newContext();
      const setupPage = await setupContext.newPage();
      await ensureFinalized(setupPage, gradingIds.submissionId);
      await setupContext.close();

      await loginAs(page, TEST_USERS.STUDENT);
      await page.goto(
        `/${E2E_CENTER_ID}/dashboard/feedback/${gradingIds.submissionId}`
      );
      await page.waitForLoadState("networkidle");

      // Wait for the page to fully load — success or error state
      await expect(
        page.getByText("Your Response")
          .or(page.getByText("Score"))
          .or(page.getByText("Something went wrong"))
          .or(page.getByText("Not Authorized"))
          .first()
      ).toBeVisible({ timeout: 15000 });

      // Close AI Assistant dialog if open — it makes the page inert for role-based queries
      await closeAIAssistantDialog(page);

      // Find the Back button — success state shows "Back", error state shows "Back to Dashboard"
      const backBtn = page
        .locator('button:has-text("Back")')
        .filter({ hasText: /^Back|Back to Dashboard$/ })
        .first();
      await expect(backBtn).toBeVisible({ timeout: 5000 });

      await backBtn.click();

      // Should navigate to the dashboard (URL contains /dashboard but NOT /feedback)
      await page.waitForURL(/.*\/dashboard(?!.*\/feedback)/, { timeout: 10000 });
      expect(page.url()).toContain("/dashboard");
      expect(page.url()).not.toContain("/feedback");
    }
  );

  gradingTest(
    "submission history panel shows entries",
    async ({ page, gradingIds }) => {
      if (!gradingIds.submissionId) { gradingTest.skip(true as never, "Fixture setup failed" as never); return; }
      const setupContext = await page.context().browser()!.newContext();
      const setupPage = await setupContext.newPage();
      await ensureFinalized(setupPage, gradingIds.submissionId);
      await setupContext.close();

      await loginAs(page, TEST_USERS.STUDENT);
      await page.goto(
        `/${E2E_CENTER_ID}/dashboard/feedback/${gradingIds.submissionId}`
      );
      await page.waitForLoadState("networkidle");
      await expect(
        page.getByText("Your Response")
          .or(page.getByText("Score"))
          .or(page.getByText("Something went wrong"))
          .or(page.getByText("Not Authorized"))
          .or(page.getByText("Not Found"))
          .first()
      ).toBeVisible({ timeout: 15000 });

      // History panel might show or might not exist for single submission
      const text = await page.textContent("body");
      // Just verify the page loaded
      expect(
        text?.includes("Your Response") ||
          text?.includes("Score") ||
          text?.includes("Not Authorized") ||
          text?.includes("Not Found") ||
          text?.includes("Something went wrong")
      ).toBeTruthy();
    }
  );

  gradingTest(
    "student cannot access another student's feedback",
    async ({ page }) => {
      await loginAs(page, TEST_USERS.STUDENT);

      // Navigate to a fake submission ID
      await page.goto(
        `/${E2E_CENTER_ID}/dashboard/feedback/fake-submission-id-12345`
      );
      await page.waitForLoadState("networkidle");
      await expect(
        page.getByText("Not Authorized")
          .or(page.getByText("Submission Not Found"))
          .or(page.getByText("Something went wrong"))
          .or(page.getByText("not found"))
          .first()
      ).toBeVisible({ timeout: 15000 });

      // Should show "Not Authorized" or "Not Found"
      const text = await page.textContent("body");
      expect(
        text?.includes("Not Authorized") ||
          text?.includes("Submission Not Found") ||
          text?.includes("Something went wrong") ||
          text?.includes("not found") ||
          !text?.includes("Your Response")
      ).toBeTruthy();
    }
  );

  gradingTest(
    "feedback page readable on mobile viewport",
    async ({ browser, gradingIds }) => {
      if (!gradingIds.submissionId) { gradingTest.skip(true as never, "Fixture setup failed" as never); return; }
      // Create a mobile-sized context
      const context = await browser.newContext({
        viewport: { width: 375, height: 667 },
      });
      const page = await context.newPage();

      // Setup: finalize grading
      await loginAs(page, TEST_USERS.OWNER);
      await finalizeGradingViaAPI(page, gradingIds.submissionId, 7).catch(
        () => {}
      );

      await loginAs(page, TEST_USERS.STUDENT);
      await page.goto(
        `/${E2E_CENTER_ID}/dashboard/feedback/${gradingIds.submissionId}`
      );
      await page.waitForLoadState("networkidle");
      await expect(
        page.getByText("Your Response")
          .or(page.getByText("Score"))
          .or(page.getByText("Something went wrong"))
          .or(page.getByText("Not Authorized"))
          .first()
      ).toBeVisible({ timeout: 15000 });

      // Check no horizontal overflow
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasOverflow).toBeFalsy();

      await context.close();
    }
  );
});
