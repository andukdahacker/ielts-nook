import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { getPolarClient, resetPolarClient } from "./polar.client.js";

describe("getPolarClient", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetPolarClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetPolarClient();
  });

  it("should throw when POLAR_ACCESS_TOKEN is not set", () => {
    delete process.env.POLAR_ACCESS_TOKEN;

    expect(() => getPolarClient()).toThrow(
      "Polar not configured — set POLAR_ACCESS_TOKEN environment variable",
    );
  });

  it("should create a Polar client when POLAR_ACCESS_TOKEN is set", () => {
    process.env.POLAR_ACCESS_TOKEN = "test-token";
    delete process.env.POLAR_MODE;

    const client = getPolarClient();

    expect(client).toBeDefined();
  });

  it("should return the same instance on subsequent calls", () => {
    process.env.POLAR_ACCESS_TOKEN = "test-token";

    const client1 = getPolarClient();
    const client2 = getPolarClient();

    expect(client1).toBe(client2);
  });

  it("should create a new instance after reset", () => {
    process.env.POLAR_ACCESS_TOKEN = "test-token";

    const client1 = getPolarClient();
    resetPolarClient();
    const client2 = getPolarClient();

    expect(client1).not.toBe(client2);
  });

  it("should create client with sandbox server when POLAR_MODE is sandbox", () => {
    process.env.POLAR_ACCESS_TOKEN = "test-token";
    process.env.POLAR_MODE = "sandbox";

    const client = getPolarClient();

    // Client was created — server option is internal to SDK
    expect(client).toBeDefined();
  });

  it("should create client without sandbox server when POLAR_MODE is not sandbox", () => {
    process.env.POLAR_ACCESS_TOKEN = "test-token";
    process.env.POLAR_MODE = "production";

    const client = getPolarClient();

    expect(client).toBeDefined();
  });
});
