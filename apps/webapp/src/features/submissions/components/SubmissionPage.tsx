import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { onlineManager } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { IeltsQuestionType } from "@workspace/types";

import { useStartSubmission } from "../hooks/use-start-submission";
import { useSaveAnswers } from "../hooks/use-save-answers";
import { useSubmitSubmission } from "../hooks/use-submit-submission";
import { useAssignmentDetail } from "../hooks/use-assignment-detail";
import { useUploadPhoto } from "../hooks/use-upload-photo";
import { useAutoSave } from "../hooks/use-auto-save";
import {
  loadAnswersLocal,
  clearAnswersLocal,
  persistSubmitPending,
  loadSubmitPending,
  clearSubmitPending,
} from "../lib/submission-storage";

import { SubmissionHeader } from "./SubmissionHeader";
import { QuestionNumberPills } from "./QuestionNumberPills";
import { QuestionStepper } from "./QuestionStepper";
import { SubmitConfirmDialog } from "./SubmitConfirmDialog";
import { SubmissionCompletePage } from "./SubmissionCompletePage";
import { QuestionInputFactory } from "./question-inputs/QuestionInputFactory";
import { PassagePanel } from "./PassagePanel";
import { AudioPlayerPanel } from "./AudioPlayerPanel";
import { OfflineBanner } from "./OfflineBanner";

interface FlatQuestion {
  id: string;
  sectionType: IeltsQuestionType;
  questionText: string;
  options: unknown;
  wordLimit: number | null;
  sectionInstructions: string | null;
  speakingPrepTime?: number | null;
  speakingTime?: number | null;
  writingPrompt?: string | null;
}

