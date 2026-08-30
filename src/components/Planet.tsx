import { useRef, useMemo, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CelestialBodyData } from '@/types/orbitalElements';
import { useKeplerianOrbit, useOrbitPath } from '@/hooks/useKeplerianOrbit';
import { useJulianDate } from '@/hooks/useSimulationClock';
import { Moon } from './Moon';
import { useScale } from '@/context/ScaleContext';
import { trackPlanetClick } from '@/lib/analytics';
import { useLoading } from '@/components/UI/LoadingScreen';
import { useSafeTextureLoader } from '@/hooks/useTextureLoader';

// Use Line from three to avoid SVG <line> conflict
const Line = THREE.Line;

interface PlanetProps {
  /** Planet data from planets.ts */
  data: CelestialBodyData;
  /** Visual scale multiplier for planet size (for "visual scale" mode) */
  visualScale?: number;
  /** True scale mode - uses actual physical radii */
  trueScale?: boolean;
  /** Show orbit path */
  showOrbit?: boolean;
  /** Orbit line color */
  orbitColor?: string;
  /** Orbit line opacity */
  orbitOpacity?: number;
  /** Enable axial rotation */
  rotate?: boolean;
  /** Click handler for selection */
  onClick?: (data: CelestialBodyData) => void;
  /** Moons orbiting this planet */
  moons?: CelestialBodyData[];
  /** Visual scale for moons */
  moonVisualScale?: number;
}

