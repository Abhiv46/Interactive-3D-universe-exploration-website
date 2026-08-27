// Texture loading and management
// Handles loading planetary textures, star maps, and procedural fallbacks

import * as THREE from 'three';

export interface TextureSet {
  map: THREE.Texture;        // Color/albedo
  normalMap?: THREE.Texture; // Normal map for surface detail
  specularMap?: THREE.Texture; // Specular/roughness map
  displacementMap?: THREE.Texture; // Height map
  roughnessMap?: THREE.Texture; // Roughness map (PBR)
  metalnessMap?: THREE.Texture; // Metalness map (PBR)
  emissiveMap?: THREE.Texture; // Emissive map (for self-luminous surfaces)
  aoMap?: THREE.Texture;     // Ambient occlusion
}

export interface TextureQuality {
  resolution: 'low' | 'medium' | 'high' | 'ultra';
  generateMipmaps: boolean;
  anisotropy: number;
}

export const DEFAULT_QUALITY: TextureQuality = {
  resolution: 'high',
  generateMipmaps: true,
  anisotropy: 4,
};

// Texture loading with caching
class TextureLoaderManager {
  private cache: Map<string, THREE.Texture> = new Map();
  private loadingPromises: Map<string, Promise<THREE.Texture>> = new Map();

  async load(
    url: string,
    options: {
      srgb?: boolean;
      generateMipmaps?: boolean;
      anisotropy?: number;
      repeat?: [number, number];
      encoding?: THREE.TextureEncoding;
    } = {}
  ): Promise<THREE.Texture> {
    // Check cache
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    // Check in-flight loading
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    // Start loading
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');

    const promise = new Promise<THREE.Texture>((resolve, reject) => {
      loader.load(
        url,
        (texture) => {
          // Apply options
          if (options.srgb !== false) {
            texture.encoding = THREE.sRGBEncoding;
          }
          if (options.generateMipmaps !== false) {
            texture.generateMipmaps = true;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
          }
          if (options.anisotropy) {
            texture.anisotropy = options.anisotropy;
          }
          if (options.repeat) {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(options.repeat[0], options.repeat[1]);
          }

          this.cache.set(url, texture);
          this.loadingPromises.delete(url);
          resolve(texture);
        },
        undefined,
        (error) => {
          this.loadingPromises.delete(url);
          reject(error);
        }
      );
    });

    this.loadingPromises.set(url, promise);
    return promise;
  }

  getCached(url: string): THREE.Texture | undefined {
    return this.cache.get(url);
  }

  clearCache(): void {
    this.cache.forEach((texture) => texture.dispose());
    this.cache.clear();
  }
}

export const textureManager = new TextureLoaderManager();

// Load complete texture set for a planet
export async function loadPlanetTextureSet(
  baseUrl: string,
  options: Partial<TextureQuality> = {}
): Promise<TextureSet> {
  const quality = { ...DEFAULT_QUALITY, ...options };

  // Determine resolution suffix
  const resSuffix = quality.resolution === 'low' ? '_1k' :
                    quality.resolution === 'medium' ? '_2k' :
                    quality.resolution === 'high' ? '_4k' :
                    '_8k';

  const suffix = quality.resolution === 'ultra' ? '' : resSuffix;

  const results = await Promise.all([
    textureManager.load(`${baseUrl}${suffix}_albedo.jpg`, { srgb: true, anisotropy: quality.anisotropy }),
    textureManager.load(`${baseUrl}${suffix}_normal.jpg`, { srgb: false, anisotropy: quality.anisotropy }).catch(() => undefined),
    textureManager.load(`${baseUrl}${suffix}_specular.jpg`, { srgb: false, anisotropy: quality.anisotropy }).catch(() => undefined),
    textureManager.load(`${baseUrl}${suffix}_displacement.jpg`, { srgb: false, anisotropy: quality.anisotropy }).catch(() => undefined),
    textureManager.load(`${baseUrl}${suffix}_roughness.jpg`, { srgb: false, anisotropy: quality.anisotropy }).catch(() => undefined),
    textureManager.load(`${baseUrl}${suffix}_metalness.jpg`, { srgb: false, anisotropy: quality.anisotropy }).catch(() => undefined),
    textureManager.load(`${baseUrl}${suffix}_emissive.jpg`, { srgb: true, anisotropy: quality.anisotropy }).catch(() => undefined),
    textureManager.load(`${baseUrl}${suffix}_ao.jpg`, { srgb: false, anisotropy: quality.anisotropy }).catch(() => undefined),
  ]);

  return {
    map: results[0],
    normalMap: results[1],
    specularMap: results[2],
    displacementMap: results[3],
    roughnessMap: results[4],
    metalnessMap: results[5],
    emissiveMap: results[6],
    aoMap: results[7],
  };
}

