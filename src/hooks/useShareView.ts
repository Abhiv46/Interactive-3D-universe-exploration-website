import { useCallback, useState } from 'react';
import * as THREE from 'three';
import { CelestialBodyData } from '@/types/orbitalElements';
import { SettingsState } from '@/context/SettingsContext';

/**
 * Shareable view state that can be encoded in a URL
 */
export interface ShareViewState {
  // Camera state
  camera: {
    position: [number, number, number];
    target: [number, number, number];
    fov?: number;
  };
  // Time state
  time: {
    julianDate: number;
    timeScale: number;
    isRunning: boolean;
  };
  // Selected object
  selectedObject?: {
    id: string;
    name: string;
    type: string;
  };
  // Quality/Display settings (optional, can be overridden by user's settings)
  settings?: Partial<SettingsState>;
  // Version for future compatibility
  version: number;
}

// Current version of share format
const SHARE_VERSION = 1;

/**
 * Compress a number array to a shorter string using base64
 */
function compressVector3(vec: THREE.Vector3): string {
  // Use 4 decimal places precision, encode as base64
  const arr = [vec.x.toFixed(4), vec.y.toFixed(4), vec.z.toFixed(4)];
  return btoa(arr.join(','));
}

function decompressVector3(str: string): THREE.Vector3 {
  try {
    const decoded = atob(str);
    const [x, y, z] = decoded.split(',').map(Number);
    return new THREE.Vector3(x, y, z);
  } catch {
    return new THREE.Vector3(0, 0, 0);
  }
}

/**
 * Encode share state to a compact URL-safe string
 */
export function encodeShareState(state: ShareViewState): string {
  const json = JSON.stringify(state);
  // Use base64url encoding (URL-safe base64)
  const base64 = btoa(json);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Decode share state from URL string
 */
export function decodeShareState(encoded: string): ShareViewState | null {
  try {
    // Convert from base64url to base64
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    while (base64.length % 4) base64 += '=';
    const json = atob(base64);
    const state = JSON.parse(json) as ShareViewState;

    // Validate version
    if (state.version !== SHARE_VERSION) {
      console.warn(`Share state version mismatch: expected ${SHARE_VERSION}, got ${state.version}`);
    }

    return state;
  } catch (error) {
    console.error('Failed to decode share state:', error);
    return null;
  }
}

/**
 * Hook for managing share view functionality
 */
export function useShareView() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  /**
   * Generate a shareable URL from current view state
   */
  const generateShareUrl = useCallback((
    baseUrl: string,
    camera: THREE.Camera,
    controls: THREE.Object3D | null, // OrbitControls target
    julianDate: number,
    timeScale: number,
    isRunning: boolean,
    selectedBody: CelestialBodyData | null,
    settings: SettingsState
  ): string => {
    setIsGenerating(true);

    try {
      // Get camera position
      const cameraPosition = new THREE.Vector3();
      camera.getWorldPosition(cameraPosition);

      // Get controls target (what the camera is looking at)
      let targetPosition = new THREE.Vector3(0, 0, 0);
      if (controls) {
        // OrbitControls stores target in .target
        const controlsAny = controls as any;
        if (controlsAny.target instanceof THREE.Vector3) {
          targetPosition.copy(controlsAny.target);
        }
      }

      const shareState: ShareViewState = {
        version: SHARE_VERSION,
        camera: {
          position: [cameraPosition.x, cameraPosition.y, cameraPosition.z],
          target: [targetPosition.x, targetPosition.y, targetPosition.z],
          fov: (camera as THREE.PerspectiveCamera).fov,
        },
        time: {
          julianDate,
          timeScale,
          isRunning,
        },
        selectedObject: selectedBody ? {
          id: selectedBody.id,
          name: selectedBody.name,
          type: selectedBody.type || 'object',
        } : undefined,
        settings: {
          // Only include settings that affect the view significantly
          trueScale: settings.trueScale,
          visualScaleFactor: settings.visualScaleFactor,
          showOrbits: settings.showOrbits,
          showLabels: settings.showLabels,
          showISS: settings.showISS,
          showAurora: settings.showAurora,
          qualityPreset: settings.qualityPreset,
        },
      };

      const encoded = encodeShareState(shareState);
      const url = `${baseUrl}?view=${encoded}`;

      setLastUrl(url);
      return url;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * Copy share URL to clipboard
   */
  const copyShareUrl = useCallback(async (url: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
      } catch {
        return false;
      }
    }
  }, []);

  /**
   * Share using Web Share API if available
   */
  const shareView = useCallback(async (
    url: string,
    title = 'Universe Explorer View',
    text = 'Check out this view from Universe Explorer!'
  ): Promise<boolean> => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return true;
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.warn('Web Share failed:', error);
        }
        return false;
      }
    }
    return false;
  }, []);

  return {
    generateShareUrl,
    copyShareUrl,
    shareView,
    isGenerating,
    lastUrl,
    decodeShareState,
  };
}

/**
 * Hook for applying a shared view state to the app
 */
export function useApplySharedView() {
  const applySharedView = useCallback((
    state: ShareViewState,
    setCameraPosition: (pos: THREE.Vector3) => void,
    setCameraTarget: (target: THREE.Vector3) => void,
    setJulianDate: (jd: number) => void,
    setTimeScale: (scale: number) => void,
    setIsRunning: (running: boolean) => void,
    setSelectedBody: (body: CelestialBodyData | null) => void,
    settings: SettingsState,
    setSettings: (s: Partial<SettingsState>) => void,
    bodyLookup: (id: string) => CelestialBodyData | null
  ) => {
    // Apply camera
    if (state.camera) {
      const pos = new THREE.Vector3(...state.camera.position);
      const target = new THREE.Vector3(...state.camera.target);
      setCameraPosition(pos);
      setCameraTarget(target);
    }

    // Apply time
    if (state.time) {
      setJulianDate(state.time.julianDate);
      setTimeScale(state.time.timeScale);
      setIsRunning(state.time.isRunning);
    }

    // Apply selected object
    if (state.selectedObject) {
      const body = bodyLookup(state.selectedObject.id);
      if (body) {
        setSelectedBody(body);
      }
    }

    // Apply settings (optional - merge with user's settings)
    if (state.settings) {
      setSettings(state.settings);
    }
  }, []);

  return { applySharedView };
}

/**
 * Parse share URL from current window location
 */
export function parseShareUrlFromLocation(): ShareViewState | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const viewParam = params.get('view');

  if (!viewParam) return null;

  return decodeShareState(viewParam);
}

/**
 * Generate a short share code (for manual sharing)
 */
export function generateShareCode(state: ShareViewState): string {
  const encoded = encodeShareState(state);
  // Take first 12 characters for a short code
  return encoded.slice(0, 12).toUpperCase();
}

/**
 * Reconstruct full share state from short code (requires server-side lookup or local storage)
 * This is a placeholder for a future feature where short codes are stored in a database
 */
export async function resolveShareCode(code: string): Promise<ShareViewState | null> {
  // In a real implementation, this would query a backend
  // For now, we'll check localStorage for any stored shares
  try {
    const stored = localStorage.getItem(`share_${code.toLowerCase()}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore errors
  }
  return null;
}

/**
 * Store a share state locally with a short code
 */
export function storeShareLocally(state: ShareViewState): string {
  const code = generateShareCode(state);
  try {
    localStorage.setItem(`share_${code.toLowerCase()}`, JSON.stringify(state));
  } catch {
    // Ignore quota errors
  }
  return code;
}