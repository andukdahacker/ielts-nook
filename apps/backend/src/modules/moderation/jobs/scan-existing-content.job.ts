import { inngest } from "../../inngest/client.js";
import { getTenantedClient } from "@workspace/db";
import { createPrisma } from "../../../plugins/create-prisma.js";
import { ModerationService } from "../moderation.service.js";

const BATCH_SIZE = 50;

export type ScanExistingContentEvent = {
  name: "moderation/scan-existing-content";
  data: {
    centerId: string;
  };
};

export const scanExistingContentJob = inngest.createFunction(
  {
    id: "moderation-scan-existing-content",
    retries: 1,
  },
  { event: "moderation/scan-existing-content" },
  async ({ event, step }) => {
    const { centerId } = event.data;

    // Step 1: Count published exercises
    const totalCount = await step.run("count-exercises", async () => {
      const prisma = createPrisma();
      try {
        const db = getTenantedClient(prisma, centerId);
        return db.exercise.count({ where: { status: "PUBLISHED" } });
      } finally {
        await prisma.$disconnect();
      }
    });

    const totalBatches = Math.ceil(totalCount / BATCH_SIZE);
    let flaggedCount = 0;

    // Step 2: Process exercises in batches
    for (let batch = 0; batch < totalBatches; batch++) {
      const batchResult = await step.run(`scan-batch-${batch}`, async () => {
        const prisma = createPrisma();
        try {
          const db = getTenantedClient(prisma, centerId);
          const moderationService = new ModerationService(prisma);

          // Load term list once per batch
          const exercises = await db.exercise.findMany({
            where: { status: "PUBLISHED" },
            include: {
              sections: { include: { questions: true } },
            },
            skip: batch * BATCH_SIZE,
            take: BATCH_SIZE,
            orderBy: { createdAt: "asc" },
          });

          let batchFlagged = 0;
          for (const exercise of exercises) {
            const textParts = [
              exercise.title,
              exercise.passageContent ?? "",
              exercise.instructions ?? "",
              exercise.writingPrompt ?? "",
              ...exercise.sections.flatMap((s) => [
                s.instructions ?? "",
                ...s.questions.map((q) => q.questionText ?? ""),
              ]),
            ];
            const fullText = textParts.filter(Boolean).join(" ");
            if (fullText.length === 0) continue;

            const scanResult = await moderationService.scanContent(fullText, centerId);
            if (scanResult.matches.length > 0) {
              // Check if already flagged
              const existing = await db.contentModerationFlag.findFirst({
                where: { contentId: exercise.id, contentType: "EXERCISE", status: "PENDING" },
              });
              if (!existing) {
                await moderationService.flagContent({
                  centerId,
                  contentType: "EXERCISE",
                  contentId: exercise.id,
                  flaggedText: fullText,
                  matchedTerms: scanResult.matches,
                });
                // Unpublish flagged exercise — revert to DRAFT for compliance review
                await db.exercise.updateMany({
                  where: { id: exercise.id, status: "PUBLISHED" },
                  data: { status: "DRAFT" },
                });
                batchFlagged++;
              }
            }
          }
          return batchFlagged;
        } finally {
          await prisma.$disconnect();
        }
      });

      flaggedCount += batchResult;
    }

    return { status: "completed", totalScanned: totalCount, flagged: flaggedCount };
  },
);
