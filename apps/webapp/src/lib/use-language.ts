import { useTranslation } from "react-i18next";
import { useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/auth-context";
import { useUpdateProfile } from "@/features/users/users.api";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";

function isSupportedLanguage(lng: string): lng is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(lng);
}

/**
 * Narrow whatever i18next reports (which can be `en-GB`, `vi-VN`, etc.) to one
 * of our supported codes. Falls back to `en`.
 */
export function normalizeLanguage(lng: string | undefined): SupportedLanguage {
  if (!lng) return "en";
  const base = lng.split("-")[0];
  return isSupportedLanguage(base) ? base : "en";
}

/**
 * Hook that wraps useTranslation() and provides a changeLanguage function
 * that syncs with the user's profile when authenticated. Includes:
 *  - same-language no-op guard
 *  - awaited changeLanguage so namespace lazy-loads finish before returning
 *  - rollback + toast on backend failure
 */
export function useLanguage() {
  const { i18n, t } = useTranslation("common");
  const { user } = useAuth();
  const { mutate: updateProfile } = useUpdateProfile();

  const language = normalizeLanguage(i18n.language);

  const changeLanguage = useCallback(
    async (lng: SupportedLanguage) => {
      if (!isSupportedLanguage(lng)) return;
      const previous = normalizeLanguage(i18n.language);
      if (previous === lng) return;

      try {
        await i18n.changeLanguage(lng);
      } catch {
        toast.error(t("language.switchFailed"));
        return;
      }

      if (!user) return;

      updateProfile(
        { preferredLanguage: lng },
        {
          onError: () => {
            // Roll the UI back so it stays in sync with the persisted value.
            void i18n.changeLanguage(previous);
            toast.error(t("language.persistFailed"));
          },
        },
      );
    },
    [i18n, user, updateProfile, t],
  );

  return {
    language,
    changeLanguage,
    t,
    i18n,
  };
}
