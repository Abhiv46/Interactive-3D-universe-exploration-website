// Coordinate transformation utilities
// Handles conversions between ecliptic, equatorial, galactic, and horizontal coordinate systems

import * as THREE from 'three';
import {
  PI,
  TAU,
  DEG_TO_RAD,
  RAD_TO_DEG,
  normalizeAngle,
  dateToJD,
  jdToDate,
} from './math';

export interface EquatorialCoords {
  ra: number;    // Right ascension in radians (0 to 2π)
  dec: number;   // Declination in radians (-π/2 to π/2)
  distance?: number; // Distance in meters
}

export interface EclipticCoords {
  lon: number;   // Ecliptic longitude in radians (0 to 2π)
  lat: number;   // Ecliptic latitude in radians (-π/2 to π/2)
  distance?: number;
}

export interface GalacticCoords {
  l: number;     // Galactic longitude in radians (0 to 2π)
  b: number;     // Galactic latitude in radians (-π/2 to π/2)
  distance?: number;
}

export interface HorizontalCoords {
  az: number;    // Azimuth in radians (0 to 2π, North=0)
  alt: number;   // Altitude in radians (-π/2 to π/2)
  distance?: number;
}

export interface CartesianCoords {
  x: number;
  y: number;
  z: number;
}

// Obliquity of the ecliptic (J2000.0)
const OBLIQUITY_J2000 = 23.439281 * DEG_TO_RAD; // ~0.4090928 rad

// Galactic pole in J2000 equatorial coordinates (IAU 1958)
// North Galactic Pole: RA = 12h 51m 26.282s, Dec = +27° 07' 42.01"
const GALACTIC_POLE_RA = (12 + 51/60 + 26.282/3600) * 15 * DEG_TO_RAD;
const GALACTIC_POLE_DEC = (27 + 7/60 + 42.01/3600) * DEG_TO_RAD;
// Galactic center: RA = 17h 45m 37.224s, Dec = -28° 56' 10.23"
const GALACTIC_CENTER_RA = (17 + 45/60 + 37.224/3600) * 15 * DEG_TO_RAD;
const GALACTIC_CENTER_DEC = -(28 + 56/60 + 10.23/3600) * DEG_TO_RAD;

// Precession constants (arcseconds per century)
const PRECESSION_ZETA = 2306.2181;
const PRECESSION_Z = 2306.2181;
const PRECESSION_THETA = 2004.3109;

// ============================================================
// Basic spherical <-> Cartesian conversions
// ============================================================

export function sphericalToCartesian(radius: number, theta: number, phi: number): CartesianCoords {
  // theta = polar angle from +Y (0 to π), phi = azimuthal from +X (0 to 2π)
  const sinTheta = Math.sin(theta);
  return {
    x: radius * sinTheta * Math.cos(phi),
    y: radius * Math.cos(theta),
    z: radius * sinTheta * Math.sin(phi),
  };
}

export function cartesianToSpherical(cart: CartesianCoords): { radius: number; theta: number; phi: number } {
  const radius = Math.sqrt(cart.x * cart.x + cart.y * cart.y + cart.z * cart.z);
  if (radius === 0) return { radius: 0, theta: 0, phi: 0 };
  const theta = Math.acos(clamp(cart.y / radius, -1, 1));
  const phi = Math.atan2(cart.z, cart.x);
  return { radius, theta, phi };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================================
// Ecliptic <-> Equatorial
// ============================================================

export function eclipticToEquatorial(ecl: EclipticCoords, jd?: number): EquatorialCoords {
  // Apply precession if JD provided
  let eps = OBLIQUITY_J2000;
  if (jd !== undefined) {
    eps = meanObliquity(jd);
  }

  const cosEps = Math.cos(eps);
  const sinEps = Math.sin(eps);

  // Ecliptic to equatorial rotation matrix
  const lon = ecl.lon;
  const lat = ecl.lat;

  const sinLon = Math.sin(lon);
  const cosLon = Math.cos(lon);
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);

  // x = cos(lat) * cos(lon)
  // y = cos(lat) * sin(lon) * cos(eps) - sin(lat) * sin(eps)
  // z = cos(lat) * sin(lon) * sin(eps) + sin(lat) * cos(eps)

  const x = cosLat * cosLon;
  const y = cosLat * sinLon * cosEps - sinLat * sinEps;
  const z = cosLat * sinLon * sinEps + sinLat * cosEps;

  const ra = Math.atan2(y, x);
  const dec = Math.asin(clamp(z, -1, 1));

  return {
    ra: normalizeAngle(ra),
    dec,
    distance: ecl.distance,
  };
}

