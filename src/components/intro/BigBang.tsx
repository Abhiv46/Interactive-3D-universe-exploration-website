import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface BigBangProps {
  onComplete: () => void;
}

/**
 * Big Bang Phase — The singularity explosion
 * Central pulsing singularity → expanding particle shell → fade to galaxy
 * Duration: ~4 seconds
 */
export function BigBang({ onComplete }: BigBangProps) {
  const startTime = useRef(performance.now());
  const hasCompleted = useRef(false);
  const particleCount = 20000;
  const duration = 4000; // ms

  // Singularity mesh
  const singularityRef = useRef<THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>>(null);
  // Particle system
  const particlesRef = useRef<THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>>(null);

  // Create geometries and materials
  const singularityGeometry = useMemo(() => new THREE.SphereGeometry(0.5, 32, 32), []);
  const singularityMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
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
          uniform float uIntensity;
          varying float vDist;
          void main() {
            float pulse = sin(uTime * 8.0) * 0.5 + 0.5;
            float core = smoothstep(0.5, 0.0, vDist);
            float corona = smoothstep(1.0, 0.5, vDist) * pulse;
            vec3 color = mix(
              vec3(1.0, 0.9, 0.6),  // warm white core
              vec3(1.0, 0.3, 0.1),  // deep orange/red corona
              1.0 - vDist
            );
            float alpha = (core + corona * 0.5) * uIntensity;
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

  const particleGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);
    const lifetimes = new Float32Array(particleCount);
    const delays = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Spherical distribution
      const r = Math.random() * 0.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      sizes[i] = 0.5 + Math.random() * 1.5;
      // Color gradient: white -> yellow -> orange -> red
      const t = Math.random();
      if (t < 0.3) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
        colors[i * 3 + 2] = 0.6 + Math.random() * 0.2;
      } else if (t < 0.6) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.5 + Math.random() * 0.3;
        colors[i * 3 + 2] = 0.1 + Math.random() * 0.2;
      } else {
        colors[i * 3] = 0.8 + Math.random() * 0.2;
        colors[i * 3 + 1] = 0.1 + Math.random() * 0.2;
        colors[i * 3 + 2] = 0.0;
      }
      lifetimes[i] = 0.8 + Math.random() * 0.4; // 0.8-1.2 relative
      delays[i] = Math.random() * 0.3; // staggered start
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
    geo.setAttribute('delay', new THREE.BufferAttribute(delays, 1));
    return geo;
  }, [particleCount]);

  const particleMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uProgress: { value: 0 },
          uSize: { value: 2.0 },
        },
        vertexShader: /* glsl */ `
          attribute float size;
          attribute vec3 color;
          attribute float lifetime;
          attribute float delay;
          uniform float uTime;
          uniform float uProgress;
          uniform float uSize;
          varying vec3 vColor;
          varying float vAlpha;
          void main() {
            vColor = color;
            float t = uProgress - delay;
            if (t < 0.0) {
              vAlpha = 0.0;
              gl_Position = vec4(0.0, 0.0, 0.0, 0.0);
              return;
            }
            // Expansion: radius grows with progress
            float radius = t * 50.0 * lifetime;
            vec3 pos = position * radius;
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = size * uSize * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
            // Fade out near end of lifetime
            vAlpha = smoothstep(lifetime, 0.0, t) * smoothstep(0.0, 0.1, t);
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

  // Animation loop
  useFrame(({ clock }) => {
    const elapsed = (performance.now() - startTime.current) / 1000; // seconds
    const progress = Math.min(elapsed / (duration / 1000), 1);

    // Singularity pulse and fade
    if (singularityRef.current) {
      singularityRef.current.material.uniforms.uTime.value = elapsed;
      // Fade out singularity after first 1.5s
      if (progress > 0.4) {
        singularityRef.current.material.uniforms.uIntensity.value = 1.0 - (progress - 0.4) / 0.3;
      }
    }

    // Particle explosion
    if (particlesRef.current) {
      particlesRef.current.material.uniforms.uTime.value = elapsed;
      particlesRef.current.material.uniforms.uProgress.value = progress;
      // Rotate slowly for dynamic feel
      particlesRef.current.rotation.y = elapsed * 0.05;
      particlesRef.current.rotation.x = elapsed * 0.02;
    }

    // Trigger completion
    if (progress >= 1 && !hasCompleted.current) {
      hasCompleted.current = true;
      onComplete();
    }
  });

  return (
    <group>
      {/* Central singularity */}
      <mesh ref={singularityRef} geometry={singularityGeometry} material={singularityMaterial} />

      {/* Expanding particle shell */}
      <points ref={particlesRef} geometry={particleGeometry} material={particleMaterial} />
    </group>
  );
}

BigBang.displayName = 'BigBang';