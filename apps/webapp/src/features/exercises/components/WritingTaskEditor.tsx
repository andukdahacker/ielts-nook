import { useRef, useCallback } from "react";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import { Textarea } from "@workspace/ui/components/textarea";
import { Upload, Trash2, ChevronDown, BookOpen } from "lucide-react";
import { toast } from "sonner";
import {
  useStimulusUpload,
  useStimulusDelete,
} from "../hooks/use-stimulus-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { WritingRubricDisplay } from "./WritingRubricDisplay";
import type { IeltsQuestionType } from "@workspace/types";

const WRITING_TASK_TYPES: { value: IeltsQuestionType; label: string }[] = [
  { value: "W1_TASK1_ACADEMIC", label: "Task 1 - Academic" },
  { value: "W2_TASK1_GENERAL", label: "Task 1 - General Training" },
  { value: "W3_TASK2_ESSAY", label: "Task 2 - Essay" },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ".png,.jpg,.jpeg,.svg";
const ACCEPTED_MIMETYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/svg+xml",
];

interface WritingTaskEditorProps {
  exerciseId: string;
  sectionType: IeltsQuestionType | null;
  stimulusImageUrl: string | null | undefined;
  writingPrompt: string;
  letterTone: string;
  wordCountMin: number | null;
  wordCountMax: number | null;
  wordCountMode: string;
  sampleResponse: string;
  showSampleAfterGrading: boolean;
  onWritingPromptChange: (value: string) => void;
  onLetterToneChange: (value: string) => void;
  onWordCountMinChange: (value: number | null) => void;
  onWordCountMaxChange: (value: number | null) => void;
  onWordCountModeChange: (value: string) => void;
  onSampleResponseChange: (value: string) => void;
  onShowSampleAfterGradingChange: (value: boolean) => void;
  onSectionTypeChange?: (value: IeltsQuestionType) => void;
}

function getTaskType(
  sectionType: IeltsQuestionType | null,
): "W1" | "W2" | "W3" {
  if (sectionType === "W2_TASK1_GENERAL") return "W2";
  if (sectionType === "W3_TASK2_ESSAY") return "W3";
  return "W1";
}

