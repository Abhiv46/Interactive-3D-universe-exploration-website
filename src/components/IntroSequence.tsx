import { useIntro } from '@/context/IntroContext';
import { BigBang } from './intro/BigBang';
import { GalaxyFormation } from './intro/GalaxyFormation';
import { SolarSystemFormation } from './intro/SolarSystemFormation';
import { TransitionToInteractive } from './intro/TransitionToInteractive';
import { SkipIntroButton } from './intro/SkipIntroButton';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { useEffect, useMemo } from 'react';

/**
 * Detect prefers-reduced-motion once at mount. Kept dependency-free (no drei
 * hook) since this runs before the app's first paint.
 */
function usePrefersReducedMotion(): boolean {
  return useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);
}

/**
 * IntroSequence — renders the cinematic intro phases in a dedicated Canvas overlay.
 * Mounted by App.tsx when phase !== 'complete'.
 * Uses its own Canvas so the main scene stays untouched until the transition phase.
 */
export function IntroSequence() {
  const { phase, isPlaying, progress, onPhaseComplete } = useIntro();
  const reducedMotion = usePrefersReducedMotion();

  // Under prefers-reduced-motion, advance through the phases near-instantly
  // (a short static frame per phase) instead of a 17s cinematic, so the user
  // reaches the interactive view without any heavy 3D animation. Long enough to
  // be perceptible as a centered label, short enough to feel instant.
  useEffect(() => {
    if (!reducedMotion || phase === 'complete') return;
    const t = setTimeout(onPhaseComplete, 700);
    return () => clearTimeout(t);
  }, [reducedMotion, phase, onPhaseComplete]);

  // Phase components map
  const phaseComponents = {
    'big-bang': <BigBang onComplete={onPhaseComplete} />,
    'galaxy': <GalaxyFormation onComplete={onPhaseComplete} />,
    'solar-system': <SolarSystemFormation onComplete={onPhaseComplete} />,
    'transition': <TransitionToInteractive onComplete={onPhaseComplete} />,
    'complete': null,
  };

  const CurrentPhase = phaseComponents[phase];

  // Only render during intro phases
  if (phase === 'complete') return null;

  // Reduced motion: skip the WebGL work entirely — a brief static frame and
  // the phase labels are sufficient; the effect above advances to 'complete'.
  if (reducedMotion) {
    return (
      <div className="intro-sequence intro-reduced-motion" role="region" aria-label="Cinematic universe introduction">
        <div className="intro-reduced-bg" />
        <div className="intro-phase-label" aria-live="polite" aria-atomic="true">
          Welcome to the Universe Explorer
        </div>
      </div>
    );
  }

  return (
    <div className="intro-sequence" role="region" aria-label="Cinematic universe introduction">
      {/* Dedicated Canvas for intro — separate from main scene */}
      <Canvas
        camera={{ position: [0, 0, 50], fov: 60 }}
        frameloop={isPlaying ? 'always' : 'demand'}
        style={{ width: '100%', height: '100%', outline: 'none', position: 'fixed', top: 0, left: 0, zIndex: 100 }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 1);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
          gl.outputColorSpace = 'srgb';
        }}
      >
        <color attach="background" args={[0x000000]} />
        {CurrentPhase}
      </Canvas>

      {/* Skip button overlay — rendered outside Canvas for accessibility */}
      <SkipIntroButton />

      {/* Progress indicator (subtle) */}
      <div className="intro-progress" aria-hidden="true">
        <div className="intro-progress-fill" style={{ width: `${progress * 100}%` }} />
      </div>

      {/* Phase label (accessible) */}
      <div className="intro-phase-label" aria-live="polite" aria-atomic="true">
        {phase === 'big-bang' && 'The Beginning — Big Bang'}
        {phase === 'galaxy' && 'Galaxy Formation — The Milky Way Takes Shape'}
        {phase === 'solar-system' && 'Solar System Formation — Our Cosmic Neighborhood'}
        {phase === 'transition' && 'Welcome to the Universe Explorer'}
      </div>
    </div>
  );
}