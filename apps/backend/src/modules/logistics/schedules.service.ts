import { PrismaClient, getTenantedClient } from "@workspace/db";
import {
  ClassSchedule,
  ClassSession,
  ConflictResult,
  CreateClassScheduleInput,
  UpdateClassScheduleInput,
} from "@workspace/types";
import { SessionsService } from "./sessions.service.js";

/**
 * Field set whose mutation requires bumping `effectiveFrom` so the biweekly
 * counting anchor stays meaningful — otherwise editing the day/frequency on
 * an existing series would silently re-align future generations against a
 * stale anchor (visible drift in alternating-week patterns).
 */
const ANCHOR_BUMPING_FIELDS = ["dayOfWeek", "startTime", "endTime", "frequency"] as const;

/**
 * Cast helper: at the API boundary the schedule has already been validated by
 * `CreateClassScheduleSchema` / `UpdateClassScheduleSchema`, so the Prisma row
 * we receive is a `ClassSchedule`. The Prisma type is identical structurally
 * (the `frequency` field is a Prisma-generated enum that mirrors our Zod
 * `FrequencyEnum` since the migration introduced `enum ScheduleFrequency`).
 */
function asSchedule<T extends { frequency: string }>(row: T): ClassSchedule {
  return row as unknown as ClassSchedule;
}

export class SchedulesService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly sessionsService: SessionsService,
  ) {}

  async listSchedules(
    centerId: string,
    classId?: string,
  ): Promise<ClassSchedule[]> {
    const db = getTenantedClient(this.prisma, centerId);
    const rows = await db.classSchedule.findMany({
      where: classId ? { classId } : undefined,
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
    return rows.map(asSchedule);
  }

  async getSchedule(centerId: string, id: string): Promise<ClassSchedule> {
    const db = getTenantedClient(this.prisma, centerId);
    const row = await db.classSchedule.findUniqueOrThrow({ where: { id } });
    return asSchedule(row);
  }

  async createSchedule(
    centerId: string,
    input: CreateClassScheduleInput,
  ): Promise<{
    schedule: ClassSchedule;
    generatedCount: number;
    sessions: ClassSession[];
    conflicts: ConflictResult[];
  }> {
    const db = getTenantedClient(this.prisma, centerId);

    // Verify the class belongs to the center BEFORE we open the transaction.
    // This produces a clean 404 from the route layer rather than a tx rollback.
    await db.class.findUniqueOrThrow({ where: { id: input.classId } });

    // Caller may supply effectiveFrom (e.g., the date picked in CreateSessionDialog
    // for the first occurrence). Falls back to "now" so legacy callers still
    // get an anchor and biweekly counting remains stable.
    const effectiveFrom = input.effectiveFrom
      ? new Date(input.effectiveFrom)
      : new Date();

    const schedule = await db.classSchedule.create({
      data: {
        classId: input.classId,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        roomName: input.roomName ?? null,
        frequency: input.frequency ?? "WEEKLY",
        endDate: input.endDate ? new Date(input.endDate) : null,
        effectiveFrom,
        centerId,
      },
    });

    // Auto-generate sessions. If generation fails, the schedule row stays
    // (callers can retry generation independently via the deprecated
    // /sessions/generate endpoint or a manual cron poke). We surface a
    // best-effort empty result with no conflicts rather than 500-ing the
    // entire request, since the schedule itself is valid and persistent.
    let generation: {
      generatedCount: number;
      sessions: ClassSession[];
      conflicts: ConflictResult[];
    } = { generatedCount: 0, sessions: [], conflicts: [] };
    try {
      generation = await this.sessionsService.generateSessionsFromSchedule(
        centerId,
        schedule.id,
      );
    } catch (err) {
      // Don't crash the create; let the schedule row exist so the user can
      // see/edit it. Re-throw only if we want surface-level visibility — we
      // log via Prisma's underlying request error path.
      // eslint-disable-next-line no-console
      console.error("Schedule created but session generation failed", {
        scheduleId: schedule.id,
        centerId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return {
      schedule: asSchedule(schedule),
      generatedCount: generation.generatedCount,
      sessions: generation.sessions,
      conflicts: generation.conflicts,
    };
  }

  async updateSchedule(
    centerId: string,
    id: string,
    input: UpdateClassScheduleInput,
  ): Promise<ClassSchedule> {
    const db = getTenantedClient(this.prisma, centerId);

    // Bump effectiveFrom whenever any anchor-affecting field changes so
    // biweekly counting realigns to the edit moment. Without this bump the
    // series would continue to count weeks from the original creation date,
    // silently drifting alternating-week patterns whenever a schedule is
    // edited.
    const shouldBumpAnchor = ANCHOR_BUMPING_FIELDS.some(
      (field) => input[field] !== undefined,
    );

    const data: Record<string, unknown> = { ...input };
    if (input.endDate !== undefined) {
      data.endDate = input.endDate ? new Date(input.endDate) : null;
    }
    if (shouldBumpAnchor) {
      data.effectiveFrom = new Date();
    }

    const row = await db.classSchedule.update({
      where: { id },
      data,
    });
    return asSchedule(row);
  }

  async deleteSchedule(centerId: string, id: string): Promise<void> {
    const db = getTenantedClient(this.prisma, centerId);
    await db.classSchedule.delete({
      where: { id },
    });
  }

  async getSchedulesByClass(
    centerId: string,
    classId: string,
  ): Promise<ClassSchedule[]> {
    const db = getTenantedClient(this.prisma, centerId);
    const rows = await db.classSchedule.findMany({
      where: { classId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
    return rows.map(asSchedule);
  }
}
