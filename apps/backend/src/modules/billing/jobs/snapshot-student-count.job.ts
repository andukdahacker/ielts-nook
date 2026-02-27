import { inngest } from "../../inngest/client.js";
import { createPrisma } from "../../../plugins/create-prisma.js";
import { BillingService } from "../billing.service.js";

export const snapshotStudentCountJob = inngest.createFunction(
  {
    id: "snapshot-student-count",
    retries: 3,
  },
  { cron: "0 0 1 * *" }, // 1st of every month at midnight UTC
  async ({ step }) => {
    // Step 1: Get all active centers
    const centerIds = await step.run("fetch-centers", async () => {
      const prisma = createPrisma();
      try {
        const centers = await prisma.center.findMany({
          select: { id: true },
        });
        return centers.map((c) => c.id);
      } finally {
        await prisma.$disconnect();
      }
    });

    // Step 2: Snapshot each center's student count
    for (const centerId of centerIds) {
      await step.run(`snapshot-${centerId}`, async () => {
        const prisma = createPrisma();
        try {
          const service = new BillingService(prisma);
          await service.snapshotStudentCount(centerId);
        } finally {
          await prisma.$disconnect();
        }
      });
    }

    return { status: "completed", centersProcessed: centerIds.length };
  },
);
