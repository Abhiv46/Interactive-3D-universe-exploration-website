/**
 * Reference Frame Transformations
 * Handles coordinate conversions between:
 * - Ecliptic (J2000) - Solar system orbital plane
 * - Equatorial (J2000) - Earth's equator projection (RA/Dec)
 * - Galactic - Milky Way plane
 * - Horizontal (Alt/Az) - Observer's local sky
 * - Perifocal - Orbital plane of specific body
 */

import { DEG_TO_RAD, RAD_TO_DEG, J2000_EPOCH } from './Constants';

// Obliquity of ecliptic at J2000
const OBLIQUITY_J2000 = 23.4392911 * DEG_TO_RAD;

// Arcsecond to radian conversion
const ARCSEC_TO_RAD = DEG_TO_RAD / 3600;

// Galactic coordinate constants (J2000)
// Galactic north pole: RA = 192.85948°, Dec = 27.12825°
// Galactic center: l=0°, b=0° at RA = 266.4051°, Dec = -28.936175°
const GALACTIC_NORTH_RA = 192.85948 * DEG_TO_RAD;
const GALACTIC_NORTH_DEC = 27.12825 * DEG_TO_RAD;
const GALACTIC_CENTER_RA = 266.4051 * DEG_TO_RAD;

// Precomputed rotation matrix: Equatorial -> Galactic
// Using standard IAU 1958 definition
const EQUATORIAL_TO_GALACTIC_MATRIX: number[][] = [
  [-0.0548755604, -0.8734370902, -0.4838350155],
  [ 0.4941094279, -0.4448296300,  0.7469822445],
  [-0.8676661490, -0.1980763734,  0.4559837762],
];

/**
 * Multiply 3x3 matrix by 3-vector
 */
function mat3Vec3(mat: number[][], vec: [number, number, number]): [number, number, number] {
  return [
    mat[0][0] * vec[0] + mat[0][1] * vec[1] + mat[0][2] * vec[2],
    mat[1][0] * vec[0] + mat[1][1] * vec[1] + mat[1][2] * vec[2],
    mat[2][0] * vec[0] + mat[2][1] * vec[1] + mat[2][2] * vec[2],
  ];
}

/**
 * Transpose 3x3 matrix
 */
function transpose3(mat: number[][]): number[][] {
  return [
    [mat[0][0], mat[1][0], mat[2][0]],
    [mat[0][1], mat[1][1], mat[2][1]],
    [mat[0][2], mat[1][2], mat[2][2]],
  ];
}

// Galactic to Equatorial (transpose of above)
const GALACTIC_TO_EQUATORIAL_MATRIX = transpose3(EQUATORIAL_TO_GALACTIC_MATRIX);

/**
 * Convert Ecliptic (J2000) to Equatorial (J2000)
 */
export function eclipticToEquatorial(
  pos: [number, number, number]
): [number, number, number] {
  const [x, y, z] = pos;
  const cosEps = Math.cos(OBLIQUITY_J2000);
  const sinEps = Math.sin(OBLIQUITY_J2000);
  return [
    x,
    y * cosEps - z * sinEps,
    y * sinEps + z * cosEps,
  ];
}

/**
 * Convert Equatorial (J2000) to Ecliptic (J2000)
 */
export function equatorialToEcliptic(
  pos: [number, number, number]
): [number, number, number] {
  const [x, y, z] = pos;
  const cosEps = Math.cos(OBLIQUITY_J2000);
  const sinEps = Math.sin(OBLIQUITY_J2000);
  return [
    x,
    y * cosEps + z * sinEps,
    -y * sinEps + z * cosEps,
  ];
}

/**
 * Convert Equatorial (J2000) to Galactic
 */
export function equatorialToGalactic(
  pos: [number, number, number]
): [number, number, number] {
  return mat3Vec3(EQUATORIAL_TO_GALACTIC_MATRIX, pos);
}

/**
 * Convert Galactic to Equatorial (J2000)
 */
export function galacticToEquatorial(
  pos: [number, number, number]
): [number, number, number] {
  return mat3Vec3(GALACTIC_TO_EQUATORIAL_MATRIX, pos);
}

/**
 * Convert Ecliptic to Galactic
 */
export function eclipticToGalactic(
  pos: [number, number, number]
): [number, number, number] {
  const equatorial = eclipticToEquatorial(pos);
  return equatorialToGalactic(equatorial);
}

/**
 * Convert Galactic to Ecliptic
 */
export function galacticToEcliptic(
  pos: [number, number, number]
): [number, number, number] {
  const equatorial = galacticToEquatorial(pos);
  return equatorialToEcliptic(equatorial);
}

