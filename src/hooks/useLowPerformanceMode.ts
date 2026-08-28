import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { SettingsState } from '@/context/SettingsContext';

/**
 * Hook that applies low performance mode settings automatically
 * when enabled, and restores previous settings when disabled
 */
export function useLowPerformanceMode() {
  const { settings, setSettings } = useSettings();

  // Store previous settings for restoration
  const previousSettingsRef = useRef<Partial<SettingsState> | null>(null);

  const applyLowPerformanceMode = useCallback((enabled: boolean) => {
    if (enabled) {
      // Store current settings before applying low perf mode
      previousSettingsRef.current = {
        starCount: settings.starCount,
        enableBloom: settings.enableBloom,
        enableFXAA: settings.enableFXAA,
        enableGodRays: settings.enableGodRays,
        enableVignette: settings.enableVignette,
        showAsteroidBelt: settings.showAsteroidBelt,
        showKuiperBelt: settings.showKuiperBelt,
        showAurora: settings.showAurora,
        qualityPreset: settings.qualityPreset,
      };

      // Apply low performance settings
      setSettings({
        starCount: settings.reducedStarCount || 10000,
        enableBloom: !settings.disablePostProcessing,
        enableFXAA: !settings.disablePostProcessing,
        enableGodRays: false,
        enableVignette: !settings.disablePostProcessing,
        showAsteroidBelt: !settings.simplifiedBelts,
        showKuiperBelt: !settings.simplifiedBelts,
        showAurora: false,
        qualityPreset: 'low',
      });
    } else if (previousSettingsRef.current) {
      // Restore previous settings
      setSettings(previousSettingsRef.current);
      previousSettingsRef.current = null;
    }
  }, [settings, setSettings]);

  // Apply changes when lowPerformanceMode setting changes
  useEffect(() => {
    applyLowPerformanceMode(settings.lowPerformanceMode);
  }, [settings.lowPerformanceMode, applyLowPerformanceMode]);

  // Return current effective settings (considering low perf mode)
  // Use useMemo to avoid creating a new object on every render
  const effectiveSettings = useMemo(() => {
    if (!settings.lowPerformanceMode) return settings;

    return {
      ...settings,
      starCount: settings.reducedStarCount || 10000,
      enableBloom: !settings.disablePostProcessing && settings.enableBloom,
      enableFXAA: !settings.disablePostProcessing && settings.enableFXAA,
      enableGodRays: false,
      enableVignette: !settings.disablePostProcessing && settings.enableVignette,
      showAsteroidBelt: !settings.simplifiedBelts && settings.showAsteroidBelt,
      showKuiperBelt: !settings.simplifiedBelts && settings.showKuiperBelt,
      showAurora: false,
      qualityPreset: 'low' as const,
    };
  }, [
    settings.lowPerformanceMode,
    settings.reducedStarCount,
    settings.disablePostProcessing,
    settings.simplifiedBelts,
    settings.starCount,
    settings.enableBloom,
    settings.enableFXAA,
    settings.enableGodRays,
    settings.enableVignette,
    settings.showAsteroidBelt,
    settings.showKuiperBelt,
    settings.showAurora,
    settings.qualityPreset,
  ]);

  return {
    isLowPerformanceMode: settings.lowPerformanceMode,
    effectiveSettings,
    toggleLowPerformanceMode: () => setSettings({ lowPerformanceMode: !settings.lowPerformanceMode }),
  };
}