import { inngest } from "../../inngest/client.js";
import { Prisma, getTenantedClient } from "@workspace/db";
import { createPrisma } from "../../../plugins/create-prisma.js";
import type { IeltsQuestionType } from "@workspace/db";
import { AIGenerationService } from "../ai-generation.service.js";
import type { GeneratedSection } from "../ai-prompts.js";

export type QuestionGenerationEvent = {
  name: "exercises/generate-questions";
  data: {
    jobId: string;
    exerciseId: string;
    centerId: string;
    passageText: string;
    questionTypes: Array<{ type: string; count: number }>;
    difficulty: string;
  };
};

export const questionGenerationJob = inngest.createFunction(
  {
    id: "exercise-question-generation",
    retries: 3,
    onFailure: async ({ event, error }) => {
      const jobId = event?.data?.event?.data?.jobId;
      if (!jobId) return;
      const prisma = createPrisma();
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma as any).aIGenerationJob.update({
          where: { id: jobId },
          data: { status: "failed", error: error.message },
        });
      } finally {
        await prisma.$disconnect();
      }
    },
  },
  { event: "exercises/generate-questions" },
  async ({ event, step }) => {
    const { jobId, exerciseId, centerId, passageText, questionTypes, difficulty } =
      event.data;

    // Step 1: Mark job as processing
    await step.run("mark-processing", async () => {
      const prisma = createPrisma();
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma as any).aIGenerationJob.update({
          where: { id: jobId },
          data: { status: "processing" },
        });
      } finally {
        await prisma.$disconnect();
      }
    });

    // Step 2: Generate questions for each type
    const allSections: GeneratedSection[] = [];
    for (const qt of questionTypes) {
      const section = await step.run(`generate-${qt.type}`, async () => {
        const prisma = createPrisma();
        try {
          const aiService = new AIGenerationService(prisma, {
            geminiApiKey: process.env.GEMINI_API_KEY,
            geminiModel: process.env.GEMINI_MODEL,
          });
          return aiService.generateQuestionsForType(
            passageText,
            qt.type,
            qt.count,
            difficulty,
          );
        } finally {
          await prisma.$disconnect();
        }
      });
      allSections.push(section);

      // Rate limit delay between API calls
      if (questionTypes.indexOf(qt) < questionTypes.length - 1) {
        await step.sleep(`delay-after-${qt.type}`, "2s");
      }
    }

    // Step 3: Create sections and questions in the database
    await step.run("save-to-database", async () => {
      const prisma = createPrisma();
      try {
        const db = getTenantedClient(prisma, centerId);

        // Get current max orderIndex
        const existingSections = await db.questionSection.findMany({
          where: { exerciseId },
          select: { orderIndex: true },
          orderBy: { orderIndex: "desc" },
        });
        let nextOrderIndex =
          existingSections.length > 0
            ? existingSections[0]!.orderIndex + 1
            : 0;

        for (const section of allSections) {
          const createdSection = await db.questionSection.create({
            data: {
              exerciseId,
              centerId,
              sectionType: section.sectionType as IeltsQuestionType,
              instructions: section.instructions,
              orderIndex: nextOrderIndex++,
            },
          });

          for (let j = 0; j < section.questions.length; j++) {
            const q = section.questions[j]!;
            await db.question.create({
              data: {
                sectionId: createdSection.id,
                centerId,
                questionText: q.questionText,
                questionType: q.questionType,
                options: (q.options ?? undefined) as Prisma.InputJsonValue | undefined,
                correctAnswer: (q.correctAnswer ?? undefined) as Prisma.InputJsonValue | undefined,
                orderIndex: j,
                wordLimit: q.wordLimit ?? null,
              },
            });
          }
        }
      } finally {
        await prisma.$disconnect();
      }
    });

    // Step 4: Mark job as completed
    await step.run("mark-completed", async () => {
      const prisma = createPrisma();
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma as any).aIGenerationJob.update({
          where: { id: jobId },
          data: {
            status: "completed",
            result: { sectionCount: allSections.length } as Record<string, unknown>,
          },
        });
      } finally {
        await prisma.$disconnect();
      }
    });

    return { status: "completed", sectionCount: allSections.length };
  },
);
