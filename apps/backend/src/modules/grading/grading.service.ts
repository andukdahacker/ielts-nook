import { PrismaClient, getTenantedClient } from "@workspace/db";
import type { AnalysisStatus, ApproveFeedbackItem, BulkApproveFeedbackItems, CommentVisibility, CreateTeacherComment, FinalizeGrading, GradingQueueFilters, GradingStatus, UpdateTeacherComment } from "@workspace/types";
import { AppError } from "../../errors/app-error.js";
import { inngest } from "../inngest/client.js";

function mapCommentWithAuthor(comment: { author: { name: string | null; avatarUrl: string | null }; [key: string]: unknown }) {
  const { author, ...rest } = comment;
  return {
    ...rest,
    authorName: author.name ?? "Unknown",
    authorAvatarUrl: author.avatarUrl,
  };
}

export class GradingService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Resolve Firebase UID to user ID and verify teacher-class access.
   * Teachers can only access submissions from classes they teach.
   * ADMIN/OWNER have full access within their tenant.
   */
  private async verifyAccess(
    db: ReturnType<typeof getTenantedClient>,
    firebaseUid: string,
    classTeacherId: string | null | undefined,
  ): Promise<string> {
    const authAccount = await db.authAccount.findUniqueOrThrow({
      where: { provider_providerUserId: { provider: "FIREBASE", providerUserId: firebaseUid } },
    });
    const userId = authAccount.userId;

    // Teachers can only access submissions from classes they teach
    // ADMIN/OWNER have full access within tenant (RBAC middleware already verified role)
    if (!classTeacherId || classTeacherId !== userId) {
      const membership = await db.centerMembership.findFirst({
        where: { userId },
        select: { role: true },
      });
      if (!membership || (membership.role !== "ADMIN" && membership.role !== "OWNER")) {
        throw AppError.forbidden("You can only access submissions from your classes");
      }
    }

    return userId;
  }

  /**
   * Resolve Firebase UID to internal user ID and role. No RBAC enforcement.
   */
  private async resolveUser(
    db: ReturnType<typeof getTenantedClient>,
    firebaseUid: string,
  ): Promise<{ userId: string; role: string }> {
    const authAccount = await db.authAccount.findUniqueOrThrow({
      where: { provider_providerUserId: { provider: "FIREBASE", providerUserId: firebaseUid } },
    });
    const membership = await db.centerMembership.findFirst({
      where: { userId: authAccount.userId },
      select: { role: true },
    });
    if (!membership) {
      throw AppError.forbidden("User has no membership in this center");
    }
    return { userId: authAccount.userId, role: membership.role };
  }

  async getStudentFeedback(centerId: string, submissionId: string, firebaseUid: string): Promise<{
    submission: { id: string; assignmentId: string; studentId: string; status: string; submittedAt: Date | null; answers: Array<Record<string, unknown>>; exerciseSkill: string };
    feedback: { overallScore: number | null; criteriaScores: Record<string, number> | null; generalFeedback: string | null; items: Array<Record<string, unknown>> } | null;
    teacherComments: Array<Record<string, unknown>>;
  }> {
    const db = getTenantedClient(this.prisma, centerId);
    const { userId, role } = await this.resolveUser(db, firebaseUid);

    const submission = await db.submission.findUnique({
      where: { id: submissionId },
      include: {
        answers: true,
        assignment: {
          include: {
            exercise: { select: { skill: true } },
          },
        },
        feedback: { include: { items: true } },
        teacherComments: {
          include: { author: { select: { name: true, avatarUrl: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!submission) throw AppError.notFound("Submission not found");

    // Only return feedback for graded submissions
    if (submission.status !== "GRADED") {
      throw AppError.badRequest("Feedback not yet available");
    }

    // STUDENT role: verify ownership
    if (role === "STUDENT" && submission.studentId !== userId) {
      throw AppError.forbidden("Not authorized to view this submission");
    }

    // Filter feedback items: only approved
    const approvedItems = submission.feedback?.items.filter(
      (item) => item.isApproved === true,
    ) ?? [];

    // Filter teacher comments: only student_facing
    const studentFacingComments = submission.teacherComments
      .filter((c) => c.visibility === "student_facing")
      .map(mapCommentWithAuthor);

    // Build response with teacher override scores preferred
    const feedback = submission.feedback
      ? {
          overallScore: submission.feedback.teacherFinalScore ?? submission.feedback.overallScore,
          criteriaScores: (submission.feedback.teacherCriteriaScores ?? submission.feedback.criteriaScores) as Record<string, number> | null,
          generalFeedback: submission.feedback.teacherGeneralFeedback ?? submission.feedback.generalFeedback,
          items: approvedItems,
        }
      : null;

    return {
      submission: {
        id: submission.id,
        assignmentId: submission.assignmentId,
        studentId: submission.studentId,
        status: submission.status,
        submittedAt: submission.submittedAt,
        answers: submission.answers,
        exerciseSkill: submission.assignment.exercise.skill,
      },
      feedback,
      teacherComments: studentFacingComments,
    };
  }

  async getSubmissionHistory(centerId: string, submissionId: string, firebaseUid: string) {
    const db = getTenantedClient(this.prisma, centerId);
    const { userId, role } = await this.resolveUser(db, firebaseUid);

    // First get the submission to find assignmentId + studentId
    const submission = await db.submission.findUnique({
      where: { id: submissionId },
      select: { assignmentId: true, studentId: true },
    });
    if (!submission) throw AppError.notFound("Submission not found");

    // STUDENT role: verify ownership
    if (role === "STUDENT" && submission.studentId !== userId) {
      throw AppError.forbidden("Not authorized to view this submission");
    }

    const submissions = await db.submission.findMany({
      where: {
        assignmentId: submission.assignmentId,
        studentId: submission.studentId,
        status: "GRADED",
      },
      include: {
        feedback: { select: { teacherFinalScore: true, overallScore: true } },
      },
      orderBy: { submittedAt: "desc" },
    });

    return submissions.map((s) => ({
      id: s.id,
      submittedAt: s.submittedAt,
      score: s.feedback?.teacherFinalScore ?? s.feedback?.overallScore ?? null,
      status: s.status,
    }));
  }

  async triggerAnalysis(centerId: string, submissionId: string, firebaseUid: string) {
    const db = getTenantedClient(this.prisma, centerId);

    const submission = await db.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: {
            exercise: { select: { skill: true } },
            class: { select: { teacherId: true } },
          },
        },
      },
    });
    if (!submission) throw AppError.notFound("Submission not found");

    await this.verifyAccess(db, firebaseUid, submission.assignment.class?.teacherId);

    const skill = submission.assignment.exercise.skill;
    if (skill !== "WRITING" && skill !== "SPEAKING") {
      throw AppError.badRequest(
        "AI analysis is only available for Writing and Speaking submissions",
      );
    }

    if (submission.status !== "SUBMITTED" && submission.status !== "AI_PROCESSING") {
      throw AppError.badRequest("Submission must be in SUBMITTED status to trigger analysis");
    }

    // Create or replace grading job
    const existingJob = await db.gradingJob.findUnique({
      where: { submissionId },
    });

    let gradingJob;
    if (existingJob) {
      gradingJob = await db.gradingJob.update({
        where: { id: existingJob.id },
        data: {
          status: "pending",
          error: null,
          errorCategory: null,
        },
      });
    } else {
      gradingJob = await db.gradingJob.create({
        data: { centerId, submissionId, status: "pending" },
      });
    }

    await inngest.send({
      name: "grading/analyze-submission",
      data: {
        jobId: gradingJob.id,
        submissionId,
        centerId,
      },
    });

    return gradingJob;
  }

  async retriggerAnalysis(centerId: string, submissionId: string, firebaseUid: string) {
    const db = getTenantedClient(this.prisma, centerId);

    const submission = await db.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: {
            exercise: { select: { skill: true } },
            class: { select: { teacherId: true } },
          },
        },
      },
    });
    if (!submission) throw AppError.notFound("Submission not found");

    await this.verifyAccess(db, firebaseUid, submission.assignment.class?.teacherId);

    // Validate skill BEFORE deleting data to prevent data loss on invalid requests
    const skill = submission.assignment.exercise.skill;
    if (skill !== "WRITING" && skill !== "SPEAKING") {
      throw AppError.badRequest(
        "AI analysis is only available for Writing and Speaking submissions",
      );
    }

    // Delete existing feedback so AI can regenerate
    await db.submissionFeedback.deleteMany({ where: { submissionId } });

    return this.triggerAnalysis(centerId, submissionId, firebaseUid);
  }

  async getAnalysisResults(centerId: string, submissionId: string, firebaseUid: string): Promise<{
    submission: Record<string, unknown>;
    analysisStatus: AnalysisStatus;
    feedback: Record<string, unknown> | null;
    teacherComments: Array<Record<string, unknown>>;
  }> {
    const db = getTenantedClient(this.prisma, centerId);

    const submission = await db.submission.findUnique({
      where: { id: submissionId },
      include: {
        answers: true,
        assignment: {
          include: {
            exercise: { select: { title: true, skill: true } },
            class: { select: { id: true, name: true, teacherId: true } },
          },
        },
      },
    });
    if (!submission) throw AppError.notFound("Submission not found");

    await this.verifyAccess(db, firebaseUid, submission.assignment.class?.teacherId);

    const gradingJob = await db.gradingJob.findUnique({
      where: { submissionId },
    });

    const feedback = await db.submissionFeedback.findUnique({
      where: { submissionId },
      include: { items: true },
    });

    const teacherComments = await db.teacherComment.findMany({
      where: { submissionId },
      include: { author: { select: { name: true, avatarUrl: true } } },
      orderBy: { createdAt: "asc" },
    });

    const mappedComments = teacherComments.map(mapCommentWithAuthor);

    const analysisStatus = deriveAnalysisStatus(
      submission.assignment.exercise.skill,
      gradingJob?.status ?? null,
    );

    return {
      submission: submission as unknown as Record<string, unknown>,
      analysisStatus,
      feedback: feedback as unknown as Record<string, unknown> | null,
      teacherComments: mappedComments as unknown as Array<Record<string, unknown>>,
    };
  }

  async getGradingQueue(centerId: string, firebaseUid: string, filters: GradingQueueFilters) {
    const db = getTenantedClient(this.prisma, centerId);

    const { userId, role } = await this.resolveUser(db, firebaseUid);
    const isPrivileged = role === "ADMIN" || role === "OWNER";

    const { classId, assignmentId, status, gradingStatus, sortBy = "submittedAt", sortOrder = "asc", page, limit } = filters;

    // Build class filter: TEACHER can only see their own classes,
    // ADMIN/OWNER have full access within the tenant
    const classFilter = isPrivileged
      ? (classId ? { classId } : {})
      : (classId
          ? { classId, class: { teacherId: userId } }
          : { class: { teacherId: userId } });

    const where: Record<string, unknown> = {
      assignment: {
        ...(assignmentId ? { id: assignmentId } : {}),
        ...classFilter,
        exercise: {
          skill: { in: ["WRITING", "SPEAKING"] },
        },
      },
      status: { in: ["SUBMITTED", "AI_PROCESSING", "GRADED"] },
    };

    const include = {
      student: { select: { name: true } },
      assignment: {
        select: {
          id: true,
          dueDate: true,
          classId: true,
          class: { select: { name: true } },
          exercise: { select: { title: true, skill: true } },
        },
      },
      gradingJob: { select: { status: true, error: true, errorCategory: true } },
      feedback: {
        select: {
          items: {
            where: { isApproved: { not: null } },
            select: { id: true },
            take: 1,
          },
        },
      },
      _count: { select: { teacherComments: true } },
    };

    // Fetch all items — gradingStatus derivation and priority sorting require in-memory processing
    const allSubmissions = await db.submission.findMany({
      where,
      include,
    });

    // Map and derive statuses
    let allItems = allSubmissions.map((s) => {
      const hasTeacherAction =
        (s.feedback?.items?.length ?? 0) > 0 || s._count.teacherComments > 0;

      return {
        submissionId: s.id,
        studentName: s.student.name,
        assignmentTitle: s.assignment.exercise.title,
        exerciseSkill: s.assignment.exercise.skill,
        submittedAt: s.submittedAt?.toISOString() ?? null,
        analysisStatus: deriveAnalysisStatus(
          s.assignment.exercise.skill,
          s.gradingJob?.status ?? null,
        ),
        failureReason: s.gradingJob?.error ?? null,
        assignmentId: s.assignment.id,
        classId: s.assignment.classId,
        className: s.assignment.class?.name ?? null,
        dueDate: s.assignment.dueDate?.toISOString() ?? null,
        isPriority: s.isPriority,
        gradingStatus: deriveGradingStatus(
          s.status,
          s.gradingJob?.status ?? null,
          hasTeacherAction,
        ),
      };
    });

    // Apply analysisStatus filter
    if (status) {
      allItems = allItems.filter((item) => item.analysisStatus === status);
    }

    // Apply gradingStatus filter
    if (gradingStatus) {
      allItems = allItems.filter((item) => item.gradingStatus === gradingStatus);
    }

    // Sort: priority first, then by selected sort field
    allItems.sort((a, b) => {
      // Priority items always come first
      if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1;
      // Then sort by selected field
      return compareBySortField(a, b, sortBy, sortOrder);
    });

    const total = allItems.length;
    const items = allItems.slice((page - 1) * limit, page * limit);

    // Compute progress when assignmentId filter is active
    let progress: { graded: number; total: number } | null = null;
    if (assignmentId) {
      const progressQuery = await db.submission.groupBy({
        by: ["status"],
        where: { assignmentId },
        _count: { id: true },
      });
      const graded = progressQuery.find((g) => g.status === "GRADED")?._count.id ?? 0;
      const progressTotal = progressQuery.reduce((sum, g) => sum + g._count.id, 0);
      progress = { graded, total: progressTotal };
    }

    return { items, total, page, limit, progress };
  }

  async togglePriority(
    centerId: string,
    submissionId: string,
    firebaseUid: string,
    isPriority: boolean,
  ) {
    const db = getTenantedClient(this.prisma, centerId);

    const submission = await db.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: { class: { select: { teacherId: true } } },
        },
      },
    });
    if (!submission) throw AppError.notFound("Submission not found");

    await this.verifyAccess(db, firebaseUid, submission.assignment.class?.teacherId);

    await db.submission.update({
      where: { id: submissionId },
      data: { isPriority },
    });

    return { submissionId, isPriority };
  }

  async createComment(
    centerId: string,
    submissionId: string,
    firebaseUid: string,
    data: CreateTeacherComment,
  ) {
    const db = getTenantedClient(this.prisma, centerId);

    const submission = await db.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: { class: { select: { teacherId: true } } },
        },
      },
    });
    if (!submission) throw AppError.notFound("Submission not found");

    const authorId = await this.verifyAccess(db, firebaseUid, submission.assignment.class?.teacherId);

    if (
      data.startOffset !== null &&
      data.startOffset !== undefined &&
      data.endOffset !== null &&
      data.endOffset !== undefined
    ) {
      if (data.startOffset < 0 || data.endOffset < 0) {
        throw AppError.badRequest("Offsets must be non-negative");
      }
      if (data.endOffset <= data.startOffset) {
        throw AppError.badRequest("endOffset must be greater than startOffset");
      }
    }

    const comment = await db.teacherComment.create({
      data: {
        centerId,
        submissionId,
        authorId,
        content: data.content,
        startOffset: data.startOffset ?? null,
        endOffset: data.endOffset ?? null,
        originalContextSnippet: data.originalContextSnippet ?? null,
        visibility: data.visibility,
      },
      include: { author: { select: { name: true, avatarUrl: true } } },
    });

    return mapCommentWithAuthor(comment);
  }

  async getComments(
    centerId: string,
    submissionId: string,
    firebaseUid: string,
    visibility?: CommentVisibility,
  ) {
    const db = getTenantedClient(this.prisma, centerId);

    const submission = await db.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: { class: { select: { teacherId: true } } },
        },
      },
    });
    if (!submission) throw AppError.notFound("Submission not found");

    await this.verifyAccess(db, firebaseUid, submission.assignment.class?.teacherId);

    const comments = await db.teacherComment.findMany({
      where: {
        submissionId,
        ...(visibility ? { visibility } : {}),
      },
      include: { author: { select: { name: true, avatarUrl: true } } },
      orderBy: { createdAt: "asc" },
    });

    return comments.map(mapCommentWithAuthor);
  }

  async updateComment(
    centerId: string,
    submissionId: string,
    commentId: string,
    firebaseUid: string,
    data: UpdateTeacherComment,
  ) {
    const db = getTenantedClient(this.prisma, centerId);

    const submission = await db.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: { class: { select: { teacherId: true } } },
        },
      },
    });
    if (!submission) throw AppError.notFound("Submission not found");

    const userId = await this.verifyAccess(db, firebaseUid, submission.assignment.class?.teacherId);

    const comment = await db.teacherComment.findFirst({
      where: { id: commentId, submissionId },
    });
    if (!comment) throw AppError.notFound("Comment not found");
    if (comment.authorId !== userId) {
      throw AppError.forbidden("You can only edit your own comments");
    }

    const updated = await db.teacherComment.update({
      where: { id: commentId },
      data: {
        ...(data.content !== undefined ? { content: data.content } : {}),
        ...(data.visibility !== undefined ? { visibility: data.visibility } : {}),
      },
      include: { author: { select: { name: true, avatarUrl: true } } },
    });

    return mapCommentWithAuthor(updated);
  }

  async deleteComment(
    centerId: string,
    submissionId: string,
    commentId: string,
    firebaseUid: string,
  ) {
    const db = getTenantedClient(this.prisma, centerId);

    const submission = await db.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: { class: { select: { teacherId: true } } },
        },
      },
    });
    if (!submission) throw AppError.notFound("Submission not found");

    const userId = await this.verifyAccess(db, firebaseUid, submission.assignment.class?.teacherId);

    const comment = await db.teacherComment.findFirst({
      where: { id: commentId, submissionId },
    });
    if (!comment) throw AppError.notFound("Comment not found");
    if (comment.authorId !== userId) {
      throw AppError.forbidden("You can only delete your own comments");
    }

    await db.teacherComment.delete({ where: { id: commentId } });
  }

  async getSubmissionFeedback(centerId: string, submissionId: string, firebaseUid: string): Promise<Record<string, unknown>> {
    const db = getTenantedClient(this.prisma, centerId);

    const submission = await db.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: {
            class: { select: { teacherId: true } },
          },
        },
      },
    });
    if (!submission) throw AppError.notFound("Submission not found");

    await this.verifyAccess(db, firebaseUid, submission.assignment.class?.teacherId);

    const feedback = await db.submissionFeedback.findUnique({
      where: { submissionId },
      include: { items: true },
    });
    if (!feedback) throw AppError.notFound("No feedback available for this submission");

    return feedback as unknown as Record<string, unknown>;
  }

  async approveFeedbackItem(
    centerId: string,
    submissionId: string,
    itemId: string,
    firebaseUid: string,
    data: ApproveFeedbackItem,
  ) {
    const db = getTenantedClient(this.prisma, centerId);

    const submission = await db.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: { class: { select: { teacherId: true } } },
        },
      },
    });
    if (!submission) throw AppError.notFound("Submission not found");

    await this.verifyAccess(db, firebaseUid, submission.assignment.class?.teacherId);

    const item = await db.aIFeedbackItem.findFirst({
      where: {
        id: itemId,
        submissionFeedback: { submissionId },
      },
    });
    if (!item) throw AppError.notFound("Feedback item not found");

    const updated = await db.aIFeedbackItem.update({
      where: { id: itemId },
      data: {
        isApproved: data.isApproved,
        approvedAt: data.isApproved ? new Date() : null,
        teacherOverrideText: data.teacherOverrideText !== undefined ? data.teacherOverrideText : item.teacherOverrideText,
      },
    });

    return updated;
  }

  async bulkApproveFeedbackItems(
    centerId: string,
    submissionId: string,
    firebaseUid: string,
    data: BulkApproveFeedbackItems,
  ) {
    const db = getTenantedClient(this.prisma, centerId);

    const submission = await db.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: { class: { select: { teacherId: true } } },
        },
      },
    });
    if (!submission) throw AppError.notFound("Submission not found");

    await this.verifyAccess(db, firebaseUid, submission.assignment.class?.teacherId);

    const feedback = await db.submissionFeedback.findFirst({
      where: { submissionId },
    });
    if (!feedback) throw AppError.notFound("No feedback found for this submission");

    const result = await db.aIFeedbackItem.updateMany({
      where: {
        submissionFeedbackId: feedback.id,
        isApproved: null,
      },
      data: {
        isApproved: data.action === "approve_remaining",
        approvedAt: data.action === "approve_remaining" ? new Date() : null,
      },
    });

    return { count: result.count };
  }

  async finalizeGrading(
    centerId: string,
    submissionId: string,
    firebaseUid: string,
    data: FinalizeGrading,
  ) {
    const db = getTenantedClient(this.prisma, centerId);

    const submission = await db.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: { class: { select: { teacherId: true } } },
        },
      },
    });
    if (!submission) throw AppError.notFound("Submission not found");

    await this.verifyAccess(db, firebaseUid, submission.assignment.class?.teacherId);

    if (submission.status === "GRADED") {
      throw AppError.conflict("Submission is already graded");
    }
    if (submission.status === "AI_PROCESSING") {
      throw AppError.badRequest("AI analysis is still running. Please wait before finalizing");
    }
    if (submission.status === "IN_PROGRESS") {
      throw AppError.badRequest("Student has not submitted yet");
    }

    const feedback = await db.submissionFeedback.findFirst({
      where: { submissionId },
    });

    // Atomic writes inside transaction — per project-context.md Rule 5
    await this.prisma.$transaction(async (tx) => {
      if (feedback) {
        // Auto-approve remaining pending items
        await tx.aIFeedbackItem.updateMany({
          where: {
            submissionFeedbackId: feedback.id,
            centerId,
            isApproved: null,
          },
          data: { isApproved: true, approvedAt: new Date() },
        });

        // Update teacher scores
        await tx.submissionFeedback.update({
          where: { id: feedback.id, centerId },
          data: {
            teacherFinalScore: data.teacherFinalScore ?? feedback.overallScore,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            teacherCriteriaScores: (data.teacherCriteriaScores ?? feedback.criteriaScores ?? undefined) as any,
            teacherGeneralFeedback: data.teacherGeneralFeedback ?? null,
          },
        });
      }

      // Set submission status to GRADED
      await tx.submission.update({
        where: { id: submissionId, centerId },
        data: { status: "GRADED" },
      });
    });

    // Fire engagement achievement check (fire-and-forget, outside transaction)
    await inngest.send({
      name: "engagement/submission.graded",
      data: {
        studentId: submission.studentId,
        centerId,
        submissionId,
        score: data.teacherFinalScore ?? feedback?.overallScore ?? null,
      },
    });

    // Find next submission in the grading queue
    const nextSubmission = await db.submission.findFirst({
      where: {
        centerId,
        id: { not: submissionId },
        status: "SUBMITTED",
        gradingJob: { status: "completed" },
      },
      orderBy: { submittedAt: "asc" },
      select: { id: true },
    });

    const teacherFinalScore = data.teacherFinalScore ?? feedback?.overallScore ?? null;

    return {
      submissionId,
      status: "GRADED" as const,
      teacherFinalScore,
      nextSubmissionId: nextSubmission?.id ?? null,
    };
  }
  async unlockSubmission(centerId: string, submissionId: string, firebaseUid: string) {
    const db = getTenantedClient(this.prisma, centerId);

    const submission = await db.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: { class: { select: { teacherId: true } } },
        },
      },
    });
    if (!submission) throw AppError.notFound("Submission not found");

    await this.verifyAccess(db, firebaseUid, submission.assignment.class?.teacherId);

    if (submission.status === "IN_PROGRESS") {
      throw AppError.badRequest("Submission is already unlocked");
    }

    // Use $transaction with explicit centerId filters (Rule 5)
    await this.prisma.$transaction(async (tx) => {
      // 1. Delete AIFeedbackItems (FK → SubmissionFeedback)
      const feedback = await tx.submissionFeedback.findFirst({
        where: { submissionId, centerId },
        select: { id: true },
      });
      if (feedback) {
        await tx.aIFeedbackItem.deleteMany({
          where: { submissionFeedbackId: feedback.id, centerId },
        });
        // 2. Delete SubmissionFeedback
        await tx.submissionFeedback.delete({
          where: { id: feedback.id, centerId },
        });
      }

      // 3. Delete TeacherComments
      await tx.teacherComment.deleteMany({
        where: { submissionId, centerId },
      });

      // 4. Delete GradingJob
      await tx.gradingJob.deleteMany({
        where: { submissionId, centerId },
      });

      // 5. Reset StudentAnswer scores (keep answers for student to see)
      await tx.studentAnswer.updateMany({
        where: { submissionId, centerId },
        data: { isCorrect: null, score: null },
      });

      // 6. Reset submission status
      await tx.submission.update({
        where: { id: submissionId, centerId },
        data: { status: "IN_PROGRESS", submittedAt: null, timeSpentSec: 0 },
      });
    });

    return { id: submissionId, status: "IN_PROGRESS" as const };
  }
}

