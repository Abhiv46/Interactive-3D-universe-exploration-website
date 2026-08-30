import { useMemo, useRef, useEffect, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  MILKY_WAY,
  SPIRAL_ARMS,
  NEARBY_GALAXIES,
  getGalaxyPosition,
  logScaleDistance,
} from '@/data/galaxies';
import { useScale } from '@/context/ScaleContext';
import { useCameraControls } from '@/hooks/useCameraControls';
import { useLoading } from '@/components/UI/LoadingScreen';

interface MilkyWayProps {
  /** Whether the galaxy is visible (controlled by camera distance) */
  visible?: boolean;
  /** Opacity of the galaxy (for transitions) */
  opacity?: number;
  /** Quality preset for particle count */
  quality?: 'low' | 'medium' | 'high' | 'ultra';
}

/**
 * MilkyWay - Procedural spiral galaxy using GPU particles
 * Renders the Milky Way with 4 major spiral arms, central bulge, and halo
 */
export function MilkyWay({ visible = true, opacity = 1, quality = 'high' }: MilkyWayProps) {
  const { scene } = useThree();
  const { trueScale } = useScale();
  const { cameraPosition } = useCameraControls();
  const { onShaderLoad } = useLoading();
  const galaxyRef = useRef<THREE.Group | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const bulgeRef = useRef<THREE.Points | null>(null);
  const haloRef = useRef<THREE.Points | null>(null);
  const nearbyGalaxiesRef = useRef<THREE.Group | null>(null);

  // Generate Milky Way particles (spiral arms + bulge + halo)
  const galaxyData = useMemo(() => {
    const { particleCount, bulgeParticleCount, haloParticleCount, visualRadius, visualBulgeRadius } = MILKY_WAY;

    // Quality multiplier for particle counts
    const qualityMultiplier = quality === 'low' ? 0.25 : quality === 'medium' ? 0.5 : quality === 'high' ? 1 : 2;

    const adjustedParticleCount = Math.floor(particleCount * qualityMultiplier);
    const adjustedBulgeCount = Math.floor(bulgeParticleCount * qualityMultiplier);
    const adjustedHaloCount = Math.floor(haloParticleCount * qualityMultiplier);

    // Spiral arm particles
    const armPositions = new Float32Array(particleCount * 3);
    const armColors = new Float32Array(particleCount * 3);
    const armSizes = new Float32Array(particleCount);
    const armAges = new Float32Array(particleCount); // For twinkling

    let idx = 0;
    SPIRAL_ARMS.forEach((arm) => {
      const armParticles = Math.floor(adjustedParticleCount * arm.density / SPIRAL_ARMS.reduce((a, b) => a + b.density, 0));
      const [r, g, b] = arm.color;

      for (let i = 0; i < armParticles && idx < particleCount; i++) {
        // Radius along the arm
        const t = Math.random();
        const radius = arm.startRadius + t * (arm.endRadius - arm.startRadius);

        // Spiral angle: r = r0 * exp(theta * tan(pitch))
        // Inverse: theta = ln(r/r0) / tan(pitch)
        const pitchRad = arm.pitchAngle * Math.PI / 180;
        const baseAngle = Math.log(radius / arm.startRadius) / Math.tan(pitchRad);
        const angle = baseAngle + arm.phaseOffset + (Math.random() - 0.5) * 0.5; // Some scatter

        // Add width scatter
        const radiusScatter = radius + (Math.random() - 0.5) * arm.width;

        // Height scatter (disk thickness ~1000 ly scaled)
        const height = (Math.random() - 0.5) * 500 * (1 + radius / visualRadius);

        // Position
        armPositions[idx * 3] = radiusScatter * Math.cos(angle);
        armPositions[idx * 3 + 1] = height;
        armPositions[idx * 3 + 2] = radiusScatter * Math.sin(angle);

        // Color with some variation
        const colorVar = 0.8 + Math.random() * 0.4;
        armColors[idx * 3] = r * colorVar;
        armColors[idx * 3 + 1] = g * colorVar;
        armColors[idx * 3 + 2] = b * colorVar;

        // Size based on radius (brighter toward center)
        const sizeFactor = 1 + (visualRadius - radius) / visualRadius * 2;
        armSizes[idx] = (1 + Math.random()) * sizeFactor * 0.5;

        // Age for twinkling
        armAges[idx] = Math.random() * Math.PI * 2;

        idx++;
      }
    });

    // Bulge particles (central region)
    const bulgePositions = new Float32Array(adjustedBulgeCount * 3);
    const bulgeColors = new Float32Array(adjustedBulgeCount * 3);
    const bulgeSizes = new Float32Array(adjustedBulgeCount);

    for (let i = 0; i < adjustedBulgeCount; i++) {
      // Spherical distribution with density falloff
      const u = Math.random();
      const v = Math.random();
      const radius = visualBulgeRadius * Math.pow(u, 1/3); // Uniform in sphere
      const theta = 2 * Math.PI * v;
      const phi = Math.acos(2 * Math.random() - 1);

      bulgePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      bulgePositions[i * 3 + 1] = radius * Math.cos(phi);
      bulgePositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      // Yellowish/reddish for older bulge stars
      const temp = 0.7 + Math.random() * 0.3;
      bulgeColors[i * 3] = 1.0 * temp;
      bulgeColors[i * 3 + 1] = 0.8 * temp;
      bulgeColors[i * 3 + 2] = 0.5 * temp;

      bulgeSizes[i] = (1 + Math.random()) * (1 + (visualBulgeRadius - radius) / visualBulgeRadius) * 0.8;
    }

    // Halo particles (sparse spherical distribution)
    const haloPositions = new Float32Array(adjustedHaloCount * 3);
    const haloColors = new Float32Array(adjustedHaloCount * 3);
    const haloSizes = new Float32Array(adjustedHaloCount);

    for (let i = 0; i < adjustedHaloCount; i++) {
      const radius = visualRadius * (0.5 + Math.random() * 2); // Extend beyond disk
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);

      haloPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      haloPositions[i * 3 + 1] = radius * Math.cos(phi);
      haloPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      // Very faint, blue-white
      const brightness = 0.1 + Math.random() * 0.2;
      haloColors[i * 3] = 0.7 * brightness;
      haloColors[i * 3 + 1] = 0.8 * brightness;
      haloColors[i * 3 + 2] = 1.0 * brightness;

      haloSizes[i] = (0.5 + Math.random()) * 0.3;
    }

    return {
      armPositions,
      armColors,
      armSizes,
      armAges,
      bulgePositions,
      bulgeColors,
      bulgeSizes,
      haloPositions,
      haloColors,
      haloSizes,
    };
  }, []);

  // Create geometries and materials
  const armGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(galaxyData.armPositions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(galaxyData.armColors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(galaxyData.armSizes, 1));
    geo.setAttribute('age', new THREE.BufferAttribute(galaxyData.armAges, 1));
    return geo;
  }, [galaxyData]);

  const bulgeGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(galaxyData.bulgePositions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(galaxyData.bulgeColors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(galaxyData.bulgeSizes, 1));
    return geo;
  }, [galaxyData]);

  const haloGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(galaxyData.haloPositions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(galaxyData.haloColors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(galaxyData.haloSizes, 1));
    return geo;
  }, [galaxyData]);

  // Custom shader material for spiral arms with twinkling
  const armMaterial = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: opacity },
        uPixelRatio: { value: typeof window !== 'undefined' ? window.devicePixelRatio : 1 },
        uCameraPosition: { value: new THREE.Vector3() },
      },
      vertexShader: `
        attribute float size;
        attribute float age;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vAge;
        varying float vSize;
        uniform float uTime;
        uniform float uOpacity;
        uniform float uPixelRatio;
        uniform vec3 uCameraPosition;

        void main() {
          vColor = color;
          vAge = age;
          vSize = size;

          vec3 pos = position;

          // Subtle twinkling
          float twinkle = sin(uTime * 0.5 + age) * 0.1 + 0.9;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * uPixelRatio * (300.0 / -mvPosition.z) * twinkle;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAge;
        varying float vSize;
        uniform float uOpacity;

        void main() {
          // Soft circular particle with glow
          float dist = length(gl_PointCoord - 0.5);
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);

          // Add slight color variation based on age
          vec3 finalColor = vColor * (0.8 + 0.2 * sin(vAge * 3.0));

          gl_FragColor = vec4(finalColor, alpha * uOpacity);

          // Discard very transparent pixels
          if (gl_FragColor.a < 0.01) discard;
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
    // Track shader compilation
    if (onShaderLoad) onShaderLoad('milkyway-arms');
    return material;
  }, [opacity, onShaderLoad]);

  // Bulge material (no twinkling, softer)
  const bulgeMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 1,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: opacity * 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [opacity]);

  // Halo material (very faint)
  const haloMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 1,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: opacity * 0.2,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [opacity]);

  // Create nearby galaxy meshes
  const nearbyGalaxyMeshes = useMemo(() => {
    const group = new THREE.Group();

    NEARBY_GALAXIES.forEach((galaxy) => {
      const pos = getGalaxyPosition(galaxy);

      // Scale down for visualization (logarithmic)
      const visualDist = logScaleDistance(galaxy.distance * 3.26156); // Convert to ly
      const scale = visualDist / (galaxy.distance * 3.26156 * 1e4); // Normalize

      const scaledPos = pos.clone().multiplyScalar(scale);

      // Create a sprite/points for the galaxy
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(3);
      positions[0] = scaledPos.x;
      positions[1] = scaledPos.y;
      positions[2] = scaledPos.z;
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      // Color based on galaxy type
      let color = new THREE.Color(0xffffff);
      if (galaxy.type.startsWith('E')) color.set(0xffddaa); // Elliptical - yellowish
      else if (galaxy.type.startsWith('S')) color.set(0xaaddff); // Spiral - bluish
      else color.set(0xffaa88); // Irregular - reddish

      const material = new THREE.PointsMaterial({
        size: Math.max(500, (galaxy.size ?? 50000) * 0.1), // Scale size
        sizeAttenuation: true,
        color: color,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const points = new THREE.Points(geo, material);
      points.userData = { galaxyId: galaxy.id, galaxyData: galaxy };
      group.add(points);

      // Add label sprite
      const labelGeometry = new THREE.BufferGeometry();
      const labelPositions = new Float32Array(3);
      labelPositions[0] = scaledPos.x;
      labelPositions[1] = scaledPos.y + Math.max(500, (galaxy.size ?? 50000) * 0.15);
      labelPositions[2] = scaledPos.z;
      labelGeometry.setAttribute('position', new THREE.BufferAttribute(labelPositions, 3));

      // We'll add labels via HTML overlay instead
    });

    return group;
  }, []);

  // Create the galaxy group
  const galaxyGroup = useMemo(() => {
    const group = new THREE.Group();
    group.rotation.x = -Math.PI / 2; // Rotate to galactic plane

    // Add spiral arms
    const arms = new THREE.Points(armGeometry, armMaterial);
    arms.frustumCulled = false;
    particlesRef.current = arms;
    group.add(arms);

    // Add bulge
    const bulge = new THREE.Points(bulgeGeometry, bulgeMaterial);
    bulge.frustumCulled = false;
    bulgeRef.current = bulge;
    group.add(bulge);

    // Add halo
    const halo = new THREE.Points(haloGeometry, haloMaterial);
    halo.frustumCulled = false;
    haloRef.current = halo;
    group.add(halo);

    // Add nearby galaxies
    group.add(nearbyGalaxyMeshes);
    nearbyGalaxiesRef.current = nearbyGalaxyMeshes;

    galaxyRef.current = group;
    return group;
  }, [armGeometry, bulgeGeometry, haloGeometry, armMaterial, bulgeMaterial, haloMaterial, nearbyGalaxyMeshes]);

  // Add to scene
  useEffect(() => {
    if (visible && galaxyGroup) {
      scene.add(galaxyGroup);
    }
    return () => {
      if (galaxyGroup) {
        scene.remove(galaxyGroup);
      }
    };
  }, [visible, galaxyGroup, scene]);

  // Animation loop - update time uniform and slow rotation
  useFrame((state, delta) => {
    if (!visible) return;

    const time = state.clock.getElapsedTime();

    // Update shader time
    if (armMaterial.uniforms.uTime) {
      armMaterial.uniforms.uTime.value = time;
    }
    if (armMaterial.uniforms.uOpacity) {
      armMaterial.uniforms.uOpacity.value = opacity;
    }
    if (armMaterial.uniforms.uCameraPosition && cameraPosition) {
      armMaterial.uniforms.uCameraPosition.value.copy(cameraPosition);
    }

    // Slow galaxy rotation (225 million years = 1 rotation)
    // Scale: 1 year = 1 second => 225M seconds per rotation = too slow
    // Use visual rotation: 1 rotation per ~5 minutes
    if (galaxyRef.current) {
      galaxyRef.current.rotation.z += delta * 0.0005; // Very slow
    }
  });

  if (!visible) return null;
  return <primitive object={galaxyGroup} />;
}

/**
 * GalaxyLabel - HTML overlay label for nearby galaxies
 */
export function GalaxyLabel({ galaxy, position, visible }: {
  galaxy: typeof NEARBY_GALAXIES[0];
  position: THREE.Vector3;
  visible: boolean;
}) {
  const { gl, camera } = useThree();
  const [screenPos, setScreenPos] = useState({ x: 0, y: 0 });
  const [show, setShow] = useState(false);

  useFrame(() => {
    if (!visible || !gl) return;

    const vec = position.clone().project(camera);
    const x = (vec.x * 0.5 + 0.5) * gl.domElement.clientWidth;
    const y = (-vec.y * 0.5 + 0.5) * gl.domElement.clientHeight;

    // Check if behind camera
    if (vec.z > 1 || vec.z < -1) {
      setShow(false);
      return;
    }

    setScreenPos({ x, y });
    setShow(true);
  });

  if (!show) return null;

  return (
    <div
      className="galaxy-label"
      style={{
        left: screenPos.x,
        top: screenPos.y,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <span className="galaxy-name">{galaxy.designation}</span>
      <span className="galaxy-fullname">{galaxy.name}</span>
      <span className="galaxy-distance">{galaxy.distance > 1000000
        ? `${(galaxy.distance / 1e6).toFixed(1)} Mly`
        : `${(galaxy.distance / 1000).toFixed(0)} kly`}</span>
    </div>
  );
}

