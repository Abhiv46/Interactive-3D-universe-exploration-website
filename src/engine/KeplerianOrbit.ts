/**
 * Keplerian Orbital Mechanics Engine
 *
 * Solves Kepler's equation for elliptical orbits and provides
 * position/velocity calculations for celestial bodies.
 *
 * Reference: "Orbital Mechanics for Engineering Students" by Howard Curtis
 *            NASA JPL Horizons algorithm specifications
 */

import {
  OrbitalElements,
} from '@/types/orbitalElements';
import {
  SECONDS_PER_DAY,
  J2000_EPOCH,
  J2000_UNIX_TIME,
  DEG_TO_RAD,
} from './Constants';

/**
 * Normalize angle to [0, 2π)
 */
export function normalizeAngle(angle: number): number {
  const result = angle % (2 * Math.PI);
  return result < 0 ? result + 2 * Math.PI : result;
}

/**
 * Normalize angle to [-π, π)
 */
export function normalizeAngleSigned(angle: number): number {
  const result = angle % (2 * Math.PI);
  if (result <= -Math.PI) return result + 2 * Math.PI;
  if (result > Math.PI) return result - 2 * Math.PI;
  return result;
}

/**
 * Solve Kepler's Equation: M = E - e * sin(E)
 * Using Newton-Raphson iteration with Danby's initial guess
 *
 * @param meanAnomaly - Mean anomaly in radians
 * @param eccentricity - Orbital eccentricity (0 <= e < 1 for elliptical)
 * @param tolerance - Convergence tolerance (default: 1e-15)
 * @param maxIterations - Maximum iterations (default: 30)
 * @returns Eccentric anomaly in radians
 */
export function solveKeplerEquation(
  meanAnomaly: number,
  eccentricity: number,
  tolerance: number = 1e-15,
  maxIterations: number = 30
): number {
  // Handle circular orbit
  if (eccentricity < 1e-12) {
    return normalizeAngle(meanAnomaly);
  }

  // Handle near-parabolic orbits
  if (eccentricity >= 1 - 1e-12) {
    // Use parabolic approximation (Barker's equation)
    return solveBarkersEquation(meanAnomaly);
  }

  // Danby's initial guess for faster convergence
  let E = meanAnomaly + eccentricity * Math.sin(meanAnomaly) * (1 + eccentricity * Math.cos(meanAnomaly));
  let delta = 0;

  for (let i = 0; i < maxIterations; i++) {
    const sinE = Math.sin(E);
    const cosE = Math.cos(E);
    const f = E - eccentricity * sinE - meanAnomaly;
    const fp = 1 - eccentricity * cosE;
    const fpp = eccentricity * sinE;
    const fppp = eccentricity * cosE;

    // Halley's method (cubic convergence)
    delta = -f / (fp + 0.5 * delta * fpp / (1 + delta * fppp / (6 * fp)));
    E += delta;

    if (Math.abs(delta) < tolerance) {
      return normalizeAngle(E);
    }
  }

  // Fallback: Newton-Raphson
  E = meanAnomaly;
  for (let i = 0; i < maxIterations; i++) {
    const sinE = Math.sin(E);
    const cosE = Math.cos(E);
    const f = E - eccentricity * sinE - meanAnomaly;
    const fp = 1 - eccentricity * cosE;
    const delta = -f / fp;
    E += delta;
    if (Math.abs(delta) < tolerance) {
      return normalizeAngle(E);
    }
  }

  return normalizeAngle(E);
}

/**
 * Solve Barker's equation for parabolic orbits: M = D + D³/3
 * where D = tan(ν/2), ν = true anomaly
 */
function solveBarkersEquation(meanAnomaly: number): number {
  // Initial guess
  let D = Math.cbrt(3 * meanAnomaly);
  for (let i = 0; i < 10; i++) {
    const D2 = D * D;
    const f = D + D * D2 / 3 - meanAnomaly;
    const fp = 1 + D2;
    D -= f / fp;
  }
  // Convert D to eccentric anomaly equivalent
  return 2 * Math.atan(D);
}

/**
 * Solve hyperbolic Kepler's equation: M = e * sinh(H) - H
 * for eccentricity > 1
 */
