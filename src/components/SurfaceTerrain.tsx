import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CelestialBodyData } from '@/types/orbitalElements';

interface SurfaceTerrainProps {
  /** Planet data (Earth, Moon, Mars) */
  data: CelestialBodyData;
  /** Current zoom level (0 = orbital, 1 = surface) */
  zoomLevel: number;
  /** Camera reference for LOD calculations */
  camera?: THREE.Camera;
  /** Called when surface region info is available */
  onRegionInfo?: (info: SurfaceRegionInfo | null) => void;
}

/** Information about a surface region */
export interface SurfaceRegionInfo {
  name: string;
  description: string;
  coordinates: { lat: number; lon: number };
  elevation: number;
  type: 'landing_site' | 'crater' | 'mountain' | 'canyon' | 'sea' | 'plain' | 'volcano' | 'pole' | 'region';
}

/** Heightmap configuration for bodies with real elevation data */
interface HeightmapConfig {
  /** URL to the elevation/heightmap texture */
  elevationUrl: string;
  /** Scale factor for elevation (meters per pixel value) */
  elevationScale: number;
  /** Radius of the body in meters */
  radius: number;
  /** Segments at maximum detail (LOD 0) */
  maxSegments: number;
  /** Minimum segments at lowest detail */
  minSegments: number;
  /** Number of LOD levels */
  lodLevels: number;
  /** Surface region definitions for info overlay */
  regions: SurfaceRegionInfo[];
}

