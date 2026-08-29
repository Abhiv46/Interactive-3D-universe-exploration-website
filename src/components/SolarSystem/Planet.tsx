import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CelestialBodyData } from '../../types/orbitalElements';
import { calculatePosition } from '../../engine/KeplerianOrbit';
import { useLOD, PLANET_LOD_CONFIG, getLODSegments } from '../../hooks/useLOD';
import { SurfaceTerrain, SurfaceRegionInfo } from '../../components/SurfaceTerrain';
import { useSurfaceZoom, useSurfaceCameraControls } from '../../hooks/useSurfaceZoom';
import { createAtmosphereMaterial, getAtmosphereScale, hasAtmosphereConfig } from '../../shaders/AtmosphereShader';
import { createTerminatorMaterial, updateTerminatorUniforms, TERMINATOR_CONFIGS } from '../../shaders/TerminatorShader';
import { createAuroraMaterial, updateAuroraUniforms, getSimulatedSolarActivity, AURORA_CONFIGS } from '../../shaders/AuroraShader';
import { useSettings } from '@/context/SettingsContext';
import { useLoading } from '@/components/UI/LoadingScreen';
import { useSafeTextureLoader } from '@/hooks/useTextureLoader';

interface PlanetProps {
  body: CelestialBodyData;
  julianDate: number;
  timeScale: number;
  onClick: (object: {
    id: string;
    name: string;
    type: string;
    position: THREE.Vector3;
    data: CelestialBodyData;
  }) => void;
  visualScale?: number;
  trueScale?: boolean;
  showOrbit?: boolean;
  moons?: CelestialBodyData[];
  moonVisualScale?: number;
}