export function equatorialToEcliptic(eq: EquatorialCoords, jd?: number): EclipticCoords {
  let eps = OBLIQUITY_J2000;
  if (jd !== undefined) {
    eps = meanObliquity(jd);
  }

  const cosEps = Math.cos(eps);
  const sinEps = Math.sin(eps);

  const ra = eq.ra;
  const dec = eq.dec;

  const sinRa = Math.sin(ra);
  const cosRa = Math.cos(ra);
  const sinDec = Math.sin(dec);
  const cosDec = Math.cos(dec);

  // Inverse rotation
  const x = cosDec * cosRa;
  const y = cosDec * sinRa * cosEps + sinDec * sinEps;
  const z = -cosDec * sinRa * sinEps + sinDec * cosEps;

  const lon = Math.atan2(y, x);
  const lat = Math.asin(clamp(z, -1, 1));

  return {
    lon: normalizeAngle(lon),
    lat,
    distance: eq.distance,
  };
}

// ============================================================
// Equatorial <-> Galactic (IAU 1958)
// ============================================================

export function equatorialToGalactic(eq: EquatorialCoords): GalacticCoords {
  const ra = eq.ra;
  const dec = eq.dec;

  const sinDec = Math.sin(dec);
  const cosDec = Math.cos(dec);
  const sinRa = Math.sin(ra - GALACTIC_CENTER_RA);
  const cosRa = Math.cos(ra - GALACTIC_CENTER_RA);

  const sinB = sinDec * Math.sin(GALACTIC_POLE_DEC) + cosDec * Math.cos(GALACTIC_POLE_DEC) * cosRa;
  const b = Math.asin(clamp(sinB, -1, 1));

  const cosB = Math.cos(b);
  let l;
  if (cosB > 1e-10) {
    const sinL = cosDec * sinRa / cosB;
    const cosL = (sinDec - Math.sin(GALACTIC_POLE_DEC) * sinB) / (Math.cos(GALACTIC_POLE_DEC) * cosB);
    l = Math.atan2(sinL, cosL);
  } else {
    l = 0;
  }

  return {
    l: normalizeAngle(l),
    b,
    distance: eq.distance,
  };
}

export function galacticToEquatorial(gal: GalacticCoords): EquatorialCoords {
  const l = gal.l;
  const b = gal.b;

  const sinB = Math.sin(b);
  const cosB = Math.cos(b);
  const sinL = Math.sin(l);
  const cosL = Math.cos(l);

  const sinDec = sinB * Math.sin(GALACTIC_POLE_DEC) + cosB * Math.cos(GALACTIC_POLE_DEC) * cosL;
  const dec = Math.asin(clamp(sinDec, -1, 1));

  const cosDec = Math.cos(dec);
  let ra;
  if (cosDec > 1e-10) {
    const sinRa = cosB * sinL / cosDec;
    const cosRa = (sinB - Math.sin(GALACTIC_POLE_DEC) * sinDec) / (Math.cos(GALACTIC_POLE_DEC) * cosDec);
    ra = Math.atan2(sinRa, cosRa) + GALACTIC_CENTER_RA;
  } else {
    ra = GALACTIC_CENTER_RA;
  }

  return {
    ra: normalizeAngle(ra),
    dec,
    distance: gal.distance,
  };
}

