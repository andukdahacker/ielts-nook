import { Skeleton } from "@workspace/ui/components/skeleton";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { Button } from "@workspace/ui/components/button";
import { useStudentFeedback } from "../hooks/use-student-feedback";
import { useSubmissionHistory } from "../hooks/use-submission-history";
import { StudentScoreDisplay } from "./StudentScoreDisplay";
import { StudentFeedbackContent } from "./StudentFeedbackContent";
import { StudentCommentsList } from "./StudentCommentsList";
import { SubmissionHistoryPanel } from "./SubmissionHistoryPanel";
import { useEffect } from "react";

export function StudentFeedbackPage() {
  const { t } = useTranslation("grading");
  const { centerId, submissionId } = useParams<{
    centerId: string;
    submissionId: string;
  }>();
  const navigate = useNavigate();

  const {
    data: feedbackData,
    isLoading,
    error,
  } = useStudentFeedback(submissionId);

  const { data: historyData } = useSubmissionHistory(submissionId);

  // Track last viewed — for "New" badge on dashboard
  useEffect(() => {
    if (submissionId && centerId) {
      try {
        const key = `lastViewedGrades_${centerId}`;
        const existing = JSON.parse(localStorage.getItem(key) || "{}");
        existing[submissionId] = new Date().toISOString();
        localStorage.setItem(key, JSON.stringify(existing));
      } catch {
        // localStorage not available
      }
    }
  }, [submissionId, centerId]);

  if (isLoading) {
    return <FeedbackSkeleton />;
  }

  if (error) {
    const status = (error as { status?: number })?.status;
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold">
          {status === 403
            ? t("studentFeedbackPage.notAuthorized")
            : status === 404
              ? t("studentFeedbackPage.submissionNotFound")
              : t("studentFeedbackPage.somethingWrong")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {status === 403
            ? t("studentFeedbackPage.notAuthorizedMessage")
            : status === 404
              ? t("studentFeedbackPage.submissionNotFoundMessage")
              : t("studentFeedbackPage.somethingWrongMessage")}
        </p>
        <Button
          variant="outline"
          onClick={() => navigate(`/${centerId}/dashboard`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("studentFeedbackPage.backToDashboard")}
        </Button>
      </div>
    );
  }

  const data = feedbackData?.data;
  if (!data) return null;

  const feedback = data.feedback;
  const submission = data.submission;
  const comments = data.teacherComments ?? [];
  const history = historyData?.data ?? [];

  const skill = (submission as { exerciseSkill?: string }).exerciseSkill ?? "WRITING";

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 pb-16">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(`/${centerId}/dashboard`)}
        className="mb-2"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        {t("studentFeedbackPage.back")}
      </Button>

      {/* Sticky score header */}
      <div className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <StudentScoreDisplay
          overallScore={feedback?.overallScore ?? null}
          criteriaScores={
            (feedback?.criteriaScores as Record<string, number> | null) ?? null
          }
          skill={skill}
        />
      </div>

      {/* Submission history */}
      {history.length > 0 && (
        <SubmissionHistoryPanel
          history={history as Array<{ id: string; submittedAt: string | null; score: number | null; status: string }>}
          currentSubmissionId={submissionId ?? ""}
        />
      )}

      {/* Student work with inline feedback */}
      <div>
        <h3 className="mb-3 text-sm font-medium">{t("studentFeedbackPage.yourResponse")}</h3>
        <StudentFeedbackContent
          answers={
            (submission?.answers as Array<{
              id: string;
              questionId?: string;
              answer: Record<string, unknown> | null;
            }>) ?? []
          }
          feedbackItems={
            (feedback?.items as Array<{
              id: string;
              type: string;
              content: string;
              startOffset?: number | null;
              endOffset?: number | null;
              originalContextSnippet?: string | null;
              suggestedFix?: string | null;
              severity?: string | null;
            }>) ?? []
          }
          teacherComments={
            (comments as Array<{
              id: string;
              content: string;
              startOffset: number | null;
              endOffset: number | null;
              authorName: string;
            }>) ?? []
          }
          skill={skill}
        />
      </div>

      {/* General feedback section */}
      <StudentCommentsList
        feedbackItems={
          (feedback?.items as Array<{
            id: string;
            type: string;
            content: string;
            startOffset?: number | null;
            endOffset?: number | null;
            createdAt: string;
          }>) ?? []
        }
        teacherComments={
          (comments as Array<{
            id: string;
            content: string;
            startOffset: number | null;
            endOffset: number | null;
            authorName: string;
            authorAvatarUrl?: string | null;
            createdAt: string;
          }>) ?? []
        }
        generalFeedback={feedback?.generalFeedback ?? null}
      />
    </div>
  );
}

function FeedbackSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  );
}
