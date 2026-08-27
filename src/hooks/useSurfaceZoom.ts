import { useState, useCallback, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CelestialBodyData } from '@/types/orbitalElements';
import { useCameraControls } from './useCameraControls';
import { useScale } from '@/context/ScaleContext';

/** Body IDs that have real surface elevation data */
const BODIES_WITH_SURFACE_DATA: Set<string> = new Set(['earth', 'moon', 'mars']);

interface SurfaceZoomState {
  /** Whether surface zoom mode is active */
  isActive: boolean;
  /** Current zoom level (0 = orbital, 1 = surface) */
  zoomLevel: number;
  /** The body currently being surface-zoomed */
  targetBody: CelestialBodyData | null;
  /** Camera distance from body center (for transition calculations) */
  distance: number;
}

/** Configuration for surface zoom transitions */
const SURFACE_ZOOM_CONFIG = {
  /** Distance at which surface terrain starts fading in (meters from body center) */
  terrainFadeStartDistance: (radius: number) => radius * 50,
  /** Distance at which surface terrain is fully visible */
  terrainFadeEndDistance: (radius: number) => radius * 5,
  /** Distance at which camera switches to surface-relative controls */
  controlSwitchDistance: (radius: number) => radius * 10,
  /** Minimum camera distance (just above surface) */
  minDistance: (radius: number) => radius * 1.01,
  /** Maximum camera distance in surface mode */
  maxDistance: (radius: number) => radius * 100,
  /** Transition duration in ms */
  transitionDuration: 2000,
};

/** Hook for managing surface zoom state and transitions */
export function useSurfaceZoom() {
  const { setFocus, flyTo, getBodyPosition } = useCameraControls();
  const { trueScale } = useScale();

  const [state, setState] = useState<SurfaceZoomState>({
    isActive: false,
    zoomLevel: 0,
    targetBody: null,
    distance: 0,
  });

  const transitionRef = useRef<{
    startTime: number;
    startZoom: number;
    targetZoom: number;
    startDistance: number;
    targetDistance: number;
  } | null>(null);

  /** Check if a body has surface data available */
  const hasSurfaceData = useCallback((body: CelestialBodyData): boolean => {
    return BODIES_WITH_SURFACE_DATA.has(body.id);
  }, []);

  /** Start surface zoom for a body */
  const enterSurfaceZoom = useCallback((body: CelestialBodyData) => {
    if (!hasSurfaceData(body)) return;

    // Fly to the body first
    flyTo(body, SURFACE_ZOOM_CONFIG.transitionDuration);

    setState({
      isActive: true,
      zoomLevel: 0,
      targetBody: body,
      distance: 0,
    });

    // Start transition
    const radius = body.physical.radius * (trueScale ? 1 : 2000);
    const startDistance = radius * 100; // Start from orbital distance
    const targetDistance = radius * 5;  // End at surface distance

    transitionRef.current = {
      startTime: performance.now(),
      startZoom: 0,
      targetZoom: 1,
      startDistance,
      targetDistance,
    };
  }, [flyTo, hasSurfaceData, trueScale]);

  /** Exit surface zoom mode */
  const exitSurfaceZoom = useCallback(() => {
    if (!state.targetBody) return;

    const body = state.targetBody;
    const radius = body.physical.radius * (trueScale ? 1 : 2000);

    transitionRef.current = {
      startTime: performance.now(),
      startZoom: state.zoomLevel,
      targetZoom: 0,
      startDistance: state.distance,
      targetDistance: radius * 100,
    };

    // After transition, clear state
    setTimeout(() => {
      setState({
        isActive: false,
        zoomLevel: 0,
        targetBody: null,
        distance: 0,
      });
      setFocus(null);
    }, SURFACE_ZOOM_CONFIG.transitionDuration);
  }, [state.targetBody, state.zoomLevel, state.distance, trueScale, setFocus]);

  /** Update zoom level based on camera distance */
  const updateZoomFromDistance = useCallback((body: CelestialBodyData, distance: number) => {
    const radius = body.physical.radius * (trueScale ? 1 : 2000);
    const fadeStart = SURFACE_ZOOM_CONFIG.terrainFadeStartDistance(radius);
    const fadeEnd = SURFACE_ZOOM_CONFIG.terrainFadeEndDistance(radius);

    let zoomLevel = 0;
    if (distance <= fadeEnd) {
      zoomLevel = 1;
    } else if (distance < fadeStart) {
      zoomLevel = 1 - (distance - fadeEnd) / (fadeStart - fadeEnd);
    }

    setState(prev => ({
      ...prev,
      zoomLevel,
      distance,
    }));

    return zoomLevel;
  }, [trueScale]);

  /** Handle smooth transition animation */
  useFrame(() => {
    if (!transitionRef.current) return;

    const { startTime, startZoom, targetZoom, startDistance, targetDistance } = transitionRef.current;
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / SURFACE_ZOOM_CONFIG.transitionDuration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // Cubic ease-out

    const currentZoom = startZoom + (targetZoom - startZoom) * eased;
    const currentDistance = startDistance + (targetDistance - startDistance) * eased;

    setState(prev => ({
      ...prev,
      zoomLevel: currentZoom,
      distance: currentDistance,
    }));

    if (progress >= 1) {
      transitionRef.current = null;
    }
  });

  /** Get current surface zoom state for a specific body */
  const getSurfaceZoomState = useCallback((body: CelestialBodyData): { zoomLevel: number; isActive: boolean } => {
    if (state.targetBody?.id === body.id) {
      return { zoomLevel: state.zoomLevel, isActive: state.isActive };
    }
    return { zoomLevel: 0, isActive: false };
  }, [state]);

  return {
    state,
    hasSurfaceData,
    enterSurfaceZoom,
    exitSurfaceZoom,
    updateZoomFromDistance,
    getSurfaceZoomState,
  };
}

