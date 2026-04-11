import { useTranslation } from "react-i18next";
import { useLanguage, normalizeLanguage } from "@/lib/use-language";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";
import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

const LANGUAGES: { code: SupportedLanguage; label: string }[] = [
  { code: "en", label: "English" },
  { code: "vi", label: "Tiếng Việt" },
];

interface LanguageToggleProps {
  /** Compact mode shows only the globe icon + language code */
  compact?: boolean;
  className?: string;
}

function isSupportedLanguage(value: string): value is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

export function LanguageToggle({ compact, className }: LanguageToggleProps) {
  const { language, changeLanguage } = useLanguage();
  const { t } = useTranslation("common");

  // i18n.language can be "en-US" or undefined briefly during init.
  // Narrow to one of our two supported codes for the Select control's `value`.
  const safeValue = normalizeLanguage(language);

  return (
    <Select
      value={safeValue}
      onValueChange={(v) => {
        if (isSupportedLanguage(v)) {
          void changeLanguage(v);
        }
      }}
    >
      <SelectTrigger
        className={
          compact
            ? "w-auto gap-1.5 border-0 bg-transparent px-2 shadow-none"
            : "w-[140px]"
        }
        aria-label={t("language.selectAriaLabel")}
      >
        <Globe className="h-4 w-4 shrink-0" />
        <SelectValue>
          {compact
            ? safeValue.toUpperCase()
            : LANGUAGES.find((l) => l.code === safeValue)?.label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className={className}>
        {LANGUAGES.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            {lang.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
