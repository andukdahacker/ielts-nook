import { Badge } from "@workspace/ui/components/badge";
import { Bot, User } from "lucide-react";
import { useTranslation } from "react-i18next";

interface FeedbackItem {
  id: string;
  type: string;
  content: string;
  startOffset?: number | null;
  endOffset?: number | null;
  createdAt: string;
}

interface TeacherComment {
  id: string;
  content: string;
  startOffset: number | null;
  endOffset: number | null;
  authorName: string;
  authorAvatarUrl?: string | null;
  createdAt: string;
}

interface StudentCommentsListProps {
  feedbackItems: FeedbackItem[];
  teacherComments: TeacherComment[];
  generalFeedback: string | null;
}

export function StudentCommentsList({
  feedbackItems,
  teacherComments,
  generalFeedback,
}: StudentCommentsListProps) {
  const { t } = useTranslation("grading");
  // Unanchored AI items (no offsets)
  const unanchoredAI = feedbackItems.filter(
    (item) => item.startOffset == null && item.endOffset == null,
  );

  // Unanchored teacher comments (no offsets)
  const unanchoredTeacher = teacherComments.filter(
    (c) => c.startOffset == null && c.endOffset == null,
  );

  const hasContent =
    generalFeedback || unanchoredAI.length > 0 || unanchoredTeacher.length > 0;

  if (!hasContent) return null;

  // Combine and sort chronologically
  const allItems: Array<{
    id: string;
    type: "ai" | "teacher";
    content: string;
    createdAt: string;
    authorName?: string;
  }> = [
    ...unanchoredAI.map((item) => ({
      id: item.id,
      type: "ai" as const,
      content: item.content,
      createdAt: item.createdAt,
    })),
    ...unanchoredTeacher.map((c) => ({
      id: c.id,
      type: "teacher" as const,
      content: c.content,
      createdAt: c.createdAt,
      authorName: c.authorName,
    })),
  ].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">{t("studentComments.generalFeedback")}</h3>

      {generalFeedback && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm whitespace-pre-wrap">{generalFeedback}</p>
        </div>
      )}

      {allItems.map((item) => (
        <div
          key={item.id}
          className="flex gap-3 rounded-lg border p-3"
        >
          <div className="shrink-0 mt-0.5">
            {item.type === "ai" ? (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Bot className="h-3.5 w-3.5 text-blue-600" />
              </div>
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <User className="h-3.5 w-3.5 text-emerald-600" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              {item.type === "ai" ? (
                <Badge variant="secondary" className="text-[10px]">
                  {t("studentComments.ai")}
                </Badge>
              ) : (
                <>
                  <Badge className="bg-emerald-600 text-[10px]">{t("studentComments.teacher")}</Badge>
                  {item.authorName && (
                    <span className="text-xs text-muted-foreground">
                      {item.authorName}
                    </span>
                  )}
                </>
              )}
            </div>
            <p className="text-sm whitespace-pre-wrap">{item.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