export function WritingTaskEditor({
  exerciseId,
  sectionType,
  stimulusImageUrl,
  writingPrompt,
  letterTone,
  wordCountMin,
  wordCountMax,
  wordCountMode,
  sampleResponse,
  showSampleAfterGrading,
  onWritingPromptChange,
  onLetterToneChange,
  onWordCountMinChange,
  onWordCountMaxChange,
  onWordCountModeChange,
  onSampleResponseChange,
  onShowSampleAfterGradingChange,
  onSectionTypeChange,
}: WritingTaskEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useStimulusUpload();
  const deleteMutation = useStimulusDelete();
  const taskType = getTaskType(sectionType);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error("File too large. Maximum size is 5MB.");
        return;
      }

      if (!ACCEPTED_MIMETYPES.includes(file.type)) {
        toast.error("Invalid file type. Only PNG, JPG, and SVG are allowed.");
        return;
      }

      try {
        await uploadMutation.mutateAsync({ exerciseId, file });
        toast.success("Stimulus image uploaded successfully");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to upload stimulus image",
        );
      }
    },
    [exerciseId, uploadMutation],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
      e.target.value = "";
    },
    [handleFileSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDeleteStimulus = useCallback(async () => {
    try {
      await deleteMutation.mutateAsync({ exerciseId });
      toast.success("Stimulus image removed");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to remove stimulus image",
      );
    }
  }, [exerciseId, deleteMutation]);

  const isUploading = uploadMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Writing Task Settings
      </h3>

      {/* Task Type Selector */}
      {onSectionTypeChange && (
        <div className="space-y-2">
          <Label>Task Type</Label>
          <Select
            value={sectionType ?? "W1_TASK1_ACADEMIC"}
            onValueChange={(v) => onSectionTypeChange(v as IeltsQuestionType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WRITING_TASK_TYPES.map((qt) => (
                <SelectItem key={qt.value} value={qt.value}>
                  {qt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Writing Prompt */}
      <div className="space-y-2">
        <Label htmlFor="writing-prompt">Writing Prompt</Label>
        <Textarea
          id="writing-prompt"
          value={writingPrompt}
          onChange={(e) => onWritingPromptChange(e.target.value)}
          placeholder={
            taskType === "W1"
              ? "Summarise the information by selecting and reporting the main features, and make comparisons where relevant..."
              : taskType === "W2"
                ? "Write a letter to... You should: explain..., describe..., suggest..."
                : "Write about the following topic: ..."
          }
          className="min-h-[120px]"
        />
      </div>

      {/* W1: Stimulus Image Upload */}
      {taskType === "W1" && (
        <div className="space-y-2">
          <Label>Stimulus Image (Chart/Graph/Table/Map/Process)</Label>

          {stimulusImageUrl ? (
            <div className="space-y-3">
              <div className="rounded-md border p-2">
                <img
                  src={stimulusImageUrl}
                  alt="Stimulus"
                  className="max-h-64 w-auto mx-auto"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDeleteStimulus}
                disabled={isDeleting}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? "Removing..." : "Remove Image"}
              </Button>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center transition-colors hover:border-muted-foreground/50"
              role="button"
              tabIndex={0}
              aria-label="Upload stimulus image"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  fileInputRef.current?.click();
                }
              }}
            >
              {isUploading ? (
                <>
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/25 border-t-primary" />
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drag image here or click to upload
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, SVG — Max 5MB
                  </p>
                </>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      )}

      {/* W2: Letter Tone Selector */}
      {taskType === "W2" && (
        <div className="space-y-2">
          <Label>Letter Tone</Label>
          <RadioGroup
            value={letterTone}
            onValueChange={onLetterToneChange}
            className="flex gap-4"
          >
            {(["formal", "informal", "semi-formal"] as const).map((tone) => (
              <div key={tone} className="flex items-center space-x-2">
                <RadioGroupItem value={tone} id={`tone-${tone}`} />
                <Label htmlFor={`tone-${tone}`} className="cursor-pointer capitalize">
                  {tone}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      )}

      {/* Word Count Settings */}
      <div className="space-y-3">
        <Label>Word Count Guidance</Label>
        <div className="flex items-center gap-4">
          <div className="space-y-1">
            <Label htmlFor="word-count-min" className="text-xs text-muted-foreground">
              Minimum
            </Label>
            <Input
              id="word-count-min"
              type="number"
              value={wordCountMin ?? ""}
              onChange={(e) =>
                onWordCountMinChange(
                  e.target.value ? parseInt(e.target.value, 10) : null,
                )
              }
              placeholder={taskType === "W3" ? "250" : "150"}
              className="w-24"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="word-count-max" className="text-xs text-muted-foreground">
              Maximum (optional)
            </Label>
            <Input
              id="word-count-max"
              type="number"
              value={wordCountMax ?? ""}
              onChange={(e) =>
                onWordCountMaxChange(
                  e.target.value ? parseInt(e.target.value, 10) : null,
                )
              }
              placeholder="No limit"
              className="w-24"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Enforcement</Label>
            <RadioGroup
              value={wordCountMode}
              onValueChange={onWordCountModeChange}
              className="flex gap-3"
            >
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="soft" id="wc-soft" />
                <Label htmlFor="wc-soft" className="cursor-pointer text-sm">
                  Soft warning
                </Label>
              </div>
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="hard" id="wc-hard" />
                <Label htmlFor="wc-hard" className="cursor-pointer text-sm">
                  Hard limit
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </div>

      {/* Sample Response */}
      <div className="space-y-2">
        <Label htmlFor="sample-response">Sample Response (Model Answer)</Label>
        <Textarea
          id="sample-response"
          value={sampleResponse}
          onChange={(e) => onSampleResponseChange(e.target.value)}
          placeholder="Enter a model answer for teacher reference..."
          className="min-h-[100px]"
        />
        <div className="flex items-start gap-3 mt-2">
          <Checkbox
            id="show-sample-after-grading"
            checked={showSampleAfterGrading}
            onCheckedChange={(checked) =>
              onShowSampleAfterGradingChange(checked === true)
            }
          />
          <div className="space-y-1">
            <Label
              htmlFor="show-sample-after-grading"
              className="text-sm font-medium cursor-pointer"
            >
              Reveal to student after grading
            </Label>
            <p className="text-xs text-muted-foreground">
              Show this model answer to the student after their submission has
              been graded.
            </p>
          </div>
        </div>
      </div>

      {/* Rubric Reference (collapsible) */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
          <BookOpen className="size-4" />
          IELTS Band Descriptors
          <ChevronDown className="size-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <WritingRubricDisplay taskType={taskType} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
