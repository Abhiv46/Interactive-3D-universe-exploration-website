/**
 * Engine Exports
 * Core simulation engine modules
 */

export * from './Constants';
export * from './KeplerianOrbit';
export * from './SimulationClock';
// ReferenceFrame re-exports coordinate transforms, avoiding duplicates from KeplerianOrbit
export type {
  ObserverLocation,
  HorizontalCoordinates,
  CoordinateTransformOptions,
} from './ReferenceFrame';
export {
  // Coordinate transformations
  eclipticToEquatorial,
  equatorialToEcliptic,
  equatorialToGalactic,
  galacticToEquatorial,
  eclipticToGalactic,
  galacticToEcliptic,
  cartesianToEquatorial,
  equatorialToCartesian,
  cartesianToGalactic,
  galacticToCartesian,
  radecToEcliptic,
  galacticToEclipticDeg,
  // Horizontal coordinates
  equatorialToHorizontal,
  // Precession/Nutation/Aberration
  precessEquatorial,
  nutationCorrection,
  aberrationCorrection,
  transformCoordinates,
  // Formatting
  formatRA,
  formatDec,
  formatGalactic,
  // Spherical math
  sphericalDistance,
  slerp,
  normalizeAngle,
} from './ReferenceFrame';