import { OrbitalElements } from '../types/orbitalElements';

/**
 * Asteroid belt and Kuiper belt distribution data
 * Based on real orbital element distributions from the Minor Planet Center
 * and NEOWISE surveys.
 */

export interface BeltAsteroid {
  id: string;
  name: string;
  elements: OrbitalElements;
  diameter: number; // meters
  albedo: number;
  spectralType: string;
  mass?: number; // kg
}

// Gravitational parameter of the Sun in m³/s²
const GM_SUN = 1.32712440018e20;

function createOrbitalElements(
  a: number, e: number, i: number, omega: number, w: number, M0: number,
  epoch: number = 2451545.0
): OrbitalElements {
  const T = 2 * Math.PI * Math.sqrt(a * a * a / GM_SUN);
  return {
    semiMajorAxis: a,
    eccentricity: e,
    inclination: i * Math.PI / 180, // Convert degrees to radians
    longitudeOfAscendingNode: omega * Math.PI / 180,
    argumentOfPeriapsis: w * Math.PI / 180,
    meanAnomalyAtEpoch: M0 * Math.PI / 180,
    epoch,
    gravitationalParameter: GM_SUN,
    orbitalPeriod: T,
  };
}

// Notable asteroids with well-determined orbital elements and physical properties
export const NOTABLE_ASTEROIDS: BeltAsteroid[] = [
  {
    id: 'ceres',
    name: '1 Ceres',
    elements: createOrbitalElements(4.136e11, 0.0758, 10.594, 80.305, 73.597, 95.989),
    diameter: 940000,
    albedo: 0.090,
    spectralType: 'C',
    mass: 9.39e20,
  },
  {
    id: 'vesta',
    name: '4 Vesta',
    elements: createOrbitalElements(3.531e11, 0.0895, 7.140, 103.851, 151.198, 20.883),
    diameter: 525400,
    albedo: 0.423,
    spectralType: 'V',
    mass: 2.59e20,
  },
  {
    id: 'pallas',
    name: '2 Pallas',
    elements: createOrbitalElements(4.142e11, 0.2305, 34.837, 173.013, 310.304, 38.992),
    diameter: 512000,
    albedo: 0.159,
    spectralType: 'B',
    mass: 2.04e20,
  },
  {
    id: 'hygiea',
    name: '10 Hygiea',
    elements: createOrbitalElements(4.712e11, 0.1144, 3.827, 283.197, 312.322, 152.218),
    diameter: 434000,
    albedo: 0.072,
    spectralType: 'C',
    mass: 8.32e19,
  },
  {
    id: 'interamnia',
    name: '704 Interamnia',
    elements: createOrbitalElements(4.588e11, 0.1482, 17.291, 95.679, 96.071, 146.079),
    diameter: 332000,
    albedo: 0.075,
    spectralType: 'F',
    mass: 3.5e19,
  },
  {
    id: 'europa',
    name: '52 Europa',
    elements: createOrbitalElements(4.625e11, 0.1038, 7.469, 128.987, 145.414, 76.575),
    diameter: 302000,
    albedo: 0.058,
    spectralType: 'C',
    mass: 2.7e19,
  },
  {
    id: 'davida',
    name: '511 Davida',
    elements: createOrbitalElements(4.853e11, 0.1828, 15.921, 107.018, 286.434, 109.686),
    diameter: 289000,
    albedo: 0.071,
    spectralType: 'C',
    mass: 2.4e19,
  },
  {
    id: 'sylvia',
    name: '87 Sylvia',
    elements: createOrbitalElements(5.212e11, 0.0953, 10.855, 73.321, 258.485, 240.763),
    diameter: 271000,
    albedo: 0.043,
    spectralType: 'X',
    mass: 1.5e19,
  },
  {
    id: 'kamilla',
    name: '1620 Geographos',
    elements: createOrbitalElements(2.535e11, 0.3354, 13.338, 337.019, 276.651, 15.490),
    diameter: 253000,
    albedo: 0.136,
    spectralType: 'M',
    mass: 1.1e19,
  },
  {
    id: 'psyche',
    name: '16 Psyche',
    elements: createOrbitalElements(4.371e11, 0.1403, 3.096, 150.108, 228.275, 29.388),
    diameter: 226000,
    albedo: 0.144,
    spectralType: 'M',
    mass: 2.2e19,
  },
];

