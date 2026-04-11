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
import { sendPasswordResetEmail } from "firebase/auth";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const { t } = useTranslation("auth");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setIsLoading(true);

    try {
      await sendPasswordResetEmail(firebaseAuth, values.email);
    } catch {
      // Intentionally ignore errors to prevent email enumeration
      // We always show the success message regardless of whether
      // the email exists in our system
    } finally {
      setIsLoading(false);
      setIsSubmitted(true);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">{t("forgotPasswordPage.resetPassword")}</CardTitle>
          <CardDescription>
            {isSubmitted
              ? t("forgotPasswordPage.checkEmailForResetLink")
              : t("forgotPasswordPage.enterEmailForResetLink")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSubmitted ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/50 bg-primary/10 p-4 text-sm text-primary">
                {t("forgotPasswordPage.ifAccountExistsYouWillReceiveLink")}
              </div>
              <div className="text-center">
                <Link
                  to="/sign-in"
                  className="text-sm text-muted-foreground hover:underline"
                >
                  {t("forgotPasswordPage.backToSignIn")}
                </Link>
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
                noValidate
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("forgotPasswordPage.email")}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t("forgotPasswordPage.emailPlaceholder")}
                          autoComplete="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && (
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  )}
                  {t("forgotPasswordPage.sendResetLink")}
                </Button>
                <div className="text-center">
                  <Link
                    to="/sign-in"
                    className="text-sm text-muted-foreground hover:underline"
                  >
                    {t("forgotPasswordPage.backToSignIn")}
                  </Link>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
