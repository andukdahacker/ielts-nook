import { Prisma, PrismaClient, getTenantedClient } from "@workspace/db";
import { Storage } from "firebase-admin/storage";
import { AppError } from "../../errors/app-error.js";
import { inngest } from "../inngest/client.js";
import { ModerationService } from "../moderation/moderation.service.js";

/** Question types that can be auto-graded by comparing student answer to correctAnswer */
const AUTO_GRADABLE_TYPES = new Set([
  "R1_MCQ_SINGLE",
  "R2_MCQ_MULTI",
  "R3_TFNG",
  "R4_YNNG",
  "R5_SENTENCE_COMPLETION",
  "R6_SHORT_ANSWER",
  "R7_SUMMARY_WORD_BANK",
  "R8_SUMMARY_PASSAGE",
  "R9_MATCHING_HEADINGS",
  "R10_MATCHING_INFORMATION",
  "R11_MATCHING_FEATURES",
  "R12_MATCHING_SENTENCE_ENDINGS",
  "R13_NOTE_TABLE_FLOWCHART",
  "R14_DIAGRAM_LABELLING",
  "L1_FORM_NOTE_TABLE",
  "L2_MCQ",
  "L3_MATCHING",
  "L4_MAP_PLAN_LABELLING",
  "L5_SENTENCE_COMPLETION",
  "L6_SHORT_ANSWER",
]);

const SUBMISSION_INCLUDE = {
  answers: true,
};

