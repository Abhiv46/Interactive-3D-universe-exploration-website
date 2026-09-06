import { useCallback, useRef } from 'react';
import * as THREE from 'three';

interface ScreenshotOptions {
  filename?: string;
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number; // 0-1 for jpeg/webp
  multiplier?: number; // Resolution multiplier for higher quality
  includeUI?: boolean; // Whether to include UI overlay in screenshot
}

/**
 * Hook for capturing screenshots of the Three.js canvas
 */
export function useScreenshot() {
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  const setRenderer = useCallback((renderer: THREE.WebGLRenderer | null) => {
    rendererRef.current = renderer;
  }, []);

  const setCamera = useCallback((camera: THREE.Camera | null) => {
    cameraRef.current = camera;
  }, []);

  const setScene = useCallback((scene: THREE.Scene | null) => {
    sceneRef.current = scene;
  }, []);

  const captureScreenshot = useCallback(async (options: ScreenshotOptions = {}): Promise<string | null> => {
    const {
      filename = `universe-explorer-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}`,
      format = 'png',
      quality = 0.92,
      multiplier = 1,
      includeUI = false,
    } = options;

    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    const scene = sceneRef.current;

    if (!renderer || !camera || !scene) {
      console.warn('Screenshot: Renderer, camera, or scene not available');
      return null;
    }

    const originalSize = renderer.getSize(new THREE.Vector2());
    const originalPixelRatio = renderer.getPixelRatio();
    const mimeType = format === 'png' ? 'image/png' : format === 'jpeg' ? 'image/jpeg' : 'image/webp';

    // Render one still at `mult`× and return its data URL. The drawing buffer
    // size and pixel ratio are ALWAYS restored on the way out — an encode
    // failure must never leave the interactive canvas stuck at the enlarged
    // resolution (a previous bug that tanked the renderer under SwiftShader).
    const exportStill = async (mult: number): Promise<string | null> => {
      try {
        const width = originalSize.x * mult;
        const height = originalSize.y * mult;
        renderer.setSize(width, height, false);
        renderer.setPixelRatio(1); // 1px per device px; `mult` picks the resolution
        renderer.render(scene, camera);
        const dataUrl = renderer.domElement.toDataURL(mimeType, quality);
        renderer.setSize(originalSize.x, originalSize.y, false);
        renderer.setPixelRatio(originalPixelRatio);
        return dataUrl;
      } catch {
        return null;
      }
    };

    try {
      let dataUrl = await exportStill(multiplier);

      // A high-resolution export can fail under memory pressure (headless
      // SwiftShader can't always build a 2× buffer). Fall back to a 1× still
      // before giving up, so the user still gets a screenshot; the interactive
      // view never regresses because exportStill restores size on every path.
      if (!dataUrl && multiplier > 1) {
        console.warn(`Screenshot: ${multiplier}× export failed, retrying at 1×`);
        dataUrl = await exportStill(1);
      }

      if (!dataUrl) {
        console.error('Screenshot capture failed: canvas export failed at every resolution');
        return null;
      }

      // Trigger download
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${filename}.${format}`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return dataUrl;
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      return null;
    } finally {
      // Belt-and-braces: never leave the renderer in a resized state.
      renderer.setSize(originalSize.x, originalSize.y, false);
      renderer.setPixelRatio(originalPixelRatio);
    }
  }, []);

  const captureScreenshotBlob = useCallback(async (options: ScreenshotOptions = {}): Promise<Blob | null> => {
    const {
      format = 'png',
      quality = 0.92,
      multiplier = 1,
    } = options;

    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    const scene = sceneRef.current;

    if (!renderer || !camera || !scene) {
      console.warn('Screenshot: Renderer, camera, or scene not available');
      return null;
    }

    const originalSize = renderer.getSize(new THREE.Vector2());
    const originalPixelRatio = renderer.getPixelRatio();

    try {
      const width = originalSize.x * multiplier;
      const height = originalSize.y * multiplier;
      renderer.setSize(width, height, false);
      renderer.setPixelRatio(1);

      renderer.render(scene, camera);

      // Convert to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        renderer.domElement.toBlob(resolve, format === 'png' ? 'image/png' : format === 'jpeg' ? 'image/jpeg' : 'image/webp', quality);
      });

      return blob;
    } catch (error) {
      console.error('Screenshot blob capture failed:', error);
      return null;
    } finally {
      // Always restore the interactive canvas, even on a failed export.
      renderer.setSize(originalSize.x, originalSize.y, false);
      renderer.setPixelRatio(originalPixelRatio);
    }
  }, []);

  return {
    setRenderer,
    setCamera,
    setScene,
    captureScreenshot,
    captureScreenshotBlob,
  };
}

/**
 * Hook for sharing screenshots via Web Share API (if available)
 */
export function useShareScreenshot() {
  const { captureScreenshotBlob } = useScreenshot();

  const shareScreenshot = useCallback(async (options: ScreenshotOptions = {}) => {
    const blob = await captureScreenshotBlob({ ...options, format: 'png' });

    if (!blob) return false;

    // Check if Web Share API is available
    if (navigator.share && navigator.canShare) {
      try {
        const file = new File([blob], `universe-explorer-${Date.now()}.png`, { type: 'image/png' });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Universe Explorer Screenshot',
            text: 'Check out this view from Universe Explorer!',
            files: [file],
          });
          return true;
        }
      } catch (error) {
        console.warn('Web Share failed:', error);
      }
    }

    // Fallback: download the file
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `universe-explorer-${Date.now()}.png`;
    link.click();
    URL.revokeObjectURL(url);

    return true;
  }, [captureScreenshotBlob]);

  return { shareScreenshot };
}