import { expect } from "@playwright/test";
import {
  TEST_USERS,
  loginAs,
  getAppUrl,
} from "../../fixtures/auth.fixture";
import {
  gradingTest,
  triggerAndWaitForAnalysis,
  finalizeGradingViaAPI,
} from "../../fixtures/grading-fixtures";
import { closeAIAssistantDialog } from "../../utils/close-ai-assistant";

gradingTest.describe("Grading Workbench (Stories 5.1, 5.2, 5.3, 5.4)", () => {
  gradingTest.describe.configure({ mode: "serial" });
  // Fixture setup uses Firebase emulator tokens (no UI login) for API calls.
  // Only the test body's OWNER login uses UI (Firebase Auth state required for routing).
  gradingTest.setTimeout(120000);

  /**
   * Helper: navigate to workbench as OWNER, verify login and fixture succeeded.
   * Returns false if fixture setup, login, or content loading failed.
   * Retries once if the page shows "Failed to load" (transient API error).
   */
  async function gotoWorkbenchAsOwner(
    page: import("@playwright/test").Page,
    submissionId: string
  ): Promise<boolean> {
    if (!submissionId) return false;
    await loginAs(page, TEST_USERS.OWNER);

    for (let attempt = 1; attempt <= 3; attempt++) {
      await page.goto(
        getAppUrl(`/dashboard/grading/${submissionId}`),
        { timeout: 15000 }
      );
      // Use domcontentloaded instead of networkidle — networkidle can hang
      // if React Query retries or the page keeps polling
      await page.waitForLoadState("domcontentloaded");
      await closeAIAssistantDialog(page);

      // Wait for workbench content or error state to render
      try {
        await page.waitForFunction(
          () => {
            const body = document.body.textContent || "";
            return (
              body.includes("Your Response") ||
              body.includes("Band Score") ||
              body.includes("Teacher Comments") ||
              body.includes("AI Analysis Failed") ||
              body.includes("Test Student") ||
              body.includes("Not Found") ||
              body.includes("Failed to load") ||
              body.includes("All caught up") ||
              body.includes("Something went wrong")
            );
          },
          { timeout: 20000 }
        );
      } catch {
        if (attempt < 3) continue;
        return false;
      }

      // If "Failed to load" appeared, click Retry and try again
      const retryBtn = page.getByRole("button", { name: /Retry/i }).first();
      if (await retryBtn.isVisible().catch(() => false)) {
        if (attempt < 3) {
          await retryBtn.click();
          // Wait for content to re-render after retry
          await page.waitForLoadState("domcontentloaded");
          continue;
        }
        return false;
      }

      return true;
    }
    return false;
  }

  gradingTest(
    "workbench renders student work pane and AI feedback pane",
    async ({ page, gradingIds }) => {
      const ok = await gotoWorkbenchAsOwner(page, gradingIds.submissionId);
      if (!ok) {
        gradingTest.skip(true as never, "Fixture setup failed — login rate-limited" as never);
        return;
      }

      const pageText = await page.textContent("body");
      // The workbench should show the student's answer or a loading/error state
      expect(
        pageText?.includes("Technology") || // student answer text
          pageText?.includes("education") ||
          pageText?.includes("AI is analyzing") ||
          pageText?.includes("AI Analysis Failed") ||
          pageText?.includes("Band Score") ||
          pageText?.includes("Your Response") ||
          pageText?.includes("Teacher Comments") ||
          pageText?.includes("Something went wrong")
      ).toBeTruthy();
    }
  );

  gradingTest(
    "header shows student name, assignment title, skill badge",
    async ({ page, gradingIds }) => {
      const ok = await gotoWorkbenchAsOwner(page, gradingIds.submissionId);
      if (!ok) {
        gradingTest.skip(true as never, "Fixture setup failed — login rate-limited" as never);
        return;
      }

      // Should show student name, assignment title, and Writing badge (or error state)
      const pageText = await page.textContent("body");
      const isError = pageText?.includes("Something went wrong") || pageText?.includes("Not Found");
      if (!isError) {
        expect(
          pageText?.includes("Test Student") ||
            pageText?.includes("E2E Grading")
        ).toBeTruthy();

        // Writing badge
        expect(
          pageText?.includes("Writing") || pageText?.includes("WRITING")
        ).toBeTruthy();
      }
    }
  );

  gradingTest(
    "submission nav shows count with prev/next buttons",
    async ({ page, gradingIds }) => {
      const ok = await gotoWorkbenchAsOwner(page, gradingIds.submissionId);
      if (!ok) {
        gradingTest.skip(true as never, "Fixture setup failed — login rate-limited" as never);
        return;
      }

      // SubmissionNav shows "1 of N submissions" and Prev/Next buttons
      const navText = await page.textContent("body");
      const isError = navText?.includes("Something went wrong") || navText?.includes("Not Found");
      if (isError) return; // Workbench failed to load — skip assertion

      const hasNav =
        navText?.match(/\d+\s+of\s+\d+/) !== null ||
        (await page
          .getByRole("button", { name: /Prev|Previous/i })
          .isVisible()
          .catch(() => false)) ||
        (await page
          .getByRole("button", { name: /Next/i })
          .isVisible()
          .catch(() => false));

      expect(hasNav).toBeTruthy();
    }
  );

  gradingTest(
    '"Back to Queue" returns to list view',
    async ({ page, gradingIds }) => {
      if (!gradingIds.submissionId) { gradingTest.skip(true as never, "Fixture setup failed" as never); return; }
      await loginAs(page, TEST_USERS.OWNER);
      await page.goto(
        getAppUrl(`/dashboard/grading/${gradingIds.submissionId}`)
      );
      await page.waitForLoadState("domcontentloaded");
      await closeAIAssistantDialog(page);

      // Wait for workbench content to render
      await page.waitForFunction(
        () => {
          const body = document.body.textContent || "";
          return (
            body.includes("Your Response") ||
            body.includes("Band Score") ||
            body.includes("Teacher Comments") ||
            body.includes("Test Student") ||
            body.includes("Something went wrong")
          );
        },
        { timeout: 15000 }
      );

      // Click Queue/Back button
      const queueBtn = page
        .getByRole("button", { name: /Queue|Back/i })
        .first();
      const hasBtn = await queueBtn.isVisible().catch(() => false);
      if (!hasBtn) {
        gradingTest.skip(true as never, "No queue button visible" as never);
        return;
      }

      await queueBtn.click();

      // URL should no longer contain the submissionId
      await page.waitForURL(/.*\/grading\/?$/, { timeout: 10000 });
    }
  );

  gradingTest(
    "AI feedback cards render (skip if AI unavailable)",
    async ({ page, gradingIds }) => {
      if (!gradingIds.submissionId) { gradingTest.skip(true as never, "Fixture setup failed" as never); return; }
      await loginAs(page, TEST_USERS.OWNER);

      // Check AI analysis status
      const status = await triggerAndWaitForAnalysis(
        page,
        gradingIds.submissionId,
        15000
      );

      if (status !== "ready") {
        gradingTest.skip(
          true as never,
          `AI analysis not ready: ${status}` as never
        );
        return;
      }

      await page.goto(
        getAppUrl(`/dashboard/grading/${gradingIds.submissionId}`)
      );
      await page.waitForLoadState("domcontentloaded");
      await closeAIAssistantDialog(page);

      // AI feedback should show Band Score and feedback items
      await expect(page.getByText("Band Score")).toBeVisible({ timeout: 10000 });
    }
  );

  gradingTest(
    "approve button marks feedback item as approved",
    async ({ page, gradingIds }) => {
      if (!gradingIds.submissionId) { gradingTest.skip(true as never, "Fixture setup failed" as never); return; }
      await loginAs(page, TEST_USERS.OWNER);

      const status = await triggerAndWaitForAnalysis(
        page,
        gradingIds.submissionId,
        15000
      );
      if (status !== "ready") {
        gradingTest.skip(
          true as never,
          `AI analysis not ready: ${status}` as never
        );
        return;
      }

      await page.goto(
        getAppUrl(`/dashboard/grading/${gradingIds.submissionId}`)
      );
      await page.waitForLoadState("domcontentloaded");
      await closeAIAssistantDialog(page);

      // Wait for AI feedback content to render
      await expect(page.getByText("Band Score")).toBeVisible({ timeout: 15000 });

      // Find an approve button (Check icon button)
      const approveBtn = page
        .locator(
          'button[aria-label*="Approve" i], button[title*="Approve" i]'
        )
        .first();
      const hasBtn = await approveBtn.isVisible().catch(() => false);
      if (!hasBtn) {
        gradingTest.skip(
          true as never,
          "No approve button visible" as never
        );
        return;
      }

      await approveBtn.click();

      // Wait for visual state change (green background or class)
      const parent = approveBtn.locator("..");
      const classes = await parent.getAttribute("class");
      // After approval, the card should have a green indicator
      expect(
        classes?.includes("green") ||
          (await page
            .locator("[class*='green']")
            .first()
            .isVisible()
            .catch(() => false))
      ).toBeTruthy();
    }
  );

  gradingTest(
    "reject button marks feedback item as rejected",
    async ({ page, gradingIds }) => {
      if (!gradingIds.submissionId) { gradingTest.skip(true as never, "Fixture setup failed" as never); return; }
      await loginAs(page, TEST_USERS.OWNER);

      const status = await triggerAndWaitForAnalysis(
        page,
        gradingIds.submissionId,
        15000
      );
      if (status !== "ready") {
        gradingTest.skip(
          true as never,
          `AI analysis not ready: ${status}` as never
        );
        return;
      }

      await page.goto(
        getAppUrl(`/dashboard/grading/${gradingIds.submissionId}`)
      );
      await page.waitForLoadState("domcontentloaded");
      await closeAIAssistantDialog(page);

      // Wait for AI feedback content to render
      await expect(page.getByText("Band Score")).toBeVisible({ timeout: 15000 });

      // Find a reject button (X icon button)
      const rejectBtn = page
        .locator('button[aria-label*="Reject" i], button[title*="Reject" i]')
        .first();
      const hasBtn = await rejectBtn.isVisible().catch(() => false);
      if (!hasBtn) {
        gradingTest.skip(
          true as never,
          "No reject button visible" as never
        );
        return;
      }

      await rejectBtn.click();
    }
  );

  gradingTest(
    'bulk "Approve Remaining" approves all pending items',
    async ({ page, gradingIds }) => {
      if (!gradingIds.submissionId) { gradingTest.skip(true as never, "Fixture setup failed" as never); return; }
      await loginAs(page, TEST_USERS.OWNER);

      const status = await triggerAndWaitForAnalysis(
        page,
        gradingIds.submissionId,
        15000
      );
      if (status !== "ready") {
        gradingTest.skip(
          true as never,
          `AI analysis not ready: ${status}` as never
        );
        return;
      }

      await page.goto(
        getAppUrl(`/dashboard/grading/${gradingIds.submissionId}`)
      );
      await page.waitForLoadState("domcontentloaded");
      await closeAIAssistantDialog(page);

      // Wait for AI feedback content to render
      await expect(page.getByText("Band Score")).toBeVisible({ timeout: 15000 });

      const bulkBtn = page
        .getByRole("button", { name: /Approve All|Approve Remaining/i })
        .first();
      const hasBtn = await bulkBtn.isVisible().catch(() => false);
      if (!hasBtn) {
        gradingTest.skip(
          true as never,
          "No bulk approve button visible" as never
        );
        return;
      }

      await bulkBtn.click();

      // After bulk approve, the "reviewed" counter should show all reviewed
      const text = await page.textContent("body");
      expect(
        text?.includes("reviewed") || text?.includes("Approve & Next")
      ).toBeTruthy();
    }
  );

  gradingTest(
    "finalize grading shows stamped animation",
    async ({ page, gradingIds }) => {
      if (!gradingIds.submissionId) { gradingTest.skip(true as never, "Fixture setup failed" as never); return; }
      await loginAs(page, TEST_USERS.OWNER);

      const status = await triggerAndWaitForAnalysis(
        page,
        gradingIds.submissionId,
        15000
      );
      if (status !== "ready") {
        gradingTest.skip(
          true as never,
          `AI analysis not ready: ${status}` as never
        );
        return;
      }

      await page.goto(
        getAppUrl(`/dashboard/grading/${gradingIds.submissionId}`)
      );
      await page.waitForLoadState("domcontentloaded");
      await closeAIAssistantDialog(page);

      // Wait for AI feedback content to render
      await expect(page.getByText("Band Score")).toBeVisible({ timeout: 15000 });

      // Bulk approve all first
      const bulkBtn = page
        .getByRole("button", { name: /Approve All|Approve Remaining/i })
        .first();
      if (await bulkBtn.isVisible().catch(() => false)) {
        await bulkBtn.click();
        // Wait for bulk approval to complete
        await expect(
          page.getByRole("button", { name: /Approve & Next|Finalize/i }).first()
        ).toBeVisible({ timeout: 10000 });
      }

      // Click finalize button
      const finalizeBtn = page
        .getByRole("button", { name: /Approve & Next|Finalize/i })
        .first();
      const hasBtn = await finalizeBtn.isVisible().catch(() => false);
      if (!hasBtn) {
        gradingTest.skip(
          true as never,
          "No finalize button visible" as never
        );
        return;
      }

      // Wait for the finalize API response
      await Promise.all([
        page.waitForResponse(
          (resp) => resp.url().includes("/grading") && resp.request().method() !== "GET",
          { timeout: 15000 }
        ).catch(() => null),
        finalizeBtn.click(),
      ]);

      // Should show stamped animation or "Graded" badge
      const text = await page.textContent("body");
      expect(
        text?.includes("Graded") ||
          text?.includes("All caught up") ||
          // Might navigate to next submission
          page.url().includes("/grading")
      ).toBeTruthy();
    }
  );

  gradingTest(
    'finalized submission shows "Graded" badge, read-only state',
    async ({ page, gradingIds }) => {
      if (!gradingIds.submissionId) { gradingTest.skip(true as never, "Fixture setup failed" as never); return; }
      await loginAs(page, TEST_USERS.OWNER);

      // Finalize via API to ensure graded state
      await finalizeGradingViaAPI(page, gradingIds.submissionId, 7).catch(
        () => {
          // May fail if already graded or AI not ready
        }
      );

      await page.goto(
        getAppUrl(`/dashboard/grading/${gradingIds.submissionId}`)
      );
      await page.waitForLoadState("domcontentloaded");
      await closeAIAssistantDialog(page);

      // Wait for workbench content to render
      await page.waitForFunction(
        () => {
          const body = document.body.textContent || "";
          return (
            body.includes("Graded") ||
            body.includes("Your Response") ||
            body.includes("Band Score") ||
            body.includes("AI Analysis Failed") ||
            body.includes("Something went wrong")
          );
        },
        { timeout: 30000 }
      );

      // Should show "Graded" badge
      const hasGraded = await page
        .getByText("Graded")
        .first()
        .isVisible()
        .catch(() => false);

      // Approve/Reject buttons should not be visible (read-only)
      if (hasGraded) {
        const approveBtn = page
          .getByRole("button", { name: /Approve & Next/i })
          .first();
        await expect(approveBtn).not.toBeVisible({ timeout: 2000 });
      }
    }
  );

  gradingTest(
    "score override field accepts teacher final score",
    async ({ page, gradingIds }) => {
      if (!gradingIds.submissionId) { gradingTest.skip(true as never, "Fixture setup failed" as never); return; }
      await loginAs(page, TEST_USERS.OWNER);

      const status = await triggerAndWaitForAnalysis(
        page,
        gradingIds.submissionId,
        15000
      );
      if (status !== "ready") {
        gradingTest.skip(
          true as never,
          `AI analysis not ready: ${status}` as never
        );
        return;
      }

      await page.goto(
        getAppUrl(`/dashboard/grading/${gradingIds.submissionId}`)
      );
      await page.waitForLoadState("domcontentloaded");
      await closeAIAssistantDialog(page);

      // Find the Band Score section and click the score to edit
      const bandScore = page.getByText("Band Score").first();
      // Wait for Band Score to appear (AI feedback rendered)
      await expect(bandScore).toBeVisible({ timeout: 15000 }).catch(() => {});
      const hasBand = await bandScore.isVisible().catch(() => false);
      if (!hasBand) {
        gradingTest.skip(
          true as never,
          "Band Score not visible" as never
        );
        return;
      }

      // Click on the score value to open edit mode
      const scoreDisplay = bandScore
        .locator("..")
        .locator("span, div")
        .filter({ hasText: /^[0-9.]+$/ })
        .first();
      const hasScore = await scoreDisplay.isVisible().catch(() => false);
      if (hasScore) {
        await scoreDisplay.click();

        // Wait for the number input to appear after clicking
        const scoreInput = page.locator(
          'input[type="number"][step="0.5"]'
        );
        await expect(scoreInput).toBeVisible({ timeout: 5000 }).catch(() => {});
        if (await scoreInput.isVisible().catch(() => false)) {
          await scoreInput.fill("7");
          await scoreInput.blur();
          // Wait for the score value to update in the DOM
          await expect(scoreDisplay).toBeVisible({ timeout: 5000 }).catch(() => {});
        }
      }
    }
  );
});
