import * as THREE from 'three';

/**
 * Per-body PBR surface properties for MeshStandardMaterial.
 *
 * Physically, every planet/moon here is non-metallic (metalness ≈ 0). The key
 * differentiator is roughness:
 *   - Rocky, cratered, dusty bodies are rough (Mercury, Mars, the Moon, ...)
 *   - Gas giants and ice-covered moons are smooth and mirror-like (Jupiter,
 *     Saturn, Europa, Enceladus, ...)
 * These drive how much the Sun's light scatters off each surface, giving the
 * scene a much more physical, cinematic look than the previous uniform
 * roughness: 0.7 across every body.
 */
export interface PBRConfig {
  roughness: number;
  metalness: number;
  /** Optional subtle emissive tint (e.g. Venus' glowing clouds). 0 = none. */
  emissiveIntensity?: number;
  /** Bump scale when an elevation map is present. */
  bumpScale?: number;
}

export const PLANET_PBR: Record<string, PBRConfig> = {
  // ---- Rocky / terrestrial (rough) ----
  mercury: { roughness: 0.95, metalness: 0.0, bumpScale: 0.06 },
  venus:   { roughness: 0.8,  metalness: 0.0, bumpScale: 0.02 },
  earth:   { roughness: 0.55, metalness: 0.0, bumpScale: 0.02 },
  mars:    { roughness: 0.95, metalness: 0.0, bumpScale: 0.06 },
  moon:    { roughness: 0.9,  metalness: 0.0, bumpScale: 0.05 },
  pluto:   { roughness: 0.85, metalness: 0.0, bumpScale: 0.04 },
  ceres:   { roughness: 0.95, metalness: 0.0, bumpScale: 0.05 },
  eris:    { roughness: 0.85, metalness: 0.0, bumpScale: 0.03 },
  makemake:{ roughness: 0.85, metalness: 0.0, bumpScale: 0.03 },
  haumea:  { roughness: 0.85, metalness: 0.0, bumpScale: 0.03 },

  // ---- Gas giants (smooth) ----
  jupiter: { roughness: 0.35, metalness: 0.0, bumpScale: 0.005 },
  saturn:  { roughness: 0.35, metalness: 0.0, bumpScale: 0.005 },
  uranus:  { roughness: 0.3,  metalness: 0.0, bumpScale: 0.005 },
  neptune: { roughness: 0.3,  metalness: 0.0, bumpScale: 0.005 },

  // ---- Major moons ----
  io:       { roughness: 0.85, metalness: 0.0, bumpScale: 0.05 }, // volcanic
  europa:   { roughness: 0.35, metalness: 0.0, bumpScale: 0.01 }, // smooth ice
  ganymede: { roughness: 0.8,  metalness: 0.0, bumpScale: 0.04 },
  callisto: { roughness: 0.95, metalness: 0.0, bumpScale: 0.05 },
  titan:    { roughness: 0.7,  metalness: 0.0, bumpScale: 0.02 }, // hazy
  enceladus:{ roughness: 0.3,  metalness: 0.0, bumpScale: 0.01 }, // fresh ice
};

/** Fallback for any body without an explicit entry. */
export const DEFAULT_PBR: PBRConfig = { roughness: 0.7, metalness: 0.0, bumpScale: 0.04 };

export function getPBR(bodyId: string): PBRConfig {
  return PLANET_PBR[bodyId] ?? DEFAULT_PBR;
}

/**
 * Mark a map as data (linear) rather than color (sRGB). Normal and bump maps
 * encode vectors/height, so they must NOT be decoded as sRGB or the lighting
 * direction gets wrong. Call this on any normal/bump texture before use.
 */
export function markAsLinearTexture(tex: THREE.Texture | null): void {
  if (tex) tex.colorSpace = THREE.NoColorSpace;
}