function deriveAnalysisStatus(
  skill: string,
  jobStatus: string | null,
): AnalysisStatus {
  if (skill !== "WRITING" && skill !== "SPEAKING") return "not_applicable";
  if (!jobStatus) return "failed"; // no job exists — trigger failed silently
  if (jobStatus === "pending" || jobStatus === "processing") return "analyzing";
  if (jobStatus === "completed") return "ready";
  if (jobStatus === "failed") return "failed";
  return "analyzing";
}

function deriveGradingStatus(
  submissionStatus: string,
  jobStatus: string | null,
  hasTeacherAction: boolean,
): GradingStatus {
  if (submissionStatus === "GRADED") return "graded";
  if (!jobStatus || jobStatus === "pending" || jobStatus === "processing") return "pending_ai";
  if (jobStatus === "failed") return "pending_ai";
  // jobStatus === "completed"
  return hasTeacherAction ? "in_progress" : "ready";
}

function compareBySortField(
  a: { submittedAt: string | null; dueDate: string | null; studentName: string | null },
  b: { submittedAt: string | null; dueDate: string | null; studentName: string | null },
  sortBy: string,
  sortOrder: string,
): number {
  const dir = sortOrder === "desc" ? -1 : 1;

  if (sortBy === "studentName") {
    const nameA = (a.studentName ?? "").toLowerCase();
    const nameB = (b.studentName ?? "").toLowerCase();
    return dir * nameA.localeCompare(nameB);
  }

  if (sortBy === "dueDate") {
    // Nulls last
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return dir * (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  // Default: submittedAt
  const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
  const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
  return dir * (timeA - timeB);
}
