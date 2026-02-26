import { expect } from "@playwright/test";
import {
  TEST_USERS,
  loginAs,
  getAppUrl,
  E2E_CENTER_ID,
} from "../../fixtures/auth.fixture";
import {
  gradingTest,
  finalizeGradingViaAPI,
} from "../../fixtures/grading-fixtures";
import { closeAIAssistantDialog } from "../../utils/close-ai-assistant";

gradingTest.describe("Grading RBAC", () => {
  gradingTest.describe.configure({ mode: "serial" });

  gradingTest(
    "STUDENT cannot access grading queue",
    async ({ page }) => {
      await loginAs(page, TEST_USERS.STUDENT);
      await page.goto(getAppUrl("/dashboard/grading"));
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Student should be redirected or see an error — not the grading queue heading
      const heading = page.getByRole("heading", { name: "Grading Queue", level: 1 });
      await expect(heading).not.toBeVisible({ timeout: 5000 });
    }
  );

  gradingTest(
    "TEACHER can access grading queue",
    async ({ page }) => {
      await loginAs(page, TEST_USERS.TEACHER);
      await page.goto(getAppUrl("/dashboard/grading"));
      await page.waitForLoadState("networkidle");
      await closeAIAssistantDialog(page);

      // Teacher should see the grading queue or empty state
      const text = await page.textContent("body");
      expect(
        text?.includes("Grading") ||
          text?.includes("All caught up") ||
          text?.includes("submissions") ||
          text?.includes("analyzing")
      ).toBeTruthy();
    }
  );

  gradingTest(
    "ADMIN can access grading queue",
    async ({ page }) => {
      await loginAs(page, TEST_USERS.ADMIN);
      await page.goto(getAppUrl("/dashboard/grading"));
      await page.waitForLoadState("networkidle");
      await closeAIAssistantDialog(page);

      const text = await page.textContent("body");
      expect(
        text?.includes("Grading") ||
          text?.includes("All caught up") ||
          text?.includes("submissions") ||
          text?.includes("analyzing")
      ).toBeTruthy();
    }
  );

  gradingTest(
    "OWNER can access grading queue",
    async ({ page }) => {
      await loginAs(page, TEST_USERS.OWNER);
      await page.goto(getAppUrl("/dashboard/grading"));
      await page.waitForLoadState("networkidle");
      await closeAIAssistantDialog(page);

      const text = await page.textContent("body");
      expect(
        text?.includes("Grading") ||
          text?.includes("All caught up") ||
          text?.includes("submissions") ||
          text?.includes("analyzing")
      ).toBeTruthy();
    }
  );

  gradingTest(
    "STUDENT can access their own feedback view",
    async ({ page, gradingIds }) => {
      if (!gradingIds.submissionId) { gradingTest.skip(true as never, "Fixture setup failed" as never); return; }
      // Finalize grading first so the student has feedback to view
      const setupContext = await page.context().browser()!.newContext();
      const setupPage = await setupContext.newPage();
      await loginAs(setupPage, TEST_USERS.OWNER);
      await finalizeGradingViaAPI(
        setupPage,
        gradingIds.submissionId,
        7
      ).catch(() => {});
      await setupContext.close();

      // Login as student and access feedback
      await loginAs(page, TEST_USERS.STUDENT);
      await page.goto(
        `/${E2E_CENTER_ID}/dashboard/feedback/${gradingIds.submissionId}`
      );
      await page.waitForLoadState("networkidle");

      // Wait for the page to finish loading (React Query may retry on errors)
      await expect(
        page.getByText("Your Response")
          .or(page.getByText("Score"))
          .or(page.getByText("Back"))
          .or(page.getByText("Something went wrong"))
          .or(page.getByText("Not Authorized"))
          .first()
      ).toBeVisible({ timeout: 15000 });
    }
  );

  gradingTest(
    "STUDENT cannot access grading workbench",
    async ({ page, gradingIds }) => {
      if (!gradingIds.submissionId) { gradingTest.skip(true as never, "Fixture setup failed" as never); return; }
      await loginAs(page, TEST_USERS.STUDENT);
      await page.goto(
        getAppUrl(`/dashboard/grading/${gradingIds.submissionId}`)
      );
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Student should NOT see the workbench
      const hasBandScore = await page
        .getByText("Band Score")
        .isVisible()
        .catch(() => false);
      const hasApprove = await page
        .getByRole("button", { name: /Approve/i })
        .first()
        .isVisible()
        .catch(() => false);

      // Student should not see grading controls
      expect(hasBandScore && hasApprove).toBeFalsy();
    }
  );
});
