import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CelestialBodyData } from '../../types/orbitalElements';
import { useLoading } from '@/components/UI/LoadingScreen';
import { useSafeTextureLoader } from '@/hooks/useTextureLoader';
import { createSunMaterial, createCoronaShaderMaterial } from '@/shaders/SunShader';
import { useSimulationPlaying } from '@/hooks/useSimulationClock';

interface SunProps {
  onClick: (object: {
    id: string;
    name: string;
    type: string;
    position: THREE.Vector3;
    data: CelestialBodyData;
  }) => void;
  radius?: number;
}

export function Sun({ onClick, radius = 5 }: SunProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight | null>(null);
  const { onTextureLoad, onShaderLoad } = useLoading();
  const isPlaying = useSimulationPlaying();

  // Load sun texture with progress reporting and fallback
  const texture = useSafeTextureLoader('/textures/sun_diffuse.jpg', '#fff5e6');

  // Use shader material for sun surface with animated corona
  const sunMaterial = useMemo(() => {
    const material = createSunMaterial(texture);
    // Track shader compilation
    if (onShaderLoad) onShaderLoad('sun-surface');
    return material;
  }, [texture, onShaderLoad]);

  // Sun physical data
  const sunData: CelestialBodyData = {
    id: 'sun',
    name: 'Sun',
    type: 'star',
    orbital: null,
    physical: {
      mass: 1.9885e30,
      radius: 695700000,
      rotationPeriod: 25.05 * 24 * 3600, // seconds
      axialTilt: 7.25 * Math.PI / 180,
      density: 1408,
      albedo: 0,
      effectiveTemperature: 5778,
      surfaceGravity: 274,
      escapeVelocity: 617700,
    },
    parentId: null,
    childrenIds: [],
    visual: {
      baseColor: '#fff5e6',
      emissiveColor: '#fff5e6',
      emissiveIntensity: 2.0,
      textures: {
        diffuse: '/textures/sun_diffuse.jpg',
      },
      hasAtmosphere: true,
      atmosphereColor: '#ffaa00',
      atmosphereDensity: 0.15,
      lodDistances: [1e7, 5e7, 2e8, 1e9],
    },
    metadata: {},
  };

  // Geometry and materials - use high segments for smooth sphere
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 256, 256), []);
  // Corona sphere sits larger than the photosphere; the shader's halo/streamer
  // falloff drives the visible glow so the mesh size only bounds its extent.
  const coronaGeometry = useMemo(() => new THREE.SphereGeometry(1.45, 128, 128), []);

  const material = sunMaterial;

  // Procedural animated corona (no texture dependency)
  const coronaMaterial = useMemo(() => {
    const mat = createCoronaShaderMaterial();
    // Track shader compilation
    if (onShaderLoad) onShaderLoad('sun-corona');
    return mat;
  }, [onShaderLoad]);

  // Point light for solar illumination
  useEffect(() => {
    if (meshRef.current) {
      const light = new THREE.PointLight(0xfff5e6, 2.5, 0, 2);
      light.position.set(0, 0, 0);
      light.castShadow = false;
      meshRef.current.add(light);
      lightRef.current = light;
    }
    return () => {
      if (lightRef.current && meshRef.current) {
        meshRef.current.remove(lightRef.current);
        lightRef.current = null;
      }
    };
  }, []);

  // Sun surface and corona animation. Freeze when paused so the canvas settles
  // for screenshot stability checks.
  useFrame((state, delta) => {
    if (!isPlaying) return;
    if (sunMaterial && sunMaterial.uniforms && sunMaterial.uniforms.uTime) {
      sunMaterial.uniforms.uTime.value = state.clock.getElapsedTime();
    }
    if (coronaMaterial && coronaMaterial.uniforms && coronaMaterial.uniforms.uTime) {
      coronaMaterial.uniforms.uTime.value = state.clock.getElapsedTime();
    }
    if (coronaRef.current) {
      coronaRef.current.rotation.y += delta * 0.0001;
      coronaRef.current.rotation.x += delta * 0.00005;
    }
  });

  // Handle click
  const handleClick = (event: any) => {
    if (event.stopPropagation) event.stopPropagation();
    onClick({
      id: sunData.id,
      name: sunData.name,
      type: sunData.type,
      position: meshRef.current?.getWorldPosition(new THREE.Vector3()) || new THREE.Vector3(),
      data: sunData,
    });
  };

  return (
    <group>
      {/* Sun surface */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        scale={[radius, radius, radius]}
        onClick={handleClick}
        renderOrder={0}
        name="sun"
      />

      {/* Corona */}
      <mesh
        ref={coronaRef}
        geometry={coronaGeometry}
        material={coronaMaterial}
        scale={[radius, radius, radius]}
        renderOrder={1}
      />

      {/* Solar wind particle field (subtle) */}
      <SolarWindParticles radius={radius} />
    </group>
  );
}

// Solar wind particle effect
function SolarWindParticles({ radius }: { radius: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const isPlaying = useSimulationPlaying();

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = 2000;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Random position near sun surface
      const r = radius * (1 + Math.random() * 0.5);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      sizes[i] = Math.random() * 100000 + 50000; // 50-150 km
      alphas[i] = Math.random() * 0.5 + 0.1;

      // Radial velocity outward
      const speed = 300000 + Math.random() * 200000; // 300-500 km/s
      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      velocities[i * 3 + 2] = Math.cos(phi) * speed;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geo.setAttribute('initialPosition', new THREE.BufferAttribute(positions.slice(), 3));

    return geo;
  }, [radius]);

  const material = useMemo(() => new THREE.PointsMaterial({
    color: 0xffcc00,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    size: 1,
  }), []);

  useFrame((_state, delta) => {
    if (!pointsRef.current) return;
    if (!isPlaying) return;
    const positions = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const velocities = pointsRef.current.geometry.getAttribute('velocity') as THREE.BufferAttribute;
    const initialPositions = pointsRef.current.geometry.getAttribute('initialPosition') as THREE.BufferAttribute;
    const alphas = pointsRef.current.geometry.getAttribute('alpha') as THREE.BufferAttribute;
    const count = positions.count;

    for (let i = 0; i < count; i++) {
      // Update position
      positions.setXYZ(
        i,
        positions.getX(i) + velocities.getX(i) * delta,
        positions.getY(i) + velocities.getY(i) * delta,
        positions.getZ(i) + velocities.getZ(i) * delta
      );

      // Fade out as particles move away
      const dist = positions.getX(i) ** 2 + positions.getY(i) ** 2 + positions.getZ(i) ** 2;
      const maxDist = (radius * 2) ** 2;
      alphas.setX(i, Math.max(0, alphas.getX(i) * (1 - dist / maxDist * 0.5)));

      // Reset if too far
      if (dist > maxDist) {
        positions.setXYZ(i, initialPositions.getX(i), initialPositions.getY(i), initialPositions.getZ(i));
        alphas.setX(i, Math.random() * 0.5 + 0.1);
      }
    }

    positions.needsUpdate = true;
    alphas.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} renderOrder={2} />;
}