import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { KUIPER_BELT_INNER, KUIPER_BELT_OUTER, KUIPER_COUNT, AU_TO_VISUAL } from '@/engine/Constants';
import { useScale } from '@/context/ScaleContext';

/**
 * Kuiper Belt component using InstancedMesh for performance
 * Renders ~5,000 small icy bodies beyond Neptune
 */
export function KuiperBelt() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { trueScale } = useScale();

  // Positions are computed in meters; convert to scene units unless in true-scale mode
  const posScale = trueScale ? 1 : AU_TO_VISUAL;

  // Create KBO geometry (slightly larger, more irregular)
  const geometry = useMemo(() => {
    return new THREE.IcosahedronGeometry(1, 0); // Very low poly
  }, []);

  // Material for KBOs - icy, lighter color
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: 0x8b8b8b, // Lighter gray for icy bodies
      roughness: 0.7,
      metalness: 0.05,
      flatShading: true,
    });
  }, []);

  // Generate instance data
  const instanceData = useMemo(() => {
    const positions = new Float32Array(KUIPER_COUNT * 3);
    const rotations = new Float32Array(KUIPER_COUNT * 4);
    const scales = new Float32Array(KUIPER_COUNT * 3);

    for (let i = 0; i < KUIPER_COUNT; i++) {
      // Random distance within Kuiper belt bounds (30-50 AU)
      const distance = KUIPER_BELT_INNER + Math.random() * (KUIPER_BELT_OUTER - KUIPER_BELT_INNER);

      // Random orbital elements - Kuiper belt objects have higher eccentricity/inclination
      const meanAnomaly = Math.random() * Math.PI * 2;

      // Initial position
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

      // Random scale (10km - 500km radius, scaled for visualization)
      // KBOs can be quite large (Pluto is ~1188km)
      const baseScale = 10000 + Math.random() * 490000; // 10km - 500km
      const rockScale = trueScale ? 1 : 1e-5; // Exaggerated so the belt is visible as small bodies
      const scale = baseScale * rockScale;
      scales[i * 3] = scale;
      scales[i * 3 + 1] = scale * (0.6 + Math.random() * 0.4);
      scales[i * 3 + 2] = scale * (0.6 + Math.random() * 0.4);
    }

    return { positions, rotations, scales };
  }, [trueScale]);

  // Initialize InstancedMesh
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const dummy = new THREE.Object3D();
    const { positions, rotations, scales } = instanceData;

    for (let i = 0; i < KUIPER_COUNT; i++) {
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

  // Animation - orbit the KBOs
  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const time = state.clock.getElapsedTime();
    const { positions } = instanceData;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < KUIPER_COUNT; i++) {
      const x = positions[i * 3];
      const z = positions[i * 3 + 2];
      const distance = Math.sqrt(x * x + z * z);

      // Orbital period at 40 AU ~ 250 years (Kepler's 3rd law)
      const periodAt1AU = 1; // 1 year at 1 AU
      const period = periodAt1AU * Math.pow(distance / KUIPER_BELT_INNER, 1.5);

      // Angular speed
      const angularSpeed = (2 * Math.PI) / (period * 365.25 * 86400) * 1e7;

      const angle = time * angularSpeed * (0.7 + Math.sin(i * 1.1) * 0.3);

      // Higher eccentricity and inclination for KBOs
      const ecc = 0.1 + Math.sin(i * 1.7) * 0.15;
      const inc = (Math.sin(i * 0.9) - 0.5) * 0.5; // Up to ~15 degrees

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
      args={[geometry, material, KUIPER_COUNT]}
      frustumCulled={false}
    />
  );
}