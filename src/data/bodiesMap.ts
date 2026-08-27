import { CelestialBodyData } from '@/types/orbitalElements';
import {
  MERCURY, VENUS, EARTH, MARS, JUPITER, SATURN, URANUS, NEPTUNE,
  MOON, IO, EUROPA, GANYMEDE, CALLISTO, TITAN, ENCELADUS
} from '@/data/planets';

/**
 * All celestial bodies in the simulation as a Map for quick lookup
 */
export const ALL_BODIES: CelestialBodyData[] = [
  MERCURY, VENUS, EARTH, MARS, JUPITER, SATURN, URANUS, NEPTUNE,
  MOON, IO, EUROPA, GANYMEDE, CALLISTO, TITAN, ENCELADUS
];

/**
 * Bodies Map for quick ID-based lookup
 */
export const BODIES_MAP: Map<string, CelestialBodyData> = new Map(
  ALL_BODIES.map(body => [body.id, body])
);

/**
 * Lookup a body by ID
 */
export function getBodyById(id: string): CelestialBodyData | null {
  return BODIES_MAP.get(id) ?? null;
}