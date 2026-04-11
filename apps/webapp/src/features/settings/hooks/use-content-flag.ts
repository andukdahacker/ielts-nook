import { useModerationFlags, type ModerationFlag } from "../moderation.api";

/**
 * Hook to check if a specific content item has a pending moderation flag.
 * Used by ComplianceReviewOverlay to determine if content should be locked.
 * Uses server-side contentId filtering for efficiency.
 */
export function useContentFlag(
  contentId: string | undefined,
  contentType?: "EXERCISE" | "SUBMISSION" | "AI_FEEDBACK",
): { flag: ModerationFlag | null; isLoading: boolean } {
  const { data, isLoading } = useModerationFlags({
    status: "PENDING",
    contentType,
    contentId,
    limit: 1,
  });

  if (!contentId || isLoading || !data?.data) {
    return { flag: null, isLoading };
  }

  return { flag: data.data[0] ?? null, isLoading: false };
}
