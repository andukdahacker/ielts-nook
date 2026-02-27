import { useQuery, useMutation } from "@tanstack/react-query";
import { client } from "@/core/client";

// Query key factory
export const billingKeys = {
  all: ["billing"] as const,
  overview: () => [...billingKeys.all, "overview"] as const,
  payments: (page: number, limit: number) => [...billingKeys.all, "payments", page, limit] as const,
  usage: () => [...billingKeys.all, "usage"] as const,
};

export function useBillingOverview(options?: { staleTime?: number }) {
  return useQuery({
    queryKey: billingKeys.overview(),
    queryFn: async () => {
      const { data, error } = await client.GET("/api/v1/billing/");
      if (error) throw error;
      return data!.data;
    },
    ...options,
  });
}

export function usePaymentHistory(page = 1, limit = 10) {
  return useQuery({
    queryKey: billingKeys.payments(page, limit),
    queryFn: async () => {
      const { data, error } = await client.GET("/api/v1/billing/payments", {
        params: { query: { page, limit } },
      });
      if (error) throw error;
      return data!.data;
    },
  });
}

export function useUsageHistory() {
  return useQuery({
    queryKey: billingKeys.usage(),
    queryFn: async () => {
      const { data, error } = await client.GET("/api/v1/billing/usage");
      if (error) throw error;
      return data!.data;
    },
  });
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: async (tier: "starter" | "growth" | "enterprise") => {
      const { data, error } = await client.POST("/api/v1/billing/checkout", {
        body: { tier },
      });
      if (error) throw new Error((error as { message?: string }).message || "Failed to create checkout");
      return data!.data;
    },
    onSuccess: (data) => {
      window.open(data.checkoutUrl, "_blank");
    },
  });
}
