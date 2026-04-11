import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Upload, FileText, Loader2 } from "lucide-react";
import { useDocumentUpload } from "../hooks/use-document-upload";

interface DocumentUploadPanelProps {
  exerciseId: string;
  currentPassageContent: string | null;
  currentSourceType: string | null;
  onPassageUpdated: (text: string, sourceType: string) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function DocumentUploadPanel({
  exerciseId,
  currentSourceType,
  onPassageUpdated,
}: DocumentUploadPanelProps) {
  const { t } = useTranslation("exercises");
  const [activeTab, setActiveTab] = useState<"upload" | "paste">("upload");
  const [pasteText, setPasteText] = useState("");
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [extractedSourceType, setExtractedSourceType] = useState<string>("PDF");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useDocumentUpload();

  const handleFileSelect = async (file: File) => {
    setError(null);
    setExtractedText(null);

    if (file.size > MAX_FILE_SIZE) {
      setError(t("documentUpload.errorSize"));
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      setError(t("documentUpload.errorType"));
      return;
    }

    try {
      const result = await uploadMutation.mutateAsync({ exerciseId, file });
      setExtractedText(result.extractedText);
      setExtractedSourceType(result.passageSourceType);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to upload document",
      );
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleUseExtractedText = () => {
    if (extractedText) {
      onPassageUpdated(extractedText, extractedSourceType);
      setExtractedText(null);
    }
  };

  const handlePasteSubmit = () => {
    if (pasteText.trim()) {
      onPassageUpdated(pasteText.trim(), "TEXT_PASTE");
      setPasteText("");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t("documentUpload.title")}</CardTitle>
          {currentSourceType && (
            <Badge variant="outline">{currentSourceType}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Tab buttons */}
        <div className="mb-4 flex gap-2">
          <Button
            variant={activeTab === "upload" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("upload")}
          >
            <Upload className="mr-1 h-4 w-4" />
            {t("documentUpload.tabUpload")}
          </Button>
          <Button
            variant={activeTab === "paste" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("paste")}
          >
            <FileText className="mr-1 h-4 w-4" />
            {t("documentUpload.tabPaste")}
          </Button>
        </div>

        {/* Upload tab */}
        {activeTab === "upload" && (
          <div>
            {!extractedText && (
              <div
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors hover:border-primary"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    fileInputRef.current?.click();
                  }
                }}
                role="button"
                tabIndex={0}
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="mb-2 h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {t("documentUpload.uploading")}
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {t("documentUpload.dragDrop")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("documentUpload.maxSize")}
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
              </div>
            )}

            {/* Extracted text preview */}
            {extractedText && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {t("documentUpload.extracted")} ({extractedText.split(/\s+/).length} {t("documentUpload.extractedWords")})
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExtractedText(null)}
                    >
                      {t("button.cancel", { ns: "common" })}
                    </Button>
                    <Button size="sm" onClick={handleUseExtractedText}>
                      {t("documentUpload.useButton")}
                    </Button>
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto rounded border p-3 text-sm">
                  {extractedText}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Paste tab */}
        {activeTab === "paste" && (
          <div>
            <Textarea
              placeholder={t("documentUpload.pastePlaceholder")}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={8}
            />
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {pasteText.trim()
                  ? `${pasteText.trim().split(/\s+/).length} ${t("documentUpload.extractedWords")}`
                  : ""}
              </p>
              <Button
                size="sm"
                disabled={!pasteText.trim()}
                onClick={handlePasteSubmit}
              >
                {t("documentUpload.useButton")}
              </Button>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
