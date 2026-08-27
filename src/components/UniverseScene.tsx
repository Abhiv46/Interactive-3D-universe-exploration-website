import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { EffectComposer, Bloom, FXAA } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useSimulationClock } from '../hooks/useSimulationClock';
import { useCameraController } from '../hooks/useCameraController';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { SolarSystem } from './SolarSystem/SolarSystem';
import { StarField } from './Stars/StarField';
import { Constellations } from './Stars/Constellations';
import { MilkyWay } from './Stars/MilkyWay';
import { NearbyGalaxies } from './Galaxies/NearbyGalaxies';
import { InfoCard } from './UI/InfoCard';
import { SettingsPanel } from './UI/SettingsPanel';
import { TimeControl } from './UI/TimeControl';
import { SearchBar } from './UI/SearchBar';
import { HUD } from './UI/HUD';
import { ScaleIndicator } from './UI/ScaleIndicator';
import { AudioEngine } from './Audio/AudioEngine';
import { SATURN } from '../data/planets';
import { calculatePosition } from '../engine/KeplerianOrbit';

// Extend Three.js types for custom materials
extend({});

// Global state for selected object
let selectedObject: {
  id: string;
  name: string;
  type: string;
  position: THREE.Vector3;
  data: any;
} | null = null;

export function setSelectedObject(obj: typeof selectedObject) {
  selectedObject = obj;
}

export function getSelectedObject() {
  return selectedObject;
}

// Main Universe Scene Component
export function UniverseScene() {
  const clockState = useSimulationClock();
  const { state: cameraState, focusOnObject, clearFocus } = useCameraController();
  const { updateListener } = useAudioEngine();

  const { camera } = useThree();

  // Calculate Saturn's position from orbital elements
  const saturnPosition = useMemo(() => {
    if (!SATURN.orbital) return new THREE.Vector3(0, 0, 0);
    const pos = calculatePosition(SATURN.orbital, clockState.julianDate);
    return new THREE.Vector3(pos[0], pos[1], pos[2]);
  }, [clockState.julianDate]);

  // Sun is always at origin
  const sunPosition = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  // Update audio listener position from camera
  useFrame(() => {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    updateListener(camera.position, forward, up);
  });

  // Handle object selection
  const handleObjectClick = (object: {
    id: string;
    name: string;
    type: string;
    position: THREE.Vector3;
    data: any;
  }) => {
    setSelectedObject(object);
    if (object.type === 'planet' || object.type === 'moon') {
      focusOnObject({
        id: object.id,
        name: object.name,
        position: object.position,
        radius: object.data.visual?.radius || object.data.physical?.radius || 1e6,
      });
    }
  };

  // Handle background click to clear selection
  const handleBackgroundClick = () => {
    setSelectedObject(null);
    clearFocus();
  };

  return (
    <>
      {/* Main Canvas with Post-processing */}
      <Canvas
        camera={{ position: [0, 0, 1e10], fov: 60 }}
        gl={{
          antialias: true,
          alpha: true,
          logarithmicDepthBuffer: true,
          preserveDrawingBuffer: false,
          powerPreference: 'high-performance',
        }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
          gl.outputColorSpace = 'srgb' as const;
        }}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) {
            handleBackgroundClick();
          }
        }}
      >
        {/* Scene Background */}
        <color attach="background" args={[0x000000]} />

        {/* Lighting */}
        <ambientLight intensity={0.1} color="#ffffff" />
        <pointLight
          position={[0, 0, 0]}
          intensity={2.5}
          color="#fff5e6"
          distance={0}
          decay={2}
        />

        {/* Solar System (renders first - closest objects) */}
        <SolarSystem
          julianDate={clockState.julianDate}
          onObjectClick={handleObjectClick}
        />

        {/* Star Field */}
        <StarField />

        {/* Constellation Lines */}
        <Constellations />

        {/* Milky Way */}
        <MilkyWay />

        {/* Nearby Galaxies */}
        <NearbyGalaxies />

        {/* Audio Engine */}
        <AudioEngine
          enabled={true}
          volume={0.5}
          sunPosition={sunPosition}
          saturnPosition={saturnPosition}
        />
      </Canvas>

      {/* Post-processing Effects */}
      <EffectComposer multisampling={4} renderPriority={1}>
        <FXAA />
        <Bloom
          intensity={0.5}
          luminanceThreshold={0.8}
          luminanceSmoothing={0.5}
          mipmapBlur={true}
        />
      </EffectComposer>

      {/* UI Overlays */}
      <div className="universe-ui">
        {/* HUD - Top */}
        <HUD
          focusedObject={selectedObject ? { name: selectedObject.name, type: selectedObject.type, distance: selectedObject.position.length() } : null}
          cameraPosition={cameraState.position}
          targetPosition={cameraState.target}
          distance={cameraState.distance}
        />

        {/* Time Control - Bottom */}
        <TimeControl
          state={clockState}
          controls={clockState}
        />

        {/* Search Bar - Top Right */}
        <SearchBar
          onSelect={handleObjectClick}
        />

        {/* Settings Panel - Right */}
        <SettingsPanel />

        {/* Scale Indicator - Bottom Right */}
        <ScaleIndicator
          cameraPosition={cameraState.position}
          cameraDistance={cameraState.distance}
          focusedObject={selectedObject ? { name: selectedObject.name, type: selectedObject.type, radius: selectedObject.data?.visual?.radius || selectedObject.data?.physical?.radius || 1e6, distance: selectedObject.position.length() } : null}
        />

        {/* Info Card - Center/Right when object selected */}
        {selectedObject && (
          <InfoCard
            object={selectedObject}
            onClose={() => {
              setSelectedObject(null);
              clearFocus();
            }}
          />
        )}
      </div>
    </>
  );
}

// App wrapper with providers
export function App() {
  return (
    <div className="app" style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <UniverseScene />
    </div>
  );
}