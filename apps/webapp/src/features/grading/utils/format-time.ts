import i18n from "@/i18n";
import { getIntlLocale } from "@/lib/locale-utils";

/**
 * Locale-aware relative time formatter using Intl.RelativeTimeFormat.
 * Falls back to "No date" (translated) when input is null/invalid.
 * Returns the absolute date string if Intl.RelativeTimeFormat is unavailable.
 */
export function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return i18n.t("relativeTime.noDate", { ns: "common" });

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return i18n.t("relativeTime.noDate", { ns: "common" });
  }

  if (typeof Intl.RelativeTimeFormat !== "function") {
    // Very old browser fallback — show absolute timestamp.
    return d.toISOString().slice(0, 10);
  }

  const diff = Date.now() - d.getTime();
  const absDiff = Math.abs(diff);
  const minutes = Math.floor(absDiff / 60000);

  let rtf: Intl.RelativeTimeFormat;
  try {
    rtf = new Intl.RelativeTimeFormat(getIntlLocale(), { numeric: "auto" });
  } catch {
    return d.toISOString().slice(0, 10);
  }

  // Past diffs are positive → render with negative numbers.
  const sign = diff >= 0 ? -1 : 1;

  if (minutes < 1) return i18n.t("relativeTime.justNow", { ns: "common" });
  if (minutes < 60) return rtf.format(sign * minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return rtf.format(sign * hours, "hour");
  const days = Math.floor(hours / 24);
  return rtf.format(sign * days, "day");
}
