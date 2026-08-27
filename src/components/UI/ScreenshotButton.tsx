import { useState, useCallback, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useScreenshot } from '@/hooks/useScreenshot';

export function ScreenshotButton() {
  const { gl, camera, scene } = useThree();
  const { setRenderer, setCamera, setScene, captureScreenshot } = useScreenshot();
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
        multiplier: 2, // 2x resolution for crisp screenshots
      });

      if (dataUrl) {
        setLastCapture(dataUrl);
        // Show brief toast notification
        showToast('Screenshot saved! 📸');
      } else {
        showToast('Screenshot failed ❌', true);
      }
    } catch (error) {
      console.error('Screenshot error:', error);
      showToast('Screenshot failed ❌', true);
    } finally {
      setIsCapturing(false);
    }
  }, [captureScreenshot, isCapturing]);

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

// Simple toast notification
function showToast(message: string, isError = false) {
  // Remove existing toast
  const existing = document.getElementById('screenshot-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'screenshot-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background: ${isError ? 'rgba(255, 71, 87, 0.95)' : 'rgba(0, 212, 170, 0.95)'};
    color: #030308;
    padding: 12px 24px;
    border-radius: 8px;
    font-family: var(--font-ui);
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    animation: toastIn 0.3s ease-out forwards;
    pointer-events: none;
  `;

  // Add animation styles if not already added
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      @keyframes toastIn {
        from { opacity: 0; transform: translateX(-50%) translateY(100px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      @keyframes toastOut {
        from { opacity: 1; transform: translateX(-50%) translateY(0); }
        to { opacity: 0; transform: translateX(-50%) translateY(100px); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease-in forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

/**
 * Keyboard shortcut handler for screenshot (S key)
 */
export function useScreenshotShortcut(onScreenshot: () => void) {
  const { gl } = useThree();

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