import client from "@/core/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { gradingKeys } from "./grading-keys";

export function useUnlockSubmission(submissionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // POST /api/v1/grading/submissions/:submissionId/unlock
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (client as any).POST(
        `/api/v1/grading/submissions/${submissionId}/unlock`,
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: gradingKeys.detail(submissionId),
      });
      queryClient.invalidateQueries({
        queryKey: gradingKeys.queue({}),
      });
      toast.success("Submission unlocked — student can now re-submit.");
    },
    onError: () => {
      toast.error("Failed to unlock submission");
    },
  });
}
