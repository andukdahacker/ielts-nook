import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { firebaseAuth } from "@/core/firebase";
import { Button } from "@workspace/ui/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useSearchParams } from "react-router";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export function SignupForm() {
  const { t } = useTranslation("auth");
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const invitedEmail = searchParams.get("email") || "";

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: invitedEmail,
      password: "",
    },
  });

  const onSubmit = async (values: SignupFormValues) => {
    setIsLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(
        firebaseAuth,
        values.email,
        values.password,
      );

      await updateProfile(result.user, {
        displayName: values.name,
      });

      // The onAuthStateChanged listener in AuthProvider will handle the backend sync
      toast.success(t("signupForm.accountCreatedSuccessfully"));
    } catch (error) {
      console.error("Signup failed:", error);
      toast.error(error instanceof Error ? error.message : t("signupForm.failedToCreateAccount"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("signupForm.fullName")}</FormLabel>
              <FormControl>
                <Input placeholder={t("signupForm.fullNamePlaceholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("signupForm.email")}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder={t("signupForm.emailPlaceholder")}
                  {...field}
                  readOnly={!!invitedEmail}
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
              <FormLabel>{t("signupForm.password")}</FormLabel>
              <FormControl>
                <Input type="password" placeholder={t("signupForm.passwordPlaceholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && (
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          {t("signupForm.createAccount")}
        </Button>
      </form>
    </Form>
  );
}
