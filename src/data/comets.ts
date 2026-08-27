import { OrbitalElements, CometData, PhysicalProperties } from '../types/orbitalElements';

// Re-export CometData for consumers
export type { CometData } from '../types/orbitalElements';

// CometDataExtended is just CometData - metadata.description provides the description
export type CometDataExtended = CometData;

/**
 * Known comets with real orbital elements
 * Data from JPL Small-Body Database and IAU Minor Planet Center
 * Semi-major axis in meters, eccentricities for hyperbolic/parabolic comets
 */

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

function createPhysical(
  mass: number, radius: number, rotationPeriod: number, axialTilt: number,
  density: number, albedo: number, temp?: number
): PhysicalProperties {
  const G = 6.67430e-11;
  const surfaceGravity = G * mass / (radius * radius);
  const escapeVelocity = Math.sqrt(2 * G * mass / radius);
  return {
    mass,
    radius,
    rotationPeriod,
    axialTilt,
    surfaceGravity,
    escapeVelocity,
    density,
    effectiveTemperature: temp,
    albedo,
  };
}

export const NOTABLE_COMETS: CometDataExtended[] = [
  {
    id: 'halley',
    name: '1P/Halley',
    designation: '1P',
    type: 'comet',
    orbital: createOrbitalElements(2.683e12, 0.96714, 162.26, 58.42, 111.33, 38.38, 2457200.5),
    physical: createPhysical(2.2e14, 5500, 2.2 * 86400, 0, 600, 0.04, 120),
    perihelionDistance: 0.586,
    period: 75.3,
    lastPerihelion: 2446470.5,
    nextPerihelion: 2488082.5,
    cometType: 'periodic',
    parentId: 'sun',
    childrenIds: [],
    visual: {
      baseColor: '#333333',
      emissiveColor: '#111111',
      textures: {},
      hasAtmosphere: false,
      lodDistances: [1e7, 5e7, 1e8, 5e8],
    },
    metadata: {
      description: 'The only naked-eye comet visible twice in a human lifetime. Returns every ~76 years. Last seen in 1986, next in 2061.',
    },
  },
  {
    id: 'encke',
    name: '2P/Encke',
    designation: '2P',
    type: 'comet',
    orbital: createOrbitalElements(3.281e11, 0.8476, 11.78, 334.04, 186.31, 160.19, 2457200.5),
    physical: createPhysical(7.0e13, 2400, 11.0 * 3600, 0, 500, 0.05, 200),
    perihelionDistance: 0.336,
    period: 3.3,
    lastPerihelion: 2460271.5,
    nextPerihelion: 2460931.5,
    cometType: 'periodic',
    parentId: 'sun',
    childrenIds: [],
    visual: {
      baseColor: '#333333',
      emissiveColor: '#111111',
      textures: {},
      hasAtmosphere: false,
      lodDistances: [1e7, 5e7, 1e8, 5e8],
    },
    metadata: {
      description: 'Shortest-period comet known (~3.3 yr). Has made more recorded appearances than any other comet.',
    },
  },
  {
    id: 'hale-bopp',
    name: 'C/1995 O1 Hale-Bopp',
    designation: 'C/1995 O1',
    type: 'comet',
    orbital: createOrbitalElements(2.669e13, 0.9951, 89.43, 122.24, 130.57, 0.51, 2450800.5),
    physical: createPhysical(1.3e16, 30000, 11.5 * 3600, 0, 600, 0.04, 100),
    perihelionDistance: 0.914,
    period: 2533,
    lastPerihelion: 2450536.5,
    nextPerihelion: 2578436.5,
    cometType: 'long_period',
    parentId: 'sun',
    childrenIds: [],
    visual: {
      baseColor: '#333333',
      emissiveColor: '#111111',
      textures: {},
      hasAtmosphere: false,
      lodDistances: [1e7, 5e7, 1e8, 5e8],
    },
    metadata: {
      description: 'One of the brightest comets of the 20th century. Visible to naked eye for a record 18 months (1996-1997).',
    },
  },
  {
    id: 'hyakutake',
    name: 'C/1996 B2 Hyakutake',
    designation: 'C/1996 B2',
    type: 'comet',
    orbital: createOrbitalElements(-1.875e13, 1.00002, 124.92, 187.69, 130.18, 0.0, 2450150.5),
    physical: createPhysical(1.0e12, 1000, 6.0 * 3600, 0, 500, 0.04, 150),
    perihelionDistance: 0.23,
    period: undefined,
    lastPerihelion: 2450164.5,
    nextPerihelion: undefined,
    cometType: 'hyperbolic',
    parentId: 'sun',
    childrenIds: [],
    visual: {
      baseColor: '#333333',
      emissiveColor: '#111111',
      textures: {},
      hasAtmosphere: false,
      lodDistances: [1e7, 5e7, 1e8, 5e8],
    },
    metadata: {
      description: 'Made a close approach to Earth (0.1 AU) in 1996. Known for its extremely long, prominent blue ion tail.',
    },
  },
  {
    id: 'swift-tuttle',
    name: '109P/Swift-Tuttle',
    designation: '109P',
    type: 'comet',
    orbital: createOrbitalElements(2.684e12, 0.9632, 113.45, 139.44, 152.96, 40.41, 2457200.5),
    physical: createPhysical(2.0e15, 13000, 2.6 * 86400, 0, 600, 0.04, 120),
    perihelionDistance: 0.959,
    period: 133.3,
    lastPerihelion: 2449937.5,
    nextPerihelion: 2501264.5,
    cometType: 'periodic',
    parentId: 'sun',
    childrenIds: [],
    visual: {
      baseColor: '#333333',
      emissiveColor: '#111111',
      textures: {},
      hasAtmosphere: false,
      lodDistances: [1e7, 5e7, 1e8, 5e8],
    },
    metadata: {
      description: 'Source of the Perseid meteor shower. Largest object known to repeatedly pass close to Earth (0.15 AU in 3044).',
    },
  },
  {
    id: 'wild-2',
    name: '81P/Wild',
    designation: '81P',
    type: 'comet',
    orbital: createOrbitalElements(4.916e11, 0.5403, 3.24, 136.16, 41.56, 165.52, 2457200.5),
    physical: createPhysical(2.3e13, 2600, 13.3 * 3600, 0, 600, 0.03, 180),
    perihelionDistance: 1.598,
    period: 6.41,
    lastPerihelion: 2459596.5,
    nextPerihelion: 2462056.5,
    cometType: 'periodic',
    parentId: 'sun',
    childrenIds: [],
    visual: {
      baseColor: '#333333',
      emissiveColor: '#111111',
      textures: {},
      hasAtmosphere: false,
      lodDistances: [1e7, 5e7, 1e8, 5e8],
    },
    metadata: {
      description: 'Target of NASA Stardust mission (2004 flyby). Returned first samples of cometary material to Earth (2006).',
    },
  },
  {
    id: 'tempel-1',
    name: '9P/Tempel',
    designation: '9P',
    type: 'comet',
    orbital: createOrbitalElements(3.122e11, 0.5175, 10.53, 68.62, 178.84, 179.74, 2457200.5),
    physical: createPhysical(7.9e13, 3000, 41.0 * 3600, 0, 600, 0.04, 200),
    perihelionDistance: 1.506,
    period: 5.58,
    lastPerihelion: 2457536.5,
    nextPerihelion: 2461056.5,
    cometType: 'periodic',
    parentId: 'sun',
    childrenIds: [],
    visual: {
      baseColor: '#333333',
      emissiveColor: '#111111',
      textures: {},
      hasAtmosphere: false,
      lodDistances: [1e7, 5e7, 1e8, 5e8],
    },
    metadata: {
      description: 'First comet visited by two spacecraft: Deep Impact (2005 impactor) and Stardust-NExT (2011 flyby).',
    },
  },
  {
    id: 'churyumov-gerasimenko',
    name: '67P/Churyumov-Gerasimenko',
    designation: '67P',
    type: 'comet',
    orbital: createOrbitalElements(3.463e11, 0.6410, 7.04, 50.16, 12.78, 13.53, 2457200.5),
    physical: createPhysical(1.0e13, 2000, 12.4 * 3600, 0, 533, 0.06, 200),
    perihelionDistance: 1.243,
    period: 6.44,
    lastPerihelion: 2459526.5,
    nextPerihelion: 2462106.5,
    cometType: 'periodic',
    parentId: 'sun',
    childrenIds: [],
    visual: {
      baseColor: '#333333',
      emissiveColor: '#111111',
      textures: {},
      hasAtmosphere: false,
      lodDistances: [1e7, 5e7, 1e8, 5e8],
    },
    metadata: {
      description: 'Target of ESA Rosetta mission (2014-2016) - first spacecraft to orbit and land (Philae) on a comet nucleus.',
    },
  },
  {
    id: 'ikeya-seki',
    name: 'C/1965 S1 Ikeya-Seki',
    designation: 'C/1965 S1',
    type: 'comet',
    orbital: createOrbitalElements(-1.234e12, 1.00022, 141.86, 346.07, 69.95, 0.0, 2439100.5),
    physical: createPhysical(1.0e13, 2500, 5.0 * 3600, 0, 600, 0.04, 180),
    perihelionDistance: 0.008,
    period: undefined,
    lastPerihelion: 2439147.5,
    nextPerihelion: undefined,
    cometType: 'hyperbolic',
    parentId: 'sun',
    childrenIds: [],
    visual: {
      baseColor: '#333333',
      emissiveColor: '#111111',
      textures: {},
      hasAtmosphere: false,
      lodDistances: [1e7, 5e7, 1e8, 5e8],
    },
    metadata: {
      description: 'Great Kreutz sungrazer. Passed 450,000 km from Sun\'s surface. One of the brightest comets of the 20th century.',
    },
  },
  {
    id: 'neowise',
    name: 'C/2020 F3 NEOWISE',
    designation: 'C/2020 F3',
    type: 'comet',
    orbital: createOrbitalElements(4.573e12, 0.99914, 128.94, 61.09, 130.48, 0.0, 2459110.5),
    physical: createPhysical(1.0e13, 2500, 7.6 * 3600, 0, 600, 0.03, 180),
    perihelionDistance: 0.295,
    period: 6730,
    lastPerihelion: 2459035.5,
    nextPerihelion: 2485865.5,
    cometType: 'long_period',
    parentId: 'sun',
    childrenIds: [],
    visual: {
      baseColor: '#333333',
      emissiveColor: '#111111',
      textures: {},
      hasAtmosphere: false,
      lodDistances: [1e7, 5e7, 1e8, 5e8],
    },
    metadata: {
      description: 'Bright naked-eye comet of 2020. Visible worldwide. Discovered by NEOWISE space telescope.',
    },
  },
];

