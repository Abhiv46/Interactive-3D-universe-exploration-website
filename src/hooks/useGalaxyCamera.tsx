import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useScale } from '@/context/ScaleContext';
import type { PerspectiveCamera } from 'three';

/**
 * Camera scale modes for seamless transition
 */
export type CameraScaleMode = 'solar-system' | 'interstellar' | 'galactic' | 'intergalactic';

/**
 * Scale boundaries (in Three.js units)
 * Solar system (visual scale): 0 - 100,000 (Neptune orbit ~30 AU * 2000 = 60,000 visual)
 * Interstellar: 100,000 - 5,000,000 (nearby stars)
 * Galactic: 5,000,000 - 500,000,000 (Milky Way)
 * Intergalactic: 500,000,000+ (other galaxies)
 */
export const SCALE_BOUNDARIES = {
  solarSystemMax: 100000,
  interstellarMax: 5000000,
  galacticMax: 500000000,
};

/**
 * Logarithmic depth buffer helper
 * Provides smooth transitions across massive scale differences
 */
export function setupLogarithmicDepth(renderer: THREE.WebGLRenderer) {
  // Enable logarithmic depth buffer for extreme scale ranges
  renderer.getContext().getExtension('EXT_frag_depth');
  // Note: Three.js handles logarithmic depth via:
  // camera.logarithmicDepthBuffer = true
  // But we need to handle the transition manually for smooth zoom
}

/**
 * Smooth camera transition between scale modes
 */
export function useGalaxyCamera() {
  const { camera, gl } = useThree();
  const { trueScale } = useScale();
  const [scaleMode, setScaleMode] = useState<CameraScaleMode>('solar-system');
  const [transitionProgress, setTransitionProgress] = useState(0);
  const targetScaleModeRef = useRef<CameraScaleMode>('solar-system');
  const transitionStartRef = useRef<number>(0);
  const isTransitioningRef = useRef(false);

  // Camera position tracking
  const cameraDistance = useRef(0);

  // Scale mode configuration
  const scaleConfigs = {
    'solar-system': {
      minDistance: trueScale ? 0.1 : 5,
      maxDistance: trueScale ? 5e11 : 100000,
      near: trueScale ? 0.01 : 0.1,
      far: trueScale ? 1e13 : 200000,
      fov: 50,
      description: 'Solar System',
    },
    'interstellar': {
      minDistance: 100000,
      maxDistance: 5000000,
      near: 10000,
      far: 1e7,
      fov: 60,
      description: 'Local Stars',
    },
    'galactic': {
      minDistance: 50000,
      maxDistance: 5000000,
      near: 10000,
      far: 1e7,
      fov: 70,
      description: 'Milky Way Galaxy',
    },
    'intergalactic': {
      minDistance: 5000000,
      maxDistance: 5e8,
      near: 1e6,
      far: 1e9,
      fov: 80,
      description: 'Local Group',
    },
  };

  // Determine scale mode from camera distance
  const determineScaleMode = useCallback((distance: number): CameraScaleMode => {
    if (distance < SCALE_BOUNDARIES.solarSystemMax) return 'solar-system';
    if (distance < SCALE_BOUNDARIES.interstellarMax) return 'interstellar';
    if (distance < SCALE_BOUNDARIES.galacticMax) return 'galactic';
    return 'intergalactic';
  }, []);

  // Smooth transition to new scale mode
  const transitionToScale = useCallback((mode: CameraScaleMode, duration = 1500) => {
    if (mode === scaleMode && !isTransitioningRef.current) return;

    targetScaleModeRef.current = mode;
    isTransitioningRef.current = true;
    transitionStartRef.current = performance.now();

    const animate = () => {
      const elapsed = performance.now() - transitionStartRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Smooth ease-in-out
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      setTransitionProgress(eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setScaleMode(mode);
        isTransitioningRef.current = false;
        setTransitionProgress(0);
      }
    };

    requestAnimationFrame(animate);
  }, [scaleMode]);

  // Update camera matrices for logarithmic depth
  const updateCameraForScale = useCallback((mode: CameraScaleMode) => {
    const config = scaleConfigs[mode];

    camera.near = config.near;
    camera.far = config.far;
    (camera as PerspectiveCamera).fov = config.fov;
    camera.updateProjectionMatrix();

    // Update OrbitControls limits
    // This will be handled by the component using this hook
  }, [camera]);

  // Track camera distance and auto-transition
  useEffect(() => {
    const updateDistance = () => {
      const dist = camera.position.length();
      cameraDistance.current = dist;

      const newMode = determineScaleMode(dist);
      if (newMode !== scaleMode && !isTransitioningRef.current) {
        transitionToScale(newMode);
      }
    };

    updateDistance();

    // Check on each frame
    const unsubscribe = gl.setAnimationLoop(updateDistance);
    return () => gl.setAnimationLoop(null);
  }, [camera, gl, scaleMode, determineScaleMode, transitionToScale]);

  // Get current config (interpolated during transition)
  const currentConfig = scaleConfigs[scaleMode];
  const targetConfig = scaleConfigs[targetScaleModeRef.current];

  const interpolatedConfig = {
    minDistance: THREE.MathUtils.lerp(currentConfig.minDistance, targetConfig.minDistance, transitionProgress),
    maxDistance: THREE.MathUtils.lerp(currentConfig.maxDistance, targetConfig.maxDistance, transitionProgress),
    near: THREE.MathUtils.lerp(currentConfig.near, targetConfig.near, transitionProgress),
    far: THREE.MathUtils.lerp(currentConfig.far, targetConfig.far, transitionProgress),
    fov: THREE.MathUtils.lerp(currentConfig.fov, targetConfig.fov, transitionProgress),
    description: currentConfig.description,
  };

  return {
    scaleMode,
    targetScaleMode: targetScaleModeRef.current,
    transitionProgress,
    isTransitioning: isTransitioningRef.current,
    cameraDistance: cameraDistance.current,
    config: isTransitioningRef.current ? interpolatedConfig : currentConfig,
    targetConfig,
    scaleConfigs,
    transitionToScale,
    determineScaleMode,
  };
}

