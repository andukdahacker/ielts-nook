import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted runs at the hoisted scope, before vi.mock factories
const state = vi.hoisted(() => ({
  handler: null as ((ctx: {
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
        return { id: "snapshot-student-count" };
      },
    ),
  },
}));

const mockPrisma = {
  center: {
    findMany: vi.fn().mockResolvedValue([
      { id: "center-1" },
      { id: "center-2" },
    ]),
  },
  $disconnect: vi.fn(),
  $extends: vi.fn().mockReturnValue({
    centerMembership: { count: vi.fn().mockResolvedValue(5) },
  }),
  studentCountSnapshot: {
    upsert: vi.fn().mockResolvedValue({ id: "snap-1" }),
  },
};

vi.mock("../../../plugins/create-prisma.js", () => ({
  createPrisma: vi.fn(() => ({ ...mockPrisma })),
}));

// Import triggers createFunction, capturing the handler
import "./snapshot-student-count.job.js";

describe("snapshotStudentCountJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.center.findMany.mockResolvedValue([
      { id: "center-1" },
      { id: "center-2" },
    ]);
  });

  it("should be registered with correct config", () => {
    expect(state.createFnConfig).toMatchObject({ id: "snapshot-student-count", retries: 3 });
    expect(state.createFnTrigger).toMatchObject({ cron: "0 0 1 * *" });
    expect(state.handler).not.toBeNull();
  });

  it("should fetch all centers and snapshot each one", async () => {
    const mockStep = {
      run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => {
        return await fn();
      }),
    };

    const result = await state.handler!({ step: mockStep });

    expect(result).toEqual({ status: "completed", centersProcessed: 2 });
    // fetch-centers + one snapshot per center = 3 step.run calls
    expect(mockStep.run).toHaveBeenCalledTimes(3);
    expect(mockStep.run).toHaveBeenCalledWith("fetch-centers", expect.any(Function));
    expect(mockStep.run).toHaveBeenCalledWith("snapshot-center-1", expect.any(Function));
    expect(mockStep.run).toHaveBeenCalledWith("snapshot-center-2", expect.any(Function));
  });

  it("should return 0 centers processed when no centers exist", async () => {
    mockPrisma.center.findMany.mockResolvedValue([]);

    const mockStep = {
      run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => {
        return await fn();
      }),
    };

    const result = await state.handler!({ step: mockStep });
    expect(result).toEqual({ status: "completed", centersProcessed: 0 });
    // Only the fetch-centers step
    expect(mockStep.run).toHaveBeenCalledTimes(1);
  });

  it("should disconnect prisma in each step", async () => {
    const disconnectFn = vi.fn();
    const { createPrisma } = await import("../../../plugins/create-prisma.js");
    (createPrisma as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockPrisma,
      $disconnect: disconnectFn,
    });

    const mockStep = {
      run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => {
        return await fn();
      }),
    };

    await state.handler!({ step: mockStep });

    // Should disconnect once per step.run (fetch-centers + 2 snapshots = 3)
    expect(disconnectFn).toHaveBeenCalledTimes(3);
  });
});