export const COMETS_BY_ID: Record<string, CometData> = NOTABLE_COMETS.reduce(
  (acc, c) => {
    acc[c.id] = c;
    return acc;
  },
  {} as Record<string, CometData>
);

// Comet families
export type CometFamily = 'Kreutz Sungrazer' | 'Oort Cloud' | 'Halley-type' | 'Jupiter-family' | 'Encke-type';

export const COMET_FAMILIES: Record<CometFamily, {
  description: string;
  periodRange: string;
  inclinationRange: string;
  count: number;
}> = {
  'Kreutz Sungrazer': {
    description: 'Group of comets from breakup of a large progenitor ~2,300 years ago. All pass extremely close to the Sun.',
    periodRange: '500-1000 yr',
    inclinationRange: '138-145°',
    count: 4000, // estimated members
  },
  'Oort Cloud': {
    description: 'Long-period comets from the Oort Cloud (~2,000-100,000 AU). Near-isotropic inclinations.',
    periodRange: '200+ yr to millions of yr',
    inclinationRange: 'Any (0-180°)',
    count: 1000000, // estimated population
  },
  'Halley-type': {
    description: 'Periodic comets with periods 20-200 yr and often retrograde orbits.',
    periodRange: '20-200 yr',
    inclinationRange: '0-180° (often >90°)',
    count: 85, // observed HTCs
  },
  'Jupiter-family': {
    description: 'Short-period comets (P < 20 yr) with low inclinations, controlled by Jupiter\'s gravity.',
    periodRange: '3-20 yr',
    inclinationRange: '0-40°',
    count: 500, // observed JFCs
  },
  'Encke-type': {
    description: 'Very short-period comets (P < 5 yr) with Tisserand parameter T_J > 3. Only Encke is well-characterized.',
    periodRange: '3-4 yr',
    inclinationRange: '0-20°',
    count: 30, // observed ETCs
  },
};

