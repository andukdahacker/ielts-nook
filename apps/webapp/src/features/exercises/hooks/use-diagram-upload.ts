import { client } from "@/core/client";
import { useMutation } from "@tanstack/react-query";

export function useDiagramUpload() {
  return useMutation({
    mutationFn: async ({
      exerciseId,
      file,
    }: {
      exerciseId: string;
      file: File;
    }): Promise<string> => {
      const { data, error } = await client.POST(
        "/api/v1/exercises/{exerciseId}/diagram",
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
          (error as { message?: string }).message || "Failed to upload diagram",
        );
      }

      if (!data?.data?.diagramUrl) {
        throw new Error("Failed to upload diagram");
      }

      return data.data.diagramUrl;
    },
  });
}
