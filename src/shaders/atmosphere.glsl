// Atmosphere shader for planets with atmospheric scattering
// Based on Sean O'Neil's GPU Gems 2 article and improved with modern techniques

uniform vec3 cameraPosition;
uniform vec3 lightPosition;
uniform vec3 planetCenter;
uniform float planetRadius;
uniform float atmosphereRadius;
uniform vec3 rayleighCoefficients;
uniform vec3 mieCoefficients;
uniform float rayleighScaleHeight;
uniform float mieScaleHeight;
uniform float sunIntensity;
uniform float exposure;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying float vAltitude;

#define PI 3.14159265359

// Optical depth integration samples
const int SAMPLES = 10;
const int SAMPLES_LIGHT = 8;

// Scale heights in meters
// Rayleigh: ~8km, Mie: ~1.2km

float getOpticalDepth(float altitude, float scaleHeight) {
    return exp(-altitude / scaleHeight);
}

vec3 getRayleighPhase(float cosTheta) {
    // Rayleigh phase function: 3/4 * (1 + cos²θ)
    return vec3(0.75 * (1.0 + cosTheta * cosTheta));
}

vec3 getMiePhase(float cosTheta, float g) {
    // Mie phase function (Henyey-Greenstein)
    float g2 = g * g;
    float denom = pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5);
    return vec3(0.25 * (1.0 - g2) / denom);
}

void main() {
    vec3 worldPos = vWorldPosition;
    vec3 viewDir = normalize(cameraPosition - worldPos);
    vec3 lightDir = normalize(lightPosition - worldPos);
    float cosSunAngle = dot(viewDir, lightDir);

    // Calculate altitude
    float altitude = length(worldPos - planetCenter) - planetRadius;
    float normalizedAltitude = altitude / (atmosphereRadius - planetRadius);

    // Fade out at edges
    float fade = smoothstep(0.0, 0.1, normalizedAltitude) * smoothstep(1.0, 0.9, normalizedAltitude);

    // Optical depth for camera ray
    float cameraAltitude = length(cameraPosition - planetCenter) - planetRadius;
    float cameraNormalizedAlt = cameraAltitude / (atmosphereRadius - planetRadius);

    // Rayleigh and Mie optical depths at camera
    float cameraRayleighDepth = getOpticalDepth(cameraAltitude, rayleighScaleHeight);
    float cameraMieDepth = getOpticalDepth(cameraAltitude, mieScaleHeight);

    // Integrate along view ray
    vec3 totalRayleigh = vec3(0.0);
    vec3 totalMie = vec3(0.0);
    vec3 totalExtinction = vec3(0.0);

    float segmentLength = (length(cameraPosition - worldPos)) / float(SAMPLES);

    for (int i = 0; i < SAMPLES; i++) {
        float t = float(i) / float(SAMPLES);
        vec3 samplePos = cameraPosition + viewDir * (t * length(cameraPosition - worldPos));
        float sampleAltitude = length(samplePos - planetCenter) - planetRadius;

        if (sampleAltitude < 0.0) break; // Hit planet surface

        float rayleighDensity = getOpticalDepth(sampleAltitude, rayleighScaleHeight);
        float mieDensity = getOpticalDepth(sampleAltitude, mieScaleHeight);

        // Optical depth to light
        float lightOpticalDepth = 0.0;
        vec3 lightSamplePos = samplePos;
        float lightSegmentLength = length(lightPosition - samplePos) / float(SAMPLES_LIGHT);

        for (int j = 0; j < SAMPLES_LIGHT; j++) {
            float lt = float(j) / float(SAMPLES_LIGHT);
            vec3 lpos = samplePos + lightDir * (lt * length(lightPosition - samplePos));
            float lalt = length(lpos - planetCenter) - planetRadius;
            if (lalt < 0.0) {
                lightOpticalDepth = 100.0; // Blocked by planet
                break;
            }
            lightOpticalDepth += getOpticalDepth(lalt, rayleighScaleHeight) * lightSegmentLength;
        }

        // Extinction
        float extinction = exp(-lightOpticalDepth * 0.001);

        // Scattering
        vec3 rayleighPhase = getRayleighPhase(cosSunAngle);
        vec3 miePhase = getMiePhase(cosSunAngle, 0.76);

        totalRayleigh += rayleighDensity * rayleighPhase * extinction * segmentLength;
        totalMie += mieDensity * miePhase * extinction * segmentLength;
        totalExtinction += (rayleighDensity + mieDensity) * segmentLength;
    }

    // Apply coefficients
    vec3 rayleighColor = totalRayleigh * rayleighCoefficients * sunIntensity;
    vec3 mieColor = totalMie * mieCoefficients * sunIntensity;

    // Combine
    vec3 color = (rayleighColor + mieColor) * fade;

    // Tonemap
    color = vec3(1.0) - exp(-color * exposure);

    // Alpha based on density
    float alpha = (length(totalRayleigh) + length(totalMie)) * 0.1 * fade;

    gl_FragColor = vec4(color, alpha);
}