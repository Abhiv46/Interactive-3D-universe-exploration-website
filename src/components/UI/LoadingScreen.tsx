import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface LoadingScreenProps {
  onComplete: () => void;
  progress?: number; // 0-1
  loadedAssets?: LoadingAssets;
  expectedAssets?: LoadingAssets;
}

interface LoadingAssets {
  textures: number;
  starData: number;
  shaders: number;
  total: number;
}

const LOADING_STAGES = [
  { name: 'Initializing WebGL...', weight: 0.05 },
  { name: 'Loading planet textures...', weight: 0.4 },
  { name: 'Loading star catalog (Hipparcos)...', weight: 0.3 },
  { name: 'Loading constellation data...', weight: 0.1 },
  { name: 'Loading galaxy data...', weight: 0.1 },
  { name: 'Compiling shaders...', weight: 0.05 },
];

export function LoadingScreen({ onComplete, progress: externalProgress, loadedAssets, expectedAssets }: LoadingScreenProps) {
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showUI, setShowUI] = useState(false);

  // Simulate loading progress with smooth animation (rAF loop, safe outside Canvas)
  const rafRef = useRef<number>();
  const lastTimeRef = useRef<number>(performance.now());
  useEffect(() => {
    if (isComplete) return;

    const tick = (now: number) => {
      const delta = Math.min((now - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = now;

      // If external progress is provided, use it
      if (externalProgress !== undefined) {
        setProgress(externalProgress);
      } else {
        setProgress((prev) => Math.min(prev + delta * 0.15, 1));
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isComplete, externalProgress]);

  // Update stage based on progress
  useEffect(() => {
    let accumulatedWeight = 0;
    for (let i = 0; i < LOADING_STAGES.length; i++) {
      accumulatedWeight += LOADING_STAGES[i].weight;
      if (progress < accumulatedWeight) {
        setStage(i);
        break;
      }
    }
  }, [progress]);

  // Complete when progress reaches 1
  useEffect(() => {
    if (progress >= 1 && !isComplete) {
      setIsComplete(true);
      // Small delay for visual satisfaction
      setTimeout(() => {
        setShowUI(true);
        onComplete();
      }, 300);
    }
  }, [progress, isComplete, onComplete]);

  // Entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setShowUI(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const currentStage = LOADING_STAGES[Math.min(stage, LOADING_STAGES.length - 1)];

  // Easing function for smooth progress bar
  const easedProgress = easeInOutCubic(progress);

  return (
    <div
      className={`loading-screen ${isComplete ? 'complete' : ''} ${showUI ? 'visible' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Loading Universe Explorer"
    >
      <div className="loading-container">
        {/* Animated background */}
        <div className="loading-bg">
          <canvas className="loading-canvas" />
        </div>

        {/* Main content */}
        <div className="loading-content">
          {/* Logo/Title */}
          <div className="loading-title">
            <span className="icon">🪐</span>
            <h1>Universe Explorer</h1>
          </div>

          {/* Progress bar */}
          <div className="loading-progress-wrapper">
            <div className="loading-progress-bar">
              <div
                className="loading-progress-fill"
                style={{ width: `${easedProgress * 100}%` }}
              />
            </div>
            <div className="loading-percentage">{Math.round(easedProgress * 100)}%</div>
          </div>

          {/* Current stage */}
          <div className="loading-stage">{currentStage.name}</div>

          {/* Asset details */}
          <div className="loading-details">
            <div className="detail-row">
              <span>Textures:</span>
              <span>{loadedAssets?.textures ?? 0} / {expectedAssets?.textures ?? 50}</span>
            </div>
            <div className="detail-row">
              <span>Star Data:</span>
              <span>{loadedAssets?.starData ?? 0} / {expectedAssets?.starData ?? 117955}</span>
            </div>
            <div className="detail-row">
              <span>Shaders:</span>
              <span>{loadedAssets?.shaders ?? 0} / {expectedAssets?.shaders ?? 8}</span>
            </div>
          </div>

          {/* Fun fact / tip */}
          <div className="loading-tip">
            {LOADING_TIPS[Math.floor(progress * LOADING_TIPS.length) % LOADING_TIPS.length]}
          </div>
        </div>

        {/* Complete state */}
        {isComplete && (
          <div className="loading-complete">
            <span className="complete-icon">✨</span>
            <span>Ready to explore</span>
            <span className="complete-hint">Click or press any key to begin</span>
          </div>
        )}
      </div>

      {/* Skip button for impatient users */}
      {!isComplete && (
        <button
          className="loading-skip"
          onClick={() => {
            console.log('[LoadingScreen] Skip clicked - forcing progress to 100%');
            // When skipping, we set progress to 1 but LoadingProvider only completes
            // when canvasReady is true. If canvas isn't ready, we wait for it.
            setProgress(1);
            // Don't call onComplete() here - the useEffect will handle it when progress reaches 1
          }}
          aria-label="Skip loading"
        >
          Skip
        </button>
      )}
    </div>
  );
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const LOADING_TIPS = [
  "The Sun contains 99.86% of the solar system's mass",
  "A day on Venus is longer than its year",
  "Neptune was discovered mathematically before being observed",
  "The Milky Way contains 100-400 billion stars",
  "Light from the Sun takes 8 minutes to reach Earth",
  "Saturn's rings are made of ice and rock particles",
  "Jupiter's Great Red Spot has raged for 350+ years",
  "The nearest star system is 4.24 light-years away",
  "There are more stars than grains of sand on Earth",
  "A teaspoon of neutron star weighs 6 billion tons",
];

// LoadingProvider - wraps the app and manages asset loading
export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [loadedAssets, setLoadedAssets] = useState<LoadingAssets>({
    textures: 0,
    starData: 0,
    shaders: 0,
    total: 0,
  });
  const [canvasReady, setCanvasReady] = useState(false);

  // Expected asset counts (will be updated as components load)
  // Only diffuse textures are loaded per body (see Planet.tsx and Moon.tsx)
  // Sun + 8 planets + Moon + 4 Galilean moons + Titan + Enceladus = 17 bodies
  // Star catalog: BRIGHT_STARS (~80) + generated 20,000 = ~20,080 total
  // Shaders used by Scene.tsx: Planet(8) + Moon(7) + Sun(2) + MilkyWay(1) + Rings(8: 7 Saturn + 1 Uranus) = 26
  const [expectedAssets, setExpectedAssets] = useState<LoadingAssets>({
    textures: 17, // One diffuse texture per celestial body
    starData: 20080, // BRIGHT_STARS + generatedAdditionalStars(20000) from stars.ts
    shaders: 26, // Planet(8) + Moon(7) + Sun(2) + MilkyWay(1) + Rings(8) = 26
    total: 0,
  });

  // Calculate total expected
  useEffect(() => {
    const total = expectedAssets.textures + expectedAssets.shaders + 1; // starData is separate
    setExpectedAssets(prev => ({ ...prev, total }));
  }, [expectedAssets]);

  // Auto-calculate progress from loaded assets
  useEffect(() => {
    if (expectedAssets.total === 0) return;

    const textureProgress = Math.min(loadedAssets.textures / Math.max(expectedAssets.textures, 1), 1);
    const starDataProgress = Math.min(loadedAssets.starData / Math.max(expectedAssets.starData, 1), 1);
    const shaderProgress = Math.min(loadedAssets.shaders / Math.max(expectedAssets.shaders, 1), 1);

    // Weighted progress: textures 40%, starData 30%, shaders 30%
    const calculatedProgress =
      textureProgress * 0.4 +
      starDataProgress * 0.3 +
      shaderProgress * 0.3;

    setProgress(calculatedProgress);

    console.log('[Loading] Progress:', {
      progress: Math.round(calculatedProgress * 100) + '%',
      textures: `${loadedAssets.textures}/${expectedAssets.textures}`,
      starData: `${loadedAssets.starData}/${expectedAssets.starData}`,
      shaders: `${loadedAssets.shaders}/${expectedAssets.shaders}`,
    });

    // Auto-complete when all major assets are loaded AND canvas is ready
    if (calculatedProgress >= 0.95 && isLoading && canvasReady) {
      console.log('[Loading] All assets loaded and canvas ready, completing...');
      setTimeout(() => {
        console.log('[Loading] Setting isLoading to false');
        setIsLoading(false);
      }, 300);
    }
  }, [loadedAssets, expectedAssets, isLoading, canvasReady]);

  // Log when isLoading changes
  useEffect(() => {
    console.log('[LoadingProvider] isLoading changed:', isLoading);
  }, [isLoading]);

  // Track texture loading
  const textureLoadHandler = useCallback((event: any) => {
    console.log('[Loading] Texture loaded:', event?.target?.src || event);
    setLoadedAssets(prev => ({
      ...prev,
      textures: prev.textures + 1,
    }));
  }, []);

  // Track star data loading
  const starDataLoadHandler = useCallback((count: number) => {
    console.log('[Loading] Star data loaded:', count);
    setLoadedAssets(prev => ({
      ...prev,
      starData: count,
    }));
    // Also update expected if we got more than expected
    setExpectedAssets(prev => ({
      ...prev,
      starData: Math.max(prev.starData, count),
    }));
  }, []);

  // Track shader compilation (deduplicated)
  const shaderLoadedRef = useRef<Set<string>>(new Set());
  const shaderLoadHandler = useCallback((shaderName: string = 'default') => {
    if (!shaderLoadedRef.current.has(shaderName)) {
      shaderLoadedRef.current.add(shaderName);
      console.log('[Loading] Shader compiled:', shaderName);
      setLoadedAssets(prev => ({
        ...prev,
        shaders: prev.shaders + 1,
      }));
    }
  }, []);

  // Allow components to register expected asset counts
  const registerExpectedAssets = useCallback((assets: Partial<LoadingAssets>) => {
    setExpectedAssets(prev => ({
      ...prev,
      ...assets,
    }));
  }, []);

  // Track canvas ready state
  const canvasReadyHandler = useCallback(() => {
    console.log('[Loading] Canvas ready');
    setCanvasReady(true);
  }, []);

  // Provide loading context to children - use useMemo to prevent infinite re-renders
  const loadingContext = useMemo(() => ({
    isLoading,
    progress,
    loadedAssets,
    expectedAssets,
    setProgress,
    setIsLoading,
    onTextureLoad: textureLoadHandler,
    onStarDataLoad: starDataLoadHandler,
    onShaderLoad: shaderLoadHandler,
    registerExpectedAssets,
    onCanvasReady: canvasReadyHandler,
  }), [
    isLoading,
    progress,
    loadedAssets,
    expectedAssets,
    setProgress,
    setIsLoading,
    textureLoadHandler,
    starDataLoadHandler,
    shaderLoadHandler,
    registerExpectedAssets,
    canvasReadyHandler,
  ]);

  return (
    <LoadingContext.Provider value={loadingContext}>
      {/* Always render children so textures/shaders can start loading */}
      {children}
      {/* Show loading overlay on top while loading - only hide when canvas is ready AND assets are loaded OR user skips */}
      {isLoading && (
        <LoadingScreen
          onComplete={() => setIsLoading(false)}
          progress={progress}
          loadedAssets={loadedAssets}
          expectedAssets={expectedAssets}
        />
      )}
    </LoadingContext.Provider>
  );
}

// Context for sharing loading state
import { createContext, useContext, ReactNode } from 'react';

interface LoadingContextValue {
  isLoading: boolean;
  progress: number;
  loadedAssets: LoadingAssets;
  expectedAssets: LoadingAssets;
  setProgress: (progress: number) => void;
  setIsLoading: (loading: boolean) => void;
  onTextureLoad: (event: any) => void;
  onStarDataLoad: (count: number) => void;
  onShaderLoad: (shaderName?: string) => void;
  registerExpectedAssets: (assets: Partial<LoadingAssets>) => void;
  onCanvasReady: () => void;
}

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
}