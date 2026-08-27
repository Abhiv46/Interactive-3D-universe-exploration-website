// Search index for celestial objects
// Provides fast fuzzy search across all object types

import { CelestialBodyData, BodyType, StarData, GalaxyData } from '../types/orbitalElements';

export interface SearchResult {
  id: string;
  name: string;
  type: BodyType;
  distance?: number; // Light years from Sun
  relevance: number;
  data: CelestialBodyData | StarData | GalaxyData | any;
}

export interface SearchOptions {
  query: string;
  limit?: number;
  types?: BodyType[];
  maxDistance?: number; // Light years
}

// Search index builder
export class SearchIndex {
  private items: Map<string, SearchableItem> = new Map();
  private typeIndex: Map<BodyType, Set<string>> = new Map();
  private nameIndex: Map<string, Set<string>> = new Map(); // Token -> item IDs

  constructor() {
    // Initialize type index
    const allTypes: BodyType[] = [
      'planet', 'dwarf_planet', 'moon', 'star', 'galaxy', 'asteroid', 'comet'
    ];
    allTypes.forEach(t => this.typeIndex.set(t, new Set()));
  }

  add(item: SearchableItem): void {
    this.items.set(item.id, item);
    this.typeIndex.get(item.type)?.add(item.id);

    // Index name tokens
    const tokens = this.tokenize(item.name);
    tokens.forEach(token => {
      if (!this.nameIndex.has(token)) {
        this.nameIndex.set(token, new Set());
      }
      this.nameIndex.get(token)!.add(item.id);
    });

    // Index designation tokens if present
    if (item.designation) {
      const tokens = this.tokenize(item.designation);
      tokens.forEach(token => {
        if (!this.nameIndex.has(token)) {
          this.nameIndex.set(token, new Set());
        }
        this.nameIndex.get(token)!.add(item.id);
      });
    }
  }

  addAll(items: SearchableItem[]): void {
    items.forEach(item => this.add(item));
  }

  search(options: SearchOptions): SearchResult[] {
    const { query, limit = 20, types, maxDistance } = options;
    const tokens = this.tokenize(query);

    if (tokens.length === 0) return [];

    // Find candidate IDs by intersecting token results
    let candidateIds: Set<string> | null = null;

    tokens.forEach(token => {
      const exactMatches = this.nameIndex.get(token);
      const prefixMatches = this.findPrefixMatches(token);

      const tokenMatches = new Set<string>();
      if (exactMatches) {
        exactMatches.forEach(id => tokenMatches.add(id));
      }
      prefixMatches.forEach(id => tokenMatches.add(id));

      if (candidateIds === null) {
        candidateIds = tokenMatches;
      } else {
        // Intersection
        const newCandidates = new Set<string>();
        candidateIds.forEach(id => {
          if (tokenMatches.has(id)) newCandidates.add(id);
        });
        candidateIds = newCandidates;
      }
    });

    if (!candidateIds || candidateIds.size === 0) return [];

    // Filter by type
    if (types && types.length > 0) {
      const typeFiltered = new Set<string>();
      types.forEach(type => {
        const typeIds = this.typeIndex.get(type);
        if (typeIds) {
          candidateIds!.forEach(id => {
            if (typeIds.has(id)) typeFiltered.add(id);
          });
        }
      });
      candidateIds = typeFiltered;
    }

    // Score and sort candidates
    const results: SearchResult[] = [];
    candidateIds.forEach(id => {
      const item = this.items.get(id);
      if (!item) return;

      // Distance filter
      if (maxDistance !== undefined && item.distance !== undefined) {
        if (item.distance > maxDistance) return;
      }

      const relevance = this.calculateRelevance(query, tokens, item);
      if (relevance > 0) {
        results.push({
          id: item.id,
          name: item.name,
          type: item.type,
          distance: item.distance,
          relevance,
          data: item.data,
        });
      }
    });

    // Sort by relevance (descending)
    results.sort((a, b) => b.relevance - a.relevance);

    return results.slice(0, limit);
  }

