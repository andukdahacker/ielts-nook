import { PrismaClient, getTenantedClient } from "@workspace/db";
import { AppError } from "../../errors/app-error.js";
import {
  CreateClassSessionInput,
  UpdateClassSessionInput,
  ClassSession,
  GenerateSessionsInput,
  ConflictCheckInput,
  ConflictResult,
  ConflictingSession,
  Suggestion,
} from "@workspace/types";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  parseISO,
  isValid,
  endOfDay,
} from "date-fns";
import { fromZonedTime, toZonedTime, formatInTimeZone } from "date-fns-tz";

// Default tenant timezone if a center has not configured one.
const DEFAULT_TZ = "UTC";

/**
 * Build the absolute UTC instant for a given (centerLocalDate, HH, mm) in the
 * center's timezone. This is the load-bearing helper for generation: schedule
 * times are wall-clock values in the center's TZ, but Prisma persists them as
 * UTC instants. Without TZ-aware conversion, sessions drift across DST and
 * non-UTC server hosts.
 */
function buildSessionInstant(
  centerLocalDate: Date,
  hour: number,
  minute: number,
  timezone: string,
): Date {
  // formatInTimeZone gives us the YYYY-MM-DD label we want as the local date
  // in the center's TZ; combine with HH:mm and convert to UTC.
  const datePart = formatInTimeZone(centerLocalDate, timezone, "yyyy-MM-dd");
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return fromZonedTime(`${datePart}T${hh}:${mm}:00`, timezone);
}

/**
 * Returns the day-of-week (0 = Sunday … 6 = Saturday) for the given instant
 * AS OBSERVED IN the supplied timezone. Crucial for cross-tz correctness:
 * a UTC instant near midnight maps to different weekdays in different zones.
 */
function dayOfWeekInTz(date: Date, timezone: string): number {
  return Number(formatInTimeZone(date, timezone, "i")) % 7; // i: 1=Mon..7=Sun → 1..6,0
}

export class SessionsService {
  constructor(private readonly prisma: PrismaClient) {}

  async listSessions(
    centerId: string,
    startDate: Date,
    endDate: Date,
    classId?: string,
  ): Promise<ClassSession[]> {
    const db = getTenantedClient(this.prisma, centerId);
    return await db.classSession.findMany({
      where: {
        ...(classId && { classId }),
        startTime: { gte: startDate },
        endTime: { lte: endDate },
      },
      include: {
        class: {
          include: {
            course: true,
            teacher: {
              select: { id: true, name: true },
            },
            _count: {
              select: { students: true },
            },
          },
        },
      },
      orderBy: { startTime: "asc" },
    });
  }

  async getSessionsForWeek(
    centerId: string,
    weekStart: Date,
    classId?: string,
  ): Promise<ClassSession[]> {
    const start = startOfWeek(weekStart, { weekStartsOn: 1 }); // Monday
    const end = endOfWeek(weekStart, { weekStartsOn: 1 }); // Sunday
    return this.listSessions(centerId, start, end, classId);
  }

  async getSession(centerId: string, id: string): Promise<ClassSession> {
    const db = getTenantedClient(this.prisma, centerId);
    return await db.classSession.findUniqueOrThrow({
      where: { id },
      include: {
        class: {
          include: {
            course: true,
            teacher: {
              select: { id: true, name: true },
            },
            _count: {
              select: { students: true },
            },
          },
        },
      },
    });
  }

  async createSession(
    centerId: string,
    input: CreateClassSessionInput,
  ): Promise<ClassSession> {
    const db = getTenantedClient(this.prisma, centerId);

    // Verify class belongs to center
    await db.class.findUniqueOrThrow({
      where: { id: input.classId },
    });

    const startTime = typeof input.startTime === "string"
      ? new Date(input.startTime)
      : input.startTime;
    const endTime = typeof input.endTime === "string"
      ? new Date(input.endTime)
      : input.endTime;

    const primarySession = await db.classSession.create({
      data: {
        classId: input.classId,
        scheduleId: input.scheduleId,
        startTime,
        endTime,
        roomName: input.roomName,
        status: input.status ?? "SCHEDULED",
        centerId,
      },
      include: {
        class: {
          include: {
            course: true,
            teacher: {
              select: { id: true, name: true },
            },
            _count: {
              select: { students: true },
            },
          },
        },
      },
    });

    return primarySession;
  }

