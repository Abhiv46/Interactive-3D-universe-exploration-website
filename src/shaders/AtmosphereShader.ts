import * as THREE from 'three';

/**
 * Fresnel-based atmosphere shader for planetary glow effect
 * Creates soft glowing edges like real planetary photos from space
 */

export const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewDir;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vViewDir = normalize(cameraPosition - vWorldPosition);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const atmosphereFragmentShader = `
  uniform vec3 atmosphereColor;
  uniform float atmosphereDensity;
  uniform float fresnelPower;
  uniform float fresnelScale;
  uniform float glowIntensity;
  uniform float innerGlow;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewDir;

  void main() {
    // View direction
    vec3 viewDir = normalize(vViewDir);

    // Fresnel term - creates the rim glow at edges
    float fresnel = 1.0 - dot(viewDir, vNormal);
    fresnel = pow(fresnel, fresnelPower) * fresnelScale;

    // Inner glow (subsurface scattering simulation)
    float inner = pow(1.0 - dot(viewDir, vNormal), 2.0) * innerGlow;

    // Combined glow
    float totalGlow = (fresnel + inner) * atmosphereDensity * glowIntensity;

    // Color with atmospheric scattering hint (bluer at limb)
    vec3 color = atmosphereColor;
    float limbFactor = 1.0 - dot(viewDir, vNormal);
    color = mix(color, color * 1.5, limbFactor * 0.3); // Slight blue shift at limb

    gl_FragColor = vec4(color, totalGlow);
  }
`;

/**
 * Atmosphere shader material parameters per planet
 */
export interface AtmosphereParams {
  atmosphereColor: THREE.ColorRepresentation;
  atmosphereDensity: number;
  fresnelPower: number;
  fresnelScale: number;
  glowIntensity: number;
  innerGlow: number;
  scale: number; // Atmosphere radius multiplier (e.g., 1.02 for thin, 1.1 for thick)
}

// Per-body atmosphere configurations
export const ATMOSPHERE_CONFIGS: Record<string, AtmosphereParams> = {
  earth: {
    atmosphereColor: '#4a90d9',        // Blue atmosphere
    atmosphereDensity: 0.15,
    fresnelPower: 4.0,
    fresnelScale: 1.8,
    glowIntensity: 1.2,
    innerGlow: 0.3,
    scale: 1.015,                      // Thin atmosphere
  },
  venus: {
    atmosphereColor: '#e8c56d',        // Yellowish thick atmosphere
    atmosphereDensity: 0.35,
    fresnelPower: 3.0,
    fresnelScale: 2.5,
    glowIntensity: 1.5,
    innerGlow: 0.5,
    scale: 1.08,                       // Very thick atmosphere
  },
  mars: {
    atmosphereColor: '#d94a2b',        // Reddish thin atmosphere
    atmosphereDensity: 0.08,
    fresnelPower: 5.0,
    fresnelScale: 1.2,
    glowIntensity: 0.8,
    innerGlow: 0.15,
    scale: 1.01,                       // Very thin atmosphere
  },
  jupiter: {
    atmosphereColor: '#d4a574',        // Cream/tan bands
    atmosphereDensity: 0.25,
    fresnelPower: 2.5,
    fresnelScale: 2.0,
    glowIntensity: 1.0,
    innerGlow: 0.4,
    scale: 1.03,                       // Gas giant - moderate
  },
  saturn: {
    atmosphereColor: '#f4e4bc',        // Pale gold
    atmosphereDensity: 0.22,
    fresnelPower: 2.5,
    fresnelScale: 1.8,
    glowIntensity: 0.9,
    innerGlow: 0.35,
    scale: 1.035,
  },
  uranus: {
    atmosphereColor: '#7de3f4',        // Cyan/blue-green
    atmosphereDensity: 0.2,
    fresnelPower: 3.0,
    fresnelScale: 1.8,
    glowIntensity: 0.9,
    innerGlow: 0.3,
    scale: 1.025,
  },
  neptune: {
    atmosphereColor: '#4b70dd',        // Deep blue
    atmosphereDensity: 0.2,
    fresnelPower: 3.0,
    fresnelScale: 1.8,
    glowIntensity: 1.0,
    innerGlow: 0.3,
    scale: 1.025,
  },
  titan: {
    atmosphereColor: '#d4a574',        // Orange haze
    atmosphereDensity: 0.3,
    fresnelPower: 2.8,
    fresnelScale: 2.2,
    glowIntensity: 1.2,
    innerGlow: 0.4,
    scale: 1.05,                       // Thick haze
  },
};

/**
 * Creates a Fresnel-based atmosphere material
 */
export function createAtmosphereMaterial(bodyId: string): THREE.ShaderMaterial {
  const config = ATMOSPHERE_CONFIGS[bodyId] || ATMOSPHERE_CONFIGS.earth;

  return new THREE.ShaderMaterial({
    vertexShader: atmosphereVertexShader,
    fragmentShader: atmosphereFragmentShader,
    uniforms: {
      atmosphereColor: { value: new THREE.Color(config.atmosphereColor) },
      atmosphereDensity: { value: config.atmosphereDensity },
      fresnelPower: { value: config.fresnelPower },
      fresnelScale: { value: config.fresnelScale },
      glowIntensity: { value: config.glowIntensity },
      innerGlow: { value: config.innerGlow },
    },
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/**
 * Gets atmosphere scale for a body
 */
export function getAtmosphereScale(bodyId: string): number {
  return ATMOSPHERE_CONFIGS[bodyId]?.scale || 1.02;
}

/**
 * Checks if a body has atmosphere config
 */
export function hasAtmosphereConfig(bodyId: string): boolean {
  return bodyId in ATMOSPHERE_CONFIGS;
}