/**
 * Convert Cartesian to Spherical (Equatorial)
 * Returns [distance, RA (radians), Dec (radians)]
 */
export function cartesianToEquatorial(
  pos: [number, number, number]
): [number, number, number] {
  const [x, y, z] = pos;
  const distance = Math.sqrt(x * x + y * y + z * z);
  const ra = Math.atan2(y, x);
  const dec = Math.asin(z / distance);
  return [distance, ra < 0 ? ra + 2 * Math.PI : ra, dec];
}

/**
 * Convert Spherical (Equatorial) to Cartesian
 */
export function equatorialToCartesian(
  distance: number,
  ra: number,
  dec: number
): [number, number, number] {
  const cosDec = Math.cos(dec);
  return [
    distance * cosDec * Math.cos(ra),
    distance * cosDec * Math.sin(ra),
    distance * Math.sin(dec),
  ];
}

/**
 * Convert Cartesian to Spherical (Galactic)
 * Returns [distance, l (radians), b (radians)]
 */
export function cartesianToGalactic(
  pos: [number, number, number]
): [number, number, number] {
  const equatorial = eclipticToEquatorial(pos);
  const galactic = equatorialToGalactic(equatorial);
  return cartesianToEquatorial(galactic); // Same math, different interpretation
}

/**
 * Convert Spherical (Galactic) to Cartesian
 */
export function galacticToCartesian(
  distance: number,
  l: number,
  b: number
): [number, number, number] {
  const cosB = Math.cos(b);
  const x = distance * cosB * Math.cos(l);
  const y = distance * cosB * Math.sin(l);
  const z = distance * Math.sin(b);
  const equatorial = galacticToEquatorial([x, y, z]);
  return equatorialToEcliptic(equatorial);
}

/**
 * Convert RA/Dec (degrees) to Cartesian (Ecliptic)
 */
export function radecToEcliptic(
  raDeg: number,
  decDeg: number,
  distance: number = 1
): [number, number, number] {
  const ra = raDeg * DEG_TO_RAD;
  const dec = decDeg * DEG_TO_RAD;
  const equatorial = equatorialToCartesian(distance, ra, dec);
  return equatorialToEcliptic(equatorial);
}

/**
 * Convert Galactic l/b (degrees) to Cartesian (Ecliptic)
 */
export function galacticToEclipticDeg(
  lDeg: number,
  bDeg: number,
  distance: number = 1
): [number, number, number] {
  const l = lDeg * DEG_TO_RAD;
  const b = bDeg * DEG_TO_RAD;
  return galacticToCartesian(distance, l, b);
}

/**
 * Calculate position of object in Horizontal coordinates (Alt/Az)
 * for a given observer location and time
 */
export interface ObserverLocation {
  latitude: number;  // radians, positive north
  longitude: number; // radians, positive east
  elevation: number; // meters
}

export interface HorizontalCoordinates {
  altitude: number;  // radians, -π/2 to π/2
  azimuth: number;   // radians, 0 to 2π (0 = North)
  distance: number;  // meters
}

/**
 * Convert Equatorial to Horizontal (Alt/Az) for observer
 */
export function equatorialToHorizontal(
  equatorialPos: [number, number, number],
  observer: ObserverLocation,
  jd: number
): HorizontalCoordinates {
  // Convert equatorial to RA/Dec
  const [distance, ra, dec] = cartesianToEquatorial(equatorialPos);

  // Calculate Local Sidereal Time (LST)
  // Greenwich Mean Sidereal Time at 0h UT
  const t = (jd - J2000_EPOCH) / 36525; // Julian centuries since J2000
  let gmst = 280.46061837 + 360.98564736629 * (jd - J2000_EPOCH) +
    0.000387933 * t * t - t * t * t / 38710000;
  gmst = (gmst % 360) * DEG_TO_RAD;
  if (gmst < 0) gmst += 2 * Math.PI;

  // Local Sidereal Time
  const lst = gmst + observer.longitude;

  // Hour angle
  const ha = lst - ra;

  // Convert to Alt/Az
  const sinDec = Math.sin(dec);
  const cosDec = Math.cos(dec);
  const sinLat = Math.sin(observer.latitude);
  const cosLat = Math.cos(observer.latitude);
  const cosHa = Math.cos(ha);
  const sinHa = Math.sin(ha);

  // Altitude
  const sinAlt = sinLat * sinDec + cosLat * cosDec * cosHa;
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

  // Azimuth (measured from North, positive East)
  const cosAlt = Math.cos(altitude);
  let azimuth = Math.atan2(
    -sinHa * cosDec,
    cosLat * sinDec - sinLat * cosDec * cosHa
  );
  if (azimuth < 0) azimuth += 2 * Math.PI;

  return { altitude, azimuth, distance };
}

