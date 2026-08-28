import { Canvas, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, FXAA, Vignette } from '@react-three/postprocessing'
import { OrbitControls } from '@react-three/drei'
import { Sun } from './Sun'
import { Planet } from './Planet'
import { TimeControlUI, StarFieldControlsProvider } from './TimeControlUI'
import { AsteroidBelt } from './AsteroidBelt'
import { KuiperBelt } from './KuiperBelt'
import { StarFieldWrapper } from './StarField'
import { MilkyWay } from '@/components/MilkyWay'
import { ScaleProvider, useScale } from '@/context/ScaleContext'
import { CameraControlsProvider, useCameraControls, useRegisterBodies } from '@/hooks/useCameraControls'
import { useTouchControls } from '@/hooks/useTouchControls'
import { GalaxyCameraProvider, useGalaxyCameraContext } from '@/hooks/useGalaxyCamera'
import { RenderStateProvider, useRenderState } from '@/context/RenderStateContext'
import { EclipseVisualizer } from './SolarSystem/EclipseVisualizer'
import { ISSTracker, ISSInfoPanel } from './SolarSystem/ISSTracker'
import {
  MERCURY, VENUS, EARTH, MARS, JUPITER, SATURN, URANUS, NEPTUNE,
  MOON, IO, EUROPA, GANYMEDE, CALLISTO, TITAN, ENCELADUS
} from '@/data/planets'
import { BODIES_MAP } from '@/data/bodiesMap'
import * as THREE from 'three'
import { useRef, useEffect, useState, useMemo } from 'react'
import { useStarFieldControls } from './TimeControlUI'
import type { PerspectiveCamera } from 'three'
import { useSettings } from '@/context/SettingsContext'
import { SettingsProvider } from '@/context/SettingsContext'
import { useSimulationClock } from '@/hooks/useSimulationClock'
import { useLowPerformanceMode } from '@/hooks/useLowPerformanceMode'

// All bodies in the simulation for camera tracking
const ALL_BODIES = [
  MERCURY, VENUS, EARTH, MARS, JUPITER, SATURN, URANUS, NEPTUNE,
  MOON, IO, EUROPA, GANYMEDE, CALLISTO, TITAN, ENCELADUS
];

