import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { useLoading } from '@/components/UI/LoadingScreen';
import { useRef, useMemo, useEffect, useState } from 'react';

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

// Memoized fallback texture cache to prevent recreating on every render
const fallbackTextureCache = new Map<string, THREE.Texture>();

/**
 * Creates a texture from a data URL or fallback color
 * Useful as fallback when texture loading fails
 */
export function createFallbackTexture(color: string = '#888888'): THREE.Texture {
  const cacheKey = `fallback:${color}`;
  if (fallbackTextureCache.has(cacheKey)) {
    return fallbackTextureCache.get(cacheKey)!;
  }
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
  fallbackTextureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Safe texture loader that returns a real texture once it finishes loading.
 *
 * IMPORTANT: This deliberately does NOT use `useLoader`. `useLoader` suspends
 * by throwing a Promise that must bubble to a <Suspense> boundary. When this
 * hook wrapped it in try/catch, that Promise was caught as an "error", so
 * EVERY texture skipped straight to the flat canvas fallback — which is why
 * every planet looked perfectly flat. Instead we load with TextureLoader.load
 * in an effect and return null until the real texture arrives, letting the
 * material render its base color meanwhile.
 *
 * Deduplicates load reports so the loading counter isn't inflated.
 */
export function useSafeTextureLoader(url: string | undefined | null, fallbackColor?: string): THREE.Texture | null {
  const { onTextureLoad } = useLoading();
  const baseColor = fallbackColor || '#888888';
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const reportedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setTexture(null);
    reportedRef.current = false;

    // No texture file for this body -> stay flat (material uses base color).
    if (!url) return;

    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (tex) => {
        if (cancelled) return;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = 16;
        tex.colorSpace = THREE.SRGBColorSpace;
        setTexture(tex);
        if (!reportedRef.current) {
          reportedRef.current = true;
          if (onTextureLoad) onTextureLoad({ type: 'loaded', url, texture: tex });
        }
      },
      undefined, // onProgress - not tracked
      (error) => {
        if (cancelled) return;
        console.warn('[SafeTextureLoader] Failed to load:', url, error);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [url, baseColor, onTextureLoad]);

  return texture;
}