/**
 * Major Moon Data - Real orbital elements and physical properties
 * Based on NASA JPL Horizons, JPL satellite ephemerides
 * Epoch: J2000.0 (2451545.0 JD)
 *
 * Orbital elements relative to parent planet
 */

import { CelestialBodyData, OrbitalElements, PhysicalProperties, VisualProperties } from '@/types/orbitalElements';
import {
  GM_EARTH, GM_MARS, GM_JUPITER, GM_SATURN, GM_URANUS, GM_NEPTUNE, GM_PLUTO,
  DEG_TO_RAD, RADIUS_MOON,
} from '@/engine/Constants';

const EPOCH = 2451545.0;

// Helper functions
function createOrbitalElements(
  a: number, e: number, i: number, omega: number, w: number, M0: number,
  mu: number, period: number
): OrbitalElements {
  return {
    semiMajorAxis: a,
    eccentricity: e,
    inclination: i,
    longitudeOfAscendingNode: omega,
    argumentOfPeriapsis: w,
    meanAnomalyAtEpoch: M0,
    epoch: EPOCH,
    gravitationalParameter: mu,
    orbitalPeriod: period,
  };
}

function createPhysical(
  mass: number, radius: number, rotationPeriod: number, axialTilt: number,
  density: number, albedo: number, temp?: number, polarRadius?: number
): PhysicalProperties {
  const G = 6.67430e-11;
  const surfaceGravity = G * mass / (radius * radius);
  const escapeVelocity = Math.sqrt(2 * G * mass / radius);
  return {
    mass,
    radius,
    polarRadius,
    rotationPeriod,
    axialTilt,
    surfaceGravity,
    escapeVelocity,
    density,
    effectiveTemperature: temp,
    albedo,
  };
}

function createVisual(
  baseColor: string,
  textures: VisualProperties['textures'],
  hasAtmosphere: boolean,
  atmosphereColor?: string,
  atmosphereThickness?: number,
  customShader?: string
): VisualProperties {
  return {
    baseColor,
    textures,
    hasAtmosphere,
    atmosphereColor,
    atmosphereThickness,
    customShader,
    lodDistances: [1e6, 5e6, 2e7, 1e8],
  };
}

// ============================================
// EARTH'S MOON
// ============================================
export const MOON: CelestialBodyData = {
  id: 'moon',
  name: 'Moon',
  type: 'moon',
  physical: createPhysical(
    7.342e22,
    RADIUS_MOON,
    27.321661 * 86400,  // Synchronous rotation
    6.687 * DEG_TO_RAD,   // Inclination to ecliptic
    3344,
    0.12,
    270,
    1736000
  ),
  orbital: createOrbitalElements(
    384400000,          // 384,400 km
    0.0549,
    5.145 * DEG_TO_RAD, // Inclination to Earth's equator
    125.08 * DEG_TO_RAD, // Longitude of ascending node
    318.15 * DEG_TO_RAD, // Argument of periapsis
    135.27 * DEG_TO_RAD, // Mean anomaly at epoch
    GM_EARTH,
    27.321661 * 86400
  ),
  parentId: 'earth',
  childrenIds: [],
  visual: createVisual(
    '#b5b5b5',
    {
      diffuse: '/textures/moon_diffuse.jpg',
      normal: '/textures/moon_normal.jpg',
      elevation: '/textures/moon_elevation.jpg',
    },
    false,
    undefined,
    undefined,
    'moon'
  ),
  metadata: {
    discoveryDate: 'ancient',
    discoverer: 'N/A',
    designations: ['Luna', 'Selene'],
    orbitalGroup: 'Earth\'s Moon',
    description: 'Earth\'s only natural satellite. Synchronous rotation (same face always visible). Formed from giant impact ~4.5 Gyr ago. Apollo landing sites.',
    url: 'https://solarsystem.nasa.gov/moons/earths-moon/overview/',
  },
};

