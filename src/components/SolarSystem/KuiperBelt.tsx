import { useRef, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { generateAsteroidField } from '../../data/asteroids';
import { calculatePosition } from '../../engine/KeplerianOrbit';
import { OrbitalElements } from '../../types/orbitalElements';

interface KuiperBeltProps {
  julianDate: number;
  count?: number;
}

function getKBOColor(index: number): THREE.Color {
  const types = [
    new THREE.Color(0x6688aa), // icy
    new THREE.Color(0x88aacc), // methane ice
    new THREE.Color(0x99bbdd), // water ice
  ];
  return types[index % types.length];
}

export function KuiperBelt({ julianDate, count = 10000 }: KuiperBeltProps) {
  const pointsRef = useRef<THREE.Points>(null);
  useThree();

  // Generate Kuiper belt field
  const field = useMemo(() => {
    return generateAsteroidField(count, 'kuiper');
  }, [count]);

  // Create instanced mesh
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const data = new Float32Array(count * 9);

    const AU = 1.496e11;

    for (let i = 0; i < count; i++) {
      const kbo = field[i];

      const elements: OrbitalElements = {
        semiMajorAxis: kbo.a,
        eccentricity: kbo.e,
        inclination: kbo.i * Math.PI / 180,
        longitudeOfAscendingNode: kbo.om * Math.PI / 180,
        argumentOfPeriapsis: kbo.w * Math.PI / 180,
        meanAnomalyAtEpoch: kbo.M * Math.PI / 180,
        epoch: 2451545.0,
        gravitationalParameter: 1.32712440018e20,
        orbitalPeriod: 2 * Math.PI * Math.sqrt(kbo.a * kbo.a * kbo.a / 1.32712440018e20),
      };

      const pos = calculatePosition(elements, julianDate);

      positions[i * 3] = pos[0];
      positions[i * 3 + 1] = pos[1];
      positions[i * 3 + 2] = pos[2];

      // Kuiper belt objects are icier - bluer colors
      const color = getKBOColor(i);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = kbo.size;

      data[i * 9 + 0] = kbo.a / AU;
      data[i * 9 + 1] = kbo.e;
      data[i * 9 + 2] = kbo.i;
      data[i * 9 + 3] = kbo.om;
      data[i * 9 + 4] = kbo.w;
      data[i * 9 + 5] = kbo.M;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('orbitalData', new THREE.BufferAttribute(data, 9));

    return geo;
  }, [field, julianDate, count]);

  const material = useMemo(() => new THREE.PointsMaterial({
    color: new THREE.Color(0x88aaff),
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.4,
    size: 1,
    vertexColors: true,
    blending: THREE.NormalBlending,
    depthWrite: false,
  }), []);

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      renderOrder={1}
      frustumCulled={false}
    />
  );
}