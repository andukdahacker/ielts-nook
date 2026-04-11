import { useMutation } from "@tanstack/react-query";
import client from "@/core/client";

export function useUploadPhoto() {
  return useMutation({
    networkMode: "offlineFirst",
    mutationFn: async ({
      submissionId,
      questionId,
      file,
    }: {
      submissionId: string;
      questionId: string;
      file: File;
    }) => {
      const { data, error } = await client.POST(
        "/api/v1/student/submissions/{id}/photo",
        {
          params: { path: { id: submissionId } },
          body: { file, questionId },
          bodySerializer: (body) => {
            const fd = new FormData();
            fd.append("file", body.file as Blob);
            fd.append("questionId", body.questionId);
            return fd;
          },
        },
      );

      if (error) {
        throw new Error(
          (error as { message?: string }).message || "Upload failed",
        );
      }

      return data;
    },
  });
}
