"use client";

import { UnauthorizedError } from "@/lib/core/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: 0,
        onError: (error) => {
          if (error instanceof UnauthorizedError) {
            toast.error("Unauthenticated");
            router.replace("/");
          }
        },
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        enableColorScheme
      >
        {children}
      </NextThemesProvider>
    </QueryClientProvider>
  );
}