export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly firebaseStorage: Storage,
    private readonly bucketName: string,
  ) {}

  async startSubmission(centerId: string, assignmentId: string, firebaseUid: string) {
    const db = getTenantedClient(this.prisma, centerId);

    const authAccount = await db.authAccount.findUniqueOrThrow({
      where: { provider_providerUserId: { provider: "FIREBASE", providerUserId: firebaseUid } },
    });
    const studentId = authAccount.userId;

    // Verify student is assigned to this assignment
    const studentAssignment = await db.assignmentStudent.findFirst({
      where: { assignmentId, studentId },
    });
    if (!studentAssignment) {
      throw AppError.notFound("Assignment not found or you are not assigned to it");
    }

    // Verify assignment is OPEN
    const assignment = await db.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) throw AppError.notFound("Assignment not found");
    if (assignment.status !== "OPEN") {
      throw AppError.badRequest("This assignment is no longer accepting submissions");
    }

    // Check for existing submission (unique constraint: assignmentId + studentId)
    const existing = await db.submission.findFirst({
      where: { assignmentId, studentId },
      include: SUBMISSION_INCLUDE,
    });
    if (existing) {
      // Return existing submission instead of error (idempotent)
      return existing;
    }

    return await db.submission.create({
      data: {
        centerId,
        assignmentId,
        studentId,
        status: "IN_PROGRESS",
      },
      include: SUBMISSION_INCLUDE,
    });
  }

  async getSubmission(centerId: string, submissionId: string, firebaseUid: string) {
    const db = getTenantedClient(this.prisma, centerId);

    const authAccount = await db.authAccount.findUniqueOrThrow({
      where: { provider_providerUserId: { provider: "FIREBASE", providerUserId: firebaseUid } },
    });

    const submission = await db.submission.findUnique({
      where: { id: submissionId },
      include: SUBMISSION_INCLUDE,
    });
    if (!submission) throw AppError.notFound("Submission not found");
    if (submission.studentId !== authAccount.userId) {
      throw AppError.forbidden("You can only access your own submissions");
    }

    return submission;
  }

  async saveAnswers(
    centerId: string,
    submissionId: string,
    answers: Array<{ questionId: string; answer?: unknown }>,
    firebaseUid: string,
  ) {
    const db = getTenantedClient(this.prisma, centerId);

    const authAccount = await db.authAccount.findUniqueOrThrow({
      where: { provider_providerUserId: { provider: "FIREBASE", providerUserId: firebaseUid } },
    });

    const submission = await db.submission.findUnique({
      where: { id: submissionId },
    });
    if (!submission) throw AppError.notFound("Submission not found");
    if (submission.studentId !== authAccount.userId) {
      throw AppError.forbidden("You can only modify your own submissions");
    }
    if (submission.status !== "IN_PROGRESS") {
      throw AppError.badRequest("Cannot modify a submitted submission");
    }

    // Batch upsert answers in a transaction for atomicity
    await db.$transaction(async (tx) => {
      for (const ans of answers) {
        await tx.studentAnswer.upsert({
          where: {
            submissionId_questionId: {
              submissionId,
              questionId: ans.questionId,
            },
          },
          create: {
            submissionId,
            questionId: ans.questionId,
            centerId,
            answer: ans.answer !== undefined
              ? (ans.answer as Prisma.InputJsonValue)
              : Prisma.DbNull,
          },
          update: {
            answer: ans.answer !== undefined
              ? (ans.answer as Prisma.InputJsonValue)
              : Prisma.DbNull,
          },
        });
      }
    });

    return await db.submission.findUnique({
      where: { id: submissionId },
      include: SUBMISSION_INCLUDE,
    });
  }

  async submitSubmission(
    centerId: string,
    submissionId: string,
    timeSpentSec: number | undefined,
    firebaseUid: string,
  ) {
    const db = getTenantedClient(this.prisma, centerId);

    const authAccount = await db.authAccount.findUniqueOrThrow({
      where: { provider_providerUserId: { provider: "FIREBASE", providerUserId: firebaseUid } },
    });

    const submission = await db.submission.findUnique({
      where: { id: submissionId },
      include: {
        answers: true,
        assignment: {
          include: {
            exercise: {
              include: {
                sections: {
                  include: { questions: true },
                },
              },
            },
          },
        },
      },
    });

    if (!submission) throw AppError.notFound("Submission not found");
    if (submission.studentId !== authAccount.userId) {
      throw AppError.forbidden("You can only submit your own submissions");
    }
    if (submission.status !== "IN_PROGRESS") {
      throw AppError.badRequest("This submission has already been submitted");
    }

    // Auto-grade objective questions
    const exercise = submission.assignment.exercise;
    const caseSensitive = exercise.caseSensitive;

    const allQuestions = exercise.sections.flatMap((s) => s.questions);
    const questionMap = new Map(allQuestions.map((q) => [q.id, q]));

    for (const answer of submission.answers) {
      const question = questionMap.get(answer.questionId);
      if (!question || !question.correctAnswer) continue;
      if (!AUTO_GRADABLE_TYPES.has(question.questionType)) continue;

      const gradeResult = gradeAnswer(
        question.questionType,
        answer.answer,
        question.correctAnswer,
        caseSensitive,
      );

      if (gradeResult !== null) {
        await db.studentAnswer.update({
          where: { id: answer.id },
          data: {
            isCorrect: gradeResult.isCorrect,
            score: gradeResult.score,
          },
        });
      }
    }

    // Mark submission as submitted
    const updated = await db.submission.update({
      where: { id: submissionId },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        timeSpentSec: timeSpentSec ?? null,
      },
      include: SUBMISSION_INCLUDE,
    });

    // Content moderation scan on student answers (non-blocking)
    try {
      const answerTexts = submission.answers
        .map((a) => (typeof a.answer === "string" ? a.answer : ""))
        .filter(Boolean)
        .join(" ");
      if (answerTexts.length > 0) {
        const moderationService = new ModerationService(this.prisma);
        const scanResult = await moderationService.scanContent(answerTexts, centerId);
        if (scanResult.matches.length > 0) {
          await moderationService.flagContent({
            centerId,
            contentType: "SUBMISSION",
            contentId: submission.id,
            flaggedText: answerTexts,
            matchedTerms: scanResult.matches,
          });
        }
      }
    } catch (error) {
      // Non-blocking: moderation failure should not prevent submission
      console.error("[moderation] Submission scan failed:", error instanceof Error ? error.message : error);
    }

    // Trigger AI analysis for Writing/Speaking submissions (fire-and-forget)
    const exerciseSkill = exercise.skill;
    if (exerciseSkill === "WRITING" || exerciseSkill === "SPEAKING") {
      try {
        const gradingJob = await db.gradingJob.create({
          data: { centerId, submissionId },
        });
        await inngest.send({
          name: "grading/analyze-submission",
          data: { jobId: gradingJob.id, submissionId, centerId },
        });
      } catch {
        // Graceful degradation: if AI trigger fails, submission still succeeds
        // Teacher can manually trigger analysis later
      }
    }

    return updated;
  }

  async uploadPhoto(
    centerId: string,
    submissionId: string,
    questionId: string,
    fileBuffer: Buffer,
    contentType: string,
    firebaseUid: string,
  ) {
    const db = getTenantedClient(this.prisma, centerId);

    const authAccount = await db.authAccount.findUniqueOrThrow({
      where: { provider_providerUserId: { provider: "FIREBASE", providerUserId: firebaseUid } },
    });

    const submission = await db.submission.findUnique({
      where: { id: submissionId },
    });
    if (!submission) throw AppError.notFound("Submission not found");
    if (submission.studentId !== authAccount.userId) {
      throw AppError.forbidden("You can only upload to your own submissions");
    }
    if (submission.status !== "IN_PROGRESS") {
      throw AppError.badRequest("Cannot upload to a submitted submission");
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/heic"];
    if (!allowedTypes.includes(contentType)) {
      throw AppError.badRequest("Invalid file type. Allowed: PNG, JPEG, HEIC");
    }

    // Validate file size (5MB max)
    if (fileBuffer.length > 5 * 1024 * 1024) {
      throw AppError.badRequest("File size exceeds 5MB limit");
    }

    const mimeToExt: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/heic": "heic",
    };
    const ext = mimeToExt[contentType] ?? "jpg";
    const bucket = this.firebaseStorage.bucket(this.bucketName);
    const filePath = `submissions/${centerId}/${submissionId}/photos/${questionId}_${Date.now()}.${ext}`;
    const file = bucket.file(filePath);

    await file.save(fileBuffer, {
      metadata: {
        contentType,
        cacheControl: "public, max-age=31536000",
      },
    });

    await file.makePublic();

    const photoUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    // Upsert student answer with photoUrl
    await db.studentAnswer.upsert({
      where: {
        submissionId_questionId: {
          submissionId,
          questionId,
        },
      },
      create: {
        submissionId,
        questionId,
        centerId,
        photoUrl,
      },
      update: {
        photoUrl,
      },
    });

    return { photoUrl };
  }

  async getSubmissionByAssignment(centerId: string, assignmentId: string, firebaseUid: string) {
    const db = getTenantedClient(this.prisma, centerId);

    const authAccount = await db.authAccount.findUniqueOrThrow({
      where: { provider_providerUserId: { provider: "FIREBASE", providerUserId: firebaseUid } },
    });

    const submission = await db.submission.findFirst({
      where: { assignmentId, studentId: authAccount.userId },
      select: { id: true, status: true },
    });

    return submission;
  }

  async hasSubmissions(centerId: string, assignmentId: string): Promise<boolean> {
    const db = getTenantedClient(this.prisma, centerId);
    const count = await db.submission.count({
      where: { assignmentId },
    });
    return count > 0;
  }

  async getStudentAssignmentWithExercise(
    centerId: string,
    assignmentId: string,
    firebaseUid: string,
  ) {
    const db = getTenantedClient(this.prisma, centerId);

    const authAccount = await db.authAccount.findUniqueOrThrow({
      where: { provider_providerUserId: { provider: "FIREBASE", providerUserId: firebaseUid } },
    });

    // Verify student is assigned
    const studentAssignment = await db.assignmentStudent.findFirst({
      where: { assignmentId, studentId: authAccount.userId },
    });
    if (!studentAssignment) {
      throw AppError.notFound("Assignment not found or you are not assigned to it");
    }

    const assignment = await db.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        exercise: {
          include: {
            sections: {
              include: {
                questions: {
                  select: {
                    id: true,
                    sectionId: true,
                    centerId: true,
                    questionText: true,
                    questionType: true,
                    options: true,
                    // Exclude correctAnswer — students must NOT see correct answers
                    orderIndex: true,
                    wordLimit: true,
                    createdAt: true,
                    updatedAt: true,
                  },
                  orderBy: { orderIndex: "asc" },
                },
              },
              orderBy: { orderIndex: "asc" },
            },
          },
        },
        class: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!assignment) throw AppError.notFound("Assignment not found");

    return assignment;
  }
}

