// Custom Bloom Shader
// Optimized for space scenes with bright stars, planets, and galaxy cores

uniform sampler2D tDiffuse;
uniform sampler2D tBloom1;
uniform sampler2D tBloom2;
uniform sampler2D tBloom3;
uniform sampler2D tBloom4;
uniform sampler2D tBloom5;
uniform float threshold;
uniform float intensity;
uniform float radius;
uniform vec2 resolution;

varying vec2 vUv;

// Luminance calculation (ITU-R BT.709)
float luminance(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

// Bloom extraction - keeps only bright pixels
vec3 extractBloom(vec3 color) {
    float lum = luminance(color);
    float factor = smoothstep(threshold, threshold * 2.0, lum);
    return color * factor;
}

// Gaussian blur (separable)
vec3 gaussianBlur(sampler2D tex, vec2 uv, vec2 dir, float radius) {
    vec3 color = vec3(0.0);
    float weightSum = 0.0;

    // Gaussian weights for 9-tap blur
    float weights[9] = float[](0.05, 0.09, 0.12, 0.15, 0.18, 0.15, 0.12, 0.09, 0.05);
    float offsets[9] = float[](-4.0, -3.0, -2.0, -1.0, 0.0, 1.0, 2.0, 3.0, 4.0);

    for (int i = 0; i < 9; i++) {
        vec2 offset = dir * (offsets[i] * radius / resolution);
        vec3 sample = texture2D(tex, uv + offset).rgb;
        color += sample * weights[i];
        weightSum += weights[i];
    }

    return color / weightSum;
}

// Combine bloom mips with different radii
vec3 combineBloom(vec2 uv) {
    vec3 bloom = vec3(0.0);

    // Small radius - sharp highlights
    bloom += texture2D(tBloom1, uv).rgb * 0.4;

    // Medium radius
    bloom += texture2D(tBloom2, uv).rgb * 0.3;

    // Large radius - soft glow
    bloom += texture2D(tBloom3, uv).rgb * 0.2;

    // Very large - atmospheric glow
    bloom += texture2D(tBloom4, uv).rgb * 0.07;

    // Huge - galaxy/core glow
    bloom += texture2D(tBloom5, uv).rgb * 0.03;

    return bloom * intensity;
}

// Tone mapping operators
vec3 reinhard(vec3 color, float exposure) {
    return vec3(1.0) - exp(-color * exposure);
}

vec3 reinhardExtended(vec3 color, float exposure, float whitePoint) {
    vec3 mapped = color * exposure;
    return mapped / (mapped + vec3(1.0));
}

vec3 acesFilmic(vec3 color, float exposure) {
    color *= exposure;
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;
    return clamp((color * (a * color + b)) / (color * (c * color + d) + e), 0.0, 1.0);
}

vec3 uncharted2(vec3 color, float exposure) {
    color *= exposure;
    const float A = 0.15;
    const float B = 0.50;
    const float C = 0.10;
    const float D = 0.20;
    const float E = 0.02;
    const float F = 0.30;
    const float W = 11.2;

    vec3 numerator = color * (A * color + C * B) + D * E;
    vec3 denominator = color * (A * color + B) + D * F;
    return numerator / denominator - E / F;
}

// sRGB encoding
vec3 linearToSrgb(vec3 color) {
    return pow(color, vec3(1.0 / 2.2));
}

vec3 srgbToLinear(vec3 color) {
    return pow(color, vec3(2.2));
}

// Main bloom composite
void main() {
    vec3 base = texture2D(tDiffuse, vUv).rgb;

    // Extract bloom from base
    vec3 bloomSource = extractBloom(base);

    // In a real implementation, this would be done in multiple passes
    // Here we assume pre-blurred bloom textures are provided

    vec3 bloom = combineBloom(vUv);

    // Add bloom to base
    vec3 color = base + bloom;

    // Tone mapping
    color = reinhard(color, 1.0);

    // Gamma correction
    color = linearToSrgb(color);

    gl_FragColor = vec4(color, 1.0);
}

// ============================================================
// BLOOM EXTRACTION PASS (First pass)
// ============================================================

/*
uniform sampler2D tDiffuse;
uniform float threshold;

varying vec2 vUv;

void main() {
    vec3 color = texture2D(tDiffuse, vUv).rgb;
    float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));

    // Soft threshold
    float factor = smoothstep(threshold, threshold * 2.0, lum);

    gl_FragColor = vec4(color * factor, 1.0);
}
*/

// ============================================================
// BLUR PASS (Horizontal + Vertical)
// ============================================================

/*
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float radius;
uniform bool horizontal;

varying vec2 vUv;

void main() {
    vec2 dir = horizontal ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec3 color = vec3(0.0);
    float weightSum = 0.0;

    // 9-tap Gaussian
    float weights[9] = float[](0.05, 0.09, 0.12, 0.15, 0.18, 0.15, 0.12, 0.09, 0.05);
    float offsets[9] = float[](-4.0, -3.0, -2.0, -1.0, 0.0, 1.0, 2.0, 3.0, 4.0);

    for (int i = 0; i < 9; i++) {
        vec2 offset = dir * (offsets[i] * radius / resolution);
        vec3 sample = texture2D(tDiffuse, vUv + offset).rgb;
        color += sample * weights[i];
        weightSum += weights[i];
    }

    gl_FragColor = vec4(color / weightSum, 1.0);
}
*/

// ============================================================
// STAR GLOW PASS (Specialized for point stars)
// ============================================================

/*
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float starGlowIntensity;

varying vec2 vUv;

void main() {
    vec3 color = texture2D(tDiffuse, vUv).rgb;
    vec3 lum = vec3(dot(color, vec3(0.2126, 0.7152, 0.0722)));

    // Detect isolated bright pixels (stars)
    float centerLum = lum.r;
    float neighborLum = 0.0;

    vec2 pixel = 1.0 / resolution;
    neighborLum += texture2D(tDiffuse, vUv + vec2(pixel.x, 0.0)).r;
    neighborLum += texture2D(tDiffuse, vUv + vec2(-pixel.x, 0.0)).r;
    neighborLum += texture2D(tDiffuse, vUv + vec2(0.0, pixel.y)).r;
    neighborLum += texture2D(tDiffuse, vUv + vec2(0.0, -pixel.y)).r;
    neighborLum *= 0.25;

    // Star detection: bright center, dark neighbors
    float isStar = smoothstep(0.9, 1.0, centerLum) * smoothstep(0.1, 0.0, neighborLum);

    // Generate star glow
    vec3 glow = vec3(0.0);
    if (isStar > 0.5) {
        // Cross pattern
        for (int i = 0; i < 8; i++) {
            float angle = float(i) * 3.14159 / 4.0;
            vec2 dir = vec2(cos(angle), sin(angle));
            for (int j = 1; j < 10; j++) {
                vec2 offset = dir * float(j) * pixel * 2.0;
                float weight = exp(-float(j) * 0.3);
                glow += texture2D(tDiffuse, vUv + offset).rgb * weight * isStar;
            }
        }
    }

    gl_FragColor = vec4(color + glow * starGlowIntensity, 1.0);
}
*/