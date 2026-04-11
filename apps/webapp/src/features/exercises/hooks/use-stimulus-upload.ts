import { client } from "@/core/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { exercisesKeys } from "./use-exercises";

export function useStimulusUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      exerciseId,
      file,
    }: {
      exerciseId: string;
      file: File;
    }): Promise<string> => {
      const { data, error } = await client.POST(
        "/api/v1/exercises/{exerciseId}/stimulus-image",
        {
          params: { path: { exerciseId } },
          body: { file },
          bodySerializer: (body) => {
            const fd = new FormData();
            fd.append("file", body.file as Blob);
            return fd;
          },
        },
      );

      if (error) {
        throw new Error(
          (error as { message?: string }).message ||
            "Failed to upload stimulus image",
        );
      }

      if (!data?.data?.stimulusImageUrl) {
        throw new Error("Failed to upload stimulus image");
      }

      return data.data.stimulusImageUrl;
    },
    onSuccess: (_data, { exerciseId }) => {
      queryClient.invalidateQueries({
        queryKey: exercisesKeys.detail(exerciseId),
      });
      queryClient.invalidateQueries({ queryKey: exercisesKeys.lists() });
    },
  });
}

export function useStimulusDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      exerciseId,
    }: {
      exerciseId: string;
    }): Promise<void> => {
      const { error } = await client.DELETE(
        "/api/v1/exercises/{exerciseId}/stimulus-image",
        {
          params: { path: { exerciseId } },
        },
      );

      if (error) {
        throw new Error(
          (error as { message?: string }).message ||
            "Failed to delete stimulus image",
        );
      }
    },
    onSuccess: (_data, { exerciseId }) => {
      queryClient.invalidateQueries({
        queryKey: exercisesKeys.detail(exerciseId),
      });
      queryClient.invalidateQueries({ queryKey: exercisesKeys.lists() });
    },
  });
}
