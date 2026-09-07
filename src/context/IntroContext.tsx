import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';

export type IntroPhase = 'big-bang' | 'galaxy' | 'solar-system' | 'transition' | 'complete';

export interface IntroContextValue {
  /** Current phase of the intro sequence */
  phase: IntroPhase;
  /** Whether the intro is currently playing (always true until complete) */
  isPlaying: boolean;
  /** Whether the user has completed the intro before (persisted) */
  hasCompleted: boolean;
  /** Skip the intro entirely and jump to interactive view */
  skipIntro: () => void;
  /** Restart the intro from the beginning (for re-watch) */
  restartIntro: () => void;
  /** Set the current phase directly (used by Transition phase) */
  setPhase: (phase: IntroPhase) => void;
  /** Called by each phase when it completes naturally */
  onPhaseComplete: () => void;
  /** Current progress through the full intro (0-1) */
  progress: number;
}

const INTRO_STORAGE_KEY = 'universe-explorer-intro-completed';

const PHASE_ORDER: IntroPhase[] = ['big-bang', 'galaxy', 'solar-system', 'transition', 'complete'];
const PHASE_PROGRESS: Record<IntroPhase, number> = {
  'big-bang': 0.0,
  'galaxy': 0.25,
  'solar-system': 0.5,
  'transition': 0.75,
  'complete': 1.0,
};

interface IntroProviderProps {
  children: ReactNode;
}

export function IntroProvider({ children }: IntroProviderProps) {
  // Read persisted completion state on mount
  const [hasCompleted, setHasCompleted] = useState(false);
  const [phase, setPhase] = useState<IntroPhase>('big-bang');
  const [isPlaying, setIsPlaying] = useState(true);

  // Initialize from localStorage on first render
  useEffect(() => {
    try {
      const stored = localStorage.getItem(INTRO_STORAGE_KEY);
      if (stored === 'true') {
        setHasCompleted(true);
        setPhase('complete');
        setIsPlaying(false);
      }
    } catch {
      // localStorage unavailable (private browsing, etc.) — treat as first visit
    }
  }, []);

  const skipIntro = useCallback(() => {
    setPhase('transition');
    // Transition phase will handle the handoff to complete
  }, []);

  const restartIntro = useCallback(() => {
    try {
      localStorage.removeItem(INTRO_STORAGE_KEY);
    } catch {
      // ignore
    }
    setHasCompleted(false);
    setPhase('big-bang');
    setIsPlaying(true);
  }, []);

  const setPhaseDirect = useCallback((newPhase: IntroPhase) => {
    setPhase(newPhase);
    if (newPhase === 'complete') {
      setIsPlaying(false);
      setHasCompleted(true);
      try {
        localStorage.setItem(INTRO_STORAGE_KEY, 'true');
      } catch {
        // ignore
      }
    }
  }, []);

  const onPhaseComplete = useCallback(() => {
    const currentIndex = PHASE_ORDER.indexOf(phase);
    if (currentIndex < PHASE_ORDER.length - 1) {
      const nextPhase = PHASE_ORDER[currentIndex + 1];
      setPhase(nextPhase);
      if (nextPhase === 'complete') {
        setIsPlaying(false);
        setHasCompleted(true);
        try {
          localStorage.setItem(INTRO_STORAGE_KEY, 'true');
        } catch {
          // ignore
        }
      }
    }
  }, [phase]);

  const progress = PHASE_PROGRESS[phase];

  const value = useMemo<IntroContextValue>(() => ({
    phase,
    isPlaying,
    hasCompleted,
    skipIntro,
    restartIntro,
    setPhase: setPhaseDirect,
    onPhaseComplete,
    progress,
  }), [
    phase,
    isPlaying,
    hasCompleted,
    skipIntro,
    restartIntro,
    setPhaseDirect,
    onPhaseComplete,
    progress,
  ]);

  // Render children always so the main scene mounts and exposes __THREE__.
  // The IntroSequence renders in its own fixed-position Canvas with a black background
  // that visually covers the main scene during intro phases. No need to hide children.
  // IntroSequence is rendered by the component that consumes this context (App.tsx).
  return (
    <IntroContext.Provider value={value}>
      {children}
    </IntroContext.Provider>
  );
}

const IntroContext = createContext<IntroContextValue | null>(null);

export function useIntro(): IntroContextValue {
  const context = useContext(IntroContext);
  if (!context) {
    throw new Error('useIntro must be used within an IntroProvider');
  }
  return context;
}