// ============================================
// MARS MOONS
// ============================================
export const PHOBOS: CelestialBodyData = {
  id: 'phobos',
  name: 'Phobos',
  type: 'moon',
  physical: createPhysical(
    1.0659e16,
    11267,
    7.65 * 3600,  // Synchronous
    0,
    1876,
    0.071,
    233,
  ),
  orbital: createOrbitalElements(
    9376000,          // 9,376 km
    0.0151,
    1.082 * DEG_TO_RAD,
    16.8 * DEG_TO_RAD,
    147.8 * DEG_TO_RAD,
    0,
    GM_MARS,
    7.65 * 3600
  ),
  parentId: 'mars',
  childrenIds: [],
  visual: createVisual(
    '#777777',
    { diffuse: '/textures/phobos_diffuse.jpg' },
    false,
    undefined,
    undefined,
    'moon'
  ),
  metadata: {
    discoveryDate: '1877-08-18',
    discoverer: 'Asaph Hall',
    designations: ['Mars I'],
    orbitalGroup: 'Mars Moons',
    description: 'Larger, inner moon of Mars. Orbits below synchronous altitude - rising in west, setting in east. Spiraling inward (will crash in ~50 Myr). Stickney crater.',
    url: 'https://solarsystem.nasa.gov/moons/mars-moons/phobos/overview/',
  },
};

export const DEIMOS: CelestialBodyData = {
  id: 'deimos',
  name: 'Deimos',
  type: 'moon',
  physical: createPhysical(
    2.24e15,
    6200,
    30.3 * 3600,  // Synchronous
    0,
    1471,
    0.068,
    233,
  ),
  orbital: createOrbitalElements(
    23460000,         // 23,460 km
    0.00033,
    1.793 * DEG_TO_RAD,
    357.3 * DEG_TO_RAD,
    158.0 * DEG_TO_RAD,
    0,
    GM_MARS,
    30.3 * 3600
  ),
  parentId: 'mars',
  childrenIds: [],
  visual: createVisual(
    '#777777',
    { diffuse: '/textures/deimos_diffuse.jpg' },
    false,
    undefined,
    undefined,
    'moon'
  ),
  metadata: {
    discoveryDate: '1877-08-12',
    discoverer: 'Asaph Hall',
    designations: ['Mars II'],
    orbitalGroup: 'Mars Moons',
    description: 'Smaller, outer moon of Mars. Smooth appearance from regolith filling craters. Orbits near synchronous altitude.',
    url: 'https://solarsystem.nasa.gov/moons/mars-moons/deimos/overview/',
  },
};

// ============================================
// JUPITER'S GALILEAN MOONS
// ============================================
export const IO: CelestialBodyData = {
  id: 'io',
  name: 'Io',
  type: 'moon',
  physical: createPhysical(
    8.9319e22,
    1821600,
    1.769137 * 86400,  // Synchronous
    0.036 * DEG_TO_RAD,
    3528,
    0.61,
    110,
  ),
  orbital: createOrbitalElements(
    421700000,        // 421,700 km
    0.0041,
    0.050 * DEG_TO_RAD, // To Jupiter's equator
    102.0 * DEG_TO_RAD,
    330.0 * DEG_TO_RAD,
    0,
    GM_JUPITER,
    1.769137 * 86400
  ),
  parentId: 'jupiter',
  childrenIds: [],
  visual: createVisual(
    '#f0e0b0',
    {
      diffuse: '/textures/io_diffuse.jpg',
      normal: '/textures/io_normal.jpg',
    },
    true,
    '#ff8800',
    0.001,
    'io'
  ),
  metadata: {
    discoveryDate: '1610-01-08',
    discoverer: 'Galileo Galilei',
    designations: ['Jupiter I'],
    orbitalGroup: 'Galilean Moons',
    description: 'Most volcanically active body in solar system. 400+ active volcanoes. Tidal heating from orbital resonance with Europa & Ganymede. Sulfur/sulfur dioxide surface.',
    url: 'https://solarsystem.nasa.gov/moons/jupiter-moons/io/overview/',
  },
};

