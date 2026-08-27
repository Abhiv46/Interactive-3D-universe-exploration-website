import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { generateAsteroidField } from '../../data/asteroids';
import { calculatePosition } from '../../engine/KeplerianOrbit';
import { OrbitalElements } from '../../types/orbitalElements';
import { ASTEROID_BELT } from '../../data/asteroids';

interface AsteroidBeltProps {
  julianDate: number;
  count?: number;
}

function getAsteroidColor(index: number): THREE.Color {
  const types = [
    new THREE.Color(0x887766), // C-type (carbonaceous)
    new THREE.Color(0x998877), // S-type (silicaceous)
    new THREE.Color(0x776655), // M-type (metallic)
    new THREE.Color(0x888888), // X-type - light gray
  ];
  return types[index % types.length];
}

export function AsteroidBelt({ julianDate, count = 50000 }: AsteroidBeltProps) {
  const pointsRef = useRef<THREE.Points>(null);
  useThree();

  // Generate asteroid field
  const field = useMemo(() => {
    return generateAsteroidField(count, 'main');
  }, [count]);

  // Create instanced mesh for performance
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const data = new Float32Array(count * 9); // store orbital elements for animation

    const AU = 1.496e11;

    for (let i = 0; i < count; i++) {
      const ast = field[i];

      const elements: OrbitalElements = {
        semiMajorAxis: ast.a,
        eccentricity: ast.e,
        inclination: ast.i * Math.PI / 180,
        longitudeOfAscendingNode: ast.om * Math.PI / 180,
        argumentOfPeriapsis: ast.w * Math.PI / 180,
        meanAnomalyAtEpoch: ast.M * Math.PI / 180,
        epoch: 2451545.0,
        gravitationalParameter: 1.32712440018e20,
        orbitalPeriod: 2 * Math.PI * Math.sqrt(ast.a * ast.a * ast.a / 1.32712440018e20),
      };

      const pos = calculatePosition(elements, julianDate);

      positions[i * 3] = pos[0];
      positions[i * 3 + 1] = pos[1];
      positions[i * 3 + 2] = pos[2];

      // Color based on spectral type (simplified)
      const color = getAsteroidColor(i);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = ast.size;

      // Store orbital elements for animation
      data[i * 9 + 0] = ast.a / AU; // semi-major axis in AU (for shader use)
      data[i * 9 + 1] = ast.e;
      data[i * 9 + 2] = ast.i;
      data[i * 9 + 3] = ast.om;
      data[i * 9 + 4] = ast.w;
      data[i * 9 + 5] = ast.M;
      data[i * 9 + 6] = 0; // reserved
      data[i * 9 + 7] = 0;
      data[i * 9 + 8] = 0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('orbitalData', new THREE.BufferAttribute(data, 9));

    return geo;
  }, [field, julianDate, count]);

  const material = useMemo(() => new THREE.PointsMaterial({
    color: new THREE.Color(0x888888),
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.6,
    size: 1,
    vertexColors: true,
    blending: THREE.NormalBlending,
    depthWrite: false,
  }), []);

  // Animate asteroids (update positions based on time)
  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    const positions = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const orbitalData = pointsRef.current.geometry.getAttribute('orbitalData') as THREE.BufferAttribute;
    const count = positions.count;

    // Update positions (simplified - just update on time change)
    // Full orbital propagation would be expensive for 50k objects
    const timeDelta = delta * state.clock.elapsedTime * 0; // Disable for performance, update on epoch change

    if (timeDelta !== 0) {
      for (let i = 0; i < count; i++) {
        const a = orbitalData.getX(i * 9) * 1.496e11;
        const e = orbitalData.getX(i * 9 + 1);
        const i_ = orbitalData.getX(i * 9 + 2);
        const om = orbitalData.getX(i * 9 + 3);
        const w = orbitalData.getX(i * 9 + 4);
        const M = orbitalData.getX(i * 9 + 5);

        const elements: OrbitalElements = {
          semiMajorAxis: a,
          eccentricity: e,
          inclination: i_,
          longitudeOfAscendingNode: om,
          argumentOfPeriapsis: w,
          meanAnomalyAtEpoch: M,
          epoch: 2451545.0,
          gravitationalParameter: 1.32712440018e20,
          orbitalPeriod: 2 * Math.PI * Math.sqrt(a * a * a / 1.32712440018e20),
        };

        const pos = calculatePosition(elements, julianDate + timeDelta);

        positions.setXYZ(i, pos[0], pos[1], pos[2]);
      }
      positions.needsUpdate = true;
    }
  });

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      renderOrder={2}
      frustumCulled={false}
    />
  );
}

// Belt statistics for display
export const ASTEROID_BELT_STATS = {
  ...ASTEROID_BELT,
  visibleCount: (count: number) => count,
};