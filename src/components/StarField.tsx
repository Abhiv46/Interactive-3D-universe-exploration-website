import { useMemo, useEffect, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BRIGHT_STARS, generateAdditionalStars, bvToColor, magnitudeToPointSize, filterStarsByMagnitude, getStarCatalog, loadFullStarCatalog } from '@/data/stars';
import { CONSTELLATIONS, Constellation, ConstellationLine } from '@/data/constellations';
import { DEG_TO_RAD } from '@/engine/Constants';
import { useLoading } from '@/components/UI/LoadingScreen';

interface StarFieldProps {
  /** Distance at which to render stars (should be far behind solar system) */
  distance?: number;
  /** Maximum apparent magnitude to render (higher = fainter stars) */
  maxMagnitude?: number;
  /** Maximum number of stars to render */
  maxStars?: number;
  /** Whether to show constellation lines */
  showConstellations?: boolean;
  /** Constellation line color */
  constellationColor?: string;
  /** Constellation line opacity */
  constellationOpacity?: number;
}

/**
 * Convert RA/Dec (degrees) to 3D Cartesian coordinates on a sphere
 */
function radecToCartesian(ra: number, dec: number, radius: number): THREE.Vector3 {
  const phi = (90 - dec) * DEG_TO_RAD;
  const theta = ra * DEG_TO_RAD;

  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

/**
 * StarField component using THREE.Points with GPU instancing
 * Renders stars at a large distance with real colors and magnitudes
 */
export function StarField({
  distance = 1e6,
  maxMagnitude = 6.5,
  maxStars = 10000,
  showConstellations = false,
  constellationColor = '#ffffff',
  constellationOpacity = 0.3,
}: StarFieldProps) {
  const { scene } = useThree();
  const pointsRef = useRef<THREE.Points | null>(null);
  const constellationsRef = useRef<THREE.Group | null>(null);
  const [starsLoaded, setStarsLoaded] = useState(false);

  // Generate star geometry and material
  const starGeometry = useMemo(() => {
    // Load star catalog
    const catalog = getStarCatalog();
    const filtered = filterStarsByMagnitude(catalog, maxMagnitude, maxStars);

    const count = filtered.length;
    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    filtered.forEach((star, i) => {
      const pos = radecToCartesian(star.ra, star.dec, distance);
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      const [r, g, b] = bvToColor(star.bvIndex);
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;

      sizes[i] = magnitudeToPointSize(star.vMag);
    });

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    return geometry;
  }, [distance, maxMagnitude, maxStars]);

  const starMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 1,
      sizeAttenuation: false, // Stars don't attenuate with distance (they're at fixed distance)
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthTest: true,
      depthWrite: false, // Don't write to depth buffer so planets render on top
      blending: THREE.AdditiveBlending, // Additive blending for star glow effect
    });
  }, []);

  // Create constellation lines
  const constellationLines = useMemo(() => {
    if (!showConstellations) return null;

    const group = new THREE.Group();
    const material = new THREE.LineBasicMaterial({
      color: constellationColor,
      opacity: constellationOpacity,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    // Create a map of star ID to position for quick lookup
    const catalog = getStarCatalog();
    const starMap = new Map<string, THREE.Vector3>();
    catalog.forEach(star => {
      const id = star.properName?.toLowerCase().replace(/['\s]/g, '_') ||
                 `hip_${star.hipId}`;
      starMap.set(id, radecToCartesian(star.ra, star.dec, distance));
    });

    // Also add Bayer designations as keys
    catalog.forEach(star => {
      if (star.bayer) {
        const id = star.bayer.toLowerCase().replace(/[^a-z0-9]/g, '_');
        if (!starMap.has(id)) {
          starMap.set(id, radecToCartesian(star.ra, star.dec, distance));
        }
      }
    });

    CONSTELLATIONS.forEach((constellation: Constellation) => {
      constellation.lines.forEach((line: ConstellationLine) => {
        const fromPos = starMap.get(line.from.toLowerCase());
        const toPos = starMap.get(line.to.toLowerCase());

        if (fromPos && toPos) {
          const lineGeometry = new THREE.BufferGeometry();
          const positions = new Float32Array(6);
          positions[0] = fromPos.x; positions[1] = fromPos.y; positions[2] = fromPos.z;
          positions[3] = toPos.x; positions[4] = toPos.y; positions[5] = toPos.z;
          lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

          const lineMesh = new THREE.Line(lineGeometry, material);
          group.add(lineMesh);
        }
      });
    });

    return group;
  }, [showConstellations, distance, constellationColor, constellationOpacity]);

  // Add/remove constellation lines when showConstellations changes
  useEffect(() => {
    if (constellationsRef.current) {
      scene.remove(constellationsRef.current);
      constellationsRef.current = null;
    }

    if (showConstellations && constellationLines) {
      constellationsRef.current = constellationLines;
      scene.add(constellationLines);
    }

    return () => {
      if (constellationsRef.current) {
        scene.remove(constellationsRef.current);
        constellationsRef.current = null;
      }
    };
  }, [showConstellations, constellationLines, scene]);

  // Create points mesh
  const points = useMemo(() => {
    const mesh = new THREE.Points(starGeometry, starMaterial);
    mesh.frustumCulled = false; // Stars are at fixed distance, always visible
    pointsRef.current = mesh;
    return mesh;
  }, [starGeometry, starMaterial]);

  // Add to scene
  useEffect(() => {
    scene.add(points);
    setStarsLoaded(true);

    return () => {
      scene.remove(points);
      starGeometry.dispose();
      starMaterial.dispose();
      if (constellationsRef.current) {
        scene.remove(constellationsRef.current);
        constellationsRef.current.traverse(obj => {
          if (obj instanceof THREE.Line) {
            obj.geometry.dispose();
            if (obj.material instanceof THREE.Material) {
              obj.material.dispose();
            }
          }
        });
      }
    };
  }, [points, scene, starGeometry, starMaterial]);

  // Render nothing - the points are added to scene via useEffect
  return null;
}

/**
 * StarFieldWrapper - loads full catalog async and manages LOD
 */
export function StarFieldWrapper({
  distance = 1e6,
  maxMagnitude = 6.5,
  maxStars = 20000,
  showConstellations = false,
}: StarFieldProps) {
  const [catalogReady, setCatalogReady] = useState(false);
  const { onStarDataLoad } = useLoading();

  useEffect(() => {
    // Load full catalog async with progress reporting
    loadFullStarCatalog().then((catalog) => {
      setCatalogReady(true);
      // Report total star count loaded
      if (onStarDataLoad) {
        onStarDataLoad(catalog.length);
      }
    });
  }, [onStarDataLoad]);

  // For now, render with initial catalog, upgrade when ready
  return (
    <StarField
      distance={distance}
      maxMagnitude={catalogReady ? maxMagnitude : 4.0} // Brighter stars initially
      maxStars={catalogReady ? maxStars : 300}
      showConstellations={showConstellations}
    />
  );
}