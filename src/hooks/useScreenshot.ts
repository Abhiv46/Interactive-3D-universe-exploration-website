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

  const setRenderer = useCallback((renderer: THREE.WebGLRenderer) => {
    rendererRef.current = renderer;
  }, []);

  const setCamera = useCallback((camera: THREE.Camera) => {
    cameraRef.current = camera;
  }, []);

  const setScene = useCallback((scene: THREE.Scene) => {
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

    try {
      // Store original settings
      const originalSize = renderer.getSize(new THREE.Vector2());
      const originalPixelRatio = renderer.getPixelRatio();

      // Set high resolution for screenshot
      const width = originalSize.x * multiplier;
      const height = originalSize.y * multiplier;
      renderer.setSize(width, height, false);
      renderer.setPixelRatio(1); // Use 1 for screenshot, multiplier handles resolution

      // Render to canvas
      renderer.render(scene, camera);

      // Get data URL
      const mimeType = format === 'png' ? 'image/png' : format === 'jpeg' ? 'image/jpeg' : 'image/webp';
      const dataUrl = renderer.domElement.toDataURL(mimeType, quality);

      // Restore original settings
      renderer.setSize(originalSize.x, originalSize.y, false);
      renderer.setPixelRatio(originalPixelRatio);

      // Trigger download
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${filename}.${format}`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Revoke object URL if it was a blob URL (not needed for data URL)
      return dataUrl;
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      return null;
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

    try {
      const originalSize = renderer.getSize(new THREE.Vector2());
      const originalPixelRatio = renderer.getPixelRatio();

      const width = originalSize.x * multiplier;
      const height = originalSize.y * multiplier;
      renderer.setSize(width, height, false);
      renderer.setPixelRatio(1);

      renderer.render(scene, camera);

      // Convert to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        renderer.domElement.toBlob(resolve, format === 'png' ? 'image/png' : format === 'jpeg' ? 'image/jpeg' : 'image/webp', quality);
      });

      renderer.setSize(originalSize.x, originalSize.y, false);
      renderer.setPixelRatio(originalPixelRatio);

      return blob;
    } catch (error) {
      console.error('Screenshot blob capture failed:', error);
      return null;
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