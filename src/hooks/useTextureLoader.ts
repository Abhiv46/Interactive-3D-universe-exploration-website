import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { useLoading } from '@/components/UI/LoadingScreen';

/**
 * Wrapper around useLoader that:
 * 1. Handles errors gracefully (returns null instead of throwing)
 * 2. Reports both successful loads and failures to LoadingContext
 * 3. Returns a valid texture or null
 */
export function useTextureLoader(url: string | undefined | null, onLoad?: (texture: THREE.Texture | null) => void) {
  const { onTextureLoad } = useLoading();

  // If no URL provided, return null immediately and report as "loaded" (no texture needed)
  if (!url) {
    if (onLoad) onLoad(null);
    if (onTextureLoad) onTextureLoad({ type: 'skipped', url: 'none' });
    return null;
  }

  try {
    const texture = useLoader(
      THREE.TextureLoader,
      url,
      undefined, // extensions
      undefined  // onProgress - we don't track individual progress
    ) as THREE.Texture | null;

    // Report success
    if (texture) {
      if (onLoad) onLoad(texture);
      if (onTextureLoad) onTextureLoad({ type: 'loaded', url, texture });
    } else {
      if (onLoad) onLoad(null);
      if (onTextureLoad) onTextureLoad({ type: 'null', url });
    }

    return texture;
  } catch (error) {
    // If useLoader throws (e.g., 404), we need to handle it
    // Note: In practice, useLoader with Suspense throws a promise, not an error
    // The error boundary catches it. So we use a fallback approach.
    console.warn('[TextureLoader] Failed to load:', url, error);
    if (onLoad) onLoad(null);
    if (onTextureLoad) onTextureLoad({ type: 'error', url, error });
    return null;
  }
}

/**
 * Creates a texture from a data URL or fallback color
 * Useful as fallback when texture loading fails
 */
export function createFallbackTexture(color: string = '#888888'): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 64, 64);
  // Add a subtle pattern so it's not just flat
  ctx.fillStyle = '#666666';
  for (let x = 0; x < 64; x += 8) {
    for (let y = 0; y < 64; y += 8) {
      if ((x + y) % 16 === 0) ctx.fillRect(x, y, 4, 4);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 16;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Safe texture loader that always returns a valid texture
 * Uses fallback if the real texture fails to load
 */
export function useSafeTextureLoader(url: string | undefined | null, fallbackColor?: string): THREE.Texture | null {
  const { onTextureLoad } = useLoading();
  const baseColor = fallbackColor || '#888888';

  if (!url) {
    const fallback = createFallbackTexture(baseColor);
    if (onTextureLoad) onTextureLoad({ type: 'fallback', url: 'none', texture: fallback });
    return fallback;
  }

  try {
    const texture = useLoader(
      THREE.TextureLoader,
      url,
      undefined,
      undefined
    ) as THREE.Texture | null;

    if (texture) {
      if (onTextureLoad) onTextureLoad({ type: 'loaded', url, texture });
      return texture;
    }
  } catch (error) {
    console.warn('[SafeTextureLoader] Failed to load:', url, error);
  }

  // Fallback
  const fallback = createFallbackTexture(baseColor);
  if (onTextureLoad) onTextureLoad({ type: 'fallback', url, texture: fallback });
  return fallback;
}