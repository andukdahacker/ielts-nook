import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import signInUser from "../network/sign-in-user";

function useSignInUser() {
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: signInUser,
    onSuccess: (value) => {
      // localStorage.setItem("token", value.token);
      toast(
        "Sign in successfully. Great to have you back " + value.user.firstName,
      );
      router.push("/dashboard");
    },
    onError: (error) => {
      toast.error("Failed to sign in due to error: " + error.message);
    },
  });

  return mutation;
}

export default useSignInUser;