// Real elevation data configurations
const HEIGHTMAP_CONFIGS: Record<string, HeightmapConfig> = {
  earth: {
    elevationUrl: '/textures/earth_elevation.png',
    elevationScale: 8848, // Mount Everest ~8848m
    radius: 6371000,
    maxSegments: 256,
    minSegments: 32,
    lodLevels: 6,
    regions: [
      { name: 'Mount Everest', description: 'Highest point on Earth (8,848 m)', coordinates: { lat: 27.9881, lon: 86.9250 }, elevation: 8848, type: 'mountain' },
      { name: 'Mariana Trench', description: 'Deepest ocean point (~11,034 m)', coordinates: { lat: 11.35, lon: 142.2 }, elevation: -11034, type: 'region' },
      { name: 'Grand Canyon', description: 'Iconic canyon carved by Colorado River', coordinates: { lat: 36.0544, lon: -112.1401 }, elevation: 2000, type: 'canyon' },
      { name: 'Himalayas', description: 'Mountain range with highest peaks', coordinates: { lat: 28.0, lon: 84.0 }, elevation: 6000, type: 'mountain' },
      { name: 'Amazon Basin', description: 'Largest tropical rainforest', coordinates: { lat: -3.0, lon: -60.0 }, elevation: 200, type: 'region' },
      { name: 'Sahara Desert', description: 'Largest hot desert', coordinates: { lat: 23.0, lon: 25.0 }, elevation: 400, type: 'region' },
      { name: 'Antarctica', description: 'Southern polar ice sheet', coordinates: { lat: -90.0, lon: 0.0 }, elevation: 2500, type: 'pole' },
      { name: 'Greenland', description: 'Northern ice sheet', coordinates: { lat: 72.0, lon: -40.0 }, elevation: 2000, type: 'pole' },
      { name: 'Tibetan Plateau', description: 'Roof of the World', coordinates: { lat: 33.0, lon: 88.0 }, elevation: 4500, type: 'region' },
      { name: 'Andes', description: 'Longest continental mountain range', coordinates: { lat: -15.0, lon: -70.0 }, elevation: 4000, type: 'mountain' },
    ],
  },
  moon: {
    elevationUrl: '/textures/moon_elevation.png',
    elevationScale: 10000, // Lunar elevation range ~10km
    radius: 1737400,
    maxSegments: 256,
    minSegments: 32,
    lodLevels: 6,
    regions: [
      { name: 'Sea of Tranquility', description: 'Apollo 11 landing site (1969)', coordinates: { lat: 0.674, lon: 23.473 }, elevation: -1000, type: 'landing_site' },
      { name: 'Tycho Crater', description: 'Young rayed crater (108 Ma)', coordinates: { lat: -43.37, lon: -11.22 }, elevation: 4700, type: 'crater' },
      { name: 'Copernicus Crater', description: 'Prominent rayed crater (800 Ma)', coordinates: { lat: 9.62, lon: -20.08 }, elevation: 3800, type: 'crater' },
      { name: 'South Pole-Aitken Basin', description: 'Largest impact basin (2,500 km diameter)', coordinates: { lat: -56.0, lon: 180.0 }, elevation: -6000, type: 'crater' },
      { name: 'Mare Imbrium', description: 'Large lava plain (Sea of Rains)', coordinates: { lat: 32.8, lon: -15.6 }, elevation: -2000, type: 'sea' },
      { name: 'Mare Serenitatis', description: 'Sea of Serenity', coordinates: { lat: 26.0, lon: 18.0 }, elevation: -1500, type: 'sea' },
      { name: 'Mare Crisium', description: 'Sea of Crises', coordinates: { lat: 17.0, lon: 59.0 }, elevation: -1800, type: 'sea' },
      { name: 'Oceanus Procellarum', description: 'Ocean of Storms (largest mare)', coordinates: { lat: 18.4, lon: -57.4 }, elevation: -1500, type: 'sea' },
      { name: 'Montes Apenninus', description: 'Mountain range bordering Mare Imbrium', coordinates: { lat: 19.9, lon: -3.7 }, elevation: 5400, type: 'mountain' },
      { name: 'Aristarchus Crater', description: 'Bright young crater', coordinates: { lat: 23.7, lon: -47.4 }, elevation: 2700, type: 'crater' },
      { name: 'Clavius Crater', description: 'Large ancient crater (231 km)', coordinates: { lat: -58.4, lon: -14.4 }, elevation: 1500, type: 'crater' },
      { name: 'North Pole', description: 'Lunar north pole (permanent shadow regions)', coordinates: { lat: 90.0, lon: 0.0 }, elevation: 2000, type: 'pole' },
      { name: 'South Pole', description: 'Lunar south pole (water ice deposits)', coordinates: { lat: -90.0, lon: 0.0 }, elevation: 1000, type: 'pole' },
    ],
  },
  mars: {
    elevationUrl: '/textures/mars_elevation.png',
    elevationScale: 21000, // Olympus Mons ~21km, Hellas ~-7km
    radius: 3389500,
    maxSegments: 256,
    minSegments: 32,
    lodLevels: 6,
    regions: [
      { name: 'Olympus Mons', description: 'Largest volcano in solar system (21.9 km)', coordinates: { lat: 18.65, lon: 226.2 }, elevation: 21900, type: 'volcano' },
      { name: 'Valles Marineris', description: 'Largest canyon system (4,000 km long)', coordinates: { lat: -14.0, lon: -59.0 }, elevation: -5000, type: 'canyon' },
      { name: 'Hellas Planitia', description: 'Largest impact basin (~2,300 km)', coordinates: { lat: -42.4, lon: 70.5 }, elevation: -7152, type: 'crater' },
      { name: 'Tharsis Montes', description: 'Three massive shield volcanoes', coordinates: { lat: -1.0, lon: 247.0 }, elevation: 14000, type: 'volcano' },
      { name: 'Gale Crater', description: 'Curiosity rover landing site (2012)', coordinates: { lat: -4.5, lon: 137.4 }, elevation: -4500, type: 'landing_site' },
      { name: 'Jezero Crater', description: 'Perseverance rover landing site (2021)', coordinates: { lat: 18.4, lon: 77.5 }, elevation: -2600, type: 'landing_site' },
      { name: 'Elysium Mons', description: 'Volcano in Elysium Planitia', coordinates: { lat: 25.0, lon: 147.2 }, elevation: 12600, type: 'volcano' },
      { name: 'Arsia Mons', description: 'Southernmost Tharsis volcano', coordinates: { lat: -8.35, lon: 239.5 }, elevation: 16700, type: 'volcano' },
      { name: 'Pavonis Mons', description: 'Middle Tharsis volcano', coordinates: { lat: 0.6, lon: 243.5 }, elevation: 14100, type: 'volcano' },
      { name: 'Ascraeus Mons', description: 'Northernmost Tharsis volcano', coordinates: { lat: 11.3, lon: 255.5 }, elevation: 18100, type: 'volcano' },
      { name: 'North Polar Cap', description: 'Water ice and dry ice cap', coordinates: { lat: 90.0, lon: 0.0 }, elevation: 2000, type: 'pole' },
      { name: 'South Polar Cap', description: 'Dry ice and water ice cap', coordinates: { lat: -90.0, lon: 0.0 }, elevation: 2500, type: 'pole' },
    ],
  },
};

/** Quadtree node for LOD terrain */
class QuadtreeNode {
  bounds: THREE.Box3;
  level: number;
  mesh: THREE.Mesh | null = null;
  children: QuadtreeNode[] = [];
  isLeaf: boolean = true;
  center: THREE.Vector3;
  distance: number = 0;

