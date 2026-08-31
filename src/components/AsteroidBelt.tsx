import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ASTEROID_BELT_INNER, ASTEROID_BELT_OUTER, ASTEROID_COUNT, AU_TO_VISUAL } from '@/engine/Constants';
import { useScale } from '@/context/ScaleContext';

/**
 * Asteroid Belt component using InstancedMesh for performance
 * Renders ~8,000 small rocks between Mars and Jupiter
 */
export function AsteroidBelt() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { trueScale } = useScale();

  // Positions are computed in meters; convert to scene units unless in true-scale mode
  const posScale = trueScale ? 1 : AU_TO_VISUAL;

  // Create asteroid geometry (small irregular shapes)
  const geometry = useMemo(() => {
    // Use a simple low-poly sphere for each asteroid
    // We'll vary the scale per instance to create variety
    return new THREE.IcosahedronGeometry(1, 0); // Very low poly (20 faces)
  }, []);

  // Material for asteroids - dark rocky color
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: 0x4a4540, // Dark rocky brown-gray
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true,
    });
  }, []);

  // Generate instance data (positions, rotations, scales)
  const instanceData = useMemo(() => {
    const positions = new Float32Array(ASTEROID_COUNT * 3);
    const rotations = new Float32Array(ASTEROID_COUNT * 4); // quaternion
    const scales = new Float32Array(ASTEROID_COUNT * 3);

    for (let i = 0; i < ASTEROID_COUNT; i++) {
      // Random distance within belt bounds (in meters)
      const distance = ASTEROID_BELT_INNER + Math.random() * (ASTEROID_BELT_OUTER - ASTEROID_BELT_INNER);

      // Random orbital elements for each asteroid
      const eccentricity = 0.05 + Math.random() * 0.2; // 0.05 - 0.25
      const inclination = (Math.random() - 0.5) * 0.5; // -0.25 to 0.25 rad (~14 deg)
      const longitudeOfAscendingNode = Math.random() * Math.PI * 2;
      const argumentOfPeriapsis = Math.random() * Math.PI * 2;
      const meanAnomaly = Math.random() * Math.PI * 2;

      // Store orbital elements for animation
      // We'll compute positions in useFrame based on time

      // Initial position (we'll animate in useFrame)
      positions[i * 3] = distance * Math.cos(meanAnomaly);
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = distance * Math.sin(meanAnomaly);

      // Random rotation
      const q = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        )
      );
      rotations[i * 4] = q.x;
      rotations[i * 4 + 1] = q.y;
      rotations[i * 4 + 2] = q.z;
      rotations[i * 4 + 3] = q.w;

      // Random scale (100m - 5km radius, scaled for visualization)
      const baseScale = 100 + Math.random() * 4900; // meters
      const rockScale = trueScale ? 1 : 2e-4; // Exaggerated so the belt is visible as rocks
      const scale = baseScale * rockScale;
      scales[i * 3] = scale;
      scales[i * 3 + 1] = scale * (0.5 + Math.random() * 0.5); // Slightly irregular
      scales[i * 3 + 2] = scale * (0.5 + Math.random() * 0.5);
    }

    return { positions, rotations, scales };
  }, [trueScale]);

  // Initialize InstancedMesh
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // Set instance matrices
    const dummy = new THREE.Object3D();
    const { positions, rotations, scales } = instanceData;

    for (let i = 0; i < ASTEROID_COUNT; i++) {
      dummy.position.set(
        positions[i * 3] * posScale,
        positions[i * 3 + 1] * posScale,
        positions[i * 3 + 2] * posScale
      );
      dummy.quaternion.set(
        rotations[i * 4],
        rotations[i * 4 + 1],
        rotations[i * 4 + 2],
        rotations[i * 4 + 3]
      );
      dummy.scale.set(
        scales[i * 3],
        scales[i * 3 + 1],
        scales[i * 3 + 2]
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [instanceData, trueScale, posScale]);

  // Animation - orbit the asteroids
  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const time = state.clock.getElapsedTime();
    const { positions } = instanceData;
    const dummy = new THREE.Object3D();

    // Each asteroid orbits at its own rate based on distance (Kepler's 3rd law approximation)
    for (let i = 0; i < ASTEROID_COUNT; i++) {
      // Extract orbital parameters from initial position
      const x = positions[i * 3];
      const z = positions[i * 3 + 2];
      const distance = Math.sqrt(x * x + z * z);

      // Orbital period proportional to distance^(3/2) - simplified Kepler's 3rd law
      // At 2.7 AU (middle of belt), period ~4.4 years
      // At 1x time speed, we want visible motion
      const periodAt1AU = 1; // 1 year at 1 AU
      const period = periodAt1AU * Math.pow(distance / ASTEROID_BELT_INNER, 1.5);

      // Angular speed (radians per second of simulation time)
      // Using simulation delta which is already scaled by time speed
      const angularSpeed = (2 * Math.PI) / (period * 365.25 * 86400) * 1e7; // Scale for visualization

      const angle = time * angularSpeed * (0.8 + Math.sin(i) * 0.4); // Vary slightly per asteroid

      // Add small eccentricity and inclination
      const ecc = 0.05 + Math.sin(i * 1.3) * 0.1;
      const inc = (Math.sin(i * 0.7) - 0.5) * 0.3;

      const r = distance * (1 - ecc * Math.cos(angle));
      const xPos = r * Math.cos(angle);
      const yPos = r * Math.sin(angle) * Math.sin(inc);
      const zPos = r * Math.sin(angle) * Math.cos(inc);

      dummy.position.set(xPos * posScale, yPos * posScale, zPos * posScale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, ASTEROID_COUNT]}
      frustumCulled={false}
    />
  );
}