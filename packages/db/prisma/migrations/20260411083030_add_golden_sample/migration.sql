-- CreateTable
CREATE TABLE "golden_sample" (
    "id" TEXT NOT NULL,
    "center_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "skill_type" "ExerciseSkill" NOT NULL,
    "student_work" TEXT NOT NULL,
    "teacher_feedback" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "golden_sample_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "golden_sample_center_id_idx" ON "golden_sample"("center_id");

-- CreateIndex
CREATE INDEX "golden_sample_center_id_skill_type_idx" ON "golden_sample"("center_id", "skill_type");

-- AddForeignKey
ALTER TABLE "golden_sample" ADD CONSTRAINT "golden_sample_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "center"("id") ON DELETE CASCADE ON UPDATE CASCADE;
