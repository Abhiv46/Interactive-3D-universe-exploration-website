import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { NEARBY_GALAXIES } from '../../data/galaxies';

interface NearbyGalaxiesProps {
  onObjectClick?: (object: {
    id: string;
    name: string;
    type: string;
    position: THREE.Vector3;
    data: any;
  }) => void;
}

export function NearbyGalaxies({ onObjectClick }: NearbyGalaxiesProps) {

  // Create galaxy meshes
  const galaxyMeshes = useMemo(() => {
    return NEARBY_GALAXIES.map(galaxy => createGalaxyMesh(galaxy));
  }, []);

  // Update positions based on time (galaxies have proper motion)
  useFrame(() => {
    galaxyMeshes.forEach((mesh, i) => {
      const galaxy = NEARBY_GALAXIES[i];
      // Galaxies are so far that their proper motion is negligible on human timescales
      // But we can update for very long time scales
      const position = getGalaxyPosition(galaxy);
      mesh.position.copy(position);
    });
  });

  return (
    <group name="nearby-galaxies">
      {galaxyMeshes.map((mesh, i) => (
        <primitive
          key={NEARBY_GALAXIES[i].id}
          object={mesh}
          onClick={onObjectClick ? () => {
            const galaxy = NEARBY_GALAXIES[i];
            onObjectClick({
              id: galaxy.id,
              name: galaxy.name,
              type: 'galaxy',
              position: mesh.getWorldPosition(new THREE.Vector3()),
              data: galaxy,
            });
          } : undefined}
        />
      ))}
    </group>
  );
}

