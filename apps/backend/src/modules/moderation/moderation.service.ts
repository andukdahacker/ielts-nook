import { PrismaClient, getTenantedClient } from "@workspace/db";
import type { ModerationFlagStatus, ModerationContentType } from "@workspace/db";

const MAX_TERMS_PER_CENTER = 500;
const MAX_TERM_LENGTH = 100;
const MAX_FLAGGED_TEXT_LENGTH = 2000;

/**
 * Default Vietnamese compliance term list per Decree 72/2013/ND-CP.
 * Categories: political terms opposing the state, inciting violence/hatred,
 * prohibited organizations, obscene/offensive language.
 */
export const DEFAULT_PROHIBITED_TERMS: string[] = [
  // Political terms opposing the Vietnamese state/government
  "lật đổ chính quyền",
  "chống phá nhà nước",
  "phản động",
  "diễn biến hòa bình",
  "tuyên truyền chống nhà nước",
  "xuyên tạc chế độ",
  "bôi nhọ lãnh đạo",
  "kích động ly khai",
  "chia rẽ dân tộc",
  "phủ nhận vai trò lãnh đạo",
  // Terms inciting violence or hatred
  "kích động bạo lực",
  "hận thù dân tộc",
  "kỳ thị tôn giáo",
  "xúi giục bạo loạn",
  "khủng bố",
  // Prohibited organizations
  "việt tân",
  "chính phủ quốc gia việt nam lâm thời",
  // Obscene/offensive language
  "dâm ô",
  "đồi trụy",
  "mại dâm",
];

/**
 * Builds a regex that matches a term at space/string boundaries.
 * Uses lookbehind/lookahead for space or start/end of string,
 * which works correctly with Vietnamese Unicode characters
 * (unlike \b which is ASCII-only).
 */
function buildTermRegex(normalizedTerm: string): RegExp {
  const escaped = escapeRegex(normalizedTerm);
  return new RegExp(`(?<=\\s|^)${escaped}(?=\\s|$)`, "iu");
}

/**
 * Cache of compiled regexes keyed by centerId.
 * Invalidated when term list changes.
 */
const regexCache = new Map<string, { terms: string[]; regexes: Map<string, RegExp> }>();

function getOrBuildRegexes(centerId: string, terms: string[]): Map<string, RegExp> {
  const cached = regexCache.get(centerId);
  if (cached && cached.terms === terms) {
    return cached.regexes;
  }
  const regexes = new Map<string, RegExp>();
  for (const term of terms) {
    const normalizedTerm = term.normalize("NFC").toLowerCase();
    try {
      regexes.set(term, buildTermRegex(normalizedTerm));
    } catch {
      // Fallback: match as plain substring (handled in scanContent)
    }
  }
  regexCache.set(centerId, { terms, regexes });
  return regexes;
}

/**
 * Truncates flagged text to a reasonable length, preserving context around matched terms.
 */
function truncateFlaggedText(text: string, matchedTerms: string[]): string {
  if (text.length <= MAX_FLAGGED_TEXT_LENGTH) return text;

  // Find first match position to center the excerpt
  const lowerText = text.toLowerCase();
  let firstMatchIdx = 0;
  for (const term of matchedTerms) {
    const idx = lowerText.indexOf(term.toLowerCase());
    if (idx >= 0) {
      firstMatchIdx = idx;
      break;
    }
  }

  const halfWindow = Math.floor(MAX_FLAGGED_TEXT_LENGTH / 2);
  const start = Math.max(0, firstMatchIdx - halfWindow);
  const end = Math.min(text.length, start + MAX_FLAGGED_TEXT_LENGTH);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";
  return prefix + text.slice(start, end) + suffix;
}