export function solveHyperbolicKeplerEquation(
  meanAnomaly: number,
  eccentricity: number,
  tolerance: number = 1e-15,
  maxIterations: number = 30
): number {
  if (eccentricity <= 1) {
    return solveKeplerEquation(meanAnomaly, eccentricity, tolerance, maxIterations);
  }

  // Initial guess using asymptotic approximation
  let H = Math.log(2 * Math.abs(meanAnomaly) / eccentricity + 1.8);
  if (meanAnomaly < 0) H = -H;

  for (let i = 0; i < maxIterations; i++) {
    const sinhH = Math.sinh(H);
    const coshH = Math.cosh(H);
    const f = eccentricity * sinhH - H - meanAnomaly;
    const fp = eccentricity * coshH - 1;
    const delta = -f / fp;
    H += delta;
    if (Math.abs(delta) < tolerance) {
      return H;
    }
  }

  return H;
}

/**
 * Calculate true anomaly from eccentric anomaly
 */
export function trueAnomalyFromEccentric(eccentricAnomaly: number, eccentricity: number): number {
  if (eccentricity < 1) {
    // Elliptical
    const sinE = Math.sin(eccentricAnomaly);
    const cosE = Math.cos(eccentricAnomaly);
    const sinNu = (Math.sqrt(1 - eccentricity * eccentricity) * sinE) / (1 - eccentricity * cosE);
    const cosNu = (cosE - eccentricity) / (1 - eccentricity * cosE);
    return Math.atan2(sinNu, cosNu);
  } else {
    // Hyperbolic
    const sinhH = Math.sinh(eccentricAnomaly);
    const coshH = Math.cosh(eccentricAnomaly);
    const sinNu = (Math.sqrt(eccentricity * eccentricity - 1) * sinhH) / (eccentricity * coshH - 1);
    const cosNu = (coshH - eccentricity) / (eccentricity * coshH - 1);
    return Math.atan2(sinNu, cosNu);
  }
}

/**
 * Calculate mean anomaly at given time
 */
export function meanAnomalyAtTime(
  elements: OrbitalElements,
  timeJD: number
): number {
  const n = 2 * Math.PI / elements.orbitalPeriod; // Mean motion (rad/s)
  const dt = (timeJD - elements.epoch) * SECONDS_PER_DAY; // Time since epoch in seconds
  return normalizeAngle(elements.meanAnomalyAtEpoch + n * dt);
}

/**
 * Calculate position in orbital plane (perifocal coordinates)
 * Returns [x, y, z] in meters
 */
export function positionInOrbitalPlane(
  elements: OrbitalElements,
  eccentricAnomaly: number
): [number, number, number] {
  const a = elements.semiMajorAxis;
  const e = elements.eccentricity;

  if (e < 1) {
    // Elliptical orbit
    const cosE = Math.cos(eccentricAnomaly);
    const sinE = Math.sin(eccentricAnomaly);
    const r = a * (1 - e * cosE);
    const x = r * cosE;
    const y = r * sinE * Math.sqrt(1 - e * e);
    return [x, y, 0];
  } else {
    // Hyperbolic orbit
    const coshH = Math.cosh(eccentricAnomaly);
    const sinhH = Math.sinh(eccentricAnomaly);
    const r = a * (1 - e * coshH);
    const x = r * coshH;
    const y = r * sinhH * Math.sqrt(e * e - 1);
    return [x, y, 0];
  }
}

/**
 * Calculate velocity in orbital plane (perifocal coordinates)
 * Returns [vx, vy, vz] in m/s
 */
export function velocityInOrbitalPlane(
  elements: OrbitalElements,
  eccentricAnomaly: number
): [number, number, number] {
  const a = elements.semiMajorAxis;
  const e = elements.eccentricity;
  const mu = elements.gravitationalParameter;

  if (e < 1) {
    // Elliptical orbit
    const n = Math.sqrt(mu / (a * a * a)); // Mean motion
    const cosE = Math.cos(eccentricAnomaly);
    const sinE = Math.sin(eccentricAnomaly);
    const r = a * (1 - e * cosE);
    const factor = a * n / r;
    const vx = -factor * a * sinE;
    const vy = factor * a * Math.sqrt(1 - e * e) * cosE;
    return [vx, vy, 0];
  } else {
    // Hyperbolic orbit
    const n = Math.sqrt(mu / (-a * a * a)); // Mean motion for hyperbolic
    const coshH = Math.cosh(eccentricAnomaly);
    const sinhH = Math.sinh(eccentricAnomaly);
    const r = a * (1 - e * coshH);
    const factor = -a * n / r;
    const vx = factor * a * sinhH;
    const vy = factor * a * Math.sqrt(e * e - 1) * coshH;
    return [vx, vy, 0];
  }
}

