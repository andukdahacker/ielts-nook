import { z } from "zod";

// ── Enums ───────────────────────────────────────────────────────────

export const ModerationFlagStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REDACTED",
  "DELETED",
]);
export type ModerationFlagStatus = z.infer<typeof ModerationFlagStatusSchema>;

export const ModerationContentTypeSchema = z.enum([
  "EXERCISE",
  "SUBMISSION",
  "AI_FEEDBACK",
]);
export type ModerationContentType = z.infer<typeof ModerationContentTypeSchema>;

// ── Core Schemas ────────────────────────────────────────────────────

export const ContentModerationFlagSchema = z.object({
  id: z.string(),
  centerId: z.string(),
  contentType: ModerationContentTypeSchema,
  contentId: z.string(),
  flaggedText: z.string(),
  matchedTerms: z.array(z.string()),
  status: ModerationFlagStatusSchema,
  resolvedById: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  redactedText: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ContentModerationFlag = z.infer<typeof ContentModerationFlagSchema>;

export const ModerationTermSchema = z.object({
  id: z.string(),
  centerId: z.string(),
  terms: z.array(z.string()),
  isCustom: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ModerationTerm = z.infer<typeof ModerationTermSchema>;

// ── Scan Result ─────────────────────────────────────────────────────

export const ScanResultSchema = z.object({
  matches: z.array(z.string()),
  clean: z.boolean(),
});
export type ScanResult = z.infer<typeof ScanResultSchema>;

// ── Request Schemas ─────────────────────────────────────────────────

export const ResolveFlagSchema = z
  .object({
    action: z.enum(["APPROVED", "REDACTED", "DELETED"]),
    redactedText: z.string().optional(),
  })
  .refine(
    (data) =>
      data.action !== "REDACTED" || (data.redactedText !== undefined && data.redactedText.length > 0),
    { message: "redactedText is required when action is REDACT", path: ["redactedText"] },
  );
export type ResolveFlag = z.infer<typeof ResolveFlagSchema>;

export const UpdateTermsSchema = z.object({
  terms: z
    .array(z.string().max(100, "Each term must be at most 100 characters"))
    .max(500, "Maximum 500 terms per center"),
});
export type UpdateTerms = z.infer<typeof UpdateTermsSchema>;

export const ScanContentSchema = z.object({
  text: z.string().min(1, "Text is required").max(50000, "Text too long (max 50,000 characters)"),
});
export type ScanContent = z.infer<typeof ScanContentSchema>;

export const ListFlagsQuerySchema = z.object({
  status: ModerationFlagStatusSchema.optional(),
  contentType: ModerationContentTypeSchema.optional(),
  contentId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListFlagsQuery = z.infer<typeof ListFlagsQuerySchema>;

// ── Response Schemas ────────────────────────────────────────────────

export const FlagResponseSchema = z.object({
  data: ContentModerationFlagSchema,
  message: z.string(),
});

export const FlagListResponseSchema = z.object({
  data: z.array(ContentModerationFlagSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  message: z.string(),
});

export const TermsResponseSchema = z.object({
  data: ModerationTermSchema,
  message: z.string(),
});

export const ScanResponseSchema = z.object({
  data: ScanResultSchema,
  message: z.string(),
});

export const ModerationNullResponseSchema = z.object({
  data: z.null(),
  message: z.string(),
});