  constructor(bounds: THREE.Box3, level: number) {
    this.bounds = bounds;
    this.level = level;
    this.center = new THREE.Vector3().addVectors(bounds.min, bounds.max).multiplyScalar(0.5);
  }

  subdivide(): QuadtreeNode[] {
    if (this.children.length > 0) return this.children;

    const { min, max } = this.bounds;
    const cx = (min.x + max.x) * 0.5;
    const cy = (min.y + max.y) * 0.5;
    const cz = (min.z + max.z) * 0.5;

    const quarters = [
      new THREE.Box3(new THREE.Vector3(min.x, min.y, min.z), new THREE.Vector3(cx, cy, cz)),
      new THREE.Box3(new THREE.Vector3(cx, min.y, min.z), new THREE.Vector3(max.x, cy, cz)),
      new THREE.Box3(new THREE.Vector3(min.x, cy, min.z), new THREE.Vector3(cx, max.y, cz)),
      new THREE.Box3(new THREE.Vector3(cx, cy, min.z), new THREE.Vector3(max.x, max.y, cz)),
      new THREE.Box3(new THREE.Vector3(min.x, min.y, cz), new THREE.Vector3(cx, cy, max.z)),
      new THREE.Box3(new THREE.Vector3(cx, min.y, cz), new THREE.Vector3(max.x, cy, max.z)),
      new THREE.Box3(new THREE.Vector3(min.x, cy, cz), new THREE.Vector3(cx, max.y, max.z)),
      new THREE.Box3(new THREE.Vector3(cx, cy, cz), new THREE.Vector3(max.x, max.y, max.z)),
    ];

    this.children = quarters.map(q => new QuadtreeNode(q, this.level + 1));
    this.isLeaf = false;
    return this.children;
  }

  updateDistance(cameraPosition: THREE.Vector3) {
    this.distance = this.center.distanceTo(cameraPosition);
    this.children.forEach(c => c.updateDistance(cameraPosition));
  }

  getVisibleNodes(cameraPosition: THREE.Vector3, maxDistance: number, maxLevel: number, result: QuadtreeNode[] = []): QuadtreeNode[] {
    if (this.distance > maxDistance && this.level > 0) {
      // Too far, use this node (parent level)
      result.push(this);
      return result;
    }

    if (this.isLeaf || this.level >= maxLevel) {
      result.push(this);
      return result;
    }

    this.children.forEach(child => {
      child.getVisibleNodes(cameraPosition, maxDistance, maxLevel, result);
    });
    return result;
  }
}

/** Creates a spherical quadtree for terrain LOD */
function createSphericalQuadtree(radius: number, maxLevel: number): QuadtreeNode {
  // Start with a cube encompassing the sphere
  const size = radius * 2;
  const bounds = new THREE.Box3(
    new THREE.Vector3(-radius, -radius, -radius),
    new THREE.Vector3(radius, radius, radius)
  );
  const root = new QuadtreeNode(bounds, 0);

  // Subdivide to max level
  const subdivideRecursive = (node: QuadtreeNode) => {
    if (node.level < maxLevel) {
      node.subdivide();
      node.children.forEach(subdivideRecursive);
    }
  };
  subdivideRecursive(root);

  return root;
}

/** Generates terrain geometry from heightmap data for a quadtree node */
function generateTerrainGeometry(
  node: QuadtreeNode,
  heightmap: HTMLImageElement | HTMLCanvasElement,
  config: HeightmapConfig,
  radius: number
): THREE.BufferGeometry {
  const segments = Math.max(config.minSegments, config.maxSegments >> node.level);

  // Create a sphere segment geometry for this node's region
  // We'll use a simplified approach: generate a patch on the sphere surface
  const geometry = new THREE.BufferGeometry();

  // Calculate the spherical region this node covers
  const center = node.center.clone().normalize();
  const theta = Math.atan2(center.z, center.x); // longitude
  const phi = Math.asin(THREE.MathUtils.clamp(center.y / radius, -1, 1)); // latitude

  // Size of patch in radians
  const patchSize = Math.PI / (Math.pow(2, node.level + 1));

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const v = i / segments;
    const lat = phi + (v - 0.5) * patchSize;

    for (let j = 0; j <= segments; j++) {
      const u = j / segments;
      const lon = theta + (u - 0.5) * patchSize;

      // Sample heightmap
      const uTex = (lon + Math.PI) / (2 * Math.PI);
      const vTex = 0.5 - lat / Math.PI;

      const x = Math.floor(uTex * heightmap.width) % heightmap.width;
      const y = Math.floor(vTex * heightmap.height) % heightmap.height;

      // Get height from image data (we'll need canvas for this)
      let height = 0;
      if (heightmap instanceof HTMLCanvasElement) {
        const ctx = heightmap.getContext('2d')!;
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        height = (pixel[0] / 255) * config.elevationScale;
      }

      const r = radius + height;
      const cosLat = Math.cos(lat);

      positions.push(
        r * cosLat * Math.cos(lon),
        r * Math.sin(lat),
        r * cosLat * Math.sin(lon)
      );

      uvs.push(uTex, vTex);
      normals.push(
        Math.cos(lat) * Math.cos(lon),
        Math.sin(lat),
        Math.cos(lat) * Math.sin(lon)
      );
    }
  }

  // Generate indices
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * (segments + 1) + j;
      const b = a + 1;
      const c = a + segments + 1;
      const d = c + 1;

      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();

  return geometry;
}

