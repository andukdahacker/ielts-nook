import client from "@/core/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ClassSessionWithConflicts,
  CreateClassSessionInput,
  GenerateSessionsInput,
  UpdateClassSessionInput,
} from "@workspace/types";
import { endOfWeek, format, startOfWeek } from "date-fns";

export const useSessions = (centerId?: string | null, weekStart?: Date, includeConflicts: boolean = true) => {
  const queryClient = useQueryClient();

  // Calculate week boundaries
  const weekStartDate = weekStart
    ? startOfWeek(weekStart, { weekStartsOn: 1 })
    : startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 1 });

  const sessionsQuery = useQuery({
    queryKey: ["sessions", centerId, format(weekStartDate, "yyyy-MM-dd"), includeConflicts],
    queryFn: async () => {
      const { data, error } = await client.GET("/api/v1/logistics/sessions/", {
        params: {
          query: {
            startDate: weekStartDate.toISOString(),
            endDate: weekEndDate.toISOString(),
            includeConflicts: includeConflicts ? "true" : "false",
          },
        },
      });
      if (error) throw error;
      return (data?.data ?? []) as ClassSessionWithConflicts[];
    },
    enabled: !!centerId,
  });

  const updateSessionMutation = useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateClassSessionInput;
    }) => {
      // Convert Date objects to ISO strings for API
      const body: Record<string, unknown> = { ...input };
      if (input.startTime !== undefined) {
        body.startTime = typeof input.startTime === "string"
          ? input.startTime
          : (input.startTime as Date).toISOString();
      }
      if (input.endTime !== undefined) {
        body.endTime = typeof input.endTime === "string"
          ? input.endTime
          : (input.endTime as Date).toISOString();
      }

      const { data, error } = await client.PATCH(
        "/api/v1/logistics/sessions/{id}",
        {
          params: { path: { id } },
          body,
        },
      );
      if (error) throw error;
      return data?.data;
    },
    // Optimistic update for snappy drag-and-drop UX
    onMutate: async ({ id, input }) => {
      // Cancel outgoing refetches for this specific week
      await queryClient.cancelQueries({ queryKey: ["sessions", centerId, format(weekStartDate, "yyyy-MM-dd"), includeConflicts] });

      // Snapshot previous value
      const previousSessions = queryClient.getQueryData<ClassSessionWithConflicts[]>([
        "sessions",
        centerId,
        format(weekStartDate, "yyyy-MM-dd"),
        includeConflicts,
      ]);

      // Optimistically update the session
      if (previousSessions) {
        queryClient.setQueryData<ClassSessionWithConflicts[]>(
          ["sessions", centerId, format(weekStartDate, "yyyy-MM-dd"), includeConflicts],
          previousSessions.map((session) =>
            session.id === id
              ? {
                  ...session,

                  ...(input.startTime && {
                    startTime:
                      typeof input.startTime === "string"
                        ? input.startTime
                        : input.startTime.toISOString(),
                  }),
                  ...(input.endTime && {
                    endTime:
                      typeof input.endTime === "string"
                        ? input.endTime
                        : input.endTime.toISOString(),
                  }),
                  ...(input.roomName !== undefined && {
                    roomName: input.roomName,
                  }),
                  ...(input.status && { status: input.status }),
                }
              : session,
          ),
        );
      }

      return { previousSessions };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousSessions) {
        queryClient.setQueryData(
          ["sessions", centerId, format(weekStartDate, "yyyy-MM-dd"), includeConflicts],
          context.previousSessions,
        );
      }
    },
    onSettled: () => {
      // Refetch to ensure server state
      queryClient.invalidateQueries({ queryKey: ["sessions", centerId] });
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async (input: CreateClassSessionInput) => {
      const { data, error } = await client.POST(
        "/api/v1/logistics/sessions/",
        {
          body: {
            ...input,
            startTime:
              typeof input.startTime === "string"
                ? input.startTime
                : input.startTime.toISOString(),
            endTime:
              typeof input.endTime === "string"
                ? input.endTime
                : input.endTime.toISOString(),
          },
        },
      );
      if (error) throw error;
      return data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions", centerId] });
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.DELETE("/api/v1/logistics/sessions/{id}", {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions", centerId] });
    },
  });

  const cancelSessionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await client.POST(
        "/api/v1/logistics/sessions/{id}/cancel",
        {
          params: { path: { id } },
        },
      );
      if (error) throw error;
      return data?.data;
    },
    // Optimistic update for instant UI feedback
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["sessions", centerId, format(weekStartDate, "yyyy-MM-dd"), includeConflicts] });

      const previousSessions = queryClient.getQueryData<ClassSessionWithConflicts[]>([
        "sessions",
        centerId,
        format(weekStartDate, "yyyy-MM-dd"),
        includeConflicts,
      ]);

      if (previousSessions) {
        queryClient.setQueryData<ClassSessionWithConflicts[]>(
          ["sessions", centerId, format(weekStartDate, "yyyy-MM-dd"), includeConflicts],
          previousSessions.map((session) =>
            session.id === id
              ? { ...session, status: "CANCELLED" }
              : session,
          ),
        );
      }

      return { previousSessions };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousSessions) {
        queryClient.setQueryData(
          ["sessions", centerId, format(weekStartDate, "yyyy-MM-dd"), includeConflicts],
          context.previousSessions,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions", centerId] });
    },
  });

  const deleteFutureSessionsMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await client.DELETE(
        "/api/v1/logistics/sessions/{id}/future",
        {
          params: { path: { id } },
        },
      );
      if (error) throw error;
      return data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions", centerId] });
    },
  });

  const generateSessionsMutation = useMutation({
    mutationFn: async (input: GenerateSessionsInput) => {
      const { data, error } = await client.POST(
        "/api/v1/logistics/sessions/generate",
        {
          body: {
            ...input,
            startDate:
              typeof input.startDate === "string"
                ? input.startDate
                : input.startDate.toISOString(),
            endDate:
              typeof input.endDate === "string"
                ? input.endDate
                : input.endDate.toISOString(),
          },
        },
      );
      if (error) throw error;
      return data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions", centerId] });
    },
  });

  return {
    sessions: (sessionsQuery.data ?? []) as ClassSessionWithConflicts[],
    isLoading: sessionsQuery.isLoading,
    weekStart: weekStartDate,
    weekEnd: weekEndDate,
    createSession: createSessionMutation.mutateAsync,
    isCreating: createSessionMutation.isPending,
    updateSession: updateSessionMutation.mutateAsync,
    isUpdating: updateSessionMutation.isPending,
    cancelSession: cancelSessionMutation.mutateAsync,
    isCancelling: cancelSessionMutation.isPending,
    deleteSession: deleteSessionMutation.mutateAsync,
    isDeleting: deleteSessionMutation.isPending,
    deleteFutureSessions: deleteFutureSessionsMutation.mutateAsync,
    isDeletingFuture: deleteFutureSessionsMutation.isPending,
    generateSessions: generateSessionsMutation.mutateAsync,
    isGenerating: generateSessionsMutation.isPending,
    refetch: sessionsQuery.refetch,
  };
};

