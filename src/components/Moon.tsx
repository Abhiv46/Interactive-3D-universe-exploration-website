import { useRef, useMemo, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CelestialBodyData } from '@/types/orbitalElements';
import { useKeplerianOrbit, useOrbitPath } from '@/hooks/useKeplerianOrbit';
import { useSimulationClock } from '@/hooks/useSimulationClock';
import { useScale } from '@/context/ScaleContext';
import { trackPlanetClick } from '@/lib/analytics';

// Use Line from three to avoid SVG <line> conflict
const Line = THREE.Line;

interface MoonProps {
  /** Moon data from planets.ts */
  data: CelestialBodyData;
  /** Parent planet's position (updated each frame) */
  parentPosition: [number, number, number];
  /** Visual scale multiplier for moon size */
  visualScale?: number;
  /** True scale mode */
  trueScale?: boolean;
  /** Show orbit path around parent */
  showOrbit?: boolean;
  /** Orbit line color */
  orbitColor?: string;
  /** Orbit line opacity */
  orbitOpacity?: number;
  /** Enable axial rotation */
  rotate?: boolean;
  /** Click handler for selection */
  onClick?: (data: CelestialBodyData) => void;
}

export function Moon({
  data,
  parentPosition,
  visualScale = 1,
  trueScale = false,
  showOrbit = true,
  orbitColor,
  orbitOpacity = 0.3,
  rotate = true,
  onClick,
}: MoonProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { julianDate } = useSimulationClock();
  const { trueScale: contextTrueScale } = useScale();

  // Use context trueScale if not explicitly overridden
  const effectiveTrueScale = trueScale ?? contextTrueScale;

  // Calculate position relative to parent using Keplerian orbital mechanics
  const relativePosition = useKeplerianOrbit(data.orbital!, julianDate);

  // Generate orbit path points for visualization (relative to parent)
  const orbitPath = useOrbitPath(data.orbital!, 180); // Fewer points for moons

  // Create orbit line geometry (relative to parent)
  const orbitGeometry = useMemo(() => {
    if (!orbitPath || orbitPath.length === 0 || !showOrbit) return null;
    const geometry = new THREE.BufferGeometry();
    const points = orbitPath.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    geometry.setFromPoints(points);
    return geometry;
  }, [orbitPath, showOrbit]);

  // Moon geometry
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 16, 16), []); // Lower poly for moons

  // Determine radius based on scale mode
  const displayRadius = effectiveTrueScale
    ? data.physical.radius
    : data.physical.radius * visualScale;

  // Create material
  const material = useMemo(() => {
    const baseColor = new THREE.Color(data.visual.baseColor);
    return new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.8,
      metalness: 0.05,
    });
  }, [data.visual.baseColor]);

  // Orbit line material
  const orbitMaterial = useMemo(() => new THREE.LineBasicMaterial({
    color: new THREE.Color(orbitColor || data.visual.orbitColor || '#666688'),
    transparent: true,
    opacity: orbitOpacity,
    depthWrite: false,
  }), [orbitColor, orbitOpacity, data.visual.orbitColor]);

  // Handle click for selection
  const handleMoonClick = useCallback(() => {
    if (onClick) {
      onClick(data);
      trackPlanetClick(data.id, data.name, 'click');
    }
  }, [onClick, data]);

  // Axial rotation
  useFrame((_state, delta) => {
    if (rotate && meshRef.current && data.physical.rotationPeriod > 0) {
      const angularSpeed = (2 * Math.PI) / data.physical.rotationPeriod;
      meshRef.current.rotation.y += angularSpeed * delta;
    }
  });

  // Calculate absolute position = parent position + relative position
  const absolutePosition = useMemo(() => [
    parentPosition[0] + relativePosition[0],
    parentPosition[1] + relativePosition[1],
    parentPosition[2] + relativePosition[2],
  ], [parentPosition, relativePosition]);

  // Orbit path position = parent position + relative orbit path
  const orbitPathPosition = useMemo(() => parentPosition, [parentPosition]);

  return (
    <group position={absolutePosition as any}>
      {/* Orbit path around parent */}
      {showOrbit && orbitGeometry && (
        <group position={orbitPathPosition as any}>
          <primitive
            object={useMemo(() => new Line(orbitGeometry, orbitMaterial), [orbitGeometry, orbitMaterial])}
            renderOrder={-1}
          />
        </group>
      )}

      {/* Moon sphere */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        scale={[displayRadius, displayRadius, displayRadius]}
        rotation={[-data.physical.axialTilt, 0, 0]}
        castShadow
        receiveShadow
        onClick={(e) => { e.stopPropagation(); handleMoonClick(); }}
      />
    </group>
  );
}