import { describe, it, expect } from "vitest";
import { buildEngagementEmail } from "./engagement-notification.template.js";

const baseParams = {
  studentName: "Alice Nguyen",
  centerName: "IELTS Hub",
  dashboardUrl: "https://app.classlite.com/dashboard",
};

describe("buildEngagementEmail", () => {
  describe("streak-only", () => {
    it("returns correct subject in English", () => {
      const { subject } = buildEngagementEmail({
        ...baseParams,
        achievementType: "streak",
        locale: "en",
      });
      expect(subject).toBe("Alice Nguyen hit a 7-day study streak!");
    });

    it("returns correct subject in Vietnamese", () => {
      const { subject } = buildEngagementEmail({
        ...baseParams,
        achievementType: "streak",
        locale: "vi",
      });
      expect(subject).toBe(
        "Alice Nguyen đã đạt chuỗi 7 ngày học liên tiếp!",
      );
    });

    it("includes streak messaging in HTML body", () => {
      const { html } = buildEngagementEmail({
        ...baseParams,
        achievementType: "streak",
        locale: "en",
      });
      expect(html).toContain("7 consecutive days");
      expect(html).toContain("Keep up the great work");
      expect(html).not.toContain("highest score ever");
    });

    it("does not include personal-best messaging", () => {
      const { html } = buildEngagementEmail({
        ...baseParams,
        achievementType: "streak",
        locale: "en",
      });
      expect(html).not.toContain("Personal Best");
      expect(html).not.toContain("highest score");
    });
  });

  describe("personal-best-only", () => {
    it("returns correct subject in English", () => {
      const { subject } = buildEngagementEmail({
        ...baseParams,
        achievementType: "personal-best",
        score: 7.5,
        locale: "en",
      });
      expect(subject).toBe("Alice Nguyen achieved a new Personal Best!");
    });

    it("returns correct subject in Vietnamese", () => {
      const { subject } = buildEngagementEmail({
        ...baseParams,
        achievementType: "personal-best",
        score: 7.5,
        locale: "vi",
      });
      expect(subject).toBe("Alice Nguyen đã đạt điểm cao nhất mới!");
    });

    it("includes score in HTML body when provided", () => {
      const { html } = buildEngagementEmail({
        ...baseParams,
        achievementType: "personal-best",
        score: 7.5,
        locale: "en",
      });
      expect(html).toContain("highest score ever");
      expect(html).toContain("7.5");
    });

    it("omits score from body when null", () => {
      const { html } = buildEngagementEmail({
        ...baseParams,
        achievementType: "personal-best",
        score: null,
        locale: "en",
      });
      expect(html).toContain("highest score ever");
      expect(html).not.toContain("— null");
    });

    it("does not include streak messaging", () => {
      const { html } = buildEngagementEmail({
        ...baseParams,
        achievementType: "personal-best",
        score: 7.5,
        locale: "en",
      });
      expect(html).not.toContain("7 consecutive days");
    });
  });

  describe("combined (streak + personal-best)", () => {
    it("returns correct subject in English", () => {
      const { subject } = buildEngagementEmail({
        ...baseParams,
        achievementType: "combined",
        score: 8,
        locale: "en",
      });
      expect(subject).toBe(
        "Alice Nguyen hit a 7-day streak and a new Personal Best!",
      );
    });

    it("returns correct subject in Vietnamese", () => {
      const { subject } = buildEngagementEmail({
        ...baseParams,
        achievementType: "combined",
        score: 8,
        locale: "vi",
      });
      expect(subject).toBe(
        "Alice Nguyen đã đạt chuỗi 7 ngày và điểm cao nhất mới!",
      );
    });

    it("includes both streak and personal-best messaging", () => {
      const { html } = buildEngagementEmail({
        ...baseParams,
        achievementType: "combined",
        score: 8,
        locale: "en",
      });
      expect(html).toContain("7 consecutive days");
      expect(html).toContain("highest score ever");
      expect(html).toContain("8");
    });
  });

  describe("center branding", () => {
    it("includes center name in header", () => {
      const { html } = buildEngagementEmail({
        ...baseParams,
        achievementType: "streak",
        locale: "en",
      });
      expect(html).toContain("IELTS Hub");
      expect(html).toContain("background-color:#2563EB");
    });

    it("escapes center name with special characters", () => {
      const { html } = buildEngagementEmail({
        ...baseParams,
        centerName: "IELTS <Hub> & More",
        achievementType: "streak",
        locale: "en",
      });
      expect(html).toContain("IELTS &lt;Hub&gt; &amp; More");
      expect(html).not.toContain("<Hub>");
    });
  });

  describe("deep-link button", () => {
    it("includes dashboard URL in CTA button", () => {
      const { html } = buildEngagementEmail({
        ...baseParams,
        achievementType: "streak",
        locale: "en",
      });
      expect(html).toContain(
        'href="https://app.classlite.com/dashboard"',
      );
      expect(html).toContain("View My Dashboard");
    });

    it("uses Vietnamese button text for vi locale", () => {
      const { html } = buildEngagementEmail({
        ...baseParams,
        achievementType: "streak",
        locale: "vi",
      });
      expect(html).toContain("Xem Trang Cá Nhân");
    });
  });

  describe("footer", () => {
    it("includes membership footer in English", () => {
      const { html } = buildEngagementEmail({
        ...baseParams,
        achievementType: "streak",
        locale: "en",
      });
      expect(html).toContain(
        "You received this email because you are a member of IELTS Hub",
      );
    });

    it("includes membership footer in Vietnamese", () => {
      const { html } = buildEngagementEmail({
        ...baseParams,
        achievementType: "streak",
        locale: "vi",
      });
      expect(html).toContain(
        "Bạn nhận được email này vì bạn là thành viên của IELTS Hub",
      );
    });
  });

  describe("HTML structure", () => {
    it("produces valid HTML document", () => {
      const { html } = buildEngagementEmail({
        ...baseParams,
        achievementType: "streak",
        locale: "en",
      });
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain('<meta charset="utf-8">');
      expect(html).toContain("</html>");
    });

    it("uses table-based layout", () => {
      const { html } = buildEngagementEmail({
        ...baseParams,
        achievementType: "streak",
        locale: "en",
      });
      expect(html).toContain('width="600"');
      expect(html).toContain("cellpadding");
    });
  });
});
