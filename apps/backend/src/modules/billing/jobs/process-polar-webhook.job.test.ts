import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted runs at the hoisted scope, before vi.mock factories
const state = vi.hoisted(() => ({
  handler: null as ((ctx: {
    event: { data: { eventType: string; payload: Record<string, unknown> } };
    step: { run: ReturnType<typeof vi.fn> };
  }) => Promise<unknown>) | null,
  createFnConfig: null as Record<string, unknown> | null,
  createFnTrigger: null as Record<string, unknown> | null,
}));

vi.mock("../../inngest/client.js", () => ({
  inngest: {
    createFunction: vi.fn(
      (config: Record<string, unknown>, trigger: Record<string, unknown>, handler: typeof state.handler) => {
        state.createFnConfig = config;
        state.createFnTrigger = trigger;
        state.handler = handler;
        return { id: "process-polar-webhook" };
      },
    ),
  },
}));

const mockHandleSubscriptionEvent = vi.fn();
const mockHandleOrderPaidEvent = vi.fn();

vi.mock("../billing.service.js", () => {
  return {
    BillingService: class MockBillingService {
      handleSubscriptionEvent = mockHandleSubscriptionEvent;
      handleOrderPaidEvent = mockHandleOrderPaidEvent;
    },
  };
});

const mockDisconnect = vi.fn();
vi.mock("../../../plugins/create-prisma.js", () => ({
  createPrisma: vi.fn(() => ({
    $disconnect: mockDisconnect,
  })),
}));

// Import triggers createFunction, capturing the handler
import "./process-polar-webhook.job.js";

describe("processPolarWebhookJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should be registered with correct config", () => {
    expect(state.createFnConfig).toMatchObject({ id: "process-polar-webhook", retries: 5 });
    expect(state.createFnTrigger).toMatchObject({ event: "billing/polar.webhook.received" });
    expect(state.handler).not.toBeNull();
  });

  it("should process subscription.active event", async () => {
    const mockStep = {
      run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
    };

    const payload = { id: "polar-sub-1", customerId: "polar-cust-1" };
    const result = await state.handler!({
      event: { data: { eventType: "subscription.active", payload } },
      step: mockStep,
    });

    expect(mockHandleSubscriptionEvent).toHaveBeenCalledWith("subscription.active", payload);
    expect(mockHandleOrderPaidEvent).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "processed", eventType: "subscription.active" });
  });

  it("should process subscription.created event", async () => {
    const mockStep = {
      run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
    };

    const payload = { id: "polar-sub-1", status: "active" };
    await state.handler!({
      event: { data: { eventType: "subscription.created", payload } },
      step: mockStep,
    });

    expect(mockHandleSubscriptionEvent).toHaveBeenCalledWith("subscription.created", payload);
  });

  it("should process subscription.past_due event", async () => {
    const mockStep = {
      run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
    };

    await state.handler!({
      event: { data: { eventType: "subscription.past_due", payload: { id: "sub-1" } } },
      step: mockStep,
    });

    expect(mockHandleSubscriptionEvent).toHaveBeenCalledWith("subscription.past_due", { id: "sub-1" });
  });

  it("should process subscription.canceled event", async () => {
    const mockStep = {
      run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
    };

    await state.handler!({
      event: { data: { eventType: "subscription.canceled", payload: { id: "sub-1" } } },
      step: mockStep,
    });

    expect(mockHandleSubscriptionEvent).toHaveBeenCalledWith("subscription.canceled", { id: "sub-1" });
  });

  it("should process subscription.uncanceled event", async () => {
    const mockStep = {
      run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
    };

    await state.handler!({
      event: { data: { eventType: "subscription.uncanceled", payload: { id: "sub-1" } } },
      step: mockStep,
    });

    expect(mockHandleSubscriptionEvent).toHaveBeenCalledWith("subscription.uncanceled", { id: "sub-1" });
  });

  it("should process order.paid event", async () => {
    const mockStep = {
      run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
    };

    const payload = { id: "polar-order-1", customerId: "polar-cust-1", amount: 5000 };
    const result = await state.handler!({
      event: { data: { eventType: "order.paid", payload } },
      step: mockStep,
    });

    expect(mockHandleOrderPaidEvent).toHaveBeenCalledWith(payload);
    expect(mockHandleSubscriptionEvent).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "processed", eventType: "order.paid" });
  });

  it("should handle unknown event type gracefully", async () => {
    const mockStep = {
      run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
    };

    const result = await state.handler!({
      event: { data: { eventType: "unknown.event", payload: {} } },
      step: mockStep,
    });

    expect(mockHandleSubscriptionEvent).not.toHaveBeenCalled();
    expect(mockHandleOrderPaidEvent).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "processed", eventType: "unknown.event" });
  });

  it("should disconnect prisma after processing subscription event", async () => {
    const mockStep = {
      run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
    };

    await state.handler!({
      event: { data: { eventType: "subscription.active", payload: { id: "sub-1" } } },
      step: mockStep,
    });

    expect(mockDisconnect).toHaveBeenCalled();
  });

  it("should disconnect prisma after processing order.paid event", async () => {
    const mockStep = {
      run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
    };

    await state.handler!({
      event: { data: { eventType: "order.paid", payload: { id: "order-1" } } },
      step: mockStep,
    });

    expect(mockDisconnect).toHaveBeenCalled();
  });

  it("should disconnect prisma even when handler throws", async () => {
    mockHandleSubscriptionEvent.mockRejectedValueOnce(new Error("DB error"));

    const mockStep = {
      run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
    };

    await expect(
      state.handler!({
        event: { data: { eventType: "subscription.active", payload: { id: "sub-1" } } },
        step: mockStep,
      }),
    ).rejects.toThrow("DB error");

    expect(mockDisconnect).toHaveBeenCalled();
  });
});