function createGalaxyMesh(galaxy: any) {
  const group = new THREE.Group();
  group.name = galaxy.id;

  // Position
  const position = getGalaxyPosition(galaxy);
  group.position.copy(position);

  // Scale based on distance and size
  const scale = getGalaxyScale(galaxy);
  group.scale.setScalar(scale);

  // Main galaxy body (sprite/billboard for distant, geometry for closer)
  const isClose = galaxy.distance < 1000000; // Within 1 Mpc

  if (isClose) {
    // 3D galaxy model
    const coreGeometry = new THREE.SphereGeometry(1, 32, 32);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: getGalaxyColor(galaxy.type),
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.name = 'core';
    group.add(core);

    // Disk
    const diskGeometry = new THREE.CircleGeometry(2, 64);
    const diskMaterial = new THREE.MeshBasicMaterial({
      color: getGalaxyColor(galaxy.type),
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const disk = new THREE.Mesh(diskGeometry, diskMaterial);
    disk.name = 'disk';
    disk.rotation.x = -Math.PI / 2;
    group.add(disk);

    // Spiral arms (simplified)
    for (let i = 0; i < 2; i++) {
      const armGeometry = new THREE.BufferGeometry();
      const armPoints = 100;
      const positions = new Float32Array(armPoints * 3);
      for (let j = 0; j < armPoints; j++) {
        const t = j / armPoints;
        const r = t * 2;
        const theta = t * 8 * Math.PI + i * Math.PI;
        positions[j * 3] = r * Math.cos(theta);
        positions[j * 3 + 1] = 0;
        positions[j * 3 + 2] = r * Math.sin(theta);
      }
      armGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const armMaterial = new THREE.LineBasicMaterial({
        color: getGalaxyColor(galaxy.type),
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const arm = new THREE.Line(armGeometry, armMaterial);
      arm.name = `arm-${i}`;
      group.add(arm);
    }
  } else {
    // Distant galaxy - use point sprite
    const spriteMaterial = new THREE.SpriteMaterial({
      color: getGalaxyColor(galaxy.type),
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.name = 'sprite';
    sprite.scale.set(1, 1, 1);
    group.add(sprite);
  }

  // Label position (for HTML overlay)
  group.userData.labelPosition = new THREE.Vector3(0, 3, 0);

  return group;
}

function getGalaxyPosition(galaxy: any): THREE.Vector3 {
  // Convert RA/Dec to Cartesian
  // RA in hours -> degrees, Dec in degrees
  const ra = galaxy.ra; // already in degrees
  const dec = galaxy.dec; // already in degrees
  const distance = galaxy.distance * 3.086e16; // parsecs to meters

  const raRad = ra * Math.PI / 180;
  const decRad = dec * Math.PI / 180;

  return new THREE.Vector3(
    distance * Math.cos(decRad) * Math.cos(raRad),
    distance * Math.sin(decRad),
    distance * Math.cos(decRad) * Math.sin(raRad)
  );
}

function getGalaxyScale(galaxy: any): number {
  // Scale to make galaxies visible but not overwhelming
  // Base scale on angular size
  const angularSize = (galaxy.size / galaxy.distance) * (180 / Math.PI) * 3600; // arcseconds
  const baseScale = Math.max(angularSize * 1e18, 1e18); // Minimum size for visibility
  return baseScale;
}

function getGalaxyColor(type: string): THREE.Color {
  // Color based on Hubble type
  const colors: Record<string, THREE.Color> = {
    'E': new THREE.Color(0xffccaa),      // Elliptical - yellowish
    'S0': new THREE.Color(0xffeebb),     // Lenticular
    'Sa': new THREE.Color(0xffddaa),     // Spiral a
    'Sb': new THREE.Color(0xffccaa),     // Spiral b
    'Sc': new THREE.Color(0xffbbaa),     // Spiral c
    'Sd': new THREE.Color(0xffaa99),     // Spiral d
    'Sm': new THREE.Color(0xff9988),     // Magellanic spiral
    'Irr': new THREE.Color(0xff8877),    // Irregular
    'SBa': new THREE.Color(0xffccaa),    // Barred spiral a
    'SBb': new THREE.Color(0xffbb99),    // Barred spiral b
    'SBc': new THREE.Color(0xffaa88),    // Barred spiral c
    'SBm': new THREE.Color(0xff9977),    // Barred Magellanic
    'I0': new THREE.Color(0xff8866),     // Irregular (M82 type)
  };

  // Match prefix
  for (const [key, color] of Object.entries(colors)) {
    if (type.startsWith(key)) return color;
  }

  // Default
  return new THREE.Color(0xffccaa);
}

// Individual galaxy component for detailed rendering
interface GalaxyDetailProps {
  galaxy: any;
}

export function GalaxyDetail({ galaxy }: GalaxyDetailProps) {
  const meshRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  // Create detailed galaxy model
  const geometry = useMemo(() => {
    const group = new THREE.Group();

    // Core
    const coreGeo = new THREE.SphereGeometry(1, 64, 64);
    const coreMat = new THREE.MeshBasicMaterial({
      color: getGalaxyColor(galaxy.type),
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    // Disk with spiral arms (procedural)
    const diskGeo = new THREE.CircleGeometry(3, 128);
    const diskMat = new THREE.MeshBasicMaterial({
      color: getGalaxyColor(galaxy.type),
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const disk = new THREE.Mesh(diskGeo, diskMat);
    disk.rotation.x = -Math.PI / 2 * (galaxy.inclination / 90);
    group.add(disk);

    // Add star particles for spiral structure
    const starCount = 50000;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    let seed = galaxy.id.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    for (let i = 0; i < starCount; i++) {
      // Spiral arms
      const arm = i % 4;
      const r = rand() * 3;
      const theta = r * 6 + arm * Math.PI / 2 + rand() * 0.5;
      const h = (rand() - 0.5) * 0.2;

      positions[i * 3] = r * Math.cos(theta);
      positions[i * 3 + 1] = h;
      positions[i * 3 + 2] = r * Math.sin(theta);

      const color = getGalaxyColor(galaxy.type);
      colors[i * 3] = color.r * (0.5 + rand() * 0.5);
      colors[i * 3 + 1] = color.g * (0.5 + rand() * 0.5);
      colors[i * 3 + 2] = color.b * (0.5 + rand() * 0.5);

      sizes[i] = 0.05 + rand() * 0.1;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const starMat = new THREE.PointsMaterial({
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      size: 1,
    });

    const stars = new THREE.Points(starGeo, starMat);
    stars.rotation.x = -Math.PI / 2 * (galaxy.inclination / 90);
    group.add(stars);

    // Dust lanes
    const dustCount = 5000;
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    const dustColors = new Float32Array(dustCount * 3);
    const dustSizes = new Float32Array(dustCount);

    for (let i = 0; i < dustCount; i++) {
      const r = rand() * 2.5;
      const theta = rand() * Math.PI * 2;
      const h = (rand() - 0.5) * 0.05; // Very thin

      dustPositions[i * 3] = r * Math.cos(theta);
      dustPositions[i * 3 + 1] = h;
      dustPositions[i * 3 + 2] = r * Math.sin(theta);

      dustColors[i * 3] = 0.2;
      dustColors[i * 3 + 1] = 0.15;
      dustColors[i * 3 + 2] = 0.1;

      dustSizes[i] = 0.1 + rand() * 0.3;
    }

    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    dustGeo.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));
    dustGeo.setAttribute('size', new THREE.BufferAttribute(dustSizes, 1));

    const dustMat = new THREE.PointsMaterial({
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.3,
      vertexColors: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      size: 1,
    });

    const dust = new THREE.Points(dustGeo, dustMat);
    dust.rotation.x = -Math.PI / 2 * (galaxy.inclination / 90);
    group.add(dust);

    return group;
  }, [galaxy]);

  // Position
  useFrame(() => {
    if (meshRef.current) {
      const position = getGalaxyPosition(galaxy);
      meshRef.current.position.copy(position);
      const scale = getGalaxyScale(galaxy);
      meshRef.current.scale.setScalar(scale);
    }
  });

  // Always face camera (billboard for sprites)
  useFrame(() => {
    if (meshRef.current) {
      // Rotate to face camera but maintain inclination
      meshRef.current.lookAt(camera.position);
      // Re-apply inclination
      meshRef.current.children.forEach(child => {
        if (child.name === 'disk' || child.name.includes('arm') || child.name === 'stars' || child.name === 'dust') {
          child.rotation.x = -Math.PI / 2 * (galaxy.inclination / 90);
        }
      });
    }
  });

  return <primitive object={geometry} ref={meshRef} />;
}