import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { SurfaceRegionInfo } from '@/components/SurfaceTerrain';

interface SurfaceZoomContextValue {
  /** Current surface region info (when zoomed to surface) */
  surfaceRegion: SurfaceRegionInfo | null;
  /** Set surface region info */
  setSurfaceRegion: (region: SurfaceRegionInfo | null) => void;
  /** Whether surface zoom is active */
  isSurfaceZoomActive: boolean;
  /** Set surface zoom active state */
  setSurfaceZoomActive: (active: boolean) => void;
  /** The body currently being surface-zoomed */
  surfaceZoomBody: string | null;
  /** Set surface zoom body */
  setSurfaceZoomBody: (bodyId: string | null) => void;
  /** Current surface zoom level (0-1) */
  surfaceZoomLevel: number;
  /** Set surface zoom level */
  setSurfaceZoomLevel: (level: number) => void;
}

const SurfaceZoomContext = createContext<SurfaceZoomContextValue | null>(null);

export function SurfaceZoomProvider({ children }: { children: ReactNode }) {
  const [surfaceRegion, setSurfaceRegion] = useState<SurfaceRegionInfo | null>(null);
  const [isSurfaceZoomActive, setSurfaceZoomActive] = useState(false);
  const [surfaceZoomBody, setSurfaceZoomBody] = useState<string | null>(null);
  const [surfaceZoomLevel, setSurfaceZoomLevel] = useState(0);

  const value: SurfaceZoomContextValue = {
    surfaceRegion,
    setSurfaceRegion,
    isSurfaceZoomActive,
    setSurfaceZoomActive,
    surfaceZoomBody,
    setSurfaceZoomBody,
    surfaceZoomLevel,
    setSurfaceZoomLevel,
  };

  return (
    <SurfaceZoomContext.Provider value={value}>
      {children}
    </SurfaceZoomContext.Provider>
  );
}

export function useSurfaceZoomContext() {
  const context = useContext(SurfaceZoomContext);
  if (!context) {
    throw new Error('useSurfaceZoomContext must be used within SurfaceZoomProvider');
  }
  return context;
}