// --- Auto-grading logic ---

function gradeAnswer(
  questionType: string,
  studentAnswer: unknown,
  correctAnswer: unknown,
  caseSensitive: boolean,
): { isCorrect: boolean; score: number } | null {
  if (!studentAnswer || !correctAnswer) return null;

  const sa = studentAnswer as Record<string, unknown>;
  const ca = correctAnswer as Record<string, unknown>;

  try {
    switch (questionType) {
      // MCQ Single
      case "R1_MCQ_SINGLE":
      case "R3_TFNG":
      case "R4_YNNG": {
        const isCorrect = normalizeStr(sa.answer as string, caseSensitive) ===
          normalizeStr(ca.answer as string, caseSensitive);
        return { isCorrect, score: isCorrect ? 1 : 0 };
      }

      // L2 MCQ — can be single or multi depending on correctAnswer shape
      case "L2_MCQ": {
        if (ca.answers) {
          return gradeMultiMCQ(sa, ca, caseSensitive);
        }
        const isCorrect = normalizeStr(sa.answer as string, caseSensitive) ===
          normalizeStr(ca.answer as string, caseSensitive);
        return { isCorrect, score: isCorrect ? 1 : 0 };
      }

      // MCQ Multi
      case "R2_MCQ_MULTI": {
        return gradeMultiMCQ(sa, ca, caseSensitive);
      }

      // Text-based (check answer + accepted variants)
      case "R5_SENTENCE_COMPLETION":
      case "R6_SHORT_ANSWER":
      case "R8_SUMMARY_PASSAGE":
      case "L5_SENTENCE_COMPLETION":
      case "L6_SHORT_ANSWER": {
        return gradeTextAnswer(sa, ca, caseSensitive);
      }

      // Word bank blanks
      case "R7_SUMMARY_WORD_BANK": {
        return gradeRecordAnswer(sa.blanks, ca.blanks, caseSensitive);
      }

      // Matching
      case "R9_MATCHING_HEADINGS":
      case "R10_MATCHING_INFORMATION":
      case "R11_MATCHING_FEATURES":
      case "R12_MATCHING_SENTENCE_ENDINGS":
      case "L3_MATCHING": {
        return gradeRecordAnswer(sa.matches, ca.matches, caseSensitive);
      }

      // Note/Table/Flowchart — student gives simple blanks, teacher correctAnswer has structured blanks
      case "R13_NOTE_TABLE_FLOWCHART":
      case "L1_FORM_NOTE_TABLE": {
        return gradeNoteTableAnswer(sa.blanks, ca.blanks, caseSensitive);
      }

      // Diagram labelling — student gives simple labels, teacher may have structured or string labels
      case "R14_DIAGRAM_LABELLING":
      case "L4_MAP_PLAN_LABELLING": {
        return gradeDiagramAnswer(sa.labels, ca.labels, caseSensitive);
      }

      default:
        return null;
    }
  } catch {
    return null;
  }
}

