import { Scene } from './components/Scene'
import { UIOverlay } from './components/UIOverlay'
import { LoadingProvider } from './components/UI/LoadingScreen'
import { initUserProperties } from './lib/analytics'
import { I18nProvider } from './i18n'

function App() {
  // Initialize analytics user properties on mount
  if (typeof window !== 'undefined') {
    initUserProperties();
  }

  return (
    <I18nProvider defaultLanguage="en">
      <LoadingProvider>
        <Scene />
        <UIOverlay />
      </LoadingProvider>
    </I18nProvider>
  )
}

export default App