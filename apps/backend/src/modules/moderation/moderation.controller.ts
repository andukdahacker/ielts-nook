import { ModerationService } from "./moderation.service.js";
import type {
  ModerationFlagStatus,
  ModerationContentType,
  ContentModerationFlag,
  ModerationTermList,
} from "@workspace/db";

function serializeFlag(flag: ContentModerationFlag) {
  return {
    ...flag,
    contentType: flag.contentType as string,
    status: flag.status as string,
    resolvedAt: flag.resolvedAt?.toISOString() ?? null,
    createdAt: flag.createdAt.toISOString(),
    updatedAt: flag.updatedAt.toISOString(),
  };
}

function serializeTermList(termList: ModerationTermList) {
  return {
    ...termList,
    createdAt: termList.createdAt.toISOString(),
    updatedAt: termList.updatedAt.toISOString(),
  };
}

export class ModerationController {
  constructor(private readonly service: ModerationService) {}

  async scanContent(centerId: string, text: string) {
    const result = await this.service.scanContent(text, centerId);
    return { data: result, message: result.clean ? "Content is clean" : "Content flagged" };
  }

  async getFlags(
    centerId: string,
    filters: {
      status?: ModerationFlagStatus;
      contentType?: ModerationContentType;
      contentId?: string;
      page: number;
      limit: number;
    },
  ) {
    const result = await this.service.getFlags(centerId, filters);
    return {
      data: result.data.map(serializeFlag),
      total: result.total,
      page: result.page,
      limit: result.limit,
      message: "Moderation flags retrieved",
    };
  }

  async getFlagById(centerId: string, flagId: string) {
    const flag = await this.service.getFlagById(centerId, flagId);
    return { data: serializeFlag(flag), message: "Moderation flag retrieved" };
  }

  async resolveFlag(
    centerId: string,
    flagId: string,
    action: "APPROVED" | "REDACTED" | "DELETED",
    resolvedById: string,
    redactedText?: string,
  ) {
    const flag = await this.service.resolveFlag(centerId, flagId, action, resolvedById, redactedText);
    return { data: serializeFlag(flag), message: `Flag ${action.toLowerCase()}` };
  }

  async getTermList(centerId: string) {
    const termList = await this.service.getTermList(centerId);
    return { data: serializeTermList(termList), message: "Term list retrieved" };
  }

  async updateTerms(centerId: string, terms: string[], updatedBy: string) {
    const termList = await this.service.updateTerms(centerId, terms, updatedBy);
    return { data: serializeTermList(termList), message: "Term list updated" };
  }

  async resetToDefaults(centerId: string, updatedBy: string) {
    const termList = await this.service.resetToDefaults(centerId, updatedBy);
    return { data: serializeTermList(termList), message: "Term list reset to defaults" };
  }
}