// ============================================================
// Ecliptic <-> Galactic (via Equatorial)
// ============================================================

export function eclipticToGalactic(ecl: EclipticCoords, jd?: number): GalacticCoords {
  const eq = eclipticToEquatorial(ecl, jd);
  return equatorialToGalactic(eq);
}

export function galacticToEcliptic(gal: GalacticCoords, jd?: number): EclipticCoords {
  const eq = galacticToEquatorial(gal);
  return equatorialToEcliptic(eq, jd);
}

// ============================================================
// Horizontal (Alt/Az) coordinates
// ============================================================

export interface ObserverLocation {
  latitude: number;  // Radians, positive North
  longitude: number; // Radians, positive East
  elevation: number; // Meters
}

export function equatorialToHorizontal(
  eq: EquatorialCoords,
  observer: ObserverLocation,
  jd: number
): HorizontalCoords {
  // Calculate Local Sidereal Time
  const lst = greenwichSiderealTime(jd) + observer.longitude;
  const ha = normalizeAngle(lst - eq.ra); // Hour angle

  const sinLat = Math.sin(observer.latitude);
  const cosLat = Math.cos(observer.latitude);
  const sinDec = Math.sin(eq.dec);
  const cosDec = Math.cos(eq.dec);
  const cosHa = Math.cos(ha);
  const sinHa = Math.sin(ha);

  // Altitude
  const sinAlt = sinLat * sinDec + cosLat * cosDec * cosHa;
  const alt = Math.asin(clamp(sinAlt, -1, 1));

  // Azimuth (measured from North, East positive)
  const cosAlt = Math.cos(alt);
  let az;
  if (cosAlt > 1e-10) {
    const sinAz = -sinHa * cosDec / cosAlt;
    const cosAz = (sinDec - sinLat * sinAlt) / (cosLat * cosAlt);
    az = Math.atan2(sinAz, cosAz);
  } else {
    az = 0;
  }

  return {
    az: normalizeAngle(az),
    alt,
    distance: eq.distance,
  };
}

export function horizontalToEquatorial(
  hor: HorizontalCoords,
  observer: ObserverLocation,
  jd: number
): EquatorialCoords {
  const lst = greenwichSiderealTime(jd) + observer.longitude;

  const sinAlt = Math.sin(hor.alt);
  const cosAlt = Math.cos(hor.alt);
  const sinAz = Math.sin(hor.az);
  const cosAz = Math.cos(hor.az);
  const sinLat = Math.sin(observer.latitude);
  const cosLat = Math.cos(observer.latitude);

  const sinDec = sinLat * sinAlt + cosLat * cosAlt * cosAz;
  const dec = Math.asin(clamp(sinDec, -1, 1));

  const cosDec = Math.cos(dec);
  let ha;
  if (cosDec > 1e-10) {
    const sinHa = -sinAz * cosAlt / cosDec;
    const cosHa = (sinAlt - sinLat * sinDec) / (cosLat * cosDec);
    ha = Math.atan2(sinHa, cosHa);
  } else {
    ha = 0;
  }

  const ra = normalizeAngle(lst - ha);

  return {
    ra,
    dec,
    distance: hor.distance,
  };
}

// ============================================================
// Precession and Nutation
// ============================================================

// Mean obliquity of the ecliptic (IAU 2006)
// Returns value in radians
export function meanObliquity(jd: number): number {
  const t = (jd - 2451545.0) / 36525.0; // Centuries since J2000.0

  // IAU 2006 polynomial (arcseconds)
  let eps = 84381.448 - 46.8150 * t - 0.00059 * t * t + 0.001813 * t * t * t;

  return eps * DEG_TO_RAD / 3600;
}

