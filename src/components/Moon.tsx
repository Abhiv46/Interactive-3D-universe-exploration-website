import { useRef, useMemo, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CelestialBodyData } from '@/types/orbitalElements';
import { useKeplerianOrbit, useOrbitPath } from '@/hooks/useKeplerianOrbit';
import { useJulianDate } from '@/hooks/useSimulationClock';
import { useScale } from '@/context/ScaleContext';
import { trackPlanetClick } from '@/lib/analytics';
import { useLoading } from '@/components/UI/LoadingScreen';
import { useSafeTextureLoader } from '@/hooks/useTextureLoader';
import { AU_TO_VISUAL, VISUAL_RADIUS_SCALE } from '@/engine/Constants';
import { getPBR, markAsLinearTexture } from '@/engine/PlanetMaterials';

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
  visualScale = VISUAL_RADIUS_SCALE,
  trueScale = false,
  showOrbit = true,
  orbitColor,
  orbitOpacity = 0.3,
  rotate = true,
  onClick,
}: MoonProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const julianDate = useJulianDate();
  const { trueScale: contextTrueScale } = useScale();
  const { onTextureLoad, onShaderLoad } = useLoading();

  // Use context trueScale if not explicitly overridden
  const effectiveTrueScale = trueScale ?? contextTrueScale;

  // Load texture with progress reporting and fallback
  const textureMap = useSafeTextureLoader(data.visual?.textures?.diffuse, data.visual?.baseColor);
  // Additional surface detail textures (present in moons.ts data, previously never loaded)
  const normalMap = useSafeTextureLoader(data.visual?.textures?.normal);
  const bumpMap = useSafeTextureLoader(data.visual?.textures?.elevation);

  // Calculate position relative to parent using Keplerian orbital mechanics (returns physical meters)
  // Convert to visual coordinate system: 1 AU = 2000 visual units (matches camera system)
  const physicalRelativePosition = useKeplerianOrbit(data.orbital!, julianDate);

  // Convert physical position (meters) to visual units
  // In trueScale mode, use actual meters. In visual mode, convert AU to visual units.
  const relativePosition = effectiveTrueScale
    ? physicalRelativePosition
    : physicalRelativePosition.map(p => p * AU_TO_VISUAL) as [number, number, number];

  // Generate orbit path points for visualization (relative to parent) - returns physical meters
  const physicalOrbitPath = useOrbitPath(data.orbital!, 180); // Fewer points for moons

  // Apply same conversion to orbit path
  const orbitPath = effectiveTrueScale
    ? physicalOrbitPath
    : physicalOrbitPath.map(p => [p[0] * AU_TO_VISUAL, p[1] * AU_TO_VISUAL, p[2] * AU_TO_VISUAL] as [number, number, number]);

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

  const pbr = getPBR(data.id);

  // Create material
  const material = useMemo(() => {
    const baseColor = new THREE.Color(data.visual.baseColor);
    // Normal/bump maps are data (linear), not color (sRGB) — decode correctly
    markAsLinearTexture(normalMap);
    markAsLinearTexture(bumpMap);
    const mat = new THREE.MeshStandardMaterial({
      map: textureMap,
      color: baseColor,
      roughness: pbr.roughness,
      metalness: pbr.metalness,
      normalMap,
      bumpMap,
      bumpScale: pbr.bumpScale ?? 0.04,
    });
    // Track shader compilation
    if (onShaderLoad) onShaderLoad(`moon-${data.id}`);
    return mat;
  }, [data.visual.baseColor, textureMap, normalMap, bumpMap, pbr, onShaderLoad]);

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
        name={data.id}
      />
    </group>
  );
}