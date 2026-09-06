import { Scene, RenderStateProvider } from './components/Scene'
import { UIOverlay } from './components/UIOverlay'
import { LoadingProvider } from './components/UI/LoadingScreen'
import { initUserProperties } from './lib/analytics'
import { I18nProvider } from './i18n'
import { ScaleProvider, useScale } from '@/context/ScaleContext'
import { CameraControlsProvider } from '@/hooks/useCameraControls'
import { SettingsProvider, useSettings } from '@/context/SettingsContext'
import { StarFieldControlsProvider } from './components/TimeControlUI'
import { BodySelectionProvider } from '@/context/BodySelectionContext'
import { useEffect } from 'react'

// Bridges the SettingsContext (powered by the Settings panel) into the
// ScaleContext (which the 3D scene reads). Keeps the "True Scale" toggle in
// the panel and the scene's scale in sync — previously two independent state
// containers that never talked to each other.
function ScaleSync() {
  const { settings } = useSettings();
  const { setTrueScale } = useScale();

  useEffect(() => {
    setTrueScale(settings.trueScale);
  }, [settings.trueScale, setTrueScale]);

  return null;
}

function App() {
  // Initialize analytics user properties on mount
  if (typeof window !== 'undefined') {
    initUserProperties();
  }

  return (
    <I18nProvider defaultLanguage="en">
      <LoadingProvider>
        <SettingsProvider>
          <ScaleProvider>
            {/* ScaleSync must sit inside BOTH providers to read settings -> write scale */}
            <ScaleSync />
            <CameraControlsProvider>
              <BodySelectionProvider>
                <StarFieldControlsProvider>
                  <RenderStateProvider>
                    <Scene />
                    <UIOverlay />
                  </RenderStateProvider>
                </StarFieldControlsProvider>
              </BodySelectionProvider>
            </CameraControlsProvider>
          </ScaleProvider>
        </SettingsProvider>
      </LoadingProvider>
    </I18nProvider>
  )
}

export default App