export class ModerationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Scans text against a center's prohibited term list.
   * Lazy-creates the center's term list from defaults if it doesn't exist.
   */
  async scanContent(
    text: string,
    centerId: string,
  ): Promise<{ matches: string[]; clean: boolean }> {
    const termList = await this.getOrCreateTermList(centerId);
    const normalizedText = text.normalize("NFC").toLowerCase();
    const regexes = getOrBuildRegexes(centerId, termList.terms);

    const matches: string[] = [];
    for (const term of termList.terms) {
      const normalizedTerm = term.normalize("NFC").toLowerCase();
      const regex = regexes.get(term);
      if (regex) {
        if (regex.test(normalizedText)) {
          matches.push(term);
        }
      } else {
        // Fallback to substring match if regex was not compilable
        if (normalizedText.includes(normalizedTerm)) {
          matches.push(term);
        }
      }
    }

    return { matches, clean: matches.length === 0 };
  }

  /**
   * Creates a ContentModerationFlag record for flagged content.
   * Truncates flaggedText to prevent storing excessive content.
   */
  async flagContent(params: {
    centerId: string;
    contentType: ModerationContentType;
    contentId: string;
    flaggedText: string;
    matchedTerms: string[];
  }) {
    const db = getTenantedClient(this.prisma, params.centerId);
    return db.contentModerationFlag.create({
      data: {
        centerId: params.centerId,
        contentType: params.contentType,
        contentId: params.contentId,
        flaggedText: truncateFlaggedText(params.flaggedText, params.matchedTerms),
        matchedTerms: params.matchedTerms,
      },
    });
  }

  /**
   * Lists moderation flags for a center with pagination and optional filters.
   */
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
    const db = getTenantedClient(this.prisma, centerId);
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.contentType) where.contentType = filters.contentType;
    if (filters.contentId) where.contentId = filters.contentId;

    const [data, total] = await Promise.all([
      db.contentModerationFlag.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      db.contentModerationFlag.count({ where }),
    ]);

    return { data, total, page: filters.page, limit: filters.limit };
  }

  /**
   * Gets a single moderation flag by ID.
   */
  async getFlagById(centerId: string, flagId: string) {
    const db = getTenantedClient(this.prisma, centerId);
    const flag = await db.contentModerationFlag.findFirst({
      where: { id: flagId },
    });
    if (!flag) throw new Error("Moderation flag not found");
    return flag;
  }

  /**
   * Resolves a moderation flag: approve, redact, or delete.
   * Uses atomic update with status check to prevent TOCTOU races.
   * Applies redaction/deletion to the underlying content.
   */
  async resolveFlag(
    centerId: string,
    flagId: string,
    action: "APPROVED" | "REDACTED" | "DELETED",
    resolvedById: string,
    redactedText?: string,
  ) {
    if (action === "REDACTED" && (!redactedText || redactedText.length === 0)) {
      throw new Error("redactedText is required when action is REDACT");
    }

    const db = getTenantedClient(this.prisma, centerId);

    // Atomic update: only succeeds if flag is still PENDING
    const result = await db.contentModerationFlag.updateMany({
      where: { id: flagId, status: "PENDING" },
      data: {
        status: action as ModerationFlagStatus,
        resolvedById,
        resolvedAt: new Date(),
        ...(action === "REDACTED" ? { redactedText } : {}),
      },
    });

    if (result.count === 0) {
      // Check if flag exists or was already resolved
      const existing = await db.contentModerationFlag.findFirst({
        where: { id: flagId },
      });
      if (!existing) throw new Error("Moderation flag not found");
      throw new Error("Flag has already been resolved");
    }

    // Fetch the updated flag for the response
    const updatedFlag = await db.contentModerationFlag.findFirst({
      where: { id: flagId },
    });
    if (!updatedFlag) throw new Error("Moderation flag not found");

    // Apply the action to the underlying content
    await this.applyResolution(db, updatedFlag.contentType, updatedFlag.contentId, action, redactedText);

    return updatedFlag;
  }

  // ── Term List CRUD ──────────────────────────────────────────────────

  /**
   * Gets the center's term list, lazy-creating from defaults if needed.
   */
  async getTermList(centerId: string) {
    return this.getOrCreateTermList(centerId);
  }

  /**
   * Replaces the center's term list with the provided terms.
   */
  async updateTerms(centerId: string, terms: string[], updatedBy: string) {
    if (terms.length > MAX_TERMS_PER_CENTER) {
      throw new Error(`Maximum ${MAX_TERMS_PER_CENTER} terms per center`);
    }
    for (const term of terms) {
      if (term.length > MAX_TERM_LENGTH) {
        throw new Error(`Each term must be at most ${MAX_TERM_LENGTH} characters`);
      }
    }

    const db = getTenantedClient(this.prisma, centerId);
    // Normalize terms on save
    const normalizedTerms = terms.map((t) => t.normalize("NFC").trim()).filter((t) => t.length > 0);
    const uniqueTerms = [...new Set(normalizedTerms)];

    // Invalidate regex cache for this center
    regexCache.delete(centerId);

    return db.moderationTermList.upsert({
      where: { centerId },
      update: { terms: uniqueTerms, isCustom: true, updatedBy },
      create: { centerId, terms: uniqueTerms, isCustom: true, updatedBy },
    });
  }

  /**
   * Resets the center's term list to the default Vietnamese compliance list.
   */
  async resetToDefaults(centerId: string, updatedBy: string) {
    const db = getTenantedClient(this.prisma, centerId);
    // Invalidate regex cache for this center
    regexCache.delete(centerId);

    return db.moderationTermList.upsert({
      where: { centerId },
      update: { terms: DEFAULT_PROHIBITED_TERMS, isCustom: false, updatedBy },
      create: { centerId, terms: DEFAULT_PROHIBITED_TERMS, isCustom: false, updatedBy },
    });
  }

  // ── Private ─────────────────────────────────────────────────────────

  private async getOrCreateTermList(centerId: string) {
    const db = getTenantedClient(this.prisma, centerId);
    // Use upsert to avoid TOCTOU race on concurrent lazy-creation
    return db.moderationTermList.upsert({
      where: { centerId },
      update: {}, // no-op if exists
      create: {
        centerId,
        terms: DEFAULT_PROHIBITED_TERMS,
        isCustom: false,
      },
    });
  }

  /**
   * Applies the resolution action to the underlying content entity.
   */
  private async applyResolution(
    db: PrismaClient,
    contentType: ModerationContentType,
    contentId: string,
    action: "APPROVED" | "REDACTED" | "DELETED",
    redactedText?: string,
  ) {
    if (action === "APPROVED") return; // No content change needed

    if (contentType === "EXERCISE") {
      if (action === "DELETED") {
        await db.exercise.updateMany({
          where: { id: contentId },
          data: { status: "ARCHIVED" },
        });
      } else if (action === "REDACTED" && redactedText) {
        // Replace passage content with redacted version
        await db.exercise.updateMany({
          where: { id: contentId },
          data: { passageContent: redactedText, status: "DRAFT" },
        });
      }
    } else if (contentType === "SUBMISSION") {
      if (action === "DELETED") {
        // Mark submission answers as redacted by clearing answer text
        const submission = await db.submission.findFirst({ where: { id: contentId } });
        if (submission) {
          await db.studentAnswer.updateMany({
            where: { submissionId: contentId },
            data: { answer: "[Content removed for compliance]" },
          });
        }
      }
    } else if (contentType === "AI_FEEDBACK") {
      if (action === "DELETED") {
        await db.submissionFeedback.deleteMany({
          where: { id: contentId },
        });
      } else if (action === "REDACTED" && redactedText) {
        await db.submissionFeedback.updateMany({
          where: { id: contentId },
          data: { generalFeedback: redactedText },
        });
      }
    }
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