export function SurfaceTerrain({
  data,
  zoomLevel,
  camera,
  onRegionInfo,
}: SurfaceTerrainProps) {
  const { gl } = useThree();
  const config = HEIGHTMAP_CONFIGS[data.id];

  if (!config) {
    // No surface data available for this body
    return null;
  }

  const [heightmapLoaded, setHeightmapLoaded] = useState(false);
  const [heightmapCanvas, setHeightmapCanvas] = useState<HTMLCanvasElement | null>(null);
  const terrainRef = useRef<THREE.Group>(null);
  const meshesRef = useRef<Map<QuadtreeNode, THREE.Mesh>>(new Map());
  const quadtreeRef = useRef<QuadtreeNode | null>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const diffuseMapRef = useRef<THREE.Texture | null>(null);

  // Load heightmap and diffuse texture
  const heightmapImage = useLoader(THREE.TextureLoader, config.elevationUrl);
  const diffuseTextureRaw = useLoader(THREE.TextureLoader, data.visual?.textures?.diffuse || '');
  const diffuseTexture = Array.isArray(diffuseTextureRaw) ? diffuseTextureRaw[0] : diffuseTextureRaw;

  // Convert heightmap texture to canvas for pixel sampling
  useEffect(() => {
    if (!heightmapImage.image) return;

    const canvas = document.createElement('canvas');
    canvas.width = heightmapImage.image.width;
    canvas.height = heightmapImage.image.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(heightmapImage.image, 0, 0);
    setHeightmapCanvas(canvas);
    setHeightmapLoaded(true);
  }, [heightmapImage]);

  // Create material
  useEffect(() => {
    materialRef.current = new THREE.MeshStandardMaterial({
      map: diffuseTexture,
      roughness: 0.8,
      metalness: 0.1,
    });

    diffuseTexture.wrapS = THREE.RepeatWrapping;
    diffuseTexture.wrapT = THREE.RepeatWrapping;
    diffuseTexture.anisotropy = 16;

    return () => {
      materialRef.current?.dispose();
    };
  }, [diffuseTexture]);

  // Initialize quadtree
  useEffect(() => {
    if (!heightmapLoaded || !heightmapCanvas) return;

    quadtreeRef.current = createSphericalQuadtree(config.radius, config.lodLevels);

    // Generate initial meshes for visible nodes
    if (camera) {
      updateTerrainMeshes(camera);
    }

    return () => {
      // Cleanup meshes
      meshesRef.current.forEach(mesh => {
        mesh.geometry.dispose();
      });
      meshesRef.current.clear();
    };
  }, [heightmapLoaded, heightmapCanvas, camera]);

  // Update terrain LOD based on camera position
  const updateTerrainMeshes = useCallback((camera: THREE.Camera) => {
    if (!quadtreeRef.current || !heightmapCanvas || !materialRef.current || !terrainRef.current) return;

    const cameraPos = new THREE.Vector3();
    camera.getWorldPosition(cameraPos);

    // Transform camera position to body-local space
    if (terrainRef.current.parent) {
      terrainRef.current.parent.worldToLocal(cameraPos);
    }

    quadtreeRef.current.updateDistance(cameraPos);

    const visibleNodes = quadtreeRef.current.getVisibleNodes(
      cameraPos,
      config.radius * 10, // Max distance
      config.lodLevels
    );

    // Remove meshes for non-visible nodes
    const visibleSet = new Set(visibleNodes);
    meshesRef.current.forEach((mesh, node) => {
      if (!visibleSet.has(node)) {
        terrainRef.current?.remove(mesh);
        mesh.geometry.dispose();
        meshesRef.current.delete(node);
      }
    });

    // Add/update meshes for visible nodes
    visibleNodes.forEach(node => {
      let mesh = meshesRef.current.get(node);

      if (!mesh && materialRef.current) {
        const geometry = generateTerrainGeometry(node, heightmapCanvas, config, config.radius);
        mesh = new THREE.Mesh(geometry, materialRef.current);
        mesh.frustumCulled = true;
        terrainRef.current?.add(mesh);
        meshesRef.current.set(node, mesh);
      }
    });
  }, [config, heightmapCanvas]);

  // Update on each frame
  useFrame(() => {
    if (camera && heightmapLoaded && heightmapCanvas) {
      updateTerrainMeshes(camera);
    }

    // Check region under camera for info overlay
    if (onRegionInfo && camera && heightmapCanvas) {
      const cameraPos = new THREE.Vector3();
      camera.getWorldPosition(cameraPos);

      if (terrainRef.current?.parent) {
        terrainRef.current.parent.worldToLocal(cameraPos);
      }

      // Calculate lat/lon from camera position
      const localPos = cameraPos.clone().normalize();
      const lat = Math.asin(THREE.MathUtils.clamp(localPos.y, -1, 1)) * THREE.MathUtils.RAD2DEG;
      const lon = Math.atan2(localPos.z, localPos.x) * THREE.MathUtils.RAD2DEG;

      // Find nearest region
      let nearestRegion: SurfaceRegionInfo | null = null;
      let minDist = Infinity;

      config.regions.forEach(region => {
        const dLat = region.coordinates.lat - lat;
        const dLon = ((region.coordinates.lon - lon + 180) % 360) - 180;
        const dist = Math.sqrt(dLat * dLat + dLon * dLon);

        if (dist < minDist) {
          minDist = dist;
          nearestRegion = region;
        }
      });

      // Only show if close enough (within ~10 degrees)
      if (nearestRegion && minDist < 10) {
        onRegionInfo(nearestRegion);
      } else {
        onRegionInfo(null);
      }
    }
  });

  // Opacity based on zoom level - fade in as we approach surface
  const opacity = Math.max(0, Math.min(1, (zoomLevel - 0.3) / 0.7));

  if (!heightmapLoaded) return null;

  return (
    <group
      ref={terrainRef}
      scale={[config.radius, config.radius, config.radius]}
      rotation={[-data.physical.axialTilt, 0, 0]}
      visible={opacity > 0.01}
    >
      {/* Terrain meshes are added programmatically via updateTerrainMeshes */}
    </group>
  );
}

