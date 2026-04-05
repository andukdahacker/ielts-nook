import { Button } from "@workspace/ui/components/button";
import { Camera, X, RotateCcw } from "lucide-react";
import { useState, useRef } from "react";

interface PhotoCaptureInputProps {
  questionIndex: number;
  value: { photoUrl?: string } | null;
  onChange: (answer: unknown) => void;
  onPhotoCapture?: (file: File) => void;
  readOnly?: boolean;
}

export function PhotoCaptureInput({
  questionIndex,
  value,
  onChange,
  onPhotoCapture,
  readOnly,
}: PhotoCaptureInputProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    (value as { photoUrl?: string })?.photoUrl ?? null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onChange({ photoUrl: url });
    onPhotoCapture?.(file);
  };

  const clearPhoto = () => {
    if (previewUrl && !previewUrl.startsWith("https://")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    onChange({});
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm">
        <span className="font-medium">{questionIndex + 1}.</span> Upload a photo of your handwritten answer
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {!previewUrl && !readOnly && (
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="min-h-[44px] gap-2 w-full"
        >
          <Camera className="size-4" />
          Take Photo or Choose File
        </Button>
      )}

      {!previewUrl && readOnly && (
        <p className="text-sm text-muted-foreground italic">No photo submitted.</p>
      )}

      {previewUrl && (
        <div className="relative">
          <img
            src={previewUrl}
            alt="Captured answer"
            className="max-w-full h-auto rounded-lg border max-h-[300px] object-contain"
          />
          {!readOnly && (
            <div className="mt-2 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-1"
              >
                <RotateCcw className="size-3" />
                Retake
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearPhoto}
                className="gap-1 text-destructive"
              >
                <X className="size-3" />
                Remove
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
