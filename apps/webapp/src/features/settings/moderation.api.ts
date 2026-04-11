import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/core/client";

export const moderationKeys = {
  all: ["moderation"] as const,
  flags: () => [...moderationKeys.all, "flags"] as const,
  flagsList: (filters: Record<string, unknown>) =>
    [...moderationKeys.flags(), filters] as const,
  flag: (id: string) => [...moderationKeys.flags(), id] as const,
  terms: () => [...moderationKeys.all, "terms"] as const,
};

export interface ModerationFlag {
  id: string;
  centerId: string;
  contentType: "EXERCISE" | "SUBMISSION" | "AI_FEEDBACK";
  contentId: string;
  flaggedText: string;
  matchedTerms: string[];
  status: "PENDING" | "APPROVED" | "REDACTED" | "DELETED";
  resolvedById: string | null;
  resolvedAt: string | null;
  redactedText: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ModerationTermList {
  id: string;
  centerId: string;
  terms: string[];
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useModerationFlags(filters?: {
  status?: string;
  contentType?: string;
  contentId?: string;
  page?: number;
  limit?: number;
}) {
  const queryParams = {
    status: filters?.status,
    contentType: filters?.contentType,
    contentId: filters?.contentId,
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
  };

  return useQuery({
    queryKey: moderationKeys.flagsList(queryParams),
    queryFn: async () => {
      const { data, error } = await client.GET("/api/v1/moderation/flags", {
        params: { query: queryParams },
      });
      if (error) throw error;
      return data as unknown as {
        data: ModerationFlag[];
        total: number;
        page: number;
        limit: number;
        message: string;
      };
    },
  });
}

export function useModerationFlag(id: string) {
  return useQuery({
    queryKey: moderationKeys.flag(id),
    queryFn: async () => {
      const { data, error } = await client.GET(
        "/api/v1/moderation/flags/{id}",
        { params: { path: { id } } },
      );
      if (error) throw error;
      return (data as unknown as { data: ModerationFlag }).data;
    },
    enabled: !!id,
  });
}

export function useResolveFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      action,
      redactedText,
    }: {
      id: string;
      action: "APPROVED" | "REDACTED" | "DELETED";
      redactedText?: string;
    }) => {
      const { data, error } = await client.PATCH(
        "/api/v1/moderation/flags/{id}/resolve",
        {
          params: { path: { id } },
          body: { action, redactedText },
        },
      );
      if (error)
        throw new Error(
          (error as { message?: string }).message || "Failed to resolve flag",
        );
      return (data as unknown as { data: ModerationFlag }).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moderationKeys.flags() });
    },
  });
}

export function useModerationTerms() {
  return useQuery({
    queryKey: moderationKeys.terms(),
    queryFn: async () => {
      const { data, error } = await client.GET("/api/v1/moderation/terms");
      if (error) throw error;
      return (data as unknown as { data: ModerationTermList }).data;
    },
  });
}

export function useUpdateTerms() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (terms: string[]) => {
      const { data, error } = await client.PUT("/api/v1/moderation/terms", {
        body: { terms },
      });
      if (error)
        throw new Error(
          (error as { message?: string }).message || "Failed to update terms",
        );
      return (data as unknown as { data: ModerationTermList }).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moderationKeys.terms() });
    },
  });
}

export function useResetTerms() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await client.POST(
        "/api/v1/moderation/terms/reset",
      );
      if (error)
        throw new Error(
          (error as { message?: string }).message || "Failed to reset terms",
        );
      return (data as unknown as { data: ModerationTermList }).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moderationKeys.terms() });
    },
  });
}