// Generate procedural comet field (for visual density in deep space)
export function generateCometField(
  count: number,
  region: 'inner' | 'outer' | 'oort'
): Array<{ a: number; e: number; i: number; om: number; w: number; M: number }> {
  const AU = 1.496e11; // meters
  const field: Array<{ a: number; e: number; i: number; om: number; w: number; M: number }> = [];

  let seed = 98765;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  for (let i = 0; i < count; i++) {
    let a: number, e: number, i_: number;

    if (region === 'inner') {
      a = (2 + rand() * 4) * AU; // 2-6 AU
      e = rand() * 0.5;
      i_ = rand() * 30; // low inclination
    } else if (region === 'outer') {
      a = (5 + rand() * 25) * AU; // 5-30 AU
      e = 0.3 + rand() * 0.5;
      i_ = rand() * 45;
    } else { // oort
      a = (200 + rand() * 50000) * AU; // 200-50,000 AU
      e = 0.95 + rand() * 0.05;
      i_ = rand() * 180; // isotropic
    }

    field.push({
      a,
      e,
      i: i_,
      om: rand() * 360,
      w: rand() * 360,
      M: rand() * 360,
    });
  }

  return field;
}

// Oort cloud parameters
export const OORT_CLOUD = {
  innerEdge: 2000, // AU
  outerEdge: 100000, // AU
  totalMass: 3e25, // kg (estimate)
  estimatedCount: 1e12, // comets >1 km
  thickness: 10000, // AU (spherical, but flattened slightly)
};

// Comet tail orientation helper
export function cometTailDirection(
  position: { x: number; y: number; z: number }, // comet position in AU
  sunPosition: { x: number; y: number; z: number } // Sun at origin
): { direction: { x: number; y: number; z: number } } {
  // Tail points anti-sunward (dust) and anti-velocity (plasma)
  const dx = position.x - sunPosition.x;
  const dy = position.y - sunPosition.y;
  const dz = position.z - sunPosition.z;
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
  return {
    direction: { x: -dx / len, y: -dy / len, z: -dz / len },
  };
}
