import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface GalaxyFormationProps {
  onComplete: () => void;
}

/**
 * Galaxy Formation Phase — Dark matter halo → gas collapse → spiral arms
 * Duration: ~6 seconds
 */
export function GalaxyFormation({ onComplete }: GalaxyFormationProps) {
  const startTime = useRef(performance.now());
  const hasCompleted = useRef(false);
  const particleCount = 50000;
  const duration = 6000; // ms

  const haloRef = useRef<THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>>(null);
  const diskRef = useRef<THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>>(null);
  const armsRef = useRef<THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>>(null);

  // Dark matter halo - sparse, spherical, slow rotation
  const haloGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);
    const radii = new Float32Array(particleCount);
    const thetas = new Float32Array(particleCount);
    const phis = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Spherical distribution with r^2 density falloff
      const r = Math.pow(Math.random(), 0.5) * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      radii[i] = r;
      thetas[i] = theta;
      phis[i] = phi;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      sizes[i] = 0.3 + Math.random() * 0.4;
      // Subtle bluish-white for dark matter
      const brightness = 0.3 + Math.random() * 0.4;
      colors[i * 3] = brightness * 0.6;
      colors[i * 3 + 1] = brightness * 0.8;
      colors[i * 3 + 2] = brightness;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('radius', new THREE.BufferAttribute(radii, 1));
    geo.setAttribute('theta', new THREE.BufferAttribute(thetas, 1));
    geo.setAttribute('phi', new THREE.BufferAttribute(phis, 1));
    return geo;
  }, [particleCount]);

  const haloMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uProgress: { value: 0 },
          uCollapse: { value: 0 },
          uSize: { value: 1.5 },
        },
        vertexShader: /* glsl */ `
          attribute float size;
          attribute vec3 color;
          attribute float radius;
          attribute float theta;
          attribute float phi;
          uniform float uTime;
          uniform float uProgress;
          uniform float uCollapse;
          uniform float uSize;
          varying vec3 vColor;
          varying float vAlpha;
          varying float vRadius;
          void main() {
            vColor = color;
            vRadius = radius;

            // Collapse: radius shrinks over time, particles move toward disk plane
            float collapseFactor = 1.0 - uCollapse * 0.85; // collapse to 15% of original radius
            float currentRadius = radius * collapseFactor;

            // Flatten toward disk (z -> 0)
            float z = radius * cos(phi) * (1.0 - uCollapse * 0.95);
            float r = currentRadius * sin(phi);

            // Slow rotation
            float rot = uTime * 0.02;
            float x = r * cos(theta + rot);
            float y = r * sin(theta + rot);

            vec4 mvPosition = modelViewMatrix * vec4(x, y, z, 1.0);
            gl_PointSize = size * uSize * (200.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;

            // Fade during collapse transition
            vAlpha = mix(0.6, 0.1, uCollapse);
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec3 vColor;
          varying float vAlpha;
          varying float vRadius;
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

  // Gas disk - flattened, denser, forms spiral structure
  const diskGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);
    const radii = new Float32Array(particleCount);
    const thetas = new Float32Array(particleCount);
    const armOffsets = new Float32Array(particleCount);

    const arms = 4; // 4 spiral arms
    for (let i = 0; i < particleCount; i++) {
      // Disk distribution with exponential falloff
      const r = -Math.log(Math.random()) * 15; // scale length ~15
      const theta = Math.random() * Math.PI * 2;

      radii[i] = r;
      thetas[i] = theta;

      positions[i * 3] = r * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(theta);
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2; // thin disk

      sizes[i] = 0.4 + Math.random() * 0.6;
      // Warm gas colors
      const t = Math.random();
      if (t < 0.4) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.6 + Math.random() * 0.3;
        colors[i * 3 + 2] = 0.2 + Math.random() * 0.2;
      } else if (t < 0.7) {
        colors[i * 3] = 0.8 + Math.random() * 0.2;
        colors[i * 3 + 1] = 0.4 + Math.random() * 0.2;
        colors[i * 3 + 2] = 0.1 + Math.random() * 0.1;
      } else {
        colors[i * 3] = 0.4 + Math.random() * 0.2;
        colors[i * 3 + 1] = 0.6 + Math.random() * 0.3;
        colors[i * 3 + 2] = 1.0;
      }

      // Assign to spiral arm
      armOffsets[i] = Math.floor(Math.random() * arms) * (Math.PI * 2 / arms);
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('radius', new THREE.BufferAttribute(radii, 1));
    geo.setAttribute('theta', new THREE.BufferAttribute(thetas, 1));
    geo.setAttribute('armOffset', new THREE.BufferAttribute(armOffsets, 1));
    return geo;
  }, [particleCount]);

  const diskMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uProgress: { value: 0 },
          uForm: { value: 0 }, // 0 = dispersed, 1 = formed spiral
          uSize: { value: 2.0 },
        },
        vertexShader: /* glsl */ `
          attribute float size;
          attribute vec3 color;
          attribute float radius;
          attribute float theta;
          attribute float armOffset;
          uniform float uTime;
          uniform float uProgress;
          uniform float uForm;
          uniform float uSize;
          varying vec3 vColor;
          varying float vAlpha;

          // Spiral arm function
          float spiralArm(float r, float theta, float armOffset) {
            // Logarithmic spiral: theta = a * log(r) + b
            float a = 0.3; // tightness
            float b = armOffset;
            float armTheta = a * log(max(r, 0.1)) + b;
            float diff = abs(theta - armTheta);
            diff = min(diff, 2.0 * 3.14159 - diff);
            return smoothstep(0.8, 0.0, diff); // arm width
          }

          void main() {
            vColor = color;

            // Spiral formation
            float rot = uTime * 0.015;
            float currentTheta = theta + rot;

            // Winding up spiral arms over time
            float armStrength = smoothstep(0.3, 0.8, uForm);
            float inArm = spiralArm(radius, currentTheta, armOffset);

            // Particles not in arms fall toward center or disperse
            float r = radius * mix(1.0, 0.7, uForm * inArm);
            float z = mix(0.0, 0.0, uForm); // stay in plane

            float x = r * cos(currentTheta);
            float y = r * sin(currentTheta);

            vec4 mvPosition = modelViewMatrix * vec4(x, y, z, 1.0);
            gl_PointSize = size * uSize * (200.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;

            // Alpha: fade in as spiral forms
            vAlpha = mix(0.0, 0.8, uForm) * mix(0.3, 1.0, inArm);
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

  // Bright star-forming regions along arms
  const armGeometry = useMemo(() => {
    const count = 5000;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const radii = new Float32Array(count);
    const thetas = new Float32Array(count);
    const armOffsets = new Float32Array(count);

    const arms = 4;
    for (let i = 0; i < count; i++) {
      const r = 5 + Math.random() * 25;
      const baseTheta = Math.random() * Math.PI * 2;
      const arm = Math.floor(Math.random() * arms);
      const armOffset = arm * (Math.PI * 2 / arms);
      // Place on spiral arm with small scatter
      const a = 0.3;
      const theta = a * Math.log(r) + armOffset + (Math.random() - 0.5) * 0.3;

      radii[i] = r;
      thetas[i] = baseTheta;
      armOffsets[i] = armOffset;

      positions[i * 3] = r * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(theta);
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;

      sizes[i] = 1.0 + Math.random() * 2.0;
      // Bright blue-white star-forming regions
      colors[i * 3] = 0.7 + Math.random() * 0.3;
      colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
      colors[i * 3 + 2] = 1.0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('radius', new THREE.BufferAttribute(radii, 1));
    geo.setAttribute('theta', new THREE.BufferAttribute(thetas, 1));
    geo.setAttribute('armOffset', new THREE.BufferAttribute(armOffsets, 1));
    return geo;
  }, []);

  const armMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uProgress: { value: 0 },
          uForm: { value: 0 },
          uSize: { value: 3.0 },
        },
        vertexShader: /* glsl */ `
          attribute float size;
          attribute vec3 color;
          attribute float radius;
          attribute float theta;
          attribute float armOffset;
          uniform float uTime;
          uniform float uProgress;
          uniform float uForm;
          uniform float uSize;
          varying vec3 vColor;
          varying float vAlpha;

          float spiralArm(float r, float theta, float armOffset) {
            float a = 0.3;
            float b = armOffset;
            float armTheta = a * log(max(r, 0.1)) + b;
            float diff = abs(theta - armTheta);
            diff = min(diff, 2.0 * 3.14159 - diff);
            return smoothstep(0.5, 0.0, diff);
          }

          void main() {
            vColor = color;
            float rot = uTime * 0.015;
            float currentTheta = theta + rot;

            float armStrength = smoothstep(0.4, 0.9, uForm);
            float inArm = spiralArm(radius, currentTheta, armOffset);

            float r = radius;
            float x = r * cos(currentTheta);
            float y = r * sin(currentTheta);
            float z = 0.0;

            vec4 mvPosition = modelViewMatrix * vec4(x, y, z, 1.0);
            gl_PointSize = size * uSize * (200.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;

            vAlpha = mix(0.0, 1.0, uForm) * inArm;
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec3 vColor;
          varying float vAlpha;
          void main() {
            float dist = length(gl_PointCoord - 0.5);
            float circle = smoothstep(0.5, 0.0, dist);
            // Core glow
            float core = smoothstep(0.3, 0.0, dist);
            gl_FragColor = vec4(vColor, circle * vAlpha) + vec4(vColor, core * vAlpha * 0.5);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: true,
      }),
    []
  );

  useFrame(({ clock }) => {
    const elapsed = (performance.now() - startTime.current) / 1000;
    const progress = Math.min(elapsed / (duration / 1000), 1);

    // Phase 1 (0-0.3): Dark matter halo visible, starting to collapse
    // Phase 2 (0.3-0.7): Gas disk forms, spiral arms wind up
    // Phase 3 (0.7-1.0): Spiral arms brighten, galaxy complete

    const collapseProgress = Math.min(progress / 0.3, 1);
    const formProgress = Math.max(0, (progress - 0.3) / 0.4);
    const brightenProgress = Math.max(0, (progress - 0.7) / 0.3);

    if (haloRef.current) {
      haloRef.current.material.uniforms.uTime.value = elapsed;
      haloRef.current.material.uniforms.uProgress.value = progress;
      haloRef.current.material.uniforms.uCollapse.value = collapseProgress;
    }

    if (diskRef.current) {
      diskRef.current.material.uniforms.uTime.value = elapsed;
      diskRef.current.material.uniforms.uProgress.value = progress;
      diskRef.current.material.uniforms.uForm.value = formProgress;
    }

    if (armsRef.current) {
      armsRef.current.material.uniforms.uTime.value = elapsed;
      armsRef.current.material.uniforms.uProgress.value = progress;
      armsRef.current.material.uniforms.uForm.value = formProgress;
    }

    if (progress >= 1 && !hasCompleted.current) {
      hasCompleted.current = true;
      onComplete();
    }
  });

  return (
    <group>
      {/* Dark matter halo */}
      <points ref={haloRef} geometry={haloGeometry} material={haloMaterial} />

      {/* Gas disk forming spiral */}
      <points ref={diskRef} geometry={diskGeometry} material={diskMaterial} />

      {/* Bright star-forming regions */}
      <points ref={armsRef} geometry={armGeometry} material={armMaterial} />
    </group>
  );
}

GalaxyFormation.displayName = 'GalaxyFormation';