function normalizeStr(s: string | undefined | null, caseSensitive: boolean): string {
  if (!s) return "";
  const trimmed = s.trim();
  return caseSensitive ? trimmed : trimmed.toLowerCase();
}

function gradeMultiMCQ(
  sa: Record<string, unknown>,
  ca: Record<string, unknown>,
  caseSensitive: boolean,
): { isCorrect: boolean; score: number } {
  const studentAnswers = ((sa.answers as string[]) || [])
    .map((a) => normalizeStr(a, caseSensitive))
    .sort();
  const correctAnswers = ((ca.answers as string[]) || [])
    .map((a) => normalizeStr(a, caseSensitive))
    .sort();

  const isCorrect =
    studentAnswers.length === correctAnswers.length &&
    studentAnswers.every((a, i) => a === correctAnswers[i]);
  return { isCorrect, score: isCorrect ? 1 : 0 };
}

function gradeTextAnswer(
  sa: Record<string, unknown>,
  ca: Record<string, unknown>,
  caseSensitive: boolean,
): { isCorrect: boolean; score: number } {
  const studentText = normalizeStr(sa.answer as string, caseSensitive);
  const correctText = normalizeStr(ca.answer as string, caseSensitive);

  if (studentText === correctText) {
    return { isCorrect: true, score: 1 };
  }

  // Check accepted variants
  const variants = (ca.acceptedVariants as string[]) || [];
  for (const variant of variants) {
    if (studentText === normalizeStr(variant, caseSensitive)) {
      return { isCorrect: true, score: 1 };
    }
  }

  return { isCorrect: false, score: 0 };
}

