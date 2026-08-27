import { createContext, useContext, useState, ReactNode } from 'react';

interface ScaleContextType {
  /** true = real physical scale, false = visual scale (enlarged) */
  trueScale: boolean;
  setTrueScale: (value: boolean) => void;
  toggleScale: () => void;
}

const ScaleContext = createContext<ScaleContextType | undefined>(undefined);

export function ScaleProvider({ children }: { children: ReactNode }) {
  const [trueScale, setTrueScale] = useState(false); // default to visual scale

  const toggleScale = () => setTrueScale(prev => !prev);

  return (
    <ScaleContext.Provider value={{ trueScale, setTrueScale, toggleScale }}>
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