function SceneContent() {
  const { trueScale } = useScale();
  const { registerCamera, registerControls, registerBodies } = useCameraControls();
  const registerAllBodies = useRegisterBodies();
  const { registerRenderer, registerScene } = useRenderState();
  const { showConstellations, starMagnitudeLimit } = useStarFieldControls();
  const { scaleMode } = useGalaxyCameraContext();
  const { settings } = useSettings();
  const { effectiveSettings } = useLowPerformanceMode();
  const { julianDate, speed: timeScale, isRunning } = useSimulationClock();
  const { camera, gl } = useThree();

  // Touch controls
  const { registerControls: registerTouchControls } = useTouchControls({
    enabled: true,
    camera,
    renderer: gl,
  });

  // Register all bodies for camera tracking
  useEffect(() => {
    registerAllBodies(ALL_BODIES);
    registerBodies(ALL_BODIES);
  }, [registerAllBodies, registerBodies]);

  // Determine visibility based on scale mode
  const showSolarSystem = scaleMode === 'solar-system';
  const showStarField = scaleMode === 'solar-system' || scaleMode === 'interstellar';
  const showMilkyWay = (scaleMode === 'galactic' || scaleMode === 'intergalactic') && settings.showMilkyWay;

  // Combined registerControls that registers both camera controls and touch controls
  const combinedRegisterControls = (controls: any) => {
    registerControls(controls);
    registerTouchControls(controls);
  };

  return (
    <>
      {/* Main 3D Scene Canvas */}
      <Canvas
        camera={{ position: [0, 20, 30], fov: 50 }}
        style={{ width: '100%', height: '100%', outline: 'none' }}
        onCreated={({ gl, camera, scene }) => {
          gl.setClearColor(0x000000, 1)
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = settings.toneMappingExposure
          gl.outputColorSpace = 'srgb' as const
          // Enable logarithmic depth buffer on the renderer (type assertion for TS)
          (gl as any).logarithmicDepthBuffer = true
          registerCamera(camera);
          registerRenderer(gl);
          registerScene(scene);
        }}
      >
        <color attach="background" args={[0x000000]} />
        <ambientLight intensity={0.1} />
        <pointLight position={[0, 0, 0]} intensity={2} color="#fff5e6" distance={0} decay={2} />

        {/* Background star field - rendered at 1 million units, behind solar system */}
        {showStarField && (
          <StarFieldWrapper
            distance={1e6}
            maxMagnitude={starMagnitudeLimit}
            maxStars={effectiveSettings.starCount}
            showConstellations={showConstellations && effectiveSettings.showConstellations}
          />
        )}

        {/* Milky Way Galaxy - visible at galactic and intergalactic scales */}
        {showMilkyWay && (
          <MilkyWay
            visible={true}
            opacity={scaleMode === 'galactic' ? 1 : 0.5}
            quality={effectiveSettings.qualityPreset}
          />
        )}

        {/* Solar System - visible at solar-system scale */}
        {showSolarSystem && (
          <>
            {/* Sun at center */}
            <Sun radius={5} />

            {/* Mercury - closest to Sun */}
            <Planet data={MERCURY} visualScale={2000} trueScale={trueScale} showOrbit={effectiveSettings.showOrbits} />

            {/* Venus */}
            <Planet data={VENUS} visualScale={2000} trueScale={trueScale} showOrbit={effectiveSettings.showOrbits} />

            {/* Earth orbiting Sun with real Keplerian mechanics + Moon */}
            <Planet
              data={EARTH}
              visualScale={2000}
              trueScale={trueScale}
              showOrbit={effectiveSettings.showOrbits}
              moons={[MOON]}
              moonVisualScale={2000}
            />

            {/* ISS Tracker (real-time position) */}
            <ISSTracker earthBody={EARTH} enabled={effectiveSettings.showISS} julianDate={julianDate} timeScale={timeScale} />

            {/* Mars */}
            <Planet data={MARS} visualScale={2000} trueScale={trueScale} showOrbit={effectiveSettings.showOrbits} />

            {/* Jupiter with Galilean moons */}
            <Planet
              data={JUPITER}
              visualScale={2000}
              trueScale={trueScale}
              showOrbit={effectiveSettings.showOrbits}
              moons={[IO, EUROPA, GANYMEDE, CALLISTO]}
              moonVisualScale={2000}
            />

            {/* Saturn with rings + Titan and Enceladus */}
            <Planet
              data={SATURN}
              visualScale={2000}
              trueScale={trueScale}
              showOrbit={effectiveSettings.showOrbits}
              moons={[TITAN, ENCELADUS]}
              moonVisualScale={2000}
            />

            {/* Uranus with rings */}
            <Planet data={URANUS} visualScale={2000} trueScale={trueScale} showOrbit={effectiveSettings.showOrbits} />

            {/* Neptune with rings */}
            <Planet data={NEPTUNE} visualScale={2000} trueScale={trueScale} showOrbit={effectiveSettings.showOrbits} />

            {/* Asteroid Belt between Mars and Jupiter */}
            {effectiveSettings.showAsteroidBelt && <AsteroidBelt />}

            {/* Kuiper Belt beyond Neptune */}
            {effectiveSettings.showKuiperBelt && <KuiperBelt />}

            {/* Eclipse visualization */}
            <EclipseVisualizer bodies={BODIES_MAP} julianDate={julianDate} timeScale={timeScale} />
          </>
        )}

        {/* Orbit controls for camera */}
        <OrbitControls
          ref={registerControls}
          enablePan={false}
          enableDamping={true}
          dampingFactor={0.05}
          minDistance={5}
          maxDistance={500}
          // Touch controls
          touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
        />
      </Canvas>

      {/* Post-processing for bloom effect on Sun */}
      <EffectComposer multisampling={4} renderPriority={1}>
        <>
          {effectiveSettings.enableFXAA && <FXAA />}
          {effectiveSettings.enableBloom && (
            <Bloom
              intensity={effectiveSettings.bloomIntensity}
              luminanceThreshold={effectiveSettings.bloomThreshold}
              luminanceSmoothing={effectiveSettings.bloomSmoothing}
              mipmapBlur={true}
            />
          )}
          {effectiveSettings.enableVignette && (
            <Vignette
              offset={0.5}
              darkness={0.3}
              eskil={false}
            />
          )}
        </>
      </EffectComposer>

      {/* Time Control UI Overlay */}
      <TimeControlUI />
    </>
  );
}

export function Scene() {
  return (
    <SettingsProvider>
      <ScaleProvider>
        <CameraControlsProvider>
          <StarFieldControlsProvider>
            <GalaxyCameraProvider>
              <SceneContent />
            </GalaxyCameraProvider>
          </StarFieldControlsProvider>
        </CameraControlsProvider>
      </ScaleProvider>
    </SettingsProvider>
  );
}

// Re-export RenderStateProvider bridge so App can wrap both Scene and UIOverlay
export { RenderStateProvider } from '@/context/RenderStateContext';