  private calculateRelevance(query: string, tokens: string[], item: SearchableItem): number {
    let score = 0;

    // Exact name match bonus
    if (item.name.toLowerCase() === query.toLowerCase()) {
      score += 1000;
    }

    // Starts with query
    if (item.name.toLowerCase().startsWith(query.toLowerCase())) {
      score += 500;
    }

    // Token matches
    const nameTokens = this.tokenize(item.name);
    tokens.forEach(token => {
      if (nameTokens.includes(token)) {
        score += 100;
      }
      // Prefix match
      nameTokens.forEach(nt => {
        if (nt.startsWith(token)) {
          score += 50;
        }
      });
    });

    // Designation match
    if (item.designation) {
      const desTokens = this.tokenize(item.designation);
      tokens.forEach(token => {
        if (desTokens.includes(token)) {
          score += 80;
        }
      });
    }

    // Type match (if query contains type name)
    const typeNames: Record<string, string[]> = {
      planet: ['planet', 'planets'],
      dwarf: ['dwarf', 'dwarf planet'],
      moon: ['moon', 'moons', 'satellite'],
      star: ['star', 'stars'],
      galaxy: ['galaxy', 'galaxies'],
      asteroid: ['asteroid', 'asteroids'],
      comet: ['comet', 'comets'],
    };

    const typeTokens = typeNames[item.type] || [item.type];
    typeTokens.forEach(tt => {
      if (query.toLowerCase().includes(tt.toLowerCase())) {
        score += 30;
      }
    });

    // Distance bonus (closer = more relevant for same name)
    if (item.distance !== undefined && item.distance < 100) {
      score += Math.max(0, 20 - item.distance / 5);
    }

    // Brightness/prominence bonus (for stars/galaxies)
    if (item.magnitude !== undefined && item.magnitude < 6) {
      score += (6 - item.magnitude) * 5;
    }

    // Popular objects get a boost
    const popularNames = [
      'sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune',
      'pluto', 'moon', 'sirius', 'alpha centauri', 'proxima centauri', 'betelgeuse',
      'rigel', 'vega', 'arcturus', 'capella', 'aldebaran', 'antares', 'spica',
      'andromeda', 'm31', 'triangulum', 'm33', 'large magellanic cloud', 'small magellanic cloud',
      'm81', 'm82', 'centaurus a', 'sombrero', 'whirlpool', 'crab', 'orion nebula'
    ];

    if (popularNames.some(p => item.name.toLowerCase().includes(p))) {
      score += 10;
    }

    return score;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .split(/\s+/)
      .filter(t => t.length >= 2); // Filter out single chars
  }

  private findPrefixMatches(prefix: string): Set<string> {
    const matches = new Set<string>();
    this.nameIndex.forEach((ids, token) => {
      if (token.startsWith(prefix)) {
        ids.forEach(id => matches.add(id));
      }
    });
    return matches;
  }

  getById(id: string): SearchableItem | undefined {
    return this.items.get(id);
  }

  getAllByType(type: BodyType): SearchableItem[] {
    const ids = this.typeIndex.get(type);
    if (!ids) return [];
    const result: SearchableItem[] = [];
    ids.forEach(id => {
      const item = this.items.get(id);
      if (item) result.push(item);
    });
    return result;
  }

  clear(): void {
    this.items.clear();
    this.typeIndex.forEach(set => set.clear());
    this.nameIndex.clear();
  }

  get size(): number {
    return this.items.size;
  }
}

export interface SearchableItem {
  id: string;
  name: string;
  designation?: string;
  type: BodyType;
  distance?: number; // Light years
  magnitude?: number; // Apparent magnitude for stars/galaxies
  data: any; // Original data object
}

