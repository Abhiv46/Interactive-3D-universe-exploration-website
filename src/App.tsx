import { Scene, RenderStateProvider } from './components/Scene'
import { UIOverlay } from './components/UIOverlay'
import { LoadingProvider } from './components/UI/LoadingScreen'
import { initUserProperties } from './lib/analytics'
import { I18nProvider } from './i18n'
import { ScaleProvider } from '@/context/ScaleContext'
import { CameraControlsProvider } from '@/hooks/useCameraControls'
import { SettingsProvider } from '@/context/SettingsContext'
import { StarFieldControlsProvider } from './components/TimeControlUI'
import { useEffect } from 'react'

function App() {
  // Initialize analytics user properties on mount
  if (typeof window !== 'undefined') {
    initUserProperties();
  }

  // Log when App mounts
  useEffect(() => {
    console.log('[App] App mounted');
  }, []);

  return (
    <I18nProvider defaultLanguage="en">
      <LoadingProvider>
        <ScaleProvider>
          <CameraControlsProvider>
            <SettingsProvider>
              <StarFieldControlsProvider>
                <RenderStateProvider>
                  <Scene />
                  <UIOverlay />
                </RenderStateProvider>
              </StarFieldControlsProvider>
            </SettingsProvider>
          </CameraControlsProvider>
        </ScaleProvider>
      </LoadingProvider>
    </I18nProvider>
  )
}

export default App