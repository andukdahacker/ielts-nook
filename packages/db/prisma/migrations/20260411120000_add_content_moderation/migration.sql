-- CreateEnum
CREATE TYPE "ModerationFlagStatus" AS ENUM ('PENDING', 'APPROVED', 'REDACTED', 'DELETED');

-- CreateEnum
CREATE TYPE "ModerationContentType" AS ENUM ('EXERCISE', 'SUBMISSION', 'AI_FEEDBACK');

-- CreateTable
CREATE TABLE "content_moderation_flag" (
    "id" TEXT NOT NULL,
    "center_id" TEXT NOT NULL,
    "content_type" "ModerationContentType" NOT NULL,
    "content_id" TEXT NOT NULL,
    "flagged_text" TEXT NOT NULL,
    "matched_terms" TEXT[],
    "status" "ModerationFlagStatus" NOT NULL DEFAULT 'PENDING',
    "resolved_by_id" TEXT,
    "resolved_at" TIMESTAMP(3),
    "redacted_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_moderation_flag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_term_list" (
    "id" TEXT NOT NULL,
    "center_id" TEXT NOT NULL,
    "terms" TEXT[],
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "moderation_term_list_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_moderation_flag_center_id_status_idx" ON "content_moderation_flag"("center_id", "status");

-- CreateIndex
CREATE INDEX "content_moderation_flag_center_id_content_type_idx" ON "content_moderation_flag"("center_id", "content_type");

-- CreateIndex
CREATE INDEX "content_moderation_flag_content_id_idx" ON "content_moderation_flag"("content_id");

-- CreateIndex
CREATE UNIQUE INDEX "moderation_term_list_center_id_key" ON "moderation_term_list"("center_id");

-- AddForeignKey
ALTER TABLE "content_moderation_flag" ADD CONSTRAINT "content_moderation_flag_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_moderation_flag" ADD CONSTRAINT "content_moderation_flag_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "center_membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_term_list" ADD CONSTRAINT "moderation_term_list_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "center"("id") ON DELETE CASCADE ON UPDATE CASCADE;