// True obliquity (includes nutation)
export function trueObliquity(jd: number): number {
  const nut = nutationAngles(jd);
  return meanObliquity(jd) + nut.epsDelta;
}

// Nutation in longitude (Δψ) and obliquity (Δε)
// IAU 2000A simplified (dominant terms only)
export function nutationAngles(jd: number): { psiDelta: number; epsDelta: number } {
  const t = (jd - 2451545.0) / 36525.0;

  // Delaunay arguments (radians)
  const D = (297.85036 + 445267.111480 * t) * DEG_TO_RAD; // Moon's mean elongation
  const M = (357.52772 + 35999.050340 * t) * DEG_TO_RAD;  // Sun's mean anomaly
  const Mp = (134.96298 + 477198.867398 * t) * DEG_TO_RAD; // Moon's mean anomaly
  const F = (93.27191 + 483202.017538 * t) * DEG_TO_RAD;   // Moon's argument of latitude
  const Om = (125.04452 - 1934.136261 * t) * DEG_TO_RAD;   // Longitude of ascending node

  // Dominant terms (arcseconds * 0.0001)
  // Nutation in longitude Δψ
  let dPsi = 0;
  dPsi += -171996 * Math.sin(Om);
  dPsi += -13187 * Math.sin(2 * (F - D + Om));
  dPsi += -2274 * Math.sin(2 * (F + Om));
  dPsi += 2062 * Math.sin(2 * Om);
  dPsi += 1426 * Math.sin(M);
  dPsi += 712 * Math.sin(Mp);
  dPsi += -517 * Math.sin(2 * D);
  dPsi += -386 * Math.sin(2 * (F + Om));
  dPsi += -301 * Math.sin(Mp + Om);
  dPsi += 217 * Math.sin(2 * F);
  dPsi += -158 * Math.sin(Mp - Om);
  dPsi += 129 * Math.sin(2 * (D - F));
  dPsi += 123 * Math.sin(M - Mp);
  dPsi += 63 * Math.sin(2 * (D + Mp));
  dPsi += 63 * Math.sin(2 * (D - Mp));

  // Nutation in obliquity Δε
  let dEps = 0;
  dEps += 92025 * Math.cos(Om);
  dEps += 5736 * Math.cos(2 * (F - D + Om));
  dEps += 977 * Math.cos(2 * (F + Om));
  dEps += -895 * Math.cos(2 * Om);
  dEps += 54 * Math.cos(M);
  dEps += -7 * Math.cos(Mp);
  dEps += 224 * Math.cos(2 * D);
  dEps += 200 * Math.cos(2 * (F + Om));
  dEps += 129 * Math.cos(Mp + Om);
  dEps += -95 * Math.cos(2 * F);
  dEps += -70 * Math.cos(Mp - Om);
  dEps += -53 * Math.cos(2 * (D - F));
  dEps += -33 * Math.cos(M - Mp);
  dEps += 26 * Math.cos(2 * (D + Mp));
  dEps += 32 * Math.cos(2 * (D - Mp));

  return {
    psiDelta: dPsi * 0.0001 * DEG_TO_RAD,
    epsDelta: dEps * 0.0001 * DEG_TO_RAD,
  };
}

