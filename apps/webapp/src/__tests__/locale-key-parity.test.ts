import { describe, it, expect } from "vitest";

const NAMESPACES = [
  "common",
  "auth",
  "exercises",
  "grading",
  "settings",
  "dashboard",
  "logistics",
  "users",
  "assignments",
  "submissions",
  "student-health",
  "mock-tests",
] as const;

/**
 * Recursively collect every key path in a (possibly nested) JSON object,
 * joining nested keys with `.`. So `{ a: { b: 1 } }` → `["a.b"]`.
 *
 * Our locale files are currently flat, but this guards against silent drift
 * if anyone introduces nested structures later.
 */
function collectKeyPaths(
  obj: Record<string, unknown>,
  prefix = "",
): string[] {
  const result: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      result.push(...collectKeyPaths(value as Record<string, unknown>, path));
    } else {
      result.push(path);
    }
  }
  return result;
}

/**
 * Verifies that every English translation key has a corresponding Vietnamese
 * translation (and vice versa). Missing Vietnamese keys silently fall back to
 * English at runtime, but a parity gap should fail CI so translation work
 * isn't forgotten.
 *
 * Uses the literal `../locales/...` path so the assertion does not rely on
 * the Vitest `@` alias being configured — if the alias is missing, the import
 * will fail with a clear ENOENT-style error rather than passing silently.
 */
describe("locale key parity (en ↔ vi)", () => {
  for (const ns of NAMESPACES) {
    it(`namespace "${ns}" has matching keys in en and vi`, async () => {
      const en = (await import(`../locales/en/${ns}.json`))
        .default as Record<string, unknown>;
      const vi = (await import(`../locales/vi/${ns}.json`))
        .default as Record<string, unknown>;

      const enKeys = new Set(collectKeyPaths(en));
      const viKeys = new Set(collectKeyPaths(vi));

      const missingInVi = [...enKeys].filter((k) => !viKeys.has(k));
      const missingInEn = [...viKeys].filter((k) => !enKeys.has(k));

      expect(missingInVi).toEqual([]);
      expect(missingInEn).toEqual([]);
    });
  }
});