export const EUROPA: CelestialBodyData = {
  id: 'europa',
  name: 'Europa',
  type: 'moon',
  physical: createPhysical(
    4.7998e22,
    1560800,
    3.551181 * 86400,  // Synchronous
    0.09 * DEG_TO_RAD,
    3013,
    0.64,
    102,
  ),
  orbital: createOrbitalElements(
    671100000,        // 671,100 km
    0.0094,
    0.470 * DEG_TO_RAD,
    101.0 * DEG_TO_RAD,
    226.0 * DEG_TO_RAD,
    0,
    GM_JUPITER,
    3.551181 * 86400
  ),
  parentId: 'jupiter',
  childrenIds: [],
  visual: createVisual(
    '#e8e8d0',
    {
      diffuse: '/textures/europa_diffuse.jpg',
      normal: '/textures/europa_normal.jpg',
    },
    false,
    undefined,
    undefined,
    'europa'
  ),
  metadata: {
    discoveryDate: '1610-01-08',
    discoverer: 'Galileo Galilei',
    designations: ['Jupiter II'],
    orbitalGroup: 'Galilean Moons',
    description: 'Smooth icy surface with few craters. Likely subsurface ocean (2x Earth\'s water). Prime target for astrobiology. Lineae from tidal cracking.',
    url: 'https://solarsystem.nasa.gov/moons/jupiter-moons/europa/overview/',
  },
};

export const GANYMEDE: CelestialBodyData = {
  id: 'ganymede',
  name: 'Ganymede',
  type: 'moon',
  physical: createPhysical(
    1.4819e23,
    2634100,
    7.154553 * 86400,  // Synchronous
    0.17 * DEG_TO_RAD,
    1942,
    0.43,
    110,
  ),
  orbital: createOrbitalElements(
    1070400000,       // 1,070,400 km
    0.0013,
    0.204 * DEG_TO_RAD,
    100.0 * DEG_TO_RAD,
    268.0 * DEG_TO_RAD,
    0,
    GM_JUPITER,
    7.154553 * 86400
  ),
  parentId: 'jupiter',
  childrenIds: [],
  visual: createVisual(
    '#b8b8a0',
    {
      diffuse: '/textures/ganymede_diffuse.jpg',
      normal: '/textures/ganymede_normal.jpg',
    },
    false,
    undefined,
    undefined,
    'ganymede'
  ),
  metadata: {
    discoveryDate: '1610-01-07',
    discoverer: 'Galileo Galilei',
    designations: ['Jupiter III'],
    orbitalGroup: 'Galilean Moons',
    description: 'Largest moon in solar system (larger than Mercury). Only moon with intrinsic magnetic field. Subsurface ocean. Differentiated interior.',
    url: 'https://solarsystem.nasa.gov/moons/jupiter-moons/ganymede/overview/',
  },
};

export const CALLISTO: CelestialBodyData = {
  id: 'callisto',
  name: 'Callisto',
  type: 'moon',
  physical: createPhysical(
    1.0759e23,
    2410300,
    16.689018 * 86400, // Synchronous
    0.19 * DEG_TO_RAD,
    1834,
    0.22,
    134,
  ),
  orbital: createOrbitalElements(
    1882700000,       // 1,882,700 km
    0.0074,
    0.281 * DEG_TO_RAD,
    98.0 * DEG_TO_RAD,
    44.0 * DEG_TO_RAD,
    0,
    GM_JUPITER,
    16.689018 * 86400
  ),
  parentId: 'jupiter',
  childrenIds: [],
  visual: createVisual(
    '#888888',
    {
      diffuse: '/textures/callisto_diffuse.jpg',
      normal: '/textures/callisto_normal.jpg',
    },
    false,
    undefined,
    undefined,
    'callisto'
  ),
  metadata: {
    discoveryDate: '1610-01-13',
    discoverer: 'Galileo Galilei',
    designations: ['Jupiter IV'],
    orbitalGroup: 'Galilean Moons',
    description: 'Most heavily cratered object in solar system. Ancient surface (~4 Gyr). Possible subsurface ocean. Not in orbital resonance.',
    url: 'https://solarsystem.nasa.gov/moons/jupiter-moons/callisto/overview/',
  },
};

