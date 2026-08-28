import { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';

interface ScaleContextType {
  /** true = real physical scale, false = visual scale (enlarged) */
  trueScale: boolean;
  setTrueScale: (value: boolean) => void;
  toggleScale: () => void;
}

const ScaleContext = createContext<ScaleContextType | undefined>(undefined);

export function ScaleProvider({ children }: { children: ReactNode }) {
  const [trueScale, setTrueScale] = useState(false); // default to visual scale

  const toggleScale = useCallback(() => setTrueScale(prev => !prev), []);

  const value = useMemo(() => ({ trueScale, setTrueScale, toggleScale }), [trueScale, setTrueScale, toggleScale]);

  return (
    <ScaleContext.Provider value={value}>
      {children}
    </ScaleContext.Provider>
  );
}

export function useScale() {
  const context = useContext(ScaleContext);
  if (!context) {
    throw new Error('useScale must be used within a ScaleProvider');
  }
  return context;
}