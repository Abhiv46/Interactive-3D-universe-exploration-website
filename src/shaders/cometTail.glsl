// Comet Tail Shader
// Dual-tail rendering:
// - Dust tail: curved, follows orbital path, yellowish-white
// - Ion tail: straight, points directly away from Sun, blue

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform vec3 cameraPosition;
uniform vec3 sunPosition;
uniform float time;
uniform float exposure;

attribute vec3 position;      // Position along tail (0 = nucleus, 1 = tip)
attribute float tailType;     // 0 = dust, 1 = ion
attribute float age;          // Particle age for animation
attribute float size;         // Particle size

varying vec3 vColor;
varying float vAlpha;
varying float vTailType;
varying vec3 vWorldPosition;

#define PI 3.14159265359

// Dust tail: curved, affected by radiation pressure
vec3 computeDustTail(vec3 nucleusPos, vec3 velocity, float t, float particleAge) {
    // Radiation pressure parameter beta (0.001 - 1.0 depending on particle size)
    float beta = 0.1 + 0.5 * sin(particleAge * 10.0);

    // Solar gravity + radiation pressure
    vec3 toSun = sunPosition - nucleusPos;
    float r = length(toSun);
    vec3 sunDir = toSun / r;

    // Acceleration from Sun (gravity - radiation pressure)
    float mu = 1.327e20; // Solar GM
    float accel = mu * (1.0 - beta) / (r * r);

    // Simplified: dust follows curved path behind nucleus
    // In reality, this would be integrated over time
    vec3 dustPos = nucleusPos - velocity * t * 1e6; // Simplified

    // Add curvature away from Sun
    float curve = t * t * 0.5 * beta;
    dustPos += sunDir * curve * 1e10;

    return dustPos;
}

// Ion tail: straight, points directly away from Sun
vec3 computeIonTail(vec3 nucleusPos, float t) {
    vec3 toSun = sunPosition - nucleusPos;
    float r = length(toSun);
    vec3 sunDir = toSun / r;

    // Ion tail points directly away from Sun
    // Accelerated by solar wind to ~100-500 km/s
    float ionSpeed = 200e3; // m/s
    float tailLength = ionSpeed * t * 1e3; // Length based on time

    return nucleusPos - sunDir * tailLength * t;
}

void main() {
    // This vertex shader would be used with a geometry shader or compute shader
    // to generate tail particles. Here's the concept:

    vec3 nucleusPos = position; // Base nucleus position passed as uniform in real use
    vec3 velocity = vec3(0.0);  // Orbital velocity

    vec3 tailPos;
    if (tailType < 0.5) {
        // Dust tail
        tailPos = computeDustTail(nucleusPos, velocity, position.x, age);
        vColor = vec3(0.95, 0.9, 0.7); // Yellowish-white
        vAlpha = 0.6 * (1.0 - position.x) * (1.0 - age * 0.1);
    } else {
        // Ion tail
        tailPos = computeIonTail(nucleusPos, position.x);
        vColor = vec3(0.3, 0.6, 1.0); // Blue
        vAlpha = 0.8 * (1.0 - position.x) * (1.0 - age * 0.05);
    }

    vWorldPosition = tailPos;
    vTailType = tailType;

    // Project
    vec4 mvPosition = viewMatrix * vec4(tailPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Size based on distance and particle size
    float dist = length(tailPos - cameraPosition);
    gl_PointSize = max(1.0, size * 1000.0 / max(dist / 1e9, 1.0));
}

// Fragment shader for comet tails
/*
uniform float exposure;

varying vec3 vColor;
varying float vAlpha;
varying float vTailType;
varying vec3 vWorldPosition;

void main() {
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center) * 2.0;

    // Soft particle with slight elongation for ion tail
    float alpha = smoothstep(1.0, 0.0, dist) * vAlpha;

    // Ion tail particles are more elongated
    if (vTailType > 0.5) {
        float stretch = 1.0 + 0.5 * abs(center.y);
        alpha *= stretch;
    }

    vec3 color = vColor * alpha;

    // Additive blending for glow
    color = vec3(1.0) - exp(-color * exposure);

    gl_FragColor = vec4(color, alpha);
}
*/

// ============================================================
// COMET NUCLEUS SHADER
// ============================================================

/*
uniform vec3 cameraPosition;
uniform vec3 sunPosition;
uniform vec3 nucleusColor;
uniform float nucleusSize;
uniform float activity; // 0-1, based on distance to Sun

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vSunAngle;

void main() {
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    vNormal = normalize(normalMatrix * normal);

    // Sun angle for activity
    vec3 toSun = normalize(sunPosition - vWorldPosition);
    vSunAngle = max(0.0, dot(vNormal, toSun));

    gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPosition, 1.0);
}

void main() {
    // Nucleus: dark, irregular body
    vec3 color = nucleusColor;

    // Active regions (jets) facing Sun
    float jet = pow(vSunAngle, 10.0) * activity * 0.5;

    // Coma glow
    float coma = smoothstep(0.5, 1.0, vSunAngle) * activity;

    color += vec3(1.0, 0.9, 0.7) * (jet + coma * 0.3);

    // Tonemap
    color = vec3(1.0) - exp(-color * exposure);

    gl_FragColor = vec4(color, 1.0);
}
*/