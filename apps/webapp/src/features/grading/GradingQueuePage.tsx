import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import {
  CircleCheck,
  Loader2,
  LockOpen,
  Mic,
  PenLine,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router";
import type { TeacherComment } from "@workspace/types";
import { useAuth } from "@/features/auth/auth-context";
import { AIFeedbackPane } from "./components/AIFeedbackPane";
import { BreatherCard } from "./components/BreatherCard";
import { ConnectionLineOverlay } from "./components/ConnectionLineOverlay";
import { StampedAnimation } from "./components/StampedAnimation";
import { StudentWorkPane } from "./components/StudentWorkPane";
import { QueueListMode } from "./components/QueueListMode";
import { SubmissionNav } from "./components/SubmissionNav";
import { WorkbenchLayout } from "./components/WorkbenchLayout";
import { validateAnchor } from "./hooks/use-anchor-validation";
import type { AnchorStatus } from "./hooks/use-anchor-validation";
import {
  HighlightProvider,
  useHighlightState,
  useScrollTargetSetter,
} from "./hooks/use-highlight-context";
import { useApproveFeedbackItem } from "./hooks/use-approve-feedback-item";
import { useBulkApprove } from "./hooks/use-bulk-approve";
import { useCreateComment } from "./hooks/use-create-comment";
import { useDeleteComment } from "./hooks/use-delete-comment";
import { useFinalizeGrading } from "./hooks/use-finalize-grading";
import { useGradingQueue } from "./hooks/use-grading-queue";
import { useGradingShortcuts } from "./hooks/use-grading-shortcuts";
import { useMediaQuery } from "./hooks/use-media-query";
import { usePrefetchSubmission } from "./hooks/use-prefetch-submission";
import { useRetriggerAnalysis } from "./hooks/use-retrigger-analysis";
import { useSubmissionDetail } from "./hooks/use-submission-detail";
import { useUnlockSubmission } from "./hooks/use-unlock-submission";
import { useUpdateComment } from "./hooks/use-update-comment";
import { formatRelativeTime } from "./utils/format-time";

const ANSWER_SEPARATOR = "\n\n";

function GradingQueuePageInner() {
  const { centerId, submissionId: urlSubmissionId } = useParams<{
    centerId: string;
    submissionId?: string;
  }>();

  // List view mode: when no submissionId in URL, show the queue list
  if (!urlSubmissionId) {
    return <QueueListMode centerId={centerId!} />;
  }

  return <WorkbenchMode centerId={centerId!} urlSubmissionId={urlSubmissionId} />;
}

function WorkbenchMode({ centerId, urlSubmissionId }: { centerId: string; urlSubmissionId: string }) {
  const { t } = useTranslation("grading");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workbenchRef = useRef<HTMLDivElement>(null);
  const { highlightedItemId, setHighlightedItemId } = useHighlightState();
  const setScrollTarget = useScrollTargetSetter();
  const isMobile = useMediaQuery("(max-width: 767px)");

  const {
    data: queueData,
    isPending: isQueueLoading,
    error: queueError,
    refetch: refetchQueue,
  } = useGradingQueue({ limit: 50 });

  const queueItems = useMemo(
    () => queueData?.data?.items ?? [],
    [queueData?.data?.items],
  );
  const submissionIds = useMemo(
    () => queueItems.map((item) => item.submissionId),
    [queueItems],
  );

  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Sync currentIndex when queue data loads or URL submissionId changes
  useEffect(() => {
    if (submissionIds.length === 0) return;
    const idx = submissionIds.indexOf(urlSubmissionId);
    if (idx >= 0) {
      setCurrentIndex(idx);
    }
  }, [submissionIds, urlSubmissionId]);

  const activeSubmissionId = urlSubmissionId;

  const nextId =
    currentIndex < submissionIds.length - 1
      ? submissionIds[currentIndex + 1]
      : null;

  // Fetch detail for active submission
  const {
    data: detailData,
    isPending: isDetailLoading,
    error: detailError,
  } = useSubmissionDetail(activeSubmissionId);

  // Pre-fetch next submission
  usePrefetchSubmission(nextId);

  // Re-trigger analysis mutation
  const retriggerMutation = useRetriggerAnalysis(activeSubmissionId ?? "");

  // Teacher comment mutations
  const { user } = useAuth();
  const createComment = useCreateComment(activeSubmissionId ?? "");
  const updateComment = useUpdateComment(activeSubmissionId ?? "");
  const deleteComment = useDeleteComment(activeSubmissionId ?? "");

  // Approval mutations
  const approveFeedbackItem = useApproveFeedbackItem(activeSubmissionId ?? "");
  const bulkApprove = useBulkApprove(activeSubmissionId ?? "");
  const finalizeGrading = useFinalizeGrading(activeSubmissionId ?? "");
  const unlockSubmission = useUnlockSubmission(activeSubmissionId ?? "");

  // Teacher score override state
  const [teacherFinalScore, setTeacherFinalScore] = useState<number | null>(null);
  const [teacherCriteriaScores, setTeacherCriteriaScores] = useState<Record<string, number> | null>(null);

  // Stamped animation state
  const [showStamped, setShowStamped] = useState(false);

  // Session tracking state
  const [sessionGradedCount, setSessionGradedCount] = useState(0);
  const [sessionApprovedCount, setSessionApprovedCount] = useState(0);
  const [sessionRejectedCount, setSessionRejectedCount] = useState(0);
  const [showBreather, setShowBreather] = useState(false);
  const [sessionStartTime] = useState(Date.now());

  // Pending navigation target after animation
  const pendingNavRef = useRef<string | null>(null);

  // Build detail content
  const detail = detailData?.data;
  const submission = detail?.submission;
  const analysisStatus = detail?.analysisStatus ?? "not_applicable";
  const feedback = detail?.feedback;
  const currentQueueItem = queueItems[currentIndex];

  // Reset teacher overrides when submission changes
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fb = feedback as any;
    setTeacherFinalScore(fb?.teacherFinalScore ?? null);
    setTeacherCriteriaScores(fb?.teacherCriteriaScores ?? null);
  }, [activeSubmissionId, feedback]);

  const isFinalized = submission?.status === "GRADED";

  const studentName = currentQueueItem?.studentName ?? "Unknown Student";
  const assignmentTitle =
    currentQueueItem?.assignmentTitle ?? "Untitled Assignment";
  const exerciseSkill = currentQueueItem?.exerciseSkill ?? "WRITING";
  const skill = (exerciseSkill === "SPEAKING" ? "SPEAKING" : "WRITING") as
    "WRITING" | "SPEAKING";
  const submittedAt =
    submission?.submittedAt ?? currentQueueItem?.submittedAt;

  const answers = useMemo(
    () =>
      (submission?.answers ?? []).map((a) => ({
        id: a.id,
        questionId: a.questionId ?? "",
        answer: (a.answer ?? {}) as { text?: string; transcript?: string },
        score: a.score ?? undefined,
      })),
    [submission?.answers],
  );

  const concatenatedStudentText = useMemo(() => {
    return answers
      .map((a) =>
        skill === "WRITING" ? a.answer?.text ?? "" : a.answer?.transcript ?? "",
      )
      .join(ANSWER_SEPARATOR);
  }, [answers, skill]);

  const feedbackItems = useMemo(
    () => feedback?.items ?? [],
    [feedback?.items],
  );

  const teacherComments = useMemo(
    () => (detail?.teacherComments ?? []) as TeacherComment[],
    [detail?.teacherComments],
  );

  const anchorStatuses = useMemo(() => {
    const map = new Map<string, AnchorStatus>();
    for (const item of feedbackItems) {
      const result = validateAnchor(
        item.startOffset,
        item.endOffset,
        item.originalContextSnippet,
        concatenatedStudentText,
      );
      map.set(item.id, result.anchorStatus);
    }
    for (const comment of teacherComments) {
      if (comment.startOffset != null && comment.endOffset != null) {
        const result = validateAnchor(
          comment.startOffset,
          comment.endOffset,
          comment.originalContextSnippet,
          concatenatedStudentText,
        );
        map.set(comment.id, result.anchorStatus);
      }
    }
    return map;
  }, [feedbackItems, teacherComments, concatenatedStudentText]);

  // Navigation handlers
  const navigateTo = useCallback(
    (idx: number) => {
      setCurrentIndex(idx);
      const id = submissionIds[idx];
      if (id) {
        navigate(`/${centerId}/dashboard/grading/${id}`, { replace: true });
      }
    },
    [submissionIds, centerId, navigate],
  );

  const navigateToSubmission = useCallback(
    (id: string) => {
      const idx = submissionIds.indexOf(id);
      if (idx >= 0) {
        navigateTo(idx);
      } else {
        navigate(`/${centerId}/dashboard/grading/${id}`, { replace: true });
      }
    },
    [submissionIds, navigateTo, centerId, navigate],
  );

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) navigateTo(currentIndex - 1);
  }, [currentIndex, navigateTo]);

  const handleNext = useCallback(() => {
    if (currentIndex < submissionIds.length - 1) navigateTo(currentIndex + 1);
  }, [currentIndex, submissionIds.length, navigateTo]);

  // Stable highlight callback
  const handleHighlight = useCallback(
    (id: string | null, debounce = true) => {
      setHighlightedItemId(id, debounce);
    },
    [setHighlightedItemId],
  );

  // Click-to-scroll callback — also activates highlight (connection lines + ring)
  const handleScrollTo = useCallback(
    (id: string) => {
      setHighlightedItemId(id, false);
      setScrollTarget(id);
    },
    [setHighlightedItemId, setScrollTarget],
  );

  const highlightedSeverity = useMemo(() => {
    if (!highlightedItemId) return null;
    const item = feedbackItems.find((i) => i.id === highlightedItemId);
    if (item) return (item.severity as "error" | "warning" | "suggestion") ?? null;
    const isTeacherComment = teacherComments.some((c) => c.id === highlightedItemId);
    if (isTeacherComment) return null;
    return null;
  }, [highlightedItemId, feedbackItems, teacherComments]);

  // Score change handler
  const handleScoreChange = useCallback(
    (field: string, value: number | null) => {
      if (field === "overall") {
        setTeacherFinalScore(value);
      } else if (value != null) {
        setTeacherCriteriaScores((prev) => ({ ...prev, [field]: value }));
      } else {
        setTeacherCriteriaScores((prev) => {
          if (!prev) return prev;
          const next = { ...prev };
          delete next[field];
          return Object.keys(next).length > 0 ? next : null;
        });
      }
    },
    [],
  );

  // Approve feedback item handler
  const handleApproveFeedbackItem = useCallback(
    (itemId: string, isApproved: boolean) => {
      approveFeedbackItem.mutate({ itemId, data: { isApproved } });
    },
    [approveFeedbackItem],
  );

  // Override feedback text handler
  const handleOverrideFeedbackText = useCallback(
    (itemId: string, text: string | null) => {
      approveFeedbackItem.mutate({
        itemId,
        data: { isApproved: true, teacherOverrideText: text },
      });
    },
    [approveFeedbackItem],
  );

  // Bulk approve handler
  const handleBulkApprove = useCallback(
    (action: "approve_remaining" | "reject_remaining") => {
      bulkApprove.mutate({ action });
    },
    [bulkApprove],
  );

  // Finalize handler
  const handleFinalize = useCallback(
    async (data: {
      teacherFinalScore?: number | null;
      teacherCriteriaScores?: Record<string, number> | null;
      teacherGeneralFeedback?: string | null;
    }) => {
      try {
        const result = await finalizeGrading.mutateAsync(data);
        const nextSubId = result?.data?.nextSubmissionId ?? null;

        // Count approved/rejected items for session tracking
        const items = feedbackItems as Array<{ isApproved?: boolean | null }>;
        const approved = items.filter((i) => i.isApproved === true).length;
        const rejected = items.filter((i) => i.isApproved === false).length;
        // Add remaining as approved (auto-approved by finalize)
        const pending = items.filter((i) => i.isApproved == null).length;

        setSessionApprovedCount((prev) => prev + approved + pending);
        setSessionRejectedCount((prev) => prev + rejected);

        const newGradedCount = sessionGradedCount + 1;
        setSessionGradedCount(newGradedCount);

        pendingNavRef.current = nextSubId;

        // Show stamped animation
        setShowStamped(true);
      } catch {
        // Error handled by mutation hook
      }
    },
    [finalizeGrading, feedbackItems, sessionGradedCount],
  );

  // Handle stamped animation complete
  const handleStampedComplete = useCallback(() => {
    setShowStamped(false);

    // Check if breather should show
    if (sessionGradedCount > 0 && sessionGradedCount % 5 === 0) {
      setShowBreather(true);
      return;
    }

    // Navigate to next submission
    const nextSubId = pendingNavRef.current;
    pendingNavRef.current = null;
    if (nextSubId) {
      navigateToSubmission(nextSubId);
    }
  }, [sessionGradedCount, navigateToSubmission]);

  // Handle breather continue
  const handleBreatherContinue = useCallback(() => {
    setShowBreather(false);
    const nextSubId = pendingNavRef.current;
    pendingNavRef.current = null;
    if (nextSubId) {
      navigateToSubmission(nextSubId);
    }
  }, [navigateToSubmission]);

  // Keyboard shortcut handlers
  const handleShortcutApprove = useCallback(
    (itemId: string) => handleApproveFeedbackItem(itemId, true),
    [handleApproveFeedbackItem],
  );

  const handleShortcutReject = useCallback(
    (itemId: string) => handleApproveFeedbackItem(itemId, false),
    [handleApproveFeedbackItem],
  );

  const handleShortcutFinalize = useCallback(() => {
    if (isFinalized || finalizeGrading.isPending) return;
    handleFinalize({
      teacherFinalScore,
      teacherCriteriaScores,
      teacherGeneralFeedback: null,
    });
  }, [isFinalized, finalizeGrading.isPending, handleFinalize, teacherFinalScore, teacherCriteriaScores]);

  // Register keyboard shortcuts — navigation works even on finalized submissions
  useGradingShortcuts({
    onApproveItem: isFinalized ? undefined : handleShortcutApprove,
    onRejectItem: isFinalized ? undefined : handleShortcutReject,
    onFinalize: isFinalized ? undefined : handleShortcutFinalize,
    onNextSubmission: handleNext,
    onPrevSubmission: handlePrev,
    highlightedItemId,
    enabled: !showBreather && !showStamped,
  });

  // Loading state
  if (isQueueLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (queueError) {
    const is403 =
      queueError &&
      typeof queueError === "object" &&
      "statusCode" in queueError &&
      (queueError as { statusCode: number }).statusCode === 403;

    if (is403) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <p className="font-medium">{t("page.noClassesAssigned")}</p>
          <p className="text-sm text-muted-foreground">
            {t("page.noClassesMessage")}
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="font-medium text-destructive">
          {t("page.failedToLoad")}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetchQueue()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  // Empty queue
  if (queueItems.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <CircleCheck className="h-10 w-10 text-green-500" />
        <h2 className="text-lg font-semibold">{t("page.allCaughtUp")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("page.noSubmissions")}
        </p>
      </div>
    );
  }

  // Breather overlay
  if (showBreather) {
    return (
      <BreatherCard
        sessionGradedCount={sessionGradedCount}
        sessionApprovedCount={sessionApprovedCount}
        sessionRejectedCount={sessionRejectedCount}
        sessionStartTime={sessionStartTime}
        onContinue={handleBreatherContinue}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Stamped animation overlay */}
      <StampedAnimation isVisible={showStamped} onComplete={handleStampedComplete} />

      {/* Workbench header */}
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <span className="font-medium">{studentName}</span>
        <span className="text-sm text-muted-foreground">{assignmentTitle}</span>
        <Badge variant="outline">
          {skill === "WRITING" ? (
            <PenLine className="mr-1 h-3 w-3" />
          ) : (
            <Mic className="mr-1 h-3 w-3" />
          )}
          {skill === "WRITING" ? "Writing" : "Speaking"}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(submittedAt ?? null)}
        </span>
        {isFinalized && (
          <Badge variant="secondary" className="ml-auto">{t("aiFeedback.graded")}</Badge>
        )}
        {submission && submission.status !== "IN_PROGRESS" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`gap-1.5 ${isFinalized ? "" : "ml-auto"}`}
                disabled={unlockSubmission.isPending}
              >
                <LockOpen className="size-3.5" />
                {t("page.unlockButton")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("page.unlockConfirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("page.unlockConfirmDescription")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => unlockSubmission.mutate()}
                  disabled={unlockSubmission.isPending}
                >
                  {unlockSubmission.isPending ? t("page.unlocking") : t("page.unlockButton")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Navigation */}
      <SubmissionNav
        currentIndex={currentIndex}
        total={submissionIds.length}
        onPrev={handlePrev}
        onNext={handleNext}
        onBackToQueue={() => {
          const params = searchParams.toString();
          navigate(`/${centerId}/dashboard/grading${params ? `?${params}` : ""}`);
        }}
      />

      {/* Detail loading */}
      {isDetailLoading && !detail ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : detailError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-sm text-destructive">
            {t("page.failedToLoadDetails")}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateTo(currentIndex)}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      ) : (
        <WorkbenchLayout
          containerRef={workbenchRef}
          overlay={
            <ConnectionLineOverlay
              containerRef={workbenchRef}
              highlightedItemId={highlightedItemId}
              isMobile={isMobile}
              severity={highlightedSeverity}
            />
          }
          leftPane={
            <StudentWorkPane
              exerciseTitle={assignmentTitle}
              exerciseSkill={skill}
              sections={[]}
              answers={answers}
              feedbackItems={feedbackItems}
              teacherComments={teacherComments}
              anchorStatuses={anchorStatuses}
              onCreateComment={(data) =>
                createComment.mutate({
                  content: data.content,
                  startOffset: data.startOffset,
                  endOffset: data.endOffset,
                  originalContextSnippet: data.originalContextSnippet,
                  visibility: data.visibility,
                })
              }
            />
          }
          rightPane={
            <AIFeedbackPane
              analysisStatus={analysisStatus}
              feedback={
                feedback
                  ? {
                      id: feedback.id,
                      overallScore: feedback.overallScore ?? null,
                      criteriaScores: feedback.criteriaScores ?? null,
                      generalFeedback: feedback.generalFeedback ?? null,
                      items: feedback.items ?? [],
                      teacherFinalScore: (feedback as Record<string, unknown>).teacherFinalScore as number | null | undefined,
                      teacherCriteriaScores: (feedback as Record<string, unknown>).teacherCriteriaScores as Record<string, number> | null | undefined,
                      teacherGeneralFeedback: (feedback as Record<string, unknown>).teacherGeneralFeedback as string | null | undefined,
                    }
                  : null
              }
              failureReason={currentQueueItem?.failureReason}
              skill={skill}
              onRetrigger={() => retriggerMutation.mutate()}
              isRetriggering={retriggerMutation.isPending}
              anchorStatuses={anchorStatuses}
              highlightedItemId={highlightedItemId}
              onHighlight={handleHighlight}
              onScrollTo={handleScrollTo}
              teacherComments={teacherComments}
              currentUserId={user?.id}
              onCreateComment={(data) => createComment.mutate(data)}
              onUpdateComment={(commentId, data) =>
                updateComment.mutate({ commentId, data })
              }
              onDeleteComment={(commentId) => deleteComment.mutate(commentId)}
              isCreatingComment={createComment.isPending}
              onApproveFeedbackItem={handleApproveFeedbackItem}
              onOverrideFeedbackText={handleOverrideFeedbackText}
              onBulkApprove={handleBulkApprove}
              onFinalize={handleFinalize}
              isFinalized={isFinalized}
              isFinalizing={finalizeGrading.isPending}
              teacherFinalScore={teacherFinalScore}
              teacherCriteriaScores={teacherCriteriaScores as Record<string, number> | null}
              onScoreChange={handleScoreChange}
            />
          }
        />
      )}
    </div>
  );
}

export function GradingQueuePage() {
  return (
    <HighlightProvider>
      <GradingQueuePageInner />
    </HighlightProvider>
  );
}
