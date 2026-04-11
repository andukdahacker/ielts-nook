import { SignupCenterForm } from "./components/signup-center-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Logo } from "@workspace/ui/components/logo";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { LanguageToggle } from "@/components/LanguageToggle";

export function SignupCenterPage() {
  const { t } = useTranslation("auth");
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-muted/40 p-4">
      <Logo size={40} className="mb-6" />
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">
            {t("signupCenterPage.registerCenter")}
          </CardTitle>
          <CardDescription>
            {t("signupCenterPage.enterCenterDetailsAndOwnerInfo")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SignupCenterForm />
          <div className="text-center text-sm">
            {t("signupCenterPage.alreadyHaveAccount")}{" "}
            <Link to="/sign-in" className="underline underline-offset-4">
              {t("signupCenterPage.signIn")}
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
