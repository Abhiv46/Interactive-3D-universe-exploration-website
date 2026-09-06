/**
 * Physical and Astronomical Constants
 * Values from CODATA 2018, IAU 2015, NASA JPL
 */

// Gravitational constant
export const G = 6.67430e-11; // m³ kg⁻¹ s⁻²

// Astronomical Unit
export const AU = 149597870700; // meters (exact by definition)

// Light year
export const LIGHT_YEAR = 9460730472580800; // meters

// Parsec
export const PARSEC = 30856775814913673; // meters

// Solar masses
export const SOLAR_MASS = 1.98847e30; // kg
export const SOLAR_RADIUS = 695700000; // meters
export const SOLAR_LUMINOSITY = 3.828e26; // watts

// Earth
export const EARTH_MASS = 5.9722e24; // kg
export const EARTH_RADIUS = 6371000; // meters
export const EARTH_GRAVITATIONAL_PARAMETER = 3.986004418e14; // m³/s²

// Time
export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_HOUR = 3600;
export const SECONDS_PER_DAY = 86400;
export const SECONDS_PER_YEAR = 31557600; // Julian year (365.25 days)
export const SECONDS_PER_CENTURY = 3155760000;

// Julian Date
export const J2000_EPOCH = 2451545.0; // JD for 2000-01-01 12:00:00 TT
export const J2000_UNIX_TIME = 946728000000; // ms since Unix epoch

// Conversion factors
export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;
export const ARCSEC_TO_RAD = DEG_TO_RAD / 3600;
export const MAS_TO_RAD = ARCSEC_TO_RAD / 1000;

// Speed of light
export const SPEED_OF_LIGHT = 299792458; // m/s

// Gaussian gravitational constant (for AU calculations)
export const K = 0.01720209895; // rad/day (exact by definition for AU)

// Standard gravitational parameters (μ = GM) in m³/s²
export const GM_SUN = 1.327124400189e20;
export const GM_MERCURY = 2.2032e13;
export const GM_VENUS = 3.24858592e14;
export const GM_EARTH = 3.986004418e14;
export const GM_MARS = 4.282837e13;
export const GM_JUPITER = 1.26686531e17;
export const GM_SATURN = 3.7931187e16;
export const GM_URANUS = 5.793939e15;
export const GM_NEPTUNE = 6.836529e15;
export const GM_PLUTO = 8.71e11;

// Planet radii in meters
export const RADIUS_MERCURY = 2439700;
export const RADIUS_VENUS = 6051800;
export const RADIUS_EARTH = 6371000;
export const RADIUS_MARS = 3389500;
export const RADIUS_JUPITER = 69911000;
export const RADIUS_SATURN = 58232000;
export const RADIUS_URANUS = 25362000;
export const RADIUS_NEPTUNE = 24622000;
export const RADIUS_PLUTO = 1188300;

// Planet orbital periods in seconds (sidereal)
export const PERIOD_MERCURY = 7600522; // 87.97 days
export const PERIOD_VENUS = 19414162; // 224.7 days
export const PERIOD_EARTH = 31558149; // 365.256 days
export const PERIOD_MARS = 59354032; // 687 days
export const PERIOD_JUPITER = 374335776; // 4332.6 days
export const PERIOD_SATURN = 929292384; // 10759 days
export const PERIOD_URANUS = 2651370000; // 30687 days
export const PERIOD_NEPTUNE = 5200418400; // 60190 days
export const PERIOD_PLUTO = 7815936000; // 90465 days

// Moon orbital periods (around their planets) in seconds
export const PERIOD_MOON = 2360591; // 27.32 days
export const PERIOD_IO = 152853; // 1.769 days
export const PERIOD_EUROPA = 306822; // 3.551 days
export const PERIOD_GANYMEDE = 618153; // 7.155 days
export const PERIOD_CALLISTO = 1441924; // 16.689 days
export const PERIOD_TITAN = 1377648; // 15.945 days
export const PERIOD_ENCELADUS = 118356; // 1.37 days

// Moon orbital radii (from planet center) in meters
export const RADIUS_MOON = 384400000; // 384,400 km (Earth-Moon distance)
export const RADIUS_IO = 421700000; // 421,700 km
export const RADIUS_EUROPA = 671034000; // 671,034 km
export const RADIUS_GANYMEDE = 1070412000; // 1,070,412 km
export const RADIUS_CALLISTO = 1882709000; // 1,882,709 km
export const RADIUS_TITAN = 1221870000; // 1,221,870 km
export const RADIUS_ENCELADUS = 238037000; // 238,037 km

