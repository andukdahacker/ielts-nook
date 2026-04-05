import { z } from "zod";
import { createResponseSchema } from "./response.js";

// --- Enums ---

export const GradingJobStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
]);
export type GradingJobStatus = z.infer<typeof GradingJobStatusSchema>;

export const ErrorCategorySchema = z.enum([
  "api_timeout",
  "rate_limit",
  "invalid_response",
  "validation_error",
  "other",
]);
export type ErrorCategory = z.infer<typeof ErrorCategorySchema>;

export const AnalysisStatusSchema = z.enum([
  "not_applicable",
  "analyzing",
  "ready",
  "failed",
]);
export type AnalysisStatus = z.infer<typeof AnalysisStatusSchema>;

export const FeedbackItemTypeSchema = z.enum([
  "grammar",
  "vocabulary",
  "coherence",
  "score_suggestion",
  "general",
]);
export type FeedbackItemType = z.infer<typeof FeedbackItemTypeSchema>;

export const FeedbackSeveritySchema = z.enum([
  "error",
  "warning",
  "suggestion",
]);
export type FeedbackSeverity = z.infer<typeof FeedbackSeveritySchema>;

export const CommentVisibilitySchema = z.enum(["private", "student_facing"]);
export type CommentVisibility = z.infer<typeof CommentVisibilitySchema>;

export const GradingStatusSchema = z.enum([
  "pending_ai",
  "ready",
  "in_progress",
  "graded",
]);
export type GradingStatus = z.infer<typeof GradingStatusSchema>;

// --- GradingJob ---

