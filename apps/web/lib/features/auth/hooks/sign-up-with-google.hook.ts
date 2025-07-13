import { useMutation } from "@tanstack/react-query";
import { FirebaseError } from "firebase/app";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signUpWithGoogle } from "../network/sign-up-with-google";

export function useSignUpWithGoogle() {
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: signUpWithGoogle,
    onSuccess: (value) => {
      localStorage.setItem("token", value.token);

      router.replace("/dashboard");
    },
    onError: (error) => {
      if (error instanceof FirebaseError) {
        toast.error("Failed to sign in due to error: " + error.code);
      } else {
        toast.error("Failed to sign in due to error: " + error.message);
      }
    },
  });

  return mutation;
}
