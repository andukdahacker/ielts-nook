"use client";

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
import { cn } from "@workspace/ui/lib/utils";
import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import useRegister from "../hooks/register.hook";
import { useSignUpWithGoogle } from "../hooks/sign-up-with-google.hook";

const signUpFormSchema = z.object({
  email: z.email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>?]).*$/,
      "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 symbol",
    ),
});

export type SignUpFormSchema = z.infer<typeof signUpFormSchema>;

export function SignUpForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const form = useForm<SignUpFormSchema>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { mutate: register, isPending: registerLoading } = useRegister();

  const { mutate: googleSignUp, isPending: googleSignUpLoading } =
    useSignUpWithGoogle();

  const handleSubmit = (values: SignUpFormSchema) => {
    register(values);
  };

  const handleGoogleSignUp = async () => {
    googleSignUp();
  };

  return (
    <Form {...form}>
      <form
        className={cn("flex flex-col gap-6", className)}
        {...props}
        onSubmit={form.handleSubmit(handleSubmit)}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Create a new account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your email below to create an account
          </p>
        </div>
        <div className="grid gap-6">
          <div className="grid gap-3">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      required
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-3">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input id="password" type="password" required {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" className="w-full" disabled={registerLoading}>
            {registerLoading && <Loader2Icon className="animate-spin" />}
            Sign up
          </Button>
          <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
            <span className="bg-background text-muted-foreground relative z-10 px-2">
              Or continue with
            </span>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignUp}
            disabled={googleSignUpLoading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path
                d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                fill="currentColor"
              />
            </svg>
            Continue with Google
            {googleSignUpLoading && <Loader2Icon className="animate-spin" />}
          </Button>
        </div>
        <div className="text-center text-sm">
          Already have an account?{" "}
          <Link href={"/sign-in"}>
            <span className="underline underline-offset-4">Sign in</span>
          </Link>
        </div>
      </form>
    </Form>
  );
}