/**
 * Camera controller component that manages scale transitions
 */
export function GalaxyCameraController({ children }: { children: React.ReactNode }) {
  const { camera, gl } = useThree();
  const { trueScale } = useScale();
  const {
    scaleMode,
    config,
    isTransitioning,
    transitionToScale,
    cameraDistance,
    transitionProgress,
  } = useGalaxyCamera();

  const controlsRef = useRef<any>(null);

  // Register controls
  const registerControls = (controls: any) => {
    controlsRef.current = controls;
  };

  // Update controls limits based on current scale
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.minDistance = config.minDistance;
      controlsRef.current.maxDistance = config.maxDistance;
    }
  }, [config]);

  // Update camera projection matrix
  useEffect(() => {
    camera.near = config.near;
    camera.far = config.far;
    (camera as PerspectiveCamera).fov = config.fov;
    camera.updateProjectionMatrix();
  }, [camera, config]);

  // Note: logarithmicDepthBuffer is set on the renderer in Scene.tsx
  // This requires shaders to handle logarithmic depth:
  // #include <logdepthbuf_pars_vertex> etc.
  // For custom shaders like MilkyWay armMaterial, add:
  // #include <logdepthbuf_pars_vertex>
  // #include <logdepthbuf_vertex>
  // #include <logdepthbuf_pars_fragment>
  // #include <logdepthbuf_fragment>

  // Expose transition function globally for UI
  useEffect(() => {
    (window as any).__galaxyCamera = { transitionToScale };
    return () => { delete (window as any).__galaxyCamera; };
  }, [transitionToScale]);

  return (
    <>
      {children}
      {/* Scale indicator overlay */}
      <div className={`scale-indicator ${isTransitioning ? 'transitioning' : ''} scale-${scaleMode}`}>
        <span className="scale-label">{config.description || scaleMode}</span>
        <span className="scale-distance">{formatDistance(cameraDistance)}</span>
        {isTransitioning && (
          <div className="transition-bar">
            <div className="transition-fill" style={{ width: `${(transitionProgress * 100)}%` }} />
          </div>
        )}
      </div>
    </>
  );
}

function formatDistance(dist: number): string {
  if (dist < 1000) return `${dist.toFixed(0)} u`;
  if (dist < 1e6) return `${(dist / 1000).toFixed(1)} k`;
  if (dist < 1e9) return `${(dist / 1e6).toFixed(1)} M`;
  return `${(dist / 1e9).toFixed(1)} G`;
}

// Context for galaxy camera
import { createContext, useContext, ReactNode } from 'react';

interface GalaxyCameraContextValue {
  scaleMode: CameraScaleMode;
  transitionToScale: (mode: CameraScaleMode, duration?: number) => void;
  cameraDistance: number;
  config: ReturnType<typeof useGalaxyCamera>['config'];
}

const GalaxyCameraContext = createContext<GalaxyCameraContextValue | null>(null);

export function GalaxyCameraProvider({ children }: { children: ReactNode }) {
  const cameraData = useGalaxyCamera();
  const { camera } = useThree();

  // Apply the active scale config's projection bounds to the live camera.
  // (GalaxyCameraController, which used to do this, was never mounted — leaving
  // the camera at R3F's default far=1000, so the Sun at ~1505 units and every
  // planet beyond it were silently clipped out of the frustum. The Provider is
  // what actually wraps the scene, so the projection update belongs here.)
  useEffect(() => {
    camera.near = cameraData.config.near;
    camera.far = cameraData.config.far;
    (camera as PerspectiveCamera).fov = cameraData.config.fov;
    camera.updateProjectionMatrix();
  }, [camera, cameraData.config]);

  // Debug/testing hook: switch scale mode programmatically.
  useEffect(() => {
    (window as any).__galaxyCamera = { transitionToScale: cameraData.transitionToScale };
    return () => {
      delete (window as any).__galaxyCamera;
    };
  }, [cameraData.transitionToScale]);

  return (
    <GalaxyCameraContext.Provider value={{
      scaleMode: cameraData.scaleMode,
      transitionToScale: cameraData.transitionToScale,
      cameraDistance: cameraData.cameraDistance,
      config: cameraData.config,
    }}>
      {children}
    </GalaxyCameraContext.Provider>
  );
}

export function useGalaxyCameraContext() {
  const context = useContext(GalaxyCameraContext);
  if (!context) {
    throw new Error('useGalaxyCameraContext must be used within GalaxyCameraProvider');
  }
  return context;
}