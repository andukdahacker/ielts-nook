import { Polar } from "@polar-sh/sdk";

let polarClient: Polar | null = null;

export function getPolarClient(): Polar {
  if (!polarClient) {
    const accessToken = process.env.POLAR_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error(
        "Polar not configured — set POLAR_ACCESS_TOKEN environment variable",
      );
    }
    polarClient = new Polar({
      accessToken,
      ...(process.env.POLAR_MODE === "sandbox" ? { server: "sandbox" } : {}),
    });
  }
  return polarClient;
}

/** Reset the cached client — for testing only. */
export function resetPolarClient(): void {
  polarClient = null;
}
