import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SunProps {
  /** Visual radius in scene units (not physical) */
  radius?: number;
}

export function Sun({ radius = 5 }: SunProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight | null>(null);

  // Geometry - high segments for smooth sphere
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 64, 64), []);

  // Emissive material for glowing sun - works with bloom post-processing
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xffee88,
    transparent: false,
    depthWrite: true,
    toneMapped: false,
  }), []);

  // Corona/glow layer
  const coronaGeometry = useMemo(() => new THREE.SphereGeometry(1.15, 32, 32), []);
  const coronaMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xffaa00,
    transparent: true,
    opacity: 0.15,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  }), []);

  // Add point light at center for illumination
  useEffect(() => {
    if (meshRef.current) {
      const light = new THREE.PointLight(0xfff5e6, 2, 0, 2);
      light.position.set(0, 0, 0);
      meshRef.current.add(light);
      lightRef.current = light;
    }
    return () => {
      if (lightRef.current && meshRef.current) {
        meshRef.current.remove(lightRef.current);
        lightRef.current = null;
      }
    };
  }, []);

  // Subtle corona rotation
  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.0001;
    }
  });

  return (
    <group>
      {/* Corona/glow outer layer */}
      <mesh
        ref={meshRef}
        geometry={coronaGeometry}
        material={coronaMaterial}
        scale={[radius, radius, radius]}
        renderOrder={0}
      />
      {/* Sun surface - emissive for bloom */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        scale={[radius, radius, radius]}
        renderOrder={1}
      />
    </group>
  );
}