/**
 * Rotation matrix from perifocal to ecliptic coordinates
 * Using orbital elements: Ω (LAN), i (inclination), ω (arg of periapsis)
 */
export function perifocalToEclipticMatrix(
  longitudeOfAscendingNode: number,
  inclination: number,
  argumentOfPeriapsis: number
): number[][] {
  const cosOmega = Math.cos(longitudeOfAscendingNode);
  const sinOmega = Math.sin(longitudeOfAscendingNode);
  const cosI = Math.cos(inclination);
  const sinI = Math.sin(inclination);
  const cosOmega2 = Math.cos(argumentOfPeriapsis);
  const sinOmega2 = Math.sin(argumentOfPeriapsis);

  // R3(-Ω) * R1(-i) * R3(-ω) = combined rotation
  // This transforms from perifocal (PQW) to ecliptic (XYZ)
  return [
    [
      cosOmega * cosOmega2 - sinOmega * sinOmega2 * cosI,
      -cosOmega * sinOmega2 - sinOmega * cosOmega2 * cosI,
      sinOmega * sinI,
    ],
    [
      sinOmega * cosOmega2 + cosOmega * sinOmega2 * cosI,
      -sinOmega * sinOmega2 + cosOmega * cosOmega2 * cosI,
      -cosOmega * sinI,
    ],
    [
      sinOmega2 * sinI,
      cosOmega2 * sinI,
      cosI,
    ],
  ];
}

/**
 * Apply rotation matrix to vector
 */
export function applyMatrix(matrix: number[][], vec: [number, number, number]): [number, number, number] {
  return [
    matrix[0][0] * vec[0] + matrix[0][1] * vec[1] + matrix[0][2] * vec[2],
    matrix[1][0] * vec[0] + matrix[1][1] * vec[1] + matrix[1][2] * vec[2],
    matrix[2][0] * vec[0] + matrix[2][1] * vec[1] + matrix[2][2] * vec[2],
  ];
}

/**
 * Calculate full state vector (position + velocity) in ecliptic coordinates
 * @param elements - Orbital elements
 * @param timeJD - Time in Julian Date
 * @returns { position: [x,y,z], velocity: [vx,vy,vz] } in meters and m/s (ecliptic J2000)
 */
export function calculateStateVector(
  elements: OrbitalElements,
  timeJD: number
): { position: [number, number, number]; velocity: [number, number, number] } {
  // Mean anomaly at time
  const M = meanAnomalyAtTime(elements, timeJD);

  // Solve Kepler's equation for eccentric anomaly
  let E: number;
  if (elements.eccentricity < 1) {
    E = solveKeplerEquation(M, elements.eccentricity);
  } else {
    E = solveHyperbolicKeplerEquation(M, elements.eccentricity);
  }

  // Position and velocity in perifocal frame
  const posPQW = positionInOrbitalPlane(elements, E);
  const velPQW = velocityInOrbitalPlane(elements, E);

  // Rotation to ecliptic
  const matrix = perifocalToEclipticMatrix(
    elements.longitudeOfAscendingNode,
    elements.inclination,
    elements.argumentOfPeriapsis
  );

  const position = applyMatrix(matrix, posPQW);
  const velocity = applyMatrix(matrix, velPQW);

  return { position, velocity };
}

/**
 * Calculate position only (for rendering optimization)
 */
export function calculatePosition(
  elements: OrbitalElements,
  timeJD: number
): [number, number, number] {
  const M = meanAnomalyAtTime(elements, timeJD);
  let E: number;
  if (elements.eccentricity < 1) {
    E = solveKeplerEquation(M, elements.eccentricity);
  } else {
    E = solveHyperbolicKeplerEquation(M, elements.eccentricity);
  }
  const posPQW = positionInOrbitalPlane(elements, E);
  const matrix = perifocalToEclipticMatrix(
    elements.longitudeOfAscendingNode,
    elements.inclination,
    elements.argumentOfPeriapsis
  );
  return applyMatrix(matrix, posPQW);
}

/**
 * Calculate orbital period from semi-major axis and gravitational parameter
 */
