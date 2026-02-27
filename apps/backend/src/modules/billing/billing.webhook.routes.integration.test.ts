import Fastify, { FastifyInstance } from "fastify";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import rawBody from "fastify-raw-body";
import { billingWebhookRoutes } from "./billing.webhook.routes.js";

// Mock the inngest client
vi.mock("../inngest/client.js", () => ({
  inngest: { send: vi.fn().mockResolvedValue({ ids: ["test-event-id"] }) },
}));

// Mock the Polar SDK webhooks module
vi.mock("@polar-sh/sdk/webhooks", () => ({
  validateEvent: vi.fn(),
  WebhookVerificationError: class WebhookVerificationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "WebhookVerificationError";
    }
  },
}));

import { inngest } from "../inngest/client.js";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";

describe("Billing Webhook Routes Integration", () => {
  let app: FastifyInstance;
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.POLAR_WEBHOOK_SECRET = "test-webhook-secret";

    app = Fastify();
    await app.register(rawBody, { global: false, runFirst: true });
    await app.register(billingWebhookRoutes, { prefix: "/api/v1/billing/webhooks/polar" });
    await app.ready();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("should return 202 with valid webhook signature", async () => {
    vi.mocked(validateEvent).mockReturnValue({
      type: "subscription.active",
      data: {
        id: "polar-sub-1",
        customerId: "polar-cust-1",
        metadata: { centerId: "center-1" },
        productId: "prod-starter-id",
      },
    } as ReturnType<typeof validateEvent>);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/billing/webhooks/polar",
      payload: JSON.stringify({ type: "subscription.active", data: {} }),
      headers: {
        "content-type": "application/json",
        "webhook-id": "test-id",
        "webhook-timestamp": "1234567890",
        "webhook-signature": "valid-sig",
      },
    });

    expect(response.statusCode).toBe(202);
  });

  it("should dispatch event to Inngest", async () => {
    vi.mocked(validateEvent).mockReturnValue({
      type: "subscription.active",
      data: { id: "polar-sub-1" },
    } as ReturnType<typeof validateEvent>);

    await app.inject({
      method: "POST",
      url: "/api/v1/billing/webhooks/polar",
      payload: JSON.stringify({ type: "subscription.active", data: {} }),
      headers: {
        "content-type": "application/json",
        "webhook-id": "test-id",
        "webhook-timestamp": "1234567890",
        "webhook-signature": "valid-sig",
      },
    });

    expect(vi.mocked(inngest.send)).toHaveBeenCalledWith({
      name: "billing/polar.webhook.received",
      data: {
        eventType: "subscription.active",
        payload: { id: "polar-sub-1" },
      },
    });
  });

  it("should return 403 with invalid webhook signature", async () => {
    vi.mocked(validateEvent).mockImplementation(() => {
      throw new WebhookVerificationError("Invalid signature");
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/billing/webhooks/polar",
      payload: JSON.stringify({ type: "subscription.active" }),
      headers: {
        "content-type": "application/json",
        "webhook-id": "test-id",
        "webhook-timestamp": "1234567890",
        "webhook-signature": "invalid-sig",
      },
    });

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Invalid webhook signature");
  });

  it("should return 500 when POLAR_WEBHOOK_SECRET is not configured", async () => {
    delete process.env.POLAR_WEBHOOK_SECRET;

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/billing/webhooks/polar",
      payload: JSON.stringify({ type: "subscription.active" }),
      headers: { "content-type": "application/json" },
    });

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Webhook not configured");
  });

  it("should not require auth headers", async () => {
    vi.mocked(validateEvent).mockReturnValue({
      type: "order.paid",
      data: { id: "polar-order-1" },
    } as ReturnType<typeof validateEvent>);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/billing/webhooks/polar",
      payload: JSON.stringify({ type: "order.paid" }),
      headers: {
        "content-type": "application/json",
        "webhook-id": "test-id",
        "webhook-timestamp": "1234567890",
        "webhook-signature": "valid-sig",
      },
    });

    // No Authorization header — should still work (webhook route has no auth)
    expect(response.statusCode).toBe(202);
  });
});