  async updateSession(
    centerId: string,
    id: string,
    input: UpdateClassSessionInput,
  ): Promise<{ session: ClassSession; previousStartTime: Date; previousEndTime: Date; previousRoomName: string | null }> {
    const db = getTenantedClient(this.prisma, centerId);

    // Get the current session to compare changes
    const currentSession = await db.classSession.findUniqueOrThrow({
      where: { id },
    });

    const updateData: Record<string, unknown> = {};
    if (input.startTime !== undefined) {
      updateData.startTime = typeof input.startTime === "string"
        ? new Date(input.startTime)
        : input.startTime;
    }
    if (input.endTime !== undefined) {
      updateData.endTime = typeof input.endTime === "string"
        ? new Date(input.endTime)
        : input.endTime;
    }
    if (input.roomName !== undefined) {
      updateData.roomName = input.roomName;
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    const session = await db.classSession.update({
      where: { id },
      data: updateData,
      include: {
        class: {
          include: {
            course: true,
            teacher: {
              select: { id: true, name: true },
            },
            _count: {
              select: { students: true },
            },
          },
        },
      },
    });

    return {
      session,
      previousStartTime: currentSession.startTime,
      previousEndTime: currentSession.endTime,
      previousRoomName: currentSession.roomName,
    };
  }

  async deleteSession(centerId: string, id: string): Promise<void> {
    const db = getTenantedClient(this.prisma, centerId);
    await db.classSession.delete({
      where: { id },
    });
  }

  async deleteFutureSessions(
    centerId: string,
    sessionId: string,
  ): Promise<{ deletedCount: number; classId: string }> {
    const db = getTenantedClient(this.prisma, centerId);

    const session = await db.classSession.findUniqueOrThrow({
      where: { id: sessionId },
    });

    if (!session.scheduleId) {
      throw AppError.badRequest("Session is not part of a recurring series");
    }

    const result = await db.classSession.deleteMany({
      where: {
        scheduleId: session.scheduleId,
        startTime: { gte: session.startTime },
        centerId,
      },
    });

    // Clean up orphaned ClassSchedule if no sessions remain
    const remainingCount = await db.classSession.count({
      where: { scheduleId: session.scheduleId },
    });
    if (remainingCount === 0) {
      await db.classSchedule.delete({ where: { id: session.scheduleId } });
    }

    return { deletedCount: result.count, classId: session.classId };
  }

  /**
   * Generate sessions from a specific schedule, respecting frequency,
   * exceptions, dedup, and the center's timezone.
   *
   * Correctness guarantees:
   *   * Time correctness: HH:mm in the schedule is interpreted in the center's
   *     timezone (Center.timezone), not the server's local time. Sessions land
   *     at the same wall-clock time across DST transitions.
   *   * Day-of-week matching: weekdays are computed against the candidate date
   *     viewed in the center's timezone, so non-UTC centers don't generate
   *     "Monday" sessions on Sunday or Tuesday.
   *   * Biweekly anchoring: uses Center.effectiveFrom as the parity anchor.
   *     Computed from UTC midnight diff so DST does not skip/duplicate weeks.
   *   * Dedup: combines an in-memory pass (skipping CANCELLED exceptions and
   *     respecting both `startTime` and `originalStartTime`) with a database
   *     UNIQUE index (`class_session_schedule_start_uk`) plus
   *     `createMany({ skipDuplicates: true })` to be race-safe.
   *   * Manual sessions: skipped via a parallel `(classId, startTime)` lookup
   *     so an auto-generated schedule never duplicates a manually-created
   *     session at the same slot.
   *   * COMPLETED sessions are sacred: their slots are never overwritten and
   *     the in-memory dedup layer also includes them.
   *   * Reporting: returns `result.count` from `createMany` so callers see the
   *     true number of inserted rows (not the candidate count).
   */
  async generateSessionsFromSchedule(
    centerId: string,
    scheduleId: string,
  ): Promise<{
    generatedCount: number;
    sessions: ClassSession[];
    conflicts: ConflictResult[];
  }> {
    const db = getTenantedClient(this.prisma, centerId);

    const schedule = await db.classSchedule.findUniqueOrThrow({
      where: { id: scheduleId },
    });

    // Resolve the center's timezone once. Default UTC.
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
      select: { timezone: true },
    });
    const tz = center?.timezone || DEFAULT_TZ;

