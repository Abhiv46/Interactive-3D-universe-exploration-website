import { useState, useCallback, useEffect } from 'react';
import { useScreenshot } from '@/hooks/useScreenshot';
import { useAchievements } from '@/context/AchievementsContext';
import { useToast } from '@/components/UI/Toast';
import { useRenderState } from '@/context/RenderStateContext';

export function ScreenshotButton() {
  const { gl, camera, scene } = useRenderState();
  const { setRenderer, setCamera, setScene, captureScreenshot } = useScreenshot();
  const { unlockAchievement } = useAchievements();
  const { showToast } = useToast();
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastCapture, setLastCapture] = useState<string | null>(null);

  // Initialize the screenshot hook with renderer, camera, scene
  useEffect(() => {
    setRenderer(gl);
    setCamera(camera);
    setScene(scene);
  }, [gl, camera, scene, setRenderer, setCamera, setScene]);

  const handleScreenshot = useCallback(async () => {
    if (isCapturing) return;

    setIsCapturing(true);
    try {
      const dataUrl = await captureScreenshot({
        filename: `universe-explorer-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}`,
        format: 'png',
        // Test seam: the E2E suite runs under headless SwiftShader (software
        // WebGL), where a full-scene 2× render freezes the main thread for
        // minutes. A 1× still completes in seconds there, so the suite sets
        // window.__screenshotMultiplier__ = 1 to verify the capture contract
        // without the 2× cost. Real users keep 2×. See e2e/interactions.spec.ts.
        multiplier: (window as { __screenshotMultiplier__?: number }).__screenshotMultiplier__ ?? 2,
      });

      if (dataUrl) {
        setLastCapture(dataUrl);
        unlockAchievement('screenshotTaken');
        showToast({ type: 'success', title: 'Screenshot saved! 📸' });
      } else {
        showToast({ type: 'error', title: 'Screenshot failed ❌' });
      }
    } catch (error) {
      console.error('Screenshot error:', error);
      showToast({ type: 'error', title: 'Screenshot failed ❌' });
    } finally {
      setIsCapturing(false);
    }
  }, [captureScreenshot, isCapturing, unlockAchievement, showToast]);

  return (
    <button
      className={`screenshot-btn glass-btn ${isCapturing ? 'capturing' : ''}`}
      onClick={handleScreenshot}
      disabled={isCapturing}
      aria-label={isCapturing ? 'Capturing screenshot...' : 'Take screenshot (S)'}
      title={isCapturing ? 'Capturing...' : 'Take Screenshot (S)'}
    >
      {isCapturing ? (
        <>
          <span className="spinner" style={{ width: '16px', height: '16px', marginRight: '8px' }} />
          Capturing...
        </>
      ) : (
        <>
          <span style={{ fontSize: '18px' }}>📸</span>
          <span>Screenshot</span>
        </>
      )}
    </button>
  );
}

/**
 * Keyboard shortcut handler for screenshot (S key)
 */
export function useScreenshotShortcut(onScreenshot: () => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // S key for screenshot (but not when typing in input)
      if (
        e.key.toLowerCase() === 's' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement)
      ) {
        e.preventDefault();
        onScreenshot();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScreenshot]);
}