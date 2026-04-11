import { describe, it, expect, beforeEach, afterAll } from "vitest";
import i18n from "i18next";
import { getIntlLocale, formatDate, formatNumber } from "@/lib/locale-utils";

describe("i18n", () => {
  beforeEach(async () => {
    if (i18n.language !== "en") {
      await i18n.changeLanguage("en");
    }
  });

  // Always restore English after this suite so suite ordering doesn't matter.
  afterAll(async () => {
    await i18n.changeLanguage("en");
  });

  describe("initialization", () => {
    it("is initialized in test setup", () => {
      expect(i18n.isInitialized).toBe(true);
    });

    it("uses 'common' as the default namespace", () => {
      expect(i18n.options.defaultNS).toBe("common");
    });

    it("has 'en' in the fallback chain", () => {
      // i18next normalises `fallbackLng: "en"` to `["en"]` internally; we
      // assert membership rather than exact shape so the test isn't brittle
      // to that normalisation.
      const fb = i18n.options.fallbackLng;
      const list = Array.isArray(fb) ? fb : [fb];
      expect(list).toContain("en");
    });
  });

  describe("language switching", () => {
    it("starts in English", () => {
      expect(i18n.language).toBe("en");
    });

    it("switches to Vietnamese and back", async () => {
      await i18n.changeLanguage("vi");
      expect(i18n.language).toBe("vi");
      // Verify a translated key
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((i18n.t as any)("button.save", { ns: "common" })).toBe("Lưu");

      await i18n.changeLanguage("en");
      expect(i18n.language).toBe("en");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((i18n.t as any)("button.save", { ns: "common" })).toBe("Save");
    });

    it("returns the English text by default", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((i18n.t as any)("button.cancel", { ns: "common" })).toBe("Cancel");
    });
  });

  describe("fallback behavior", () => {
    it("returns key when both languages are missing it", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const missing = (i18n.t as any)("nonexistent.key", { ns: "common" });
      // i18next returns the key when missing
      expect(missing).toBe("nonexistent.key");
    });
  });
});

describe("locale-utils", () => {
  beforeEach(async () => {
    if (i18n.language !== "en") {
      await i18n.changeLanguage("en");
    }
  });

  it("maps i18n codes to IETF locales", () => {
    expect(getIntlLocale("en")).toBe("en-US");
    expect(getIntlLocale("vi")).toBe("vi-VN");
  });

  it("formats dates as MM/DD/YYYY in English", () => {
    const result = formatDate("2026-01-25T00:00:00Z", undefined, "en");
    // en-US uses MM/DD/YYYY
    expect(result).toMatch(/01\/25\/2026|01\/24\/2026/); // tz-tolerant
  });

  it("formats dates as DD/MM/YYYY in Vietnamese", () => {
    const result = formatDate("2026-01-25T00:00:00Z", undefined, "vi");
    // vi-VN uses DD/MM/YYYY
    expect(result).toMatch(/25\/01\/2026|24\/01\/2026/); // tz-tolerant
  });

  it("formats numbers in the active locale", () => {
    expect(formatNumber(1234.5, undefined, "en")).toBe("1,234.5");
    // vi-VN uses dot as thousands separator and comma as decimal
    const vi = formatNumber(1234.5, undefined, "vi");
    expect(vi).toMatch(/1[.,\u00A0]234,5/);
  });
});
