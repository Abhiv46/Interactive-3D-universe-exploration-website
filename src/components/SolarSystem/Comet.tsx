import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CometData, CelestialBodyData } from '../../types/orbitalElements';
import { calculatePosition } from '../../engine/KeplerianOrbit';

interface CometProps {
  comet: CometData;
  julianDate: number;
  onClick: (object: {
    id: string;
    name: string;
    type: string;
    position: THREE.Vector3;
    data: CelestialBodyData;
    distance?: number;
  }) => void;
}

export function Comet({ comet, julianDate, onClick }: CometProps) {
  const nucleusRef = useRef<THREE.Mesh>(null);
  const dustTailRef = useRef<THREE.Points>(null);
  const ionTailRef = useRef<THREE.Points>(null);

  // Calculate position
  const position = useMemo(() => {
    return calculatePosition(comet.orbital, julianDate);
  }, [comet.orbital, julianDate]);

  // Distance from Sun
  const distanceFromSun = new THREE.Vector3(position[0], position[1], position[2]).length();

  // Nucleus geometry
  const nucleusGeometry = useMemo(() => new THREE.SphereGeometry(1, 16, 16), []);

  // Nucleus material
  const nucleusMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x333333),
    roughness: 0.95,
    metalness: 0.0,
    emissive: new THREE.Color(0x111111),
  }), []);

  // Dust tail (curved, follows orbit)
  const dustTailGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const tailSegments = 100;
    const positions = new Float32Array(tailSegments * 3);
    const sizes = new Float32Array(tailSegments);
    const alphas = new Float32Array(tailSegments);
    const ages = new Float32Array(tailSegments);

    for (let i = 0; i < tailSegments; i++) {
      const t = i / tailSegments;
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      sizes[i] = (1 - t) * 500000 + 10000;
      alphas[i] = (1 - t) * 0.4;
      ages[i] = t;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('age', new THREE.BufferAttribute(ages, 1));

    return geo;
  }, []);

  const dustTailMaterial = useMemo(() => new THREE.PointsMaterial({
    color: new THREE.Color(0xccccaa),
    sizeAttenuation: true,
    transparent: true,
    opacity: 1,
    vertexColors: false,
    blending: THREE.NormalBlending,
    depthWrite: false,
    size: 1,
  }), []);

  // Ion tail (straight, points away from Sun)
  const ionTailGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const tailSegments = 50;
    const positions = new Float32Array(tailSegments * 3);
    const sizes = new Float32Array(tailSegments);
    const alphas = new Float32Array(tailSegments);

    for (let i = 0; i < tailSegments; i++) {
      const t = i / tailSegments;
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      sizes[i] = (1 - t) * 300000 + 5000;
      alphas[i] = (1 - t) * 0.6;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    return geo;
  }, []);

  const ionTailMaterial = useMemo(() => new THREE.PointsMaterial({
    color: new THREE.Color(0x4488ff),
    sizeAttenuation: true,
    transparent: true,
    opacity: 1,
    vertexColors: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    size: 1,
  }), []);

  // Update tails
  useFrame(() => {
    if (!nucleusRef.current) return;

    // Calculate direction to Sun
    const toSun = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), new THREE.Vector3(position[0], position[1], position[2])).normalize();

    // Update dust tail (curved backward along orbit)
    if (dustTailRef.current) {
      const positions = dustTailRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      const sizes = dustTailRef.current.geometry.getAttribute('size') as THREE.BufferAttribute;
      const alphas = dustTailRef.current.geometry.getAttribute('alpha') as THREE.BufferAttribute;
      const segments = positions.count;

      for (let i = 0; i < segments; i++) {
        const t = i / segments;
        // Dust tail curves opposite to velocity
        const curve = Math.sin(t * Math.PI) * 0.3;
        const tailDir = new THREE.Vector3().sub(toSun).multiplyScalar(t * 1e10);
        // Add slight curve
        tailDir.x += curve * t * 1e10;
        tailDir.y += curve * 0.5 * t * 1e10;

        positions.setXYZ(i, tailDir.x, tailDir.y, tailDir.z);
        sizes.setX(i, (1 - t) * 500000 + 10000);
        alphas.setX(i, (1 - t) * 0.4 * Math.max(0, 1 - distanceFromSun / 2e11));
      }
      positions.needsUpdate = true;
      sizes.needsUpdate = true;
      alphas.needsUpdate = true;
    }

    // Update ion tail (straight away from Sun)
    if (ionTailRef.current) {
      const positions = ionTailRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      const sizes = ionTailRef.current.geometry.getAttribute('size') as THREE.BufferAttribute;
      const alphas = ionTailRef.current.geometry.getAttribute('alpha') as THREE.BufferAttribute;
      const segments = positions.count;

      for (let i = 0; i < segments; i++) {
        const t = i / segments;
        const tailDir = toSun.clone().multiplyScalar(-t * 2e10);
        positions.setXYZ(i, tailDir.x, tailDir.y, tailDir.z);
        sizes.setX(i, (1 - t) * 300000 + 5000);
        alphas.setX(i, (1 - t) * 0.6 * Math.max(0, 1 - distanceFromSun / 3e11));
      }
      positions.needsUpdate = true;
      sizes.needsUpdate = true;
      alphas.needsUpdate = true;
    }

    // Only show tails when close to Sun
    const showTails = distanceFromSun < 5e11; // ~3.3 AU
    if (dustTailRef.current) dustTailRef.current.visible = showTails;
    if (ionTailRef.current) ionTailRef.current.visible = showTails;
  });

  // Handle click
  const handleClick = () => {
    onClick({
      id: comet.id,
      name: comet.name,
      type: 'comet',
      position: nucleusRef.current?.getWorldPosition(new THREE.Vector3()) || new THREE.Vector3(position[0], position[1], position[2]),
      data: comet,
      distance: distanceFromSun,
    });
  };

  // Visual scale for comet
  const visualScale = 1e4; // Make comets visible
  const nucleusRadius = comet.physical.radius;

  return (
    <group position={[position[0], position[1], position[2]]}>
      {/* Ion tail (rendered first - behind) */}
      <points
        ref={ionTailRef}
        geometry={ionTailGeometry}
        material={ionTailMaterial}
        renderOrder={5}
      />

      {/* Dust tail */}
      <points
        ref={dustTailRef}
        geometry={dustTailGeometry}
        material={dustTailMaterial}
        renderOrder={6}
      />

      {/* Nucleus */}
      <mesh
        ref={nucleusRef}
        geometry={nucleusGeometry}
        material={nucleusMaterial}
        scale={[nucleusRadius * visualScale, nucleusRadius * visualScale, nucleusRadius * visualScale]}
        onClick={handleClick}
        renderOrder={10}
      />
    </group>
  );
}

// Export comet tail shader for advanced rendering
export const cometTailShader = {
  vertexShader: `
    attribute float size;
    attribute float alpha;
    attribute float age;
    varying float vAlpha;
    varying float vAge;
    void main() {
      vAlpha = alpha;
      vAge = age;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    varying float vAlpha;
    varying float vAge;
    void main() {
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;
      float a = vAlpha * (1.0 - dist * 2.0) * (1.0 - vAge * 0.5);
      gl_FragColor = vec4(color, a);
    }
  `,
};