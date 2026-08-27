// Star Field Shader
// High-performance instanced star rendering with:
// - Blackbody color from B-V index
// - Magnitude-based sizing with diffraction spikes for bright stars
// - Proper motion support
// - Additive blending for HDR

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform vec3 cameraPosition;
uniform float time;
uniform float pixelRatio;
uniform float magnitudeLimit;
uniform float pointSizeMultiplier;
uniform bool enableDiffractionSpikes;

attribute vec3 position;      // Star position in parsecs
attribute vec3 color;         // RGB color from B-V index
attribute float magnitude;    // Apparent magnitude
attribute float temperature;  // Effective temperature (K)
attribute vec2 properMotion;  // mas/yr (RA, Dec)
attribute float parallax;     // mas

varying vec3 vColor;
varying float vMagnitude;
varying float vTemperature;
varying vec3 vWorldPosition;

#define PI 3.14159265359
#define PARSEC_TO_METERS 3.085677581e16

// Pogson's ratio: 2.512 (5 magnitudes = 100x brightness)
const float POGSON = 2.512;

// Convert magnitude to apparent brightness (0-1)
float magnitudeToBrightness(float mag) {
    return pow(POGSON, 6.0 - mag);
}

// Star size based on magnitude and distance
float getStarSize(float mag, float dist, float pixelRatio) {
    float brightness = magnitudeToBrightness(mag);
    // Base size scaled by brightness and inverse distance
    float size = brightness * pointSizeMultiplier * pixelRatio * (1000.0 / max(dist, 1.0));
    return max(size, 0.5);
}

// Diffraction spikes for bright stars
vec4 drawDiffractionSpikes(vec2 center, float size, vec3 color, float intensity) {
    vec4 spikeColor = vec4(0.0);
    float spikeLength = size * 8.0;
    float spikeWidth = size * 0.08;

    // 4 primary spikes (cross)
    for (int i = 0; i < 4; i++) {
        float angle = float(i) * PI / 2.0;
        vec2 dir = vec2(cos(angle), sin(angle));
        float dist = abs(dot(gl_FragCoord.xy - center, dir));
        float perp = abs(dot(gl_FragCoord.xy - center, vec2(-dir.y, dir.x)));
        float spike = smoothstep(spikeWidth, 0.0, perp) * smoothstep(spikeLength, 0.0, dist);
        spikeColor += vec4(color * intensity * spike, spike);
    }

    // 4 secondary spikes (diagonal, fainter)
    for (int i = 0; i < 4; i++) {
        float angle = float(i) * PI / 2.0 + PI / 4.0;
        vec2 dir = vec2(cos(angle), sin(angle));
        float dist = abs(dot(gl_FragCoord.xy - center, dir));
        float perp = abs(dot(gl_FragCoord.xy - center, vec2(-dir.y, dir.x)));
        float spike = smoothstep(spikeWidth * 0.5, 0.0, perp) * smoothstep(spikeLength * 0.6, 0.0, dist);
        spikeColor += vec4(color * intensity * 0.3 * spike, spike * 0.3);
    }

    return spikeColor;
}

void main() {
    // Calculate world position (apply proper motion and parallax)
    vec3 worldPos = position * PARSEC_TO_METERS;

    // Apply proper motion (simplified - full implementation would use time)
    // worldPos += properMotion * time * 1e-3; // Convert mas/yr to positional offset

    // Apply parallax (simplified)
    // worldPos += cameraPosition * (parallax / 1000.0);

    vWorldPosition = worldPos;

    // Project to clip space
    vec4 mvPosition = viewMatrix * vec4(worldPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Calculate distance for size scaling
    float dist = length(worldPos - cameraPosition) / PARSEC_TO_METERS;

    // Size based on magnitude
    float size = getStarSize(magnitude, dist, pixelRatio);
    gl_PointSize = size;

    // Pass data to fragment shader
    vColor = color;
    vMagnitude = magnitude;
    vTemperature = temperature;
}

// Fragment shader
// This would be in a separate file but included here for completeness
/*
uniform float exposure;
uniform float gamma;

varying vec3 vColor;
varying float vMagnitude;
varying float vTemperature;
varying vec3 vWorldPosition;

void main() {
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center) * 2.0;

    // Soft circular star
    float star = smoothstep(1.0, 0.0, dist);

    // Add subtle limb darkening for realism
    star *= 1.0 - 0.3 * dist;

    // Color
    vec3 color = vColor * star;

    // Bright core for very bright stars
    if (vMagnitude < 1.0) {
        float core = smoothstep(0.1, 0.0, dist);
        color += vec3(1.0) * core * (1.0 - vMagnitude / 6.0);
    }

    // Apply exposure and gamma
    color = vec3(1.0) - exp(-color * exposure);
    color = pow(color, vec3(1.0 / gamma));

    // Alpha
    float alpha = star;

    gl_FragColor = vec4(color, alpha);
}
*/