// Procedural texture generation as fallback
export function generateProceduralPlanetTexture(
  options: {
    baseColor?: THREE.Color;
    type?: 'rocky' | 'gassy' | 'icy' | 'lava' | 'ocean' | 'terran';
    seed?: number;
    octaves?: number;
    resolution?: number;
  } = {}
): THREE.Texture {
  const {
    baseColor = new THREE.Color(0.5, 0.5, 0.5),
    type = 'rocky',
    seed = 12345,
    octaves = 6,
    resolution = 1024,
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution / 2;
  const ctx = canvas.getContext('2d')!;

  const imageData = ctx.createImageData(canvas.width, canvas.height);
  const data = imageData.data;

  // Simple value noise
  const rand = randomSeed(seed);
  const noiseScale = 8;
  const perm = new Uint8Array(512);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];

  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + t * (b - a);
  const grad = (hash: number, x: number, y: number) => {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
  };

  const noise = (x: number, y: number) => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = fade(x);
    const v = fade(y);
    const a = perm[X] + Y;
    const b = perm[X + 1] + Y;
    return lerp(
      lerp(grad(perm[a], x, y), grad(perm[b], x - 1, y), u),
      lerp(grad(perm[a + 1], x, y - 1), grad(perm[b + 1], x - 1, y - 1), u),
      v
    );
  };

  const fbm = (x: number, y: number) => {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1;
    for (let i = 0; i < octaves; i++) {
      value += amplitude * noise(x * frequency, y * frequency);
      amplitude *= 0.5;
      frequency *= 2;
    }
    return value;
  };

  for (let py = 0; py < canvas.height; py++) {
    for (let px = 0; px < canvas.width; px++) {
      const u = px / canvas.width;
      const v = py / canvas.height;

      // Spherical mapping
      const theta = u * Math.PI * 2;
      const phi = v * Math.PI;
      const nx = Math.sin(phi) * Math.cos(theta);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.sin(theta);

      let height = fbm(nx * noiseScale + 100, ny * noiseScale + 100);

      const idx = (py * canvas.width + px) * 4;
      let r = baseColor.r, g = baseColor.g, b = baseColor.b;

      switch (type) {
        case 'gassy':
          // Banded gas giant
          height = Math.sin(ny * 20 + fbm(nx * 2, ny * 2) * 2) * 0.5 + 0.5;
          r = baseColor.r * (0.8 + height * 0.4);
          g = baseColor.g * (0.8 + height * 0.4);
          b = baseColor.b * (0.8 + height * 0.4);
          break;
        case 'icy':
          height = fbm(nx * 4, ny * 4);
          r = baseColor.r + height * 0.2;
          g = baseColor.g + height * 0.2;
          b = baseColor.b + height * 0.2;
          break;
        case 'lava':
          height = fbm(nx * 3, ny * 3);
          if (height > 0.4) {
            r = 1.0; g = height * 0.5; b = 0.1;
          } else {
            r = baseColor.r * 0.5;
            g = baseColor.g * 0.3;
            b = baseColor.b * 0.3;
          }
          break;
        case 'ocean':
          height = fbm(nx * 3, ny * 3);
          if (height > 0.5) {
            // Land
            r = 0.2 + height * 0.3;
            g = 0.5 + height * 0.3;
            b = 0.2;
          } else {
            // Ocean
            r = 0.1;
            g = 0.2;
            b = 0.5 + (0.5 - height) * 0.5;
          }
          break;
        case 'terran':
          height = fbm(nx * 4, ny * 4);
          if (height > 0.55) {
            // Mountains/land
            r = 0.4 + height * 0.4;
            g = 0.35 + height * 0.3;
            b = 0.2;
          } else if (height > 0.5) {
            // Plains
            r = 0.3;
            g = 0.5;
            b = 0.2;
          } else if (height > 0.3) {
            // Water
            r = 0.1;
            g = 0.2;
            b = 0.4;
          } else {
            // Deep water
            r = 0.05;
            g = 0.1;
            b = 0.3;
          }
          // Ice caps
          if (Math.abs(ny) > 0.85) {
            r = 0.9; g = 0.9; b = 0.95;
          }
          break;
        case 'rocky':
        default:
          r = baseColor.r * (0.7 + height * 0.5);
          g = baseColor.g * (0.7 + height * 0.5);
          b = baseColor.b * (0.7 + height * 0.5);
          break;
      }

      data[idx] = Math.floor(clamp01(r) * 255);
      data[idx + 1] = Math.floor(clamp01(g) * 255);
      data[idx + 2] = Math.floor(clamp01(b) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;

  return texture;
}

export function generateProceduralNormalMap(
  sourceTexture: THREE.Texture,
  strength: number = 1.0
): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = sourceTexture.image.width;
  canvas.height = sourceTexture.image.height;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(sourceTexture.image, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;

  const getHeight = (x: number, y: number): number => {
    x = (x + width) % width;
    y = (y + height) % height;
    const idx = (y * width + x) * 4;
    return (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) / 255;
  };

  // Sobel operator for normal calculation
  const normalData = ctx.createImageData(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tl = getHeight(x - 1, y - 1);
      const t = getHeight(x, y - 1);
      const tr = getHeight(x + 1, y - 1);
      const l = getHeight(x - 1, y);
      const r = getHeight(x + 1, y);
      const bl = getHeight(x - 1, y + 1);
      const b = getHeight(x, y + 1);
      const br = getHeight(x + 1, y + 1);

      const dX = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dY = (bl + 2 * b + br) - (tl + 2 * t + tr);

      const nx = -dX * strength;
      const ny = -dY * strength;
      const nz = 1.0;

      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      const idx = (y * width + x) * 4;
      normalData.data[idx] = ((nx / len) * 0.5 + 0.5) * 255;
      normalData.data[idx + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      normalData.data[idx + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      normalData.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(normalData, 0, 0);

  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Load star catalog data (for procedural stars if needed)
export async function loadStarCatalog(url: string): Promise<Float32Array> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return new Float32Array(buffer);
}

// Utility functions
function randomSeed(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

// Generate ring texture for Saturn-like planets
export function generateRingTexture(
  options: {
    innerRadius?: number;
    outerRadius?: number;
    seed?: number;
    resolution?: number;
  } = {}
): THREE.Texture {
  const { seed = 54321, resolution = 2048 } = options;

  const canvas = document.createElement('canvas');
  canvas.width = 4; // Narrow, will be mapped to ring
  canvas.height = resolution;
  const ctx = canvas.getContext('2d')!;

  const imageData = ctx.createImageData(4, resolution);
  const data = imageData.data;

  const rand = randomSeed(seed);

  for (let y = 0; y < resolution; y++) {
    const t = y / resolution;
    // Ring density pattern (simplified)
    let density = 0.5 + 0.3 * Math.sin(t * 50) + 0.2 * Math.sin(t * 200);

    // Cassini Division
    if (t > 0.4 && t < 0.45) density *= 0.1;

    // Random variation
    density *= 0.8 + 0.4 * rand();

    density = clamp01(density);

    for (let x = 0; x < 4; x++) {
      const idx = (y * 4 + x) * 4;
      data[idx] = density * 255;
      data[idx + 1] = density * 255;
      data[idx + 2] = density * 255;
      data[idx + 3] = density * 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  return texture;
}