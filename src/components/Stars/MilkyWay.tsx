import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MILKY_WAY_STRUCTURE } from '../../data/galaxies';
import { useLOD, GALAXY_LOD_CONFIG } from '../../hooks/useLOD';

interface MilkyWayProps {
  enabled?: boolean;
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  visible?: boolean;
  opacity?: number;
}

export function MilkyWay({ enabled = true, quality = 'high', visible = true, opacity = 1 }: MilkyWayProps) {
  const meshRef = useRef<THREE.Points>(null);
  const dustRef = useRef<THREE.Points>(null);
  const { camera } = useThree();

  // LOD for galaxy - use camera distance from galactic center (Sun position)
  const lodState = useLOD(GALAXY_LOD_CONFIG, camera.position, new THREE.Vector3(0, 0, 0), 0);

  // Particle counts based on quality AND LOD
  const particleCounts = useMemo(() => {
    // Adjust particle count based on LOD detail level
    let qualityMultiplier = 1;
    switch (lodState.currentDetail) {
      case 'high': qualityMultiplier = 1; break;
      case 'billboard': qualityMultiplier = 0.1; break;
      default: qualityMultiplier = 0.01;
    }

    const baseStars = quality === 'low' ? 50000 : quality === 'medium' ? 200000 : 500000;
    const baseDust = quality === 'low' ? 10000 : quality === 'medium' ? 50000 : 100000;

    return {
      stars: Math.floor(baseStars * qualityMultiplier),
      dust: Math.floor(baseDust * qualityMultiplier),
    };
  }, [quality, lodState.currentDetail]);

  // Generate Milky Way star field (procedural)
  const starGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const { stars } = particleCounts;
    const positions = new Float32Array(stars * 3);
    const colors = new Float32Array(stars * 3);
    const sizes = new Float32Array(stars);
    const densities = new Float32Array(stars);

    const structure = MILKY_WAY_STRUCTURE;
    const sunPos = structure.sunPosition;

    // Seed for deterministic generation
    let seed = 42;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    // Generate stars in galactic coordinates
    for (let i = 0; i < stars; i++) {
      // Choose component: thin disk, thick disk, bulge, arms, halo
      const component = rand();
      let x: number, y: number, z: number;
      let density = 1.0;

      if (component < 0.5) {
        // Thin disk
        const r = sampleExponential(structure.thinDisk.scaleLength, rand);
        const theta = rand() * Math.PI * 2;
        const h = sampleGaussian(0, structure.thinDisk.scaleHeight, rand);
        x = r * Math.cos(theta);
        y = r * Math.sin(theta);
        z = h;
        density = structure.thinDisk.density;
      } else if (component < 0.65) {
        // Thick disk
        const r = sampleExponential(structure.thickDisk.scaleLength, rand);
        const theta = rand() * Math.PI * 2;
        const h = sampleGaussian(0, structure.thickDisk.scaleHeight, rand);
        x = r * Math.cos(theta);
        y = r * Math.sin(theta);
        z = h;
        density = structure.thickDisk.density;
      } else if (component < 0.75) {
        // Bulge/bar
        const r = sampleExponential(structure.bulge.radius / 3, rand);
        const theta = rand() * Math.PI * 2;
        const h = sampleGaussian(0, structure.bulge.height, rand);
        x = r * Math.cos(theta);
        y = r * Math.sin(theta);
        z = h;
        density = structure.bulge.density * 2;
      } else if (component < 0.95) {
        // Spiral arms
        const arm = structure.spiralArms[Math.floor(rand() * structure.spiralArms.length)];
        const r = arm.startRadius + rand() * (arm.endRadius - arm.startRadius);
        const armAngle = r * Math.tan(arm.pitchAngle * Math.PI / 180) + arm.phase;
        const theta = armAngle + (rand() - 0.5) * arm.armWidth / r;
        const h = sampleGaussian(0, structure.thinDisk.scaleHeight * 0.5, rand);
        x = r * Math.cos(theta);
        y = r * Math.sin(theta);
        z = h;
        density = arm.density;
      } else {
        // Halo
        const r = Math.pow(rand(), 0.3) * structure.halo.radius;
        const theta = rand() * Math.PI * 2;
        const phi = Math.acos(2 * rand() - 1);
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
        density = structure.halo.density;
      }

      // Convert from galactic to equatorial coordinates
      // Sun position offset
      x += sunPos.radius; // Shift so Sun is at correct position

      // Convert parsecs to meters (1 pc = 3.086e16 m)
      const scale = 3.086e16;
      positions[i * 3] = x * scale;
      positions[i * 3 + 1] = y * scale;
      positions[i * 3 + 2] = z * scale;

      // Color based on stellar population (older stars in bulge/halo = redder)
      const temp = 3000 + rand() * 4000 * (component < 0.3 ? 1 : 0.5);
      const color = temperatureToColor(temp);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 1e16 * (0.5 + rand() * 1.5); // Size in meters
      densities[i] = density;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('density', new THREE.BufferAttribute(densities, 1));
    geo.computeBoundingSphere();

    return geo;
  }, [particleCounts]);

  // Dust lane geometry
  const dustGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const { dust } = particleCounts;
    const positions = new Float32Array(dust * 3);
    const colors = new Float32Array(dust * 3);
    const sizes = new Float32Array(dust);
    const opacities = new Float32Array(dust);

    const structure = MILKY_WAY_STRUCTURE;
    const sunPos = structure.sunPosition;

    let seed = 123;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    for (let i = 0; i < dust; i++) {
      // Dust concentrated in spiral arms and midplane
      const inArm = rand() < 0.7;
      let x: number, y: number, z: number;

      if (inArm) {
        const arm = structure.spiralArms[Math.floor(rand() * structure.spiralArms.length)];
        const r = arm.startRadius + rand() * (arm.endRadius - arm.startRadius);
        const armAngle = r * Math.tan(arm.pitchAngle * Math.PI / 180) + arm.phase;
        const theta = armAngle + (rand() - 0.5) * arm.armWidth / r;
        const h = sampleGaussian(0, structure.dustLanes.scaleHeight, rand);
        x = r * Math.cos(theta);
        y = r * Math.sin(theta);
        z = h;
      } else {
        // Diffuse dust
        const r = sampleExponential(structure.dustLanes.scaleLength, rand);
        const theta = rand() * Math.PI * 2;
        const h = sampleGaussian(0, structure.dustLanes.scaleHeight * 2, rand);
        x = r * Math.cos(theta);
        y = r * Math.sin(theta);
        z = h;
      }

      x += sunPos.radius;

      const scale = 3.086e16;
      positions[i * 3] = x * scale;
      positions[i * 3 + 1] = y * scale;
      positions[i * 3 + 2] = z * scale;

      // Dust color - dark brownish
      colors[i * 3] = 0.3;
      colors[i * 3 + 1] = 0.2;
      colors[i * 3 + 2] = 0.15;

      sizes[i] = 5e17 * (0.5 + rand() * 2); // Large dust clouds
      opacities[i] = 0.01 + rand() * 0.05 * structure.dustLanes.density;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
    geo.computeBoundingSphere();

    return geo;
  }, [particleCounts]);

  // Star material (additive for stars)
  const starMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uCameraPosition: { value: new THREE.Vector3() },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      uPixelRatio: { value: window.devicePixelRatio },
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      attribute float density;

      varying vec3 vColor;
      varying float vDensity;
      varying float vSize;

      uniform float uTime;
      uniform vec3 uCameraPosition;
      uniform float uPixelRatio;

      void main() {
        vColor = color;
        vDensity = density;

        float dist = length(position - uCameraPosition);
        vSize = size * (1.0 / max(dist * 1e-17, 1.0)) * uPixelRatio * density;

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = max(vSize, 1.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vDensity;
      varying float vSize;

      void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);

        if (dist > 0.5) discard;

        float intensity = 1.0 - smoothstep(0.0, 0.5, dist);
        intensity = pow(intensity, 1.5) * vDensity;

        // Subtle twinkling
        intensity *= 0.8 + 0.2 * sin(vSize * 100.0 + vColor.x * 100.0);

        gl_FragColor = vec4(vColor * intensity, intensity * 0.5);
      }
    `,
    transparent: true,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), []);

  // Dust material (alpha blended)
  const dustMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uCameraPosition: { value: new THREE.Vector3() },
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      attribute float opacity;

      varying vec3 vColor;
      varying float vOpacity;
      varying float vSize;

      uniform float uTime;
      uniform vec3 uCameraPosition;

      void main() {
        vColor = color;
        vOpacity = opacity;

        float dist = length(position - uCameraPosition);
        vSize = size * (1.0 / max(dist * 1e-17, 1.0));

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = max(vSize, 1.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vOpacity;
      varying float vSize;

      void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);

        if (dist > 0.5) discard;

        float intensity = 1.0 - smoothstep(0.0, 0.5, dist);
        intensity = pow(intensity, 2.0);

        gl_FragColor = vec4(vColor, vOpacity * intensity * 0.3);
      }
    `,
    transparent: true,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  }), []);

  // Update uniforms
  useFrame((state) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = state.clock.getElapsedTime();
      mat.uniforms.uCameraPosition.value.copy(camera.position);
    }
    if (dustRef.current) {
      const mat = dustRef.current.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = state.clock.getElapsedTime();
      mat.uniforms.uCameraPosition.value.copy(camera.position);
    }
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (meshRef.current) {
        const mat = meshRef.current.material as THREE.ShaderMaterial;
        mat.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
        mat.uniforms.uPixelRatio.value = window.devicePixelRatio;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!enabled) return null;
  if (!visible) return null;
  if (!lodState.shouldRender) return null;

  return (
    <group renderOrder={-8} opacity={opacity}>
      {/* Dust lanes (rendered first - behind stars) */}
      <points
        ref={dustRef}
        geometry={dustGeometry}
        material={dustMaterial}
        frustumCulled={true}
      />

      {/* Star field */}
      <points
        ref={meshRef}
        geometry={starGeometry}
        material={starMaterial}
        frustumCulled={true}
      />
    </group>
  );
}

// Helper functions
function sampleExponential(scaleLength: number, rand: () => number): number {
  // Exponential disk distribution: p(r) ~ exp(-r/h)
  return -scaleLength * Math.log(1 - rand());
}

function sampleGaussian(mean: number, sigma: number, rand: () => number): number {
  // Box-Muller transform
  const u1 = rand();
  const u2 = rand();
  return mean + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function temperatureToColor(temp: number): { r: number; g: number; b: number } {
  // Simple blackbody color approximation
  const t = temp / 10000;
  let r, g, b;

  if (t < 0.4) {
    r = 1.0;
    g = t * 2.5;
    b = 0.0;
  } else if (t < 0.7) {
    r = 1.0;
    g = 0.8 + (t - 0.4) * 0.6;
    b = (t - 0.4) * 3.0;
  } else if (t < 1.0) {
    r = 1.0 - (t - 0.7) * 0.5;
    g = 1.0 - (t - 0.7) * 0.3;
    b = 1.0;
  } else {
    r = 0.85;
    g = 0.85;
    b = 1.0;
  }

  return { r, g, b };
}

// Milky Way core component for when inside galaxy
export function MilkyWayCore() {
  // High-detail core region when camera is near galactic center
  return null;
}