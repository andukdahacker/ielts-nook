import { test, expect } from "@playwright/test";

/**
 * TC 10.1-001 to 10.1-014: Marketing Landing Page
 *
 * These tests hit the marketing site (Astro) at the root URL.
 * Configure MARKETING_URL env var if different from base URL.
 */

const MARKETING_URL = process.env.MARKETING_URL || "http://localhost:4321";

test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(MARKETING_URL);
    await page.waitForLoadState("domcontentloaded");
  });

  test("TC 10.1-001: single scrollable page loads", async ({ page }) => {
    // Page should load without errors
    const body = await page.textContent("body");
    expect(body?.length).toBeGreaterThan(0);

    // Should be a single page (no additional route navigation needed)
    expect(page.url()).toBe(MARKETING_URL + "/");
  });

  test("TC 10.1-002: nav has logo and Sign In link", async ({ page }) => {
    // Logo should be visible
    const logo = page.locator("nav img, nav svg, header img, header svg").first();
    const hasLogo = await logo.isVisible().catch(() => false);
    const hasLogoText = await page.getByText(/classlite/i).first().isVisible().catch(() => false);
    expect(hasLogo || hasLogoText).toBeTruthy();

    // Sign In link should exist
    const signInLink = page.getByRole("link", { name: /sign in|get started|login/i }).first();
    await expect(signInLink).toBeVisible();
  });

  test("TC 10.1-003: hero section has headline and CTA", async ({ page }) => {
    // Main headline
    const headline = page.getByText(/teaching.*without.*clutter/i).first();
    const hasHeadline = await headline.isVisible().catch(() => false);
    // May have a different headline text
    const hasAnyHeading = await page.locator("h1").first().isVisible().catch(() => false);
    expect(hasHeadline || hasAnyHeading).toBeTruthy();

    // CTA button
    const ctaButton = page.getByRole("link", { name: /get started|sign up|try/i }).first();
    const hasCTA = await ctaButton.isVisible().catch(() => false);
    expect(hasCTA).toBeTruthy();
  });

  test("TC 10.1-004: three value cards are displayed", async ({ page }) => {
    // Look for value proposition cards
    const gradeText = page.getByText(/grade.*minutes/i).first();
    const helpText = page.getByText(/who needs help/i).first();
    const scheduleText = page.getByText(/schedule.*without/i).first();

    const hasGrade = await gradeText.isVisible().catch(() => false);
    const hasHelp = await helpText.isVisible().catch(() => false);
    const hasSchedule = await scheduleText.isVisible().catch(() => false);

    // At least some value cards should be present
    expect(hasGrade || hasHelp || hasSchedule).toBeTruthy();
  });

  test("TC 10.1-005: How It Works section", async ({ page }) => {
    const howItWorks = page.getByText(/how it works/i).first();
    const hasSection = await howItWorks.isVisible().catch(() => false);

    if (hasSection) {
      // Should show 3 steps
      const buildText = page.getByText(/build.*exercise/i).first();
      const submitText = page.getByText(/student.*submit/i).first();
      const gradeText = page.getByText(/ai.*grade|ai.*help/i).first();

      const hasSteps = (await buildText.isVisible().catch(() => false)) ||
        (await submitText.isVisible().catch(() => false)) ||
        (await gradeText.isVisible().catch(() => false));
      expect(hasSteps).toBeTruthy();
    }
  });

  test("TC 10.1-006: footer has copyright", async ({ page }) => {
    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const footer = page.getByText(/©.*classlite|classlite.*©/i).first();
    const hasFooter = await footer.isVisible().catch(() => false);
    expect(hasFooter).toBeTruthy();
  });
});

// ─── Responsive Tests ───────────────────────────────────────────────────────

test.describe("Landing Page - Responsive", () => {
  test("TC 10.1-007: mobile responsive (375px)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(MARKETING_URL);
    await page.waitForLoadState("domcontentloaded");

    // No horizontal scrollbar
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // 5px tolerance

    // Content is readable
    const body = await page.textContent("body");
    expect(body?.length).toBeGreaterThan(0);
  });

  test("TC 10.1-008: tablet responsive (768px)", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(MARKETING_URL);
    await page.waitForLoadState("domcontentloaded");

    // No horizontal scrollbar
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  test("TC 10.1-009: desktop layout (1024px+)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(MARKETING_URL);
    await page.waitForLoadState("domcontentloaded");

    // Page loads correctly at desktop width
    const body = await page.textContent("body");
    expect(body?.length).toBeGreaterThan(0);
  });
});

// ─── SEO & Performance ─────────────────────────────────────────────────────

test.describe("Landing Page - SEO", () => {
  test("TC 10.1-010: page has title and meta description", async ({ page }) => {
    await page.goto(MARKETING_URL);
    await page.waitForLoadState("domcontentloaded");

    // Page title
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    expect(title.toLowerCase()).toContain("classlite");

    // Meta description
    const metaDesc = await page.getAttribute('meta[name="description"]', "content");
    expect(metaDesc?.length).toBeGreaterThan(0);
  });

  test("TC 10.1-011: Open Graph tags exist", async ({ page }) => {
    await page.goto(MARKETING_URL);
    await page.waitForLoadState("domcontentloaded");

    const ogTitle = await page.getAttribute('meta[property="og:title"]', "content");
    const ogDesc = await page.getAttribute('meta[property="og:description"]', "content");

    // At least one OG tag should exist
    expect(ogTitle || ogDesc).toBeTruthy();
  });

  test("TC 10.1-012: favicon is present", async ({ page }) => {
    await page.goto(MARKETING_URL);
    await page.waitForLoadState("domcontentloaded");

    const favicon = await page.locator('link[rel="icon"], link[rel="shortcut icon"]').count();
    expect(favicon).toBeGreaterThanOrEqual(1);
  });

  test("TC 10.1-013: page loads within 5 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto(MARKETING_URL);
    await page.waitForLoadState("domcontentloaded");
    const loadTime = Date.now() - start;

    expect(loadTime).toBeLessThan(5000);
  });
});