/**
 * Precession correction from J2000 to date
 * Approximate - for high precision use SOFA/IAU models
 */
export function precessEquatorial(
  ra: number,
  dec: number,
  fromJD: number,
  toJD: number
): [number, number] {
  const T = (toJD - J2000_EPOCH) / 36525;
  const T0 = (fromJD - J2000_EPOCH) / 36525;

  // Precession angles in arcseconds
  const zeta = ((2306.2181 + 1.39656 * T0 - 0.000139 * T0 * T0) * (T - T0) +
    (0.30188 - 0.000344 * T0) * (T - T0) * (T - T0) +
    0.017998 * (T - T0) * (T - T0) * (T - T0)) * ARCSEC_TO_RAD;

  const z = ((2306.2181 + 1.39656 * T0 - 0.000139 * T0 * T0) * (T - T0) +
    (1.09468 + 0.000066 * T0) * (T - T0) * (T - T0) +
    0.018203 * (T - T0) * (T - T0) * (T - T0)) * ARCSEC_TO_RAD;

  const theta = ((2004.3109 - 0.85330 * T0 - 0.000217 * T0 * T0) * (T - T0) -
    (0.42665 + 0.000217 * T0) * (T - T0) * (T - T0) -
    0.041833 * (T - T0) * (T - T0) * (T - T0)) * ARCSEC_TO_RAD;

  // Apply precession rotation
  const sinDec = Math.sin(dec);
  const cosDec = Math.cos(dec);
  const sinRa = Math.sin(ra);
  const cosRa = Math.cos(ra);

  // Simplified - full implementation would use rotation matrices
  // This is approximate for visualization purposes
  const deltaRa = (zeta + z) * cosDec + theta * sinDec * sinRa;
  const deltaDec = theta * cosRa;

  return [normalizeAngle(ra + deltaRa), dec + deltaDec];
}

/**
 * Nutation correction (simplified)
 */
export function nutationCorrection(jd: number): { deltaPsi: number; deltaEps: number } {
  const T = (jd - J2000_EPOCH) / 36525;

  // Mean elongation of Moon from Sun
  const D = (297.85036 + 445267.11148 * T - 0.0019142 * T * T + T * T * T / 189474) * DEG_TO_RAD;
  // Mean anomaly of Sun
  const M = (357.52772 + 35999.05034 * T - 0.0001603 * T * T - T * T * T / 300000) * DEG_TO_RAD;
  // Mean anomaly of Moon
  const Mp = (134.96298 + 477198.867398 * T + 0.0086972 * T * T + T * T * T / 56250) * DEG_TO_RAD;
  // Moon's argument of latitude
  const F = (93.27191 + 483202.017538 * T - 0.0036825 * T * T + T * T * T / 327270) * DEG_TO_RAD;
  // Longitude of Moon's ascending node
  const Omega = (125.04452 - 1934.136261 * T + 0.0020708 * T * T + T * T * T / 450000) * DEG_TO_RAD;

  // Nutation in longitude (arcseconds)
  const deltaPsi = (-17.2 * Math.sin(Omega) - 1.32 * Math.sin(2 * F) - 0.23 * Math.sin(2 * D) + 0.21 * Math.sin(2 * Omega)) * ARCSEC_TO_RAD;
  // Nutation in obliquity (arcseconds)
  const deltaEps = (9.2 * Math.cos(Omega) + 0.57 * Math.cos(2 * F) + 0.1 * Math.cos(2 * D) - 0.09 * Math.cos(2 * Omega)) * ARCSEC_TO_RAD;

  return { deltaPsi, deltaEps };
}

/**
 * Aberration correction (simplified)
 */
export function aberrationCorrection(
  _ra: number,
  _dec: number,
  _observerVelocity: [number, number, number]
): [number, number] {
  // Simplified stellar aberration - full implementation requires proper vector transformation
  return [_ra, _dec];
}

/**
 * Convert between coordinate systems with full corrections
 */
export interface CoordinateTransformOptions {
  applyPrecession?: boolean;
  applyNutation?: boolean;
  applyAberration?: boolean;
  observerVelocity?: [number, number, number];
}

