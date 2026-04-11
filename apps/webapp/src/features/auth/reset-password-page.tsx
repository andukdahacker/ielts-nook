import { firebaseAuth } from "@/core/firebase";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { type TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router";
import { z } from "zod";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

type TokenState = "loading" | "valid" | "invalid" | "expired";

const getErrorMessage = (code: string, t: TFunction): string => {
  switch (code) {
    case "auth/expired-action-code":
      return t("resetPasswordPage.expiredLinkError");
    case "auth/invalid-action-code":
      return t("resetPasswordPage.invalidLinkError");
    case "auth/user-disabled":
      return t("resetPasswordPage.accountDisabledError");
    case "auth/user-not-found":
      return t("resetPasswordPage.noAccountFoundError");
    case "auth/weak-password":
      return t("resetPasswordPage.weakPasswordError");
    default:
      return t("resetPasswordPage.genericError");
  }
};

export function ResetPasswordPage() {
  const { t } = useTranslation("auth");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = searchParams.get("mode");
  const oobCode = searchParams.get("oobCode");

  const [tokenState, setTokenState] = useState<TokenState>("loading");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Validate token on mount
  useEffect(() => {
    let isMounted = true;

    const validateToken = async () => {
      // Check mode parameter
      if (mode !== "resetPassword") {
        if (isMounted) {
          setTokenState("invalid");
          setError(t("resetPasswordPage.invalidPasswordResetLink"));
        }
        return;
      }

      // Check oobCode exists
      if (!oobCode) {
        if (isMounted) {
          setTokenState("invalid");
          setError(t("resetPasswordPage.missingPasswordResetCode"));
        }
        return;
      }

      try {
        // Verify the password reset code is valid
        await verifyPasswordResetCode(firebaseAuth, oobCode);
        if (isMounted) {
          setTokenState("valid");
        }
      } catch (err: unknown) {
        if (isMounted) {
          const firebaseError = err as { code?: string };
          if (firebaseError.code === "auth/expired-action-code") {
            setTokenState("expired");
            setError(t("resetPasswordPage.expiredLinkError"));
          } else {
            setTokenState("invalid");
            setError(getErrorMessage(firebaseError.code || "", t));
          }
        }
      }
    };

    validateToken();

    return () => {
      isMounted = false;
    };
  }, [mode, oobCode, t]);

  const onSubmit = async (values: ResetPasswordFormValues) => {
    if (!oobCode) return;

    setIsLoading(true);
    setError(null);

    try {
      await confirmPasswordReset(firebaseAuth, oobCode, values.password);
      // Navigate to sign-in with success message
      navigate("/sign-in?reset=true");
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      setError(getErrorMessage(firebaseError.code || "", t));
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (tokenState === "loading") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">
              {t("resetPasswordPage.validatingResetLink")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid or expired token state
  if (tokenState === "invalid" || tokenState === "expired") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">
              {tokenState === "expired" ? t("resetPasswordPage.linkExpired") : t("resetPasswordPage.invalidLink")}
            </CardTitle>
            <CardDescription>
              {error || t("resetPasswordPage.passwordResetLinkNoLongerValid")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full">
              <Link to="/forgot-password">{t("resetPasswordPage.requestNewLink")}</Link>
            </Button>
            <div className="text-center">
              <Link
                to="/sign-in"
                className="text-sm text-muted-foreground hover:underline"
              >
                {t("resetPasswordPage.backToSignIn")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid token - show password reset form
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">
            {t("resetPasswordPage.createNewPassword")}
          </CardTitle>
          <CardDescription>
            {t("resetPasswordPage.enterNewPasswordForAccount")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("resetPasswordPage.newPassword")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? t("resetPasswordPage.hidePassword") : t("resetPasswordPage.showPassword")}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("resetPasswordPage.confirmPassword")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          aria-label={showConfirmPassword ? t("resetPasswordPage.hidePassword") : t("resetPasswordPage.showPassword")}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <p className="text-xs text-muted-foreground">
                {t("resetPasswordPage.passwordRequirements")}
              </p>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && (
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                )}
                {t("resetPasswordPage.resetPassword")}
              </Button>
              <div className="text-center">
                <Link
                  to="/sign-in"
                  className="text-sm text-muted-foreground hover:underline"
                >
                  {t("resetPasswordPage.backToSignIn")}
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