export function Planet({
  data,
  visualScale = 1,
  trueScale = false,
  showOrbit = true,
  orbitColor,
  orbitOpacity = 0.3,
  rotate = true,
  onClick,
  moons = [],
  moonVisualScale = 1,
}: PlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRefs = useRef<THREE.Mesh[]>([]);
  const { trueScale: contextTrueScale } = useScale();
  const { onTextureLoad, onShaderLoad } = useLoading();

  // Use context trueScale if not explicitly overridden
  const effectiveTrueScale = trueScale ?? contextTrueScale;

  // Get simulation time from clock
  const julianDate = useJulianDate();

  // Calculate position using Keplerian orbital mechanics (returns physical meters)
  // Convert to visual coordinate system: 1 AU = 2000 visual units (matches camera system)
  // The AU constant is 149597870700 meters, so visual scale factor = 2000 / AU
  const AU_TO_VISUAL = 2000 / 149597870700;
  const physicalPosition = useKeplerianOrbit(data.orbital!, julianDate);

  // Convert physical position (meters) to visual units
  // In trueScale mode, use actual meters. In visual mode, convert AU to visual units.
  const position = effectiveTrueScale
    ? physicalPosition
    : physicalPosition.map(p => p * AU_TO_VISUAL) as [number, number, number];

  // Generate orbit path points for visualization (returns physical meters)
  const physicalOrbitPath = useOrbitPath(data.orbital!, 360);

  // Apply same conversion to orbit path
  const orbitPath = effectiveTrueScale
    ? physicalOrbitPath
    : physicalOrbitPath.map(p => [p[0] * AU_TO_VISUAL, p[1] * AU_TO_VISUAL, p[2] * AU_TO_VISUAL] as [number, number, number]);

  // Create orbit line geometry
  const orbitGeometry = useMemo(() => {
    if (!orbitPath || orbitPath.length === 0 || !showOrbit) return null;
    const geometry = new THREE.BufferGeometry();
    const points = orbitPath.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    geometry.setFromPoints(points);
    return geometry;
  }, [orbitPath, showOrbit]);

  // Planet geometry - use segments based on LOD
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 32, 32), []);

  // Determine radius based on scale mode
  const displayRadius = effectiveTrueScale
    ? data.physical.radius
    : data.physical.radius * visualScale;

  // For rings, scale the ring radii appropriately
  const ringScale = effectiveTrueScale ? 1 : visualScale;

  // Load textures with progress reporting and fallback
  const textureMap = useSafeTextureLoader(
    data.visual.textures?.diffuse,
    data.visual.baseColor
  );

  // Create material with planet's base color
  const material = useMemo(() => {
    const baseColor = new THREE.Color(data.visual.baseColor);
    const mat = new THREE.MeshStandardMaterial({
      map: textureMap,
      color: baseColor,
      roughness: 0.7,
      metalness: 0.1,
    });
    // Track shader compilation for the standard material
    if (onShaderLoad) onShaderLoad(`planet-${data.id}`);
    return mat;
  }, [data.visual.baseColor, textureMap, onShaderLoad]);

  // Orbit line material
  const orbitMaterial = useMemo(() => new THREE.LineBasicMaterial({
    color: new THREE.Color(orbitColor || data.visual.orbitColor || '#444466'),
    transparent: true,
    opacity: orbitOpacity,
    depthWrite: false,
  }), [orbitColor, orbitOpacity, data.visual.orbitColor]);

  // Handle click for selection
  const handlePlanetClick = useCallback(() => {
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

    // Ring rotation (if applicable)
    if (ringRefs.current.length > 0 && data.visual.rings?.rotationPeriod) {
      const angularSpeed = (2 * Math.PI) / data.visual.rings.rotationPeriod;
      ringRefs.current.forEach(ring => {
        if (ring) ring.rotation.y += angularSpeed * delta;
      });
    }
  });

  // Create rings if planet has them (with gaps for Saturn)
  const rings = useMemo(() => {
    if (!data.visual.rings) return null;

    const { innerRadius, outerRadius, color, opacity, gaps, rotationPeriod } = data.visual.rings;

    // If there are gaps, create multiple ring segments
    if (gaps && gaps.length > 0) {
      const ringSegments: React.ReactNode[] = [];
      let currentInner = innerRadius;

      // Sort gaps by start radius
      const sortedGaps = [...gaps].sort((a, b) => a.start - b.start);

      sortedGaps.forEach((gap, index) => {
        // Add ring segment before gap
        if (gap.start > currentInner) {
          const segmentGeometry = new THREE.RingGeometry(
            currentInner * ringScale,
            gap.start * ringScale,
            128,
            1
          );
          const segmentMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(color),
            transparent: true,
            opacity,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.NormalBlending,
          });
          if (onShaderLoad) onShaderLoad(`ring-${data.id}-segment-${index}`);

          const refCallback = (mesh: THREE.Mesh | null) => {
            if (mesh) ringRefs.current[index * 2] = mesh;
          };

          ringSegments.push(
            <mesh
              key={`ring-segment-${index}`}
              ref={refCallback}
              geometry={segmentGeometry}
              material={segmentMaterial}
              rotation={[-Math.PI / 2, 0, 0]}
              renderOrder={2}
            />
          );
        }

        // Add gap (as a very transparent ring or skip)
        if (gap.opacity > 0 && gap.opacity < 1) {
          const gapGeometry = new THREE.RingGeometry(
            gap.start * ringScale,
            gap.end * ringScale,
            128,
            1
          );
          const gapMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(color),
            transparent: true,
            opacity: opacity * gap.opacity,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.NormalBlending,
          });
          if (onShaderLoad) onShaderLoad(`ring-${data.id}-gap-${index}`);

          const refCallback = (mesh: THREE.Mesh | null) => {
            if (mesh) ringRefs.current[index * 2 + 1] = mesh;
          };

          ringSegments.push(
            <mesh
              key={`ring-gap-${index}`}
              ref={refCallback}
              geometry={gapGeometry}
              material={gapMaterial}
              rotation={[-Math.PI / 2, 0, 0]}
              renderOrder={2}
            />
          );
        }

        currentInner = gap.end;
      });

      // Add final segment after last gap
      if (currentInner < outerRadius) {
        const segmentGeometry = new THREE.RingGeometry(
          currentInner * ringScale,
          outerRadius * ringScale,
          128,
          1
        );
        const segmentMaterial = new THREE.MeshBasicMaterial({
          color: new THREE.Color(color),
          transparent: true,
          opacity,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.NormalBlending,
        });
        if (onShaderLoad) onShaderLoad(`ring-${data.id}-segment-final`);

        const refCallback = (mesh: THREE.Mesh | null) => {
          if (mesh) ringRefs.current[sortedGaps.length * 2] = mesh;
        };

        ringSegments.push(
          <mesh
            key={`ring-segment-final`}
            ref={refCallback}
            geometry={segmentGeometry}
            material={segmentMaterial}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={2}
          />
        );
      }

      return <group>{ringSegments}</group>;
    }

    // No gaps - single ring
    const ringGeometry = new THREE.RingGeometry(
      innerRadius * ringScale,
      outerRadius * ringScale,
      128,
      1
    );

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    if (onShaderLoad) onShaderLoad(`ring-${data.id}`);

    return (
      <mesh
        ref={(mesh) => { if (mesh) ringRefs.current[0] = mesh; }}
        geometry={ringGeometry}
        material={ringMaterial}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={2}
      />
    );
  }, [data.visual.rings, ringScale]);

  // Create moons as children
  const moonComponents = useMemo(() => {
    return moons.map((moonData) => (
      <Moon
        key={moonData.id}
        data={moonData}
        parentPosition={position}
        visualScale={moonVisualScale}
        trueScale={effectiveTrueScale}
        showOrbit={showOrbit}
        rotate={rotate}
        onClick={onClick}
      />
    ));
  }, [moons, position, moonVisualScale, effectiveTrueScale, showOrbit, rotate, onClick]);

  return (
    <group position={position as any}>
      {/* Orbit path visualization */}
      {showOrbit && orbitGeometry && (
        <primitive
          object={useMemo(() => new Line(orbitGeometry, orbitMaterial), [orbitGeometry, orbitMaterial])}
          renderOrder={-1}
        />
      )}

      {/* Planet sphere */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        scale={[displayRadius, displayRadius, displayRadius]}
        rotation={[-data.physical.axialTilt, 0, 0]}
        castShadow
        receiveShadow
        onClick={(e) => { e.stopPropagation(); handlePlanetClick(); }}
        name={data.id}
      />

      {/* Rings (if applicable) - Saturn, Uranus, Neptune */}
      {rings}

      {/* Moons orbiting this planet */}
      {moonComponents}
    </group>
  );
}