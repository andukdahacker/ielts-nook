import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import { Pencil } from "lucide-react";
import { forwardRef, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

interface CriteriaScores {
  taskAchievement?: number;
  coherence?: number;
  lexicalResource?: number;
  grammaticalRange?: number;
  fluency?: number;
  pronunciation?: number;
}

const WRITING_CRITERIA: { key: keyof CriteriaScores; labelKey: string }[] = [
  { key: "taskAchievement", labelKey: "bandScore.taskAchievement" },
  { key: "coherence", labelKey: "bandScore.coherence" },
  { key: "lexicalResource", labelKey: "bandScore.lexicalResource" },
  { key: "grammaticalRange", labelKey: "bandScore.grammaticalRange" },
];

const SPEAKING_CRITERIA: { key: keyof CriteriaScores; labelKey: string }[] = [
  { key: "fluency", labelKey: "bandScore.fluency" },
  { key: "lexicalResource", labelKey: "bandScore.lexicalResource" },
  { key: "grammaticalRange", labelKey: "bandScore.grammaticalRange" },
  { key: "pronunciation", labelKey: "bandScore.pronunciation" },
];

interface BandScoreCardProps {
  overallScore: number | null;
  criteriaScores: CriteriaScores | null;
  skill: "WRITING" | "SPEAKING";
  teacherFinalScore?: number | null;
  teacherCriteriaScores?: CriteriaScores | null;
  onScoreChange?: (field: "overall" | keyof CriteriaScores, value: number | null) => void;
  isFinalized?: boolean;
}

function EditableScore({
  value,
  aiValue,
  isFinalized,
  onSave,
  className = "",
}: {
  value: number | null | undefined;
  aiValue: number | null | undefined;
  isFinalized?: boolean;
  onSave: (v: number | null) => void;
  className?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const displayValue = value ?? aiValue;
  const isOverridden = value != null && value !== aiValue;

  const handleActivate = useCallback(() => {
    if (isFinalized) return;
    setEditValue(displayValue != null ? String(displayValue) : "");
    setIsEditing(true);
  }, [isFinalized, displayValue]);

  const handleSave = useCallback(() => {
    const num = parseFloat(editValue);
    if (isNaN(num) || num < 0 || num > 9) {
      setIsEditing(false);
      return;
    }
    // Round to nearest 0.5
    const rounded = Math.round(num * 2) / 2;
    onSave(rounded === aiValue ? null : rounded);
    setIsEditing(false);
  }, [editValue, aiValue, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        setIsEditing(false);
      }
    },
    [handleSave],
  );

  if (isEditing) {
    return (
      <Input
        type="number"
        step={0.5}
        min={0}
        max={9}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        className={`w-16 h-8 text-center text-sm ${className}`}
      />
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span
        className={`${className} ${isOverridden ? "text-primary font-bold" : ""} ${!isFinalized ? "cursor-pointer" : ""}`}
        tabIndex={isFinalized ? undefined : 0}
        role={isFinalized ? undefined : "button"}
        onClick={handleActivate}
        onKeyDown={(e) => { if (e.key === "Enter") handleActivate(); }}
      >
        {displayValue != null ? displayValue : "—"}
      </span>
      {isOverridden && <Pencil className="h-3 w-3 text-primary" />}
    </div>
  );
}

export const BandScoreCard = forwardRef<HTMLDivElement, BandScoreCardProps>(
  function BandScoreCard(
    {
      overallScore,
      criteriaScores,
      skill,
      teacherFinalScore,
      teacherCriteriaScores,
      onScoreChange,
      isFinalized = false,
    },
    ref,
  ) {
    const { t } = useTranslation("grading");
    const criteria = skill === "WRITING" ? WRITING_CRITERIA : SPEAKING_CRITERIA;

    const handleOverallChange = useCallback(
      (v: number | null) => onScoreChange?.("overall", v),
      [onScoreChange],
    );

    return (
      <Card ref={ref}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {t("bandScore.title")}
            {isFinalized && (
              <Badge variant="secondary" className="ml-2 text-xs">{t("bandScore.graded")}</Badge>
            )}
          </span>
          <div className="flex flex-col items-end">
            {onScoreChange ? (
              <EditableScore
                value={teacherFinalScore}
                aiValue={overallScore}
                isFinalized={isFinalized}
                onSave={handleOverallChange}
                className="text-3xl font-bold text-primary"
              />
            ) : (
              <span className="text-3xl font-bold text-primary">
                {overallScore ?? "—"}
              </span>
            )}
            {teacherFinalScore != null && overallScore != null && teacherFinalScore !== overallScore && (
              <span className="text-xs text-muted-foreground">{t("bandScore.aiScore")} {overallScore}</span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {criteria.map(({ key, labelKey }) => {
            const aiScore = criteriaScores?.[key];
            const teacherScore = teacherCriteriaScores?.[key];
            return (
              <div
                key={key}
                className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
              >
                <span className="text-xs text-muted-foreground">{t(labelKey)}</span>
                {onScoreChange ? (
                  <EditableScore
                    value={teacherScore}
                    aiValue={aiScore}
                    isFinalized={isFinalized}
                    onSave={(v) => onScoreChange(key, v)}
                    className="text-sm font-semibold"
                  />
                ) : (
                  <span className="text-sm font-semibold">
                    {aiScore != null ? aiScore : "—"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
    );
  },
);
