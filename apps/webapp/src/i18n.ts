import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import resourcesToBackend from "i18next-resources-to-backend";

export const SUPPORTED_LANGUAGES = ["en", "vi"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const I18N_NAMESPACES = [
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

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .use(
    resourcesToBackend(
      (language: string, namespace: string) =>
        import(`./locales/${language}/${namespace}.json`),
    ),
  )
  .init({
    fallbackLng: "en",
    supportedLngs: [...SUPPORTED_LANGUAGES],
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    defaultNS: "common",
    ns: [...I18N_NAMESPACES],
    interpolation: { escapeValue: false },
    react: { useSuspense: true },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
  });

export default i18n;
