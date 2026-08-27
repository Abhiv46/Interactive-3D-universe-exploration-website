import { SearchBar } from './UI/SearchBar';
import { DatePicker } from './DatePicker';
import { InfoCard } from './UI/InfoCard';
import { TimeControlUI } from './TimeControlUI';
import { SettingsPanel } from '@/components/UI/SettingsPanel';
import { ScreenshotButton, useScreenshotShortcut } from '@/components/UI/ScreenshotButton';
import { ShareButton, useShareShortcut } from '@/components/UI/ShareButton';
import { useFocusTrap } from '@/hooks/useAccessibility';
import { useState } from 'react';
import * as THREE from 'three';
import { CelestialBodyData } from '@/types/orbitalElements';
import { CameraControlsProvider, useCameraControls } from '@/hooks/useCameraControls';
import { SurfaceZoomProvider, useSurfaceZoomContext } from '@/context/SurfaceZoomContext';
import { EclipseIndicator } from './SolarSystem/EclipseVisualizer';
import { ISSTracker, ISSInfoPanel, useISSTracker } from './SolarSystem/ISSTracker';
import { AuroraIndicator } from './SolarSystem/AuroraIndicator';
import { useSimulationClock } from '@/hooks/useSimulationClock';
import { BODIES_MAP } from '@/data/bodiesMap';

function UIOverlayContent() {
  const [selectedBody, setSelectedBody] = useState<CelestialBodyData | null>(null);
  const { setFocus, getBodyPosition } = useCameraControls();
  const { surfaceRegion } = useSurfaceZoomContext();
  const { julianDate } = useSimulationClock();
  const { enabled, issPosition } = useISSTracker();

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
      {/* Top bar with title, search, and date picker */}
      <div className="top-bar">
        <div className="title">Universe Explorer</div>
        <SearchBar
          onSelect={handleSelectBody}
        />
        <DatePicker onDateChange={handleDateChange} />
      </div>

      {/* Eclipse Indicator */}
      <EclipseIndicator bodies={BODIES_MAP} julianDate={julianDate} />

      {/* ISS Tracker Info Panel */}
      <ISSInfoPanel enabled={enabled} issPosition={issPosition} />

      {/* Aurora Forecast */}
      <AuroraIndicator julianDate={julianDate} enabled={true} />

      {/* Screenshot & Share buttons (top right) */}
      <div className="top-actions">
        <ScreenshotButton />
        <ShareButton />
      </div>

      {/* Time Control UI (right side) */}
      <TimeControlUI />

      {/* Settings Panel */}
      <SettingsPanel />

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
    </div>
  )
}

export function UIOverlay() {
  return (
    <CameraControlsProvider>
      <SurfaceZoomProvider>
        <UIOverlayContent />
      </SurfaceZoomProvider>
    </CameraControlsProvider>
  );
}