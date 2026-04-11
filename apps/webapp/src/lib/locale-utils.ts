import i18n from "@/i18n";

const LOCALE_MAP: Record<string, string> = {
  en: "en-US",
  vi: "vi-VN",
};

/**
 * Map i18next language code (or BCP-47 tag) to an IETF locale tag for Intl
 * APIs. Falls back to "en-US".
 */
export function getIntlLocale(lng?: string): string {
  const language = lng || i18n.language || "en";
  // Strip region (e.g. "en-GB" -> "en") so we don't try to format with a
  // locale that doesn't have a translation file.
  const base = language.split("-")[0];
  return LOCALE_MAP[base] || "en-US";
}

/**
 * Date-only ISO strings ("2026-01-25") are parsed as UTC midnight by `new Date`.
 * In timezones west of UTC this rolls back to the previous day. Detect that
 * shape and treat it as a calendar date in UTC for display.
 */
function isDateOnlyString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toDate(date: Date | string): { d: Date; isDateOnly: boolean } {
  if (typeof date === "string") {
    return { d: new Date(date), isDateOnly: isDateOnlyString(date) };
  }
  return { d: date, isDateOnly: false };
}

function isValid(d: Date): boolean {
  return d instanceof Date && !isNaN(d.getTime());
}

/**
 * Format a date using the current locale.
 * Vietnamese: DD/MM/YYYY, English: MM/DD/YYYY.
 * Returns "—" for invalid input rather than throwing.
 */
export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions,
  lng?: string,
): string {
  const { d, isDateOnly } = toDate(date);
  if (!isValid(d)) return "—";
  try {
    return new Intl.DateTimeFormat(getIntlLocale(lng), {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      // Render date-only inputs in UTC so they don't shift across timezones.
      ...(isDateOnly ? { timeZone: "UTC" } : {}),
      ...options,
    }).format(d);
  } catch {
    return "—";
  }
}

/**
 * Format a date with time. Returns "—" for invalid input.
 */
export function formatDateTime(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions,
  lng?: string,
): string {
  const { d } = toDate(date);
  if (!isValid(d)) return "—";
  try {
    return new Intl.DateTimeFormat(getIntlLocale(lng), {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      ...options,
    }).format(d);
  } catch {
    return "—";
  }
}

/**
 * Format a number using the current locale. Returns the raw value as string
 * if formatting throws.
 */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
  lng?: string,
): string {
  if (typeof value !== "number" || !isFinite(value)) return String(value);
  try {
    return new Intl.NumberFormat(getIntlLocale(lng), options).format(value);
  } catch {
    return String(value);
  }
}

/**
 * Format currency using the current locale. Validates the currency code is
 * uppercase ASCII; falls back to a plain number on bad input.
 */
export function formatCurrency(
  value: number,
  currency: string,
  lng?: string,
): string {
  if (typeof value !== "number" || !isFinite(value)) return String(value);
  const code = (currency || "USD").toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return formatNumber(value, undefined, lng);
  try {
    return new Intl.NumberFormat(getIntlLocale(lng), {
      style: "currency",
      currency: code,
    }).format(value);
  } catch {
    return formatNumber(value, undefined, lng);
  }
}

/**
 * Format a relative time string (e.g., "2 hours ago", "in 3 days").
 * Handles negative diffs (future dates), invalid dates, and browsers without
 * Intl.RelativeTimeFormat (returns the absolute date as fallback).
 */
export function formatRelativeTime(
  date: Date | string,
  lng?: string,
): string {
  const { d } = toDate(date);
  if (!isValid(d)) return "—";
  if (typeof Intl.RelativeTimeFormat !== "function") {
    return formatDateTime(d, undefined, lng);
  }

  const diffMs = Date.now() - d.getTime();
  const absMs = Math.abs(diffMs);
  // Past diffs are positive → render with negative numbers (e.g. "-2 days").
  // Future diffs are negative → render with positive numbers (e.g. "+2 days").
  const sign = diffMs >= 0 ? -1 : 1;

  const seconds = Math.floor(absMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let rtf: Intl.RelativeTimeFormat;
  try {
    rtf = new Intl.RelativeTimeFormat(getIntlLocale(lng), { numeric: "auto" });
  } catch {
    return formatDateTime(d, undefined, lng);
  }

  if (days > 0) return rtf.format(sign * days, "day");
  if (hours > 0) return rtf.format(sign * hours, "hour");
  if (minutes > 0) return rtf.format(sign * minutes, "minute");
  return rtf.format(sign * seconds, "second");
}
