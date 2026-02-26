-- AlterTable
ALTER TABLE "user" ADD COLUMN     "email_engagement_notifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "email_notifications_paused" BOOLEAN NOT NULL DEFAULT false;