/** Hook for surface-relative camera controls */
export function useSurfaceCameraControls(body: CelestialBodyData | null, zoomLevel: number) {
  const { cameraPosition, cameraTarget, registerControls } = useCameraControls();
  const controlsRef = useRef<any>(null);

  // Register controls
  useEffect(() => {
    const handleControls = (controls: any) => {
      controlsRef.current = controls;
    };
    registerControls(handleControls);
  }, [registerControls]);

  // Update controls based on zoom level
  useFrame(() => {
    if (!controlsRef.current || !body) return;

    const controls = controlsRef.current;
    const radius = body.physical.radius * 2000; // Visual scale

    if (zoomLevel > 0.5) {
      // Surface mode: orbit around a point on the surface
      controls.enableRotate = true;
      controls.enableZoom = true;
      controls.enablePan = false;
      controls.minDistance = radius * 1.01;
      controls.maxDistance = radius * 50;
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = Math.PI / 2 - 0.01; // Don't go underground
    } else if (zoomLevel > 0) {
      // Transition mode
      controls.minDistance = radius * 1.01;
      controls.maxDistance = radius * 500;
    } else {
      // Orbital mode
      controls.minDistance = radius * 2;
      controls.maxDistance = radius * 5000;
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = Math.PI;
    }
  });

  return controlsRef;
}

/** Convert camera position to surface coordinates (lat/lon) */
export function cameraToSurfaceCoords(
  camera: THREE.Camera,
  body: CelestialBodyData
): { lat: number; lon: number; altitude: number } {
  const cameraPos = new THREE.Vector3();
  camera.getWorldPosition(cameraPos);

  // Get body world position
  // This would need the body's actual world position from the scene
  const bodyPos = new THREE.Vector3(); // Placeholder

  const relativePos = cameraPos.clone().sub(bodyPos).normalize();

  const lat = Math.asin(THREE.MathUtils.clamp(relativePos.y, -1, 1)) * THREE.MathUtils.RAD2DEG;
  const lon = Math.atan2(relativePos.z, relativePos.x) * THREE.MathUtils.RAD2DEG;
  const altitude = cameraPos.distanceTo(bodyPos) - body.physical.radius;

  return { lat, lon, altitude };
}