// Kirkwood gaps (resonances) in the asteroid belt
export interface KirkwoodGap {
  ratio: number; // p:q resonance with Jupiter
  semiMajorAxis: number; // AU
  description: string;
}

export const KIRKWOOD_GAPS: KirkwoodGap[] = [
  { ratio: 5 / 2, semiMajorAxis: 2.823, description: '5:2 resonance with Jupiter' },
  { ratio: 7 / 3, semiMajorAxis: 2.956, description: '7:3 resonance with Jupiter' },
  { ratio: 3 / 1, semiMajorAxis: 2.502, description: '3:1 resonance with Jupiter' },
  { ratio: 8 / 3, semiMajorAxis: 2.706, description: '8:3 resonance with Jupiter' },
  { ratio: 9 / 4, semiMajorAxis: 3.028, description: '9:4 resonance with Jupiter' },
  { ratio: 11 / 5, semiMajorAxis: 3.075, description: '11:5 resonance with Jupiter' },
  { ratio: 2 / 1, semiMajorAxis: 3.279, description: '2:1 resonance with Jupiter' },
];

// Asteroid families (clusters with similar orbital elements)
export interface AsteroidFamily {
  name: string;
  semiMajorAxisRange: [number, number]; // AU
  eccentricityRange: [number, number];
  inclinationRange: [number, number]; // degrees
  memberCount: number;
  dominantType: string;
}

export const ASTEROID_FAMILIES: AsteroidFamily[] = [
  { name: 'Flora', semiMajorAxisRange: [2.15, 2.35], eccentricityRange: [0.08, 0.18], inclinationRange: [3, 8], memberCount: 13000, dominantType: 'S' },
  { name: 'Eunomia', semiMajorAxisRange: [2.52, 2.65], eccentricityRange: [0.12, 0.18], inclinationRange: [12, 16], memberCount: 13000, dominantType: 'S' },
  { name: 'Koronis', semiMajorAxisRange: [2.83, 2.91], eccentricityRange: [0.03, 0.11], inclinationRange: [1, 3], memberCount: 5900, dominantType: 'S' },
  { name: 'Eos', semiMajorAxisRange: [2.99, 3.04], eccentricityRange: [0.01, 0.13], inclinationRange: [8, 12], memberCount: 9000, dominantType: 'K' },
  { name: 'Themis', semiMajorAxisRange: [3.08, 3.23], eccentricityRange: [0.09, 0.23], inclinationRange: [0.5, 2.5], memberCount: 5200, dominantType: 'C' },
  { name: 'Maria', semiMajorAxisRange: [2.52, 2.62], eccentricityRange: [0.05, 0.20], inclinationRange: [12, 17], memberCount: 3000, dominantType: 'S' },
  { name: 'Nysa', semiMajorAxisRange: [2.39, 2.46], eccentricityRange: [0.12, 0.22], inclinationRange: [1.5, 3.5], memberCount: 2000, dominantType: 'F' },
  { name: 'Dora', semiMajorAxisRange: [2.71, 2.82], eccentricityRange: [0.06, 0.18], inclinationRange: [5, 9], memberCount: 1400, dominantType: 'C' },
];

// Belt properties
export const ASTEROID_BELT = {
  innerEdge: 2.06, // AU (Mars orbit ~1.52 AU)
  outerEdge: 3.27, // AU (Jupiter orbit ~5.2 AU)
  center: 2.7,
  thickness: 1.0, // AU vertical extent
  totalMass: 2.8e21, // kg (~3% of Moon mass)
  estimatedCount: 1.9e6, // >1 km diameter
  knownCount: 1100000, // numbered/observed
  mainBeltDensity: 1.0,
  trojanDensity: 0.3,
};

// Kuiper Belt parameters
export const KUIPER_BELT = {
  innerEdge: 30, // AU (Neptune orbit)
  outerEdge: 55, // AU
  center: 42,
  thickness: 10, // AU
  totalMass: 3e22, // kg (estimate)
  estimatedCount: 100000, // >100 km diameter
  knownCount: 2000,
  classicalDensity: 1.0,
  scatteredDensity: 0.2,
  resonantDensity: 0.4,
};