// ============================================
// SATURN'S MAJOR MOONS
// ============================================
export const TITAN: CelestialBodyData = {
  id: 'titan',
  name: 'Titan',
  type: 'moon',
  physical: createPhysical(
    1.3452e23,
    2574730,
    15.945 * 86400,   // Synchronous
    0.33 * DEG_TO_RAD,
    1879,
    0.22,
    94,
  ),
  orbital: createOrbitalElements(
    1221870000,       // 1,221,870 km
    0.0288,
    0.348 * DEG_TO_RAD, // To Saturn's equator
    168.0 * DEG_TO_RAD,
    190.0 * DEG_TO_RAD,
    0,
    GM_SATURN,
    15.945 * 86400
  ),
  parentId: 'saturn',
  childrenIds: [],
  visual: createVisual(
    '#d4a876',
    {
      diffuse: '/textures/titan_diffuse.jpg',
      normal: '/textures/titan_normal.jpg',
      clouds: '/textures/titan_clouds.jpg',
    },
    true,
    '#e8c88c',
    0.05,
    'titan'
  ),
  metadata: {
    discoveryDate: '1655-03-25',
    discoverer: 'Christiaan Huygens',
    designations: ['Saturn VI'],
    orbitalGroup: 'Major Moons of Saturn',
    description: 'Only moon with dense atmosphere (1.5x Earth pressure). Nitrogen/methane atmosphere. Liquid methane/ethane lakes. Prebiotic chemistry. Huygens probe landing 2005.',
    url: 'https://solarsystem.nasa.gov/moons/saturn-moons/titan/overview/',
  },
};

export const ENCELADUS: CelestialBodyData = {
  id: 'enceladus',
  name: 'Enceladus',
  type: 'moon',
  physical: createPhysical(
    1.08e20,
    252100,
    1.370218 * 86400, // Synchronous
    0.01 * DEG_TO_RAD,
    1609,
    0.99,  // Highest albedo in solar system
    75,
  ),
  orbital: createOrbitalElements(
    238040000,        // 238,040 km
    0.0047,
    0.009 * DEG_TO_RAD,
    165.0 * DEG_TO_RAD,
    120.0 * DEG_TO_RAD,
    0,
    GM_SATURN,
    1.370218 * 86400
  ),
  parentId: 'saturn',
  childrenIds: [],
  visual: createVisual(
    '#ffffff',
    {
      diffuse: '/textures/enceladus_diffuse.jpg',
      normal: '/textures/enceladus_normal.jpg',
    },
    false,
    undefined,
    undefined,
    'enceladus'
  ),
  metadata: {
    discoveryDate: '1789-08-28',
    discoverer: 'William Herschel',
    designations: ['Saturn II'],
    orbitalGroup: 'Major Moons of Saturn',
    description: 'Active cryovolcanism - geysers from "tiger stripes" at south pole. Subsurface global ocean. Source of Saturn\'s E ring. Highest albedo (0.99).',
    url: 'https://solarsystem.nasa.gov/moons/saturn-moons/enceladus/overview/',
  },
};

export const MIMAS: CelestialBodyData = {
  id: 'mimas',
  name: 'Mimas',
  type: 'moon',
  physical: createPhysical(
    3.75e19,
    198200,
    0.942 * 86400,
    1.57 * DEG_TO_RAD,
    1150,
    0.96,
    64,
  ),
  orbital: createOrbitalElements(
    185520000,
    0.0196,
    1.57 * DEG_TO_RAD,
    148.0 * DEG_TO_RAD,
    85.0 * DEG_TO_RAD,
    0,
    GM_SATURN,
    0.942 * 86400
  ),
  parentId: 'saturn',
  childrenIds: [],
  visual: createVisual(
    '#aaaaaa',
    { diffuse: '/textures/mimas_diffuse.jpg' },
    false,
    undefined,
    undefined,
    'moon'
  ),
  metadata: {
    discoveryDate: '1789-09-17',
    discoverer: 'William Herschel',
    designations: ['Saturn I'],
    orbitalGroup: 'Major Moons of Saturn',
    description: '"Death Star" moon - huge Herschel crater (130 km, 1/3 diameter). Lowest density of any major moon. Possible subsurface ocean.',
    url: 'https://solarsystem.nasa.gov/moons/saturn-moons/mimas/overview/',
  },
};