// Moon radii in meters
export const RADIUS_MOON_BODY = 1737400;
export const RADIUS_IO_MOON = 1821600;
export const RADIUS_EUROPA_MOON = 1560800;
export const RADIUS_GANYMEDE_MOON = 2634100;
export const RADIUS_CALLISTO_MOON = 2410300;
export const RADIUS_TITAN_MOON = 2574730;
export const RADIUS_ENCELADUS_MOON = 252100;

// Moon masses in kg
export const MASS_MOON = 7.342e22;
export const MASS_IO = 8.9319e22;
export const MASS_EUROPA = 4.7998e22;
export const MASS_GANYMEDE = 1.4819e23;
export const MASS_CALLISTO = 1.0759e23;
export const MASS_TITAN = 1.3452e23;
export const MASS_ENCELADUS = 1.08e20;

// Moon gravitational parameters (μ = GM) in m³/s²
export const GM_MOON = 4.9048695e12;
export const GM_IO = 5.9599e12;
export const GM_EUROPA = 3.2027e12;
export const GM_GANYMEDE = 9.8878e12;
export const GM_CALLISTO = 7.1776e12;
export const GM_TITAN = 8.9762e12;
export const GM_ENCELADUS = 7.206e9;

// Asteroid belt
export const ASTEROID_BELT_INNER = 2.2 * AU;
export const ASTEROID_BELT_OUTER = 3.2 * AU;
export const ASTEROID_COUNT = 8000;

// Kuiper belt
export const KUIPER_BELT_INNER = 30 * AU;
export const KUIPER_BELT_OUTER = 50 * AU;
export const KUIPER_COUNT = 5000;

// Scales for visualization (not physical)
export const VISUAL_SCALE_FACTOR = 1e-9; // Visual scale multiplier
export const TRUE_SCALE_FACTOR = 1e-11; // True scale multiplier

// Visual coordinate system for the 3D scene.
// One AU of distance maps to 2000 visual units (matches the camera framing,
// orbit rendering, and StarField placement).
export const AU_TO_VISUAL = 2000 / AU;

// Radius exaggeration for planet/moon spheres in visual (enlarged) mode.
// Radii are inflated 30x over the distance scale (10x worse than the original
// 3x) so EVERY body preserves its true relative size ratio while the smallest
// planet (Mercury) still renders ~1.0 unit — legible at typical zoom levels.
// Resulting radii: Mercury 0.98, Venus 2.43, Earth 2.56, Mars 1.36, Jupiter
// 28.0, Saturn 23.4, Uranus 10.2, Neptune 9.9. Each planet stays small enough
// that its moons' orbital radii (which use the true AU_TO_VISUAL distance
// scale) fall outside the globe. The Sun is deliberately NOT scaled with this
// (see SUN_VISUAL_RADIUS_CAP in Scene.tsx) — its true 109:1 ratio to Earth
// would render ~279 units and dominate the default frame.
export const VISUAL_RADIUS_SCALE = AU_TO_VISUAL * 30;

// Minimum rendered radius (visual units) for planets in visual mode. Kept only
// as a safety net against sub-pixel bodies under extreme user zoom-out; at the
// 30x VISUAL_RADIUS_SCALE every planet already exceeds 0.9 units, so nothing
// real trips it.
export const MIN_VISUAL_RADIUS = 0.1;

// Cap for the Sun's rendered radius (visual units) in visual mode. The Sun's
// radius at the 30x planet scale is ~279 units — far larger than every planet
// — which would make the Sun blot out the inner system from the default
// camera. Clamp the photosphere (and its corona / solar-wind particles) to
// keep the frame balanced while everything else keeps true relative sizes.
export const SUN_VISUAL_RADIUS_CAP = 30;

// Rendering limits
export const MAX_RENDER_DISTANCE = 1e22; // ~1 Mpc
export const MIN_RENDER_DISTANCE = 0.1; // 10 cm
export const LOG_DEPTH_BASE = 2.0;

// Performance constants
export const MAX_STARS_RENDER = 100000;
export const MAX_ASTEROIDS_RENDER = 50000;
export const MAX_KUIPER_RENDER = 20000;