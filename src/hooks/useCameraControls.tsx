import { createContext, useContext, useRef, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { CelestialBodyData, OrbitalElements } from '@/types/orbitalElements';
import { useJulianDate } from './useSimulationClock';
import { useScale } from '@/context/ScaleContext';
import { fastPosition, precomputeOrbit, PrecomputedOrbit } from '@/engine/KeplerianOrbit';

interface CameraControlsContextValue {
  cameraPosition: THREE.Vector3;
  cameraTarget: THREE.Vector3;
  focusedBody: CelestialBodyData | null;
  flyTo: (body: CelestialBodyData, duration?: number) => void;
  setFocus: (body: CelestialBodyData | null) => void;
  registerCamera: (camera: THREE.Camera) => void;
  registerControls: (controls: any) => void;
  getControls: () => any;
  registerBodies: (bodies: CelestialBodyData[]) => void;
  getBodyPosition: (body: CelestialBodyData) => THREE.Vector3;
}

const CameraControlsContext = createContext<CameraControlsContextValue | null>(null);

export function useCameraControls() {
  const context = useContext(CameraControlsContext);
  if (!context) {
    throw new Error('useCameraControls must be used within CameraControlsProvider');
  }
  return context;
}

interface CameraControlsProviderProps {
  children: ReactNode;
}

function calculateBodyWorldPosition(
  body: CelestialBodyData,
  timeJD: number,
  trueScale: boolean,
  allBodies: Map<string, CelestialBodyData>
): THREE.Vector3 {
  const position = new THREE.Vector3();

  if (!body.orbital) {
    return position.set(0, 0, 0);
  }

  const scale = trueScale ? 1 : 2000;
  const precomputed = precomputeOrbit(body.orbital);
  const pos = fastPosition(precomputed, timeJD);
  position.set(pos[0] * scale, pos[1] * scale, pos[2] * scale);

  if (body.parentId) {
    const parent = allBodies.get(body.parentId);
    if (parent && parent.orbital) {
      const parentPrecomputed = precomputeOrbit(parent.orbital);
      const parentPos = fastPosition(parentPrecomputed, timeJD);
      position.add(new THREE.Vector3(
        parentPos[0] * scale,
        parentPos[1] * scale,
        parentPos[2] * scale
      ));
    }
  }

  return position;
}

export function CameraControlsProvider({ children }: CameraControlsProviderProps) {
  const cameraRef = useRef<THREE.Camera | null>(null);
  const controlsRef = useRef<any>(null);
  const [focusedBody, setFocusedBodyState] = useState<CelestialBodyData | null>(null);
  const [cameraPosition] = useState(() => new THREE.Vector3());
  const [cameraTarget] = useState(() => new THREE.Vector3());

  const julianDate = useJulianDate();
  const { trueScale } = useScale();

  const allBodiesRef = useRef<Map<string, CelestialBodyData>>(new Map());

  // Store latest julianDate and trueScale in refs to avoid re-creating callbacks
  const julianDateRef = useRef(julianDate);
  const trueScaleRef = useRef(trueScale);
  julianDateRef.current = julianDate;
  trueScaleRef.current = trueScale;

  const registerBodies = useCallback((bodies: CelestialBodyData[]) => {
    const map = new Map<string, CelestialBodyData>();
    bodies.forEach(body => map.set(body.id, body));
    allBodiesRef.current = map;
  }, []);

  const updateCameraState = () => {
    if (cameraRef.current) {
      cameraRef.current.getWorldPosition(cameraPosition);
    }
    if (controlsRef.current) {
      cameraTarget.copy(controlsRef.current.target);
    }
  };

  const getBodyPosition = useCallback((body: CelestialBodyData): THREE.Vector3 => {
    return calculateBodyWorldPosition(body, julianDateRef.current, trueScaleRef.current, allBodiesRef.current);
  }, []);

  const flyTo = useCallback((body: CelestialBodyData, duration = 2000) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const targetPosition = getBodyPosition(body);

    let targetOffset = new THREE.Vector3(0, 0, 0);
    if (body.orbital) {
      const scale = trueScaleRef.current ? 1 : 2000;
      const radius = body.physical.radius * scale;
      const distance = Math.max(radius * 50, 50);
      targetOffset.set(distance, distance * 0.5, distance);
    } else if (body.id === 'sun') {
      targetOffset.set(100, 50, 100);
    }

    const startTarget = controls.target.clone();
    const endTarget = targetPosition.clone();
    const startPosition = camera.position.clone();
    const endPosition = targetPosition.clone().add(targetOffset);

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      controls.target.lerpVectors(startTarget, endTarget, eased);
      camera.position.lerpVectors(startPosition, endPosition, eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [getBodyPosition]);

  const setFocus = useCallback((body: CelestialBodyData | null) => {
    setFocusedBodyState(body);
    const controls = controlsRef.current;
    if (!controls) return;

    if (body) {
      controls.enableRotate = true;
      controls.enableZoom = true;
      controls.enablePan = false;
      const pos = getBodyPosition(body);
      controls.target.copy(pos);
    } else {
      controls.enableRotate = true;
      controls.enableZoom = true;
      controls.enablePan = false;
    }
  }, [getBodyPosition]);

  useEffect(() => {
    if (!focusedBody || !controlsRef.current) return;
    const pos = getBodyPosition(focusedBody);
    controlsRef.current.target.copy(pos);
  }, [focusedBody, getBodyPosition]);

  const registerCamera = (camera: THREE.Camera) => {
    cameraRef.current = camera;
  };

  const registerControls = (controls: any) => {
    controlsRef.current = controls;
  };

  const getControls = useCallback(() => controlsRef.current, []);

  const value = useMemo((): CameraControlsContextValue => ({
    cameraPosition,
    cameraTarget,
    focusedBody,
    flyTo,
    setFocus,
    registerCamera,
    registerControls,
    getControls,
    registerBodies,
    getBodyPosition,
  }), [
    cameraPosition,
    cameraTarget,
    focusedBody,
    flyTo,
    setFocus,
    registerCamera,
    registerControls,
    getControls,
    registerBodies,
    getBodyPosition,
  ]);

  return (
    <CameraControlsContext.Provider value={value}>
      {children}
    </CameraControlsContext.Provider>
  );
}

export function useRegisterBodies() {
  const context = useContext(CameraControlsContext);
  if (!context) {
    throw new Error('useRegisterBodies must be used within CameraControlsProvider');
  }
  return context.registerBodies;
}