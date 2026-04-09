import { describe, it, expect } from "vitest";
import { splitByBlanks, formatBlankDisplay, extractBlankNumbers } from "./blank-format";

describe("blank-format", () => {
  describe("splitByBlanks", () => {
    it("splits text with multiple blanks", () => {
      expect(splitByBlanks("text ___1___ more ___2___")).toEqual([
        "text ",
        "1",
        " more ",
        "2",
        "",
      ]);
    });

    it("returns original text when no blanks present", () => {
      expect(splitByBlanks("no blanks here")).toEqual(["no blanks here"]);
    });

    it("handles empty string", () => {
      expect(splitByBlanks("")).toEqual([""]);
    });

    it("handles text starting with a blank", () => {
      expect(splitByBlanks("___1___ after")).toEqual(["", "1", " after"]);
    });

    it("handles consecutive blanks", () => {
      expect(splitByBlanks("___1______2___")).toEqual(["", "1", "", "2", ""]);
    });

    it("handles non-string input gracefully", () => {
      expect(splitByBlanks(42 as unknown as string)).toEqual(["42"]);
      expect(splitByBlanks(null as unknown as string)).toEqual(["null"]);
    });
  });

  describe("formatBlankDisplay", () => {
    it("formats single digit", () => {
      expect(formatBlankDisplay("1")).toBe("(1)");
    });

    it("formats multi-digit", () => {
      expect(formatBlankDisplay("12")).toBe("(12)");
    });
  });

  describe("extractBlankNumbers", () => {
    it("extracts blank numbers from text", () => {
      expect(extractBlankNumbers("text ___1___ more ___2___")).toEqual(["1", "2"]);
    });

    it("returns empty array when no blanks", () => {
      expect(extractBlankNumbers("no blanks here")).toEqual([]);
    });

    it("handles empty string", () => {
      expect(extractBlankNumbers("")).toEqual([]);
    });

    it("extracts multi-digit numbers", () => {
      expect(extractBlankNumbers("___12___ and ___3___")).toEqual(["12", "3"]);
    });
  });
});
