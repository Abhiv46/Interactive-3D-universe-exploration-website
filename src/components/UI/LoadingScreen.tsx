import { useState, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface LoadingScreenProps {
  onComplete: () => void;
  progress?: number; // 0-1
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

export function LoadingScreen({ onComplete, progress: externalProgress }: LoadingScreenProps) {
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [assetsLoaded, setAssetsLoaded] = useState<LoadingAssets>({
    textures: 0,
    starData: 0,
    shaders: 0,
    total: 0,
  });
  const [isComplete, setIsComplete] = useState(false);
  const [showUI, setShowUI] = useState(false);

  // Simulate loading progress with smooth animation
  useFrame((_state, delta) => {
    if (isComplete) return;

    // If external progress is provided, use it
    if (externalProgress !== undefined) {
      setProgress(externalProgress);
      return;
    }

    // Auto-progress simulation
    const targetProgress = Math.min(progress + delta * 0.15, 1);
    setProgress(targetProgress);

    // Update stage based on progress
    let accumulatedWeight = 0;
    for (let i = 0; i < LOADING_STAGES.length; i++) {
      accumulatedWeight += LOADING_STAGES[i].weight;
      if (targetProgress < accumulatedWeight) {
        setStage(i);
        break;
      }
    }
  });

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
              <span>{assetsLoaded.textures} / {assetsLoaded.total}</span>
            </div>
            <div className="detail-row">
              <span>Star Data:</span>
              <span>{assetsLoaded.starData} / 117,955</span>
            </div>
            <div className="detail-row">
              <span>Shaders:</span>
              <span>{assetsLoaded.shaders} / 8</span>
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
            setProgress(1);
            onComplete();
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

  // Track texture loading
  const textureLoadHandler = useCallback((event: any) => {
    setLoadedAssets(prev => ({
      ...prev,
      textures: prev.textures + 1,
    }));
  }, []);

  // Track star data loading
  const starDataLoadHandler = useCallback((count: number) => {
    setLoadedAssets(prev => ({
      ...prev,
      starData: count,
    }));
  }, []);

  // Track shader compilation
  const shaderLoadHandler = useCallback(() => {
    setLoadedAssets(prev => ({
      ...prev,
      shaders: prev.shaders + 1,
    }));
  }, []);

  // Provide loading context to children
  const loadingContext = {
    isLoading,
    progress,
    loadedAssets,
    setProgress,
    setIsLoading,
    onTextureLoad: textureLoadHandler,
    onStarDataLoad: starDataLoadHandler,
    onShaderLoad: shaderLoadHandler,
  };

  return (
    <LoadingContext.Provider value={loadingContext}>
      {isLoading && (
        <LoadingScreen onComplete={() => setIsLoading(false)} progress={progress} />
      )}
      {!isLoading && children}
    </LoadingContext.Provider>
  );
}

// Context for sharing loading state
import { createContext, useContext, ReactNode } from 'react';

interface LoadingContextValue {
  isLoading: boolean;
  progress: number;
  loadedAssets: LoadingAssets;
  setProgress: (progress: number) => void;
  setIsLoading: (loading: boolean) => void;
  onTextureLoad: (event: any) => void;
  onStarDataLoad: (count: number) => void;
  onShaderLoad: () => void;
}

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
}