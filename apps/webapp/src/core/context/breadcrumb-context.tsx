import { createContext, useCallback, useContext, useMemo, useState } from "react";

interface BreadcrumbOverrides {
  labels: Record<string, string>;
  nonClickableSegments: Set<string>;
}

interface BreadcrumbSetters {
  setLabel: (segment: string, label: string) => void;
  removeLabel: (segment: string) => void;
  setNonClickable: (segment: string) => void;
  removeNonClickable: (segment: string) => void;
  clearAll: () => void;
}

const BreadcrumbValueContext = createContext<BreadcrumbOverrides>({
  labels: {},
  nonClickableSegments: new Set(),
});

const BreadcrumbSetterContext = createContext<BreadcrumbSetters>({
  setLabel: () => {},
  removeLabel: () => {},
  setNonClickable: () => {},
  removeNonClickable: () => {},
  clearAll: () => {},
});

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [nonClickableSegments, setNonClickableSegments] = useState<Set<string>>(new Set());

  const setLabel = useCallback((segment: string, label: string) => {
    setLabels((prev) => ({ ...prev, [segment]: label }));
  }, []);

  const removeLabel = useCallback((segment: string) => {
    setLabels((prev) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [segment]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const setNonClickable = useCallback((segment: string) => {
    setNonClickableSegments((prev) => {
      const next = new Set(prev);
      next.add(segment);
      return next;
    });
  }, []);

  const removeNonClickable = useCallback((segment: string) => {
    setNonClickableSegments((prev) => {
      const next = new Set(prev);
      next.delete(segment);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setLabels({});
    setNonClickableSegments(new Set());
  }, []);

  const value = useMemo(
    () => ({ labels, nonClickableSegments }),
    [labels, nonClickableSegments],
  );

  return (
    <BreadcrumbSetterContext.Provider value={{ setLabel, removeLabel, setNonClickable, removeNonClickable, clearAll }}>
      <BreadcrumbValueContext.Provider value={value}>
        {children}
      </BreadcrumbValueContext.Provider>
    </BreadcrumbSetterContext.Provider>
  );
}

export function useBreadcrumbOverrides(): BreadcrumbSetters {
  return useContext(BreadcrumbSetterContext);
}

export function useBreadcrumbValues(): BreadcrumbOverrides {
  return useContext(BreadcrumbValueContext);
}
