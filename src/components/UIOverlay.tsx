import { SearchBar } from './UI/SearchBar';
import { DatePicker } from './DatePicker';
import { InfoCard } from './UI/InfoCard';
import { TimeControlUI } from './TimeControlUI';
import { SettingsPanel } from '@/components/UI/SettingsPanel';
import { ScreenshotButton, useScreenshotShortcut } from '@/components/UI/ScreenshotButton';
import { ShareButton, useShareShortcut } from '@/components/UI/ShareButton';
import { FloatingFeedbackButton } from '@/components/UI/FloatingFeedbackButton';
import { FeedbackModal } from '@/components/UI/FeedbackModal';
import { LanguageToggle } from '@/components/UI/LanguageToggle';
import { APODPanel } from '@/components/UI/APODPanel';
import { TourControls } from '@/components/UI/TourControls';
import { TourProvider } from '@/components/UI/Tour';
import { AchievementsPanel } from '@/components/UI/AchievementsPanel';
import { AchievementsProvider } from '@/context/AchievementsContext';
import { ToastProvider, useToast } from '@/components/UI/Toast';
import { useFocusTrap } from '@/hooks/useAccessibility';
import { useI18n } from '@/i18n/index';
import { useState } from 'react';
import * as THREE from 'three';
import { CelestialBodyData } from '@/types/orbitalElements';
import { useCameraControls } from '@/hooks/useCameraControls';
import { SurfaceZoomProvider, useSurfaceZoomContext } from '@/context/SurfaceZoomContext';
import { EclipseIndicator } from './SolarSystem/EclipseVisualizer';
import { ISSTracker, ISSInfoPanel, useISSTracker } from './SolarSystem/ISSTracker';
import { AuroraIndicator } from './SolarSystem/AuroraIndicator';
import { useJulianDate, useSimulationControls } from '@/hooks/useSimulationClock';
import { BODIES_MAP } from '@/data/bodiesMap';
import { useSettings } from '@/context/SettingsContext';

function UIOverlayContent() {
  const { settings } = useSettings();
  const [selectedBody, setSelectedBody] = useState<CelestialBodyData | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const { showToast } = useToast();
  const { setFocus, getBodyPosition } = useCameraControls();
  const { surfaceRegion } = useSurfaceZoomContext();
  const julianDate = useJulianDate();
  const { enabled, issPosition } = useISSTracker();
  const { t } = useI18n();

  // Focus trap for InfoCard
  const infoCardRef = useFocusTrap(!!selectedBody);

  const handleSelectBody = (body: { id: string; name: string; type: string; position: THREE.Vector3; data: CelestialBodyData }) => {
    setSelectedBody(body.data);
    setFocus(body.data);
  };

  const handleCloseInfoCard = () => {
    setSelectedBody(null);
    setFocus(null);
  };

  const handleDateChange = (date: Date) => {
    // Date change is handled by DatePicker internally via useSimulationClock
    console.log('Date changed to:', date.toISOString());
  };

  const handleFeedbackOpen = () => {
    setFeedbackOpen(true);
  };

  const handleFeedbackClose = () => {
    setFeedbackOpen(false);
  };

  // Listen for feedback submission success to show toast
  // This is handled in FeedbackModal but we add a custom event listener for toast
  // Keyboard shortcuts
  useScreenshotShortcut(() => {
    // Trigger screenshot via a custom event or ref
    const btn = document.querySelector('.screenshot-btn') as HTMLButtonElement;
    btn?.click();
  });

  useShareShortcut(() => {
    const btn = document.querySelector('.share-btn') as HTMLButtonElement;
    btn?.click();
  });

  return (
    <div className="ui-overlay">
      {/* Top bar with title, search, date picker, and language toggle */}
      <div className="top-bar">
        <div className="title">{t('app.title')}</div>
        <SearchBar
          onSelect={handleSelectBody}
        />
        <DatePicker onDateChange={handleDateChange} />
        <LanguageToggle />
      </div>

      {/* APOD Panel */}
      <div className="apod-panel-wrapper">
        <APODPanel />
      </div>

      {/* Eclipse Indicator */}
      <EclipseIndicator bodies={BODIES_MAP} julianDate={julianDate} />

      {/* ISS Tracker Info Panel */}
      <ISSInfoPanel enabled={enabled} issPosition={issPosition} />

      {/* Aurora Forecast */}
      <AuroraIndicator julianDate={julianDate} enabled={settings.showAurora ?? true} />

      {/* Screenshot & Share buttons (top right) */}
      <div className="top-actions">
        <ScreenshotButton />
        <ShareButton />
      </div>

      {/* Time Control UI (right side) */}
      <TimeControlUI />

      {/* Settings Panel */}
      <SettingsPanel />

      {/* Guided Tour Controls */}
      <TourControls />

      {/* Achievements Panel */}
      <AchievementsPanel />

      {/* Info Card (appears when body selected) */}
      {selectedBody && (
        <InfoCard
          object={{
            id: selectedBody.id,
            name: selectedBody.name,
            type: selectedBody.type || 'object',
            position: getBodyPosition(selectedBody),
            data: selectedBody,
          }}
          onClose={handleCloseInfoCard}
          surfaceRegion={surfaceRegion}
        />
      )}

      {/* Floating Feedback Button */}
      <FloatingFeedbackButton onOpenFeedback={handleFeedbackOpen} />

      {/* Feedback Modal */}
      <FeedbackModal isOpen={feedbackOpen} onClose={handleFeedbackClose} />
    </div>
  )
}

export function UIOverlay() {
  return (
    <ToastProvider>
      <SurfaceZoomProvider>
        <TourProvider>
          <AchievementsProvider>
            <UIOverlayContent />
          </AchievementsProvider>
        </TourProvider>
      </SurfaceZoomProvider>
    </ToastProvider>
  );
}