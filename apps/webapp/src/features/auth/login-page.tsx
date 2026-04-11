import { GoogleLoginButton } from "./components/google-login-button";
import { LoginForm } from "./components/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { Logo } from "@workspace/ui/components/logo";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";
import { LanguageToggle } from "@/components/LanguageToggle";

export function LoginPage() {
  const { t } = useTranslation("auth");
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle password reset success message
  useEffect(() => {
    if (searchParams.get("reset") === "true") {
      toast.success(t("loginPage.passwordUpdatedSuccessfully"));
      // Clean up URL
      searchParams.delete("reset");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, t]);

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-muted/40 p-4">
      <Logo size={40} className="mb-6" />
      <Card className="w-full max-w-md">

        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">{t("loginPage.signIn")}</CardTitle>
          <CardDescription>
            {t("loginPage.choosePreferredSignInMethod")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <GoogleLoginButton />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t("loginPage.orContinueWithEmail")}
              </span>
            </div>
          </div>
          <LoginForm />
          <div className="text-center text-sm">
            {t("loginPage.dontHaveCenter")}{" "}
            <Link to="/sign-up/center" className="underline underline-offset-4">
              {t("loginPage.registerCenter")}
            </Link>
          </div>
        </CardContent>
      </Card>
      <div className="mt-4">
        <LanguageToggle compact />
      </div>
    </div>
  );
}