/** Surface info overlay component */
export function SurfaceInfoOverlay({
  regionInfo,
  zoomLevel
}: {
  regionInfo: SurfaceRegionInfo | null;
  zoomLevel: number;
}) {
  const opacity = zoomLevel > 0.5 ? Math.min(1, (zoomLevel - 0.5) * 2) : 0;

  if (!regionInfo || opacity < 0.01) return null;

  const typeIcons: Record<SurfaceRegionInfo['type'], string> = {
    landing_site: '🚀',
    crater: '🕳️',
    mountain: '🏔️',
    canyon: '🏞️',
    sea: '🌊',
    plain: '🌾',
    volcano: '🌋',
    pole: '🧊',
    region: '📍',
  };

  const typeLabels: Record<SurfaceRegionInfo['type'], string> = {
    landing_site: 'Landing Site',
    crater: 'Crater',
    mountain: 'Mountain',
    canyon: 'Canyon',
    sea: 'Sea/Mare',
    plain: 'Plain',
    volcano: 'Volcano',
    pole: 'Polar Region',
    region: 'Region',
  };

  return (
    <div
      className="surface-info-overlay"
      style={{ opacity, pointerEvents: 'none' }}
      role="region"
      aria-label={`Surface feature: ${regionInfo.name}`}
    >
      <div className="surface-info-card glass-panel">
        <div className="surface-info-header">
          <span className="surface-info-icon">{typeIcons[regionInfo.type]}</span>
          <div>
            <div className="surface-info-name">{regionInfo.name}</div>
            <div className="surface-info-type">{typeLabels[regionInfo.type]}</div>
          </div>
        </div>
        <div className="surface-info-description">{regionInfo.description}</div>
        <div className="surface-info-coords">
          Lat: {regionInfo.coordinates.lat.toFixed(4)}°
          {regionInfo.coordinates.lon >= 0 ? ' N' : ' S'}
          {' | '}
          Lon: {Math.abs(regionInfo.coordinates.lon).toFixed(4)}°
          {regionInfo.coordinates.lon >= 0 ? ' E' : ' W'}
          {' | '}
          Elev: {regionInfo.elevation >= 0 ? '+' : ''}{regionInfo.elevation.toLocaleString()} m
        </div>
      </div>
    </div>
  );
}