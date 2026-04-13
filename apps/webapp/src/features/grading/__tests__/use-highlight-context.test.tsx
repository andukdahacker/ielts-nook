import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import {
  HighlightProvider,
  useHighlightValue,
  useHighlightSetter,
  useHighlightState,
  useScrollTargetValue,
  useScrollTargetSetter,
} from "../hooks/use-highlight-context";

function TestValueConsumer() {
  const value = useHighlightValue();
  return <div data-testid="value">{value ?? "null"}</div>;
}

function TestSetterConsumer({ id }: { id: string }) {
  const setter = useHighlightSetter();
  return (
    <button data-testid="setter" onClick={() => setter(id, false)}>
      Set {id}
    </button>
  );
}

describe("useHighlightContext", () => {
  it("provides null as default value", () => {
    render(
      <HighlightProvider>
        <TestValueConsumer />
      </HighlightProvider>,
    );

    expect(screen.getByTestId("value")).toHaveTextContent("null");
  });

  it("updates value when setter is called", async () => {
    vi.useFakeTimers();

    render(
      <HighlightProvider>
        <TestValueConsumer />
        <TestSetterConsumer id="item-1" />
      </HighlightProvider>,
    );

    expect(screen.getByTestId("value")).toHaveTextContent("null");

    act(() => {
      screen.getByTestId("setter").click();
    });

    expect(screen.getByTestId("value")).toHaveTextContent("item-1");

    vi.useRealTimers();
  });

  it("useHighlightState returns both value and setter", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <HighlightProvider>{children}</HighlightProvider>
    );

    const { result } = renderHook(() => useHighlightState(), { wrapper });

    expect(result.current.highlightedItemId).toBeNull();
    expect(typeof result.current.setHighlightedItemId).toBe("function");
  });

  it("debounces mouse events (debounce=true)", async () => {
    vi.useFakeTimers();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <HighlightProvider>{children}</HighlightProvider>
    );

    const { result } = renderHook(() => useHighlightState(), { wrapper });

    // Call with debounce=true (default)
    act(() => {
      result.current.setHighlightedItemId("item-1", true);
    });

    // Value should NOT be set yet (debounced)
    expect(result.current.highlightedItemId).toBeNull();

    // Advance timers past debounce
    act(() => {
      vi.advanceTimersByTime(60);
    });

    expect(result.current.highlightedItemId).toBe("item-1");

    vi.useRealTimers();
  });

  it("does not debounce focus events (debounce=false)", () => {
    vi.useFakeTimers();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <HighlightProvider>{children}</HighlightProvider>
    );

    const { result } = renderHook(() => useHighlightState(), { wrapper });

    act(() => {
      result.current.setHighlightedItemId("item-1", false);
    });

    // Should be set immediately
    expect(result.current.highlightedItemId).toBe("item-1");

    vi.useRealTimers();
  });
});

describe("useScrollTargetContext", () => {
  it("provides null as default scrollTargetId", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <HighlightProvider>{children}</HighlightProvider>
    );

    const { result } = renderHook(() => useScrollTargetValue(), { wrapper });
    expect(result.current).toBeNull();
  });

  it("updates scrollTargetId when setter is called", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <HighlightProvider>{children}</HighlightProvider>
    );

    const { result } = renderHook(
      () => ({ value: useScrollTargetValue(), setter: useScrollTargetSetter() }),
      { wrapper },
    );

    act(() => {
      result.current.setter("item-1");
    });

    expect(result.current.value).toEqual({ id: "item-1", seq: expect.any(Number) });
  });

  it("re-setting the same id produces a new object (different seq)", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <HighlightProvider>{children}</HighlightProvider>
    );

    const { result } = renderHook(
      () => ({ value: useScrollTargetValue(), setter: useScrollTargetSetter() }),
      { wrapper },
    );

    act(() => { result.current.setter("item-1"); });
    const first = result.current.value;

    act(() => { result.current.setter("item-1"); });
    const second = result.current.value;

    expect(first?.id).toBe("item-1");
    expect(second?.id).toBe("item-1");
    expect(second?.seq).toBeGreaterThan(first!.seq);
  });

  it("useScrollTargetSetter returns a stable function", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <HighlightProvider>{children}</HighlightProvider>
    );

    const { result } = renderHook(() => useScrollTargetSetter(), { wrapper });
    expect(typeof result.current).toBe("function");
  });

  it("scrollTargetId and highlightedItemId are independent", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <HighlightProvider>{children}</HighlightProvider>
    );

    const { result } = renderHook(
      () => ({
        highlight: useHighlightState(),
        scrollValue: useScrollTargetValue(),
        scrollSetter: useScrollTargetSetter(),
      }),
      { wrapper },
    );

    // Set scroll target
    act(() => {
      result.current.scrollSetter("scroll-1");
    });

    // Highlight should remain null
    expect(result.current.highlight.highlightedItemId).toBeNull();
    expect(result.current.scrollValue).toEqual({ id: "scroll-1", seq: expect.any(Number) });

    // Set highlight (immediate)
    act(() => {
      result.current.highlight.setHighlightedItemId("highlight-1", false);
    });

    // Both should be independently set
    expect(result.current.highlight.highlightedItemId).toBe("highlight-1");
    expect(result.current.scrollValue).toEqual({ id: "scroll-1", seq: expect.any(Number) });
  });
});