export const RHEA: CelestialBodyData = {
  id: 'rhea',
  name: 'Rhea',
  type: 'moon',
  physical: createPhysical(
    2.31e21,
    763800,
    4.518 * 86400,
    0.35 * DEG_TO_RAD,
    1236,
    0.70,
    53,
  ),
  orbital: createOrbitalElements(
    527108000,
    0.001,
    0.35 * DEG_TO_RAD,
    143.0 * DEG_TO_RAD,
    78.0 * DEG_TO_RAD,
    0,
    GM_SATURN,
    4.518 * 86400
  ),
  parentId: 'saturn',
  childrenIds: [],
  visual: createVisual(
    '#cccccc',
    { diffuse: '/textures/rhea_diffuse.jpg' },
    false,
    undefined,
    undefined,
    'moon'
  ),
  metadata: {
    discoveryDate: '1672-12-23',
    discoverer: 'Giovanni Cassini',
    designations: ['Saturn V'],
    orbitalGroup: 'Major Moons of Saturn',
    description: 'Second-largest Saturn moon. Heavily cratered. Possible tenuous ring system (debated). Wispy terrain from ice cliffs.',
    url: 'https://solarsystem.nasa.gov/moons/saturn-moons/rhea/overview/',
  },
};

export const DIONE: CelestialBodyData = {
  id: 'dione',
  name: 'Dione',
  type: 'moon',
  physical: createPhysical(
    1.095e21,
    561400,
    2.737 * 86400,
    0.07 * DEG_TO_RAD,
    1478,
    0.55,
    87,
  ),
  orbital: createOrbitalElements(
    377400000,
    0.0022,
    0.02 * DEG_TO_RAD,
    158.0 * DEG_TO_RAD,
    44.0 * DEG_TO_RAD,
    0,
    GM_SATURN,
    2.737 * 86400
  ),
  parentId: 'saturn',
  childrenIds: [],
  visual: createVisual(
    '#bbbbbb',
    { diffuse: '/textures/dione_diffuse.jpg' },
    false,
    undefined,
    undefined,
    'moon'
  ),
  metadata: {
    discoveryDate: '1684-03-21',
    discoverer: 'Giovanni Cassini',
    designations: ['Saturn IV'],
    orbitalGroup: 'Major Moons of Saturn',
    description: 'Bright wispy terrain (ice cliffs). Possible subsurface ocean. Shares orbit with Helene (L4) and Polydeuces (L5).',
    url: 'https://solarsystem.nasa.gov/moons/saturn-moons/dione/overview/',
  },
};

export const TETHYS: CelestialBodyData = {
  id: 'tethys',
  name: 'Tethys',
  type: 'moon',
  physical: createPhysical(
    6.17e20,
    531100,
    1.888 * 86400,
    1.09 * DEG_TO_RAD,
    984,
    0.90,
    86,
  ),
  orbital: createOrbitalElements(
    294670000,
    0.0001,
    1.09 * DEG_TO_RAD,
    150.0 * DEG_TO_RAD,
    108.0 * DEG_TO_RAD,
    0,
    GM_SATURN,
    1.888 * 86400
  ),
  parentId: 'saturn',
  childrenIds: [],
  visual: createVisual(
    '#eeeeee',
    { diffuse: '/textures/tethys_diffuse.jpg' },
    false,
    undefined,
    undefined,
    'moon'
  ),
  metadata: {
    discoveryDate: '1684-03-21',
    discoverer: 'Giovanni Cassini',
    designations: ['Saturn III'],
    orbitalGroup: 'Major Moons of Saturn',
    description: 'Large Ithaca Chasma canyon (2000 km long). Odysseus crater (400 km). Co-orbital with Telesto (L4) and Calypso (L5). Very high albedo.',
    url: 'https://solarsystem.nasa.gov/moons/saturn-moons/tethys/overview/',
  },
};

export const IAPETUS: CelestialBodyData = {
  id: 'iapetus',
  name: 'Iapetus',
  type: 'moon',
  physical: createPhysical(
    1.806e21,
    734500,
    79.33 * 86400,  // Synchronous but slow
    15.47 * DEG_TO_RAD, // High inclination
    1088,
    0.5,  // Bimodal: 0.05 (dark) to 0.5 (bright)
    90,
  ),
  orbital: createOrbitalElements(
    3561300000,
    0.0283,
    15.47 * DEG_TO_RAD,
    176.0 * DEG_TO_RAD,
    200.0 * DEG_TO_RAD,
    0,
    GM_SATURN,
    79.33 * 86400
  ),
  parentId: 'saturn',
  childrenIds: [],
  visual: createVisual(
    '#888844',  // Average of bright/dark
    { diffuse: '/textures/iapetus_diffuse.jpg' },
    false,
    undefined,
    undefined,
    'iapetus'
  ),
  metadata: {
    discoveryDate: '1671-10-25',
    discoverer: 'Giovanni Cassini',
    designations: ['Saturn VIII'],
    orbitalGroup: 'Major Moons of Saturn',
    description: 'Two-tone coloration: bright trailing hemisphere, dark leading hemisphere (Cassini Regio). Equatorial ridge (13 km high, 20 km wide). High inclination orbit.',
    url: 'https://solarsystem.nasa.gov/moons/saturn-moons/iapetus/overview/',
  },
};