export const useNotifications = (centerId?: string | null) => {
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ["notifications", centerId],
    queryFn: async () => {
      const { data, error } = await client.GET("/api/v1/notifications/", {
        params: { query: { limit: 50 } },
      });
      if (error) throw error;
      return data?.data ?? [];
    },
    enabled: !!centerId,
  });

  const unreadCountQuery = useQuery({
    queryKey: ["notifications-unread", centerId],
    queryFn: async () => {
      const { data, error } = await client.GET(
        "/api/v1/notifications/unread-count",
      );
      if (error) throw error;
      return data?.data?.count ?? 0;
    },
    enabled: !!centerId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const { error } = await client.POST("/api/v1/notifications/mark-read", {
        body: { notificationIds },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", centerId] });
      queryClient.invalidateQueries({
        queryKey: ["notifications-unread", centerId],
      });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await client.POST(
        "/api/v1/notifications/mark-all-read",
        {},
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", centerId] });
      queryClient.invalidateQueries({
        queryKey: ["notifications-unread", centerId],
      });
    },
  });

  return {
    notifications: notificationsQuery.data ?? [],
    isLoading: notificationsQuery.isLoading,
    unreadCount: unreadCountQuery.data ?? 0,
    markAsRead: markAsReadMutation.mutateAsync,
    markAllAsRead: markAllAsReadMutation.mutateAsync,
  };
};
