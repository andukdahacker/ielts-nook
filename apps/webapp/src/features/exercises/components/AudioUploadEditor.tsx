import { useRef, useCallback } from "react";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Upload, Trash2, FileAudio } from "lucide-react";
import { toast } from "sonner";
import { useAudioUpload, useAudioDelete } from "../hooks/use-audio-upload";
import { useTranslation } from "react-i18next";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ACCEPTED_TYPES = ".mp3,.wav,.m4a";
const ACCEPTED_MIMETYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/mp4",
  "audio/x-m4a",
];

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

interface AudioUploadEditorProps {
  exerciseId: string;
  audioUrl: string | null | undefined;
  audioDuration: number | null | undefined;
  onAudioChange: () => void;
  onDurationExtracted: (duration: number) => void;
}

export function AudioUploadEditor({
  exerciseId,
  audioUrl,
  audioDuration,
  onAudioChange,
  onDurationExtracted,
}: AudioUploadEditorProps) {
  const { t } = useTranslation("exercises");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useAudioUpload();
  const deleteMutation = useAudioDelete();

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(t("audioUpload.errorSize"));
        return;
      }

      if (!ACCEPTED_MIMETYPES.includes(file.type)) {
        toast.error(t("audioUpload.errorType"));
        return;
      }

      try {
        await uploadMutation.mutateAsync({ exerciseId, file });

        // Extract duration client-side
        const audio = new Audio(URL.createObjectURL(file));
        audio.addEventListener("loadedmetadata", () => {
          const duration = Math.round(audio.duration);
          URL.revokeObjectURL(audio.src);
          onDurationExtracted(duration);
        });

        onAudioChange();
        toast.success(t("audioUpload.success"));
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t("audioUpload.errorGeneral"),
        );
      }
    },
    [exerciseId, uploadMutation, onAudioChange, onDurationExtracted, t],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
      // Reset input so the same file can be re-selected
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

  const handleDelete = useCallback(async () => {
    try {
      await deleteMutation.mutateAsync({ exerciseId });
      onAudioChange();
      toast.success(t("audioUpload.removeSuccess"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("audioUpload.removeError"),
      );
    }
  }, [exerciseId, deleteMutation, onAudioChange, t]);

  const isUploading = uploadMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  return (
    <div className="space-y-2">
      <Label>{t("audioUpload.label")}</Label>

      {audioUrl ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <FileAudio className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">
              {audioUrl.split("/").pop()?.split("?")[0] ?? "audio file"}
            </span>
            {audioDuration != null && (
              <span className="text-muted-foreground">
                ({formatDuration(audioDuration)})
              </span>
            )}
          </div>

          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio controls src={audioUrl} className="w-full" preload="metadata">
            {t("audioUpload.browserNoSupport")}
          </audio>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? t("audioUpload.removing") : t("audioUpload.remove")}
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
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              fileInputRef.current?.click();
            }
          }}
        >
          {isUploading ? (
            <>
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/25 border-t-primary" />
              <p className="text-sm text-muted-foreground">{t("audioUpload.uploading")}</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t("audioUpload.dragDrop")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("audioUpload.formats")}
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
  );
}
