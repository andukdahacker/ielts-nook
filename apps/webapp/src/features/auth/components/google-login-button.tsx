import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { firebaseAuth } from "@/core/firebase";
import { Button } from "@workspace/ui/components/button";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export function GoogleLoginButton() {
  const { t } = useTranslation("auth");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(firebaseAuth, provider);
      // The onAuthStateChanged listener in AuthProvider will handle the backend sync
      // Check if user has a center membership via ID token claims
      const idTokenResult = await result.user.getIdTokenResult();
      if (!idTokenResult.claims.center_id) {
        // First-time Google user without a center - sign them out and show error
        await firebaseAuth.signOut();
        toast.error(t("googleLogin.accountNotFound"));
        return;
      }
    } catch (error: unknown) {
      const firebaseError = error as { code?: string; message?: string };
      if (firebaseError.code === "auth/popup-closed-by-user") {
        // User closed popup, don't show error
        return;
      }
      toast.error(firebaseError.message || "Failed to sign in with Google");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      type="button"
      disabled={isLoading}
      onClick={handleLogin}
      className="w-full"
    >
      {isLoading ? (
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <svg
          className="mr-2 h-4 w-4"
          aria-hidden="true"
          focusable="false"
          data-prefix="fab"
          data-icon="google"
          role="img"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 488 512"
        >
          <path
            fill="currentColor"
            d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
          ></path>
        </svg>
      )}
      {t("googleLogin.signInWithGoogle")}
    </Button>
  );
}