// Precession matrix (J2000 to date)
export function precessionMatrix(jd: number): THREE.Matrix3 {
  const t = (jd - 2451545.0) / 36525.0;

  // Precession angles (radians)
  const zeta = ((PRECESSION_ZETA + 0.30188 * t + 0.017998 * t * t) * t) * DEG_TO_RAD / 3600;
  const z = ((PRECESSION_Z + 1.09468 * t + 0.018203 * t * t) * t) * DEG_TO_RAD / 3600;
  const theta = ((PRECESSION_THETA - 0.42665 * t - 0.041833 * t * t) * t) * DEG_TO_RAD / 3600;

  const sinZeta = Math.sin(zeta), cosZeta = Math.cos(zeta);
  const sinZ = Math.sin(z), cosZ = Math.cos(z);
  const sinTheta = Math.sin(theta), cosTheta = Math.cos(theta);

  // Rotation matrix R = Rz(-z) * Ry(theta) * Rz(-zeta)
  const m = new THREE.Matrix3();
  m.set(
    cosZeta * cosZ - sinZeta * sinZ * cosTheta,
    -sinZeta * cosZ - cosZeta * sinZ * cosTheta,
    -sinZ * sinTheta,

    cosZeta * sinZ + sinZeta * cosZ * cosTheta,
    -sinZeta * sinZ + cosZeta * cosZ * cosTheta,
    -cosZ * sinTheta,

    sinZeta * sinTheta,
    cosZeta * sinTheta,
    cosTheta
  );

  return m;
}

// Apply precession to equatorial coordinates
export function precessEquatorial(eq: EquatorialCoords, fromJD: number, toJD: number): EquatorialCoords {
  if (fromJD === toJD) return eq;

  // Convert to Cartesian
  const cart = equatorialToCartesian(eq);

  // Apply precession matrix
  const m = precessionMatrix(toJD); // J2000 to target
  const mInv = precessionMatrix(fromJD).clone().invert(); // Source to J2000

  const combined = m.clone().multiply(mInv);

  const newCart = new THREE.Vector3(cart.x, cart.y, cart.z).applyMatrix3(combined);

  return cartesianToEquatorial({
    x: newCart.x,
    y: newCart.y,
    z: newCart.z,
  });
}

// ============================================================
// Aberration correction
// ============================================================

// Annual aberration due to Earth's orbital velocity
// v/c ~ 9.93e-5 (v = 29.78 km/s)
const ABERRATION_CONSTANT = 9.93e-5;

export function aberrationCorrection(
  eq: EquatorialCoords,
  observerVelocity: THREE.Vector3 // m/s
): EquatorialCoords {
  const v = observerVelocity.length();
  if (v === 0) return eq;

  const beta = v / 299792458; // v/c
  if (beta < 1e-10) return eq;

  const vDir = new THREE.Vector3().copy(observerVelocity).normalize();

  // Star direction in equatorial Cartesian
  const starDir = equatorialToCartesian(eq);
  const s = new THREE.Vector3(starDir.x, starDir.y, starDir.z).normalize();

  // Aberration formula: s' = (s + (γ-1)(β·s)β/β² + γβ) / (γ(1 + β·s))
  // Simplified for small β: s' ≈ s + β × (s × β)
  const betaDotS = vDir.dot(s);
  const sPrime = s.clone().add(vDir.clone().multiplyScalar(beta * betaDotS)).sub(vDir.clone().multiplyScalar(beta)).normalize();

  // Convert back
  return cartesianToEquatorial({ x: sPrime.x, y: sPrime.y, z: sPrime.z });
}

// ============================================================
// Parallax correction
// ============================================================

export function applyParallax(
  eq: EquatorialCoords,
  parallax: number, // arcseconds
  observerPosition: THREE.Vector3 // meters from Sun
): EquatorialCoords {
  if (parallax === 0) return eq;

  const parallaxRad = parallax * DEG_TO_RAD / 3600;
  const distance = 1 / parallaxRad; // Parsecs
  const distanceM = distance * 3.085677581e16;

  // Parallax offset
  const offset = observerPosition.clone().divideScalar(distanceM);

  const starDir = equatorialToCartesian(eq);
  const s = new THREE.Vector3(starDir.x, starDir.y, starDir.z);

  const sPrime = s.clone().sub(offset).normalize();

  return cartesianToEquatorial({ x: sPrime.x, y: sPrime.y, z: sPrime.z });
}

// ============================================================
// Proper motion
// ============================================================

