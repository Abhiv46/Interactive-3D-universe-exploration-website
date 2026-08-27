import * as THREE from 'three';
import { CelestialBodyData } from '../types/orbitalElements';
import { calculatePosition, fastPosition, precomputeOrbit, PrecomputedOrbit } from './KeplerianOrbit';

/**
 * Eclipse detection and visualization system
 * Uses real orbital positions to detect solar/lunar eclipses
 */

export interface EclipseEvent {
  type: 'solar' | 'lunar';
  primaryBody: string;    // Body being eclipsed (e.g., 'sun' for solar, 'moon' for lunar)
  occultingBody: string;  // Body causing eclipse (e.g., 'moon' for solar, 'earth' for lunar)
  observerBody: string;   // Where the eclipse is visible from (e.g., 'earth')
  startTime: number;      // Julian date
  peakTime: number;       // Julian date
  endTime: number;        // Julian date
  magnitude: number;      // 0-1, how complete the eclipse is
  isTotal: boolean;       // Total vs partial
  visibleFromSurface: boolean; // Visible from observer body's surface
}

export interface EclipseState {
  activeEclipses: EclipseEvent[];
  currentEclipse: EclipseEvent | null;
  progress: number; // 0-1 progress through current eclipse
}

/**
 * Angular radius of a body as seen from another body
 */
function getAngularRadius(viewerPos: THREE.Vector3, targetPos: THREE.Vector3, targetRadius: number): number {
  const distance = viewerPos.distanceTo(targetPos);
  return Math.asin(Math.min(1, targetRadius / distance));
}

/**
 * Angular separation between two bodies as seen from a third
 */
function getAngularSeparation(
  viewerPos: THREE.Vector3,
  body1Pos: THREE.Vector3,
  body2Pos: THREE.Vector3
): number {
  const dir1 = new THREE.Vector3().subVectors(body1Pos, viewerPos).normalize();
  const dir2 = new THREE.Vector3().subVectors(body2Pos, viewerPos).normalize();
  return Math.acos(Math.max(-1, Math.min(1, dir1.dot(dir2))));
}

/**
 * Check if a solar eclipse is occurring (Moon blocks Sun from Earth's perspective)
 */
export function checkSolarEclipse(
  sunPos: THREE.Vector3,
  earthPos: THREE.Vector3,
  moonPos: THREE.Vector3,
  sunRadius: number,
  moonRadius: number
): { isEclipse: boolean; magnitude: number; isTotal: boolean } {
  // Angular radii as seen from Earth
  const sunAngularRadius = getAngularRadius(earthPos, sunPos, sunRadius);
  const moonAngularRadius = getAngularRadius(earthPos, moonPos, moonRadius);

  // Angular separation between Sun and Moon as seen from Earth
  const separation = getAngularSeparation(earthPos, sunPos, moonPos);

  // Eclipse occurs if Moon overlaps Sun
  const overlap = sunAngularRadius + moonAngularRadius - separation;

  if (overlap <= 0) {
    return { isEclipse: false, magnitude: 0, isTotal: false };
  }

  // Magnitude = fraction of Sun's diameter covered
  const magnitude = Math.min(1, overlap / (2 * sunAngularRadius));

  // Total if Moon completely covers Sun (angular radius of Moon >= Sun)
  const isTotal = moonAngularRadius >= sunAngularRadius && separation <= Math.abs(moonAngularRadius - sunAngularRadius);

  return { isEclipse: true, magnitude, isTotal };
}

/**
 * Check if a lunar eclipse is occurring (Earth blocks Sun from Moon's perspective)
 */
export function checkLunarEclipse(
  sunPos: THREE.Vector3,
  earthPos: THREE.Vector3,
  moonPos: THREE.Vector3,
  sunRadius: number,
  earthRadius: number
): { isEclipse: boolean; magnitude: number; isTotal: boolean } {
  // For lunar eclipse, we check if Moon is in Earth's shadow
  // Angular radius of Earth's umbra at Moon's distance
  const earthMoonDist = earthPos.distanceTo(moonPos);
  const earthSunDist = earthPos.distanceTo(sunPos);

  // Umbra cone angle
  const umbraAngle = Math.atan2(earthRadius - sunRadius, earthSunDist);
  const umbraRadiusAtMoon = earthRadius - earthMoonDist * Math.tan(umbraAngle);

  if (umbraRadiusAtMoon <= 0) {
    return { isEclipse: false, magnitude: 0, isTotal: false };
  }

  // Angular separation between Earth center and Moon as seen from Sun
  // Actually, we need angular separation between Sun and Earth as seen from Moon
  const separation = getAngularSeparation(moonPos, sunPos, earthPos);

  // Angular radius of Earth's umbra as seen from Moon
  const umbraAngularRadius = Math.asin(Math.min(1, umbraRadiusAtMoon / earthMoonDist));

  // Also check penumbra
  const penumbraAngle = Math.atan2(earthRadius + sunRadius, earthSunDist);
  const penumbraRadiusAtMoon = earthRadius + earthMoonDist * Math.tan(penumbraAngle);
  const penumbraAngularRadius = Math.asin(Math.min(1, penumbraRadiusAtMoon / earthMoonDist));

  const overlap = umbraAngularRadius + Math.PI - separation; // Moon is opposite Sun

  if (overlap <= 0) {
    // Check penumbral eclipse
    const penumbralOverlap = penumbraAngularRadius + Math.PI - separation;
    if (penumbralOverlap > 0) {
      const magnitude = Math.min(1, penumbralOverlap / (2 * Math.PI));
      return { isEclipse: true, magnitude, isTotal: false }; // Penumbral only
    }
    return { isEclipse: false, magnitude: 0, isTotal: false };
  }

  const magnitude = Math.min(1, overlap / (2 * umbraAngularRadius));
  const isTotal = magnitude >= 1.0;

  return { isEclipse: true, magnitude, isTotal };
}

