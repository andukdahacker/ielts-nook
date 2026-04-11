import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import { ChevronDown, History } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";

interface HistoryItem {
  id: string;
  submittedAt: string | null;
  score: number | null;
  status: string;
}

interface SubmissionHistoryPanelProps {
  history: HistoryItem[];
  currentSubmissionId: string;
}

export function SubmissionHistoryPanel({
  history,
  currentSubmissionId,
}: SubmissionHistoryPanelProps) {
  const { t } = useTranslation("grading");
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { centerId } = useParams();

  // Only show if there's more than 1 entry
  if (history.length <= 1) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-muted/30 px-4 py-3 text-left text-sm font-medium hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4" />
          <span>{t("submissionHistory.title", { count: history.length })}</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <div className="space-y-1.5">
          {history.map((item) => {
            const isCurrent = item.id === currentSubmissionId;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (!isCurrent && centerId) {
                    navigate(`/${centerId}/dashboard/feedback/${item.id}`);
                  }
                }}
                disabled={isCurrent}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                  isCurrent
                    ? "bg-primary/10 border border-primary/20 font-medium"
                    : "hover:bg-muted/50 cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isCurrent && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                  <span>
                    {item.submittedAt
                      ? new Date(item.submittedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : t("submissionHistory.unknownDate")}
                  </span>
                </div>
                <span className="font-semibold tabular-nums">
                  {item.score != null ? item.score : "—"}
                </span>
              </button>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
