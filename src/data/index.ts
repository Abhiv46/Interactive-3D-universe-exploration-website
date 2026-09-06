// Data folder for celestial body data, constants, etc.
// Will be populated when adding planets, stars, etc.

export const PLANET_DATA = [] as const
export const STAR_DATA = [] as const

// Re-export all data modules with explicit names to avoid conflicts
// planets.ts exports: PLANETS, DWARF_PLANETS, ALL_PLANETS, PLANET_LOOKUP, PLANETS_BY_ID, PLANET_DISTANCES_AU
export { PLANET_LOOKUP, PLANETS, DWARF_PLANETS, ALL_PLANETS, PLANETS_BY_ID, PLANET_DISTANCES_AU } from './planets';
// moons.ts exports: MOON, PHOBOS, DEIMOS, IO, EUROPA, GANYMEDE, CALLISTO, TITAN, ENCELADUS, MIMAS, RHEA, DIONE, TETHYS, IAPETUS, MIRANDA, ARIEL, UMBRIEL, TITANIA, OBERON, TRITON, NEREID, CHARON, MAJOR_MOONS, GALILEAN_MOONS, SATURN_MAJOR_MOONS, URANUS_MAJOR_MOONS, NEPTUNE_MAJOR_MOONS, MOON_LOOKUP, MOONS_BY_ID
export { MOONS_BY_ID, MAJOR_MOONS as NOTABLE_MOONS } from './moons';
export * from './stars';
export * from './asteroids';
export * from './comets';
export * from './constellations';
// For galaxies, re-export everything but use different names for MILKY_WAY to avoid type issues
export { NEARBY_GALAXIES, MILKY_WAY as MILKY_WAY_CONFIG, SPIRAL_ARMS, PC_TO_LY, LY_TO_UNITS, PC_TO_UNITS, getGalaxyPosition, logScaleDistance, realDistanceFromVisual, equatorialToGalactic, galacticToCartesian } from './galaxies';

// Search catalog types
export interface SearchResult {
  id: string;
  name: string;
  type: string;
  distance?: number;
}

// Celestial type metadata
export const CELESTIAL_TYPES: Record<string, { icon: string; label: string }> = {
  planet: { icon: '🪐', label: 'Planet' },
  dwarf_planet: { icon: '🪨', label: 'Dwarf Planet' },
  moon: { icon: '🌙', label: 'Moon' },
  star: { icon: '⭐', label: 'Star' },
  galaxy: { icon: '🌌', label: 'Galaxy' },
  asteroid: { icon: '☄️', label: 'Asteroid' },
  comet: { icon: '☄️', label: 'Comet' },
  constellation: { icon: '✨', label: 'Constellation' },
};

// Cache for search catalog
let searchCatalogCache: SearchResult[] | null = null;

async function buildSearchCatalog(): Promise<SearchResult[]> {
  // Import dynamically to avoid circular dependencies
  const { PLANET_LOOKUP } = await import('./planets');
  const { MOONS_BY_ID } = await import('./moons');
  const { getStarCatalog } = await import('./stars');
  const { NOTABLE_ASTEROIDS, NOTABLE_KBO, JUPITER_TROJANS } = await import('./asteroids');
  const { NOTABLE_COMETS } = await import('./comets');
  const { CONSTELLATIONS } = await import('./constellations');
  const { NEARBY_GALAXIES } = await import('./galaxies');

  const catalog: SearchResult[] = [];

  // Add planets
  Object.values(PLANET_LOOKUP).forEach((body: any) => {
    catalog.push({ id: body.id, name: body.name, type: body.type });
  });

  // Add moons
  Object.values(MOONS_BY_ID || {}).forEach((body: any) => {
    catalog.push({ id: body.id, name: body.name, type: body.type });
  });

  // Add stars (getStarCatalog already includes the hand-curated BRIGHT_STARS)
  const allStars = getStarCatalog();
  allStars.forEach((body: any) => {
    catalog.push({ id: body.hipId.toString(), name: body.properName || body.bayer || body.flamsteed || `HIP ${body.hipId}`, type: 'star', distance: body.distance });
  });

  // Add asteroids
  NOTABLE_ASTEROIDS.forEach((body: any) => {
    catalog.push({ id: body.id, name: body.name, type: 'asteroid' });
  });
  NOTABLE_KBO.forEach((body: any) => {
    catalog.push({ id: body.id, name: body.name, type: 'asteroid' });
  });
  JUPITER_TROJANS.forEach((body: any) => {
    catalog.push({ id: body.id, name: body.name, type: 'asteroid' });
  });

  // Add comets
  NOTABLE_COMETS.forEach((body: any) => {
    catalog.push({ id: body.id, name: body.name, type: 'comet' });
  });

  // Add constellations
  // CONSTELLATIONS is an array of constellation objects
  if (CONSTELLATIONS && Array.isArray(CONSTELLATIONS)) {
    CONSTELLATIONS.forEach((body: any) => {
      catalog.push({ id: body.id, name: body.name, type: 'constellation' });
    });
  }

  // Add galaxies
  catalog.push({ id: 'milky-way', name: 'Milky Way', type: 'galaxy', distance: 0 });
  NEARBY_GALAXIES.forEach((body: any) => {
    catalog.push({ id: body.id, name: body.name, type: 'galaxy', distance: body.distance });
  });

  return catalog;
}

