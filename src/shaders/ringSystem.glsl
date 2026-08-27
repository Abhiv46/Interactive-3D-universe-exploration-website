// Saturn Ring System Shader
// Realistic rings with Cassini Division, variable density, and lighting

uniform vec3 cameraPosition;
uniform vec3 lightPosition;
uniform vec3 planetCenter;
uniform float innerRadius;
uniform float outerRadius;
uniform sampler2D ringTexture; // Optional: pre-baked ring texture
uniform float time;
uniform float exposure;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;

#define PI 3.14159265359

// Ring structure constants (Saturn)
const float CASSINI_DIVISION_START = 117580e3; // meters from center
const float CASSINI_DIVISION_END = 122170e3;
const float A_RING_OUTER = 136780e3;
const float B_RING_INNER = 91980e3;
const float B_RING_OUTER = 117580e3;
const float C_RING_INNER = 74658e3;
const float C_RING_OUTER = 91980e3;
const float D_RING_OUTER = 74658e3;
const float F_RING_RADIUS = 140180e3;
const float G_RING_RADIUS = 170000e3;
const float E_RING_INNER = 180000e3;
const float E_RING_OUTER = 480000e3;

float getRingDensity(float r) {
    // Normalize radius
    float normR = r / 1000000.0; // Convert to 1000km units

    // Cassini Division - very low density
    if (r > CASSINI_DIVISION_START && r < CASSINI_DIVISION_END) {
        return 0.02;
    }

    // A Ring - moderate density
    if (r > CASSINI_DIVISION_END && r < A_RING_OUTER) {
        float t = (r - CASSINI_DIVISION_END) / (A_RING_OUTER - CASSINI_DIVISION_END);
        return 0.6 + 0.3 * sin(t * PI * 8.0); // Spiral density waves
    }

    // B Ring - highest density
    if (r > B_RING_INNER && r < B_RING_OUTER) {
        float t = (r - B_RING_INNER) / (B_RING_OUTER - B_RING_INNER);
        return 0.9 + 0.1 * sin(t * PI * 12.0 + time * 0.5);
    }

    // C Ring - lower density, translucent
    if (r > C_RING_INNER && r < C_RING_OUTER) {
        float t = (r - C_RING_INNER) / (C_RING_OUTER - C_RING_INNER);
        return 0.3 + 0.1 * sin(t * PI * 6.0);
    }

    // D Ring - very faint
    if (r < D_RING_OUTER) {
        return 0.05 * (1.0 - r / D_RING_OUTER);
    }

    // F Ring - narrow, bright
    if (abs(r - F_RING_RADIUS) < 500e3) {
        return 0.8 * exp(-abs(r - F_RING_RADIUS) / 100e3);
    }

    // G Ring - very faint
    if (abs(r - G_RING_RADIUS) < 1000e3) {
        return 0.03;
    }

    // E Ring - extremely faint, wide
    if (r > E_RING_INNER && r < E_RING_OUTER) {
        return 0.01 * exp(-(r - E_RING_INNER) / 100000e3);
    }

    return 0.0;
}

vec3 getRingColor(float r, float density) {
    // Base ring color (icy particles)
    vec3 iceColor = vec3(0.95, 0.92, 0.88);

    // Color variation by radius
    float normR = r / 1000000.0;

    // Slightly warmer in B ring
    if (r > B_RING_INNER && r < B_RING_OUTER) {
        iceColor *= vec3(1.02, 1.0, 0.98);
    }
    // Bluer in C ring
    else if (r > C_RING_INNER && r < C_RING_OUTER) {
        iceColor *= vec3(0.95, 0.98, 1.05);
    }

    return iceColor * density;
}

void main() {
    vec3 worldPos = vWorldPosition;
    vec3 viewDir = normalize(cameraPosition - worldPos);
    vec3 lightDir = normalize(lightPosition - worldPos);

    // Distance from planet center in ring plane
    vec3 toCenter = worldPos - planetCenter;
    float r = length(toCenter);

    // Check if we're in ring bounds
    if (r < innerRadius || r > outerRadius) {
        discard;
    }

    // Get ring density at this radius
    float density = getRingDensity(r);

    if (density < 0.01) {
        discard;
    }

    // Ring normal (pointing up from ring plane)
    vec3 ringNormal = normalize(vec3(0.0, 1.0, 0.0)); // Assuming rings in XZ plane

    // Lighting
    float NdotL = max(0.0, dot(ringNormal, lightDir));
    float VdotL = max(0.0, dot(viewDir, lightDir));

    // Forward scattering (backlit rings appear brighter)
    float backscatter = pow(1.0 - VdotL, 4.0) * 0.5;

    // Phase function for ring particles
    float phase = 0.5 + 0.5 * cos(acos(max(-1.0, min(1.0, VdotL))));

    // Color
    vec3 color = getRingColor(r, density);

    // Lighting
    vec3 litColor = color * (0.3 + 0.7 * NdotL) * (1.0 + backscatter);

    // Shadow from planet (simplified)
    float shadow = 1.0;
    if (worldPos.y < 0.0 && lightDir.y > 0.0) {
        // Check if point is in planet's shadow
        float t = -worldPos.y / lightDir.y;
        vec3 shadowPos = worldPos + lightDir * t;
        float shadowR = length(shadowPos - planetCenter);
        if (shadowR < 60268e3 * 1.1) { // Planet radius + atmosphere
            shadow = 0.1;
        }
    }

    litColor *= shadow;

    // Alpha based on density and viewing angle
    float viewAngle = abs(dot(viewDir, ringNormal));
    float alpha = density * (0.3 + 0.7 * viewAngle) * shadow;

    // Apply exposure/tonemap
    litColor = vec3(1.0) - exp(-litColor * exposure);

    gl_FragColor = vec4(litColor, alpha);
}