// ============================================
// URANUS MOONS
// ============================================
export const MIRANDA: CelestialBodyData = {
  id: 'miranda',
  name: 'Miranda',
  type: 'moon',
  physical: createPhysical(
    6.59e19,
    235800,
    1.413 * 86400,
    0,
    1200,
    0.32,
    85,
  ),
  orbital: createOrbitalElements(
    129900000,
    0.0013,
    4.34 * DEG_TO_RAD, // To Uranus equator
    190.0 * DEG_TO_RAD,
    88.0 * DEG_TO_RAD,
    0,
    GM_URANUS,
    1.413 * 86400
  ),
  parentId: 'uranus',
  childrenIds: [],
  visual: createVisual(
    '#cccccc',
    { diffuse: '/textures/miranda_diffuse.jpg' },
    false,
    undefined,
    undefined,
    'moon'
  ),
  metadata: {
    discoveryDate: '1948-02-16',
    discoverer: 'Gerard Kuiper',
    designations: ['Uranus V'],
    orbitalGroup: 'Major Moons of Uranus',
    description: 'Extreme geological variety - giant fault canyons (20 km deep), coronae. Possible past tidal heating. "Frankenstein moon" appearance.',
    url: 'https://solarsystem.nasa.gov/moons/uranus-moons/miranda/overview/',
  },
};

export const ARIEL: CelestialBodyData = {
  id: 'ariel',
  name: 'Ariel',
  type: 'moon',
  physical: createPhysical(
    1.35e21,
    578900,
    2.52 * 86400,
    0,
    1660,
    0.39,
    85,
  ),
  orbital: createOrbitalElements(
    191020000,
    0.0012,
    0.26 * DEG_TO_RAD,
    172.0 * DEG_TO_RAD,
    127.0 * DEG_TO_RAD,
    0,
    GM_URANUS,
    2.52 * 86400
  ),
  parentId: 'uranus',
  childrenIds: [],
  visual: createVisual(
    '#dddddd',
    { diffuse: '/textures/ariel_diffuse.jpg' },
    false,
    undefined,
    undefined,
    'moon'
  ),
  metadata: {
    discoveryDate: '1851-10-24',
    discoverer: 'William Lassell',
    designations: ['Uranus I'],
    orbitalGroup: 'Major Moons of Uranus',
    description: 'Brightest Uranian moon. Young surface with few craters. Extensive canyon systems (chasma). Possible past cryovolcanism.',
    url: 'https://solarsystem.nasa.gov/moons/uranus-moons/ariel/overview/',
  },
};

export const UMBRIEL: CelestialBodyData = {
  id: 'umbriel',
  name: 'Umbriel',
  type: 'moon',
  physical: createPhysical(
    1.17e21,
    584700,
    4.144 * 86400,
    0,
    1400,
    0.19,
    85,
  ),
  orbital: createOrbitalElements(
    266300000,
    0.0039,
    0.20 * DEG_TO_RAD,
    168.0 * DEG_TO_RAD,
    76.0 * DEG_TO_RAD,
    0,
    GM_URANUS,
    4.144 * 86400
  ),
  parentId: 'uranus',
  childrenIds: [],
  visual: createVisual(
    '#888888',
    { diffuse: '/textures/umbriel_diffuse.jpg' },
    false,
    undefined,
    undefined,
    'moon'
  ),
  metadata: {
    discoveryDate: '1851-10-24',
    discoverer: 'William Lassell',
    designations: ['Uranus II'],
    orbitalGroup: 'Major Moons of Uranus',
    description: 'Darkest Uranian moon. Ancient heavily cratered surface. Bright crater Wunda (140 km) stands out. No signs of recent geological activity.',
    url: 'https://solarsystem.nasa.gov/moons/uranus-moons/umbriel/overview/',
  },
};