export function calculateOrbitalPeriod(semiMajorAxis: number, gravitationalParameter: number): number {
  return 2 * Math.PI * Math.sqrt(semiMajorAxis ** 3 / gravitationalParameter);
}

/**
 * Calculate semi-major axis from orbital period and gravitational parameter
 */
export function calculateSemiMajorAxis(orbitalPeriod: number, gravitationalParameter: number): number {
  return Math.pow(gravitationalParameter * orbitalPeriod ** 2 / (4 * Math.PI ** 2), 1/3);
}

/**
 * Generate orbit path points for visualization
 * @param elements - Orbital elements
 * @param _timeJD - Reference time (for line of nodes orientation) (unused)
 * @param numPoints - Number of points to generate
 * @returns Array of [x, y, z] points in ecliptic coordinates
 */
export function generateOrbitPath(
  elements: OrbitalElements,
  _timeJD: number = J2000_EPOCH,
  numPoints: number = 360
): [number, number, number][] {
  const points: [number, number, number][] = [];
  const matrix = perifocalToEclipticMatrix(
    elements.longitudeOfAscendingNode,
    elements.inclination,
    elements.argumentOfPeriapsis
  );

  if (elements.eccentricity < 1) {
    // Elliptical orbit - sample true anomaly
    for (let i = 0; i <= numPoints; i++) {
      const nu = (2 * Math.PI * i) / numPoints;
      const cosNu = Math.cos(nu);
      const sinNu = Math.sin(nu);
      const r = elements.semiMajorAxis * (1 - elements.eccentricity ** 2) / (1 + elements.eccentricity * cosNu);
      const posPQW: [number, number, number] = [r * cosNu, r * sinNu, 0];
      points.push(applyMatrix(matrix, posPQW));
    }
  } else {
    // Hyperbolic orbit - sample hyperbolic anomaly
    const maxH = 5; // Arbitrary limit for visualization
    for (let i = 0; i <= numPoints; i++) {
      const H = -maxH + (2 * maxH * i) / numPoints;
      const coshH = Math.cosh(H);
      const sinhH = Math.sinh(H);
      const r = elements.semiMajorAxis * (1 - elements.eccentricity * coshH);
      if (r > 0) {
        const posPQW: [number, number, number] = [r * coshH, r * sinhH * Math.sqrt(elements.eccentricity ** 2 - 1), 0];
        points.push(applyMatrix(matrix, posPQW));
      }
    }
  }

  return points;
}

/**
 * Convert ecliptic coordinates to equatorial (J2000)
 * Obliquity of ecliptic at J2000: 23.4392911 degrees
 */
const OBLIQUITY_J2000 = 23.4392911 * DEG_TO_RAD;