export function applyProperMotion(
  eq: EquatorialCoords,
  pmRA: number,  // mas/yr
  pmDec: number, // mas/yr
  fromJD: number,
  toJD: number
): EquatorialCoords {
  const dt = (toJD - fromJD) / 365.25; // Years

  const ra = eq.ra + (pmRA * DEG_TO_RAD / 3600 / 1000) * dt / Math.cos(eq.dec);
  const dec = eq.dec + (pmDec * DEG_TO_RAD / 3600 / 1000) * dt;

  return {
    ra: normalizeAngle(ra),
    dec: clamp(dec, -PI/2, PI/2),
    distance: eq.distance,
  };
}

// ============================================================
// Cartesian <-> Equatorial
// ============================================================

export function equatorialToCartesian(eq: EquatorialCoords): CartesianCoords {
  const ra = eq.ra;
  const dec = eq.dec;
  const dist = eq.distance || 1;

  const cosDec = Math.cos(dec);
  return {
    x: dist * cosDec * Math.cos(ra),
    y: dist * Math.sin(dec),
    z: dist * cosDec * Math.sin(ra),
  };
}

export function cartesianToEquatorial(cart: CartesianCoords): EquatorialCoords {
  const radius = Math.sqrt(cart.x * cart.x + cart.y * cart.y + cart.z * cart.z);
  if (radius === 0) return { ra: 0, dec: 0, distance: 0 };

  const ra = Math.atan2(cart.z, cart.x);
  const dec = Math.asin(clamp(cart.y / radius, -1, 1));

  return {
    ra: normalizeAngle(ra),
    dec,
    distance: radius,
  };
}

// ============================================================
// Cartesian <-> Ecliptic
// ============================================================

export function eclipticToCartesian(ecl: EclipticCoords): CartesianCoords {
  const eq = eclipticToEquatorial(ecl);
  return equatorialToCartesian(eq);
}

export function cartesianToEcliptic(cart: CartesianCoords, jd?: number): EclipticCoords {
  const eq = cartesianToEquatorial(cart);
  return equatorialToEcliptic(eq, jd);
}

// ============================================================
// Cartesian <-> Galactic
// ============================================================

export function galacticToCartesian(gal: GalacticCoords): CartesianCoords {
  const eq = galacticToEquatorial(gal);
  return equatorialToCartesian(eq);
}

export function cartesianToGalactic(cart: CartesianCoords): GalacticCoords {
  const eq = cartesianToEquatorial(cart);
  return equatorialToGalactic(eq);
}

// ============================================================
// Utility functions
// ============================================================

// Format functions for display
export function formatRA(rad: number): string {
  const hours = (rad * RAD_TO_DEG / 15 + 24) % 24;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = ((hours - h - m / 60) * 3600).toFixed(2);
  return `${h}h ${m}m ${s}s`;
}

export function formatDec(rad: number): string {
  const deg = rad * RAD_TO_DEG;
  const sign = deg >= 0 ? '+' : '-';
  const absDeg = Math.abs(deg);
  const d = Math.floor(absDeg);
  const m = Math.floor((absDeg - d) * 60);
  const s = ((absDeg - d - m / 60) * 3600).toFixed(1);
  return `${sign}${d}° ${m}' ${s}"`;
}

export function formatGalactic(l: number, b: number): string {
  const lDeg = l * RAD_TO_DEG;
  const bDeg = b * RAD_TO_DEG;
  return `l=${lDeg.toFixed(2)}° b=${bDeg.toFixed(2)}°`;
}

export function formatHorizontal(az: number, alt: number): string {
  const azDeg = (az * RAD_TO_DEG + 360) % 360;
  const altDeg = alt * RAD_TO_DEG;
  return `Az=${azDeg.toFixed(1)}° Alt=${altDeg.toFixed(1)}°`;
}