// Kuiper Belt objects (notable)
export const NOTABLE_KBO: BeltAsteroid[] = [
  {
    id: 'makemake',
    name: '136472 Makemake',
    elements: createOrbitalElements(6.807e12, 0.159, 28.98, 79.62, 294.79, 165.52),
    diameter: 1430000,
    albedo: 0.77,
    spectralType: 'I',
    mass: 3.1e21,
  },
  {
    id: 'haumea',
    name: '136108 Haumea',
    elements: createOrbitalElements(6.426e12, 0.199, 28.22, 122.18, 239.32, 238.17),
    diameter: 1600000,
    albedo: 0.51,
    spectralType: 'I',
    mass: 4.0e21,
  },
  {
    id: 'quaoar',
    name: '50000 Quaoar',
    elements: createOrbitalElements(6.438e12, 0.041, 8.0, 188.94, 149.87, 330.97),
    diameter: 1110000,
    albedo: 0.12,
    spectralType: 'I',
    mass: 1.4e21,
  },
  {
    id: 'sedna',
    name: '90377 Sedna',
    elements: createOrbitalElements(7.45e13, 0.856, 11.93, 144.36, 311.05, 358.18),
    diameter: 995000,
    albedo: 0.32,
    spectralType: 'I',
    mass: 1.0e21,
  },
  {
    id: 'eris',
    name: '136199 Eris',
    elements: createOrbitalElements(1.016e13, 0.436, 43.99, 35.95, 151.10, 205.99),
    diameter: 2326000,
    albedo: 0.96,
    spectralType: 'I',
    mass: 1.66e22,
  },
];

// Trojans (Jupiter L4/L5)
export const JUPITER_TROJANS: Array<{ id: string; name: string; camp: 'L4' | 'L5' }> = [
  { id: 'hektor', name: '624 Hektor', camp: 'L4' },
  { id: 'patroclus', name: '617 Patroclus', camp: 'L5' },
  { id: 'achilles', name: '588 Achilles', camp: 'L4' },
  { id: 'agamemnon', name: '911 Agamemnon', camp: 'L4' },
  { id: 'aeneas', name: '1172 Aeneas', camp: 'L5' },
  { id: 'troilus', name: '1208 Troilus', camp: 'L5' },
  { id: 'priamus', name: '884 Priamus', camp: 'L5' },
  { id: 'nestedor', name: '659 Nestor', camp: 'L4' },
];

// Generate procedural asteroid field for rendering
export function generateAsteroidField(
  count: number,
  belt: 'main' | 'kuiper' | 'trojan-l4' | 'trojan-l5'
): Array<{ a: number; e: number; i: number; om: number; w: number; M: number; size: number }> {
  const AU = 1.496e11; // meters
  const field: Array<{ a: number; e: number; i: number; om: number; w: number; M: number; size: number }> = [];

  let aMin: number, aMax: number, eMax: number, iMax: number;

  switch (belt) {
    case 'main':
      aMin = 2.1 * AU;
      aMax = 3.3 * AU;
      eMax = 0.3;
      iMax = 25;
      break;
    case 'kuiper':
      aMin = 30 * AU;
      aMax = 55 * AU;
      eMax = 0.3;
      iMax = 35;
      break;
    case 'trojan-l4':
    case 'trojan-l5':
      aMin = 5.05 * AU;
      aMax = 5.35 * AU;
      eMax = 0.25;
      iMax = 40;
      break;
  }

  // Simple seeded random for deterministic field
  let seed = 12345;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  // Bias toward belt center (2.7 AU for main belt)
  const center = aMin + (aMax - aMin) * 0.5;

  for (let i = 0; i < count; i++) {
    let a: number;
    if (belt === 'main') {
      // Gaussian-ish clustering around 2.7 AU
      const u1 = rand();
      const u2 = rand();
      const g = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      a = center + g * (aMax - aMin) * 0.15;
      if (a < aMin) a = aMin + rand() * (aMax - aMin) * 0.1;
      if (a > aMax) a = aMax - rand() * (aMax - aMin) * 0.1;
    } else {
      a = aMin + rand() * (aMax - aMin);
    }

    const e = rand() * eMax;
    const i = (belt === 'trojan-l4' || belt === 'trojan-l5')
      ? (rand() - 0.5) * iMax * 2
      : rand() * iMax;
    const om = rand() * 360;
    const w = rand() * 360;
    const M = rand() * 360;
    const size = 100 + rand() * 4000; // 100m to 4km

    field.push({ a, e, i, om, w, M, size });
  }

  return field;
}

// Trojan camps are at Jupiter's L4 (60° ahead) and L5 (60° behind)
export const TROJAN_CAMP_OFFSETS = {
  L4: 60, // degrees ahead of Jupiter
  L5: 300, // degrees behind Jupiter (= -60)
};
