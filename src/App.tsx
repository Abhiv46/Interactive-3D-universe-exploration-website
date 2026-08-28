import { Scene, RenderStateProvider } from './components/Scene'
import { UIOverlay } from './components/UIOverlay'
import { LoadingProvider } from './components/UI/LoadingScreen'
import { initUserProperties } from './lib/analytics'
import { I18nProvider } from './i18n'
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
        <RenderStateProvider>
          <Scene />
          <UIOverlay />
        </RenderStateProvider>
      </LoadingProvider>
    </I18nProvider>
  )
}

export default App