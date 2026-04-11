import { firebaseAuth } from "@/core/firebase";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { z } from "zod";
import { recordLoginAttempt } from "../auth.api";

const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { t } = useTranslation("auth");
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get("redirect");

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setLoginError(null);

    try {
      // Set persistence based on "Remember me" checkbox
      // LOCAL = 30 days, SESSION = browser close
      await setPersistence(
        firebaseAuth,
        values.rememberMe ? browserLocalPersistence : browserSessionPersistence,
      );

      await signInWithEmailAndPassword(
        firebaseAuth,
        values.email,
        values.password,
      );

      // Success recording is now handled by the backend POST /login handler.
      // The onAuthStateChanged listener in AuthProvider will handle the backend sync.
      // Redirect is handled by GuestRoute detecting the authenticated user.
    } catch (error: unknown) {
      // Record failed attempt and check if account is now locked
      const lockResult = await recordLoginAttempt(values.email).catch(
        () => null,
      );

      // Check if account is now locked after this attempt
      if (lockResult?.locked) {
        const retryAfter = lockResult.retryAfterMinutes || 15;
        setLoginError(
          t("loginForm.accountLockedRetry", { retryAfter }),
        );
        setIsLoading(false);
        return;
      }

      // Map Firebase error codes to user-friendly messages
      const firebaseError = error as { code?: string; message?: string };
      if (
        firebaseError.code === "auth/user-not-found" ||
        firebaseError.code === "auth/wrong-password" ||
        firebaseError.code === "auth/invalid-credential"
      ) {
        setLoginError(t("loginForm.emailOrPasswordIncorrect"));
      } else if (firebaseError.code === "auth/too-many-requests") {
        setLoginError(t("loginForm.tooManyAttempts"));
      } else {
        setLoginError(
          firebaseError.message || t("loginForm.loginFailed"),
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        {loginError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {loginError}
          </div>
        )}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("loginForm.email")}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder={t("loginForm.emailPlaceholder")}
                  autoComplete="email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("loginForm.password")}</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder={t("loginForm.passwordPlaceholder")}
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-center justify-between">
          <FormField
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="text-sm font-normal cursor-pointer">
                  {t("loginForm.rememberMe")}
                </FormLabel>
              </FormItem>
            )}
          />
          <Link
            to="/forgot-password"
            className="text-sm text-muted-foreground hover:underline"
          >
            {t("loginForm.forgotPassword")}
          </Link>
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && (
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          {t("loginForm.signIn")}
        </Button>
        {redirectPath && (
          <p className="text-center text-xs text-muted-foreground">
            {t("loginForm.redirectedAfterLogin")}
          </p>
        )}
        <p className="text-center text-xs text-muted-foreground">
          {t("loginForm.forTeachersStudentsStaff")}
        </p>
      </form>
    </Form>
  );
}
