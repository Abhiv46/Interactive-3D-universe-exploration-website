import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CONSTELLATIONS, CONSTELLATIONS_BY_ID } from '../../data/constellations';
import { BRIGHT_STARS } from '../../data/stars';

interface ConstellationsProps {
  enabled?: boolean;
  opacity?: number;
}

export function Constellations({ enabled = true, opacity = 0.5 }: ConstellationsProps) {
  const linesRef = useRef<THREE.LineSegments>(null);
  const { camera } = useThree();

  // Build constellation line data
  const constellationData = useMemo(() => {
    // Use properName + constellation as key, fallback to hipId string
    const starMap = new Map(BRIGHT_STARS.map(s => [
      s.properName?.toLowerCase() || s.bayer?.toLowerCase() || s.hipId.toString(), s
    ]));
    const lineData: Array<{
      from: THREE.Vector3;
      to: THREE.Vector3;
      constellationId: string;
    }> = [];

    for (const constellation of CONSTELLATIONS) {
      for (const line of constellation.lines) {
        const fromStar = starMap.get(line.from.toLowerCase());
        const toStar = starMap.get(line.to.toLowerCase());

        if (fromStar && toStar) {
          const fromPos = starToCartesian(fromStar);
          const toPos = starToCartesian(toStar);
          lineData.push({
            from: fromPos,
            to: toPos,
            constellationId: constellation.id,
          });
        }
      }
    }

    return lineData;
  }, []);

  // Create line geometry
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = constellationData.length;
    const positions = new Float32Array(count * 6); // 2 points per line, 3 coords each
    const constellationIds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const line = constellationData[i];
      positions[i * 6] = line.from.x;
      positions[i * 6 + 1] = line.from.y;
      positions[i * 6 + 2] = line.from.z;
      positions[i * 6 + 3] = line.to.x;
      positions[i * 6 + 4] = line.to.y;
      positions[i * 6 + 5] = line.to.z;
      constellationIds[i] = i;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('constellationId', new THREE.BufferAttribute(constellationIds, 1));
    geo.computeBoundingSphere();

    return geo;
  }, [constellationData]);

  // Line material with custom shader for smooth fading
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: opacity },
      uCameraPosition: { value: new THREE.Vector3() },
      uEnabled: { value: enabled ? 1.0 : 0.0 },
      uTime: { value: 0 },
    },
    vertexShader: `
      attribute float constellationId;
      varying float vConstellationId;
      varying float vAlpha;

      uniform float uOpacity;
      uniform vec3 uCameraPosition;
      uniform float uEnabled;

      void main() {
        vConstellationId = constellationId;
        vAlpha = uEnabled * uOpacity;

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying float vConstellationId;
      varying float vAlpha;

      void main() {
        if (vAlpha <= 0.0) discard;
        gl_FragColor = vec4(0.6, 0.7, 1.0, vAlpha * 0.5);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), [enabled, opacity]);

  // Update uniforms
  useFrame((state) => {
    if (linesRef.current) {
      (linesRef.current.material as THREE.ShaderMaterial).uniforms.uCameraPosition.value.copy(camera.position);
      (linesRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  if (!enabled) return null;

  return (
    <group renderOrder={-5}>
      <lineSegments
        ref={linesRef}
        geometry={geometry}
        material={material}
        frustumCulled={true}
      />
    </group>
  );
}

// Convert star data to Cartesian coordinates (same as StarField)
function starToCartesian(star: { ra: number; dec: number; distance: number }): THREE.Vector3 {
  const distance = star.distance * 3.086e16; // parsecs to meters
  const ra = star.ra * Math.PI / 180;
  const dec = star.dec * Math.PI / 180;

  return new THREE.Vector3(
    distance * Math.cos(dec) * Math.cos(ra),
    distance * Math.sin(dec),
    distance * Math.cos(dec) * Math.sin(ra)
  );
}

// Constellation label component (for future use)
interface ConstellationLabelProps {
  constellationId: string;
  position: THREE.Vector3;
}

export function ConstellationLabel({ constellationId, position: _position }: ConstellationLabelProps) {
  const constellation = CONSTELLATIONS_BY_ID[constellationId];
  if (!constellation) return null;

  // Would render HTML label via @react-three/drei Html
  return null;
}