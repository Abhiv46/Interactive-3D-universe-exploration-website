import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { BRIGHT_STARS, generateAdditionalStars, filterStarsByMagnitude, bvToColor, magnitudeToPointSize } from '../../data/stars';

interface StarFieldProps {
  maxStars?: number;
  magnitudeLimit?: number;
}

export function StarField({ maxStars = 100000, magnitudeLimit = 8 }: StarFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const { camera } = useThree();

  // Generate star data
  const starData = useMemo(() => {
    const brightStars = filterStarsByMagnitude(BRIGHT_STARS, magnitudeLimit);
    const additionalStars = generateAdditionalStars(Math.max(0, maxStars - brightStars.length));
    return [...brightStars, ...additionalStars].slice(0, maxStars);
  }, [maxStars, magnitudeLimit]);

  // Create instanced geometry for stars
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = starData.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const magnitudes = new Float32Array(count);
    const temperatures = new Float32Array(count);
    const ids = new Float32Array(count);

    // Convert spherical coordinates (RA, Dec, distance) to Cartesian
    for (let i = 0; i < count; i++) {
      const star = starData[i];
      const distance = star.distance * 3.086e16; // parsecs to meters
      const ra = star.ra * Math.PI / 180;
      const dec = star.dec * Math.PI / 180;

      // Convert to Cartesian (equatorial coordinates)
      // x = distance * cos(dec) * cos(ra)
      // y = distance * sin(dec)
      // z = distance * cos(dec) * sin(ra)
      positions[i * 3] = distance * Math.cos(dec) * Math.cos(ra);
      positions[i * 3 + 1] = distance * Math.sin(dec);
      positions[i * 3 + 2] = distance * Math.cos(dec) * Math.sin(ra);

      // Color from B-V index
      const color = bvToColor(star.bvIndex);
      colors[i * 3] = color[0];
      colors[i * 3 + 1] = color[1];
      colors[i * 3 + 2] = color[2];

      // Size based on magnitude
      sizes[i] = magnitudeToPointSize(star.vMag);

      magnitudes[i] = star.vMag;
      temperatures[i] = star.temperature || 5778;
      ids[i] = i;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('magnitude', new THREE.BufferAttribute(magnitudes, 1));
    geo.setAttribute('temperature', new THREE.BufferAttribute(temperatures, 1));
    geo.setAttribute('starId', new THREE.BufferAttribute(ids, 1));

    // Bounding sphere for frustum culling
    geo.computeBoundingSphere();

    return geo;
  }, [starData]);

  // Custom star shader material
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uCameraPosition: { value: new THREE.Vector3() },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      uMagnitudeLimit: { value: magnitudeLimit },
      uPixelRatio: { value: window.devicePixelRatio },
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      attribute float magnitude;
      attribute float temperature;
      attribute float starId;

      varying vec3 vColor;
      varying float vMagnitude;
      varying float vTemperature;
      varying float vStarId;
      varying float vSize;
      varying vec3 vPosition;

      uniform float uTime;
      uniform vec3 uCameraPosition;
      uniform float uMagnitudeLimit;
      uniform float uPixelRatio;

      void main() {
        vColor = color;
        vMagnitude = magnitude;
        vTemperature = temperature;
        vStarId = starId;
        vPosition = position;

        // Calculate distance from camera
        float dist = length(position - uCameraPosition);

        // Size attenuation with magnitude-based scaling
        // Brighter stars (lower magnitude) appear larger
        float magFactor = pow(2.512, 6.0 - magnitude); // Relative brightness
        float baseSize = size * magFactor * 100.0;
        float attenuatedSize = baseSize * (1.0 / max(dist * 0.0001, 1.0));

        // Pulsation for variable stars (subtle)
        float pulse = 1.0 + sin(uTime * 10.0 + starId * 100.0) * 0.02;

        vSize = attenuatedSize * pulse * uPixelRatio;

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = vSize;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vMagnitude;
      varying float vTemperature;
      varying float vStarId;
      varying float vSize;
      varying vec3 vPosition;

      uniform float uMagnitudeLimit;

      void main() {
        // Circular star shape with soft edges
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);

        if (dist > 0.5) discard;

        // Gaussian-like falloff for realistic star appearance
        float intensity = 1.0 - smoothstep(0.0, 0.5, dist);
        intensity = pow(intensity, 2.0);

        // Color temperature effect
        vec3 starColor = vColor;

        // Add diffraction spikes for bright stars
        float spike = 0.0;
        if (vMagnitude < 2.0) {
          float angle = atan(center.y, center.x);
          for (int i = 0; i < 4; i++) {
            float spikeAngle = float(i) * 3.14159 / 2.0;
            float diff = abs(angle - spikeAngle);
            diff = min(diff, 6.28318 - diff);
            spike += smoothstep(0.02, 0.0, diff) * 0.1 * (2.0 - vMagnitude) / 2.0;
          }
        }

        // Combine color with intensity
        vec3 finalColor = starColor * intensity + vec3(spike);

        // HDR output
        gl_FragColor = vec4(finalColor, intensity);
      }
    `,
    transparent: true,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), [magnitudeLimit]);

  // Update uniforms
  useFrame((state) => {
    if (pointsRef.current) {
      const mat = pointsRef.current.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = state.clock.getElapsedTime();
      mat.uniforms.uCameraPosition.value.copy(camera.position);
    }
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (pointsRef.current) {
        const mat = pointsRef.current.material as THREE.ShaderMaterial;
        mat.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
        mat.uniforms.uPixelRatio.value = window.devicePixelRatio;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      renderOrder={-10} // Render behind everything
      frustumCulled={true}
    />
  );
}

// Star field statistics
export const STAR_FIELD_STATS = {
  catalogStars: BRIGHT_STARS.length,
  maxProceduralStars: 100000,
};