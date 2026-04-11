import { useState } from "react";
import { ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { useTranslation } from "react-i18next";

interface PassagePanelProps {
  passageContent: string;
}

export function PassagePanel({ passageContent }: PassagePanelProps) {
  const { t } = useTranslation("submissions");
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 bg-muted/50 text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          <BookOpen className="size-4" />
          {t("passage.title")}
        </span>
        {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>

      <div
        className={cn(
          "transition-all duration-200 overflow-hidden",
          isExpanded ? "max-h-[60vh]" : "max-h-0",
        )}
      >
        <div className="p-4 overflow-y-auto max-h-[60vh] text-sm leading-relaxed whitespace-pre-wrap">
          {passageContent}
        </div>
      </div>
    </div>
  );
}