export function eclipticToEquatorial(pos: [number, number, number]): [number, number, number] {
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
 * Convert equatorial to ecliptic coordinates
 */
export function equatorialToEcliptic(pos: [number, number, number]): [number, number, number] {
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
 * Convert Cartesian to spherical coordinates
 * Returns [radius, RA (rad), Dec (rad)]
 */
export function cartesianToSpherical(pos: [number, number, number]): [number, number, number] {
  const [x, y, z] = pos;
  const r = Math.sqrt(x * x + y * y + z * z);
  const ra = Math.atan2(y, x);
  const dec = Math.asin(z / r);
  return [r, normalizeAngle(ra), dec];
}

/**
 * Convert spherical to Cartesian coordinates
 */
export function sphericalToCartesian(r: number, ra: number, dec: number): [number, number, number] {
  const cosDec = Math.cos(dec);
  return [
    r * cosDec * Math.cos(ra),
    r * cosDec * Math.sin(ra),
    r * Math.sin(dec),
  ];
}

/**
 * Calculate angular separation between two directions
 */
export function angularSeparation(ra1: number, dec1: number, ra2: number, dec2: number): number {
  const sinDec1 = Math.sin(dec1);
  const sinDec2 = Math.sin(dec2);
  const cosDec1 = Math.cos(dec1);
  const cosDec2 = Math.cos(dec2);
  const cosDra = Math.cos(ra2 - ra1);
  return Math.acos(Math.min(1, Math.max(-1, sinDec1 * sinDec2 + cosDec1 * cosDec2 * cosDra)));
}

/**
 * Julian Date from Date object
 */
export function dateToJD(date: Date): number {
  const time = date.getTime();
  const daysSinceJ2000 = (time - J2000_UNIX_TIME) / (SECONDS_PER_DAY * 1000);
  return J2000_EPOCH + daysSinceJ2000;
}

/**
 * Date from Julian Date
 */
export function jdToDate(jd: number): Date {
  const daysSinceJ2000 = jd - J2000_EPOCH;
  const msSinceJ2000 = daysSinceJ2000 * SECONDS_PER_DAY * 1000;
  return new Date(J2000_UNIX_TIME + msSinceJ2000);
}

/**
 * Format Julian Date as ISO string
 */
export function jdToISOString(jd: number): string {
  return jdToDate(jd).toISOString();
}

/**
 * Calculate illumination phase angle (Sun-Target-Observer)
 * Returns phase angle in radians (0 = full, π = new)
 */
export function calculatePhaseAngle(
  sunPos: [number, number, number],
  targetPos: [number, number, number],
  observerPos: [number, number, number]
): number {
  // Vector from target to sun
  const toSun = [
    sunPos[0] - targetPos[0],
    sunPos[1] - targetPos[1],
    sunPos[2] - targetPos[2],
  ];
  // Vector from target to observer
  const toObs = [
    observerPos[0] - targetPos[0],
    observerPos[1] - targetPos[1],
    observerPos[2] - targetPos[2],
  ];

  const dot = toSun[0] * toObs[0] + toSun[1] * toObs[1] + toSun[2] * toObs[2];
  const normSun = Math.sqrt(toSun[0]**2 + toSun[1]**2 + toSun[2]**2);
  const normObs = Math.sqrt(toObs[0]**2 + toObs[1]**2 + toObs[2]**2);

  return Math.acos(Math.max(-1, Math.min(1, dot / (normSun * normObs))));
}

/**
 * Calculate illuminated fraction (0-1)
 */
export function illuminatedFraction(phaseAngle: number): number {
  return (1 + Math.cos(phaseAngle)) / 2;
}

/**
 * Get orbital speed at current position
 */
export function orbitalSpeed(elements: OrbitalElements, distance: number): number {
  const mu = elements.gravitationalParameter;
  const a = elements.semiMajorAxis;
  // Vis-viva equation
  return Math.sqrt(mu * (2 / distance - 1 / a));
}

/**
 * Precompute orbital elements for a body for performance
 */
export interface PrecomputedOrbit {
  elements: OrbitalElements;
  matrix: number[][];
  meanMotion: number;
  period: number;
  semiLatusRectum: number;
}

export function precomputeOrbit(elements: OrbitalElements): PrecomputedOrbit {
  return {
    elements,
    matrix: perifocalToEclipticMatrix(
      elements.longitudeOfAscendingNode,
      elements.inclination,
      elements.argumentOfPeriapsis
    ),
    meanMotion: 2 * Math.PI / elements.orbitalPeriod,
    period: elements.orbitalPeriod,
    semiLatusRectum: elements.semiMajorAxis * (1 - elements.eccentricity ** 2),
  };
}

/**
 * Fast position calculation using precomputed orbit
 */
export function fastPosition(precomputed: PrecomputedOrbit, timeJD: number): [number, number, number] {
  const { elements, matrix, meanMotion } = precomputed;
  const dt = (timeJD - elements.epoch) * SECONDS_PER_DAY;
  const M = normalizeAngle(elements.meanAnomalyAtEpoch + meanMotion * dt);

  let E: number;
  if (elements.eccentricity < 1) {
    E = solveKeplerEquation(M, elements.eccentricity);
    const cosE = Math.cos(E);
    const sinE = Math.sin(E);
    const r = elements.semiMajorAxis * (1 - elements.eccentricity * cosE);
    const posPQW: [number, number, number] = [r * cosE, r * sinE * Math.sqrt(1 - elements.eccentricity ** 2), 0];
    return applyMatrix(matrix, posPQW);
  } else {
    E = solveHyperbolicKeplerEquation(M, elements.eccentricity);
    const coshH = Math.cosh(E);
    const sinhH = Math.sinh(E);
    const r = elements.semiMajorAxis * (1 - elements.eccentricity * coshH);
    const posPQW: [number, number, number] = [
      r * coshH,
      r * sinhH * Math.sqrt(elements.eccentricity ** 2 - 1),
      0
    ];
    return applyMatrix(matrix, posPQW);
  }
}