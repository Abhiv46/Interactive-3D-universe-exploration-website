import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';

export interface SettingsState {
  // Display
  showOrbits: boolean;
  showLabels: boolean;
  showConstellations: boolean;
  showMilkyWay: boolean;
  showAsteroidBelt: boolean;
  showKuiperBelt: boolean;
  showComets: boolean;
  showISS: boolean;
  showAurora: boolean;
  trueScale: boolean;
  visualScaleFactor: number;

  // Camera
  cameraMode: 'free' | 'orbit';
  cameraSpeed: number;

  // Quality
  qualityPreset: 'low' | 'medium' | 'high' | 'ultra';
  starCount: number;
  enableBloom: boolean;
  enableFXAA: boolean;
  enableGodRays: boolean;
  enableVignette: boolean;
  bloomIntensity: number;
  bloomThreshold: number;
  bloomSmoothing: number;
  toneMappingExposure: number;

  // Performance
  lowPerformanceMode: boolean;
  reducedStarCount: number;
  simplifiedBelts: boolean;
  disablePostProcessing: boolean;

  // Time
  timeSpeed: number;
}

export const DEFAULT_SETTINGS: SettingsState = {
  showOrbits: true,
  showLabels: true,
  showConstellations: true,
  showMilkyWay: true,
  showAsteroidBelt: true,
  showKuiperBelt: true,
  showComets: true,
  showISS: false,
  showAurora: true,
  trueScale: false,
  visualScaleFactor: 1000,

  cameraMode: 'free',
  cameraSpeed: 1000,

  qualityPreset: 'high',
  starCount: 100000,
  enableBloom: true,
  enableFXAA: true,
  enableGodRays: false,
  enableVignette: true,
  bloomIntensity: 0.9,
  bloomThreshold: 0.45,
  bloomSmoothing: 0.4,
  toneMappingExposure: 1.0,

  // Performance
  lowPerformanceMode: false,
  reducedStarCount: 10000,
  simplifiedBelts: false,
  disablePostProcessing: false,

  timeSpeed: 1,
};

interface SettingsContextValue {
  settings: SettingsState;
  setSettings: (settings: Partial<SettingsState>) => void;
  resetToDefaults: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<SettingsState>(DEFAULT_SETTINGS);

  const setSettings = useCallback((newSettings: Partial<SettingsState>) => {
    setSettingsState(prev => ({ ...prev, ...newSettings }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettingsState(DEFAULT_SETTINGS);
  }, []);

  const value = useMemo(() => ({
    settings,
    setSettings,
    resetToDefaults,
  }), [settings, setSettings, resetToDefaults]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}