export const GradingJobSchema = z.object({
  id: z.string(),
  centerId: z.string(),
  submissionId: z.string(),
  status: GradingJobStatusSchema,
  error: z.string().nullable().optional(),
  errorCategory: ErrorCategorySchema.nullable().optional(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
});
export type GradingJob = z.infer<typeof GradingJobSchema>;

// --- AIFeedbackItem ---

export const AIFeedbackItemSchema = z.object({
  id: z.string(),
  centerId: z.string(),
  submissionFeedbackId: z.string(),
  questionId: z.string().nullable().optional(),
  type: FeedbackItemTypeSchema,
  content: z.string(),
  startOffset: z.number().int().nullable().optional(),
  endOffset: z.number().int().nullable().optional(),
  originalContextSnippet: z.string().nullable().optional(),
  suggestedFix: z.string().nullable().optional(),
  severity: FeedbackSeveritySchema.nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  isApproved: z.boolean().nullable().optional(),
  approvedAt: z.union([z.date(), z.string()]).nullable().optional(),
  teacherOverrideText: z.string().nullable().optional(),
  createdAt: z.union([z.date(), z.string()]),
});
export type AIFeedbackItem = z.infer<typeof AIFeedbackItemSchema>;

// --- SubmissionFeedback ---

export const CriteriaScoresSchema = z.object({
  taskAchievement: z.number().min(0).max(9).optional(),
  coherence: z.number().min(0).max(9).optional(),
  lexicalResource: z.number().min(0).max(9).optional(),
  grammaticalRange: z.number().min(0).max(9).optional(),
  fluency: z.number().min(0).max(9).optional(),
  pronunciation: z.number().min(0).max(9).optional(),
});
export type CriteriaScores = z.infer<typeof CriteriaScoresSchema>;

export const SubmissionFeedbackSchema = z.object({
  id: z.string(),
  centerId: z.string(),
  submissionId: z.string(),
  overallScore: z.number().min(0).max(9).nullable().optional(),
  criteriaScores: CriteriaScoresSchema.nullable().optional(),
  generalFeedback: z.string().nullable().optional(),
  teacherFinalScore: z.number().min(0).max(9).nullable().optional(),
  teacherCriteriaScores: CriteriaScoresSchema.nullable().optional(),
  teacherGeneralFeedback: z.string().nullable().optional(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
  items: z.array(AIFeedbackItemSchema).optional(),
});
export type SubmissionFeedback = z.infer<typeof SubmissionFeedbackSchema>;

// --- TeacherComment ---

export const TeacherCommentSchema = z.object({
  id: z.string(),
  centerId: z.string(),
  submissionId: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  authorAvatarUrl: z.string().nullable(),
  content: z.string(),
  startOffset: z.number().int().nullable(),
  endOffset: z.number().int().nullable(),
  originalContextSnippet: z.string().nullable(),
  visibility: CommentVisibilitySchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TeacherComment = z.infer<typeof TeacherCommentSchema>;

export const CreateTeacherCommentSchema = z
  .object({
    content: z.string().trim().min(1).max(5000),
    startOffset: z.number().int().nullable().optional(),
    endOffset: z.number().int().nullable().optional(),
    originalContextSnippet: z.string().nullable().optional(),
    visibility: CommentVisibilitySchema.default("student_facing"),
  })
  .refine(
    (data) => {
      const hasStart =
        data.startOffset !== null && data.startOffset !== undefined;
      const hasEnd = data.endOffset !== null && data.endOffset !== undefined;
      return hasStart === hasEnd;
    },
    {
      message:
        "Both startOffset and endOffset must be provided together, or both must be null/omitted",
    },
  );
export type CreateTeacherComment = z.infer<typeof CreateTeacherCommentSchema>;

export const UpdateTeacherCommentSchema = z
  .object({
    content: z.string().trim().min(1).max(5000).optional(),
    visibility: CommentVisibilitySchema.optional(),
  })
  .refine((data) => data.content !== undefined || data.visibility !== undefined, {
    message: "At least one field must be provided",
  });
export type UpdateTeacherComment = z.infer<typeof UpdateTeacherCommentSchema>;

export const TeacherCommentResponseSchema = createResponseSchema(
  TeacherCommentSchema,
);
export type TeacherCommentResponse = z.infer<
  typeof TeacherCommentResponseSchema
>;

export const TeacherCommentListResponseSchema = createResponseSchema(
  z.array(TeacherCommentSchema),
);
export type TeacherCommentListResponse = z.infer<
  typeof TeacherCommentListResponseSchema
>;

// --- AI Response Schema (for Gemini structured output) ---

export const AIHighlightSchema = z.object({
  type: FeedbackItemTypeSchema,
  startOffset: z.number().int(),
  endOffset: z.number().int(),
  content: z.string(),
  suggestedFix: z.string().optional(),
  severity: FeedbackSeveritySchema,
  confidence: z.number().min(0).max(1),
  originalContextSnippet: z.string(),
});
export type AIHighlight = z.infer<typeof AIHighlightSchema>;

export const AIGradingResponseSchema = z.object({
  overallScore: z.number().min(0).max(9),
  criteriaScores: CriteriaScoresSchema,
  generalFeedback: z.string(),
  highlights: z.array(AIHighlightSchema),
});
export type AIGradingResponse = z.infer<typeof AIGradingResponseSchema>;

// --- API Request Schemas ---

export const GradingQueueFiltersSchema = z.object({
  classId: z.string().optional(),
  assignmentId: z.string().optional(),
  status: AnalysisStatusSchema.optional(),
  gradingStatus: GradingStatusSchema.optional(),
  sortBy: z
    .enum(["submittedAt", "dueDate", "studentName"])
    .default("submittedAt")
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc").optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type GradingQueueFilters = z.infer<typeof GradingQueueFiltersSchema>;

export const TogglePrioritySchema = z.object({
  isPriority: z.boolean(),
});
export type TogglePriority = z.infer<typeof TogglePrioritySchema>;

export const QueueProgressSchema = z.object({
  graded: z.number().int(),
  total: z.number().int(),
});
export type QueueProgress = z.infer<typeof QueueProgressSchema>;

export const TriggerAnalysisRequestSchema = z.object({
  submissionId: z.string().min(1),
});
export type TriggerAnalysisRequest = z.infer<typeof TriggerAnalysisRequestSchema>;

// --- API Response Schemas ---

export const GradingQueueItemSchema = z.object({
  submissionId: z.string(),
  studentName: z.string().nullable(),
  assignmentTitle: z.string().nullable(),
  exerciseSkill: z.string(),
  submittedAt: z.string().nullable(),
  analysisStatus: AnalysisStatusSchema,
  failureReason: z.string().nullable().optional(),
  assignmentId: z.string(),
  classId: z.string().nullable(),
  className: z.string().nullable(),
  dueDate: z.string().nullable(),
  isPriority: z.boolean(),
  gradingStatus: GradingStatusSchema,
});
export type GradingQueueItem = z.infer<typeof GradingQueueItemSchema>;

export const GradingQueueResponseSchema = createResponseSchema(
  z.object({
    items: z.array(GradingQueueItemSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    progress: QueueProgressSchema.nullable().optional(),
  }),
);
export type GradingQueueResponse = z.infer<typeof GradingQueueResponseSchema>;

export const SubmissionAnswerSchema = z.object({
  id: z.string(),
  questionId: z.string().optional(),
  answer: z.record(z.string(), z.unknown()).nullable().optional(),
  score: z.number().nullable().optional(),
});

export const SubmissionDetailSchema = z.object({
  submission: z.object({
    id: z.string(),
    centerId: z.string(),
    assignmentId: z.string(),
    studentId: z.string(),
    status: z.string(),
    submittedAt: z.string().nullable(),
    answers: z.array(SubmissionAnswerSchema),
  }),
  analysisStatus: AnalysisStatusSchema,
  feedback: SubmissionFeedbackSchema.nullable().optional(),
  teacherComments: z.array(TeacherCommentSchema).optional(),
});
export type SubmissionDetail = z.infer<typeof SubmissionDetailSchema>;

export const SubmissionDetailResponseSchema = createResponseSchema(SubmissionDetailSchema);
export type SubmissionDetailResponse = z.infer<typeof SubmissionDetailResponseSchema>;

export const SubmissionFeedbackResponseSchema = createResponseSchema(SubmissionFeedbackSchema);
export type SubmissionFeedbackResponse = z.infer<typeof SubmissionFeedbackResponseSchema>;

export const GradingJobResponseSchema = createResponseSchema(GradingJobSchema);
export type GradingJobResponse = z.infer<typeof GradingJobResponseSchema>;

// --- Student Feedback Schemas (Story 5.6) ---

export const SubmissionHistoryItemSchema = z.object({
  id: z.string(),
  submittedAt: z.string().nullable(),
  score: z.number().nullable(),
  status: z.string(),
});
export type SubmissionHistoryItem = z.infer<typeof SubmissionHistoryItemSchema>;

export const StudentFeedbackDataSchema = z.object({
  submission: z.object({
    id: z.string(),
    assignmentId: z.string(),
    studentId: z.string(),
    status: z.string(),
    submittedAt: z.string().nullable(),
    answers: z.array(SubmissionAnswerSchema),
    exerciseSkill: z.string(),
  }),
  feedback: z
    .object({
      overallScore: z.number().nullable(),
      criteriaScores: CriteriaScoresSchema.nullable(),
      generalFeedback: z.string().nullable(),
      items: z.array(AIFeedbackItemSchema),
    })
    .nullable(),
  teacherComments: z.array(TeacherCommentSchema),
});
export type StudentFeedbackData = z.infer<typeof StudentFeedbackDataSchema>;

export const StudentFeedbackResponseSchema = createResponseSchema(
  StudentFeedbackDataSchema,
);
export type StudentFeedbackResponse = z.infer<
  typeof StudentFeedbackResponseSchema
>;

export const SubmissionHistoryResponseSchema = createResponseSchema(
  z.array(SubmissionHistoryItemSchema),
);
export type SubmissionHistoryResponse = z.infer<
  typeof SubmissionHistoryResponseSchema
>;

// --- Feedback Approval Schemas (Story 5.4) ---

export const ApproveFeedbackItemSchema = z.object({
  isApproved: z.boolean(),
  teacherOverrideText: z.string().max(2000).nullable().optional(),
});
export type ApproveFeedbackItem = z.infer<typeof ApproveFeedbackItemSchema>;

export const BulkApproveFeedbackItemsSchema = z.object({
  action: z.enum(["approve_remaining", "reject_remaining"]),
});
export type BulkApproveFeedbackItems = z.infer<typeof BulkApproveFeedbackItemsSchema>;

export const FinalizeGradingSchema = z.object({
  teacherFinalScore: z.number().min(0).max(9).step(0.5).nullable().optional(),
  teacherCriteriaScores: CriteriaScoresSchema.nullable().optional(),
  teacherGeneralFeedback: z.string().max(5000).trim().nullable().optional(),
});
export type FinalizeGrading = z.infer<typeof FinalizeGradingSchema>;

export const FinalizeGradingResponseSchema = createResponseSchema(
  z.object({
    submissionId: z.string(),
    status: z.literal("GRADED"),
    teacherFinalScore: z.number().nullable(),
    nextSubmissionId: z.string().nullable(),
  }),
);
export type FinalizeGradingResponse = z.infer<typeof FinalizeGradingResponseSchema>;

// --- Unlock Submission Schemas (Story 11.7) ---

export const UnlockSubmissionResponseSchema = createResponseSchema(
  z.object({
    id: z.string(),
    status: z.literal("IN_PROGRESS"),
  }),
);
export type UnlockSubmissionResponse = z.infer<typeof UnlockSubmissionResponseSchema>;
