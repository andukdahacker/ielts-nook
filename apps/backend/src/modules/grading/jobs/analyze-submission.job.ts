import { inngest } from "../../inngest/client.js";
import { getTenantedClient } from "@workspace/db";
import { createPrisma } from "../../../plugins/create-prisma.js";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { getGradingPromptAndSchema } from "../ai-grading-prompts.js";

export type AnalyzeSubmissionEvent = {
  name: "grading/analyze-submission";
  data: {
    jobId: string;
    submissionId: string;
    centerId: string;
  };
};

export function classifyError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes("timeout") || msg.includes("DEADLINE_EXCEEDED"))
    return "api_timeout";
  if (msg.includes("429") || msg.includes("rate") || msg.includes("quota"))
    return "rate_limit";
  if (msg.includes("parse") || msg.includes("JSON") || msg.includes("schema"))
    return "invalid_response";
  if (msg.includes("valid") || msg.includes("zod")) return "validation_error";
  return "other";
}

export const analyzeSubmissionJob = inngest.createFunction(
  {
    id: "grading-analyze-submission",
    retries: 3,
    onFailure: async ({ event, error }) => {
      const jobId = event?.data?.event?.data?.jobId;
      const centerId = event?.data?.event?.data?.centerId;
      const submissionId = event?.data?.event?.data?.submissionId;
      if (!jobId) return;
      const prisma = createPrisma();
      try {
        const errorCategory = classifyError(error);
        // Guard: job may have been deleted by teacher unlock
        await prisma.gradingJob.updateMany({
          where: { id: jobId },
          data: {
            status: "failed",
            error: error.message,
            errorCategory,
          },
        });

        // Revert submission status to SUBMITTED so teacher can still grade manually
        // Only revert if still in AI_PROCESSING (unlock may have reset to IN_PROGRESS)
        if (centerId && submissionId) {
          const db = getTenantedClient(prisma, centerId);
          await db.submission.updateMany({
            where: { id: submissionId, status: "AI_PROCESSING" },
            data: { status: "SUBMITTED" },
          });
        }
      } finally {
        await prisma.$disconnect();
      }
    },
  },
  { event: "grading/analyze-submission" },
  async ({ event, step }) => {
    const { jobId, submissionId, centerId } = event.data;

    // Step 1: Mark job as processing, set submission to AI_PROCESSING
    // Guard: job may have been deleted by teacher unlock between event dispatch and execution
    await step.run("mark-processing", async () => {
      const prisma = createPrisma();
      try {
        const job = await prisma.gradingJob.findUnique({ where: { id: jobId } });
        if (!job) return; // Job deleted by unlock — skip silently
        await prisma.gradingJob.update({
          where: { id: jobId },
          data: { status: "processing" },
        });
        const db = getTenantedClient(prisma, centerId);
        await db.submission.updateMany({
          where: { id: submissionId, status: "SUBMITTED" },
          data: { status: "AI_PROCESSING" },
        });
      } finally {
        await prisma.$disconnect();
      }
    });

    // Step 2: Load submission with student answers, exercise, and skill type
    const submissionData = await step.run("load-submission", async () => {
      const prisma = createPrisma();
      try {
        const db = getTenantedClient(prisma, centerId);
        const submission = await db.submission.findUniqueOrThrow({
          where: { id: submissionId },
          include: {
            answers: {
              include: {
                question: {
                  include: { section: true },
                },
              },
            },
            assignment: {
              include: {
                exercise: {
                  select: {
                    skill: true,
                    title: true,
                    writingPrompt: true,
                    sections: {
                      include: { questions: true },
                      orderBy: { orderIndex: "asc" },
                    },
                  },
                },
              },
            },
          },
        });

        const exercise = submission.assignment.exercise;
        const skill = exercise.skill as "WRITING" | "SPEAKING";

        // Collect student text from answers for Writing/Speaking questions
        const studentTexts: string[] = [];
        let questionPrompt = exercise.writingPrompt ?? "";

        for (const answer of submission.answers) {
          if (!answer.answer) continue;
          const answerData = answer.answer as Record<string, unknown>;
          if (typeof answerData.text === "string" && answerData.text.trim()) {
            studentTexts.push(answerData.text);
          }
          // For Speaking, also check for transcript field
          if (
            typeof answerData.transcript === "string" &&
            answerData.transcript.trim()
          ) {
            studentTexts.push(answerData.transcript);
          }
          // Use question text as prompt context if no writing prompt
          if (!questionPrompt && answer.question?.questionText) {
            questionPrompt = answer.question.questionText;
          }
        }

        const studentText = studentTexts.join("\n\n");
        if (!studentText) {
          throw new Error("No student text found in submission answers");
        }

        return { skill, studentText, questionPrompt };
      } finally {
        await prisma.$disconnect();
      }
    });

    // Step 2.5: Load golden samples for the skill type (non-fatal — grading continues without them)
    let goldenSamples: { studentWork: string; teacherFeedback: string }[] = [];
    try {
      goldenSamples = await step.run("load-golden-samples", async () => {
        const prisma = createPrisma();
        try {
          const db = getTenantedClient(prisma, centerId);
          return db.goldenSample.findMany({
            where: { skillType: submissionData.skill, isActive: true },
            orderBy: { order: "asc" },
            select: { studentWork: true, teacherFeedback: true },
          });
        } finally {
          await prisma.$disconnect();
        }
      });
    } catch {
      // Golden samples are optional — continue grading without them
    }

    // Small delay before API call
    await step.sleep("pre-api-delay", "1s");

    // Step 3: Call Gemini API with IELTS-appropriate prompts
    const aiResult = await step.run("call-gemini", async () => {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured");
      }

      const genai = new GoogleGenAI({ apiKey });
      const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

      const { systemPrompt, schema } = getGradingPromptAndSchema(
        submissionData.skill,
        submissionData.studentText,
        submissionData.questionPrompt || undefined,
        goldenSamples.length > 0 ? goldenSamples : undefined,
      );

      const response = await genai.models.generateContent({
        model,
        contents: systemPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: z.toJSONSchema(schema) as Record<string, unknown>,
          temperature: 0.3, // Lower temperature for more consistent grading
        },
      });

      const text = response.text;
      if (!text) throw new Error("AI grading returned no results");

      return schema.parse(JSON.parse(text)) as {
        overallScore: number;
        criteriaScores: Record<string, number>;
        generalFeedback: string;
        highlights: Array<{
          type: string;
          startOffset: number;
          endOffset: number;
          content: string;
          suggestedFix?: string;
          severity: string;
          confidence: number;
          originalContextSnippet: string;
        }>;
      };
    });

    // Step 4: Save results to database
    await step.run("save-feedback", async () => {
      const prisma = createPrisma();
      try {
        const db = getTenantedClient(prisma, centerId);

        // Delete any existing feedback (for retrigger case)
        await db.submissionFeedback.deleteMany({ where: { submissionId } });

        // Create SubmissionFeedback record
        const feedback = await db.submissionFeedback.create({
          data: {
            centerId,
            submissionId,
            overallScore: aiResult.overallScore,
            criteriaScores: aiResult.criteriaScores as Record<string, unknown>,
            generalFeedback: aiResult.generalFeedback,
          },
        });

        // Batch-create AIFeedbackItem records for all highlights
        if (aiResult.highlights.length > 0) {
          await db.aIFeedbackItem.createMany({
            data: aiResult.highlights.map((highlight) => ({
              centerId,
              submissionFeedbackId: feedback.id,
              type: highlight.type,
              content: highlight.content,
              startOffset: highlight.startOffset,
              endOffset: highlight.endOffset,
              originalContextSnippet: highlight.originalContextSnippet,
              suggestedFix: highlight.suggestedFix ?? null,
              severity: highlight.severity,
              confidence: highlight.confidence,
            })),
          });
        }
      } finally {
        await prisma.$disconnect();
      }
    });

    // Step 5: Mark job as completed, revert submission status to SUBMITTED
    // Guard: job/submission may have been deleted/reset by teacher unlock
    await step.run("mark-completed", async () => {
      const prisma = createPrisma();
      try {
        await prisma.gradingJob.updateMany({
          where: { id: jobId, status: { not: "completed" } },
          data: { status: "completed" },
        });
        const db = getTenantedClient(prisma, centerId);
        await db.submission.updateMany({
          where: { id: submissionId, status: "AI_PROCESSING" },
          data: { status: "SUBMITTED" },
        });
      } finally {
        await prisma.$disconnect();
      }
    });

    return { status: "completed", submissionId };
  },
);
