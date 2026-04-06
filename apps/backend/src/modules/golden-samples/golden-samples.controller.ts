import { GoldenSamplesService } from "./golden-samples.service.js";
import { CreateGoldenSample, SkillType, UpdateGoldenSample } from "@workspace/types";

// Prisma returns Date objects and string skillType — serialize for API response
function serialize(sample: { id: string; centerId: string; title: string; skillType: string; studentWork: string; teacherFeedback: string; isActive: boolean; order: number; createdAt: Date; updatedAt: Date }) {
  return {
    ...sample,
    skillType: sample.skillType as SkillType,
    createdAt: sample.createdAt.toISOString(),
    updatedAt: sample.updatedAt.toISOString(),
  };
}

export class GoldenSamplesController {
  constructor(private readonly service: GoldenSamplesService) {}

  async list(centerId: string) {
    const data = await this.service.list(centerId);
    return { data: data.map(serialize), message: "Golden samples retrieved" };
  }

  async getById(centerId: string, id: string) {
    const data = await this.service.getById(centerId, id);
    return { data: serialize(data), message: "Golden sample retrieved" };
  }

  async create(centerId: string, body: CreateGoldenSample) {
    const data = await this.service.create(centerId, body);
    return { data: serialize(data), message: "Golden sample created" };
  }

  async update(centerId: string, id: string, body: UpdateGoldenSample) {
    const data = await this.service.update(centerId, id, body);
    return { data: serialize(data), message: "Golden sample updated" };
  }

  async delete(centerId: string, id: string) {
    await this.service.delete(centerId, id);
    return { data: null, message: "Golden sample deleted" };
  }

  async reorder(centerId: string, ids: string[]) {
    await this.service.reorder(centerId, ids);
    return { data: null, message: "Golden samples reordered" };
  }
}
