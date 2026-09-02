import * as THREE from 'three';

/**
 * Animated sun surface shader with corona effects
 * Creates realistic solar surface with granules, sunspots, and animated corona
 */

export const sunVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const sunFragmentShader = `
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform float uCoronaIntensity;
  uniform vec3 uSunColor;
  uniform vec3 uCoronaColor;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  // Noise functions (same as vertex)
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 1.0/7.0;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    // Base sun color from texture
    vec4 texColor = texture2D(uTexture, vUv);
    vec3 baseColor = texColor.rgb * uSunColor;

    // Add procedural granules
    float granules = snoise(vWorldPosition * 0.00005 + uTime * 0.0005);
    float granuleDetail = snoise(vWorldPosition * 0.0002 + uTime * 0.002) * 0.3;
    baseColor *= 1.0 + (granules + granuleDetail) * 0.15;

    // Sunspots (darker, cooler regions)
    float sunspots = snoise(vWorldPosition * 0.000008 - uTime * 0.0001);
    float sunspotMask = smoothstep(0.7, 0.85, sunspots);
    baseColor *= 1.0 - sunspotMask * 0.4;

    // Limb darkening
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float limb = 1.0 - dot(viewDir, vNormal);
    baseColor *= 1.0 - limb * 0.3;

    // Corona glow at edges
    float corona = pow(limb, 3.0) * uCoronaIntensity;
    vec3 finalColor = baseColor + uCoronaColor * corona;

    // Add subtle pulsation
    float pulse = sin(uTime * 0.5) * 0.02 + 1.0;
    finalColor *= pulse;

    // Emissive output
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

/**
 * Creates the animated sun surface material
 */
export function createSunMaterial(texture: THREE.Texture | null): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: sunVertexShader,
    fragmentShader: sunFragmentShader,
    uniforms: {
      uTexture: { value: texture },
      uTime: { value: 0 },
      uCoronaIntensity: { value: 0.5 },
      uSunColor: { value: new THREE.Color(0xfff5e6) },
      uCoronaColor: { value: new THREE.Color(0xffaa00) },
    },
    transparent: false,
    depthWrite: true,
  });
}

/**
 * Procedural solar corona — a BackSide halo with animated radial streamers.
 * Replaces the old texture-based corona, which depended on a 1x1 placeholder
 * `corona.png` and therefore rendered invisible. Being fully procedural it
 * needs no texture asset, animates over time, and glows bright enough to drive
 * the bloom pass so the Sun reads as a genuine light source.
 */

export const coronaVertexShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec2 vUv;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const coronaFragmentShader = `
  uniform float uTime;
  uniform vec3 uColor;
  uniform vec3 uCoreColor;
  uniform float uIntensity;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 1.0/7.0;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    // Sun sits at the group origin, so the local radius is our distance out.
    float radius = length(vWorldPosition);
    vec3 dir = normalize(vWorldPosition);

    // Fresnel: for a BackSide sphere the corona is brightest around the limb.
    float fresnel = 1.0 - abs(dot(normalize(cameraPosition - vWorldPosition), vNormal));

    // Radial streamers — animated angular noise that forms spikes/flares.
    float angleNoise = snoise(vec3(dir * 2.5 + uTime * 0.15));
    float radialNoise = snoise(vec3(dir * 5.0 - uTime * 0.3));
    float streamers = 0.65 + 0.35 * angleNoise + 0.2 * radialNoise;

    // Broad halo falloff and a tighter bright ring hugging the photosphere.
    float halo = exp(-(radius - 1.0) * 1.4) * fresnel;
    float ring = exp(-(radius - 1.0) * 9.0) * pow(fresnel, 2.0);

    float glow = (halo * 0.7 + ring) * streamers * uIntensity;

    // Slight breathing over time for a living star.
    glow *= 0.95 + 0.05 * sin(uTime * 0.8);

    vec3 color = mix(uCoreColor, uColor, smoothstep(0.0, 1.2, radius - 1.0));
    gl_FragColor = vec4(color * glow, glow);
  }
`;

/**
 * Creates the procedural animated corona material (outer glow). No texture
 * required — fully shader-driven so it works without a corona.png asset.
 */
export function createCoronaShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: coronaVertexShader,
    fragmentShader: coronaFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0xff9d00) },
      uCoreColor: { value: new THREE.Color(0xfff3c8) },
      uIntensity: { value: 1.0 },
    },
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}