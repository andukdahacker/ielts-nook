import { GoogleLoginButton } from "./components/google-login-button";
import { SignupForm } from "./components/signup-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { Logo } from "@workspace/ui/components/logo";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { LanguageToggle } from "@/components/LanguageToggle";

export function SignupPage() {
  const { t } = useTranslation("auth");
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-muted/40 p-4">
      <Logo size={40} className="mb-6" />
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">
            {t("signupPage.createAccount")}
          </CardTitle>
          <CardDescription>
            {t("signupPage.joinClassLiteAccessCenter")}
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
                {t("signupPage.orContinueWithEmail")}
              </span>
            </div>
          </div>
          <SignupForm />
          <div className="text-center text-sm">
            {t("signupPage.alreadyHaveAccount")}{" "}
            <Link to="/sign-in" className="underline underline-offset-4">
              {t("signupPage.signIn")}
            </Link>
          </div>
          <div className="text-center text-sm">
            {t("signupPage.dontHaveCenter")}{" "}
            <Link to="/sign-up/center" className="underline underline-offset-4">
              {t("signupPage.registerCenter")}
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
