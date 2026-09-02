/**
 * Planetary Data - Real orbital elements and physical properties
 * Based on NASA JPL Horizons, JPL DE440, IAU 2015 resolutions
 * Epoch: J2000.0 (2451545.0 JD)
 *
 * Orbital elements in radians, distances in meters, masses in kg
 */

import { CelestialBodyData, OrbitalElements, PhysicalProperties, VisualProperties } from '@/types/orbitalElements';
import {
  GM_SUN, GM_EARTH, GM_JUPITER, GM_SATURN,
  AU, RADIUS_MERCURY, RADIUS_VENUS, RADIUS_EARTH, RADIUS_MARS,
  RADIUS_JUPITER, RADIUS_SATURN, RADIUS_URANUS, RADIUS_NEPTUNE, RADIUS_PLUTO,
  PERIOD_MERCURY, PERIOD_VENUS, PERIOD_EARTH, PERIOD_MARS,
  PERIOD_JUPITER, PERIOD_SATURN, PERIOD_URANUS, PERIOD_NEPTUNE, PERIOD_PLUTO,
  PERIOD_MOON, PERIOD_IO, PERIOD_EUROPA, PERIOD_GANYMEDE, PERIOD_CALLISTO,
  PERIOD_TITAN, PERIOD_ENCELADUS,
  RADIUS_MOON, RADIUS_MOON_BODY, RADIUS_IO, RADIUS_EUROPA, RADIUS_GANYMEDE, RADIUS_CALLISTO,
  RADIUS_TITAN, RADIUS_ENCELADUS,
  RADIUS_IO_MOON, RADIUS_EUROPA_MOON, RADIUS_GANYMEDE_MOON,
  RADIUS_CALLISTO_MOON, RADIUS_TITAN_MOON, RADIUS_ENCELADUS_MOON,
  MASS_MOON, MASS_IO, MASS_EUROPA, MASS_GANYMEDE, MASS_CALLISTO,
  MASS_TITAN, MASS_ENCELADUS,
  GM_MOON, GM_IO, GM_EUROPA, GM_GANYMEDE, GM_CALLISTO,
  GM_TITAN, GM_ENCELADUS,
  DEG_TO_RAD,
} from '@/engine/Constants';

const EPOCH = 2451545.0; // J2000.0

// Helper to create orbital elements
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

