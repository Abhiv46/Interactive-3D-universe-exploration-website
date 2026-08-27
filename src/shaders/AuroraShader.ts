import * as THREE from 'three';

/**
 * Procedural Aurora Shader for Earth's poles
 * Creates shimmering curtains of light based on simulated solar activity
 * Clearly labeled as stylized/artistic representation
 */

export const auroraVertexShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec2 vUv;
  varying float vLatitude;

  uniform float time;
  uniform float pole; // 1.0 for north, -1.0 for south

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vLatitude = vUv.y * 2.0 - 1.0; // -1 to 1, mapped to poles
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const auroraFragmentShader = `
  uniform float time;
  uniform float intensity;
  uniform float speed;
  uniform float pole; // 1.0 for north, -1.0 for south
  uniform vec3 color1; // Primary aurora color (green)
  uniform vec3 color2; // Secondary color (red/purple)
  uniform vec3 color3; // Tertiary color (blue)
  uniform float solarActivity; // 0-1, simulated solar activity level

  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec2 vUv;
  varying float vLatitude;

  // Hash function
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  // 2D noise
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  // FBM noise
  float fbm(vec2 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 6; i++) {
      if (i >= octaves) break;
      value += amplitude * noise(p * frequency);
      frequency *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  // Curl noise for flowing curtains
  vec2 curlNoise(vec2 p) {
    float eps = 0.01;
    float n1 = noise(p + vec2(eps, 0.0));
    float n2 = noise(p - vec2(eps, 0.0));
    float n3 = noise(p + vec2(0.0, eps));
    float n4 = noise(p - vec2(0.0, eps));
    return vec2(n3 - n4, n2 - n1) / (2.0 * eps);
  }

  void main() {
    // Only render near poles
    float lat = abs(vLatitude);
    float poleMask = smoothstep(0.65, 0.85, lat) * (1.0 - smoothstep(0.92, 0.98, lat));
    poleMask *= (pole > 0.0) ? step(0.0, vLatitude) : step(vLatitude, 0.0);

    if (poleMask <= 0.0) discard;

    // Solar activity modulates intensity
    float activity = solarActivity * 0.7 + 0.3;

    // Multiple layers of flowing curtains
    vec2 baseUv = vUv * vec2(10.0, 3.0);
    baseUv.x += time * speed * 0.1;

    // Layer 1: Large scale curtains
    float curtain1 = fbm(baseUv + vec2(time * speed * 0.05, 0.0), 4);
    vec2 curl1 = curlNoise(baseUv * 0.5 + time * speed * 0.02);
    curtain1 += curl1.x * 0.3;

    // Layer 2: Medium detail
    float curtain2 = fbm(baseUv * 2.0 + vec2(time * speed * 0.1, time * speed * 0.03), 3);
    curtain2 = pow(curtain2, 1.5);

    // Layer 3: Fine filaments
    float curtain3 = fbm(baseUv * 5.0 + time * speed * 0.2, 2);
    curtain3 = pow(curtain3, 2.0);

    // Combine layers
    float curtains = (curtain1 * 0.5 + curtain2 * 0.3 + curtain3 * 0.2) * activity;

    // Latitude-based falloff (stronger at pole edge)
    float latFalloff = smoothstep(0.85, 0.65, lat);
    curtains *= latFalloff;

    // Color variation based on altitude (vLatitude)
    float altitude = (lat - 0.65) / 0.3; // 0 at 65°, 1 at 95°
    vec3 auroraColor = mix(color1, color2, altitude * 0.7);
    auroraColor = mix(auroraColor, color3, altitude * 0.3);

    // Pulsing intensity
    float pulse = 0.8 + 0.2 * sin(time * 2.0 + vUv.x * 20.0);
    curtains *= pulse;

    // Add some vertical rays/beams
    float rays = pow(noise(vUv * vec2(3.0, 20.0) + time * speed * 0.15), 4.0);
    rays *= smoothstep(0.7, 0.9, lat);
    curtains += rays * 0.3 * activity;

    // Final alpha
    float alpha = curtains * intensity * poleMask * activity;

    // Additive blending for glow effect
    gl_FragColor = vec4(auroraColor, alpha);
  }
`;

/**
 * Simplified aurora for south pole (less intense)
 */
