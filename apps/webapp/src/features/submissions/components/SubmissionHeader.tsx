import { ArrowLeft, Clock, LoaderCircle, Check, CircleAlert, CloudOff, CloudUpload, CheckCircle2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { useNavigate, useParams } from "react-router";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { SaveStatus } from "../hooks/use-auto-save";

interface SubmissionHeaderProps {
  title: string;
  skill?: string;
  currentQuestion: number;
  totalQuestions: number;
  timeLimit?: number | null;
  startedAt?: string;
  autoSubmitOnExpiry?: boolean;
  onTimerExpired?: () => void;
  saveStatus?: SaveStatus;
  isLocked?: boolean;
  submissionStatus?: string | null;
}

function formatTimer(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const SAVE_INDICATOR_CONFIG: Record<
  Exclude<SaveStatus, "idle">,
  { icon: React.ReactNode; textKey: string; className: string }
> = {
  saving: {
    icon: <LoaderCircle className="size-3.5 animate-spin" />,
    textKey: "saveIndicator.saving",
    className: "text-muted-foreground",
  },
  saved: {
    icon: <Check className="size-3.5" />,
    textKey: "saveIndicator.saved",
    className: "text-green-600",
  },
  error: {
    icon: <CircleAlert className="size-3.5" />,
    textKey: "saveIndicator.error",
    className: "text-destructive",
  },
  offline: {
    icon: <CloudOff className="size-3.5 text-amber-500" />,
    textKey: "saveIndicator.offline",
    className: "text-amber-500",
  },
  syncing: {
    icon: <CloudUpload className="size-3.5 text-blue-600 animate-pulse" />,
    textKey: "saveIndicator.syncing",
    className: "text-blue-600",
  },
};

function SaveIndicator({ saveStatus }: { saveStatus?: SaveStatus }) {
  const { t } = useTranslation("submissions");
  const [displayStatus, setDisplayStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!saveStatus) {
      setDisplayStatus("idle");
      return;
    }

    setDisplayStatus(saveStatus);

    if (saveStatus === "saved") {
      timerRef.current = window.setTimeout(() => {
        setDisplayStatus("idle");
        timerRef.current = null;
      }, 2000);
    }

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [saveStatus]);

  if (displayStatus === "idle") return null;

  const config = SAVE_INDICATOR_CONFIG[displayStatus];

  return (
    <div className={`flex items-center gap-1 shrink-0 ${config.className}`} data-testid="save-indicator">
      {config.icon}
      <span className="hidden sm:inline text-xs">{t(config.textKey)}</span>
    </div>
  );
}

function useStatusLabel() {
  const { t } = useTranslation("submissions");
  return (status: string | null | undefined): string => {
    switch (status) {
      case "SUBMITTED": return t("header.statusSubmitted");
      case "AI_PROCESSING": return t("header.statusGrading");
      case "GRADED": return t("header.statusGraded");
      default: return status ?? t("header.statusSubmitted");
    }
  };
}

export function SubmissionHeader({
  title,
  currentQuestion,
  totalQuestions,
  timeLimit,
  startedAt,
  autoSubmitOnExpiry,
  onTimerExpired,
  saveStatus,
  isLocked,
  submissionStatus,
}: SubmissionHeaderProps) {
  const { t } = useTranslation("submissions");
  const getStatusLabel = useStatusLabel();
  const navigate = useNavigate();
  const { centerId } = useParams();
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();

    const tick = () => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    };
    tick();
    intervalRef.current = window.setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startedAt]);

  const remaining = timeLimit ? Math.max(0, timeLimit - elapsed) : null;
  const isLowTime = remaining !== null && remaining < 300; // < 5 min
  const expiredRef = useRef(false);

  useEffect(() => {
    if (remaining === 0 && autoSubmitOnExpiry && onTimerExpired && !expiredRef.current && !isLocked) {
      expiredRef.current = true;
      onTimerExpired();
    }
  }, [remaining, autoSubmitOnExpiry, onTimerExpired, isLocked]);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-3 px-4">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => navigate(`/${centerId}/dashboard`)}
        >
          <ArrowLeft className="size-5" />
        </Button>

        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-medium truncate">{title}</h1>
          <p className="text-xs text-muted-foreground">
            {t("header.question", { currentQuestion: currentQuestion + 1, totalQuestions })}
          </p>
        </div>

        {isLocked ? (
          <Badge variant="secondary" className="gap-1.5 shrink-0" data-testid="status-badge">
            <CheckCircle2 className="size-3.5 text-green-600" />
            {getStatusLabel(submissionStatus)}
          </Badge>
        ) : (
          <>
            <SaveIndicator saveStatus={saveStatus} />

            {remaining !== null && (
              <div
                className={`flex items-center gap-1 text-sm font-mono tabular-nums ${
                  isLowTime ? "text-destructive font-semibold" : "text-muted-foreground"
                }`}
              >
                <Clock className="size-4" />
                {formatTimer(remaining)}
              </div>
            )}
          </>
        )}
      </div>
    </header>
  );
}
