import { ChevronLeft, ChevronRight, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { useTranslation } from "react-i18next";

interface QuestionStepperProps {
  currentIndex: number;
  totalQuestions: number;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  isLocked?: boolean;
}

export function QuestionStepper({
  currentIndex,
  totalQuestions,
  onPrevious,
  onNext,
  onSubmit,
  isLocked,
}: QuestionStepperProps) {
  const { t } = useTranslation("submissions");
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalQuestions - 1;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background">
      <div className="flex items-center justify-between gap-2 px-4 py-3 max-w-3xl mx-auto">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={isFirst}
          className="min-h-[44px] gap-1"
          aria-label={t("stepper.previous")}
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">{t("stepper.previous")}</span>
        </Button>

        <span className="text-sm text-muted-foreground tabular-nums">
          {currentIndex + 1} / {totalQuestions}
        </span>

        {isLocked ? (
          <Badge variant="secondary" className="min-h-[44px] gap-1.5 px-4 text-sm" data-testid="submitted-badge">
            <CheckCircle2 className="size-4 text-green-600" />
            {t("stepper.submitted")}
          </Badge>
        ) : isLast ? (
          <Button
            onClick={onSubmit}
            className="min-h-[44px] gap-1"
          >
            <Send className="size-4" />
            {t("stepper.submit")}
          </Button>
        ) : (
          <Button
            onClick={onNext}
            className="min-h-[44px] gap-1"
            aria-label={t("stepper.next")}
          >
            <span className="hidden sm:inline">{t("stepper.next")}</span>
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
