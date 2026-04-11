import React, { createContext, useContext, useEffect } from "react";
import { useAuth } from "@/features/auth/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import client from "@/core/client";
import type { TenantData, UpdateCenterInput } from "@workspace/types";

interface TenantContextType {
  tenant: TenantData["center"] | null;
  isLoading: boolean;
  updateBranding: (
    input: UpdateCenterInput,
  ) => Promise<{ center: TenantData["center"]; owner: TenantData["owner"] }>;
  uploadLogo: (file: File) => Promise<string>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["tenant", user?.centerId],
    queryFn: async () => {
      if (!user?.centerId) return null;
      const { data, error } = await client.GET("/api/v1/tenants/{id}", {
        params: { path: { id: user.centerId } },
      });
      if (error) throw error;
      return data.data;
    },
    enabled: !!user?.centerId,
  });

  const updateMutation = useMutation({
    mutationFn: async (input: UpdateCenterInput) => {
      if (!user?.centerId) throw new Error("No centerId");
      const { data, error } = await client.PATCH("/api/v1/tenants/{id}", {
        params: { path: { id: user.centerId } },
        body: input,
      });
      if (error) throw error;

      if (!data.data) throw new Error("No data");

      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", user?.centerId] });
    },
  });

  const uploadLogo = async (file: File) => {
    if (!user?.centerId) throw new Error("No centerId");

    const { data, error } = await client.POST("/api/v1/tenants/{id}/logo", {
      params: { path: { id: user.centerId } },
      body: { file },
      bodySerializer: (body) => {
        const formData = new FormData();
        formData.append("file", body.file as Blob);
        return formData;
      },
    });

    if (error) throw error;
    if (!data?.data?.logoUrl) throw new Error("Failed to upload logo");

    queryClient.invalidateQueries({ queryKey: ["tenant", user?.centerId] });
    return data.data.logoUrl;
  };

  // CSS Variable injection
  useEffect(() => {
    if (data?.center?.brandColor) {
      const root = document.documentElement;
      const hsl = hexToHslVariables(data.center.brandColor);
      root.style.setProperty("--primary", `hsl(${hsl})`);

      // Set foreground color based on brightness for contrast
      const brightness = getBrightness(data.center.brandColor);
      root.style.setProperty(
        "--primary-foreground",
        brightness > 160 ? "oklch(0.267 0.038 253.28)" : "oklch(0.985 0 0)",
      );

      // Update other related variables if needed
      root.style.setProperty("--ring", `hsl(${hsl})`);
    }
  }, [data?.center?.brandColor]);

  return (
    <TenantContext.Provider
      value={{
        tenant: data?.center ?? null,
        isLoading,
        updateBranding: (input) => updateMutation.mutateAsync(input),
        uploadLogo,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
};

// Helper to convert hex to shadcn-compatible HSL variables
function hexToHslVariables(hex: string): string {
  let r = 0,
    g = 0,
    b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return `${(h * 360).toFixed(2)} ${(s * 100).toFixed(2)}% ${(l * 100).toFixed(2)}%`;
}

function getBrightness(hex: string): number {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return 255;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}