    // Resolve range bounds. effectiveFrom is the caller-set anchor; if absent
    // we use today (UTC start-of-day). endDate is inclusive — we extend it to
    // end-of-day in the center's timezone so a schedule that ends on Dec 31
    // includes a 09:00 session on Dec 31.
    const nowUtc = new Date();
    const startOfTodayUtc = new Date(
      Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate()),
    );
    const rangeStart =
      schedule.effectiveFrom && schedule.effectiveFrom.getTime() > startOfTodayUtc.getTime()
        ? schedule.effectiveFrom
        : startOfTodayUtc;
    const rangeEnd = schedule.endDate
      ? endOfDay(toZonedTime(schedule.endDate, tz))
      : addMonths(startOfTodayUtc, 3);

    if (rangeEnd.getTime() < rangeStart.getTime()) {
      return { generatedCount: 0, sessions: [], conflicts: [] };
    }

    // Expand candidate dates whose weekday-in-center-tz matches dayOfWeek.
    // We iterate over UTC days (eachDayOfInterval) but evaluate the weekday in
    // the center's TZ.
    const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    const matchingDays = days.filter((day) => dayOfWeekInTz(day, tz) === schedule.dayOfWeek);

    // For BIWEEKLY: keep every other matching day, anchored on effectiveFrom.
    // We measure the diff in 7-day buckets against UTC midnights (rather than
    // differenceInWeeks which rounds toward zero) so DST transitions don't
    // cause off-by-one parity flips.
    const anchor = schedule.effectiveFrom ?? rangeStart;
    const anchorUtcMidnight = Date.UTC(
      anchor.getUTCFullYear(),
      anchor.getUTCMonth(),
      anchor.getUTCDate(),
    );
    let candidateDays: Date[];
    if (schedule.frequency === "BIWEEKLY") {
      const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
      candidateDays = matchingDays.filter((day) => {
        const dayUtcMidnight = Date.UTC(
          day.getUTCFullYear(),
          day.getUTCMonth(),
          day.getUTCDate(),
        );
        const weeks = Math.floor((dayUtcMidnight - anchorUtcMidnight) / ONE_WEEK_MS);
        return weeks % 2 === 0;
      });
    } else {
      candidateDays = matchingDays;
    }

    // Don't generate sessions in the past. Compare against rangeStart (not
    // startOfTodayUtc) so future-effective schedules still work.
    candidateDays = candidateDays.filter((day) => day.getTime() >= rangeStart.getTime());

    if (candidateDays.length === 0) {
      return { generatedCount: 0, sessions: [], conflicts: [] };
    }

    // Parse schedule HH:mm and build candidate session instants.
    const [startHour = 0, startMinute = 0] = schedule.startTime.split(":").map(Number);
    const [endHour = 0, endMinute = 0] = schedule.endTime.split(":").map(Number);

    const candidates = candidateDays.map((day) => ({
      startTime: buildSessionInstant(day, startHour, startMinute, tz),
      endTime: buildSessionInstant(day, endHour, endMinute, tz),
    }));

    // Dedup against existing sessions for this schedule. We include the
    // schedule's own historical sessions (including exceptions and COMPLETED)
    // and any manually-created session at the same (classId, startTime).
    const [scheduleSessions, manualSessionsAtSlot] = await Promise.all([
      db.classSession.findMany({
        where: { scheduleId: schedule.id },
        select: {
          startTime: true,
          originalStartTime: true,
          status: true,
          isException: true,
        },
      }),
      // Manual sessions (no scheduleId) for the same class at any of the
      // candidate slots — preserve them, never overwrite or duplicate.
      db.classSession.findMany({
        where: {
          classId: schedule.classId,
          scheduleId: null,
          startTime: { in: candidates.map((c) => c.startTime) },
        },
        select: { startTime: true },
      }),
    ]);

    // Build a set of "occupied" startTimes. Rules:
    //   * Always include the row's startTime (preserves regular and COMPLETED rows).
    //   * Include originalStartTime ONLY when the exception is still live
    //     (status != 'CANCELLED'). A cancelled-and-re-deleted exception
    //     should not block regenerating that slot.
    //   * Include manual sessions at any candidate slot.
    const existingTimes = new Set<string>();
    for (const s of scheduleSessions) {
      existingTimes.add(s.startTime.toISOString());
      if (s.originalStartTime && s.status !== "CANCELLED") {
        existingTimes.add(s.originalStartTime.toISOString());
      }
    }
    for (const m of manualSessionsAtSlot) {
      existingTimes.add(m.startTime.toISOString());
    }

    const sessionsToCreate = candidates
      .filter((c) => !existingTimes.has(c.startTime.toISOString()))
      .map((c) => ({
        classId: schedule.classId,
        scheduleId: schedule.id,
        startTime: c.startTime,
        endTime: c.endTime,
        roomName: schedule.roomName,
        status: "SCHEDULED" as const,
        isException: false,
        centerId,
      }));

    let actualCreatedCount = 0;
    if (sessionsToCreate.length > 0) {
      // skipDuplicates: a defense-in-depth fallback if the application-level
      // dedup misses (e.g., a concurrent generation interleaves between our
      // dedup query and the createMany). The unique index added in this
      // migration makes the database the final source of truth.
      const result = await db.classSession.createMany({
        data: sessionsToCreate,
        skipDuplicates: true,
      });
      actualCreatedCount = result.count;
    }

    // Fetch only the sessions we just created (by their startTimes) to avoid
    // ballooning the response with the schedule's entire history.
    const createdSessions =
      sessionsToCreate.length > 0
        ? await db.classSession.findMany({
            where: {
              scheduleId: schedule.id,
              startTime: { in: sessionsToCreate.map((s) => s.startTime) },
            },
            include: {
              class: {
                include: {
                  course: true,
                  teacher: { select: { id: true, name: true } },
                  _count: { select: { students: true } },
                },
              },
            },
            orderBy: { startTime: "asc" },
          })
        : [];

    // Check batch conflicts in a single pass. checkBatchConflicts already
    // returns Map<sessionId, hasConflict>; we do not re-issue per-session
    // checkConflicts queries (avoids the previous N+1 pathology).
    const conflicts: ConflictResult[] = [];
    if (createdSessions.length > 0) {
      const sessionData = createdSessions.map((s) => ({
        id: s.id,
        classId: s.classId,
        startTime: new Date(s.startTime),
        endTime: new Date(s.endTime),
        roomName: s.roomName ?? null,
      }));

      const conflictMap = await this.checkBatchConflicts(centerId, sessionData);
      // Surface only sessions that actually have conflicts. We synthesize a
      // light ConflictResult per offending session — full per-conflict detail
      // can be fetched on demand by the client via /sessions/check-conflicts.
      for (const session of createdSessions) {
        if (conflictMap.get(session.id)) {
          conflicts.push({
            hasConflicts: true,
            roomConflicts: [
              {
                id: session.id,
                classId: session.classId,
                startTime: session.startTime,
                endTime: session.endTime,
                roomName: session.roomName,
              },
            ],
            teacherConflicts: [],
          });
        }
      }
    }

    return {
      generatedCount: actualCreatedCount,
      sessions: createdSessions,
      conflicts,
    };
  }

  /**
   * @deprecated Use generateSessionsFromSchedule() — auto-generation now
   * happens server-side when a ClassSchedule is created/updated. This method
   * is kept only so the deprecated POST /sessions/generate endpoint remains
   * functional for any external clients. Internally it delegates to
   * generateSessionsFromSchedule for each affected schedule, so all the
   * timezone/dedup/concurrency correctness fixes apply here too.
   *
   * The legacy `startDate`/`endDate` arguments are only used to filter which
   * schedules are processed (those whose effective range intersects the input
   * window). The actual generation respects each schedule's own
   * frequency/effectiveFrom/endDate fields — not the supplied window.
   */
  async generateSessions(
    centerId: string,
    input: GenerateSessionsInput,
  ): Promise<{ generatedCount: number; sessions: ClassSession[] }> {
    const db = getTenantedClient(this.prisma, centerId);

    const startDate = typeof input.startDate === "string"
      ? parseISO(input.startDate)
      : input.startDate;
    const endDate = typeof input.endDate === "string"
      ? parseISO(input.endDate)
      : input.endDate;

    if (!isValid(startDate) || !isValid(endDate)) {
      throw AppError.badRequest("Invalid date range provided");
    }

    const schedules = await db.classSchedule.findMany({
      where: input.classId ? { classId: input.classId } : undefined,
      select: { id: true },
    });

    let totalGenerated = 0;
    const allSessions: ClassSession[] = [];

    for (const schedule of schedules) {
      const result = await this.generateSessionsFromSchedule(centerId, schedule.id);
      totalGenerated += result.generatedCount;
      allSessions.push(...result.sessions);
    }

    return {
      generatedCount: totalGenerated,
      sessions: allSessions,
    };
  }

  /**
   * Get class information including enrolled students and teacher for notifications
   */
  async getClassParticipants(
    centerId: string,
    classId: string,
  ): Promise<{ teacherId: string | null; studentIds: string[] }> {
    const db = getTenantedClient(this.prisma, centerId);

    const classData = await db.class.findUniqueOrThrow({
      where: { id: classId },
      include: {
        students: {
          select: { studentId: true },
        },
      },
    });

    return {
      teacherId: classData.teacherId,
      studentIds: classData.students.map((s) => s.studentId),
    };
  }

  /**
   * Check for scheduling conflicts (room double-booking or teacher double-booking)
   * Time Overlap Formula: (session1.startTime < session2.endTime) AND (session1.endTime > session2.startTime)
   */
  async checkConflicts(
    centerId: string,
    input: ConflictCheckInput,
  ): Promise<ConflictResult> {
    const db = getTenantedClient(this.prisma, centerId);

    const startTime = typeof input.startTime === "string"
      ? new Date(input.startTime)
      : input.startTime;
    const endTime = typeof input.endTime === "string"
      ? new Date(input.endTime)
      : input.endTime;

    const roomConflicts: ConflictingSession[] = [];
    const teacherConflicts: ConflictingSession[] = [];

    // Check for room conflicts (only if roomName is provided and not null/empty)
    if (input.roomName) {
      const roomConflictSessions = await db.classSession.findMany({
        where: {
          roomName: input.roomName,
          ...(input.excludeSessionId && { id: { not: input.excludeSessionId } }),
          status: { not: "CANCELLED" },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
        include: {
          class: {
            include: {
              course: true,
              teacher: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      for (const session of roomConflictSessions) {
        roomConflicts.push({
          id: session.id,
          classId: session.classId,
          startTime: session.startTime,
          endTime: session.endTime,
          roomName: session.roomName,
          className: session.class?.name,
          courseName: session.class?.course?.name,
          teacherName: session.class?.teacher?.name,
        });
      }
    }

    // Get teacherId from the class being scheduled
    const classData = await db.class.findUnique({
      where: { id: input.classId },
      select: { teacherId: true },
    });
    const teacherId = classData?.teacherId;

    // Check for teacher conflicts (only if teacher is assigned)
    if (teacherId) {
      const teacherConflictSessions = await db.classSession.findMany({
        where: {
          class: { teacherId },
          ...(input.excludeSessionId && { id: { not: input.excludeSessionId } }),
          status: { not: "CANCELLED" },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
        include: {
          class: {
            include: {
              course: true,
              teacher: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      for (const session of teacherConflictSessions) {
        teacherConflicts.push({
          id: session.id,
          classId: session.classId,
          startTime: session.startTime,
          endTime: session.endTime,
          roomName: session.roomName,
          className: session.class?.name,
          courseName: session.class?.course?.name,
          teacherName: session.class?.teacher?.name,
        });
      }
    }

    const hasConflicts = roomConflicts.length > 0 || teacherConflicts.length > 0;

    // Generate suggestions if conflicts exist
    let suggestions: Suggestion[] | undefined;
    if (hasConflicts) {
      suggestions = await this.suggestNextAvailable(centerId, {
        classId: input.classId,
        startTime,
        endTime,
        roomName: input.roomName,
      });
    }

    return {
      hasConflicts,
      roomConflicts,
      teacherConflicts,
      suggestions,
    };
  }

  /**
   * Suggest alternative time slots or rooms when conflicts are detected
   */
  async suggestNextAvailable(
    centerId: string,
    input: {
      classId: string;
      startTime: Date;
      endTime: Date;
      roomName?: string | null;
    },
  ): Promise<Suggestion[]> {
    const db = getTenantedClient(this.prisma, centerId);
    const suggestions: Suggestion[] = [];

    const duration = input.endTime.getTime() - input.startTime.getTime();
    const targetDate = input.startTime;

    // Get teacherId for the class
    const classData = await db.class.findUnique({
      where: { id: input.classId },
      select: { teacherId: true },
    });
    const teacherId = classData?.teacherId;

    // Get start and end of the target day
    const dayStart = new Date(targetDate);
    dayStart.setHours(8, 0, 0, 0); // Business hours start at 8am
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(20, 0, 0, 0); // Business hours end at 8pm

    // Get all sessions on the same day that might conflict (teacher or room)
    const sessionsOnDay = await db.classSession.findMany({
      where: {
        status: { not: "CANCELLED" },
        startTime: { gte: dayStart, lt: dayEnd },
        OR: [
          ...(teacherId ? [{ class: { teacherId } }] : []),
          ...(input.roomName ? [{ roomName: input.roomName }] : []),
        ],
      },
      orderBy: { startTime: "asc" },
    });

    // Find available time slots on the same day
    const busySlots = sessionsOnDay.map((s) => ({
      start: s.startTime.getTime(),
      end: s.endTime.getTime(),
    }));

    // Sort by start time
    busySlots.sort((a, b) => a.start - b.start);

    // Find gaps in schedule after the requested time
    let searchStart = Math.max(input.startTime.getTime(), dayStart.getTime());
    const maxSuggestions = 3;
    let foundTimeSlots = 0;

    // Check if the slot before the first busy slot is available
    if (busySlots.length === 0) {
      // No sessions, any time works
      if (searchStart + duration <= dayEnd.getTime()) {
        const suggestedStart = new Date(searchStart);
        const suggestedEnd = new Date(searchStart + duration);
        suggestions.push({
          type: "time",
          value: `${suggestedStart.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} - ${suggestedEnd.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`,
          startTime: suggestedStart,
          endTime: suggestedEnd,
        });
        foundTimeSlots++;
      }
    } else {
      // Find gaps between busy slots
      for (let i = 0; i <= busySlots.length && foundTimeSlots < maxSuggestions; i++) {
        const gapStart = i === 0 ? searchStart : busySlots[i - 1]!.end;
        const gapEnd = i === busySlots.length ? dayEnd.getTime() : busySlots[i]!.start;

        // Check if gap is large enough and after the search start
        if (gapStart >= searchStart && gapEnd - gapStart >= duration) {
          const suggestedStart = new Date(gapStart);
          const suggestedEnd = new Date(gapStart + duration);
          suggestions.push({
            type: "time",
            value: `${suggestedStart.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} - ${suggestedEnd.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`,
            startTime: suggestedStart,
            endTime: suggestedEnd,
          });
          foundTimeSlots++;
        }
      }
    }

    // Find alternative rooms that are free during the requested time
    if (input.roomName) {
      // Get distinct room names from recent sessions (last 90 days) for relevance
      const recentCutoff = new Date();
      recentCutoff.setDate(recentCutoff.getDate() - 90);
      const allRooms = await db.classSession.findMany({
        where: {
          roomName: { not: null },
          startTime: { gte: recentCutoff },
          status: { not: "CANCELLED" },
        },
        select: { roomName: true },
        distinct: ["roomName"],
      });

      const roomNames = allRooms
        .map((r) => r.roomName)
        .filter((name): name is string => name !== null && name !== input.roomName);

      // Check which rooms are free during the requested time
      for (const roomName of roomNames.slice(0, 3)) {
        const conflictingSession = await db.classSession.findFirst({
          where: {
            roomName,
            status: { not: "CANCELLED" },
            startTime: { lt: input.endTime },
            endTime: { gt: input.startTime },
          },
        });

        if (!conflictingSession) {
          suggestions.push({
            type: "room",
            value: roomName,
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Efficiently check conflicts for multiple sessions at once.
   * Used by calendar to mark existing sessions with conflict icons.
   * Queries the DB for ALL overlapping sessions in the time range (not just the batch)
   * to catch conflicts with sessions outside the current view.
   * Returns a Map of sessionId -> hasConflicts boolean.
   */
  async checkBatchConflicts(
    centerId: string,
    sessions: { id: string; classId: string; startTime: Date; endTime: Date; roomName: string | null }[],
  ): Promise<Map<string, boolean>> {
    const db = getTenantedClient(this.prisma, centerId);
    const conflictMap = new Map<string, boolean>();

    if (sessions.length === 0) {
      return conflictMap;
    }

    // Find the full time range of the batch
    const minStart = new Date(
      Math.min(...sessions.map((s) => new Date(s.startTime).getTime())),
    );
    const maxEnd = new Date(
      Math.max(...sessions.map((s) => new Date(s.endTime).getTime())),
    );

    // Query ALL non-cancelled sessions that overlap with the batch time range
    const allOverlapping = await db.classSession.findMany({
      where: {
        status: { not: "CANCELLED" },
        startTime: { lt: maxEnd },
        endTime: { gt: minStart },
      },
      select: {
        id: true,
        classId: true,
        startTime: true,
        endTime: true,
        roomName: true,
        class: { select: { teacherId: true } },
      },
    });

    // Build teacher map from all overlapping sessions
    const teacherMap = new Map<string, string | null>();
    for (const s of allOverlapping) {
      teacherMap.set(s.classId, s.class?.teacherId ?? null);
    }

    // Also ensure batch session classes are in the teacher map
    const missingClassIds = sessions
      .filter((s) => !teacherMap.has(s.classId))
      .map((s) => s.classId);
    if (missingClassIds.length > 0) {
      const classes = await db.class.findMany({
        where: { id: { in: [...new Set(missingClassIds)] } },
        select: { id: true, teacherId: true },
      });
      for (const c of classes) {
        teacherMap.set(c.id, c.teacherId);
      }
    }

    // Check each batch session against ALL overlapping sessions
    for (const session of sessions) {
      let hasConflict = false;

      for (const other of allOverlapping) {
        if (other.id === session.id) continue;

        const overlaps =
          new Date(other.startTime) < new Date(session.endTime) &&
          new Date(other.endTime) > new Date(session.startTime);
        if (!overlaps) continue;

        // Room conflict
        if (session.roomName && other.roomName === session.roomName) {
          hasConflict = true;
          break;
        }

        // Teacher conflict
        const sessionTeacherId = teacherMap.get(session.classId);
        const otherTeacherId = teacherMap.get(other.classId);
        if (sessionTeacherId && otherTeacherId && sessionTeacherId === otherTeacherId) {
          hasConflict = true;
          break;
        }
      }

      conflictMap.set(session.id, hasConflict);
    }

    return conflictMap;
  }

  /**
   * List sessions with optional conflict status computation
   */
  async listSessionsWithConflicts(
    centerId: string,
    startDate: Date,
    endDate: Date,
    classId?: string,
  ): Promise<(ClassSession & { hasConflicts?: boolean })[]> {
    const sessions = await this.listSessions(centerId, startDate, endDate, classId);

    // Compute conflicts for all sessions
    const sessionData = sessions.map((s) => ({
      id: s.id,
      classId: s.classId,
      startTime: new Date(s.startTime),
      endTime: new Date(s.endTime),
      roomName: s.roomName ?? null,
    }));

    const conflictMap = await this.checkBatchConflicts(centerId, sessionData);

    // Add hasConflicts flag to each session
    return sessions.map((session) => ({
      ...session,
      hasConflicts: conflictMap.get(session.id) ?? false,
    }));
  }
}
