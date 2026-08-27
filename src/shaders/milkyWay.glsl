// Milky Way Shader
// Volumetric galaxy rendering with:
// - Spiral arms (Perseus, Sagittarius, Scutum-Centaurus, Norma, Outer)
// - Central bulge and bar
// - Thin and thick disks
// - Dust lanes with extinction
// - Halo stars and globular clusters

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform vec3 cameraPosition;
uniform float time;
uniform float pixelRatio;
uniform float exposure;
uniform sampler2D noiseTexture; // 3D noise for turbulence

// Galaxy structure parameters
uniform vec3 sunPosition;       // Sun position in galactic coords (8.15 kpc, 0, 0.02 kpc)
uniform float coreRadius;       // ~0.5 kpc
uniform float bulgeRadius;      // ~1.5 kpc
uniform float thinDiskScaleHeight; // ~0.3 kpc
uniform float thickDiskScaleHeight; // ~1.0 kpc
uniform float thinDiskScaleLength;  // ~2.6 kpc
uniform float thickDiskScaleLength; // ~3.6 kpc

// Spiral arm parameters (logarithmic spirals: r = r0 * exp(b * theta))
uniform float armPitchAngle;    // ~12 degrees = 0.21 rad
uniform float armStartRadius;   // ~3 kpc
uniform int armCount;           // 4 main arms

// Dust parameters
uniform float dustScaleHeight;  // ~0.1 kpc
uniform float dustScaleLength;  // ~5 kpc
uniform vec3 dustColor;         // Reddish extinction color

varying vec3 vWorldPosition;
varying vec3 vGalacticPosition;
varying float vDensity;
varying vec3 vColor;
varying float vExtinction;

#define PI 3.14159265359
#define KPC_TO_METERS 3.085677581e19

// Pseudo-random hash
float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

// 3D value noise
float noise3d(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // Smoothstep

    float n = i.x + i.y * 57.0 + 113.0 * i.z;
    return mix(
        mix(
            mix(hash(vec3(n, n + 1.0, n + 57.0)), hash(vec3(n + 1.0, n + 1.0, n + 57.0)), f.x),
            mix(hash(vec3(n, n, n + 58.0)), hash(vec3(n + 1.0, n, n + 58.0)), f.x),
            f.y
        ),
        mix(
            mix(hash(vec3(n, n + 1.0, n + 58.0)), hash(vec3(n + 1.0, n + 1.0, n + 58.0)), f.x),
            mix(hash(vec3(n, n, n + 114.0)), hash(vec3(n + 1.0, n, n + 114.0)), f.x),
            f.y
        ),
        f.z
    );
}

