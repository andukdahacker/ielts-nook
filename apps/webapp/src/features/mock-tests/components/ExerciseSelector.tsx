import { useAuth } from "@/features/auth/auth-context";
import { useExercises } from "@/features/exercises/hooks/use-exercises";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Loader2, Plus, Search } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface ExerciseSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skill: string;
  existingExerciseIds: string[];
  onAdd: (exerciseId: string) => Promise<void>;
}

export function ExerciseSelector({
  open,
  onOpenChange,
  skill,
  existingExerciseIds,
  onAdd,
}: ExerciseSelectorProps) {
  const { t } = useTranslation("mock-tests");
  const { user } = useAuth();
  const centerId = user?.centerId || undefined;
  const [search, setSearch] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);

  const { exercises, isLoading } = useExercises(centerId, {
    skill: skill as "READING" | "LISTENING" | "WRITING" | "SPEAKING",
    status: "PUBLISHED",
  });

  const filtered = exercises.filter((ex) =>
    ex.title.toLowerCase().includes(search.toLowerCase()),
  );

  const getQuestionCount = (exercise: (typeof exercises)[0]) => {
    if (!exercise.sections) return 0;
    return exercise.sections.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sum: number, s: any) => sum + (s._count?.questions ?? s.questions?.length ?? 0),
      0,
    );
  };

  const handleAdd = async (exerciseId: string) => {
    setAddingId(exerciseId);
    try {
      await onAdd(exerciseId);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("exerciseSelector.title", { skill })}
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("exerciseSelector.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("exerciseSelector.noExercises", {
                skill: skill.toLowerCase(),
              })}
            </div>
          ) : (
            <div className="space-y-2 pr-4">
              {filtered.map((ex) => {
                const isAdded = existingExerciseIds.includes(ex.id);
                return (
                  <div
                    key={ex.id}
                    className={`flex items-center justify-between rounded-md border p-3 ${
                      isAdded ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{ex.title}</div>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {t("exerciseSelector.questionCount", {
                            count: getQuestionCount(ex),
                          })}
                        </Badge>
                        {ex.bandLevel && (
                          <Badge variant="secondary" className="text-xs">
                            {t("exerciseSelector.bandLevel", {
                              level: ex.bandLevel,
                            })}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={isAdded ? "ghost" : "default"}
                      disabled={isAdded || addingId === ex.id}
                      onClick={() => handleAdd(ex.id)}
                    >
                      {addingId === ex.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isAdded ? (
                        t("exerciseSelector.addedButton")
                      ) : (
                        <>
                          <Plus className="mr-1 h-3 w-3" />
                          {t("exerciseSelector.addButton")}
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
