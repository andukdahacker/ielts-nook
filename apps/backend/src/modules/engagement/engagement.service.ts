import type { PrismaClient } from "@workspace/db";
import type { getTenantedClient } from "@workspace/db";

type DbClient = ReturnType<typeof getTenantedClient>;

/**
 * Check if a student has a 7-day submission streak (7 consecutive calendar days
 * ending today, each with at least one GRADED submission).
 */
export async function checkStreak(
  db: DbClient,
  studentId: string,
): Promise<boolean> {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
  sevenDaysAgo.setUTCHours(0, 0, 0, 0);

  const submissions = await db.submission.findMany({
    where: {
      studentId,
      status: "GRADED",
      submittedAt: { gte: sevenDaysAgo, not: null },
    },
    select: { submittedAt: true },
  });

  const uniqueDates = new Set(
    submissions
      .filter((s): s is { submittedAt: Date } => s.submittedAt !== null)
      .map((s) => s.submittedAt.toISOString().slice(0, 10)),
  );

  // Check that today and each of the 6 preceding days are in the set
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    if (!uniqueDates.has(dateStr)) return false;
  }

  return true;
}

/**
 * Check if the current score is a personal best for this student.
 * Returns false if score is null (Reading/Listening), or if no prior graded
 * submissions exist (first submission is not a "personal best").
 */
export async function checkPersonalBest(
  db: DbClient,
  studentId: string,
  submissionId: string,
  currentScore: number | null,
): Promise<boolean> {
  if (currentScore === null) return false;

  const allGraded = await db.submission.findMany({
    where: { studentId, status: "GRADED", id: { not: submissionId } },
    select: {
      feedback: {
        select: { teacherFinalScore: true, overallScore: true },
      },
    },
  });

  const withScores = allGraded.filter(
    (s) =>
      s.feedback?.teacherFinalScore != null ||
      s.feedback?.overallScore != null,
  );

  if (withScores.length === 0) return false;

  const previousMax = Math.max(
    ...withScores.map(
      (s) => s.feedback?.teacherFinalScore ?? s.feedback?.overallScore ?? 0,
    ),
  );

  return currentScore > previousMax;
}

/**
 * Check if an engagement email was already sent to this student today (UTC).
 */
export async function wasEngagementEmailSentToday(
  db: DbClient,
  studentId: string,
  centerId: string,
): Promise<boolean> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const existing = await db.emailLog.findFirst({
    where: {
      recipientId: studentId,
      centerId,
      type: "engagement",
      status: "sent",
      sentAt: { gte: today },
    },
  });

  return !!existing;
}

/**
 * Returns non-unsubscribed parent emails for a student (from ParentEmail model).
 * ParentEmail is NOT tenanted — use raw PrismaClient.
 */
export async function getParentEmails(
  prisma: PrismaClient,
  studentId: string,
): Promise<Array<{ email: string; unsubscribeToken: string }>> {
  const records = await prisma.parentEmail.findMany({
    where: { userId: studentId, unsubscribed: false },
    select: { email: true, unsubscribeToken: true },
  });
  return records;
}