// Helper to create physical properties
function createPhysical(
  mass: number, radius: number, rotationPeriod: number, axialTilt: number,
  density: number, albedo: number, temp?: number, polarRadius?: number
): PhysicalProperties {
  const surfaceGravity = 6.67430e-11 * mass / (radius * radius);
  const escapeVelocity = Math.sqrt(2 * 6.67430e-11 * mass / radius);
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

// Helper to create visual properties
function createVisual(
  baseColor: string,
  textures: VisualProperties['textures'],
  hasAtmosphere: boolean,
  atmosphereColor?: string,
  atmosphereThickness?: number,
  rings?: VisualProperties['rings'],
  customShader?: string
): VisualProperties {
  return {
    baseColor,
    textures,
    hasAtmosphere,
    atmosphereColor,
    atmosphereThickness,
    rings,
    customShader,
    lodDistances: [1e7, 5e7, 2e8, 1e9], // LOD switch distances in meters
  };
}

// ============================================
// SUN
// ============================================
export const SUN: CelestialBodyData = {
  id: 'sun',
  name: 'Sun',
  type: 'star',
  physical: createPhysical(
    1.98847e30,     // mass (kg)
    695700000,      // radius (m)
    25.05 * 86400,  // rotation period (s) - equatorial
    7.25 * DEG_TO_RAD, // axial tilt
    1408,           // density (kg/m³)
    0,              // albedo
    5778            // effective temperature (K)
  ),
  orbital: null,
  parentId: null,
  childrenIds: ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'],
  visual: createVisual(
    '#fff5e6',
    { diffuse: '/textures/sun_diffuse.jpg' },
    false,
    undefined,
    undefined,
    undefined,
    'sun'
  ),
  metadata: {
    discoveryDate: 'ancient',
    discoverer: 'N/A',
    designations: ['Sol', 'G2V'],
    orbitalGroup: 'Star',
    description: 'The star at the center of our solar system. A G-type main-sequence star (G2V) containing 99.86% of the system\'s mass.',
    url: 'https://solarsystem.nasa.gov/solar-system/sun/overview/',
  },
};

// ============================================
// MERCURY
// ============================================
export const MERCURY: CelestialBodyData = {
  id: 'mercury',
  name: 'Mercury',
  type: 'planet',
  physical: createPhysical(
    3.3011e23,
    RADIUS_MERCURY,
    58.646 * 86400,  // 58.646 days
    0.034 * DEG_TO_RAD,
    5427,
    0.142,
    440,
    2439400
  ),
  orbital: createOrbitalElements(
    0.387098 * AU,    // semi-major axis
    0.205630,         // eccentricity
    7.00487 * DEG_TO_RAD, // inclination
    48.33167 * DEG_TO_RAD, // longitude of ascending node
    29.12417 * DEG_TO_RAD, // argument of periapsis
    174.796 * DEG_TO_RAD,  // mean anomaly at epoch
    GM_SUN,
    PERIOD_MERCURY
  ),
  parentId: 'sun',
  childrenIds: [],
  visual: createVisual(
    '#b5b5b5',
    {
      diffuse: '/textures/mercury_diffuse.jpg',
      normal: '/textures/mercury_normal.jpg',
      elevation: '/textures/mercury_elevation.jpg',
    },
    false,
    undefined,
    undefined,
    undefined,
    'planet'
  ),
  metadata: {
    discoveryDate: 'ancient',
    discoverer: 'N/A',
    designations: ['Hermes'],
    orbitalGroup: 'Inner Planet',
    description: 'Smallest planet and closest to the Sun. Heavily cratered surface with extreme temperature variations (-173°C to 427°C).',
    url: 'https://solarsystem.nasa.gov/planets/mercury/overview/',
  },
};

// ============================================
// VENUS
// ============================================
export const VENUS: CelestialBodyData = {
  id: 'venus',
  name: 'Venus',
  type: 'planet',
  physical: createPhysical(
    4.8675e24,
    RADIUS_VENUS,
    -243.025 * 86400,  // Retrograde rotation
    177.36 * DEG_TO_RAD, // Near-upside-down
    5243,
    0.76,
    737,
    6051800
  ),
  orbital: createOrbitalElements(
    0.723332 * AU,
    0.006772,
    3.39471 * DEG_TO_RAD,
    76.68069 * DEG_TO_RAD,
    54.88418 * DEG_TO_RAD,
    50.416 * DEG_TO_RAD,
    GM_SUN,
    PERIOD_VENUS
  ),
  parentId: 'sun',
  childrenIds: [],
  visual: createVisual(
    '#e6c87a',
    {
      diffuse: '/textures/venus_diffuse.jpg',
      normal: '/textures/venus_normal.jpg',
      clouds: '/textures/venus_clouds.jpg',
    },
    true,
    '#f5e6c8',
    0.015,
    undefined,
    'venus'
  ),
  metadata: {
    discoveryDate: 'ancient',
    discoverer: 'N/A',
    designations: ['Aphrodite', 'Lucifer', 'Vesper'],
    orbitalGroup: 'Inner Planet',
    description: 'Hottest planet with runaway greenhouse effect. Thick CO₂ atmosphere, sulfuric acid clouds. Retrograde rotation.',
    url: 'https://solarsystem.nasa.gov/planets/venus/overview/',
  },
};

// ============================================
// EARTH
// ============================================
export const EARTH: CelestialBodyData = {
  id: 'earth',
  name: 'Earth',
  type: 'planet',
  physical: createPhysical(
    5.9722e24,
    RADIUS_EARTH,
    23.9345 * 3600,  // 23h 56m 4.1s (sidereal)
    23.43928 * DEG_TO_RAD,
    5514,
    0.306,
    288,
    6356800
  ),
  orbital: createOrbitalElements(
    1.000001 * AU,
    0.0167086,
    0.00005 * DEG_TO_RAD, // Near zero by definition
    0.0,                  // Reference direction
    102.94719 * DEG_TO_RAD,
    357.519 * DEG_TO_RAD,
    GM_SUN,
    PERIOD_EARTH
  ),
  parentId: 'sun',
  childrenIds: ['moon'],
  visual: createVisual(
    '#3b73b8',
    {
      diffuse: '/textures/earth_diffuse.jpg',
      normal: '/textures/earth_normal_map.tif',
      specular: '/textures/earth_specular_map.tif',
      elevation: '/textures/earth_elevation.png',
      night: '/textures/earth_night.jpg',
      clouds: '/textures/earth_clouds.jpg',
    },
    true,
    '#4a90d9',
    0.008,
    undefined,
    'earth'
  ),
  metadata: {
    discoveryDate: 'ancient',
    discoverer: 'N/A',
    designations: ['Terra', 'Gaia', 'The Blue Marble'],
    orbitalGroup: 'Inner Planet',
    description: 'Only known planet with life. Liquid water covers 71% of surface. Active plate tectonics, strong magnetic field.',
    url: 'https://solarsystem.nasa.gov/planets/earth/overview/',
  },
};

// ============================================
// EARTH'S MOON
// ============================================
export const MOON: CelestialBodyData = {
  id: 'moon',
  name: 'Moon',
  type: 'moon',
  physical: createPhysical(
    MASS_MOON,
    RADIUS_MOON_BODY,
    2360591,  // Tidal locked = orbital period
    6.68 * DEG_TO_RAD, // Axial tilt relative to ecliptic
    3344,
    0.12,
    270
  ),
  orbital: createOrbitalElements(
    384400000,  // 384,400 km from Earth
    0.0549,
    5.145 * DEG_TO_RAD, // Inclination to ecliptic
    125.08 * DEG_TO_RAD, // Longitude of ascending node
    318.15 * DEG_TO_RAD, // Argument of periapsis
    135.27 * DEG_TO_RAD, // Mean anomaly at epoch
    GM_EARTH,   // Orbiting Earth
    PERIOD_MOON
  ),
  parentId: 'earth',
  childrenIds: [],
  visual: createVisual(
    '#aaaaaa',
    {
      diffuse: '/textures/moon_diffuse.jpg',
      normal: '/textures/moon_normal.jpg',
      elevation: '/textures/moon_elevation.png',
    },
    false,
    undefined,
    undefined,
    undefined,
    'moon'
  ),
  metadata: {
    discoveryDate: 'ancient',
    discoverer: 'N/A',
    designations: ['Luna', 'Selene'],
    orbitalGroup: 'Earth Moon',
    description: 'Earth\'s only natural satellite. Tidal locked, showing same face to Earth. Major influence on Earth\'s tides.',
    url: 'https://solarsystem.nasa.gov/moons/earths-moon/overview/',
  },
};

// ============================================
// MARS
// ============================================
export const MARS: CelestialBodyData = {
  id: 'mars',
  name: 'Mars',
  type: 'planet',
  physical: createPhysical(
    6.4171e23,
    RADIUS_MARS,
    24.6229 * 3600,  // 24h 37m 22s
    25.19 * DEG_TO_RAD,
    3933,
    0.25,
    210,
    3376200
  ),
  orbital: createOrbitalElements(
    1.523662 * AU,
    0.093412,
    1.85061 * DEG_TO_RAD,
    49.57854 * DEG_TO_RAD,
    286.50214 * DEG_TO_RAD,
    19.412 * DEG_TO_RAD,
    GM_SUN,
    PERIOD_MARS
  ),
  parentId: 'sun',
  childrenIds: ['phobos', 'deimos'],
  visual: createVisual(
    '#c1440e',
    {
      diffuse: '/textures/mars_diffuse.jpg',
      normal: '/textures/mars_normal.jpg',
      elevation: '/textures/mars_elevation.png',
    },
    true,
    '#e8a87c',
    0.005,
    undefined,
    'mars'
  ),
  metadata: {
    discoveryDate: 'ancient',
    discoverer: 'N/A',
    designations: ['Ares', 'The Red Planet'],
    orbitalGroup: 'Inner Planet',
    description: 'The Red Planet. Thin CO₂ atmosphere. Largest volcano (Olympus Mons) and canyon (Valles Marineris) in solar system.',
    url: 'https://solarsystem.nasa.gov/planets/mars/overview/',
  },
};

// ============================================
// JUPITER
// ============================================
export const JUPITER: CelestialBodyData = {
  id: 'jupiter',
  name: 'Jupiter',
  type: 'planet',
  physical: createPhysical(
    1.8982e27,
    RADIUS_JUPITER,
    9.925 * 3600,   // 9h 55m 30s
    3.13 * DEG_TO_RAD,
    1326,
    0.503,
    165,
    66854000
  ),
  orbital: createOrbitalElements(
    5.2044 * AU,
    0.048498,
    1.30530 * DEG_TO_RAD,
    100.55615 * DEG_TO_RAD,
    273.867 * DEG_TO_RAD,
    19.655 * DEG_TO_RAD,
    GM_SUN,
    PERIOD_JUPITER
  ),
  parentId: 'sun',
  childrenIds: ['io', 'europa', 'ganymede', 'callisto'],
  visual: createVisual(
    '#d4a76a',
    {
      diffuse: '/textures/jupiter_diffuse.jpg',
      normal: '/textures/jupiter_normal.jpg',
    },
    true,
    '#e8d4b8',
    0.02,
    undefined,
    'jupiter'
  ),
  metadata: {
    discoveryDate: 'ancient',
    discoverer: 'N/A',
    designations: ['Zeus', 'Jove'],
    orbitalGroup: 'Gas Giant',
    description: 'Largest planet. Great Red Spot (storm >300 years). 4 large Galilean moons. Faint ring system. Strongest magnetic field.',
    url: 'https://solarsystem.nasa.gov/planets/jupiter/overview/',
  },
};

// ============================================
// IO
// ============================================
export const IO: CelestialBodyData = {
  id: 'io',
  name: 'Io',
  type: 'moon',
  physical: createPhysical(
    MASS_IO,
    RADIUS_IO_MOON,
    PERIOD_IO,  // Tidal locked
    0.04 * DEG_TO_RAD,
    3528,
    0.61,
    130
  ),
  orbital: createOrbitalElements(
    RADIUS_IO,
    0.0041,
    0.036 * DEG_TO_RAD, // Very low inclination to Jupiter's equator
    0, // Node (reference to Jupiter's equator)
    0, // Argument of periapsis
    0, // Mean anomaly at epoch
    GM_JUPITER,
    PERIOD_IO
  ),
  parentId: 'jupiter',
  childrenIds: [],
  visual: createVisual(
    '#f4d59e',
    {
      diffuse: '/textures/io_diffuse.jpg',
    },
    false,
    undefined,
    undefined,
    undefined,
    'io'
  ),
  metadata: {
    discoveryDate: '1610-01-08',
    discoverer: 'Galileo Galilei',
    designations: ['Jupiter I'],
    orbitalGroup: 'Galilean Moons',
    description: 'Most volcanically active body in solar system. Tidal heating from orbital resonance with Europa and Ganymede. Sulfur dioxide frost surface.',
    url: 'https://solarsystem.nasa.gov/moons/jupiter-moons/io/overview/',
  },
};

// ============================================
// EUROPA
// ============================================
export const EUROPA: CelestialBodyData = {
  id: 'europa',
  name: 'Europa',
  type: 'moon',
  physical: createPhysical(
    MASS_EUROPA,
    RADIUS_EUROPA_MOON,
    PERIOD_EUROPA,  // Tidal locked
    0.1 * DEG_TO_RAD,
    3013,
    0.64,
    102
  ),
  orbital: createOrbitalElements(
    RADIUS_EUROPA,
    0.0094,
    0.47 * DEG_TO_RAD,
    0,
    0,
    0,
    GM_JUPITER,
    PERIOD_EUROPA
  ),
  parentId: 'jupiter',
  childrenIds: [],
  visual: createVisual(
    '#f5f0e1',
    {
      diffuse: '/textures/europa_diffuse.jpg',
    },
    false,
    undefined,
    undefined,
    undefined,
    'europa'
  ),
  metadata: {
    discoveryDate: '1610-01-08',
    discoverer: 'Galileo Galilei',
    designations: ['Jupiter II'],
    orbitalGroup: 'Galilean Moons',
    description: 'Smooth ice crust over global subsurface ocean. Potential for extraterrestrial life. Lineae (cracks) from tidal flexing.',
    url: 'https://solarsystem.nasa.gov/moons/jupiter-moons/europa/overview/',
  },
};

// ============================================
// GANYMEDE
// ============================================
export const GANYMEDE: CelestialBodyData = {
  id: 'ganymede',
  name: 'Ganymede',
  type: 'moon',
  physical: createPhysical(
    MASS_GANYMEDE,
    RADIUS_GANYMEDE_MOON,
    PERIOD_GANYMEDE,  // Tidal locked
    0.17 * DEG_TO_RAD,
    1942,
    0.43,
    110
  ),
  orbital: createOrbitalElements(
    RADIUS_GANYMEDE,
    0.0013,
    0.18 * DEG_TO_RAD,
    0,
    0,
    0,
    GM_JUPITER,
    PERIOD_GANYMEDE
  ),
  parentId: 'jupiter',
  childrenIds: [],
  visual: createVisual(
    '#b8a898',
    {
      diffuse: '/textures/ganymede_diffuse.jpg',
    },
    false,
    undefined,
    undefined,
    undefined,
    'ganymede'
  ),
  metadata: {
    discoveryDate: '1610-01-08',
    discoverer: 'Galileo Galilei',
    designations: ['Jupiter III'],
    orbitalGroup: 'Galilean Moons',
    description: 'Largest moon in solar system (larger than Mercury). Only moon with magnetic field. Subsurface ocean. Differentiated interior.',
    url: 'https://solarsystem.nasa.gov/moons/jupiter-moons/ganymede/overview/',
  },
};

// ============================================
// CALLISTO
// ============================================
export const CALLISTO: CelestialBodyData = {
  id: 'callisto',
  name: 'Callisto',
  type: 'moon',
  physical: createPhysical(
    MASS_CALLISTO,
    RADIUS_CALLISTO_MOON,
    PERIOD_CALLISTO,  // Tidal locked
    0.5 * DEG_TO_RAD,
    1834,
    0.22,
    134
  ),
  orbital: createOrbitalElements(
    RADIUS_CALLISTO,
    0.0074,
    0.28 * DEG_TO_RAD,
    0,
    0,
    0,
    GM_JUPITER,
    PERIOD_CALLISTO
  ),
  parentId: 'jupiter',
  childrenIds: [],
  visual: createVisual(
    '#988878',
    {
      diffuse: '/textures/callisto_diffuse.jpg',
    },
    false,
    undefined,
    undefined,
    undefined,
    'callisto'
  ),
  metadata: {
    discoveryDate: '1610-01-08',
    discoverer: 'Galileo Galilei',
    designations: ['Jupiter IV'],
    orbitalGroup: 'Galilean Moons',
    description: 'Most heavily cratered object in solar system. Ancient surface ~4 billion years old. Possible subsurface ocean. Not in orbital resonance.',
    url: 'https://solarsystem.nasa.gov/moons/jupiter-moons/callisto/overview/',
  },
};

// ============================================
// TITAN (Saturn's largest moon)
// ============================================
export const TITAN: CelestialBodyData = {
  id: 'titan',
  name: 'Titan',
  type: 'moon',
  physical: createPhysical(
    MASS_TITAN,
    RADIUS_TITAN_MOON,
    PERIOD_TITAN,  // Tidal locked
    0.3 * DEG_TO_RAD,
    1824,
    0.21,
    94
  ),
  orbital: createOrbitalElements(
    RADIUS_TITAN,
    0.0288,
    0.33 * DEG_TO_RAD,
    0,
    0,
    0,
    GM_SATURN,
    PERIOD_TITAN
  ),
  parentId: 'saturn',
  childrenIds: [],
  visual: createVisual(
    '#d4a843',
    {
      diffuse: '/textures/titan_diffuse.jpg',
    },
    false,
    undefined,
    undefined,
    undefined,
    'titan'
  ),
  metadata: {
    discoveryDate: '1655-03-25',
    discoverer: 'Christiaan Huygens',
    designations: ['Saturn VI'],
    orbitalGroup: 'Saturnian Moons',
    description: 'Second largest moon in solar system. Only moon with dense atmosphere (mostly nitrogen). Methane/ethane lakes. Organic chemistry. Possible subsurface ocean.',
    url: 'https://solarsystem.nasa.gov/moons/saturn-moons/titan/overview/',
  },
};

// ============================================
// ENCELADUS
// ============================================
export const ENCELADUS: CelestialBodyData = {
  id: 'enceladus',
  name: 'Enceladus',
  type: 'moon',
  physical: createPhysical(
    MASS_ENCELADUS,
    RADIUS_ENCELADUS_MOON,
    PERIOD_ENCELADUS,  // Tidal locked
    0.0 * DEG_TO_RAD,
    1599,
    1.38, // Very high albedo
    75
  ),
  orbital: createOrbitalElements(
    RADIUS_ENCELADUS,
    0.0047,
    0.01 * DEG_TO_RAD,
    0,
    0,
    0,
    GM_SATURN,
    PERIOD_ENCELADUS
  ),
  parentId: 'saturn',
  childrenIds: [],
  visual: createVisual(
    '#ffffff',
    {
      diffuse: '/textures/enceladus_diffuse.jpg',
    },
    false,
    undefined,
    undefined,
    undefined,
    'enceladus'
  ),
  metadata: {
    discoveryDate: '1789-08-28',
    discoverer: 'William Herschel',
    designations: ['Saturn II'],
    orbitalGroup: 'Saturnian Moons',
    description: 'Brightest object in solar system (albedo 0.99). Active cryovolcanoes at south pole (tiger stripes). Global subsurface ocean. Plumes feed Saturn E-ring. High astrobiology potential.',
    url: 'https://solarsystem.nasa.gov/moons/saturn-moons/enceladus/overview/',
  },
};

// ============================================
// SATURN
// ============================================
export const SATURN: CelestialBodyData = {
  id: 'saturn',
  name: 'Saturn',
  type: 'planet',
  physical: createPhysical(
    5.6834e26,
    RADIUS_SATURN,
    10.656 * 3600,  // 10h 39m 22s
    26.73 * DEG_TO_RAD,
    687,
    0.499,
    134,
    54364000
  ),
  orbital: createOrbitalElements(
    9.5826 * AU,
    0.055546,
    2.48599 * DEG_TO_RAD,
    113.71504 * DEG_TO_RAD,
    339.392 * DEG_TO_RAD,
    317.020 * DEG_TO_RAD,
    GM_SUN,
    PERIOD_SATURN
  ),
  parentId: 'sun',
  childrenIds: ['titan', 'enceladus', 'mimas', 'rhea', 'dione', 'tethys', 'iapetus'],
  visual: createVisual(
    '#f4e4bc',
    {
      diffuse: '/textures/saturn_diffuse.jpg',
      normal: '/textures/saturn_normal.jpg',
    },
    true,
    '#f0e8d8',
    0.025,
    {
      innerRadius: 1.16 * RADIUS_SATURN,
      outerRadius: 2.27 * RADIUS_SATURN,
      color: '#c9b896',
      texture: '/textures/saturn_rings.png',
      gaps: [
        { start: 1.24 * RADIUS_SATURN, end: 1.25 * RADIUS_SATURN, opacity: 0.1 }, // Cassini Division
        { start: 1.33 * RADIUS_SATURN, end: 1.34 * RADIUS_SATURN, opacity: 0.3 }, // Encke Gap
        { start: 1.52 * RADIUS_SATURN, end: 1.53 * RADIUS_SATURN, opacity: 0.2 }, // Keeler Gap
      ],
      opacity: 0.7,
      rotationPeriod: 10.656 * 3600, // Same as planet rotation
    },
    'saturn'
  ),
  metadata: {
    discoveryDate: 'ancient',
    discoverer: 'N/A',
    designations: ['Cronus'],
    orbitalGroup: 'Gas Giant',
    description: 'Spectacular ring system (ice particles). Lowest density (would float in water). Hexagonal polar storm.',
    url: 'https://solarsystem.nasa.gov/planets/saturn/overview/',
  },
};

// ============================================
// URANUS
// ============================================
export const URANUS: CelestialBodyData = {
  id: 'uranus',
  name: 'Uranus',
  type: 'planet',
  physical: createPhysical(
    8.6810e25,
    RADIUS_URANUS,
    -17.24 * 3600,  // Retrograde
    97.77 * DEG_TO_RAD, // Extreme tilt (sideways)
    1270,
    0.51,
    76,
    24973000
  ),
  orbital: createOrbitalElements(
    19.2184 * AU,
    0.047168,
    0.76986 * DEG_TO_RAD,
    74.22988 * DEG_TO_RAD,
    97.862 * DEG_TO_RAD,
    142.239 * DEG_TO_RAD,
    GM_SUN,
    PERIOD_URANUS
  ),
  parentId: 'sun',
  childrenIds: ['miranda', 'ariel', 'umbriel', 'titania', 'oberon'],
  visual: createVisual(
    '#7de3f4',
    {
      diffuse: '/textures/uranus_diffuse.jpg',
      normal: '/textures/uranus_normal.jpg',
    },
    true,
    '#a8e8f0',
    0.03,
    {
      innerRadius: 1.12 * RADIUS_URANUS,
      outerRadius: 1.95 * RADIUS_URANUS,
      color: '#888888',
      opacity: 0.4,
      rotationPeriod: -17.24 * 3600, // Same as planet rotation (retrograde)
    },
    'uranus'
  ),
  metadata: {
    discoveryDate: '1781-03-13',
    discoverer: 'William Herschel',
    designations: ['Georgium Sidus'],
    orbitalGroup: 'Ice Giant',
    description: 'Sideways rotation (98° tilt). Coldest planetary atmosphere. Faint rings discovered 1977.',
    url: 'https://solarsystem.nasa.gov/planets/uranus/overview/',
  },
};

// ============================================
// NEPTUNE
// ============================================
export const NEPTUNE: CelestialBodyData = {
  id: 'neptune',
  name: 'Neptune',
  type: 'planet',
  physical: createPhysical(
    1.02413e26,
    RADIUS_NEPTUNE,
    16.11 * 3600,   // 16h 6m 36s
    28.32 * DEG_TO_RAD,
    1638,
    0.41,
    72,
    24341000
  ),
  orbital: createOrbitalElements(
    30.11 * AU,
    0.008678,
    1.76917 * DEG_TO_RAD,
    131.72169 * DEG_TO_RAD,
    276.336 * DEG_TO_RAD,
    259.18 * DEG_TO_RAD,
    GM_SUN,
    PERIOD_NEPTUNE
  ),
  parentId: 'sun',
  childrenIds: ['triton', 'nereid'],
  visual: createVisual(
    '#4b70dd',
    {
      diffuse: '/textures/neptune_diffuse.jpg',
      normal: '/textures/neptune_normal.jpg',
    },
    true,
    '#6a90e8',
    0.03,
    {
      innerRadius: 1.14 * RADIUS_NEPTUNE,
      outerRadius: 1.76 * RADIUS_NEPTUNE,
      color: '#666688',
      opacity: 0.3,
      rotationPeriod: 16.11 * 3600, // Same as planet rotation
    },
    'neptune'
  ),
  metadata: {
    discoveryDate: '1846-09-23',
    discoverer: 'Urban Le Verrier / Johann Galle',
    designations: ['Le Verrier\'s Planet'],
    orbitalGroup: 'Ice Giant',
    description: 'Windiest planet (2,100 km/h). Great Dark Spot storms. Discovered by mathematical prediction.',
    url: 'https://solarsystem.nasa.gov/planets/neptune/overview/',
  },
};

// ============================================
// PLUTO
// ============================================
export const PLUTO: CelestialBodyData = {
  id: 'pluto',
  name: 'Pluto',
  type: 'dwarf_planet',
  physical: createPhysical(
    1.303e22,
    RADIUS_PLUTO,
    -153.2928 * 86400, // Retrograde
    122.53 * DEG_TO_RAD,
    1854,
    0.52,
    44,
    1187400
  ),
  orbital: createOrbitalElements(
    39.4821 * AU,
    0.248807,
    17.14175 * DEG_TO_RAD,
    110.30347 * DEG_TO_RAD,
    113.763 * DEG_TO_RAD,
    14.882 * DEG_TO_RAD,
    GM_SUN,
    PERIOD_PLUTO
  ),
  parentId: 'sun',
  childrenIds: ['charon'],
  visual: createVisual(
    '#b8a088',
    {
      diffuse: '/textures/pluto_diffuse.jpg',
      normal: '/textures/pluto_normal.jpg',
    },
    true,
    '#886644',
    0.003,
    undefined,
    'pluto'
  ),
  metadata: {
    discoveryDate: '1930-02-18',
    discoverer: 'Clyde Tombaugh',
    designations: ['134340 Pluto'],
    orbitalGroup: 'Kuiper Belt / Dwarf Planet',
    description: 'Largest known dwarf planet. Heart-shaped Tombaugh Regio. Binary system with Charon. New Horizons flyby 2015.',
    url: 'https://solarsystem.nasa.gov/dwarf-planets/pluto/overview/',
  },
};

// ============================================
// CERES
// ============================================
export const CERES: CelestialBodyData = {
  id: 'ceres',
  name: 'Ceres',
  type: 'dwarf_planet',
  physical: createPhysical(
    9.393e20,
    473000,
    9.074 * 3600,
    4.0 * DEG_TO_RAD,
    2161,
    0.09,
    168,
  ),
  orbital: createOrbitalElements(
    2.767 * AU,
    0.0758,
    10.587 * DEG_TO_RAD,
    80.09 * DEG_TO_RAD,
    72.64 * DEG_TO_RAD,
    144.0 * DEG_TO_RAD,
    GM_SUN,
    4.60 * 365.25 * 86400
  ),
  parentId: 'sun',
  childrenIds: [],
  visual: createVisual(
    '#8c8c8c',
    { diffuse: '/textures/ceres_diffuse.jpg' },
    false,
    undefined,
    undefined,
    undefined,
    'dwarf_planet'
  ),
  metadata: {
    discoveryDate: '1801-01-01',
    discoverer: 'Giuseppe Piazzi',
    designations: ['1 Ceres'],
    orbitalGroup: 'Main Asteroid Belt / Dwarf Planet',
    description: 'Largest object in asteroid belt. Only inner solar system dwarf planet. Possible subsurface ocean. Dawn mission 2015-2018.',
    url: 'https://solarsystem.nasa.gov/dwarf-planets/ceres/overview/',
  },
};

// ============================================
// ERIS
// ============================================
export const ERIS: CelestialBodyData = {
  id: 'eris',
  name: 'Eris',
  type: 'dwarf_planet',
  physical: createPhysical(
    1.66e22,
    1163000,
    25.9 * 3600,
    44.0 * DEG_TO_RAD,
    2520,
    0.96,
    30,
  ),
  orbital: createOrbitalElements(
    67.78 * AU,
    0.441,
    44.187 * DEG_TO_RAD,
    35.94 * DEG_TO_RAD,
    151.35 * DEG_TO_RAD,
    205.0 * DEG_TO_RAD,
    GM_SUN,
    558 * 365.25 * 86400
  ),
  parentId: 'sun',
  childrenIds: ['dysnomia'],
  visual: createVisual(
    '#ffffff',
    { diffuse: '/textures/eris_diffuse.jpg' },
    false,
    undefined,
    undefined,
    undefined,
    'dwarf_planet'
  ),
  metadata: {
    discoveryDate: '2005-01-05',
    discoverer: 'Mike Brown / Chad Trujillo / David Rabinowitz',
    designations: ['136199 Eris', '2003 UB₃₁₃', 'Xena'],
    orbitalGroup: 'Scattered Disc / Dwarf Planet',
    description: 'Most massive known dwarf planet. Highly eccentric orbit. Led to Pluto\'s reclassification. Moon: Dysnomia.',
    url: 'https://solarsystem.nasa.gov/dwarf-planets/eris/overview/',
  },
};

// ============================================
// MAKEMAKE
// ============================================
export const MAKEMAKE: CelestialBodyData = {
  id: 'makemake',
  name: 'Makemake',
  type: 'dwarf_planet',
  physical: createPhysical(
    3.1e21,
    715000,
    22.5 * 3600,
    29.0 * DEG_TO_RAD,
    1700,
    0.81,
    30,
  ),
  orbital: createOrbitalElements(
    45.79 * AU,
    0.159,
    29.01 * DEG_TO_RAD,
    79.44 * DEG_TO_RAD,
    295.0 * DEG_TO_RAD,
    20.0 * DEG_TO_RAD,
    GM_SUN,
    309 * 365.25 * 86400
  ),
  parentId: 'sun',
  childrenIds: ['S/2015 (136472) 1'],
  visual: createVisual(
    '#ddddbb',
    { diffuse: '/textures/makemake_diffuse.jpg' },
    false,
    undefined,
    undefined,
    undefined,
    'dwarf_planet'
  ),
  metadata: {
    discoveryDate: '2005-03-31',
    discoverer: 'Mike Brown / Chad Trujillo / David Rabinowitz',
    designations: ['136472 Makemake', '2005 FY₉', 'Easterbunny'],
    orbitalGroup: 'Kuiper Belt / Dwarf Planet',
    description: 'Second brightest Kuiper Belt object. No significant atmosphere detected. Moon: MK2 (S/2015 (136472) 1).',
    url: 'https://solarsystem.nasa.gov/dwarf-planets/makemake/overview/',
  },
};

// ============================================
// HAUMEA
// ============================================
export const HAUMEA: CelestialBodyData = {
  id: 'haumea',
  name: 'Haumea',
  type: 'dwarf_planet',
  physical: createPhysical(
    4.006e21,
    816000, // Equatorial radius (elongated)
    3.915 * 3600, // Very fast rotation
    0, // Equatorial plane ~orbital plane
    1885,
    0.73,
    32,
    513000 // Polar radius (oblate)
  ),
  orbital: createOrbitalElements(
    43.13 * AU,
    0.191,
    28.22 * DEG_TO_RAD,
    121.89 * DEG_TO_RAD,
    238.7 * DEG_TO_RAD,
    210.0 * DEG_TO_RAD,
    GM_SUN,
    283 * 365.25 * 86400
  ),
  parentId: 'sun',
  childrenIds: ['hiiaka', 'namaka'],
  visual: createVisual(
    '#ffffff',
    { diffuse: '/textures/haumea_diffuse.jpg' },
    false,
    undefined,
    undefined,
    undefined,
    'haumea'
  ),
  metadata: {
    discoveryDate: '2004-12-28',
    discoverer: 'Mike Brown / Chad Trujillo / David Rabinowitz',
    designations: ['136108 Haumea', '2003 EL₆₁', 'Santa'],
    orbitalGroup: 'Kuiper Belt / Dwarf Planet',
    description: 'Ellipsoidal shape from rapid rotation (3.9h day). Two moons (Hiʻiaka, Namaka). Ring system discovered 2017.',
    url: 'https://solarsystem.nasa.gov/dwarf-planets/haumea/overview/',
  },
};

// ============================================
// PLANETS ARRAY & LOOKUP
// ============================================
export const PLANETS: CelestialBodyData[] = [
  SUN, MERCURY, VENUS, EARTH, MARS, JUPITER, SATURN, URANUS, NEPTUNE,
];

export const DWARF_PLANETS: CelestialBodyData[] = [
  PLUTO, CERES, ERIS, MAKEMAKE, HAUMEA,
];

export const ALL_PLANETS: CelestialBodyData[] = [...PLANETS, ...DWARF_PLANETS];

export const PLANET_LOOKUP: Record<string, CelestialBodyData> = Object.fromEntries(
  ALL_PLANETS.map(p => [p.id, p])
);

export const PLANETS_BY_ID = PLANET_LOOKUP;

// Distance from Sun in AU (for quick reference)
export const PLANET_DISTANCES_AU: Record<string, number> = {
  mercury: 0.387,
  venus: 0.723,
  earth: 1.000,
  mars: 1.524,
  jupiter: 5.204,
  saturn: 9.583,
  uranus: 19.22,
  neptune: 30.11,
  pluto: 39.48,
  ceres: 2.77,
  eris: 67.78,
  makemake: 45.79,
  haumea: 43.13,
};