export function transformCoordinates(
  pos: [number, number, number],
  from: 'ecliptic' | 'equatorial' | 'galactic',
  to: 'ecliptic' | 'equatorial' | 'galactic',
  jd: number = J2000_EPOCH,
  options: CoordinateTransformOptions = {}
): [number, number, number] {
  let result = pos;

  // Convert to equatorial as intermediate
  let equatorial: [number, number, number];
  switch (from) {
    case 'ecliptic':
      equatorial = eclipticToEquatorial(pos);
      break;
    case 'equatorial':
      equatorial = pos;
      break;
    case 'galactic':
      equatorial = galacticToEquatorial(pos);
      break;
  }

  // Apply corrections
  if (options.applyPrecession || options.applyNutation) {
    const [ra, dec] = cartesianToEquatorial(equatorial);
    let correctedRa = ra;
    let correctedDec = dec;

    if (options.applyPrecession) {
      const [pRa, pDec] = precessEquatorial(ra, dec, J2000_EPOCH, jd);
      correctedRa = pRa;
      correctedDec = pDec;
    }

    if (options.applyNutation) {
      const { deltaPsi, deltaEps } = nutationCorrection(jd);
      correctedRa += deltaPsi * Math.cos(correctedDec);
      correctedDec += deltaEps;
    }

    if (options.applyAberration && options.observerVelocity) {
      const [aRa, aDec] = aberrationCorrection(correctedRa, correctedDec, options.observerVelocity);
      correctedRa = aRa;
      correctedDec = aDec;
    }

    equatorial = equatorialToCartesian(
      Math.sqrt(pos[0]**2 + pos[1]**2 + pos[2]**2),
      correctedRa,
      correctedDec
    );
  }

  // Convert to target frame
  switch (to) {
    case 'ecliptic':
      result = equatorialToEcliptic(equatorial);
      break;
    case 'equatorial':
      result = equatorial;
      break;
    case 'galactic':
      result = equatorialToGalactic(equatorial);
      break;
  }

  return result;
}

/**
 * Format RA as HH:MM:SS
 */
export function formatRA(raRad: number): string {
  const raDeg = raRad * RAD_TO_DEG;
  const hours = raDeg / 15;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = ((hours - h - m / 60) * 3600).toFixed(1);
  return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.padStart(4, '0')}s`;
}

/**
 * Format Dec as ±DD:MM:SS
 */
export function formatDec(decRad: number): string {
  const decDeg = decRad * RAD_TO_DEG;
  const sign = decDeg >= 0 ? '+' : '-';
  const absDeg = Math.abs(decDeg);
  const d = Math.floor(absDeg);
  const m = Math.floor((absDeg - d) * 60);
  const s = ((absDeg - d - m / 60) * 3600).toFixed(1);
  return `${sign}${d.toString().padStart(2, '0')}° ${m.toString().padStart(2, '0')}′ ${s.padStart(4, '0')}″`;
}

/**
 * Format Galactic coordinates as l° b°
 */
export function formatGalactic(lRad: number, bRad: number): string {
  const lDeg = lRad * RAD_TO_DEG;
  const bDeg = bRad * RAD_TO_DEG;
  return `l=${lDeg.toFixed(2)}° b=${bDeg.toFixed(2)}°`;
}

/**
 * Calculate great circle distance between two points on unit sphere
 */
export function sphericalDistance(
  ra1: number, dec1: number,
  ra2: number, dec2: number
): number {
  const sinDec1 = Math.sin(dec1);
  const sinDec2 = Math.sin(dec2);
  const cosDec1 = Math.cos(dec1);
  const cosDec2 = Math.cos(dec2);
  const cosDra = Math.cos(ra2 - ra1);
  return Math.acos(Math.max(-1, Math.min(1, sinDec1 * sinDec2 + cosDec1 * cosDec2 * cosDra)));
}

/**
 * Interpolate between two spherical coordinates (slerp)
 */
export function slerp(
  ra1: number, dec1: number,
  ra2: number, dec2: number,
  t: number
): [number, number] {
  const cosAngle = Math.sin(dec1) * Math.sin(dec2) + Math.cos(dec1) * Math.cos(dec2) * Math.cos(ra2 - ra1);
  const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));

  if (angle < 1e-10) return [ra1, dec1];

  const sinAngle = Math.sin(angle);
  const a = Math.sin((1 - t) * angle) / sinAngle;
  const b = Math.sin(t * angle) / sinAngle;

  const x = a * Math.cos(dec1) * Math.cos(ra1) + b * Math.cos(dec2) * Math.cos(ra2);
  const y = a * Math.cos(dec1) * Math.sin(ra1) + b * Math.cos(dec2) * Math.sin(ra2);
  const z = a * Math.sin(dec1) + b * Math.sin(dec2);

  const ra = Math.atan2(y, x);
  const dec = Math.atan2(z, Math.sqrt(x * x + y * y));

  return [ra < 0 ? ra + 2 * Math.PI : ra, dec];
}

/**
 * Normalize angle to [0, 2π)
 */
export function normalizeAngle(angle: number): number {
  const result = angle % (2 * Math.PI);
  return result < 0 ? result + 2 * Math.PI : result;
}