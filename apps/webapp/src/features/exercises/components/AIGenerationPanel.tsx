import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Sparkles, X, Plus, Loader2, Check, AlertTriangle, RefreshCw } from "lucide-react";
import type { QuestionSection, DifficultyLevel } from "@workspace/types";
import { useAIGeneration } from "../hooks/use-ai-generation";
import { formatCurrency } from "@/lib/locale-utils";

const READING_QUESTION_TYPES: Record<string, string> = {
  R1_MCQ_SINGLE: "MCQ Single",
  R2_MCQ_MULTI: "MCQ Multi",
  R3_TFNG: "TFNG",
  R4_YNNG: "YNNG",
  R5_SENTENCE_COMPLETION: "Sentence Completion",
  R6_SHORT_ANSWER: "Short Answer",
  R7_SUMMARY_WORD_BANK: "Summary (Word Bank)",
  R8_SUMMARY_PASSAGE: "Summary (Passage)",
  R9_MATCHING_HEADINGS: "Matching Headings",
  R10_MATCHING_INFORMATION: "Matching Info",
  R11_MATCHING_FEATURES: "Matching Features",
  R12_MATCHING_SENTENCE_ENDINGS: "Matching Endings",
  R13_NOTE_TABLE_FLOWCHART: "Note/Table/Flowchart",
  R14_DIAGRAM_LABELLING: "Diagram Label",
};

interface AIGenerationPanelProps {
  exerciseId: string;
  hasPassage: boolean;
  existingSections: QuestionSection[];
  onGenerationComplete: () => void;
}

interface SelectedType {
  type: string;
  count: number;
}

export function AIGenerationPanel({
  exerciseId,
  hasPassage,
  existingSections,
  onGenerationComplete,
}: AIGenerationPanelProps) {
  const { t } = useTranslation("exercises");
  const [selectedTypes, setSelectedTypes] = useState<SelectedType[]>([]);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const {
    jobStatus,
    isGenerating,
    generate,
    isGenerateLoading,
  } = useAIGeneration(exerciseId);

  const usedTypes = new Set(selectedTypes.map((t) => t.type));
  const availableTypes = Object.keys(READING_QUESTION_TYPES).filter(
    (t) => !usedTypes.has(t),
  );

  const addType = (type: string) => {
    setSelectedTypes([...selectedTypes, { type, count: 5 }]);
    setShowTypeSelector(false);
  };

  const removeType = (type: string) => {
    setSelectedTypes(selectedTypes.filter((t) => t.type !== type));
  };

  const updateCount = (type: string, count: number) => {
    setSelectedTypes(
      selectedTypes.map((t) =>
        t.type === type ? { ...t, count: Math.max(1, Math.min(20, count)) } : t,
      ),
    );
  };

  const estimatedCost = selectedTypes.length * 0.002;

  const handleGenerate = async () => {
    if (existingSections.length > 0) {
      setShowWarning(true);
      return;
    }
    await triggerGeneration();
  };

  const triggerGeneration = async () => {
    setShowWarning(false);
    try {
      await generate({
        questionTypes: selectedTypes.map((t) => ({
          type: t.type as Parameters<typeof generate>[0]["questionTypes"][0]["type"],
          count: t.count,
        })),
        difficulty,
      });
    } catch {
      // Error handled by mutation state
    }
  };

  const isCompleted = jobStatus?.status === "completed";
  const isFailed = jobStatus?.status === "failed";
  const prevCompletedRef = useRef(false);

  // Auto-trigger reload when generation completes
  useEffect(() => {
    if (isCompleted && !prevCompletedRef.current && selectedTypes.length > 0) {
      prevCompletedRef.current = true;
      onGenerationComplete();
      setSelectedTypes([]);
    }
    if (!isCompleted) {
      prevCompletedRef.current = false;
    }
  }, [isCompleted, selectedTypes.length, onGenerationComplete]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <CardTitle className="text-base">{t("aiGeneration.title")}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {!hasPassage && (
          <p className="text-sm text-muted-foreground">
            {t("aiGeneration.noPassage")}
          </p>
        )}

        {hasPassage && !isGenerating && (
          <>
            {/* Question type selector */}
            <div className="space-y-2">
              {selectedTypes.map((st) => (
                <div key={st.type} className="flex items-center gap-3">
                  <Badge variant="outline" className="min-w-[140px] justify-center">
                    {READING_QUESTION_TYPES[st.type]}
                  </Badge>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={st.count}
                    onChange={(e) =>
                      updateCount(st.type, parseInt(e.target.value) || 1)
                    }
                    className="w-20"
                  />
                  {st.type === "R14_DIAGRAM_LABELLING" && (
                    <span className="text-xs text-amber-600">
                      {t("aiGeneration.requiresDiagram")}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeType(st.type)}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {availableTypes.length > 0 && (
                <Popover
                  open={showTypeSelector}
                  onOpenChange={setShowTypeSelector}
                >
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="mr-1 h-4 w-4" />
                      {t("aiGeneration.addType")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder={t("aiGeneration.searchPlaceholder")} />
                      <CommandEmpty>{t("aiGeneration.noTypes")}</CommandEmpty>
                      <CommandList>
                        {availableTypes.map((type) => (
                          <CommandItem
                            key={type}
                            onSelect={() => addType(type)}
                          >
                            {READING_QUESTION_TYPES[type]}
                          </CommandItem>
                        ))}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Difficulty selector */}
            {selectedTypes.length > 0 && (
              <div className="mt-4 flex items-center gap-3">
                <span className="text-sm">{t("aiGeneration.difficulty")}</span>
                <Select
                  value={difficulty}
                  onValueChange={(v) =>
                    setDifficulty(v as DifficultyLevel)
                  }
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">{t("aiGeneration.easy")}</SelectItem>
                    <SelectItem value="medium">{t("aiGeneration.medium")}</SelectItem>
                    <SelectItem value="hard">{t("aiGeneration.hard")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Cost estimate + Generate button */}
            {selectedTypes.length > 0 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {t("aiGeneration.costLabel", {
                    cost: formatCurrency(estimatedCost, "USD"),
                  })}{" "}
                  ({selectedTypes.length}{" "}
                  {selectedTypes.length > 1
                    ? t("aiGeneration.typePlural")
                    : t("aiGeneration.typeSingular")})
                </p>
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerateLoading}
                >
                  {isGenerateLoading ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-1 h-4 w-4" />
                      Generate Questions
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Progress state */}
        {isGenerating && (
          <div className="flex items-center gap-3 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="text-sm font-medium">Generating questions...</p>
              <p className="text-xs text-muted-foreground">
                Status: {jobStatus?.status}
              </p>
            </div>
          </div>
        )}

        {/* Completion state */}
        {isCompleted && selectedTypes.length === 0 && (
          <div className="flex items-center gap-2 py-2">
            <Check className="h-4 w-4 text-green-600" />
            <p className="text-sm text-green-600">
              Questions generated successfully
            </p>
          </div>
        )}

        {/* Error state */}
        {isFailed && (
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">
                Generation failed: {jobStatus?.error || "Unknown error"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerate()}
            >
              <RefreshCw className="mr-1 h-4 w-4" />
              Retry
            </Button>
          </div>
        )}

        {/* Warning dialog for existing sections */}
        <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Existing Questions Found</AlertDialogTitle>
              <AlertDialogDescription>
                This exercise already has {existingSections.length} question
                section{existingSections.length > 1 ? "s" : ""}. AI-generated
                sections will be added alongside existing ones. Continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={triggerGeneration}>
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
