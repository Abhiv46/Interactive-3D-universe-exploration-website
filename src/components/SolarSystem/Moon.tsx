import { useRef, useMemo } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CelestialBodyData } from '../../types/orbitalElements';
import { calculatePosition } from '../../engine/KeplerianOrbit';
import { useLOD, MOON_LOD_CONFIG } from '../../hooks/useLOD';

interface MoonProps {
  body: CelestialBodyData;
  planet: CelestialBodyData;
  julianDate: number;
  timeScale: number;
  onClick: (object: {
    id: string;
    name: string;
    type: string;
    position: THREE.Vector3;
    data: CelestialBodyData;
  }) => void;
}

export function Moon({ body, planet, julianDate, timeScale, onClick }: MoonProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  // Load texture
  const textureMap = body.visual?.textures?.diffuse ? useLoader(THREE.TextureLoader, body.visual.textures.diffuse) : null;
  const normalMap = body.visual?.textures?.normal ? useLoader(THREE.TextureLoader, body.visual.textures.normal) : null;

  // Calculate position relative to planet
  const moonPosition = useMemo(() => {
    return calculatePosition(body.orbital!, julianDate);
  }, [body.orbital, julianDate]);

  // Planet position
  const planetPosition = useMemo(() => {
    return calculatePosition(planet.orbital!, julianDate);
  }, [planet.orbital, julianDate]);

  // World position = planet position + moon position
  const worldPosition = useMemo(() => {
    return new THREE.Vector3().addVectors(
      new THREE.Vector3(planetPosition[0], planetPosition[1], planetPosition[2]),
      new THREE.Vector3(moonPosition[0], moonPosition[1], moonPosition[2])
    );
  }, [planetPosition, moonPosition]);

  // LOD system
  const lodState = useLOD(MOON_LOD_CONFIG, camera.position, worldPosition, body.physical.radius);

  // Geometry based on LOD
  const geometry = useMemo(() => {
    const segments = lodState.currentDetail === 'high' ? 64 :
                     lodState.currentDetail === 'medium' ? 32 :
                     lodState.currentDetail === 'low' ? 16 : 8;
    return new THREE.SphereGeometry(1, segments, segments);
  }, [lodState.currentDetail]);

  // Material
  const material = useMemo(() => {
    const baseColor = body.visual?.baseColor ? new THREE.Color(body.visual.baseColor) : new THREE.Color(0xaaaaaa);

    const mat = new THREE.MeshStandardMaterial({
      map: textureMap,
      normalMap: normalMap,
      color: baseColor,
      roughness: 0.9,
      metalness: 0.05,
    });

    if (textureMap) {
      textureMap.wrapS = THREE.RepeatWrapping;
      textureMap.wrapT = THREE.RepeatWrapping;
      textureMap.anisotropy = 16;
    }
    if (normalMap) {
      normalMap.wrapS = THREE.RepeatWrapping;
      normalMap.wrapT = THREE.RepeatWrapping;
    }

    return mat;
  }, [textureMap, normalMap, body.visual, lodState.currentDetail]);

  // Rotation animation
  useFrame((_state, delta) => {
    if (!meshRef.current) return;

    const rotationPeriod = body.physical.rotationPeriod;
    if (rotationPeriod > 0) {
      const angularSpeed = (2 * Math.PI / rotationPeriod) * timeScale;
      meshRef.current.rotation.y += angularSpeed * delta;
    }
  });

  // Handle click
  const handleClick = () => {
    onClick({
      id: body.id,
      name: body.name,
      type: body.type,
      position: meshRef.current?.getWorldPosition(new THREE.Vector3()) || worldPosition,
      data: body,
    });
  };

  const visualScale = 1; // Default visual scale

  if (!lodState.shouldRender) return null;

  return (
    <group
      position={[worldPosition.x, worldPosition.y, worldPosition.z]}
      rotation={[-body.physical.axialTilt, 0, 0]}
      scale={lodState.currentDetail === 'point' ? [1, 1, 1] : [visualScale, visualScale, visualScale]}
    >
      {/* Main moon mesh */}
      {lodState.currentDetail !== 'billboard' && lodState.currentDetail !== 'point' && (
        <mesh
          ref={meshRef}
          geometry={geometry}
          material={material}
          scale={[body.physical.radius, body.physical.radius, body.physical.radius]}
          onClick={handleClick}
          renderOrder={20}
          castShadow
          receiveShadow
        />
      )}

      {/* Billboard for distant rendering */}
      {lodState.currentDetail === 'billboard' && textureMap && (
        <BillboardMoon
          texture={textureMap}
          color={body.visual?.baseColor}
          size={body.physical.radius * visualScale}
          position={worldPosition}
          onClick={handleClick}
        />
      )}

      {/* Point for very distant rendering */}
      {lodState.currentDetail === 'point' && (
        <PointMoon
          color={body.visual?.baseColor}
          size={Math.max(body.physical.radius * visualScale * 1e-6, 5)}
          position={worldPosition}
          onClick={handleClick}
        />
      )}
    </group>
  );
}

// Billboard moon for medium distance
function BillboardMoon({
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
      renderOrder={10}
    />
  );
}

// Point moon for very far distance
function PointMoon({
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
    opacity: 0.7,
  }), [color, size]);

  return (
    <points
      geometry={geometry}
      material={material}
      position={[position.x, position.y, position.z]}
      onClick={onClick}
      renderOrder={5}
    />
  );
}