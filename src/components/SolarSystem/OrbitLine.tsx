import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitalElements } from '../../types/orbitalElements';
import { generateOrbitPath, calculatePosition } from '../../engine/KeplerianOrbit';

// Use Line from three to avoid SVG <line> conflict
const Line = THREE.Line;

interface OrbitLineProps {
  elements: OrbitalElements;
  color?: string;
  opacity?: number;
  lineWidth?: number;
  showPeriapsis?: boolean;
  showApoapsis?: boolean;
}

export function OrbitLine({
  elements,
  color = '#444466',
  opacity = 0.3,
  lineWidth = 1,
  showPeriapsis = false,
  showApoapsis = false,
}: OrbitLineProps) {
  const lineRef = useRef<THREE.Line<THREE.BufferGeometry, THREE.Material | THREE.Material[]>>(null);
  const periapsisRef = useRef<THREE.Mesh>(null);
  const apoapsisRef = useRef<THREE.Mesh>(null);

  // Generate orbit path points
  const points = useMemo(() => {
    return generateOrbitPath(elements, 360); // 360 segments
  }, [elements]);

  // Geometry
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(points.length * 3);
    points.forEach((p, i) => {
      positions[i * 3] = p[0];
      positions[i * 3 + 1] = p[1];
      positions[i * 3 + 2] = p[2];
    });
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [points]);

  // Material
  const material = useMemo(() => new THREE.LineBasicMaterial({
    color: new THREE.Color(color),
    opacity,
    transparent: opacity < 1,
    linewidth: lineWidth,
    depthWrite: false,
  }), [color, opacity, lineWidth]);

  // Periapsis marker
  const periapsisGeometry = useMemo(() => new THREE.SphereGeometry(1, 8, 8), []);
  const periapsisMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    opacity: 0.8,
    transparent: true,
    depthWrite: false,
  }), [color]);

  // Apoapsis marker
  const apoapsisGeometry = useMemo(() => new THREE.SphereGeometry(1, 8, 8), []);
  const apoapsisMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    opacity: 0.5,
    transparent: true,
    depthWrite: false,
  }), [color]);

  // Calculate periapsis/apoapsis positions
  const { periapsis, apoapsis } = useMemo(() => {
    const a = elements.semiMajorAxis;
    const e = elements.eccentricity;
    const r_p = a * (1 - e);
    const r_a = a * (1 + e);
    return { periapsis: r_p, apoapsis: r_a };
  }, [elements]);

  // Update orbit line visibility based on camera distance
  useFrame(({ camera }) => {
    if (lineRef.current) {
      const distance = camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
      // Fade out orbit lines when very close or very far
      if (distance < 1e7) {
        (lineRef.current.material as THREE.Material).opacity = Math.max(0, opacity * (distance / 1e7));
      } else if (distance > 1e12) {
        (lineRef.current.material as THREE.Material).opacity = Math.max(0, opacity * (1e12 / distance));
      } else {
        (lineRef.current.material as THREE.Material).opacity = opacity;
      }
    }
  });

  return (
    <group>
      {/* Orbit path */}
      <primitive
        ref={lineRef}
        object={useMemo(() => new Line(geometry, material), [geometry, material])}
        renderOrder={1}
      />

      {/* Periapsis marker */}
      {showPeriapsis && (
        <mesh
          ref={periapsisRef}
          geometry={periapsisGeometry}
          material={periapsisMaterial}
          position={[periapsis, 0, 0]}
          scale={[1e6, 1e6, 1e6]}
          renderOrder={2}
        />
      )}

      {/* Apoapsis marker */}
      {showApoapsis && (
        <mesh
          ref={apoapsisRef}
          geometry={apoapsisGeometry}
          material={apoapsisMaterial}
          position={[-apoapsis, 0, 0]}
          scale={[1e6, 1e6, 1e6]}
          renderOrder={2}
        />
      )}
    </group>
  );
}

// Orbital path for moons (relative to parent planet)
interface MoonOrbitLineProps {
  elements: OrbitalElements;
  planetElements: OrbitalElements;
  julianDate: number;
  color?: string;
  opacity?: number;
}

export function MoonOrbitLine({ elements, planetElements, julianDate, color = '#666688', opacity = 0.2 }: MoonOrbitLineProps) {
  const lineRef = useRef<THREE.Line<THREE.BufferGeometry, THREE.Material | THREE.Material[]>>(null);

  // Generate orbit path in planet's frame
  const points = useMemo(() => {
    return generateOrbitPath(elements, 180);
  }, [elements]);

  // Planet position
  const planetPosition = useMemo(() => {
    return calculatePosition(planetElements, julianDate);
  }, [planetElements, julianDate]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(points.length * 3);
    points.forEach((p, i) => {
      positions[i * 3] = p[0] + planetPosition[0];
      positions[i * 3 + 1] = p[1] + planetPosition[1];
      positions[i * 3 + 2] = p[2] + planetPosition[2];
    });
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [points, planetPosition]);

  const material = useMemo(() => new THREE.LineBasicMaterial({
    color: new THREE.Color(color),
    opacity,
    transparent: true,
    depthWrite: false,
  }), [color, opacity]);

  return (
    <primitive
      ref={lineRef}
      object={useMemo(() => new Line(geometry, material), [geometry, material])}
      renderOrder={1}
    />
  );
}