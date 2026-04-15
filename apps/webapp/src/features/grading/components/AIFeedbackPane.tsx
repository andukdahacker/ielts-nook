import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Separator } from "@workspace/ui/components/separator";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { AlertTriangle, ArrowRight, CheckCheck, PenLine, RefreshCw } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import type {
  CommentVisibility,
  CreateTeacherComment,
  TeacherComment,
  UpdateTeacherComment,
} from "@workspace/types";
import { BandScoreCard } from "./BandScoreCard";
import { FeedbackItemCard } from "./FeedbackItemCard";
import { TeacherCommentCard } from "./TeacherCommentCard";
import { AddCommentInput } from "./AddCommentInput";
import type { AnchorStatus } from "../hooks/use-anchor-validation";

type AnalysisStatus = "not_applicable" | "analyzing" | "ready" | "failed";
type FeedbackType =
  | "grammar"
  | "vocabulary"
  | "coherence"
  | "score_suggestion"
  | "general";

interface FeedbackItem {
  id: string;
  type: FeedbackType;
  content: string;
  suggestedFix?: string | null;
  severity?: "error" | "warning" | "suggestion" | null;
  confidence?: number | null;
  originalContextSnippet?: string | null;
  startOffset?: number | null;
  endOffset?: number | null;
  isApproved?: boolean | null;
  approvedAt?: string | null;
  teacherOverrideText?: string | null;
}

interface CriteriaScores {
  taskAchievement?: number;
  coherence?: number;
  lexicalResource?: number;
  grammaticalRange?: number;
  fluency?: number;
  pronunciation?: number;
}

interface Feedback {
  id: string;
  overallScore: number | null;
  criteriaScores: CriteriaScores | null;
  generalFeedback: string | null;
  items: FeedbackItem[];
  teacherFinalScore?: number | null;
  teacherCriteriaScores?: CriteriaScores | null;
  teacherGeneralFeedback?: string | null;
}

interface FinalizeGradingInput {
  teacherFinalScore?: number | null;
  teacherCriteriaScores?: Record<string, number> | null;
  teacherGeneralFeedback?: string | null;
}

interface AIFeedbackPaneProps {
  analysisStatus: AnalysisStatus;
  feedback: Feedback | null | undefined;
  failureReason?: string | null;
  skill: "WRITING" | "SPEAKING";
  onRetrigger: () => void;
  isRetriggering: boolean;
  anchorStatuses?: Map<string, AnchorStatus>;
  highlightedItemId?: string | null;
  onHighlight?: (id: string | null, debounce?: boolean) => void;
  onScrollTo?: (id: string) => void;
  teacherComments?: TeacherComment[];
  currentUserId?: string;
  onCreateComment?: (data: CreateTeacherComment) => void;
  onUpdateComment?: (commentId: string, data: UpdateTeacherComment) => void;
  onDeleteComment?: (commentId: string) => void;
  isCreatingComment?: boolean;
  onApproveFeedbackItem?: (itemId: string, isApproved: boolean) => void;
  onOverrideFeedbackText?: (itemId: string, text: string | null) => void;
  onBulkApprove?: (action: "approve_remaining" | "reject_remaining") => void;
  onFinalize?: (data: FinalizeGradingInput) => void;
  isFinalized?: boolean;
  isFinalizing?: boolean;
  teacherFinalScore?: number | null;
  teacherCriteriaScores?: CriteriaScores | null;
  onScoreChange?: (field: string, value: number | null) => void;
  isManualMode?: boolean;
  onManualMode?: (value: boolean) => void;
}

function useManualGradingTooltip(centerId?: string) {
  const key = `classlite:manual-grading-seen:${centerId ?? "default"}`;
  const [show, setShow] = useState(() => {
    try {
      return !localStorage.getItem(key);
    } catch {
      return true;
    }
  });

  const dismiss = useCallback(() => {
    setShow(false);
    try {
      localStorage.setItem(key, "1");
    } catch {
      // localStorage unavailable
    }
  }, [key]);

  return { showTooltip: show, dismissTooltip: dismiss };
}