export const TITANIA: CelestialBodyData = {
  id: 'titania',
  name: 'Titania',
  type: 'moon',
  physical: createPhysical(
    3.53e21,
    788400,
    8.706 * 86400,
    0,
    1710,
    0.27,
    85,
  ),
  orbital: createOrbitalElements(
    436300000,
    0.0011,
    0.34 * DEG_TO_RAD,
    166.0 * DEG_TO_RAD,
    72.0 * DEG_TO_RAD,
    0,
    GM_URANUS,
    8.706 * 86400
  ),
  parentId: 'uranus',
  childrenIds: [],
  visual: createVisual(
    '#aaaaaa',
    { diffuse: '/textures/titania_diffuse.jpg' },
    false,
    undefined,
    undefined,
    'moon'
  ),
  metadata: {
    discoveryDate: '1787-01-11',
    discoverer: 'William Herschel',
    designations: ['Uranus III'],
    orbitalGroup: 'Major Moons of Uranus',
    description: 'Largest Uranian moon. Giant fault system (Messina Chasma, 1500 km). Possible past cryovolcanism. Thin CO₂ atmosphere detected.',
    url: 'https://solarsystem.nasa.gov/moons/uranus-moons/titania/overview/',
  },
};

export const OBERON: CelestialBodyData = {
  id: 'oberon',
  name: 'Oberon',
  type: 'moon',
  physical: createPhysical(
    3.01e21,
    761400,
    13.46 * 86400,
    0,
    1630,
    0.21,
    85,
  ),
  orbital: createOrbitalElements(
    583500000,
    0.0014,
    0.05 * DEG_TO_RAD,
    163.0 * DEG_TO_RAD,
    45.0 * DEG_TO_RAD,
    0,
    GM_URANUS,
    13.46 * 86400
  ),
  parentId: 'uranus',
  childrenIds: [],
  visual: createVisual(
    '#999999',
    { diffuse: '/textures/oberon_diffuse.jpg' },
    false,
    undefined,
    undefined,
    'moon'
  ),
  metadata: {
    discoveryDate: '1787-01-11',
    discoverer: 'William Herschel',
    designations: ['Uranus IV'],
    orbitalGroup: 'Major Moons of Uranus',
    description: 'Outermost major Uranian moon. Heavily cratered. Large mountain (6 km) in Hamlet crater. Possible subsurface ocean at core-mantle boundary.',
    url: 'https://solarsystem.nasa.gov/moons/uranus-moons/oberon/overview/',
  },
};

// ============================================
// NEPTUNE MOONS
// ============================================
export const TRITON: CelestialBodyData = {
  id: 'triton',
  name: 'Triton',
  type: 'moon',
  physical: createPhysical(
    2.14e22,
    1353400,
    5.877 * 86400,  // Synchronous, retrograde orbit
    157 * DEG_TO_RAD, // Retrograde equatorial
    2061,
    0.76,
    38,
  ),
  orbital: createOrbitalElements(
    354800000,
    0.000016, // Nearly circular
    157.3 * DEG_TO_RAD, // Retrograde
    210.0 * DEG_TO_RAD,
    333.0 * DEG_TO_RAD,
    0,
    GM_NEPTUNE,
    5.877 * 86400
  ),
  parentId: 'neptune',
  childrenIds: [],
  visual: createVisual(
    '#dddddd',
    {
      diffuse: '/textures/triton_diffuse.jpg',
      normal: '/textures/triton_normal.jpg',
    },
    true,
    '#8888cc',
    0.001,
    'triton'
  ),
  metadata: {
    discoveryDate: '1846-10-10',
    discoverer: 'William Lassell',
    designations: ['Neptune I'],
    orbitalGroup: 'Major Moons of Neptune',
    description: 'Only large retrograde moon (captured Kuiper Belt object). Active geysers (nitrogen). Cantaloupe terrain. Thin N₂ atmosphere. Will be destroyed by tidal forces in ~3.6 Gyr.',
    url: 'https://solarsystem.nasa.gov/moons/neptune-moons/triton/overview/',
  },
};

