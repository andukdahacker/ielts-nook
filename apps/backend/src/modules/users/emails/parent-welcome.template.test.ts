import { describe, it, expect } from "vitest";
import { buildParentWelcomeEmail } from "./parent-welcome.template.js";

const baseParams = {
  studentName: "Alice Nguyen",
  centerName: "IELTS Hub",
  unsubscribeUrl: "https://api.classlite.app/api/v1/unsubscribe/token-123",
};

describe("buildParentWelcomeEmail", () => {
  describe("English locale", () => {
    it("returns correct subject", () => {
      const { subject } = buildParentWelcomeEmail({
        ...baseParams,
        locale: "en",
      });
      expect(subject).toBe("Welcome to IELTS Hub Parent Notifications");
    });

    it("includes student name in body", () => {
      const { html } = buildParentWelcomeEmail({
        ...baseParams,
        locale: "en",
      });
      expect(html).toContain("Alice Nguyen");
      expect(html).toContain("parent/guardian contact");
    });

    it("includes center name in header and body", () => {
      const { html } = buildParentWelcomeEmail({
        ...baseParams,
        locale: "en",
      });
      expect(html).toContain("IELTS Hub");
    });

    it("includes what notifications they will receive", () => {
      const { html } = buildParentWelcomeEmail({
        ...baseParams,
        locale: "en",
      });
      expect(html).toContain("Achievement celebrations");
      expect(html).toContain("7-day streaks");
      expect(html).toContain("Important updates from teachers");
    });

    it("includes unsubscribe link", () => {
      const { html } = buildParentWelcomeEmail({
        ...baseParams,
        locale: "en",
      });
      expect(html).toContain("Unsubscribe from these notifications");
      expect(html).toContain(baseParams.unsubscribeUrl);
    });

    it("includes footer explaining why they received the email", () => {
      const { html } = buildParentWelcomeEmail({
        ...baseParams,
        locale: "en",
      });
      expect(html).toContain("an administrator at IELTS Hub registered your email");
    });

    it("uses Royal Blue header", () => {
      const { html } = buildParentWelcomeEmail({
        ...baseParams,
        locale: "en",
      });
      expect(html).toContain("#2563EB");
    });
  });

  describe("Vietnamese locale", () => {
    it("returns correct subject in Vietnamese", () => {
      const { subject } = buildParentWelcomeEmail({
        ...baseParams,
        locale: "vi",
      });
      expect(subject).toContain("Chào mừng");
      expect(subject).toContain("IELTS Hub");
    });

    it("includes Vietnamese content", () => {
      const { html } = buildParentWelcomeEmail({
        ...baseParams,
        locale: "vi",
      });
      expect(html).toContain("Chào mừng Phụ huynh");
      expect(html).toContain("phụ huynh/người giám hộ");
    });

    it("includes Vietnamese unsubscribe text", () => {
      const { html } = buildParentWelcomeEmail({
        ...baseParams,
        locale: "vi",
      });
      expect(html).toContain("Hủy đăng ký nhận thông báo");
    });
  });

  describe("null student name", () => {
    it("uses fallback name in English", () => {
      const { html } = buildParentWelcomeEmail({
        ...baseParams,
        studentName: null,
        locale: "en",
      });
      expect(html).toContain("your student");
    });

    it("uses fallback name in Vietnamese", () => {
      const { html } = buildParentWelcomeEmail({
        ...baseParams,
        studentName: null,
        locale: "vi",
      });
      expect(html).toContain("học sinh");
    });
  });

  describe("HTML escaping", () => {
    it("escapes special characters in center name", () => {
      const { html } = buildParentWelcomeEmail({
        ...baseParams,
        centerName: "Test & <Center>",
        locale: "en",
      });
      expect(html).toContain("Test &amp; &lt;Center&gt;");
      expect(html).not.toContain("Test & <Center>");
    });

    it("escapes special characters in student name", () => {
      const { html } = buildParentWelcomeEmail({
        ...baseParams,
        studentName: "Alice <script>",
        locale: "en",
      });
      expect(html).toContain("Alice &lt;script&gt;");
    });
  });
});
