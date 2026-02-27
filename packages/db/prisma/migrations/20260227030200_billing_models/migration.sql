-- CreateTable
CREATE TABLE "subscription" (
    "id" TEXT NOT NULL,
    "center_id" TEXT NOT NULL,
    "polar_subscription_id" TEXT,
    "polar_customer_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pilot',
    "tier" TEXT NOT NULL DEFAULT 'pilot',
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_event" (
    "id" TEXT NOT NULL,
    "center_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL,
    "description" TEXT,
    "polar_order_id" TEXT,
    "invoice_url" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_count_snapshot" (
    "id" TEXT NOT NULL,
    "center_id" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_count_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_center_id_key" ON "subscription"("center_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_polar_subscription_id_key" ON "subscription"("polar_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_event_polar_order_id_key" ON "billing_event"("polar_order_id");

-- CreateIndex
CREATE INDEX "billing_event_center_id_idx" ON "billing_event"("center_id");

-- CreateIndex
CREATE INDEX "student_count_snapshot_center_id_idx" ON "student_count_snapshot"("center_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_count_snapshot_center_id_month_key" ON "student_count_snapshot"("center_id", "month");

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_event" ADD CONSTRAINT "billing_event_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_count_snapshot" ADD CONSTRAINT "student_count_snapshot_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "center"("id") ON DELETE CASCADE ON UPDATE CASCADE;
