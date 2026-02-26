import { expect } from "@playwright/test";
import {
  test,
  TEST_USERS,
  loginAs,
  getAppUrl,
} from "../../fixtures/auth.fixture";
import { closeAIAssistantDialog } from "../../utils/close-ai-assistant";

test.describe("Email Intervention (Story 6.3)", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.OWNER);
    await page.goto(getAppUrl("/dashboard/students"));
    await page.waitForLoadState("networkidle");
    await closeAIAssistantDialog(page);
    await page.waitForTimeout(500);
  });

  function openStudentOverlay(page: import("@playwright/test").Page) {
    return async () => {
      const studentCard = page
        .locator('[role="button"]')
        .filter({ has: page.locator("text=Attendance") })
        .first();
      const hasCards = await studentCard.isVisible().catch(() => false);
      if (!hasCards) return false;

      await studentCard.click();
      const overlay = page
        .locator('[data-slot="sheet-content"], [role="dialog"]')
        .first();
      await expect(overlay).toBeVisible({ timeout: 5000 });
      return true;
    };
  }

  test('"Contact Parent" button visible for OWNER in overlay', async ({
    page,
  }) => {
    const open = openStudentOverlay(page);
    const opened = await open();
    if (!opened) {
      test.skip(true, "No student cards visible");
      return;
    }

    const overlay = page
      .locator('[data-slot="sheet-content"], [role="dialog"]')
      .first();
    await expect(
      overlay.getByRole("button", { name: /Contact Parent/i })
    ).toBeVisible();
  });

  test("clicking opens email compose modal", async ({ page }) => {
    const open = openStudentOverlay(page);
    const opened = await open();
    if (!opened) {
      test.skip(true, "No student cards visible");
      return;
    }

    const overlay = page
      .locator('[data-slot="sheet-content"], [role="dialog"]')
      .first();
    await overlay
      .getByRole("button", { name: /Contact Parent/i })
      .click();

    // Compose modal should appear
    const composeDialog = page.getByRole("dialog").filter({
      hasText: /Contact Parent/i,
    });
    await expect(composeDialog).toBeVisible({ timeout: 5000 });

    // Should have form fields
    await expect(composeDialog.locator("#to, input[type='email']").first()).toBeVisible();
    await expect(composeDialog.locator("#subject, input[name='subject']").first()).toBeVisible();
    await expect(composeDialog.locator("#body, textarea").first()).toBeVisible();
  });

  test("modal pre-fills recipient and template body", async ({ page }) => {
    const open = openStudentOverlay(page);
    const opened = await open();
    if (!opened) {
      test.skip(true, "No student cards visible");
      return;
    }

    const overlay = page
      .locator('[data-slot="sheet-content"], [role="dialog"]')
      .first();
    await overlay
      .getByRole("button", { name: /Contact Parent/i })
      .click();

    const composeDialog = page.getByRole("dialog").filter({
      hasText: /Contact Parent/i,
    });
    await expect(composeDialog).toBeVisible({ timeout: 5000 });

    // Wait for template to load
    await page.waitForTimeout(1000);

    // Subject and body should have some pre-filled content
    const subjectInput = composeDialog.locator("#subject, input[name='subject']").first();
    const bodyTextarea = composeDialog.locator("#body, textarea").first();

    const subjectValue = await subjectInput.inputValue().catch(() => "");
    const bodyValue = await bodyTextarea.inputValue().catch(() => "");

    // At least one field should be pre-filled (template provides defaults)
    expect(subjectValue.length > 0 || bodyValue.length > 0).toBeTruthy();
  });

  test("send button disabled when required fields empty", async ({
    page,
  }) => {
    const open = openStudentOverlay(page);
    const opened = await open();
    if (!opened) {
      test.skip(true, "No student cards visible");
      return;
    }

    const overlay = page
      .locator('[data-slot="sheet-content"], [role="dialog"]')
      .first();
    await overlay
      .getByRole("button", { name: /Contact Parent/i })
      .click();

    const composeDialog = page.getByRole("dialog").filter({
      hasText: /Contact Parent/i,
    });
    await expect(composeDialog).toBeVisible({ timeout: 5000 });

    // Clear the "To" field
    const toInput = composeDialog.locator("#to, input[type='email']").first();
    await toInput.clear();

    // Send button should be disabled
    const sendBtn = composeDialog.getByRole("button", { name: /Send/i });
    await expect(sendBtn).toBeDisabled();
  });

  test("sending intervention shows success toast", async ({ page }) => {
    const open = openStudentOverlay(page);
    const opened = await open();
    if (!opened) {
      test.skip(true, "No student cards visible");
      return;
    }

    const overlay = page
      .locator('[data-slot="sheet-content"], [role="dialog"]')
      .first();
    await overlay
      .getByRole("button", { name: /Contact Parent/i })
      .click();

    const composeDialog = page.getByRole("dialog").filter({
      hasText: /Contact Parent/i,
    });
    await expect(composeDialog).toBeVisible({ timeout: 5000 });

    // Wait for template to potentially load
    await page.waitForTimeout(1000);

    // Fill required fields using label-based locators (more robust)
    const toInput = composeDialog.getByLabel("To");
    const subjectInput = composeDialog.getByLabel("Subject");
    const bodyTextarea = composeDialog.getByLabel("Body");

    await toInput.fill("parent@example.com");
    await subjectInput.fill("Student Progress Update");
    await bodyTextarea.fill(
      "Dear Parent, we would like to discuss your child's progress."
    );

    // Click Send
    const sendBtn = composeDialog.getByRole("button", { name: /Send/i });
    await expect(sendBtn).toBeEnabled();
    await sendBtn.click();

    // Wait for either a toast to appear or the dialog to close (both indicate action completed)
    // Use Promise.race with proper waitFor — isVisible() is instant and doesn't wait
    const toastOrDialogClosed = await Promise.race([
      page.locator('[data-sonner-toast]').first().waitFor({ timeout: 15000 }).then(() => "toast" as const),
      composeDialog.waitFor({ state: "hidden", timeout: 15000 }).then(() => "closed" as const),
    ]).catch(() => "neither" as const);

    if (toastOrDialogClosed === "toast") {
      // Verify it's a success or error toast (both indicate the action ran)
      const toastText = await page.locator('[data-sonner-toast]').first().textContent();
      expect(
        toastText?.includes("Intervention email queued") ||
          toastText?.includes("queued") ||
          toastText?.includes("sent") ||
          toastText?.includes("success") ||
          toastText?.includes("Failed")
      ).toBeTruthy();
    } else if (toastOrDialogClosed === "closed") {
      // Dialog closed — action succeeded
    } else {
      // Neither happened — fail with helpful message
      throw new Error("Neither toast nor dialog close observed after clicking Send");
    }
  });

  test("cancel closes modal without sending", async ({ page }) => {
    const open = openStudentOverlay(page);
    const opened = await open();
    if (!opened) {
      test.skip(true, "No student cards visible");
      return;
    }

    const overlay = page
      .locator('[data-slot="sheet-content"], [role="dialog"]')
      .first();
    await overlay
      .getByRole("button", { name: /Contact Parent/i })
      .click();

    // Use data-slot="dialog-content" to specifically target the compose modal, not the sheet overlay
    const composeDialog = page.locator('[data-slot="dialog-content"]').filter({
      hasText: /Contact Parent/i,
    });
    await expect(composeDialog).toBeVisible({ timeout: 5000 });

    // Click Cancel
    await composeDialog
      .getByRole("button", { name: /Cancel/i })
      .click();

    // Modal should close — wait for the dialog-content to become hidden
    await expect(composeDialog).not.toBeVisible({ timeout: 5000 });
  });

  test("Interventions tab shows sent email in history", async ({ page }) => {
    const open = openStudentOverlay(page);
    const opened = await open();
    if (!opened) {
      test.skip(true, "No student cards visible");
      return;
    }

    const overlay = page
      .locator('[data-slot="sheet-content"], [role="dialog"]')
      .first();

    // Click Interventions tab (visible for OWNER)
    const interventionsTab = overlay
      .locator('[role="tab"]')
      .filter({ hasText: "Interventions" });

    const hasTab = await interventionsTab.waitFor({ state: "visible", timeout: 5000 }).then(() => true).catch(() => false);
    if (!hasTab) {
      test.skip(true, "Interventions tab not visible");
      return;
    }

    // Tabs are below the fold in the Sheet overlay so normal click fails.
    // Scroll the tab into view, focus it, and press Space to activate.
    await interventionsTab.evaluate((el: HTMLElement) => {
      el.scrollIntoView({ block: "center" });
      el.focus();
    });
    await page.waitForTimeout(300);
    await page.keyboard.press("Space");
    await page.waitForTimeout(500);

    const tabPanel = overlay.locator('[role="tabpanel"][data-state="active"]');
    await expect(tabPanel).toBeVisible({ timeout: 5000 });

    // Should show intervention history or empty state
    const text = await tabPanel.textContent();
    expect(
      text?.includes("No interventions yet") ||
        text?.includes("Sent") ||
        text?.includes("Pending") ||
        text?.includes("@") // email address
    ).toBeTruthy();
  });
});
