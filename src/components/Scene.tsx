import { Canvas, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, FXAA, Vignette } from '@react-three/postprocessing'
import { OrbitControls } from '@react-three/drei'
import { Sun } from './SolarSystem/Sun'
import { Planet } from './Planet'
import { AsteroidBelt } from './AsteroidBelt'
import { KuiperBelt } from './KuiperBelt'
import { StarFieldWrapper } from './StarField'
import { MilkyWay } from '@/components/MilkyWay'
import { useScale } from '@/context/ScaleContext'
import { useBodySelection } from '@/context/BodySelectionContext'
import { useCameraControls, useRegisterBodies } from '@/hooks/useCameraControls'
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
import { SOLAR_RADIUS, VISUAL_RADIUS_SCALE, SUN_VISUAL_RADIUS_CAP } from '@/engine/Constants'
import * as THREE from 'three'
import { useRef, useEffect, useState, useMemo } from 'react'
import { useStarFieldControls } from './TimeControlUI'
import type { PerspectiveCamera } from 'three'
import { useSettings } from '@/context/SettingsContext'
import { useLoading } from '@/components/UI/LoadingScreen'
import { useJulianDate, useTimeSpeed, useSimulationPlaying } from '@/hooks/useSimulationClock'
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
  // True while the user is actively interacting with the camera (OrbitControls
  // start/end). While interacting we keep the render loop running continuously
  // so zoom/scroll/pan/rotate are smooth even when the simulation is paused
  // (where frameloop would otherwise drop to 'demand').
  const [isInteracting, setIsInteracting] = useState(false);
  // RenderState camera registrar must reach the screenshot hook too. Aliased
  // because `registerCamera` above is the camera-CONTROLS registrar (line 90
  // feeds both; before this the RenderState camera was never set and every
  // screenshot failed the "camera not available" guard).
  // flyTo is our only in-app route to an animated camera transition (SearchBar
  // and the field code go through it). We expose it so the E2E suite can drive
  // a REAL fly-to ('Mars', 'Earth', …) rather than a synthetic camera move.
  const { flyTo } = useCameraControls();
  const { registerRenderer, registerScene, registerCamera: registerRenderStateCamera } = useRenderState();
  const { showConstellations, starMagnitudeLimit } = useStarFieldControls();
  const { settings } = useSettings();
  const { effectiveSettings } = useLowPerformanceMode();
  const julianDate = useJulianDate();
  const timeScale = useTimeSpeed();
  const isRunning = useSimulationPlaying();
  const { onCanvasReady } = useLoading();

  // Expose julianDate for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__julianDate__ = julianDate;
    }
  }, [julianDate]);

  // Notify loading provider that canvas is ready
  useEffect(() => {
    onCanvasReady();
  }, [onCanvasReady]);

  // Register all bodies for camera tracking
  useEffect(() => {
    registerAllBodies(ALL_BODIES);
    registerBodies(ALL_BODIES);
  }, [registerAllBodies, registerBodies]);

  return (
    <>
      {/* Main 3D Scene Canvas */}
      {/* Default camera: ~1500 units out on +Z with a slight rise. The Sun's
          ~28-unit visible ball is clearly centered (about 2° on screen, plus
          bloom glow) while the inner system stays in frame — Mercury orbits at
          ~770 units, so it is never cut off at this distance. */}
      <Canvas
        camera={{ position: [0, 120, 1500], fov: 50 }}
        // Freeze rendering entirely when the simulation is paused AND the user
        // is not interacting with the camera: R3F stops re-rendering the frozen
        // scene, so the canvas drawing buffer settles and Playwright's
        // screenshot-stability checks stop seeing per-frame differences from a
        // live render loop. While the user is actively zooming/panning/rotating
        // (or the sim is running) we render continuously for smooth motion.
        frameloop={isRunning || isInteracting ? 'always' : 'demand'}
        style={{ width: '100%', height: '100%', outline: 'none' }}
        onCreated={({ gl, camera, scene }) => {
          gl.setClearColor(0x000000, 1)
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = settings.toneMappingExposure
          gl.outputColorSpace = 'srgb' as const
          registerCamera(camera);
          registerRenderStateCamera(camera);
          registerRenderer(gl);
          registerScene(scene);
          // Expose to window for testing/debugging
          if (typeof window !== 'undefined') {
            window.__THREE__ = { scene, camera, gl, THREE };
            // Test seam: drive a real animated fly-to by body id (mirrors the
            // SearchBar workflow). The E2E suite uses it to verify the paused
            // demand-mode fly-to still renders frame by frame.
            window.__THREE__.flyTo = (bodyId: string, duration?: number) => {
              const body = ALL_BODIES.find(b => b.id === bodyId)
                ?? BODIES_MAP.get(bodyId);
              if (body) flyTo(body, duration);
            };
          }
        }}
      >
        {/* GalaxyCameraProvider MUST be inside Canvas to use useThree() hook */}
        <GalaxyCameraProvider>
          <SceneInner
            showConstellations={showConstellations}
            starMagnitudeLimit={starMagnitudeLimit}
            effectiveSettings={effectiveSettings}
            julianDate={julianDate}
            timeScale={timeScale}
            registerControls={registerControls}
            trueScale={trueScale}
            settings={settings}
            onInteractStart={() => setIsInteracting(true)}
            onInteractEnd={() => setIsInteracting(false)}
          />
        </GalaxyCameraProvider>
      </Canvas>
      {/* Time Control UI is rendered once, inside UIOverlay — do NOT render it
          here too, or two identical fixed panels stack at the bottom-left. */}
    </>
  );
}