export function SubmissionPage() {
  const { t } = useTranslation("submissions");
  const { centerId, assignmentId } = useParams();
  const navigate = useNavigate();

  // Data fetching
  const { data: assignmentData, isLoading: isLoadingAssignment, isError } = useAssignmentDetail(assignmentId);
  const startSubmission = useStartSubmission();
  const saveAnswers = useSaveAnswers();
  const submitSubmission = useSubmitSubmission();
  const uploadPhoto = useUploadPhoto();

  // State
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitPending, setIsSubmitPending] = useState(false);
  const [localAnswersRestored, setLocalAnswersRestored] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<string | null>(null);
  const prevIndexRef = useRef(currentIndex);
  const elapsedRef = useRef(0);
  const pendingPhotos = useRef<Map<string, File>>(new Map());
  const submitRetryRef = useRef(false);
  const isRecoverySubmitRef = useRef(false);
  const prevAssignmentIdRef = useRef(assignmentId);

  // Reset state when navigating to a different assignment (SPA nav without remount)
  useEffect(() => {
    if (prevAssignmentIdRef.current !== assignmentId) {
      prevAssignmentIdRef.current = assignmentId;
      setSubmissionId(null);
      setStartedAt(null);
      setCurrentIndex(0);
      setAnswers({});
      setShowConfirm(false);
      setIsSubmitted(false);
      setIsSubmitting(false);
      setIsSubmitPending(false);
      setLocalAnswersRestored(false);
      setIsLocked(false);
      setSubmissionStatus(null);
    }
  }, [assignmentId]);

  // Auto-save hook
  const { saveStatus, lastServerSaveTimestamp, isOnline } = useAutoSave({
    centerId,
    assignmentId,
    submissionId,
    answers,
    enabled: !!submissionId && !isSubmitted && !isLocked,
  });

  // Restore answers from IndexedDB after server answers are seeded
  useEffect(() => {
    if (!centerId || !assignmentId || !submissionId || isLocked) {
      if (isLocked) setLocalAnswersRestored(true);
      return;
    }
    loadAnswersLocal(centerId, assignmentId)
      .then((stored) => {
        if (stored?.answers && Object.keys(stored.answers).length > 0) {
          setAnswers((prev) => ({ ...prev, ...stored.answers }));
        }
      })
      .catch(() => {
        // IndexedDB unavailable — server answers already seeded
      })
      .finally(() => {
        setLocalAnswersRestored(true);
      });
  }, [centerId, assignmentId, submissionId, isLocked]);

  // Flatten questions from sections
  const flatQuestions = useMemo<FlatQuestion[]>(() => {
    const assignment = assignmentData?.data as Record<string, unknown> | null;
    if (!assignment) return [];

    const exercise = assignment.exercise as Record<string, unknown> | undefined;
    if (!exercise) return [];

    const sections = exercise.sections as Array<Record<string, unknown>> | undefined;
    if (!sections) return [];

    const writingPrompt = (exercise.writingPrompt as string) || null;

    const result: FlatQuestion[] = [];
    for (const section of sections) {
      const sectionType = section.sectionType as IeltsQuestionType;
      const sectionInstructions = (section.instructions as string) || null;
      const speakingPrepTime = section.speakingPrepTime as number | null | undefined;
      const speakingTime = section.speakingTime as number | null | undefined;
      const questions = section.questions as Array<Record<string, unknown>> | undefined;
      if (!questions) continue;

      for (const q of questions) {
        result.push({
          id: q.id as string,
          sectionType,
          questionText: q.questionText as string,
          options: q.options,
          wordLimit: (q.wordLimit as number) ?? null,
          sectionInstructions,
          speakingPrepTime,
          speakingTime,
          writingPrompt,
        });
      }
    }
    return result;
  }, [assignmentData]);

  const questionIds = useMemo(() => flatQuestions.map((q) => q.id), [flatQuestions]);

  const answeredSet = useMemo(() => {
    const set = new Set<string>();
    for (const [qId, val] of Object.entries(answers)) {
      if (val && typeof val === "object" && Object.keys(val as Record<string, unknown>).length > 0) {
        set.add(qId);
      }
    }
    return set;
  }, [answers]);

  // Track elapsed time
  useEffect(() => {
    const interval = window.setInterval(() => {
      elapsedRef.current += 1;
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Start submission on mount
  useEffect(() => {
    if (!assignmentId || submissionId) return;
    startSubmission.mutate(assignmentId, {
      onSuccess: (data) => {
        const sub = (data as { data: { id: string; startedAt: string; status?: string; answers?: Array<{ questionId: string; answer: unknown }> } }).data;
        setSubmissionId(sub.id);
        setStartedAt(sub.startedAt);
        if (sub.status) {
          setSubmissionStatus(sub.status);
          if (sub.status !== "IN_PROGRESS") {
            setIsLocked(true);
          }
        }
        if (sub.answers?.length) {
          setAnswers((prev) => {
            const seeded = { ...prev };
            for (const a of sub.answers!) {
              if (a.answer && !seeded[a.questionId]) {
                seeded[a.questionId] = a.answer;
              }
            }
            return seeded;
          });
        }
      },
      onError: (err) => {
        toast.error(err.message || t("toast.error"));
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  // useBeforeUnload guard
  useEffect(() => {
    if (isSubmitted || isLocked) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isSubmitted, isLocked]);

  // Save-on-navigate: save previous question's answer when index changes
  useEffect(() => {
    if (prevIndexRef.current === currentIndex) return;
    if (isLocked) { prevIndexRef.current = currentIndex; return; }
    const prevQuestion = flatQuestions[prevIndexRef.current];
    if (prevQuestion && submissionId && answers[prevQuestion.id]) {
      // Skip if auto-save just sent a server save
      if (Date.now() - lastServerSaveTimestamp.current < 1000) {
        prevIndexRef.current = currentIndex;
        return;
      }
      saveAnswers.mutate({
        submissionId,
        answers: [{ questionId: prevQuestion.id, answer: answers[prevQuestion.id] }],
      });
    }
    prevIndexRef.current = currentIndex;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  const updateAnswer = useCallback((questionId: string, answer: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  }, []);

  const handlePhotoCapture = useCallback(
    (questionId: string, file: File) => {
      pendingPhotos.current.set(questionId, file);
    },
    [],
  );

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(flatQuestions.length - 1, prev + 1));
  }, [flatQuestions.length]);

  const handleJump = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!submissionId) return;
    setIsSubmitting(true);

    try {
      // Save all current answers first
      const allAnswers = Object.entries(answers)
        .filter(([, val]) => val && typeof val === "object" && Object.keys(val as Record<string, unknown>).length > 0)
        .map(([questionId, answer]) => ({ questionId, answer }));

      if (allAnswers.length > 0) {
        await saveAnswers.mutateAsync({ submissionId, answers: allAnswers });
      }

      // Upload pending photos
      for (const [questionId, file] of pendingPhotos.current.entries()) {
        await uploadPhoto.mutateAsync({ submissionId, questionId, file });
      }
      pendingPhotos.current.clear();

      // Submit
      await submitSubmission.mutateAsync({
        submissionId,
        timeSpentSec: elapsedRef.current,
      });

      // Server confirmed — clear IndexedDB and celebrate
      if (centerId && assignmentId) {
        await clearAnswersLocal(centerId, assignmentId);
        await clearSubmitPending(centerId, assignmentId);
      }

      setIsSubmitted(true);
      setIsSubmitPending(false);
      setShowConfirm(false);
      if (isRecoverySubmitRef.current) {
        toast.success(t("toast.reconnected"));
        isRecoverySubmitRef.current = false;
      } else {
        toast.success(t("toast.success"));
      }
    } catch (err) {
      // Distinguish network errors from server errors
      if (!onlineManager.isOnline()) {
        // Offline — persist submit-pending flag for tab-killed recovery
        setIsSubmitPending(true);
        if (centerId && assignmentId) {
          persistSubmitPending(centerId, assignmentId).catch(() => {
            toast.warning(t("toast.offlineError"));
          });
        }
        toast.warning(t("toast.offline"));
      } else {
        // Actual server error (not network)
        setIsSubmitPending(false);
        toast.error((err as Error).message || t("toast.submitFailed"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [submissionId, answers, saveAnswers, uploadPhoto, submitSubmission, assignmentId, centerId, t]);

  // Auto-retry submit on reconnect while isSubmitPending is set
  useEffect(() => {
    if (!isSubmitPending || !isOnline || submitRetryRef.current) return;
    submitRetryRef.current = true;
    isRecoverySubmitRef.current = true;
    handleSubmit().finally(() => {
      submitRetryRef.current = false;
    });
  }, [isOnline, isSubmitPending, handleSubmit]);

  // Check for persisted submit-pending flag on mount (tab-killed recovery)
  // Gated on localAnswersRestored to prevent race with IndexedDB answer restore
  useEffect(() => {
    if (!centerId || !assignmentId || !submissionId || !localAnswersRestored || isLocked) return;
    loadSubmitPending(centerId, assignmentId).then((pending) => {
      if (pending && isOnline) {
        isRecoverySubmitRef.current = true;
        handleSubmit();
      } else if (pending) {
        setIsSubmitPending(true);
      }
    }).catch(() => {
      // IndexedDB unavailable — cannot check persisted pending state
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerId, assignmentId, submissionId, localAnswersRestored]);

  // Loading states
  if (isLoadingAssignment) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !assignmentData) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold">{t("errorPage.heading")}</h2>
          <p className="text-muted-foreground mt-1">{t("errorPage.message")}</p>
          <button
            onClick={() => navigate(`/${centerId}/dashboard`)}
            className="mt-4 text-primary underline text-sm"
          >
            {t("errorPage.button")}
          </button>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return <SubmissionCompletePage />;
  }

  const assignment = assignmentData.data as Record<string, unknown>;
  const exercise = assignment?.exercise as Record<string, unknown> | undefined;
  const exerciseTitle = (exercise?.title as string) ?? t("page.title");
  const timeLimit = (exercise?.timeLimit as number) ?? null;
  const autoSubmitOnExpiry = (exercise?.autoSubmitOnExpiry as boolean) ?? true;
  const passageContent = (exercise?.passageContent as string) ?? null;
  const exerciseSkill = (exercise?.skill as string) ?? "";
  const audioUrl = (exercise?.audioUrl as string) ?? null;
  const isReading = exerciseSkill === "READING";
  const isListening = exerciseSkill === "LISTENING";

  const currentQuestion = flatQuestions[currentIndex];
  if (!currentQuestion) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-muted-foreground">{t("noQuestions")}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background" data-submission-id={submissionId || undefined}>
      <SubmissionHeader
        title={exerciseTitle}
        currentQuestion={currentIndex}
        totalQuestions={flatQuestions.length}
        timeLimit={timeLimit}
        startedAt={startedAt ?? undefined}
        autoSubmitOnExpiry={autoSubmitOnExpiry}
        onTimerExpired={handleSubmit}
        saveStatus={saveStatus}
        isLocked={isLocked}
        submissionStatus={submissionStatus}
      />

      <OfflineBanner isOnline={isOnline} isSubmitted={isSubmitted} />

      {isListening && audioUrl && <AudioPlayerPanel audioUrl={audioUrl} />}

      <div className="px-4 pt-2">
        <QuestionNumberPills
          totalQuestions={flatQuestions.length}
          currentIndex={currentIndex}
          answeredSet={answeredSet}
          questionIds={questionIds}
          onJump={handleJump}
        />
      </div>

      {currentQuestion.sectionInstructions && (
        <div className="px-4 pt-3">
          <p className="text-xs text-muted-foreground italic">
            {currentQuestion.sectionInstructions}
          </p>
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {isReading && passageContent && (
          <div className="max-w-3xl mx-auto mb-4">
            <PassagePanel passageContent={passageContent} />
          </div>
        )}
        <div className="max-w-3xl mx-auto">
          <QuestionInputFactory
            key={currentQuestion.id}
            sectionType={currentQuestion.sectionType}
            question={{
              id: currentQuestion.id,
              questionText: currentQuestion.questionText,
              questionType: currentQuestion.sectionType,
              options: currentQuestion.options,
              wordLimit: currentQuestion.wordLimit,
              writingPrompt: currentQuestion.writingPrompt,
            }}
            questionIndex={currentIndex}
            value={answers[currentQuestion.id] ?? null}
            onChange={(answer) => updateAnswer(currentQuestion.id, answer)}
            onPhotoCapture={(file) => handlePhotoCapture(currentQuestion.id, file)}
            speakingPrepTime={currentQuestion.speakingPrepTime}
            speakingTime={currentQuestion.speakingTime}
            readOnly={isLocked}
          />
        </div>
      </main>

      <QuestionStepper
        currentIndex={currentIndex}
        totalQuestions={flatQuestions.length}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onSubmit={() => setShowConfirm(true)}
        isLocked={isLocked}
      />

      {!isLocked && (
        <SubmitConfirmDialog
          open={showConfirm}
          onOpenChange={setShowConfirm}
          onConfirm={handleSubmit}
          totalQuestions={flatQuestions.length}
          answeredCount={answeredSet.size}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
