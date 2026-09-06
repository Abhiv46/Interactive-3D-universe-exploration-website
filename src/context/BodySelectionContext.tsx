import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { CelestialBodyData } from '@/types/orbitalElements';

interface BodySelectionContextValue {
  /** The currently selected (clicked / searched) body, or null if none. */
  selected: CelestialBodyData | null;
  /** Select a body (used by click, search, and in-canvas label wiring). */
  select: (body: CelestialBodyData | null) => void;
  /** Clear the current selection. */
  clear: () => void;
}

const BodySelectionContext = createContext<BodySelectionContextValue>({
  selected: null,
  select: () => {},
  clear: () => {},
});

/**
 * Shared selection state for a focused body. Previously this lived as local
 * useState inside UIOverlay, invisible to the 3D scene; lifting it here lets
 * the in-canvas body labels read the same selection that the SearchBar /
 * InfoCard drive.
 */
export function BodySelectionProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<CelestialBodyData | null>(null);

  const select = useCallback((body: CelestialBodyData | null) => {
    setSelected(body);
  }, []);

  const clear = useCallback(() => {
    setSelected(null);
  }, []);

  const value = useMemo(
    () => ({ selected, select, clear }),
    [selected, select, clear],
  );

  return (
    <BodySelectionContext.Provider value={value}>
      {children}
    </BodySelectionContext.Provider>
  );
}

export function useBodySelection(): BodySelectionContextValue {
  return useContext(BodySelectionContext);
}