// Inner component that MUST be inside <Canvas> to use R3F hooks
function SceneInner({
  starMagnitudeLimit,
  showConstellations,
  effectiveSettings,
  julianDate,
  timeScale,
  registerControls,
  trueScale,
  settings,
  onInteractStart,
  onInteractEnd,
}: {
  starMagnitudeLimit: number;
  showConstellations: boolean;
  effectiveSettings: any;
  julianDate: number;
  timeScale: number;
  registerControls: any;
  trueScale: boolean;
  settings: any;
  onInteractStart: () => void;
  onInteractEnd: () => void;
}) {
  const { camera, gl } = useThree();
  const { registerCamera, registerBodies, setFocus } = useCameraControls();
  const registerAllBodies = useRegisterBodies();
  const { registerRenderer, registerScene } = useRenderState();
  const { scaleMode, cameraDistance } = useGalaxyCameraContext();
  const { select } = useBodySelection();

  // Determine visibility based on scale mode
  const showSolarSystem = scaleMode === 'solar-system';
  const showStarField = scaleMode === 'solar-system' || scaleMode === 'interstellar';
  const showMilkyWay = (scaleMode === 'galactic' || scaleMode === 'intergalactic') && settings.showMilkyWay;

  // Visual Scale Factor: user-adjustable multiplier on body SIZE only (orbital
  // distances stay fixed). Default 1000 = 1x. The Settings slider writes this.
  const visualScaleFactor = settings.visualScaleFactor ?? 1000;
  const effectiveVisualScale = VISUAL_RADIUS_SCALE * (visualScaleFactor / 1000);

  // Touch controls - must be inside Canvas
  const { registerControls: registerTouchControls } = useTouchControls({
    enabled: true,
    camera,
    renderer: gl,
  });

  // Combined registerControls that registers both camera controls and touch controls
  useEffect(() => {
    const combined = (controls: any) => {
      registerControls(controls);
      registerTouchControls(controls);
    };
    // We can't directly assign to ref from here, but the ref is already passed
    // The OrbitControls below uses the registerControls ref directly
  }, [registerControls, registerTouchControls]);

  return (
    <>
      <color attach="background" args={[0x000000]} />
      {/* Sun is the primary light source (at origin, physically-correct inverse-square falloff) */}
      <pointLight position={[0, 0, 0]} intensity={2.4} color="#fff3e0" distance={0} decay={2} />
      {/* Subtle warm/cool hemisphere fill so dark sides of planets aren't pure black,
          adding cinematic depth instead of a flat ambient wash. */}
      <hemisphereLight args={['#ffe9cc', '#16224a', 0.5]} />
      <ambientLight intensity={0.05} />

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
          opacity={trueScale ? 1 : 0.5}
          quality={effectiveSettings.qualityPreset}
        />
      )}

      {/* Solar System - visible at solar-system scale */}
      {showSolarSystem && (
        <>
          {/* Sun at center — true radius would be ~279 units at default (109× Earth),
              swamping the inner system. Cap to SUN_VISUAL_RADIUS_CAP (30) scaled by
              the user's Visual Scale slider so the cap stays proportional. */}
          <Sun
            onClick={(obj) => { select(obj.data); setFocus(obj.data); }}
            labelEnabled={settings.showLabels}
            radius={Math.min(SOLAR_RADIUS * effectiveVisualScale, SUN_VISUAL_RADIUS_CAP * (visualScaleFactor / 1000))}
          />

          {/* Mercury - closest to Sun */}
          <Planet
            data={MERCURY}
            visualScale={effectiveVisualScale}
            trueScale={trueScale}
            showOrbit={effectiveSettings.showOrbits}
            onClick={(data) => { select(data); setFocus(data); }}
            labelEnabled={settings.showLabels}
          />

          {/* Venus */}
          <Planet
            data={VENUS}
            visualScale={effectiveVisualScale}
            trueScale={trueScale}
            showOrbit={effectiveSettings.showOrbits}
            onClick={(data) => { select(data); setFocus(data); }}
            labelEnabled={settings.showLabels}
          />

          {/* Earth orbiting Sun with real Keplerian mechanics + Moon */}
          <Planet
            data={EARTH}
            visualScale={effectiveVisualScale}
            trueScale={trueScale}
            showOrbit={effectiveSettings.showOrbits}
            moons={[MOON]}
            moonVisualScale={effectiveVisualScale}
            onClick={(data) => { select(data); setFocus(data); }}
            labelEnabled={settings.showLabels}
          />

          {/* ISS Tracker (real-time position) */}
          <ISSTracker earthBody={EARTH} enabled={effectiveSettings.showISS} julianDate={julianDate} timeScale={timeScale} />

          {/* Mars */}
          <Planet
            data={MARS}
            visualScale={effectiveVisualScale}
            trueScale={trueScale}
            showOrbit={effectiveSettings.showOrbits}
            onClick={(data) => { select(data); setFocus(data); }}
            labelEnabled={settings.showLabels}
          />

          {/* Jupiter with Galilean moons */}
          <Planet
            data={JUPITER}
            visualScale={effectiveVisualScale}
            trueScale={trueScale}
            showOrbit={effectiveSettings.showOrbits}
            moons={[IO, EUROPA, GANYMEDE, CALLISTO]}
            moonVisualScale={effectiveVisualScale}
            onClick={(data) => { select(data); setFocus(data); }}
            labelEnabled={settings.showLabels}
          />

          {/* Saturn with rings + Titan and Enceladus */}
          <Planet
            data={SATURN}
            visualScale={effectiveVisualScale}
            trueScale={trueScale}
            showOrbit={effectiveSettings.showOrbits}
            moons={[TITAN, ENCELADUS]}
            moonVisualScale={effectiveVisualScale}
            onClick={(data) => { select(data); setFocus(data); }}
            labelEnabled={settings.showLabels}
          />

          {/* Uranus with rings */}
          <Planet
            data={URANUS}
            visualScale={effectiveVisualScale}
            trueScale={trueScale}
            showOrbit={effectiveSettings.showOrbits}
            onClick={(data) => { select(data); setFocus(data); }}
            labelEnabled={settings.showLabels}
          />

          {/* Neptune with rings */}
          <Planet
            data={NEPTUNE}
            visualScale={effectiveVisualScale}
            trueScale={trueScale}
            showOrbit={effectiveSettings.showOrbits}
            onClick={(data) => { select(data); setFocus(data); }}
            labelEnabled={settings.showLabels}
          />

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
        maxDistance={100000}
        onStart={onInteractStart}
        onEnd={onInteractEnd}
        // Touch controls
        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
      />

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
    </>
  );
}

export function Scene() {
  return (
    <SceneContent />
  );
}

// Re-export RenderStateProvider bridge so App can wrap both Scene and UIOverlay
export { RenderStateProvider } from '@/context/RenderStateContext';