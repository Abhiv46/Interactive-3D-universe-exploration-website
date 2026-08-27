/**
 * Nearby Galaxy Data - Real astronomical data for Milky Way neighbors
 * Distances in parsecs, positions in galactic coordinates
 */

import { GalaxyData } from '@/types/orbitalElements';

// Conversion constants
export const PC_TO_LY = 3.26156; // parsecs to light years
export const LY_TO_UNITS = 1e4; // 1 light year = 10,000 units (logarithmic scaling for visualization)
export const PC_TO_UNITS = PC_TO_LY * LY_TO_UNITS;

// Milky Way parameters
export const MILKY_WAY = {
  // Real Milky Way parameters
  diameterLy: 100000,        // ~100,000 light years diameter
  diameterUnits: 100000 * LY_TO_UNITS,
  thicknessLy: 1000,         // ~1,000 light years thick
  bulgeRadiusLy: 10000,      // Central bulge ~10,000 ly radius
  bulgeRadiusUnits: 10000 * LY_TO_UNITS,
  sunDistanceFromCenterLy: 26000, // Sun is ~26,000 ly from center
  sunDistanceFromCenterUnits: 26000 * LY_TO_UNITS,
  spiralArms: 4,             // 4 major spiral arms
  armNames: ['Perseus', 'Sagittarius', 'Scutum-Centaurus', 'Norma'],
  rotationPeriodYears: 225e6, // ~225 million years

  // Visual scaling (for rendering)
  // We use logarithmic scaling so the galaxy fits in view
  visualRadius: 50000,       // Visual radius in units
  visualBulgeRadius: 8000,
  particleCount: 100000,     // Number of particles for spiral arms
  bulgeParticleCount: 20000, // Particles for bulge
  haloParticleCount: 5000,   // Halo particles
};

// Nearby galaxies with real data
export const NEARBY_GALAXIES: GalaxyData[] = [
  {
    id: 'andromeda',
    name: 'Andromeda Galaxy',
    designation: 'M31',
    type: 'Sb',
    ra: 10.6847,      // RA in degrees
    dec: 41.2692,     // Dec in degrees
    distance: 765000, // Distance in parsecs (~2.5 million ly)
    magnitude: 3.44,
    angularSize: 190, // arcminutes (3.1°)
    positionAngle: 35,
    redshift: -0.001001,
    description: 'The nearest major galaxy to the Milky Way, on a collision course in ~4.5 billion years. Contains ~1 trillion stars.',
    url: 'https://en.wikipedia.org/wiki/Andromeda_Galaxy',
    size: 220000,      // Diameter in light years
    absoluteMagnitude: -21.5,
    inclination: 77,
    velocity: -300,    // km/s (blueshift - approaching)
    satellites: ['M32', 'M110', 'NGC 147', 'NGC 185'],
  },
  {
    id: 'triangulum',
    name: 'Triangulum Galaxy',
    designation: 'M33',
    type: 'Sc',
    ra: 23.4621,
    dec: 30.6602,
    distance: 859000, // ~2.8 million ly
    magnitude: 5.72,
    angularSize: 70,  // arcminutes
    positionAngle: 23,
    redshift: -0.000607,
    description: 'Third-largest galaxy in the Local Group. A face-on spiral with prominent H-II regions.',
    url: 'https://en.wikipedia.org/wiki/Triangulum_Galaxy',
    size: 60000,
    absoluteMagnitude: -19.1,
    inclination: 54,
    velocity: -180,
    satellites: [],
  },
  {
    id: 'lmc',
    name: 'Large Magellanic Cloud',
    designation: 'LMC',
    type: 'Irr/SBm',
    ra: 80.8939,
    dec: -69.7561,
    distance: 49970,  // ~163,000 ly
    magnitude: 0.9,
    angularSize: 645, // arcminutes (10.75°)
    positionAngle: 180,
    redshift: 0.00093,
    description: 'Largest satellite galaxy of the Milky Way. Irregular/barred spiral with active star formation (Tarantula Nebula).',
    url: 'https://en.wikipedia.org/wiki/Large_Magellanic_Cloud',
    size: 14000,
    absoluteMagnitude: -18.1,
    inclination: 35,
    velocity: 278,
    satellites: [],
  },
  {
    id: 'smc',
    name: 'Small Magellanic Cloud',
    designation: 'SMC',
    type: 'Irr/SBm',
    ra: 13.1867,
    dec: -72.8286,
    distance: 61200,  // ~200,000 ly
    magnitude: 2.7,
    angularSize: 315, // arcminutes (5.25°)
    positionAngle: 45,
    redshift: 0.00054,
    description: 'Second-largest satellite galaxy. Connected to LMC by the Magellanic Bridge of gas and stars.',
    url: 'https://en.wikipedia.org/wiki/Small_Magellanic_Cloud',
    size: 7000,
    absoluteMagnitude: -16.8,
    inclination: 40,
    velocity: 162,
    satellites: [],
  },
];

