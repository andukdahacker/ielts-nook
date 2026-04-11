import { Textarea } from "@workspace/ui/components/textarea";
import { Label } from "@workspace/ui/components/label";
import { useTranslation } from "react-i18next";

interface PassageEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

export function PassageEditor({ value, onChange, label, placeholder }: PassageEditorProps) {
  const { t } = useTranslation("exercises");
  // Split into paragraphs for lettering display
  const paragraphs = value
    .split(/\n\n+/)
    .filter((p) => p.trim().length > 0);

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="passage-editor">{label ?? t("passageEditor.label")}</Label>
        <p className="text-sm text-muted-foreground">
          {t("passageEditor.description")}
        </p>
      </div>
      <Textarea
        id="passage-editor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? t("passageEditor.placeholder")}
        className="min-h-[300px] font-serif"
      />
      {paragraphs.length > 0 && (
        <div className="rounded-md border p-4 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            {t("passageEditor.preview")} ({paragraphs.length} {paragraphs.length !== 1 ? t("passageEditor.paragraphPlural") : t("passageEditor.paragraphSingular")})
          </p>
          {paragraphs.map((para, idx) => (
            <div key={idx} className="flex gap-3">
              <span className="font-bold text-primary min-w-[1.5rem] text-right">
                {String.fromCharCode(65 + idx)}
              </span>
              <p className="text-sm leading-relaxed">{para.trim()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
