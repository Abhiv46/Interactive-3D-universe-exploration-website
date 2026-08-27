import { useMemo } from 'react';
import { OrbitalElements } from '@/types/orbitalElements';
import {
  calculatePosition,
  precomputeOrbit,
  fastPosition,
  generateOrbitPath,
  type PrecomputedOrbit,
} from '@/engine/KeplerianOrbit';
import { AU } from '@/engine/Constants';

/**
 * Hook to calculate position from Keplerian orbital elements at a given time
 * Uses the existing Keplerian orbital mechanics engine
 *
 * @param elements - Orbital elements for the body
 * @param timeJD - Current simulation time in Julian Date
 * @returns Position in ecliptic coordinates [x, y, z] in meters
 */
export function useKeplerianOrbit(
  elements: OrbitalElements | null,
  timeJD: number
): [number, number, number] {
  const precomputed = useMemo(() => {
    if (!elements) return null;
    return precomputeOrbit(elements);
  }, [elements]);

  const position = useMemo(() => {
    if (!precomputed) return [0, 0, 0] as [number, number, number];
    return fastPosition(precomputed, timeJD);
  }, [precomputed, timeJD]);

  return position;
}

/**
 * Generate orbit path points for visualization
 */
export function useOrbitPath(
  elements: OrbitalElements | null,
  numPoints: number = 360
): [number, number, number][] {
  return useMemo(() => {
    if (!elements) return [];
    return generateOrbitPath(elements, elements.epoch, numPoints);
  }, [elements, numPoints]);
}

/**
 * Convert meters to AU for display
 */
export function metersToAU(meters: number): number {
  return meters / AU;
}

/**
 * Convert AU to meters
 */
export function AUToMeters(au: number): number {
  return au * AU;
}