const TYPE_ORDER: FeedbackType[] = [
  "grammar",
  "vocabulary",
  "coherence",
  "score_suggestion",
  "general",
];

const TYPE_LABEL_KEYS: Record<FeedbackType, string> = {
  grammar: "aiFeedback.grammarIssues",
  vocabulary: "aiFeedback.vocabulary",
  coherence: "aiFeedback.coherence",
  score_suggestion: "aiFeedback.scoreSuggestions",
  general: "aiFeedback.general",
};

function groupByType(items: FeedbackItem[]) {
  const groups = new Map<FeedbackType, FeedbackItem[]>();
  for (const item of items) {
    const list = groups.get(item.type) ?? [];
    list.push(item);
    groups.set(item.type, list);
  }
  return TYPE_ORDER.filter((t) => groups.has(t)).map((type) => ({
    type,
    labelKey: TYPE_LABEL_KEYS[type],
    items: groups.get(type)!,
  }));
}

function LoadingSkeleton() {
  const { t } = useTranslation("grading");
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-20 w-full rounded-lg" />
      <Skeleton className="h-20 w-full rounded-lg" />
      <Skeleton className="h-20 w-full rounded-lg" />
      <p className="text-center text-sm text-muted-foreground animate-pulse">
        {t("aiFeedback.loading")}
      </p>
    </div>
  );
}

function GradeManuallyButton({
  onClick,
  label,
  showTooltip,
  tooltipText,
  onTooltipDismiss,
  variant = "secondary",
}: {
  onClick: () => void;
  label: string;
  showTooltip?: boolean;
  tooltipText?: string;
  onTooltipDismiss?: () => void;
  variant?: "secondary" | "outline";
}) {
  const btn = (
    <Button
      variant={variant}
      size="sm"
      onClick={() => {
        onClick();
        onTooltipDismiss?.();
      }}
      aria-label={label}
    >
      <PenLine className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );

  if (showTooltip && tooltipText) {
    return (
      <Tooltip defaultOpen onOpenChange={(open) => { if (!open) onTooltipDismiss?.(); }}>
        <TooltipTrigger asChild>{btn}</TooltipTrigger>
        <TooltipContent side="bottom">{tooltipText}</TooltipContent>
      </Tooltip>
    );
  }

  return btn;
}

