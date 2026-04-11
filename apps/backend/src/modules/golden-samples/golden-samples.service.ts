import { PrismaClient, getTenantedClient } from "@workspace/db";
import type { ExerciseSkill } from "@workspace/db";
import { CreateGoldenSample, UpdateGoldenSample } from "@workspace/types";

const MAX_SAMPLES_PER_SKILL_TYPE = 10;

export class GoldenSamplesService {
  constructor(private prisma: PrismaClient) {}

  async list(centerId: string) {
    const db = getTenantedClient(this.prisma, centerId);
    return db.goldenSample.findMany({
      orderBy: { order: "asc" },
    });
  }

  async getById(centerId: string, id: string) {
    const db = getTenantedClient(this.prisma, centerId);
    const sample = await db.goldenSample.findFirst({
      where: { id },
    });
    if (!sample) {
      throw new Error("Golden sample not found");
    }
    return sample;
  }

  async create(centerId: string, data: CreateGoldenSample) {
    return this.prisma.$transaction(async (tx) => {
      const tenantedTx = getTenantedClient(tx as unknown as PrismaClient, centerId);

      // Enforce max 10 samples per skill type per center
      const count = await tenantedTx.goldenSample.count({
        where: { skillType: data.skillType },
      });
      if (count >= MAX_SAMPLES_PER_SKILL_TYPE) {
        throw new Error(
          `Maximum ${MAX_SAMPLES_PER_SKILL_TYPE} samples per skill type. Delete an existing sample first.`,
        );
      }

      // Set order to next available
      const maxOrder = await tenantedTx.goldenSample.findFirst({
        where: { skillType: data.skillType },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      return tenantedTx.goldenSample.create({
        data: {
          centerId,
          title: data.title,
          skillType: data.skillType,
          studentWork: data.studentWork,
          teacherFeedback: data.teacherFeedback,
          order: (maxOrder?.order ?? -1) + 1,
        },
      });
    });
  }

  async update(centerId: string, id: string, data: UpdateGoldenSample) {
    const db = getTenantedClient(this.prisma, centerId);

    // Verify sample exists for this center
    const existing = await db.goldenSample.findFirst({ where: { id } });
    if (!existing) {
      throw new Error("Golden sample not found");
    }

    return db.goldenSample.update({
      where: { id },
      data,
    });
  }

  async delete(centerId: string, id: string) {
    const db = getTenantedClient(this.prisma, centerId);

    const existing = await db.goldenSample.findFirst({ where: { id } });
    if (!existing) {
      throw new Error("Golden sample not found");
    }

    return db.goldenSample.delete({ where: { id } });
  }

  async reorder(centerId: string, ids: string[]) {
    const db = getTenantedClient(this.prisma, centerId);

    // Deduplicate IDs
    const uniqueIds = [...new Set(ids)];

    // Verify all IDs belong to this center and share the same skillType
    const samples = await db.goldenSample.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, skillType: true },
    });
    if (samples.length !== uniqueIds.length) {
      throw new Error("One or more sample IDs not found");
    }

    const skillTypes = new Set(samples.map((s) => s.skillType));
    if (skillTypes.size > 1) {
      throw new Error("All samples in a reorder must share the same skill type");
    }

    // Bulk update order
    await Promise.all(
      uniqueIds.map((id, index) =>
        db.goldenSample.update({ where: { id }, data: { order: index } }),
      ),
    );
  }

  async getActiveByCenterAndSkill(centerId: string, skillType: string) {
    const db = getTenantedClient(this.prisma, centerId);
    return db.goldenSample.findMany({
      where: { skillType: skillType as ExerciseSkill, isActive: true },
      orderBy: { order: "asc" },
      select: { studentWork: true, teacherFeedback: true },
    });
  }
}