export const NEREID: CelestialBodyData = {
  id: 'nereid',
  name: 'Nereid',
  type: 'moon',
  physical: createPhysical(
    3.1e19,
    170000,
    11.52 * 3600,
    0,
    1200,
    0.14,
    50,
  ),
  orbital: createOrbitalElements(
    5513400000,
    0.7512,  // Extremely eccentric
    7.23 * DEG_TO_RAD,
    145.0 * DEG_TO_RAD,
    295.0 * DEG_TO_RAD,
    0,
    GM_NEPTUNE,
    360.13 * 86400
  ),
  parentId: 'neptune',
  childrenIds: [],
  visual: createVisual(
    '#aaaaaa',
    { diffuse: '/textures/nereid_diffuse.jpg' },
    false,
    undefined,
    undefined,
    'moon'
  ),
  metadata: {
    discoveryDate: '1949-05-01',
    discoverer: 'Gerard Kuiper',
    designations: ['Neptune II'],
    orbitalGroup: 'Irregular Moons of Neptune',
    description: 'Most eccentric orbit of any regular moon (0.75). Likely captured asteroid. Large brightness variations. Distant, irregular orbit.',
    url: 'https://solarsystem.nasa.gov/moons/neptune-moons/nereid/overview/',
  },
};

// ============================================
// PLUTO'S MOONS
// ============================================
export const CHARON: CelestialBodyData = {
  id: 'charon',
  name: 'Charon',
  type: 'moon',
  physical: createPhysical(
    1.586e21,
    606000,
    6.387 * 86400,  // Synchronous (binary with Pluto)
    0,
    1700,
    0.38,
    53,
  ),
  orbital: createOrbitalElements(
    19591000,  // 19,591 km from barycenter
    0.0002,
    0.001 * DEG_TO_RAD,
    223.0 * DEG_TO_RAD,
    120.0 * DEG_TO_RAD,
    0,
    GM_PLUTO,
    6.387 * 86400
  ),
  parentId: 'pluto',
  childrenIds: [],
  visual: createVisual(
    '#aaaaaa',
    { diffuse: '/textures/charon_diffuse.jpg' },
    false,
    undefined,
    undefined,
    'moon'
  ),
  metadata: {
    discoveryDate: '1978-06-22',
    discoverer: 'James Christy',
    designations: ['Pluto I', '(134340) Pluto I'],
    orbitalGroup: 'Pluto System',
    description: 'Largest moon relative to parent (1/2 diameter, 1/8 mass). Pluto-Charon is a binary system (barycenter outside Pluto). Mutual tidal locking. Red polar cap (Mordor Macula) from Pluto\'s atmospheric escape.',
    url: 'https://solarsystem.nasa.gov/moons/pluto-moons/charon/overview/',
  },
};

// ============================================
// ALL MOONS
// ============================================
export const MAJOR_MOONS: CelestialBodyData[] = [
  // Earth
  MOON,
  // Mars
  PHOBOS, DEIMOS,
  // Jupiter (Galilean)
  IO, EUROPA, GANYMEDE, CALLISTO,
  // Saturn
  TITAN, ENCELADUS, MIMAS, RHEA, DIONE, TETHYS, IAPETUS,
  // Uranus
  MIRANDA, ARIEL, UMBRIEL, TITANIA, OBERON,
  // Neptune
  TRITON, NEREID,
  // Pluto
  CHARON,
];

export const GALILEAN_MOONS = [IO, EUROPA, GANYMEDE, CALLISTO];

export const SATURN_MAJOR_MOONS = [TITAN, ENCELADUS, MIMAS, RHEA, DIONE, TETHYS, IAPETUS];

export const URANUS_MAJOR_MOONS = [MIRANDA, ARIEL, UMBRIEL, TITANIA, OBERON];

export const NEPTUNE_MAJOR_MOONS = [TRITON, NEREID];

export const MOON_LOOKUP: Record<string, CelestialBodyData> = Object.fromEntries(
  MAJOR_MOONS.map(m => [m.id, m])
);

export const MOONS_BY_ID = MOON_LOOKUP;