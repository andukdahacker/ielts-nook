-- Story 14-1: Auto-generate sessions from recurrence
--
-- Migration adds:
--   * ClassSchedule: frequency (enum), endDate, effectiveFrom
--   * ClassSession: isException, originalStartTime, originalEndTime
--   * Indexes for fast dedup and rolling-window queries
--   * UNIQUE constraint on (scheduleId, startTime) — protects against duplicate
--     sessions from concurrent generation or Inngest retries.
--   * Backfill: existing rows get effective_from = created_at so biweekly
--     toggles on legacy schedules have a stable anchor.

-- CreateEnum
CREATE TYPE "ScheduleFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY');

-- AlterTable: ClassSchedule
ALTER TABLE "class_schedule" ADD COLUMN "frequency" "ScheduleFrequency" NOT NULL DEFAULT 'WEEKLY';
ALTER TABLE "class_schedule" ADD COLUMN "end_date" TIMESTAMP(3);
ALTER TABLE "class_schedule" ADD COLUMN "effective_from" TIMESTAMP(3);

-- Backfill: anchor existing schedules at their creation time so biweekly
-- counting remains stable if/when the user toggles frequency later.
UPDATE "class_schedule"
SET "effective_from" = "created_at"
WHERE "effective_from" IS NULL;

-- AlterTable: ClassSession
ALTER TABLE "class_session" ADD COLUMN "is_exception" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "class_session" ADD COLUMN "original_start_time" TIMESTAMP(3);
ALTER TABLE "class_session" ADD COLUMN "original_end_time" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "class_session_schedule_id_is_exception_idx" ON "class_session"("schedule_id", "is_exception");
CREATE INDEX "class_session_schedule_id_original_start_time_idx" ON "class_session"("schedule_id", "original_start_time");

-- CreateIndex (UNIQUE)
-- Defense-in-depth against duplicate session inserts from concurrent
-- generateSessionsFromSchedule callers or Inngest retries. Exception sessions
-- (which have a different startTime than the original) are still allowed.
CREATE UNIQUE INDEX "class_session_schedule_start_uk" ON "class_session"("schedule_id", "start_time");
