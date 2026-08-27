import * as THREE from 'three';

/**
 * Terminator shader for Earth day/night transition
 * Includes procedural city lights on night side
 */

export const terminatorVertexShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewDir;
  varying vec2 vUv;

  uniform vec3 sunDirection;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vViewDir = normalize(cameraPosition - vWorldPosition);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const terminatorFragmentShader = `
  uniform vec3 sunDirection;
  uniform sampler2D dayTexture;
  uniform sampler2D nightTexture;
  uniform sampler2D cityLightsTexture;
  uniform float terminatorWidth;
  uniform float cityLightsIntensity;
  uniform float atmosphereGlow;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewDir;
  varying vec2 vUv;

  // Hash function for procedural noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  // Value noise
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  // FBM noise for city lights variation
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    // Normalize sun direction
    vec3 sunDir = normalize(sunDirection);
    vec3 normal = normalize(vNormal);

    // Dot product determines day/night
    float ndotl = dot(normal, sunDir);

    // Terminator zone (twilight region)
    float terminatorFactor = smoothstep(-terminatorWidth, terminatorWidth, ndotl);

    // Day side texture
    vec3 dayColor = texture2D(dayTexture, vUv).rgb;

    // Night side base color (darkened day texture)
    vec3 nightBase = dayColor * 0.15;

    // Procedural city lights
    // Use UV coordinates scaled up for city detail
    vec2 cityUv = vUv * 200.0;
    float cityNoise = fbm(cityUv);
    float cityMask = step(0.97, cityNoise); // Sparse cities

    // Add some clustering for city groups
    vec2 clusterUv = vUv * 50.0;
    float clusterNoise = fbm(clusterUv);
    cityMask *= step(0.3, clusterNoise);

    // Only on night side
    cityMask *= smoothstep(0.0, -0.1, ndotl);

    // City lights color (warm yellow/orange)
    vec3 cityColor = vec3(1.0, 0.85, 0.6) * cityLightsIntensity;
    vec3 cityGlow = cityColor * cityMask * 3.0;

    // If city lights texture is provided, use it
    vec3 textureCityLights = vec3(0.0);
    #ifdef USE_CITY_LIGHTS_TEXTURE
    textureCityLights = texture2D(cityLightsTexture, vUv).rgb * cityLightsIntensity * 2.0;
    #endif

    // Combine city lights
    vec3 finalCityLights = cityGlow + textureCityLights;

    // Atmosphere glow at terminator
    float atmoGlow = pow(1.0 - abs(ndotl), 3.0) * atmosphereGlow;
    vec3 atmoColor = vec3(0.3, 0.5, 1.0) * atmoGlow; // Blue twilight glow

    // Final color blend
    vec3 color = mix(nightBase + finalCityLights + atmoColor, dayColor, terminatorFactor);

    // Add subtle specular highlight on day side (ocean reflection)
    float specular = 0.0;
    if (ndotl > 0.0) {
      vec3 reflectDir = reflect(-sunDir, normal);
      float viewDotReflect = max(0.0, dot(vViewDir, reflectDir));
      specular = pow(viewDotReflect, 32.0) * 0.5 * ndotl;
    }

    color += vec3(specular);

    gl_FragColor = vec4(color, 1.0);
  }
`;

/**
 * Simplified terminator shader for bodies without city lights
 */
export const simpleTerminatorFragmentShader = `
  uniform vec3 sunDirection;
  uniform sampler2D dayTexture;
  uniform sampler2D nightTexture;
  uniform float terminatorWidth;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewDir;
  varying vec2 vUv;

  void main() {
    vec3 sunDir = normalize(sunDirection);
    vec3 normal = normalize(vNormal);

    float ndotl = dot(normal, sunDir);
    float terminatorFactor = smoothstep(-terminatorWidth, terminatorWidth, ndotl);

    vec3 dayColor = texture2D(dayTexture, vUv).rgb;
    vec3 nightColor = texture2D(nightTexture, vUv).rgb;

    vec3 color = mix(nightColor, dayColor, terminatorFactor);

    // Atmosphere glow at terminator
    float atmoGlow = pow(1.0 - abs(ndotl), 3.0) * 0.15;
    color += vec3(0.3, 0.5, 1.0) * atmoGlow;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export interface TerminatorParams {
  terminatorWidth: number;
  cityLightsIntensity: number;
  atmosphereGlow: number;
  useCityLightsTexture: boolean;
}

export const TERMINATOR_CONFIGS: Record<string, TerminatorParams> = {
  earth: {
    terminatorWidth: 0.02,
    cityLightsIntensity: 1.5,
    atmosphereGlow: 0.2,
    useCityLightsTexture: false, // Procedural for now
  },
  moon: {
    terminatorWidth: 0.01, // Sharp terminator (no atmosphere)
    cityLightsIntensity: 0.0,
    atmosphereGlow: 0.0,
    useCityLightsTexture: false,
  },
  mars: {
    terminatorWidth: 0.015,
    cityLightsIntensity: 0.0,
    atmosphereGlow: 0.05,
    useCityLightsTexture: false,
  },
};

/**
 * Creates a terminator material for a body
 */
export function createTerminatorMaterial(
  bodyId: string,
  dayTexture: THREE.Texture | null,
  nightTexture: THREE.Texture | null,
  cityLightsTexture: THREE.Texture | null
): THREE.ShaderMaterial | null {
  const config = TERMINATOR_CONFIGS[bodyId];
  if (!config) return null;

  const defines: Record<string, string> = {};
  if (config.useCityLightsTexture && cityLightsTexture) {
    defines.USE_CITY_LIGHTS_TEXTURE = '1';
  }

  const fragmentShader = bodyId === 'earth' ? terminatorFragmentShader : simpleTerminatorFragmentShader;

  return new THREE.ShaderMaterial({
    vertexShader: terminatorVertexShader,
    fragmentShader,
    defines,
    uniforms: {
      sunDirection: { value: new THREE.Vector3(1, 0, 0) },
      dayTexture: { value: dayTexture },
      nightTexture: { value: nightTexture || dayTexture },
      cityLightsTexture: { value: cityLightsTexture },
      terminatorWidth: { value: config.terminatorWidth },
      cityLightsIntensity: { value: config.cityLightsIntensity },
      atmosphereGlow: { value: config.atmosphereGlow },
    },
  });
}

/**
 * Updates terminator material uniforms based on Sun position
 */
export function updateTerminatorUniforms(
  material: THREE.ShaderMaterial,
  sunPosition: THREE.Vector3,
  bodyPosition: THREE.Vector3
): void {
  const sunDir = new THREE.Vector3().subVectors(sunPosition, bodyPosition).normalize();
  material.uniforms.sunDirection.value.copy(sunDir);
}