function FailedState({
  failureReason,
  onRetrigger,
  isRetriggering,
  onGradeManually,
  showTooltip,
  tooltipText,
  onTooltipDismiss,
}: {
  failureReason?: string | null;
  onRetrigger: () => void;
  isRetriggering: boolean;
  onGradeManually?: () => void;
  showTooltip?: boolean;
  tooltipText?: string;
  onTooltipDismiss?: () => void;
}) {
  const { t } = useTranslation("grading");
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-6 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <div className="space-y-1">
        <p className="font-medium">{t("aiFeedback.failedTitle")}</p>
        {failureReason && (
          <p className="text-sm text-muted-foreground">{failureReason}</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRetrigger}
          disabled={isRetriggering}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isRetriggering ? "animate-spin" : ""}`}
          />
          {t("aiFeedback.retrigger")}
        </Button>
        {onGradeManually && (
          <GradeManuallyButton
            onClick={onGradeManually}
            label={t("aiFeedback.gradeManually")}
            showTooltip={showTooltip}
            tooltipText={tooltipText}
            onTooltipDismiss={onTooltipDismiss}
          />
        )}
      </div>
      {!onGradeManually && (
        <p className="text-xs text-muted-foreground">
          {t("aiFeedback.helpText")}
        </p>
      )}
    </div>
  );
}

function TeacherCommentsSection({
  comments,
  currentUserId,
  anchorStatuses,
  highlightedItemId,
  onHighlight,
  onScrollTo,
  onUpdateComment,
  onDeleteComment,
  onCreateComment,
  isCreatingComment,
}: {
  comments: TeacherComment[];
  currentUserId?: string;
  anchorStatuses?: Map<string, AnchorStatus>;
  highlightedItemId?: string | null;
  onHighlight?: (id: string | null, debounce?: boolean) => void;
  onScrollTo?: (id: string) => void;
  onUpdateComment?: (commentId: string, data: UpdateTeacherComment) => void;
  onDeleteComment?: (commentId: string) => void;
  onCreateComment?: (data: CreateTeacherComment) => void;
  isCreatingComment?: boolean;
}) {
  const handleEdit = useCallback(
    (commentId: string, content: string) => {
      onUpdateComment?.(commentId, { content });
    },
    [onUpdateComment],
  );

  const handleDelete = useCallback(
    (commentId: string) => {
      onDeleteComment?.(commentId);
    },
    [onDeleteComment],
  );

  const handleVisibilityChange = useCallback(
    (commentId: string, visibility: CommentVisibility) => {
      onUpdateComment?.(commentId, { visibility });
    },
    [onUpdateComment],
  );

  const { t } = useTranslation("grading");

  const handleGeneralComment = useCallback(
    (content: string, visibility: CommentVisibility) => {
      onCreateComment?.({
        content,
        startOffset: null,
        endOffset: null,
        visibility,
      });
    },
    [onCreateComment],
  );

  return (
    <>
      {comments.length > 0 && (
        <>
          <div className="flex items-center gap-2 my-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">
              {t("aiFeedback.teacherComments")}
            </span>
            <Separator className="flex-1" />
          </div>

          <div className="space-y-2">
            {comments.map((comment) => (
              <TeacherCommentCard
                key={comment.id}
                comment={comment}
                isAuthor={comment.authorId === currentUserId}
                isHighlighted={highlightedItemId === comment.id}
                onHighlight={onHighlight}
                onScrollTo={onScrollTo}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onVisibilityChange={handleVisibilityChange}
                anchorStatus={anchorStatuses?.get(comment.id)}
              />
            ))}
          </div>
        </>
      )}

      {onCreateComment && (
        <AddCommentInput
          onSubmit={handleGeneralComment}
          isSubmitting={isCreatingComment ?? false}
        />
      )}
    </>
  );
}

function ApprovalToolbar({
  items,
  onBulkApprove,
  onFinalize,
  isFinalized,
  isFinalizing,
  teacherFinalScore,
  teacherCriteriaScores,
}: {
  items: FeedbackItem[];
  onBulkApprove?: (action: "approve_remaining" | "reject_remaining") => void;
  onFinalize?: (data: FinalizeGradingInput) => void;
  isFinalized?: boolean;
  isFinalizing?: boolean;
  teacherFinalScore?: number | null;
  teacherCriteriaScores?: CriteriaScores | null;
}) {
  const approvedCount = items.filter((i) => i.isApproved !== null && i.isApproved !== undefined).length;
  const totalItems = items.length;
  const hasPending = approvedCount < totalItems;

  const handleFinalize = useCallback(() => {
    onFinalize?.({
      teacherFinalScore,
      teacherCriteriaScores: teacherCriteriaScores as Record<string, number> | null,
      teacherGeneralFeedback: null,
    });
  }, [onFinalize, teacherFinalScore, teacherCriteriaScores]);

  const { t } = useTranslation("grading");

  if (isFinalized) {
    return (
      <div className="border-t bg-background p-3 flex items-center justify-center shrink-0">
        <Badge variant="secondary">{t("aiFeedback.graded")}</Badge>
      </div>
    );
  }

  return (
    <div className="border-t bg-background p-3 flex items-center gap-2 shrink-0">
      <span className="text-xs text-muted-foreground">
        {approvedCount}/{totalItems} {t("aiFeedback.reviewed")}
      </span>
      {onBulkApprove && hasPending && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onBulkApprove("approve_remaining")}
        >
          <CheckCheck className="mr-1 h-3.5 w-3.5" />
          {t("aiFeedback.approveAll")}
        </Button>
      )}
      {onFinalize && (
        <Button
          size="sm"
          className="ml-auto bg-primary"
          onClick={handleFinalize}
          disabled={isFinalizing}
        >
          {t("aiFeedback.approveAndNext")}
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

export function AIFeedbackPane({
  analysisStatus,
  feedback,
  failureReason,
  skill,
  onRetrigger,
  isRetriggering,
  anchorStatuses,
  highlightedItemId,
  onHighlight,
  onScrollTo,
  teacherComments = [],
  currentUserId,
  onCreateComment,
  onUpdateComment,
  onDeleteComment,
  isCreatingComment,
  onApproveFeedbackItem,
  onOverrideFeedbackText,
  onBulkApprove,
  onFinalize,
  isFinalized = false,
  isFinalizing = false,
  teacherFinalScore,
  teacherCriteriaScores,
  onScoreChange,
  isManualMode = false,
  onManualMode,
}: AIFeedbackPaneProps) {
  const { t } = useTranslation("grading");
  const { centerId } = useParams<{ centerId: string }>();
  const bandScoreRef = useRef<HTMLDivElement>(null);
  const { showTooltip, dismissTooltip } = useManualGradingTooltip(centerId);

  const teacherSection = (
    <TeacherCommentsSection
      comments={teacherComments}
      currentUserId={currentUserId}
      anchorStatuses={anchorStatuses}
      highlightedItemId={highlightedItemId}
      onHighlight={onHighlight}
      onScrollTo={onScrollTo}
      onUpdateComment={onUpdateComment}
      onDeleteComment={onDeleteComment}
      onCreateComment={onCreateComment}
      isCreatingComment={isCreatingComment}
    />
  );

  const feedbackItems = useMemo(() => feedback?.items ?? [], [feedback?.items]);

  const handleGradeManually = useCallback(() => {
    onManualMode?.(true);
    dismissTooltip();
  }, [onManualMode, dismissTooltip]);

  const handleScrollToBandScore = useCallback(() => {
    bandScoreRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    // Focus first editable score input inside the card
    const firstInput = bandScoreRef.current?.querySelector<HTMLElement>(
      '[role="button"], input',
    );
    firstInput?.focus();
  }, []);

  // Manual grading panel — rendered when isManualMode is true in failed/empty/analyzing states
  const manualGradingPanel = isManualMode ? (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {analysisStatus === "analyzing" && (
            <p className="text-xs text-muted-foreground text-center">
              {t("aiFeedback.aiStillRunningNote")}
            </p>
          )}
          <BandScoreCard
            ref={bandScoreRef}
            overallScore={null}
            criteriaScores={{}}
            skill={skill}
            teacherFinalScore={teacherFinalScore}
            teacherCriteriaScores={teacherCriteriaScores}
            onScoreChange={onScoreChange}
            isFinalized={isFinalized}
          />
          {teacherSection}
        </div>
      </ScrollArea>
      <ApprovalToolbar
        items={[]}
        onFinalize={onFinalize}
        isFinalized={isFinalized}
        isFinalizing={isFinalizing}
        teacherFinalScore={teacherFinalScore}
        teacherCriteriaScores={teacherCriteriaScores}
      />
    </div>
  ) : null;

  if (analysisStatus === "analyzing") {
    if (isManualMode) return manualGradingPanel;
    return (
      <ScrollArea className="h-full">
        <LoadingSkeleton />
        <div className="px-4 pb-4">
          {onManualMode && (
            <div className="flex flex-col items-center gap-2 py-3">
              <GradeManuallyButton
                onClick={handleGradeManually}
                label={t("aiFeedback.skipAiGradeManually")}
                variant="outline"
                showTooltip={showTooltip}
                tooltipText={t("aiFeedback.manualGradingTooltip")}
                onTooltipDismiss={dismissTooltip}
              />
              <p className="text-xs text-muted-foreground text-center max-w-[280px]">
                {t("aiFeedback.aiStillRunningNote")}
              </p>
            </div>
          )}
          {teacherSection}
        </div>
      </ScrollArea>
    );
  }

  if (analysisStatus === "failed") {
    if (isManualMode) return manualGradingPanel;
    return (
      <ScrollArea className="h-full">
        <FailedState
          failureReason={failureReason}
          onRetrigger={onRetrigger}
          isRetriggering={isRetriggering}
          onGradeManually={onManualMode ? handleGradeManually : undefined}
          showTooltip={showTooltip}
          tooltipText={t("aiFeedback.manualGradingTooltip")}
          onTooltipDismiss={dismissTooltip}
        />
        <div className="px-4 pb-4">{teacherSection}</div>
      </ScrollArea>
    );
  }

  if (!feedback) {
    if (isManualMode) return manualGradingPanel;
    return (
      <div className="flex h-full flex-col">
        <ScrollArea className="flex-1">
          <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t("aiFeedback.noFeedback")}
            </p>
            {onManualMode && (
              <GradeManuallyButton
                onClick={handleGradeManually}
                label={t("aiFeedback.gradeManually")}
                showTooltip={showTooltip}
                tooltipText={t("aiFeedback.manualGradingTooltip")}
                onTooltipDismiss={dismissTooltip}
              />
            )}
          </div>
          <div className="px-4 pb-4">{teacherSection}</div>
        </ScrollArea>
        {onFinalize && (
          <ApprovalToolbar
            items={[]}
            onFinalize={onFinalize}
            isFinalized={isFinalized}
            isFinalizing={isFinalizing}
            teacherFinalScore={teacherFinalScore}
            teacherCriteriaScores={teacherCriteriaScores}
          />
        )}
      </div>
    );
  }

  const groups = groupByType(feedbackItems);

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          <BandScoreCard
            ref={bandScoreRef}
            overallScore={feedback.overallScore}
            criteriaScores={feedback.criteriaScores}
            skill={skill}
            teacherFinalScore={teacherFinalScore}
            teacherCriteriaScores={teacherCriteriaScores}
            onScoreChange={onScoreChange}
            isFinalized={isFinalized}
          />

          {onManualMode && !isFinalized && (
            <button
              type="button"
              className="text-xs text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
              onClick={handleScrollToBandScore}
              aria-label={t("aiFeedback.switchToManual")}
            >
              {t("aiFeedback.switchToManual")}
            </button>
          )}

          {feedback.generalFeedback && (
            <div className="rounded-lg border p-3">
              <h3 className="mb-1.5 text-sm font-medium">{t("aiFeedback.generalFeedback")}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feedback.generalFeedback}
              </p>
            </div>
          )}

          {groups.map((group) => (
            <div key={group.type}>
              <h3 className="mb-2 text-sm font-medium">
                {t(group.labelKey)} ({group.items.length})
              </h3>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <FeedbackItemCard
                    key={item.id}
                    item={item}
                    anchorStatus={anchorStatuses?.get(item.id)}
                    isHighlighted={highlightedItemId === item.id}
                    onHighlight={onHighlight}
                    onScrollTo={onScrollTo}
                    onApprove={onApproveFeedbackItem}
                    onOverrideText={onOverrideFeedbackText}
                    isFinalized={isFinalized}
                  />
                ))}
              </div>
            </div>
          ))}

          {teacherSection}
        </div>
      </ScrollArea>

      <ApprovalToolbar
        items={feedbackItems}
        onBulkApprove={onBulkApprove}
        onFinalize={onFinalize}
        isFinalized={isFinalized}
        isFinalizing={isFinalizing}
        teacherFinalScore={teacherFinalScore}
        teacherCriteriaScores={teacherCriteriaScores}
      />
    </div>
  );
}
