import { Scene } from './components/Scene'
import { UIOverlay } from './components/UIOverlay'
import { LoadingProvider } from './components/UI/LoadingScreen'

function App() {
  return (
    <LoadingProvider>
      <Scene />
      <UIOverlay />
    </LoadingProvider>
  )
}

export default App