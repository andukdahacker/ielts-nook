import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// Split context: value changes on hover, setter is stable
const HighlightValueContext = createContext<string | null>(null);
const HighlightSetterContext = createContext<
  (id: string | null, debounce?: boolean) => void
>(() => {});

// Scroll target context: set on click, triggers scroll + flash
// Uses {id, seq} to ensure re-clicking the same card always triggers a new state change
interface ScrollTarget {
  id: string;
  seq: number;
}
const ScrollTargetValueContext = createContext<ScrollTarget | null>(null);
const ScrollTargetSetterContext = createContext<
  (id: string | null) => void
>(() => {});

export function HighlightProvider({ children }: { children: React.ReactNode }) {
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(
    null,
  );
  const [scrollTarget, setScrollTargetState] = useState<ScrollTarget | null>(
    null,
  );
  const scrollSeqRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setHighlighted = useCallback(
    (id: string | null, debounce = true) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (debounce) {
        timerRef.current = setTimeout(() => {
          setHighlightedItemId(id);
          timerRef.current = null;
        }, 50);
      } else {
        setHighlightedItemId(id);
      }
    },
    [],
  );

  const setScrollTarget = useCallback((id: string | null) => {
    if (id === null) {
      setScrollTargetState(null);
    } else {
      scrollSeqRef.current += 1;
      setScrollTargetState({ id, seq: scrollSeqRef.current });
    }
  }, []);

  // Clean up pending debounce timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <HighlightSetterContext.Provider value={setHighlighted}>
      <HighlightValueContext.Provider value={highlightedItemId}>
        <ScrollTargetSetterContext.Provider value={setScrollTarget}>
          <ScrollTargetValueContext.Provider value={scrollTarget}>
            {children}
          </ScrollTargetValueContext.Provider>
        </ScrollTargetSetterContext.Provider>
      </HighlightValueContext.Provider>
    </HighlightSetterContext.Provider>
  );
}

export function useHighlightValue(): string | null {
  return useContext(HighlightValueContext);
}

export function useHighlightSetter(): (
  id: string | null,
  debounce?: boolean,
) => void {
  return useContext(HighlightSetterContext);
}

export function useHighlightState() {
  return {
    highlightedItemId: useHighlightValue(),
    setHighlightedItemId: useHighlightSetter(),
  };
}

export function useScrollTargetValue(): ScrollTarget | null {
  return useContext(ScrollTargetValueContext);
}

export function useScrollTargetSetter(): (id: string | null) => void {
  return useContext(ScrollTargetSetterContext);
}
