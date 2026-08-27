/**
 * Orbital Elements Types
 * Based on standard Keplerian orbital elements
 * Reference: NASA JPL Horizons, orbital mechanics conventions
 */

export interface OrbitalElements {
  /** Semi-major axis in meters */
  semiMajorAxis: number;
  /** Orbital eccentricity (0 = circular, 0-1 = elliptical, 1 = parabolic, >1 = hyperbolic) */
  eccentricity: number;
  /** Inclination in radians (angle between orbital plane and reference plane) */
  inclination: number;
  /** Longitude of ascending node in radians (angle from reference direction to ascending node) */
  longitudeOfAscendingNode: number;
  /** Argument of periapsis in radians (angle from ascending node to periapsis) */
  argumentOfPeriapsis: number;
  /** Mean anomaly at epoch in radians (position in orbit at reference time) */
  meanAnomalyAtEpoch: number;
  /** Reference epoch (J2000.0 = 2451545.0 JD) */
  epoch: number;
  /** Gravitational parameter of central body (μ = GM) in m³/s² */
  gravitationalParameter: number;
  /** Orbital period in seconds (calculated from semi-major axis) */
  orbitalPeriod: number;
}

export interface CelestialBodyData {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Body type classification */
  type: BodyType;
  /** Physical properties */
  physical: PhysicalProperties;
  /** Orbital elements (null for central bodies like Sun) */
  orbital: OrbitalElements | null;
  /** Parent body ID (null for Sun) */
  parentId: string | null;
  /** Children body IDs (moons, etc.) */
  childrenIds: string[];
  /** Visual properties for rendering */
  visual: VisualProperties;
  /** Additional metadata */
  metadata: BodyMetadata;
}

export type BodyType =
  | 'star'
  | 'planet'
  | 'dwarf_planet'
  | 'moon'
  | 'asteroid'
  | 'comet'
  | 'kuiper_belt_object'
  | 'galaxy'
  | 'nebula'
  | 'star_cluster';

export interface PhysicalProperties {
  /** Mass in kg */
  mass: number;
  /** Equatorial radius in meters */
  radius: number;
  /** Polar radius in meters (for oblate bodies) */
  polarRadius?: number;
  /** Rotation period in seconds (sidereal day) */
  rotationPeriod: number;
  /** Axial tilt (obliquity) in radians */
  axialTilt: number;
  /** Surface gravity in m/s² */
  surfaceGravity: number;
  /** Escape velocity in m/s */
  escapeVelocity: number;
  /** Mean density in kg/m³ */
  density: number;
  /** Effective temperature in Kelvin */
  effectiveTemperature?: number;
  /** Temperature in Kelvin (alias for effectiveTemperature) */
  temperature?: number;
  /** Albedo (0-1) */
  albedo?: number;
}

export interface VisualProperties {
  /** Base color (hex) for procedural generation fallback */
  baseColor: string;
  /** Emissive color (hex) for glowing bodies like stars */
  emissiveColor?: string;
  /** Emissive intensity */
  emissiveIntensity?: number;
  /** Texture map URLs (relative to public/textures/) */
  textures: {
    diffuse?: string;
    normal?: string;
    specular?: string;
    elevation?: string;
    night?: string;
    clouds?: string;
  };
  /** Whether to render atmosphere */
  hasAtmosphere: boolean;
  /** Atmosphere color (hex) */
  atmosphereColor?: string;
  /** Atmosphere thickness factor */
  atmosphereThickness?: number;
  /** Atmosphere density */
  atmosphereDensity?: number;
  /** Ring system (for Saturn, etc.) */
  rings?: RingProperties;
  /** Custom shader name */
  customShader?: string;
  /** LOD distances (when to switch detail levels) */
  lodDistances: number[];
  /** Scale factor for visual scaling */
  scaleFactor?: number;
  /** Orbit line color */
  orbitColor?: string;
  /** Moons data */
  moons?: MoonData[];
}

export interface RingProperties {
  innerRadius: number;
  outerRadius: number;
  /** Ring color (hex) */
  color: string;
  /** Texture for ring detail */
  texture?: string;
  /** Gap definitions (e.g., Cassini Division) */
  gaps?: RingGap[];
  /** Transparency */
  opacity: number;
  /** Rotation period for ring animation */
  rotationPeriod?: number;
}

export interface MoonData {
  id: string;
  name: string;
  type: 'moon';
  orbital: OrbitalElements;
  physical: PhysicalProperties;
  visual: VisualProperties;
  parentId: string;
  childrenIds: string[];
  metadata: BodyMetadata;
}

export interface RingGap {
  /** Start radius of gap */
  start: number;
  /** End radius of gap */
  end: number;
  /** Gap opacity (0 = empty, 1 = full density) */
  opacity: number;
}

