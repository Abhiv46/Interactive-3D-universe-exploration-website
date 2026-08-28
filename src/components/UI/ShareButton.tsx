import { useState, useCallback, useRef, useEffect } from 'react';
import { useSimulationClock } from '@/hooks/useSimulationClock';
import { useSettings, SettingsState } from '@/context/SettingsContext';
import { useCameraControls } from '@/hooks/useCameraControls';
import { useShareView, useApplySharedView, parseShareUrlFromLocation, ShareViewState } from '@/hooks/useShareView';
import { useAchievements } from '@/context/AchievementsContext';
import { useOGImageGenerator, useOGMetaTags } from '@/components/UI/OGImageGenerator';
import { useI18n } from '@/i18n/index';
import { CelestialBodyData } from '@/types/orbitalElements';
import * as THREE from 'three';
import { useRenderState } from '@/context/RenderStateContext';

export function ShareButton() {
  const { camera } = useRenderState();
  const { julianDate, speed: timeScale, isRunning } = useSimulationClock();
  const { settings } = useSettings();
  const { getControls } = useCameraControls();
  const [selectedBody, setSelectedBody] = useState<CelestialBodyData | null>(null);
  const { t } = useI18n();

  const {
    generateShareUrl,
    copyShareUrl,
    shareView,
    isGenerating,
    lastUrl,
    decodeShareState,
  } = useShareView();

  const { unlockAchievement } = useAchievements();
  const { generateOGImage, generateDataURL, downloadOGImage, isGenerating: isGeneratingImage } = useOGImageGenerator();
  const { updateOGMetaTags, resetOGMetaTags } = useOGMetaTags();

  const [showShareDialog, setShowShareDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Get the OrbitControls instance for target position
  const controls = getControls();

  // Handle click outside to close dialog
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        setShowShareDialog(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleShareClick = useCallback(async () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const url = generateShareUrl(
      baseUrl,
      camera,
      controls,
      julianDate,
      timeScale,
      isRunning,
      selectedBody,
      settings
    );

    setCopied(false);
    setShareError(null);
    setShowShareDialog(true);
    setImageDataUrl(null);

    // Generate OG image in background
    try {
      const dataUrl = await generateDataURL({
        title: t('share.ogTitle'),
        bodyName: selectedBody?.name,
      });
      if (dataUrl) {
        setImageDataUrl(dataUrl);
        // Update meta tags for social sharing
        updateOGMetaTags(
          t('share.ogTitle'),
          t('share.ogDescription', { body: selectedBody?.name || 'the cosmos' }),
          dataUrl,
          url
        );
      }
    } catch (error) {
      console.warn('Failed to generate OG image:', error);
    }

    // Focus the input after dialog opens
    setTimeout(() => urlInputRef.current?.focus(), 50);
  }, [generateShareUrl, camera, controls, julianDate, timeScale, isRunning, selectedBody, settings, generateDataURL, updateOGMetaTags, t]);

  const handleCopy = useCallback(async () => {
    if (!lastUrl) return;

    const success = await copyShareUrl(lastUrl);
    if (success) {
      setCopied(true);
      setShareError(null);
      unlockAchievement('sharedView');
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } else {
      setShareError('Failed to copy to clipboard');
    }
  }, [copyShareUrl, lastUrl, unlockAchievement]);

  const handleNativeShare = useCallback(async () => {
    if (!lastUrl) return;

    const success = await shareView(lastUrl);
    if (!success) {
      // Fallback to copy
      await copyShareUrl(lastUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareView, lastUrl, copyShareUrl]);

  const handleLoadSharedView = useCallback(() => {
    if (!lastUrl) return;

    // Navigate to the shared URL (reloads with view param)
    window.location.href = lastUrl;
  }, [lastUrl]);

  return (
    <>
      <button
        className={`share-btn glass-btn ${isGenerating ? 'generating' : ''}`}
        onClick={handleShareClick}
        disabled={isGenerating}
        aria-label={isGenerating ? 'Generating link...' : 'Share view (Shift+S)'}
        title={isGenerating ? 'Generating...' : 'Share View (Shift+S)'}
      >
        {isGenerating ? (
          <>
            <span className="spinner" style={{ width: '16px', height: '16px', marginRight: '8px' }} />
            Generating...
          </>
        ) : (
          <>
            <span style={{ fontSize: '18px' }}>🔗</span>
            <span>Share</span>
          </>
        )}
      </button>

      {/* Share Dialog */}
      {showShareDialog && (
        <div
          ref={dialogRef}
          className="share-dialog glass-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-dialog-title"
        >
          <div className="share-dialog-backdrop" onClick={() => setShowShareDialog(false)} />

          <div className="share-dialog-content">
            <div className="share-dialog-header">
              <h2 id="share-dialog-title">Share This View</h2>
              <button
                className="share-dialog-close"
                onClick={() => setShowShareDialog(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="share-dialog-body">
              <p className="share-description">
                This link captures your current camera position, simulation time, selected object, and display settings.
              </p>

              {lastUrl && (
                <div className="share-url-container">
                  <input
                    ref={urlInputRef}
                    type="text"
                    className="share-url-input"
                    value={lastUrl}
                    readOnly
                    aria-label="Shareable URL"
                  />
                  <button
                    className={`share-copy-btn glass-btn ${copied ? 'copied' : ''}`}
                    onClick={handleCopy}
                    aria-label={copied ? 'Copied!' : 'Copy to clipboard'}
                  >
                    {copied ? '✅ Copied!' : '📋 Copy'}
                  </button>
                </div>
              )}

              {shareError && (
                <div className="share-error" role="alert">
                  {shareError}
                </div>
              )}

              <div className="share-actions">
                <button
                  className="glass-btn primary"
                  onClick={handleNativeShare}
                  disabled={!navigator.share}
                >
                  📤 Native Share
                </button>
                <button
                  className="glass-btn secondary"
                  onClick={handleLoadSharedView}
                >
                  🔄 Load This View
                </button>
                <button
                  className="glass-btn secondary"
                  onClick={() => downloadOGImage({ title: t('share.ogTitle'), bodyName: selectedBody?.name })}
                  disabled={isGeneratingImage || !imageDataUrl}
                >
                  🖼️ Download Image
                </button>
              </div>

              {imageDataUrl && (
                <div className="share-image-preview">
                  <label>{t('share.imagePreview')}</label>
                  <img src={imageDataUrl} alt="Preview of shared image" />
                </div>
              )}

              <div className="share-note">
                <small>
                  💡 Tip: Press <kbd>Shift</kbd>+<kbd>S</kbd> to quickly open this dialog.
                  The URL contains all view state — anyone opening it will see exactly what you see.
                </small>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Keyboard shortcut for share (Shift+S)
 */
export function useShareShortcut(onShare: () => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shift+S for share (but not when typing in input)
      if (
        e.key.toLowerCase() === 's' &&
        e.shiftKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement)
      ) {
        e.preventDefault();
        onShare();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onShare]);
}

/**
 * Hook to check for shared view URL on load and apply it
 */
export function useSharedViewLoader(
  setCameraPosition: (pos: THREE.Vector3) => void,
  setCameraTarget: (target: THREE.Vector3) => void,
  setJulianDate: (jd: number) => void,
  setTimeScale: (scale: number) => void,
  setIsRunning: (running: boolean) => void,
  setSelectedBody: (body: CelestialBodyData | null) => void,
  settings: SettingsState,
  setSettings: (s: Partial<SettingsState>) => void,
  bodyLookup: (id: string) => CelestialBodyData | null
) {
  const { applySharedView } = useApplySharedView();

  useEffect(() => {
    // Check for shared view on initial load
    const sharedState = parseShareUrlFromLocation();
    if (sharedState) {
      applySharedView(
        sharedState,
        setCameraPosition,
        setCameraTarget,
        setJulianDate,
        setTimeScale,
        setIsRunning,
        setSelectedBody,
        settings,
        setSettings,
        bodyLookup
      );

      // Clean up URL (remove share param) to avoid re-applying on refresh
      const url = new URL(window.location.href);
      url.searchParams.delete('view');
      window.history.replaceState({}, '', url.toString());
    }
  }, []); // Run once on mount
}

// Re-export types and functions for convenience
export {
  useShareView,
  useApplySharedView,
  parseShareUrlFromLocation,
  encodeShareState,
  decodeShareState,
} from '@/hooks/useShareView';
export type { ShareViewState } from '@/hooks/useShareView';