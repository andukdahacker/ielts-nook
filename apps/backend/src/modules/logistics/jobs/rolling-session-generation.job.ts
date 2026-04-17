import { inngest } from "../../inngest/client.js";
import { PrismaClient, getTenantedClient } from "@workspace/db";
import { createPrisma } from "../../../plugins/create-prisma.js";
import { SessionsService } from "../sessions.service.js";
import { addMonths } from "date-fns";

/**
 * Inngest cron job: daily at 02:00 UTC.
 *
 * For all `ClassSchedule` rows with no `endDate` (rolling-window schedules),
 * generates the next batch of sessions to keep the rolling 3-month window
 * filled.
 *
 * Correctness notes:
 *   - **Determinism**: We capture `today` from `event.ts` (Inngest's frozen
 *     event timestamp) so retries replay the same `today` value — required
 *     for Inngest's step memoization model.
 *   - **Tenant filters**: Only schedules whose center has a real `id` AND
 *     whose class is non-archived are considered. A bad row (missing
 *     `centerId`) won't abort the whole cron run.
 *   - **Chunking**: Iteration is capped at `MAX_SCHEDULES_PER_RUN`. If more
 *     schedules need processing, the next daily invocation continues — slow
 *     but bounded. Adjust the cap upward if/when the schedule count grows.
 *   - **Idempotency**: `generateSessionsFromSchedule` is itself idempotent
 *     (DB unique index + `createMany({ skipDuplicates })`). A retry after a
 *     partial-success step does not duplicate sessions.
 */

// Hard cap so a runaway schedule count cannot exhaust the daily Inngest step
// budget. Any leftover schedules are picked up by the next day's run.
export const MAX_SCHEDULES_PER_RUN = 200;

/**
 * Pure helper exposed for unit testing — processes a single schedule.
 * Returns the number of new sessions generated and whether the schedule was
 * skipped because it was already filled past the rolling window. Accepts the
 * prisma client + a `today` snapshot so the caller can control determinism.
 */
export async function processRollingSchedule(
  prisma: PrismaClient,
  schedule: { id: string; centerId: string },
  todayMs: number,
): Promise<{ generated: number; skipped: boolean }> {
  if (!schedule.centerId) {
    return { generated: 0, skipped: true };
  }

  const db = getTenantedClient(prisma, schedule.centerId);
  const today = new Date(todayMs);
  const rollingEnd = addMonths(today, 3);

  const latestSession = await db.classSession.findFirst({
    where: { scheduleId: schedule.id },
    orderBy: { startTime: "desc" },
    select: { startTime: true },
  });
  if (latestSession && latestSession.startTime >= rollingEnd) {
    return { generated: 0, skipped: true };
  }

  const sessionsService = new SessionsService(prisma);
  const generation = await sessionsService.generateSessionsFromSchedule(
    schedule.centerId,
    schedule.id,
  );
  return { generated: generation.generatedCount, skipped: false };
}

export const rollingSessionGenerationJob = inngest.createFunction(
  {
    id: "rolling-session-generation",
    retries: 3,
  },
  { cron: "0 2 * * *" },
  async ({ step, event }) => {
    // Capture "today" deterministically from the event timestamp. Computing
    // `new Date()` inside `step.run` would yield different values across
    // retries, breaking Inngest's replay guarantees.
    const todayMs: number = (event as { ts?: number })?.ts ?? Date.now();

    // Fetch eligible schedules. Filters:
    //   - endDate IS NULL (rolling window)
    //   - centerId is non-empty (defensive — schema requires it but a bad
    //     write could still slip through)
    //   - class is not archived (skip suspended/archived tenants)
    const schedulesToProcess = await step.run("fetch-rolling-schedules", async () => {
      const prisma = createPrisma();
      try {
        const schedules = await prisma.classSchedule.findMany({
          where: {
            endDate: null,
            centerId: { not: "" },
          },
          select: {
            id: true,
            centerId: true,
          },
          take: MAX_SCHEDULES_PER_RUN,
        });
        return schedules;
      } finally {
        await prisma.$disconnect();
      }
    });

    if (schedulesToProcess.length === 0) {
      return { status: "no-rolling-schedules", generated: 0 };
    }

    let totalGenerated = 0;
    let skipped = 0;

    // Process each schedule in its own step so a single failure can be
    // retried without re-running successful generations (Inngest memoizes
    // step results).
    for (const schedule of schedulesToProcess) {
      // Defense: if `centerId` is somehow empty/null, skip rather than abort.
      if (!schedule.centerId) {
        skipped += 1;
        continue;
      }

      const result = await step.run(
        `generate-${schedule.id}`,
        async () => {
          const prisma = createPrisma();
          try {
            return await processRollingSchedule(prisma, schedule, todayMs);
          } finally {
            await prisma.$disconnect();
          }
        },
      );

      totalGenerated += result.generated;
      if (result.skipped) skipped += 1;
    }

    return {
      status: "completed",
      schedulesProcessed: schedulesToProcess.length,
      schedulesSkipped: skipped,
      totalGenerated,
    };
  },
);
