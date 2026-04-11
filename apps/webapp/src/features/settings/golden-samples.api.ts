import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/core/client";

export const goldenSampleKeys = {
  all: ["golden-samples"] as const,
  list: () => [...goldenSampleKeys.all, "list"] as const,
};

export function useGoldenSamples() {
  return useQuery({
    queryKey: goldenSampleKeys.list(),
    queryFn: async () => {
      const { data, error } = await client.GET("/api/v1/golden-samples/");
      if (error) throw error;
      return data!.data;
    },
  });
}

export function useCreateGoldenSample() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      title: string;
      skillType: "WRITING" | "SPEAKING";
      studentWork: string;
      teacherFeedback: string;
    }) => {
      const { data, error } = await client.POST("/api/v1/golden-samples/", {
        body,
      });
      if (error) throw new Error((error as { message?: string }).message || "Failed to create sample");
      return data!.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goldenSampleKeys.all });
    },
  });
}

export function useUpdateGoldenSample() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string;
      title?: string;
      studentWork?: string;
      teacherFeedback?: string;
      isActive?: boolean;
    }) => {
      const { data, error } = await client.PATCH(
        "/api/v1/golden-samples/{id}",
        { params: { path: { id } }, body },
      );
      if (error) throw new Error((error as { message?: string }).message || "Failed to update sample");
      return data!.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goldenSampleKeys.all });
    },
  });
}

export function useDeleteGoldenSample() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.DELETE(
        "/api/v1/golden-samples/{id}",
        { params: { path: { id } } },
      );
      if (error) throw new Error((error as { message?: string }).message || "Failed to delete sample");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goldenSampleKeys.all });
    },
  });
}

export function useReorderGoldenSamples() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await client.POST("/api/v1/golden-samples/reorder", {
        body: { ids },
      });
      if (error) throw new Error((error as { message?: string }).message || "Failed to reorder samples");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goldenSampleKeys.all });
    },
  });
}

export function useToggleGoldenSample() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await client.PATCH(
        "/api/v1/golden-samples/{id}",
        { params: { path: { id } }, body: { isActive } },
      );
      if (error) throw new Error((error as { message?: string }).message || "Failed to toggle sample");
      return data!.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goldenSampleKeys.all });
    },
  });
}
