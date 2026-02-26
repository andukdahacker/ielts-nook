-- CreateTable
CREATE TABLE "parent_email_entry" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "unsubscribed" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribe_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parent_email_entry_pkey" PRIMARY KEY ("id")
);

-- Migrate existing data from user.parent_email to new table
INSERT INTO "parent_email_entry" ("id", "user_id", "email", "unsubscribed", "unsubscribe_token", "created_at")
SELECT
    gen_random_uuid()::text,
    "id",
    "parent_email",
    false,
    gen_random_uuid()::text,
    CURRENT_TIMESTAMP
FROM "user"
WHERE "parent_email" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "parent_email_entry_unsubscribe_token_key" ON "parent_email_entry"("unsubscribe_token");

-- CreateIndex
CREATE INDEX "parent_email_entry_user_id_idx" ON "parent_email_entry"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "parent_email_entry_user_id_email_key" ON "parent_email_entry"("user_id", "email");

-- AddForeignKey
ALTER TABLE "parent_email_entry" ADD CONSTRAINT "parent_email_entry_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropColumn (AFTER data is migrated)
ALTER TABLE "user" DROP COLUMN "parent_email";
