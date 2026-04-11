import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Mic, Square, RotateCcw } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface SpeakingInputProps {
  questionText: string;
  questionIndex: number;
  speakingPrepTime?: number | null;
  speakingTime?: number | null;
  cueCard?: { topic: string; bulletPoints: string[] } | null;
  value: { audioUrl?: string; duration?: number } | null;
  onChange: (answer: unknown) => void;
  readOnly?: boolean;
}

export function SpeakingInput({
  questionText,
  questionIndex,
  speakingPrepTime,
  speakingTime,
  cueCard,
  value,
  onChange,
  readOnly,
}: SpeakingInputProps) {
  const { t } = useTranslation("submissions");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(
    (value as { audioUrl?: string })?.audioUrl ?? null,
  );
  const [prepCountdown, setPrepCountdown] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const prepTimerRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (prepTimerRef.current) {
      clearInterval(prepTimerRef.current);
      prepTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
        // Note: actual upload to Firebase happens on submission, not here
        onChange({ audioUrl: url, duration: recordingTime });
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => {
          const next = prev + 1;
          if (speakingTime && next >= speakingTime) {
            stopRecording();
          }
          return next;
        });
      }, 1000);
    } catch {
      toast.error(t("speaking.microphoneError"));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    cleanup();
  };

  const startWithPrep = () => {
    if (speakingPrepTime && speakingPrepTime > 0) {
      setPrepCountdown(speakingPrepTime);
      prepTimerRef.current = window.setInterval(() => {
        setPrepCountdown((prev) => {
          if (prev === null || prev <= 1) {
            if (prepTimerRef.current) clearInterval(prepTimerRef.current);
            setPrepCountdown(null);
            startRecording();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      startRecording();
    }
  };

  const resetRecording = () => {
    if (audioUrl && audioBlob) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    onChange({});
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-3">
      <p className="text-sm">
        <span className="font-medium">{questionIndex + 1}.</span> {questionText}
      </p>

      {cueCard && (
        <div className="rounded-md border border-dashed p-4 space-y-2">
          {cueCard.topic && <p className="text-sm font-semibold">{cueCard.topic}</p>}
          {cueCard.bulletPoints?.length > 0 && (
            <ul className="list-disc pl-6 space-y-1">
              {cueCard.bulletPoints.map((point, i) => (
                <li key={i} className="text-sm">{point}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {prepCountdown !== null && (
        <div className="text-center p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">{t("speaking.preparationTime")}</p>
          <p className="text-3xl font-bold">{formatTime(prepCountdown)}</p>
        </div>
      )}

      {prepCountdown === null && (
        <div className="flex flex-col items-center gap-3 p-4 border rounded-lg">
          {isRecording && !readOnly && (
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium">{formatTime(recordingTime)}</span>
              {speakingTime && (
                <span className="text-xs text-muted-foreground">/ {formatTime(speakingTime)}</span>
              )}
            </div>
          )}

          {!isRecording && !audioUrl && !readOnly && (
            <Button
              onClick={startWithPrep}
              className="min-h-[44px] gap-2"
            >
              <Mic className="size-4" />
              {t("speaking.startRecording")}
            </Button>
          )}

          {!isRecording && !audioUrl && readOnly && (
            <p className="text-sm text-muted-foreground italic">{t("speaking.noRecording")}</p>
          )}

          {isRecording && !readOnly && (
            <Button
              variant="destructive"
              onClick={stopRecording}
              className="min-h-[44px] gap-2"
            >
              <Square className="size-4" />
              {t("speaking.stopRecording")}
            </Button>
          )}

          {audioUrl && !isRecording && (
            <div className="flex flex-col items-center gap-2 w-full">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption -- Student-recorded speech has no captions */}
              <audio src={audioUrl} controls className="w-full max-w-xs" />
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">
                  {formatTime(recordingTime)}
                </Badge>
                {!readOnly && (
                  <Button variant="outline" size="sm" onClick={resetRecording} className="gap-1">
                    <RotateCcw className="size-3" />
                    {t("speaking.reRecord")}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
