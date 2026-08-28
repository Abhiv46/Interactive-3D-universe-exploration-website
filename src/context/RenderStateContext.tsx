import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import * as THREE from 'three';

interface RenderStateValue {
  gl: THREE.WebGLRenderer | null;
  camera: THREE.Camera | null;
  scene: THREE.Scene | null;
  registerRenderer: (gl: THREE.WebGLRenderer) => void;
  registerCamera: (camera: THREE.Camera) => void;
  registerScene: (scene: THREE.Scene) => void;
}

const RenderStateContext = createContext<RenderStateValue | null>(null);

/**
 * Bridges the Three.js renderer/camera/scene from inside the <Canvas> out to
 * DOM components (UI overlay) that need them for screenshots / OG images.
 * This avoids calling useThree() outside the Canvas, which throws a runtime error.
 */
export function RenderStateProvider({ children }: { children: ReactNode }) {
  const [gl, setGl] = useState<THREE.WebGLRenderer | null>(null);
  const [camera, setCamera] = useState<THREE.Camera | null>(null);
  const [scene, setScene] = useState<THREE.Scene | null>(null);

  const registerRenderer = useCallback((r: THREE.WebGLRenderer) => setGl(r), []);
  const registerCamera = useCallback((c: THREE.Camera) => setCamera(c), []);
  const registerScene = useCallback((s: THREE.Scene) => setScene(s), []);

  return (
    <RenderStateContext.Provider
      value={{ gl, camera, scene, registerRenderer, registerCamera, registerScene }}
    >
      {children}
    </RenderStateContext.Provider>
  );
}

export function useRenderState() {
  const context = useContext(RenderStateContext);
  if (!context) {
    throw new Error('useRenderState must be used within a RenderStateProvider');
  }
  return context;
}
