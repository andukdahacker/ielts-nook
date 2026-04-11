import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  onAuthStateChanged,
  onIdTokenChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import { firebaseAuth } from "@/core/firebase";
import type { AuthUser } from "@workspace/types";
import {
  useAuthUserQuery,
  useLoginMutation,
  AUTH_QUERY_KEYS,
} from "./auth.hooks.js";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import i18n from "@/i18n";

interface AuthContextType {
  user: AuthUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  sessionExpired: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Module-level flag to suppress onAuthStateChanged login during Google signup.
// This MUST be module-level (not a React ref) so it survives StrictMode
// double-mounting and is always the same variable across all listeners.
let _signupInProgress = false;
export function setSignupInProgress(inProgress: boolean) {
  _signupInProgress = inProgress;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const queryClient = useQueryClient();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  const { data: user } = useAuthUserQuery();
  const { mutateAsync: login, isPending: isLoggingIn } = useLoginMutation();

  // Use a ref to keep the stable reference of the login function
  // to prevent infinite loops in useEffect
  const loginRef = React.useRef(login);
  useEffect(() => {
    loginRef.current = login;
  }, [login]);

  const logout = useCallback(async () => {
    try {
      await firebaseAuth.signOut();
    } catch {
      // Ignore sign out errors
    }
    localStorage.removeItem("token");
    queryClient.setQueryData(AUTH_QUERY_KEYS.user, null);
    queryClient.clear(); // Clear all cached data on logout
    setFirebaseUser(null);
    setSessionExpired(false);
  }, [queryClient]);

  // Handle session expiry redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("expired") === "true") {
      setSessionExpired(true);
      // Defer the toast until i18n has loaded the auth namespace, otherwise
      // the user can briefly see the raw key string.
      const showExpiredToast = () => {
        toast.error(i18n.t("context.sessionExpired", { ns: "auth" }));
      };
      if (i18n.isInitialized) {
        showExpiredToast();
      } else {
        i18n.on("initialized", showExpiredToast);
      }
      // Clean up the URL
      params.delete("expired");
      const newUrl =
        window.location.pathname +
        (params.toString() ? `?${params.toString()}` : "");
      window.history.replaceState({}, "", newUrl);
    }
  }, []);

  // Auth state change listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        // During Google signup, the signup flow handles backend user creation
        // and auth. Skip login() here to avoid racing with signup.
        if (_signupInProgress) {
          setLoading(false);
          return;
        }

        try {
          const token = await fbUser.getIdToken();
          localStorage.setItem("token", token);
          await loginRef.current(token);
          // Force refresh token to pick up custom claims (role, center_id)
          // set by the backend during login
          const freshToken = await fbUser.getIdToken(true);
          localStorage.setItem("token", freshToken);
          setSessionExpired(false);
        } catch {
          // Login failed (e.g. user doesn't exist yet).
          // Non-fatal — caller handles its own auth.
        }
      } else {
        localStorage.removeItem("token");
        queryClient.setQueryData(AUTH_QUERY_KEYS.user, null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, [queryClient]);

  // Silent token refresh listener
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(firebaseAuth, async (fbUser) => {
      if (_signupInProgress) return;

      if (fbUser) {
        try {
          // Force refresh token if it's about to expire (within 5 minutes)
          const tokenResult = await fbUser.getIdTokenResult();
          const expirationTime = new Date(tokenResult.expirationTime).getTime();
          const now = Date.now();
          const fiveMinutes = 5 * 60 * 1000;

          if (expirationTime - now < fiveMinutes) {
            // Token is about to expire, force refresh
            const newToken = await fbUser.getIdToken(true);
            localStorage.setItem("token", newToken);
            // Sync with backend
            await loginRef.current(newToken);
          } else {
            // Token changed but not expiring, just update storage
            const token = await fbUser.getIdToken();
            localStorage.setItem("token", token);
          }
        } catch {
          // On refresh failure, logout and redirect with expired flag
          await logout();
          window.location.href = "/sign-in?expired=true";
        }
      }
    });

    return unsubscribe;
  }, [logout]);

  // Periodic token refresh check (every 4 minutes)
  useEffect(() => {
    const intervalId = setInterval(
      async () => {
        const fbUser = firebaseAuth.currentUser;
        if (fbUser) {
          try {
            // This will automatically refresh if token is expired
            await fbUser.getIdToken();
          } catch {
            // Periodic token check failed - session expired
            await logout();
            window.location.href = "/sign-in?expired=true";
          }
        }
      },
      4 * 60 * 1000,
    ); // 4 minutes

    return () => clearInterval(intervalId);
  }, [logout]);

  // Sync i18n language with user's preferredLanguage on login.
  // Narrow to supported languages so legacy values (e.g. "en-GB", "vietnamese",
  // empty string) don't crash the dynamic-import path.
  useEffect(() => {
    const pref = user?.preferredLanguage;
    if (!pref) return;
    const normalized = pref === "vi" ? "vi" : "en";
    if (i18n.language !== normalized) {
      void i18n.changeLanguage(normalized);
    }
  }, [user?.preferredLanguage]);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        firebaseUser,
        loading: loading || isLoggingIn,
        logout,
        sessionExpired,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
