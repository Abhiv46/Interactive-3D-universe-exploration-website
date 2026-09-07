import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface SolarSystemFormationProps {
  onComplete: () => void;
}

/**
 * Solar System Formation Phase — Protoplanetary disk → accretion → planets
 * Duration: ~5 seconds
 */
export function SolarSystemFormation({ onComplete }: SolarSystemFormationProps) {
  const startTime = useRef(performance.now());
  const diskParticleCount = 30000;
  const planetCount = 8;
  const duration = 5000; // ms

  const diskRef = useRef<THREE.Points>(null);
  const planetsRef = useRef<THREE.Group>(null);
  const sunRef = useRef<THREE.Mesh>(null);

  // Planet data: [semi-major axis (AU), size relative, color, formation delay]
  const planetData = useMemo(() => [
    { a: 0.39, size: 0.38, color: new THREE.Color(0.7, 0.6, 0.5), delay: 0.6 }, // Mercury
    { a: 0.72, size: 0.95, color: new THREE.Color(0.9, 0.7, 0.5), delay: 0.65 }, // Venus
    { a: 1.0, size: 1.0, color: new THREE.Color(0.3, 0.5, 0.9), delay: 0.7 },   // Earth
    { a: 1.52, size: 0.53, color: new THREE.Color(0.8, 0.4, 0.2), delay: 0.75 }, // Mars
    { a: 5.2, size: 11.2, color: new THREE.Color(0.8, 0.7, 0.5), delay: 0.5 },   // Jupiter
    { a: 9.58, size: 9.45, color: new THREE.Color(0.9, 0.8, 0.6), delay: 0.55 }, // Saturn
    { a: 19.2, size: 4.0, color: new THREE.Color(0.5, 0.7, 0.8), delay: 0.8 },   // Uranus
    { a: 30.1, size: 3.88, color: new THREE.Color(0.4, 0.5, 0.7), delay: 0.85 }, // Neptune
  ], []);

  // Protoplanetary disk particles
  const diskGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(diskParticleCount * 3);
    const sizes = new Float32Array(diskParticleCount);
    const colors = new Float32Array(diskParticleCount * 3);
    const radii = new Float32Array(diskParticleCount);
    const thetas = new Float32Array(diskParticleCount);
    const gaps = new Float32Array(diskParticleCount); // gap membership

    for (let i = 0; i < diskParticleCount; i++) {
      // Surface density ~ r^-1, so uniform in log(r)
      const logRmin = Math.log(0.2);
      const logRmax = Math.log(40);
      const r = Math.exp(logRmin + Math.random() * (logRmax - logRmin));
      const theta = Math.random() * Math.PI * 2;

      radii[i] = r;
      thetas[i] = theta;

      positions[i * 3] = r * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(theta);
      positions[i * 3 + 2] = (Math.random() - 0.5) * Math.max(0.5, r * 0.05); // flaring disk

      sizes[i] = 0.2 + Math.random() * 0.5;

      // Dust/gas colors - cooler further out
      const temp = Math.max(0, 1.0 - r / 40);
      colors[i * 3] = 0.4 + temp * 0.4;     // R
      colors[i * 3 + 1] = 0.3 + temp * 0.3; // G
      colors[i * 3 + 2] = 0.6 + (1 - temp) * 0.3; // B

      // Assign gap (planet clearing)
      let gap = -1;
      for (let p = 0; p < planetData.length; p++) {
        const pd = planetData[p];
        if (Math.abs(r - pd.a * 5) < pd.size * 0.8) { // scaled orbits
          gap = p;
          break;
        }
      }
      gaps[i] = gap;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('radius', new THREE.BufferAttribute(radii, 1));
    geo.setAttribute('theta', new THREE.BufferAttribute(thetas, 1));
    geo.setAttribute('gap', new THREE.BufferAttribute(gaps, 1));
    return geo;
  }, [diskParticleCount, planetData]);

  const diskMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uProgress: { value: 0 },
          uDissipate: { value: 0 }, // disk clears as planets form
          uSize: { value: 1.5 },
        },
        vertexShader: /* glsl */ `
          attribute float size;
          attribute vec3 color;
          attribute float radius;
          attribute float theta;
          attribute float gap;
          uniform float uTime;
          uniform float uProgress;
          uniform float uDissipate;
          uniform float uSize;
          varying vec3 vColor;
          varying float vAlpha;

          void main() {
            vColor = color;

            // Keplerian rotation
            float omega = 1.0 / pow(max(radius, 0.1), 1.5);
            float currentTheta = theta + uTime * omega * 0.5;

            // Gap clearing: particles in gaps get pushed out or fade
            float gapFactor = 1.0;
            if (gap >= 0.0) {
              gapFactor = 1.0 - smoothstep(0.0, 1.0, uDissipate);
            }

            // Disk dissipates from inside out
            float dissipateFactor = 1.0 - smoothstep(0.2, 1.0, uDissipate) * smoothstep(40.0, 1.0, radius);

            float r = radius;
            float x = r * cos(currentTheta);
            float y = r * sin(currentTheta);
            float z = (Math.random() - 0.5) * max(0.5, r * 0.05) * (1.0 - uDissipate * 0.5);

            vec4 mvPosition = modelViewMatrix * vec4(x, y, z, 1.0);
            gl_PointSize = size * uSize * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;

            vAlpha = gapFactor * dissipateFactor * 0.6;
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec3 vColor;
          varying float vAlpha;
          void main() {
            float dist = length(gl_PointCoord - 0.5);
            float circle = smoothstep(0.5, 0.0, dist);
            gl_FragColor = vec4(vColor, circle * vAlpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: true,
      }),
    []
  );

  // Sun geometry
  const sunGeometry = useMemo(() => new THREE.SphereGeometry(5, 64, 64), []);
  const sunMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uForm: { value: 0 },
          uIntensity: { value: 1.0 },
        },
        vertexShader: /* glsl */ `
          varying float vDist;
          void main() {
            vDist = length(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform float uForm;
          uniform float uIntensity;
          varying float vDist;
          void main() {
            float pulse = sin(uTime * 4.0) * 0.5 + 0.5;
            float core = smoothstep(0.95, 0.0, vDist / 5.0);
            float corona = smoothstep(1.0, 0.95, vDist / 5.0) * pulse * 0.5;
            vec3 color = mix(
              vec3(1.0, 0.95, 0.7),
              vec3(1.0, 0.6, 0.2),
              1.0 - vDist / 5.0
            );
            float alpha = (core + corona) * uForm * uIntensity;
            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    []
  );

  const hasCompleted = useRef(false);

  // Planet geometries (created dynamically in useFrame)
  const planetMeshes = useRef<THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>[]>([]);
  const planetOrbitAngles = useRef<number[]>([]);

  useFrame(({ clock }) => {
    const elapsed = (performance.now() - startTime.current) / 1000;
    const progress = Math.min(elapsed / (duration / 1000), 1);

    // Disk animation
    if (diskRef.current) {
      (diskRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;
      (diskRef.current.material as THREE.ShaderMaterial).uniforms.uProgress.value = progress;
      (diskRef.current.material as THREE.ShaderMaterial).uniforms.uDissipate.value = Math.max(0, (progress - 0.3) / 0.7);
    }

    // Sun formation
    if (sunRef.current) {
      (sunRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;
      (sunRef.current.material as THREE.ShaderMaterial).uniforms.uForm.value = Math.min(progress / 0.4, 1);
      (sunRef.current.material as THREE.ShaderMaterial).uniforms.uIntensity.value = 1.0;
    }

    // Planet formation - each planet forms at its own delay
    if (planetsRef.current && planetsRef.current.children.length === 0 && progress > 0.4) {
      // Create planets
      planetData.forEach((pd, i) => {
        const scaledA = pd.a * 5; // scale for visual
        const size = pd.size * 0.3; // visual size multiplier

        const geo = new THREE.SphereGeometry(size, 32, 32);
        const mat = new THREE.MeshStandardMaterial({
          color: pd.color,
          roughness: 0.7,
          metalness: 0.1,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(scaledA, 0, 0);
        planetsRef.current!.add(mesh);
        planetMeshes.current[i] = mesh;
        planetOrbitAngles.current[i] = Math.random() * Math.PI * 2;
      });
    }

    // Animate planets
    if (planetsRef.current) {
      planetsRef.current.rotation.y = elapsed * 0.02;

      planetData.forEach((pd, i) => {
        const mesh = planetMeshes.current[i];
        if (!mesh) return;

        const delay = pd.delay;
        const formProgress = Math.max(0, Math.min(1, (progress - delay) / 0.3));

        // Scale up from 0
        mesh.scale.setScalar(formProgress);

        // Orbit
        const scaledA = pd.a * 5;
        const omega = 1.0 / Math.pow(scaledA, 1.5) * 0.5;
        planetOrbitAngles.current[i] += omega * clock.getDelta();
        mesh.position.x = scaledA * Math.cos(planetOrbitAngles.current[i]);
        mesh.position.z = scaledA * Math.sin(planetOrbitAngles.current[i]);

        // Fade in material
        if (mesh.material instanceof THREE.MeshStandardMaterial) {
          mesh.material.opacity = formProgress;
          mesh.material.transparent = formProgress < 1;
        }
      });
    }

    // Camera pulls toward inner solar system
    // This is handled by the parent IntroSequence camera animation

    if (progress >= 1 && !hasCompleted.current) {
      hasCompleted.current = true;
      onComplete();
    }
  });

  return (
    <group ref={planetsRef}>
      {/* Protoplanetary disk */}
      <points ref={diskRef} geometry={diskGeometry} material={diskMaterial} />

      {/* Forming Sun at center */}
      <mesh ref={sunRef} geometry={sunGeometry} material={sunMaterial} />

      {/* Planets are added dynamically to planetsRef group */}
    </group>
  );
}

SolarSystemFormation.displayName = 'SolarSystemFormation';