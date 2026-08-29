import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EARTH } from '@/data/planets';
import { useKeplerianOrbit } from '@/hooks/useKeplerianOrbit';
import { useJulianDate } from '@/hooks/useSimulationClock';
import { generateOrbitPath } from '@/engine/KeplerianOrbit';

// Use Line from three to avoid SVG <line> conflict
const Line = THREE.Line;

interface EarthProps {
  /** Visual scale multiplier for Earth size */
  scale?: number;
  /** Show orbit path */
  showOrbit?: boolean;
}

export function Earth({ scale = 1, showOrbit = true }: EarthProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Get simulation time from clock
  const julianDate = useJulianDate();

  // Calculate position using Keplerian orbital mechanics
  const position = useKeplerianOrbit(EARTH.orbital!, julianDate);

  // Generate orbit path points for visualization
  const orbitPath = useMemo(() => {
    if (!EARTH.orbital || !showOrbit) return null;
    return generateOrbitPath(EARTH.orbital!, EARTH.orbital.epoch, 360);
  }, [showOrbit]);

  // Create orbit line geometry
  const orbitGeometry = useMemo(() => {
    if (!orbitPath) return null;
    const geometry = new THREE.BufferGeometry();
    const points = orbitPath.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    geometry.setFromPoints(points);
    return geometry;
  }, [orbitPath]);

  // Earth geometry
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 32, 32), []);

  // Simple blue material for Earth
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x3b73b8,
    roughness: 0.7,
    metalness: 0.1,
  }), []);

  // Orbit line material
  const orbitMaterial = useMemo(() => new THREE.LineBasicMaterial({
    color: 0x444466,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  }), []);

  // Axial rotation (Earth rotates once per sidereal day)
  useFrame((_state, delta) => {
    if (meshRef.current) {
      const rotationPeriod = EARTH.physical.rotationPeriod;
      const angularSpeed = (2 * Math.PI / rotationPeriod);
      meshRef.current.rotation.y += angularSpeed * delta;
    }
  });

  return (
    <group position={position as any}>
      {/* Orbit path visualization - use Line from three */}
      {showOrbit && orbitGeometry && (
        <primitive
          object={useMemo(() => new Line(orbitGeometry, orbitMaterial), [orbitGeometry, orbitMaterial])}
          renderOrder={-1}
        />
      )}

      {/* Earth sphere */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        scale={[EARTH.physical.radius * scale, EARTH.physical.radius * scale, EARTH.physical.radius * scale]}
        rotation={[-EARTH.physical.axialTilt, 0, 0]}
        castShadow
        receiveShadow
      />
    </group>
  );
}