// Build search index from all catalog data
export function buildSearchIndex(data: {
  planets: CelestialBodyData[];
  moons: CelestialBodyData[];
  dwarfPlanets: CelestialBodyData[];
  stars: StarData[];
  galaxies: GalaxyData[];
  asteroids: any[];
  comets: any[];
}): SearchIndex {
  const index = new SearchIndex();

  // Add planets
  data.planets.forEach(p => {
    const designations = p.metadata?.designations?.join(', ') || '';
    index.add({
      id: p.id,
      name: p.name,
      designation: designations,
      type: p.type === 'dwarf_planet' ? 'dwarf_planet' : 'planet',
      distance: p.orbital ? p.orbital.semiMajorAxis / 9.461e15 : undefined, // Convert to ly
      data: p,
    });
  });

  // Add moons
  data.moons.forEach(m => {
    const designations = m.metadata?.designations?.join(', ') || '';
    index.add({
      id: m.id,
      name: m.name,
      designation: designations,
      type: 'moon',
      distance: m.orbital ? m.orbital.semiMajorAxis / 9.461e15 : undefined,
      data: m,
    });
  });

  // Add dwarf planets
  data.dwarfPlanets.forEach(d => {
    const designations = d.metadata?.designations?.join(', ') || '';
    index.add({
      id: d.id,
      name: d.name,
      designation: designations,
      type: 'dwarf_planet',
      distance: d.orbital ? d.orbital.semiMajorAxis / 9.461e15 : undefined,
      data: d,
    });
  });

  // Add stars
  data.stars.forEach(s => {
    // Use hipId as id, properName or bayer as name
    const id = s.hipId.toString();
    const name = s.properName || s.bayer || `HIP ${s.hipId}`;
    const designation = [s.bayer, s.flamsteed, s.hdId ? `HD ${s.hdId}` : null].filter(Boolean).join(', ');
    index.add({
      id,
      name,
      designation,
      type: 'star',
      distance: s.distance * 3.26156, // Convert parsecs to light years
      magnitude: s.vMag,
      data: s,
    });
  });

  // Add galaxies
  data.galaxies.forEach(g => {
    index.add({
      id: g.id,
      name: g.name,
      designation: g.designation,
      type: 'galaxy',
      distance: g.distance * 3.26156, // Convert parsecs to light years
      magnitude: g.magnitude,
      data: g,
    });
  });

  // Add asteroids
  data.asteroids.forEach(a => {
    index.add({
      id: a.id,
      name: a.name,
      designation: a.designation,
      type: 'asteroid',
      data: a,
    });
  });

  // Add comets
  data.comets.forEach(c => {
    index.add({
      id: c.id,
      name: c.name,
      designation: c.designation,
      type: 'comet',
      data: c,
    });
  });

  return index;
}

// Quick search function (uses global catalog)
let globalIndex: SearchIndex | null = null;

export function getGlobalSearchIndex(): SearchIndex {
  if (!globalIndex) {
    // Will be initialized after data is loaded
    globalIndex = new SearchIndex();
  }
  return globalIndex;
}

export function setGlobalSearchIndex(index: SearchIndex): void {
  globalIndex = index;
}

// Autocomplete suggestions
export function getAutocomplete(query: string, limit: number = 10): SearchResult[] {
  const index = getGlobalSearchIndex();
  return index.search({ query, limit });
}

// Search by coordinates (find objects near a position)
export function searchByPosition(
  ra: number,
  dec: number,
  radius: number, // degrees
  limit: number = 20
): SearchResult[] {
  const index = getGlobalSearchIndex();
  const results: SearchResult[] = [];

  index.items.forEach(item => {
    if (!item.data) return;

    const data = item.data;
    let itemRA: number | undefined;
    let itemDec: number | undefined;

    // Extract coordinates based on type
    if (data.orbit) {
      // For solar system objects, we'd need current position
      // This is a simplified version
    } else if (data.ra !== undefined && data.dec !== undefined) {
      itemRA = data.ra;
      itemDec = data.dec;
    }

    if (itemRA !== undefined && itemDec !== undefined) {
      const sep = angularSeparation(ra, dec, itemRA, itemDec);
      if (sep <= radius * Math.PI / 180) {
        results.push({
          id: item.id,
          name: item.name,
          type: item.type,
          distance: item.distance,
          relevance: 1 / (sep + 0.001),
          data: item.data,
        });
      }
    }
  });

  results.sort((a, b) => b.relevance - a.relevance);
  return results.slice(0, limit);
}

function angularSeparation(ra1: number, dec1: number, ra2: number, dec2: number): number {
  const sinDec1 = Math.sin(dec1);
  const sinDec2 = Math.sin(dec2);
  const cosDec1 = Math.cos(dec1);
  const cosDec2 = Math.cos(dec2);
  const cosDra = Math.cos(ra2 - ra1);

  const cosAngle = sinDec1 * sinDec2 + cosDec1 * cosDec2 * cosDra;
  return Math.acos(Math.max(-1, Math.min(1, cosAngle)));
}

// Export singleton for convenience
export const searchIndex = new SearchIndex();