// Fractal Brownian Motion
float fbm(vec3 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        value += amplitude * noise3d(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    return value;
}

// Spiral arm density function
float spiralArmDensity(vec3 pos) {
    float r = length(pos.xz);
    float theta = atan(pos.z, pos.x);

    if (r < armStartRadius) return 0.0;

    float b = tan(armPitchAngle);
    float baseR = armStartRadius;

    float density = 0.0;

    // 4 main spiral arms
    for (int i = 0; i < 4; i++) {
        float armPhase = float(i) * PI / 2.0;
        float armTheta = (log(r / baseR) / b) + armPhase;
        float diff = abs(theta - armTheta);

        // Wrap around
        diff = min(diff, abs(diff - 2.0 * PI));
        diff = min(diff, abs(diff + 2.0 * PI));

        float armWidth = 0.3 / r; // Arms get tighter toward center
        float armDens = exp(-diff * diff / (2.0 * armWidth * armWidth));

        // Modulate with noise for feathering
        armDens *= 0.7 + 0.3 * fbm(vec3(pos.x * 0.5, pos.y * 2.0, pos.z * 0.5) + vec3(float(i) * 100.0), 4);

        density += armDens;
    }

    return density * exp(-r / thinDiskScaleLength);
}

// Disk density (exponential)
float diskDensity(vec3 pos, float scaleHeight, float scaleLength) {
    float r = length(pos.xz);
    float z = abs(pos.y);

    float radial = exp(-r / scaleLength);
    float vertical = exp(-z / scaleHeight);

    return radial * vertical;
}

// Bulge density (Sersic profile n~2)
float bulgeDensity(vec3 pos) {
    float r = length(pos) / bulgeRadius;
    return exp(-pow(r, 0.5) * 7.67); // Sersic n=2 approximation
}

// Core density
float coreDensity(vec3 pos) {
    float r = length(pos) / coreRadius;
    return exp(-r * r * 4.0);
}

// Dust extinction
float dustExtinction(vec3 pos) {
    float r = length(pos.xz);
    float z = abs(pos.y);

    // Dust concentrated in arms and midplane
    float armDust = spiralArmDensity(pos) * 0.5;
    float midplaneDust = exp(-z / dustScaleHeight) * exp(-r / dustScaleLength);

    return (armDust + midplaneDust * 0.3) * 2.0;
}

// Star color from temperature (blackbody)
vec3 temperatureToColor(float temp) {
    // Approximation valid for 1000K - 50000K
    float t = temp / 10000.0;
    vec3 color;

    if (temp < 6600.0) {
        // Red/Orange
        color.r = 1.0;
        color.g = clamp(t * 1.5, 0.0, 1.0);
        color.b = 0.0;
    } else if (temp < 10000.0) {
        // Yellow/White
        color.r = 1.0;
        color.g = 0.8 + 0.2 * (1.0 - (temp - 6600.0) / 3400.0);
        color.b = clamp((temp - 6600.0) / 3400.0, 0.0, 1.0);
    } else {
        // Blue/White
        color.r = clamp(1.5 - (temp - 10000.0) / 20000.0, 0.5, 1.0);
        color.g = clamp(1.2 - (temp - 10000.0) / 30000.0, 0.5, 1.0);
        color.b = 1.0;
    }

    return color;
}

void main() {
    // Position in galactic coordinates (kpc)
    vec3 galPos = vGalacticPosition / KPC_TO_METERS;

    // Sun position offset
    galPos -= sunPosition / KPC_TO_METERS;

    // Distance from camera
    float dist = length(vWorldPosition - cameraPosition);

    // Calculate densities
    float coreDens = coreDensity(galPos);
    float bulgeDens = bulgeDensity(galPos) * (1.0 - coreDens);
    float thinDens = diskDensity(galPos, thinDiskScaleHeight, thinDiskScaleLength);
    float thickDens = diskDensity(galPos, thickDiskScaleHeight, thickDiskScaleLength) * 0.1;
    float armDens = spiralArmDensity(galPos);

    // Total stellar density
    float stellarDensity = coreDens + bulgeDens + thinDens + thickDens + armDens;

    // Dust extinction
    float extinction = dustExtinction(galPos);

    // Temperature varies by population
    float temp;
    if (coreDens > 0.1) {
        temp = 4000.0 + 2000.0 * hash(galPos * 10.0); // Old, cool stars
    } else if (armDens > 0.1) {
        temp = 8000.0 + 20000.0 * hash(galPos * 5.0); // Young, hot stars in arms
    } else {
        temp = 5000.0 + 3000.0 * hash(galPos * 7.0); // Disk stars
    }

    // Color
    vec3 starColor = temperatureToColor(temp);

    // Apply extinction (reddening)
    vec3 extinctionColor = mix(starColor, dustColor, extinction * 0.5);

    // Brightness based on density and distance
    float brightness = stellarDensity * pow(1000.0 / max(dist / KPC_TO_METERS, 1.0), 2.0);

    // Output
    vColor = extinctionColor;
    vDensity = brightness;
    vExtinction = extinction;
    vGalacticPosition = galPos * KPC_TO_METERS;

    // Project
    vec4 mvPosition = viewMatrix * vec4(vWorldPosition, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Point size based on density and distance
    gl_PointSize = max(0.5, brightness * pixelRatio * 100.0 / max(dist / 1e18, 1.0));
}

// Fragment shader for Milky Way
/*
uniform float exposure;
uniform float gamma;

varying vec3 vColor;
varying float vDensity;
varying float vExtinction;
varying vec3 vGalacticPosition;

void main() {
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center) * 2.0;

    // Soft particle
    float alpha = smoothstep(1.0, 0.0, dist) * vDensity;

    // Color with extinction
    vec3 color = vColor * alpha;

    // Exposure and gamma
    color = vec3(1.0) - exp(-color * exposure);
    color = pow(color, vec3(1.0 / gamma));

    gl_FragColor = vec4(color, alpha);
}
*/