// Convert galactic coordinates (l, b) to 3D position
export function galacticToCartesian(l: number, b: number, distance: number): [number, number, number] {
  const lRad = l * Math.PI / 180;
  const bRad = b * Math.PI / 180;

  const cosB = Math.cos(bRad);
  const x = distance * cosB * Math.cos(lRad);
  const y = distance * Math.sin(bRad);
  const z = distance * cosB * Math.sin(lRad);

  return [x, y, z];
}

// Convert equatorial (RA, Dec) to galactic coordinates
export function equatorialToGalactic(ra: number, dec: number): { l: number; b: number } {
  // Galactic north pole: RA=192.8595°, Dec=27.1284°
  // Galactic center: l=0°, b=0° at RA=266.4051°, Dec=-28.9362°
  const raRad = ra * Math.PI / 180;
  const decRad = dec * Math.PI / 180;
  const raG = 192.8595 * Math.PI / 180;
  const decG = 27.1284 * Math.PI / 180;
  const lCP = 122.932 * Math.PI / 180; // Galactic longitude of celestial pole

  const sinDec = Math.sin(decRad);
  const cosDec = Math.cos(decRad);
  const sinDecG = Math.sin(decG);
  const cosDecG = Math.cos(decG);
  const cosRaDiff = Math.cos(raRad - raG);

  const sinB = sinDec * sinDecG + cosDec * cosDecG * cosRaDiff;
  const b = Math.asin(Math.max(-1, Math.min(1, sinB)));

  const sinL = cosDec * Math.sin(raRad - raG) / Math.cos(b);
  const cosL = (sinDec - sinDecG * sinB) / (cosDecG * Math.cos(b));
  let l = Math.atan2(sinL, cosL);
  l = (l + 2 * Math.PI) % (2 * Math.PI);
  l = (l + lCP) % (2 * Math.PI);

  return { l: l * 180 / Math.PI, b: b * 180 / Math.PI };
}

// Get 3D position for a galaxy (logarithmically scaled for visualization)
export function getGalaxyPosition(galaxy: GalaxyData): THREE.Vector3 {
  const galactic = equatorialToGalactic(galaxy.ra, galaxy.dec);
  const [x, y, z] = galacticToCartesian(galactic.l, galactic.b, galaxy.distance * PC_TO_UNITS);
  return new THREE.Vector3(x, y, z);
}

// Logarithmic distance scaling for smooth transitions
export function logScaleDistance(realDistanceLy: number, minScale = 1, maxScale = 1e5): number {
  // Logarithmic scaling: compresses large distances
  // log10(100000) ≈ 5, so we map to a reasonable range
  const logDist = Math.log10(realDistanceLy + 1);
  return minScale + (maxScale - minScale) * (logDist / 6); // 6 = log10(1,000,000)
}

// Inverse: get real distance from visual distance
export function realDistanceFromVisual(visualDist: number, minScale = 1, maxScale = 1e5): number {
  const normalized = (visualDist - minScale) / (maxScale - minScale);
  return Math.pow(10, normalized * 6) - 1;
}

// Milky Way spiral arm parameters (based on real structure)
export const SPIRAL_ARMS = [
  {
    name: 'Perseus',
    startRadius: 8000,
    endRadius: 16000,
    pitchAngle: 12,      // degrees
    phaseOffset: 0,
    width: 1000,
    density: 1.0,
    color: [0.6, 0.7, 1.0], // Bluish - young stars
  },
  {
    name: 'Sagittarius',
    startRadius: 5000,
    endRadius: 14000,
    pitchAngle: 12,
    phaseOffset: Math.PI / 2,
    width: 1200,
    density: 1.2,
    color: [0.8, 0.7, 1.0],
  },
  {
    name: 'Scutum-Centaurus',
    startRadius: 4000,
    endRadius: 12000,
    pitchAngle: 12,
    phaseOffset: Math.PI,
    width: 1000,
    density: 1.1,
    color: [0.7, 0.8, 1.0],
  },
  {
    name: 'Norma',
    startRadius: 6000,
    endRadius: 13000,
    pitchAngle: 12,
    phaseOffset: 3 * Math.PI / 2,
    width: 800,
    density: 0.9,
    color: [0.5, 0.6, 0.9],
  },
  // Minor arms / spurs
  {
    name: 'Orion Spur (Local Arm)',
    startRadius: 8000,
    endRadius: 11000,
    pitchAngle: 15,
    phaseOffset: 0.5,
    width: 500,
    density: 0.5,
    color: [0.9, 0.9, 1.0],
  },
];

import * as THREE from 'three';