export async function getSearchCatalog(): Promise<SearchResult[]> {
  if (searchCatalogCache) return searchCatalogCache;
  searchCatalogCache = await buildSearchCatalog();
  return searchCatalogCache;
}

export async function searchCatalog(query: string): Promise<SearchResult[]> {
  const catalog = await getSearchCatalog();
  const lowerQuery = query.toLowerCase();

  return catalog
    .filter(item =>
      item.name.toLowerCase().includes(lowerQuery) ||
      item.id.toLowerCase().includes(lowerQuery)
    )
    .map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      distance: item.distance,
    }))
    .sort((a, b) => {
      // Exact matches first, then prefix matches, then contains
      const aExact = a.name.toLowerCase() === lowerQuery;
      const bExact = b.name.toLowerCase() === lowerQuery;
      const aPrefix = a.name.toLowerCase().startsWith(lowerQuery);
      const bPrefix = b.name.toLowerCase().startsWith(lowerQuery);

      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      if (aPrefix && !bPrefix) return -1;
      if (!aPrefix && bPrefix) return 1;
      return a.name.localeCompare(b.name);
    });
}

export async function getObjectById(id: string): Promise<any> {
  // Import dynamically to avoid circular dependencies
  const { PLANET_LOOKUP } = await import('./planets');
  const { MOONS_BY_ID } = await import('./moons');
  const { getStarCatalog } = await import('./stars');
  const { NOTABLE_ASTEROIDS, NOTABLE_KBO, JUPITER_TROJANS } = await import('./asteroids');
  const { NOTABLE_COMETS } = await import('./comets');
  const { CONSTELLATIONS } = await import('./constellations');
  const { NEARBY_GALAXIES } = await import('./galaxies');

  // Check planets
  if (PLANET_LOOKUP[id]) return PLANET_LOOKUP[id];
  if (MOONS_BY_ID?.[id]) return MOONS_BY_ID[id];

  // Check stars (getStarCatalog already includes BRIGHT_STARS)
  const allStars = getStarCatalog();
  const star = allStars.find((s: any) => s.hipId.toString() === id || s.properName?.toLowerCase() === id.toLowerCase());
  if (star) return star;

  // Check asteroids
  const asteroids = [...NOTABLE_ASTEROIDS, ...NOTABLE_KBO, ...JUPITER_TROJANS];
  const asteroid = asteroids.find((a: any) => a.id === id);
  if (asteroid) return asteroid;

  // Check comets
  const comet = NOTABLE_COMETS.find((c: any) => c.id === id);
  if (comet) return comet;

  // Check constellations
  if (CONSTELLATIONS && Array.isArray(CONSTELLATIONS)) {
    const constellation = CONSTELLATIONS.find((c: any) => c.id === id);
    if (constellation) return constellation;
  }

  // Check galaxies
  if (id === 'milky-way') {
    // Return Milky Way as a GalaxyData-compatible object
    return {
      id: 'milky-way',
      name: 'Milky Way',
      designation: 'MW',
      type: 'SBbc',
      ra: 266.4051,
      dec: -28.9362,
      distance: 0,
      magnitude: -6.5,
      angularSize: 360 * 60, // full sky
      description: 'Our home galaxy, a barred spiral galaxy containing 100-400 billion stars.',
    };
  }
  const galaxy = NEARBY_GALAXIES.find((g: any) => g.id === id);
  if (galaxy) return galaxy;

  return null;
}