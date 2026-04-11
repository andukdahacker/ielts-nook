import { firebaseAuth } from "@/core/firebase";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CenterSignupRequestSchema,
  type CenterSignupRequest,
} from "@workspace/types";
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
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { setSignupInProgress } from "../auth-context";
import {
  useLoginMutation,
  useSignupCenterMutation,
  useSignupCenterWithGoogleMutation,
} from "../auth.hooks";

export function SignupCenterForm() {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const { mutateAsync: signup, isPending } = useSignupCenterMutation();
  const { mutateAsync: signupWithGoogle, isPending: isGooglePending } =
    useSignupCenterWithGoogleMutation();
  const { mutateAsync: login } = useLoginMutation();

  const form = useForm<CenterSignupRequest>({
    resolver: zodResolver(CenterSignupRequestSchema),
    defaultValues: {
      centerName: "",
      centerSlug: "",
      ownerEmail: "",
      ownerName: "",
      password: "",
    },
  });

  const onSubmit = async (data: CenterSignupRequest) => {
    try {
      await signup(data);
      toast.success(t("signupCenterForm.centerRegisteredSuccessfully"));
      navigate("/dashboard/owner");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("signupCenterForm.signupFailed"));
    }
  };

  const onGoogleSignup = async () => {
    const isCenterValid = await form.trigger(["centerName", "centerSlug"]);
    if (!isCenterValid) {
      toast.error(t("signupCenterForm.pleaseProvideValidCenterDetails"));
      return;
    }

    // Set module-level flag BEFORE signInWithPopup so onAuthStateChanged
    // and onIdTokenChanged skip calling login() during the signup flow.
    setSignupInProgress(true);

    try {
      // Step 1: Authenticate with Google to get the credential and token
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(firebaseAuth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const idToken = await result.user.getIdToken();

      // Step 2: Sign out of Firebase while signup is in progress.
      // The module-level flag already blocks login(), but signing out
      // ensures no lingering Firebase session if something goes wrong.
      await signOut(firebaseAuth);

      // Step 3: Create user + center in the backend (token passed in body)
      await signupWithGoogle({
        idToken,
        centerName: form.getValues("centerName"),
        centerSlug: form.getValues("centerSlug"),
      });

      // Step 4: Re-establish the Firebase session while keeping flag set.
      // We keep signupInProgress=true so onAuthStateChanged doesn't race with us.
      if (credential) {
        await signInWithCredential(firebaseAuth, credential);
        // Step 5: Manually call login() to populate user data before navigating.
        // This ensures the user is fully authenticated before we navigate.
        // Token storage is handled by auth-context.tsx's onAuthStateChanged listener.
        const newToken = await firebaseAuth.currentUser?.getIdToken();
        if (newToken) {
          await login(newToken);
        }
      } else {
        // Fallback: call login with the original token
        // Token storage is handled by auth-context.tsx's onAuthStateChanged listener.
        await login(idToken);
      }

      // Step 6: Clear the flag after everything is complete
      setSignupInProgress(false);

      toast.success(t("signupCenterForm.centerRegisteredWithGoogle"));
      navigate("/dashboard");
    } catch (error) {
      setSignupInProgress(false);
      await signOut(firebaseAuth).catch(() => {});
      toast.error(
        error instanceof Error ? error.message : t("signupCenterForm.googleSignupFailed"),
      );
    }
  };

  const centerName = form.watch("centerName");
  React.useEffect(() => {
    const slug = centerName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    form.setValue("centerSlug", slug, { shouldValidate: true });
  }, [centerName, form]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        <FormField
          control={form.control}
          name="centerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("signupCenterForm.centerName")}</FormLabel>
              <FormControl>
                <Input placeholder={t("signupCenterForm.centerNamePlaceholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="centerSlug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("signupCenterForm.centerSlug")}</FormLabel>
              <FormControl>
                <Input placeholder={t("signupCenterForm.centerSlugPlaceholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onGoogleSignup}
          disabled={isPending || isGooglePending}
        >
          {isGooglePending ? t("signupCenterForm.connecting") : t("signupCenterForm.continueWithGoogle")}
        </Button>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {t("signupCenterForm.orSignUpWithEmail")}
            </span>
          </div>
        </div>

        <FormField
          control={form.control}
          name="ownerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("signupCenterForm.ownerName")}</FormLabel>
              <FormControl>
                <Input placeholder={t("signupCenterForm.ownerNamePlaceholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="ownerEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("signupCenterForm.email")}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder={t("signupCenterForm.emailPlaceholder")}
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
              <FormLabel>{t("signupCenterForm.password")}</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder={t("signupCenterForm.passwordPlaceholder")}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full"
          disabled={isPending || isGooglePending}
        >
          {isPending ? t("signupCenterForm.creatingCenter") : t("signupCenterForm.registerWithEmail")}
        </Button>
      </form>
    </Form>
  );
}