export interface BodyMetadata {
  /** Discovery date (ISO string) */
  discoveryDate?: string;
  /** Discoverer name */
  discoverer?: string;
  /** Alternative designations */
  designations?: string[];
  /** Orbital group (e.g., "Galilean moons", "Main asteroid belt") */
  orbitalGroup?: string;
  /** Description for info panel */
  description?: string;
  /** Wikipedia/NASA URL */
  url?: string;
}

export interface StarData {
  /** Hipparcos catalog ID */
  hipId: number;
  /** Henry Draper catalog ID */
  hdId?: number;
  /** Gliese catalog ID */
  glId?: number;
  /** Proper name (if any) */
  properName?: string;
  /** Bayer designation */
  bayer?: string;
  /** Flamsteed designation */
  flamsteed?: string;
  /** Constellation abbreviation (IAU) */
  constellation: string;
  /** Right ascension in degrees (J2000) */
  ra: number;
  /** Declination in degrees (J2000) */
  dec: number;
  /** Proper motion in RA (mas/yr) */
  pmRa: number;
  /** Proper motion in Dec (mas/yr) */
  pmDec: number;
  /** Parallax in milliarcseconds */
  parallax: number;
  /** Distance in parsecs */
  distance: number;
  /** Apparent visual magnitude */
  vMag: number;
  /** Absolute magnitude */
  absMag: number;
  /** B-V color index */
  bvIndex: number;
  /** Spectral type (e.g., "G2V") */
  spectralType?: string;
  /** Luminosity class */
  luminosityClass?: string;
  /** Effective temperature in Kelvin */
  temperature?: number;
  /** Radial velocity in km/s */
  radialVelocity?: number;
  /** Variable star designation */
  variable?: string;
}

export interface ConstellationLine {
  /** Constellation abbreviation */
  constellation: string;
  /** Star Hipparcos IDs forming the line */
  hipIds: number[];
  /** Line color (optional, defaults to cyan) */
  color?: string;
}

export interface GalaxyData {
  /** Unique ID */
  id: string;
  /** Name (e.g., "Andromeda", "Milky Way") */
  name: string;
  /** Designation (e.g., "M31", "LMC") */
  designation: string;
  /** Galaxy type (e.g., "Sb", "E0", "Irr") */
  type: string;
  /** Right ascension in degrees */
  ra: number;
  /** Declination in degrees */
  dec: number;
  /** Distance in parsecs */
  distance: number;
  /** Apparent magnitude */
  magnitude: number;
  /** Angular size in arcminutes */
  angularSize: number;
  /** Position angle in degrees */
  positionAngle?: number;
  /** Redshift */
  redshift?: number;
  /** Description */
  description?: string;
  /** Satellite galaxies */
  satellites?: string[];
  /** Size in light years */
  size?: number;
  /** Apparent magnitude (alias) */
  apparentMagnitude?: number;
  /** Absolute magnitude */
  absoluteMagnitude?: number;
  /** Inclination in degrees */
  inclination?: number;
  /** Velocity in km/s */
  velocity?: number;
  /** URL for more info */
  url?: string;
}

export interface AsteroidData {
  /** Unique ID */
  id: string;
  /** Designation (e.g., "1 Ceres", "4 Vesta") */
  designation: string;
  /** Name (if named) */
  name?: string;
  /** Orbital elements */
  orbital: OrbitalElements;
  /** Physical properties */
  physical: PhysicalProperties;
  /** Spectral type (Tholen/SMASS) */
  spectralType?: string;
  /** Orbit class */
  orbitClass: 'main_belt' | 'near_earth' | 'trojan' | 'centaur' | 'kuiper_belt' | 'scattered_disc';
}

export interface CometData {
  /** Unique ID */
  id: string;
  /** Designation (e.g., "1P/Halley", "C/2020 F3") */
  designation: string;
  /** Name */
  name: string;
  /** Body type classification */
  type: 'comet';
  /** Orbital elements (often hyperbolic/parabolic) */
  orbital: OrbitalElements;
  /** Physical properties of nucleus */
  physical: PhysicalProperties;
  /** Perihelion distance in AU */
  perihelionDistance: number;
  /** Orbital period in years (if periodic) */
  period?: number;
  /** Last perihelion passage (JD) */
  lastPerihelion?: number;
  /** Next perihelion passage (JD) */
  nextPerihelion?: number;
  /** Comet type */
  cometType: 'periodic' | 'long_period' | 'hyperbolic' | 'sungrazer';
  /** Parent body ID (Sun) */
  parentId: string;
  /** Children body IDs (none for comets) */
  childrenIds: string[];
  /** Visual properties for rendering */
  visual: VisualProperties;
  /** Additional metadata */
  metadata: BodyMetadata;
}