export const auroraFragmentShaderSouth = `
  uniform float time;
  uniform float intensity;
  uniform float speed;
  uniform float pole;
  uniform vec3 color1;
  uniform vec3 color2;
  uniform vec3 color3;
  uniform float solarActivity;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec2 vUv;
  varying float vLatitude;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  float fbm(vec2 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 6; i++) {
      if (i >= octaves) break;
      value += amplitude * noise(p * frequency);
      frequency *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  vec2 curlNoise(vec2 p) {
    float eps = 0.01;
    float n1 = noise(p + vec2(eps, 0.0));
    float n2 = noise(p - vec2(eps, 0.0));
    float n3 = noise(p + vec2(0.0, eps));
    float n4 = noise(p - vec2(0.0, eps));
    return vec2(n3 - n4, n2 - n1) / (2.0 * eps);
  }

  void main() {
    float lat = abs(vLatitude);
    float poleMask = smoothstep(0.65, 0.85, lat) * (1.0 - smoothstep(0.92, 0.98, lat));
    poleMask *= (pole > 0.0) ? step(0.0, vLatitude) : step(vLatitude, 0.0);

    if (poleMask <= 0.0) discard;

    float activity = solarActivity * 0.5 + 0.2; // South pole less active

    vec2 baseUv = vUv * vec2(8.0, 2.5);
    baseUv.x += time * speed * 0.08;

    float curtain1 = fbm(baseUv + vec2(time * speed * 0.04, 0.0), 3);
    vec2 curl1 = curlNoise(baseUv * 0.4 + time * speed * 0.015);
    curtain1 += curl1.x * 0.25;

    float curtain2 = fbm(baseUv * 1.5 + vec2(time * speed * 0.08, time * speed * 0.02), 2);
    curtain2 = pow(curtain2, 1.3);

    float curtains = (curtain1 * 0.6 + curtain2 * 0.4) * activity;

    float latFalloff = smoothstep(0.85, 0.65, lat);
    curtains *= latFalloff;

    float altitude = (lat - 0.65) / 0.3;
    vec3 auroraColor = mix(color1, color2, altitude * 0.6);

    float pulse = 0.7 + 0.3 * sin(time * 1.5 + vUv.x * 15.0);
    curtains *= pulse;

    float rays = pow(noise(vUv * vec2(2.0, 15.0) + time * speed * 0.1), 3.0);
    rays *= smoothstep(0.7, 0.9, lat);
    curtains += rays * 0.2 * activity;

    float alpha = curtains * intensity * poleMask * activity * 0.7; // Dimmer than north

    gl_FragColor = vec4(auroraColor, alpha);
  }
`;

export interface AuroraParams {
  intensity: number;
  speed: number;
  color1: THREE.ColorRepresentation; // Green
  color2: THREE.ColorRepresentation; // Red/Purple
  color3: THREE.ColorRepresentation; // Blue
  scale: number; // Radius multiplier
  solarActivity: number; // 0-1 simulated
}

// Default aurora configurations
export const AURORA_CONFIGS: Record<string, AuroraParams> = {
  earth: {
    intensity: 0.4,
    speed: 1.0,
    color1: '#00ff88', // Bright green (oxygen 557.7nm)
    color2: '#ff3366', // Red (oxygen 630nm at high altitude)
    color3: '#4488ff', // Blue/purple (nitrogen)
    scale: 1.03, // Just above atmosphere
    solarActivity: 0.5, // Will be modulated by time
  },
};

export const SOUTH_AURORA_CONFIGS: Record<string, AuroraParams> = {
  earth: {
    intensity: 0.3,
    speed: 0.8,
    color1: '#00cc66',
    color2: '#cc2244',
    color3: '#3366cc',
    scale: 1.03,
    solarActivity: 0.5,
  },
};

/**
 * Creates an aurora material for a specific pole
 */
export function createAuroraMaterial(
  bodyId: string,
  pole: 'north' | 'south',
  time: number = 0
): THREE.ShaderMaterial {
  const configs = pole === 'north' ? AURORA_CONFIGS : SOUTH_AURORA_CONFIGS;
  const config = configs[bodyId] || configs.earth;
  const fragmentShader = pole === 'north' ? auroraFragmentShader : auroraFragmentShaderSouth;

  return new THREE.ShaderMaterial({
    vertexShader: auroraVertexShader,
    fragmentShader,
    uniforms: {
      time: { value: time },
      intensity: { value: config.intensity },
      speed: { value: config.speed },
      pole: { value: pole === 'north' ? 1.0 : -1.0 },
      color1: { value: new THREE.Color(config.color1) },
      color2: { value: new THREE.Color(config.color2) },
      color3: { value: new THREE.Color(config.color3) },
      solarActivity: { value: config.solarActivity },
    },
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/**
 * Updates aurora material uniforms for animation
 */
export function updateAuroraUniforms(
  material: THREE.ShaderMaterial,
  time: number,
  solarActivity: number
): void {
  material.uniforms.time.value = time;
  material.uniforms.solarActivity.value = solarActivity;
}

/**
 * Generates simulated solar activity based on time
 * Returns 0-1 value simulating solar cycle
 */
export function getSimulatedSolarActivity(julianDate: number): number {
  // Solar cycle ~11 years = ~4017 days
  const solarCycleDays = 4017.5;
  const daysSinceEpoch = julianDate - 2451545; // J2000
  const cyclePhase = (daysSinceEpoch % solarCycleDays) / solarCycleDays;

  // Smoothed solar cycle with some randomness
  const cycle = Math.sin(cyclePhase * Math.PI * 2) * 0.5 + 0.5;
  const noise = Math.sin(julianDate * 0.1) * 0.1 + Math.sin(julianDate * 0.03) * 0.05;

  return Math.max(0, Math.min(1, cycle + noise));
}