import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import register from "../network/register";

function useRegister() {
  const mutation = useMutation({
    mutationFn: register,
    onSuccess: (value) => {
      window.history.pushState(null, "", "/sign-in");
      toast("Registered successfully", {
        description: value.shouldVerifyEmail
          ? "We've sent a email verification request to your email address. Please verify before continuing to sign in."
          : "Please continue to sign in.",
        duration: 10000,
      });
    },
    onError: (error) => {
      toast.error("Failed to register", {
        description: `Failed to register due to error: ${error.message}`,
      });
    },
  });

  return mutation;
}

export default useRegister;