function gradeRecordAnswer(
  studentRecord: unknown,
  correctRecord: unknown,
  caseSensitive: boolean,
): { isCorrect: boolean; score: number } | null {
  const sr = (studentRecord as Record<string, string>) || {};
  const cr = (correctRecord as Record<string, string>) || {};

  const keys = Object.keys(cr);
  if (keys.length === 0) return null;

  let correct = 0;
  for (const key of keys) {
    if (normalizeStr(sr[key], caseSensitive) === normalizeStr(cr[key], caseSensitive)) {
      correct++;
    }
  }

  const isCorrect = correct === keys.length;
  const score = keys.length > 0 ? correct / keys.length : 0;
  return { isCorrect, score };
}

function gradeNoteTableAnswer(
  studentBlanks: unknown,
  correctBlanks: unknown,
  caseSensitive: boolean,
): { isCorrect: boolean; score: number } | null {
  const sb = (studentBlanks as Record<string, string>) || {};
  const cb = (correctBlanks as Record<string, unknown>) || {};

  const keys = Object.keys(cb);
  if (keys.length === 0) return null;

  let correct = 0;
  for (const key of keys) {
    const correctBlank = cb[key] as Record<string, unknown>;
    const correctText = normalizeStr(correctBlank?.answer as string, caseSensitive);
    const studentText = normalizeStr(sb[key], caseSensitive);

    if (studentText === correctText) {
      correct++;
    } else {
      // Check accepted variants
      const variants = (correctBlank?.acceptedVariants as string[]) || [];
      for (const variant of variants) {
        if (studentText === normalizeStr(variant, caseSensitive)) {
          correct++;
          break;
        }
      }
    }
  }

  const isCorrect = correct === keys.length;
  const score = keys.length > 0 ? correct / keys.length : 0;
  return { isCorrect, score };
}

function gradeDiagramAnswer(
  studentLabels: unknown,
  correctLabels: unknown,
  caseSensitive: boolean,
): { isCorrect: boolean; score: number } | null {
  const sl = (studentLabels as Record<string, string>) || {};
  const cl = (correctLabels as Record<string, unknown>) || {};

  const keys = Object.keys(cl);
  if (keys.length === 0) return null;

  let correct = 0;
  for (const key of keys) {
    const correctLabel = cl[key];
    const studentText = normalizeStr(sl[key], caseSensitive);

    if (typeof correctLabel === "string") {
      // Word-bank mode: simple string comparison
      if (studentText === normalizeStr(correctLabel, caseSensitive)) {
        correct++;
      }
    } else if (typeof correctLabel === "object" && correctLabel !== null) {
      // Free-text mode: structured label with variants
      const structured = correctLabel as Record<string, unknown>;
      const correctText = normalizeStr(structured.answer as string, caseSensitive);
      if (studentText === correctText) {
        correct++;
      } else {
        const variants = (structured.acceptedVariants as string[]) || [];
        for (const variant of variants) {
          if (studentText === normalizeStr(variant, caseSensitive)) {
            correct++;
            break;
          }
        }
      }
    }
  }

  const isCorrect = correct === keys.length;
  const score = keys.length > 0 ? correct / keys.length : 0;
  return { isCorrect, score };
}