export function Planet({ body, julianDate, timeScale, onClick, visualScale = 1, trueScale = false, showOrbit = true, moons = [], moonVisualScale = 1 }: PlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const ringsRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const { settings } = useSettings();
  const { onTextureLoad, onShaderLoad } = useLoading();

  // Calculate position from orbital elements
  const position = useMemo(() => {
    const pos = calculatePosition(body.orbital!, julianDate);
    return new THREE.Vector3(pos[0], pos[1], pos[2]);
  }, [body.orbital, julianDate]);

  // Surface zoom state
  const { state: surfaceState, hasSurfaceData, getSurfaceZoomState, updateZoomFromDistance } = useSurfaceZoom();
  const surfaceZoom = getSurfaceZoomState(body);
  const [surfaceRegion, setSurfaceRegion] = useState<SurfaceRegionInfo | null>(null);

  // Update zoom level based on camera distance
  useFrame(() => {
    if (camera && surfaceZoom.isActive) {
      const cameraPos = new THREE.Vector3();
      camera.getWorldPosition(cameraPos);
      const distance = cameraPos.distanceTo(position);
      updateZoomFromDistance(body, distance);
    }
  });

  // Load textures with progress reporting and fallback
  const textureMap = useSafeTextureLoader(body.visual?.textures?.diffuse, body.visual?.baseColor);
  const normalMap = useSafeTextureLoader(body.visual?.textures?.normal, body.visual?.baseColor);
  const specularMap = useSafeTextureLoader(body.visual?.textures?.specular, body.visual?.baseColor);
  const cloudMap = useSafeTextureLoader(body.visual?.textures?.clouds, body.visual?.baseColor);

  // LOD system
  const lodState = useLOD(PLANET_LOD_CONFIG, camera.position, position, body.physical.radius);

  // Current detail level
  const [detailLevel, setDetailLevel] = useState(lodState.currentDetail);

  useEffect(() => {
    setDetailLevel(lodState.currentDetail);
  }, [lodState.currentDetail]);

  // Geometry based on LOD
  const geometry = useMemo(() => {
    const segments = getLODSegments(detailLevel, 128);
    return new THREE.SphereGeometry(1, segments, segments);
  }, [detailLevel]);

  // Material based on LOD and body properties
  const material = useMemo(() => {
    const baseColor = body.visual?.baseColor ? new THREE.Color(body.visual.baseColor) : new THREE.Color(0x888888);
    const emissiveColor = body.visual?.emissiveColor ? new THREE.Color(body.visual.emissiveColor) : new THREE.Color(0x000000);
    const emissiveIntensity = body.visual?.emissiveIntensity ?? 0;

    const mat = new THREE.MeshStandardMaterial({
      map: textureMap,
      normalMap: normalMap,
      roughnessMap: specularMap,
      color: baseColor,
      emissive: emissiveColor,
      emissiveIntensity,
      roughness: 0.8,
      metalness: 0.1,
    });

    // Configure texture wrapping
    if (textureMap) {
      textureMap.wrapS = THREE.RepeatWrapping;
      textureMap.wrapT = THREE.RepeatWrapping;
      textureMap.anisotropy = 16;
    }
    if (normalMap) {
      normalMap.wrapS = THREE.RepeatWrapping;
      normalMap.wrapT = THREE.RepeatWrapping;
    }
    if (specularMap) {
      specularMap.wrapS = THREE.RepeatWrapping;
      specularMap.wrapT = THREE.RepeatWrapping;
    }

    return mat;
  }, [textureMap, normalMap, specularMap, body.visual, detailLevel]);

  // Atmosphere - use Fresnel shader for bodies with config, fallback to old material
  const atmosphereGeometry = useMemo(() => {
    const scale = hasAtmosphereConfig(body.id) ? getAtmosphereScale(body.id) : 1.02;
    return new THREE.SphereGeometry(scale, 64, 64);
  }, [body.id]);
  const atmosphereMaterial = useMemo(() => {
    // Use new Fresnel shader if config exists
    if (hasAtmosphereConfig(body.id)) {
      const material = createAtmosphereMaterial(body.id);
      // Track shader compilation
      if (onShaderLoad) onShaderLoad(`atmosphere-${body.id}`);
      return material;
    }
    // Fallback for bodies without specific config but with hasAtmosphere flag
    if (!body.visual?.hasAtmosphere) return undefined;

    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(body.visual.atmosphereColor || '#4488ff'),
      transparent: true,
      opacity: body.visual.atmosphereDensity ?? 0.1,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [body.id, body.visual]);

  // Rings (for Saturn-like planets)
  const hasRings = body.visual?.rings && body.visual.rings.innerRadius > 0;
  const ringGeometry = useMemo(() => {
    if (!hasRings) return null;
    const inner = body.visual.rings!.innerRadius / body.physical.radius;
    const outer = body.visual.rings!.outerRadius / body.physical.radius;
    return new THREE.RingGeometry(inner, outer, 128);
  }, [hasRings, body.visual?.rings, body.physical.radius]);

  const ringMaterial = useMemo(() => {
    if (!hasRings || !body.visual?.rings) return null;

    const ringTexture = useSafeTextureLoader(body.visual.rings.texture, body.visual.rings.color);

    return new THREE.MeshBasicMaterial({
      map: ringTexture,
      color: new THREE.Color(body.visual.rings.color || '#cccccc'),
      transparent: true,
      opacity: body.visual.rings.opacity ?? 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, [hasRings, body.visual?.rings]);

  // Cloud layer (for Earth, Venus, etc.)
  const hasClouds = !!body.visual?.textures?.clouds;
  const cloudGeometry = useMemo(() => new THREE.SphereGeometry(1.005, 64, 64), []);
  const cloudMaterial = useMemo(() => {
    if (!hasClouds || !cloudMap) return undefined;
    return new THREE.MeshStandardMaterial({
      map: cloudMap,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
  }, [hasClouds, cloudMap]);

  // Terminator shader (day/night with city lights for Earth)
  const hasTerminator = body.id in TERMINATOR_CONFIGS;
  const terminatorMaterial = useMemo(() => {
    if (!hasTerminator || !textureMap) return null;
    const material = createTerminatorMaterial(body.id, textureMap, textureMap, null);
    // Track shader compilation
    if (onShaderLoad) onShaderLoad(`terminator-${body.id}`);
    return material;
  }, [body.id, textureMap, hasTerminator, onShaderLoad]);

  // Update terminator uniforms with sun position
  useFrame(() => {
    if (terminatorMaterial) {
      // Get sun position (at origin in our coordinate system)
      const sunPosition = new THREE.Vector3(0, 0, 0);
      updateTerminatorUniforms(terminatorMaterial, sunPosition, position);
    }
  });

  // Aurora effect (Earth only)
  const hasAurora = body.id in AURORA_CONFIGS && settings.showAurora;
  const auroraNorthRef = useRef<THREE.Mesh | null>(null);
  const auroraSouthRef = useRef<THREE.Mesh | null>(null);
  const auroraGeometryRef = useRef<THREE.SphereGeometry | null>(null);

  // Create aurora meshes
  useEffect(() => {
    if (!hasAurora) return;

    const config = AURORA_CONFIGS[body.id];
    const geometry = new THREE.SphereGeometry(config.scale, 128, 64, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.3); // Polar cap
    auroraGeometryRef.current = geometry;

    // North pole aurora
    const northMaterial = createAuroraMaterial(body.id, 'north', 0);
    // Track shader compilation
    if (onShaderLoad) onShaderLoad(`aurora-${body.id}-north`);
    const northMesh = new THREE.Mesh(geometry, northMaterial);
    northMesh.renderOrder = 15;
    auroraNorthRef.current = northMesh;

    // South pole aurora
    const southMaterial = createAuroraMaterial(body.id, 'south', 0);
    if (onShaderLoad) onShaderLoad(`aurora-${body.id}-south`);
    const southMesh = new THREE.Mesh(geometry, southMaterial);
    southMesh.renderOrder = 15;
    auroraSouthRef.current = southMesh;

    return () => {
      geometry.dispose();
      northMaterial.dispose();
      southMaterial.dispose();
      auroraNorthRef.current = null;
      auroraSouthRef.current = null;
      auroraGeometryRef.current = null;
    };
  }, [hasAurora, body.id, settings.showAurora, onShaderLoad]);

  // Update aurora animation
  useFrame((_, delta) => {
    if (!hasAurora) return;

    // Accumulate time for smooth animation
    const elapsedTime = (performance.now() / 1000) * timeScale * 0.001; // Slow down for visual effect
    const solarActivity = getSimulatedSolarActivity(julianDate);

    if (auroraNorthRef.current) {
      updateAuroraUniforms(auroraNorthRef.current.material as THREE.ShaderMaterial, elapsedTime, solarActivity);
    }
    if (auroraSouthRef.current) {
      updateAuroraUniforms(auroraSouthRef.current.material as THREE.ShaderMaterial, elapsedTime, solarActivity);
    }
  });

  // Rotation animation
  useFrame((_state, delta) => {
    if (!meshRef.current) return;

    // Axial rotation
    const rotationPeriod = body.physical.rotationPeriod; // seconds
    if (rotationPeriod > 0) {
      const angularSpeed = (2 * Math.PI / rotationPeriod) * timeScale;
      meshRef.current.rotation.y += angularSpeed * delta;
      if (atmosphereRef.current) atmosphereRef.current.rotation.y = meshRef.current.rotation.y;
      if (cloudsRef.current) cloudsRef.current.rotation.y = meshRef.current.rotation.y * 1.02; // Clouds move slightly faster
    }

    // Ring rotation (if present)
    if (ringsRef.current && body.visual?.rings) {
      const ringRotationPeriod = body.visual.rings.rotationPeriod ?? rotationPeriod;
      if (ringRotationPeriod > 0) {
        const angularSpeed = (2 * Math.PI / ringRotationPeriod) * timeScale;
        ringsRef.current.rotation.z += angularSpeed * delta * 0.1; // Slower ring rotation
      }
    }
  });

  // Handle click
  const handleClick = (event: any) => {
    if (event.stopPropagation) event.stopPropagation();
    onClick({
      id: body.id,
      name: body.name,
      type: body.type,
      position: meshRef.current?.getWorldPosition(new THREE.Vector3()) || new THREE.Vector3(),
      data: body,
    });
  };

  // Scale for visual size (not to physical scale at system level)
  const visualScale = body.visual?.scaleFactor || 1;

  if (!lodState.shouldRender) return null;

  return (
    <group
      position={[position.x, position.y, position.z]}
      rotation={[-body.physical.axialTilt, 0, 0]}
      scale={lodState.currentDetail === 'point' ? [1, 1, 1] : [visualScale, visualScale, visualScale]}
    >
      {/* Main planet mesh - fade out as surface terrain fades in */}
      {detailLevel !== 'billboard' && detailLevel !== 'point' && (
        <mesh
          ref={meshRef}
          geometry={geometry}
          material={material}
          scale={[body.physical.radius, body.physical.radius, body.physical.radius]}
          onClick={handleClick}
          renderOrder={10}
          castShadow
          receiveShadow
          opacity={surfaceZoom.isActive ? 1 - surfaceZoom.zoomLevel : 1}
        />
      )}

      {/* Cloud layer - fade out with surface zoom */}
      {hasClouds && detailLevel === 'high' && (
        <mesh
          ref={cloudsRef}
          geometry={cloudGeometry}
          material={cloudMaterial}
          scale={[body.physical.radius, body.physical.radius, body.physical.radius]}
          renderOrder={11}
          opacity={surfaceZoom.isActive ? 1 - surfaceZoom.zoomLevel : 1}
        />
      )}

      {/* Atmosphere - fade out with surface zoom */}
      {atmosphereMaterial && detailLevel !== 'point' && (
        <mesh
          ref={atmosphereRef}
          geometry={atmosphereGeometry}
          material={atmosphereMaterial}
          scale={[body.physical.radius, body.physical.radius, body.physical.radius]}
          renderOrder={12}
          opacity={surfaceZoom.isActive ? 1 - surfaceZoom.zoomLevel : 1}
        />
      )}

      {/* Terminator (day/night) - for Earth, Moon, Mars */}
      {terminatorMaterial && detailLevel !== 'point' && (
        <mesh
          geometry={geometry}
          material={terminatorMaterial}
          scale={[body.physical.radius, body.physical.radius, body.physical.radius]}
          renderOrder={12}
          opacity={surfaceZoom.isActive ? 1 - surfaceZoom.zoomLevel : 1}
        />
      )}

      {/* Rings - fade out with surface zoom */}
      {hasRings && ringGeometry && ringMaterial && (
        <mesh
          ref={ringsRef}
          geometry={ringGeometry}
          material={ringMaterial}
          scale={[body.physical.radius, body.physical.radius, body.physical.radius]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={13}
          opacity={surfaceZoom.isActive ? 1 - surfaceZoom.zoomLevel : 1}
        />
      )}

      {/* Aurora - Earth's poles */}
      {hasAurora && detailLevel === 'high' && auroraGeometryRef.current && (
        <>
          {auroraNorthRef.current && (
            <mesh
              geometry={auroraGeometryRef.current}
              material={auroraNorthRef.current.material}
              scale={[body.physical.radius, body.physical.radius, body.physical.radius}}
              rotation={[-Math.PI / 2, 0, 0]}
              renderOrder={15}
              opacity={surfaceZoom.isActive ? 1 - surfaceZoom.zoomLevel : 1}
            />
          )}
          {auroraSouthRef.current && (
            <mesh
              geometry={auroraGeometryRef.current}
              material={auroraSouthRef.current.material}
              scale={[body.physical.radius, body.physical.radius, body.physical.radius}}
              rotation={[Math.PI / 2, 0, 0]}
              renderOrder={15}
              opacity={surfaceZoom.isActive ? 1 - surfaceZoom.zoomLevel : 1}
            />
          )}
        </>
      )}

      {/* Billboard for distant rendering */}
      {detailLevel === 'billboard' && textureMap && (
        <BillboardPlanet
          texture={textureMap}
          color={body.visual?.baseColor}
          size={body.physical.radius * visualScale}
          position={position}
          onClick={handleClick}
        />
      )}

      {/* Point for very distant rendering */}
      {detailLevel === 'point' && (
        <PointPlanet
          color={body.visual?.baseColor}
          size={Math.max(body.physical.radius * visualScale * 1e-6, 10)}
          position={position}
          onClick={handleClick}
        />
      )}

      {/* Surface terrain for Earth, Moon, Mars */}
      {hasSurfaceData(body) && surfaceZoom.isActive && (
        <SurfaceTerrain
          data={body}
          zoomLevel={surfaceZoom.zoomLevel}
          camera={camera}
          onRegionInfo={setSurfaceRegion}
        />
      )}
    </group>
  );
}

// Billboard planet for medium distance
function BillboardPlanet({
  texture,
  color,
  size,
  position,
  onClick
}: {
  texture: THREE.Texture;
  color?: string;
  size: number;
  position: THREE.Vector3;
  onClick: (event: THREE.Intersection) => void;
}) {
  const { camera } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => new THREE.PlaneGeometry(2, 2), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    map: texture,
    color: new THREE.Color(color || 0xffffff),
    transparent: true,
    alphaTest: 0.1,
    depthWrite: false,
  }), [texture, color]);

  // Always face camera
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.lookAt(camera.position);
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      scale={[size, size, size]}
      position={[position.x, position.y, position.z]}
      onClick={onClick}
      renderOrder={5}
    />
  );
}

// Point planet for very far distance
function PointPlanet({
  color,
  size,
  position,
  onClick
}: {
  color?: string;
  size: number;
  position: THREE.Vector3;
  onClick: (event: THREE.Intersection) => void;
}) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
    return geo;
  }, []);

  const material = useMemo(() => new THREE.PointsMaterial({
    color: new THREE.Color(color || 0xffffff),
    size: size,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.8,
  }), [color, size]);

  return (
    <points
      geometry={geometry}
      material={material}
      position={[position.x, position.y, position.z]}
      onClick={onClick}
      renderOrder={1}
    />
  );
}