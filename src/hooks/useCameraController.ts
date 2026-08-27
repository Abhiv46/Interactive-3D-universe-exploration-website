import { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CameraController, FreeFlyCamera, OrbitFocusCamera } from '../components/Camera/CameraController';

interface CameraState {
  mode: 'free' | 'orbit';
  position: THREE.Vector3;
  target: THREE.Vector3 | null;
  distance: number;
  speed: number;
  targetObject: CelestialObject | null;
}

interface CelestialObject {
  id: string;
  name: string;
  position: THREE.Vector3;
  radius: number;
}

interface UseCameraControllerReturn {
  state: CameraState;
  setMode: (mode: 'free' | 'orbit') => void;
  setPosition: (position: THREE.Vector3) => void;
  setTarget: (target: THREE.Vector3 | null) => void;
  setDistance: (distance: number) => void;
  setSpeed: (speed: number) => void;
  focusOnObject: (object: CelestialObject) => void;
  clearFocus: () => void;
  updateFreeFly: (keys: Record<string, boolean>, deltaTime: number) => void;
  updateOrbitFocus: (deltaTime: number) => void;
}

export function useCameraController(initialSpeed = 1000): UseCameraControllerReturn {
  const [state, setState] = useState<CameraState>({
    mode: 'free',
    position: new THREE.Vector3(0, 0, 10000000000), // 10 billion meters
    target: null,
    distance: 10000000000,
    speed: initialSpeed,
    targetObject: null,
  });

  const freeCameraRef = useRef<FreeFlyCamera | null>(null);
  const orbitCameraRef = useRef<OrbitFocusCamera | null>(null);
  const cameraControllerRef = useRef<CameraController | null>(null);

  // Initialize cameras
  useEffect(() => {
    freeCameraRef.current = new FreeFlyCamera();
    orbitCameraRef.current = new OrbitFocusCamera();
    cameraControllerRef.current = new CameraController(
      freeCameraRef.current,
      orbitCameraRef.current
    );
  }, []);

  const setMode = useCallback((mode: 'free' | 'orbit') => {
    setState(prev => {
      if (prev.mode === mode) return prev;
      cameraControllerRef.current?.setMode(mode);
      return { ...prev, mode };
    });
  }, []);

  const setPosition = useCallback((position: THREE.Vector3) => {
    setState(prev => ({ ...prev, position: position.clone() }));
  }, []);

  const setTarget = useCallback((target: THREE.Vector3 | null) => {
    setState(prev => ({ ...prev, target: target ? target.clone() : null }));
  }, []);

  const setDistance = useCallback((distance: number) => {
    setState(prev => ({ ...prev, distance: Math.max(1, distance) }));
  }, []);

  const setSpeed = useCallback((speed: number) => {
    setState(prev => ({ ...prev, speed: Math.max(1, speed) }));
  }, []);

  const focusOnObject = useCallback((object: CelestialObject) => {
    setState(prev => ({
      ...prev,
      mode: 'orbit',
      targetObject: object,
      target: object.position.clone(),
      distance: Math.max(object.radius * 5, 1000000), // 5x radius or 1000km minimum
    }));
    cameraControllerRef.current?.focusOnObject(object);
  }, []);

  const clearFocus = useCallback(() => {
    setState(prev => ({
      ...prev,
      mode: 'free',
      targetObject: null,
      target: null,
    }));
    cameraControllerRef.current?.clearFocus();
  }, []);

  const updateFreeFly = useCallback((keys: Record<string, boolean>, deltaTime: number) => {
    if (state.mode !== 'free') return;
    const camera = freeCameraRef.current;
    if (!camera) return;

    const speed = state.speed * deltaTime;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0));
    right.normalize();

    const up = new THREE.Vector3(0, 1, 0);

    if (keys['KeyW'] || keys['ArrowUp']) camera.position.addScaledVector(forward, speed);
    if (keys['KeyS'] || keys['ArrowDown']) camera.position.addScaledVector(forward, -speed);
    if (keys['KeyD'] || keys['ArrowRight']) camera.position.addScaledVector(right, speed);
    if (keys['KeyA'] || keys['ArrowLeft']) camera.position.addScaledVector(right, -speed);
    if (keys['Space']) camera.position.addScaledVector(up, speed);
    if (keys['ShiftLeft'] || keys['ShiftRight']) camera.position.addScaledVector(up, -speed);

    setState(prev => ({ ...prev, position: camera.position.clone() }));
  }, [state.mode, state.speed]);

  const updateOrbitFocus = useCallback((deltaTime: number) => {
    if (state.mode !== 'orbit' || !state.targetObject) return;

    const camera = orbitCameraRef.current;
    if (!camera) return;

    camera.update(state.targetObject.position, state.distance, deltaTime);
    setState(prev => ({
      ...prev,
      position: camera.position.clone(),
      target: state.targetObject!.position.clone(),
    }));
  }, [state.mode, state.targetObject, state.distance]);

  return {
    state,
    setMode,
    setPosition,
    setTarget,
    setDistance,
    setSpeed,
    focusOnObject,
    clearFocus,
    updateFreeFly,
    updateOrbitFocus,
  };
}