// Angular separation
export function angularSeparation(
  ra1: number, dec1: number,
  ra2: number, dec2: number
): number {
  const sinDec1 = Math.sin(dec1);
  const sinDec2 = Math.sin(dec2);
  const cosDec1 = Math.cos(dec1);
  const cosDec2 = Math.cos(dec2);
  const cosDra = Math.cos(ra2 - ra1);

  const cosAngle = sinDec1 * sinDec2 + cosDec1 * cosDec2 * cosDra;
  return Math.acos(clamp(cosAngle, -1, 1));
}

// Greenwich Mean Sidereal Time (radians)
export function greenwichSiderealTime(jd: number): number {
  const t = (jd - 2451545.0) / 36525.0;
  // GMST in seconds
  let gmst = 24110.54841 + 8640184.812866 * t + 0.093104 * t * t - 6.2e-6 * t * t * t;
  gmst = (gmst % 86400 + 86400) % 86400;
  return (gmst / 86400) * TAU;
}

// Local Sidereal Time
export function localSiderealTime(jd: number, longitude: number): number {
  return normalizeAngle(greenwichSiderealTime(jd) + longitude);
}

// Hour angle
export function hourAngle(ra: number, jd: number, longitude: number): number {
  return normalizeAngle(localSiderealTime(jd, longitude) - ra);
}

// ============================================================
// Transform pipeline for full accuracy
// ============================================================

export interface TransformOptions {
  epoch?: number;        // Target epoch (JD), default J2000
  applyPrecession?: boolean;
  applyNutation?: boolean;
  applyAberration?: boolean;
  applyParallax?: boolean;
  observerVelocity?: THREE.Vector3;
  parallax?: number;
  observerPosition?: THREE.Vector3;
}

export function transformCoordinates(
  eq: EquatorialCoords,
  options: TransformOptions = {}
): EquatorialCoords {
  let result = { ...eq };

  // Apply proper motion if needed
  // (would need pmRA, pmDec, fromJD)

  // Precession
  if (options.applyPrecession && options.epoch) {
    result = precessEquatorial(result, 2451545.0, options.epoch);
  }

  // Nutation (affects obliquity for ecliptic conversions)
  // Handled within eclipticToEquatorial/equatorialToEcliptic when JD provided

  // Aberration
  if (options.applyAberration && options.observerVelocity) {
    result = aberrationCorrection(result, options.observerVelocity);
  }

  // Parallax
  if (options.applyParallax && options.parallax && options.observerPosition) {
    result = applyParallax(result, options.parallax, options.observerPosition);
  }

  return result;
}

// Convert from any system to any other
export function convertCoordinates(
  coords: EquatorialCoords | EclipticCoords | GalacticCoords | HorizontalCoords,
  from: 'equatorial' | 'ecliptic' | 'galactic' | 'horizontal',
  to: 'equatorial' | 'ecliptic' | 'galactic' | 'horizontal',
  jd?: number,
  observer?: ObserverLocation
): EquatorialCoords | EclipticCoords | GalacticCoords | HorizontalCoords {
  // First convert to equatorial
  let eq: EquatorialCoords;

  switch (from) {
    case 'equatorial':
      eq = coords as EquatorialCoords;
      break;
    case 'ecliptic':
      eq = eclipticToEquatorial(coords as EclipticCoords, jd);
      break;
    case 'galactic':
      eq = galacticToEquatorial(coords as GalacticCoords);
      break;
    case 'horizontal':
      if (!observer || !jd) throw new Error('Horizontal conversion requires observer and JD');
      eq = horizontalToEquatorial(coords as HorizontalCoords, observer, jd);
      break;
  }

  // Then convert from equatorial to target
  switch (to) {
    case 'equatorial':
      return eq;
    case 'ecliptic':
      return equatorialToEcliptic(eq, jd);
    case 'galactic':
      return equatorialToGalactic(eq);
    case 'horizontal':
      if (!observer || !jd) throw new Error('Horizontal conversion requires observer and JD');
      return equatorialToHorizontal(eq, observer, jd);
  }
}