/**
 * Detect all eclipses in the Earth-Moon-Sun system
 */
export function detectEclipses(
  bodies: Map<string, CelestialBodyData>,
  julianDate: number
): EclipseEvent[] {
  const eclipses: EclipseEvent[] = [];

  // Get required bodies
  const sun = bodies.get('sun');
  const earth = bodies.get('earth');
  const moon = bodies.get('moon');

  if (!sun || !earth || !moon || !sun.orbital || !earth.orbital || !moon.orbital) {
    return eclipses;
  }

  const sunPos = new THREE.Vector3(...calculatePosition(sun.orbital, julianDate));
  const earthPos = new THREE.Vector3(...calculatePosition(earth.orbital, julianDate));
  const moonPos = new THREE.Vector3(...calculatePosition(moon.orbital, julianDate));

  const sunRadius = sun.physical.radius;
  const earthRadius = earth.physical.radius;
  const moonRadius = moon.physical.radius;

  // Check solar eclipse (from Earth's surface perspective)
  const solar = checkSolarEclipse(sunPos, earthPos, moonPos, sunRadius, moonRadius);
  if (solar.isEclipse) {
    eclipses.push({
      type: 'solar',
      primaryBody: 'sun',
      occultingBody: 'moon',
      observerBody: 'earth',
      startTime: julianDate - 0.01, // Approximate
      peakTime: julianDate,
      endTime: julianDate + 0.01,
      magnitude: solar.magnitude,
      isTotal: solar.isTotal,
      visibleFromSurface: true,
    });
  }

  // Check lunar eclipse
  const lunar = checkLunarEclipse(sunPos, earthPos, moonPos, sunRadius, earthRadius);
  if (lunar.isEclipse) {
    eclipses.push({
      type: 'lunar',
      primaryBody: 'moon',
      occultingBody: 'earth',
      observerBody: 'earth',
      startTime: julianDate - 0.02,
      peakTime: julianDate,
      endTime: julianDate + 0.02,
      magnitude: lunar.magnitude,
      isTotal: lunar.isTotal,
      visibleFromSurface: true,
    });
  }

  return eclipses;
}

/**
 * Get eclipse shadow position for rendering
 * Returns the position of the umbra/penumbra cone intersection with target body
 */
export function getEclipseShadowData(
  sunPos: THREE.Vector3,
  occultingPos: THREE.Vector3,
  occultingRadius: number,
  targetPos: THREE.Vector3,
  targetRadius: number
): { umbraCenter: THREE.Vector3; umbraRadius: number; penumbraRadius: number } | null {
  const sunOccultingDist = sunPos.distanceTo(occultingPos);
  const occultingTargetDist = occultingPos.distanceTo(targetPos);

  // Umbra cone
  const umbraAngle = Math.atan2(occultingRadius - sunPos.length(), sunOccultingDist);
  // Actually, need Sun radius here
  // Simplified: umbra converges behind occulting body
  const umbraLength = occultingRadius * sunOccultingDist / (sunPos.length() - occultingRadius);

  if (occultingTargetDist > umbraLength) {
    return null; // Target is beyond umbra
  }

  // Direction from occulting body to target
  const dir = new THREE.Vector3().subVectors(targetPos, occultingPos).normalize();
  const umbraCenter = new THREE.Vector3().addVectors(occultingPos, dir.clone().multiplyScalar(occultingTargetDist));
  const umbraRadius = occultingRadius * (1 - occultingTargetDist / umbraLength);

  // Penumbra
  const penumbraAngle = Math.atan2(occultingRadius + sunPos.length(), sunOccultingDist);
  const penumbraRadius = occultingRadius + occultingTargetDist * Math.tan(penumbraAngle);

  return { umbraCenter, umbraRadius, penumbraRadius };
}

/**
 * Calculate eclipse progress (0-1) for animation
 */
export function getEclipseProgress(eclipse: EclipseEvent, currentTime: number): number {
  const duration = eclipse.endTime - eclipse.startTime;
  if (duration <= 0) return 0;
  return Math.max(0, Math.min(1, (currentTime - eclipse.startTime) / duration));
}