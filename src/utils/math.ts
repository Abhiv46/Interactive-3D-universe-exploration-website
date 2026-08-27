// Mathematical utilities for the Universe Explorer

export const PI = Math.PI;
export const TAU = Math.PI * 2;
export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;

// Clamping
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

// Linear interpolation
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpClamped(a: number, b: number, t: number): number {
  return lerp(a, b, clamp01(t));
}

// Smoothstep
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function smootherstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

// Easing functions
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function easeInExpo(t: number): number {
  return t === 0 ? 0 : Math.pow(2, 10 * t - 10);
}

// Logarithmic interpolation (for scale transitions)
export function lerpLog(a: number, b: number, t: number): number {
  if (a <= 0 || b <= 0) return lerp(a, b, t);
  return Math.exp(lerp(Math.log(a), Math.log(b), t));
}

// Angle utilities
export function normalizeAngle(angle: number): number {
  while (angle <= -PI) angle += TAU;
  while (angle > PI) angle -= TAU;
  return angle;
}

export function angleDifference(a: number, b: number): number {
  return normalizeAngle(b - a);
}

export function lerpAngle(a: number, b: number, t: number): number {
  return a + angleDifference(a, b) * t;
}

// Vector math (for when we don't want to use Three.js Vector3)
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function vec3Add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function vec3Sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function vec3Mul(a: Vec3, s: number): Vec3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

export function vec3Div(a: Vec3, s: number): Vec3 {
  return { x: a.x / s, y: a.y / s, z: a.z / s };
}

export function vec3Dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function vec3Cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function vec3Length(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function vec3LengthSq(v: Vec3): number {
  return v.x * v.x + v.y * v.y + v.z * v.z;
}

export function vec3Normalize(v: Vec3): Vec3 {
  const len = vec3Length(v);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return vec3Div(v, len);
}

export function vec3Distance(a: Vec3, b: Vec3): number {
  return vec3Length(vec3Sub(a, b));
}

export function vec3Lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  };
}

// Spherical coordinates
export interface SphericalCoords {
  radius: number;
  theta: number; // Polar angle (0 to PI), from +Y axis
  phi: number;   // Azimuthal angle (0 to 2PI), from +X axis
}

export function cartesianToSpherical(v: Vec3): SphericalCoords {
  const radius = vec3Length(v);
  if (radius === 0) return { radius: 0, theta: 0, phi: 0 };

  const theta = Math.acos(clamp(v.y / radius, -1, 1));
  const phi = Math.atan2(v.z, v.x);

  return { radius, theta, phi };
}

export function sphericalToCartesian(s: SphericalCoords): Vec3 {
  const sinTheta = Math.sin(s.theta);
  return {
    x: s.radius * sinTheta * Math.cos(s.phi),
    y: s.radius * Math.cos(s.theta),
    z: s.radius * sinTheta * Math.sin(s.phi),
  };
}

// Quaternion math (simplified)
export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

export function quatIdentity(): Quat {
  return { x: 0, y: 0, z: 0, w: 1 };
}

export function quatFromAxisAngle(axis: Vec3, angle: number): Quat {
  const halfAngle = angle * 0.5;
  const s = Math.sin(halfAngle);
  const n = vec3Normalize(axis);
  return {
    x: n.x * s,
    y: n.y * s,
    z: n.z * s,
    w: Math.cos(halfAngle),
  };
}

export function quatMultiply(a: Quat, b: Quat): Quat {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  };
}

export function quatRotateVector(q: Quat, v: Vec3): Vec3 {
  const qv = { x: q.x, y: q.y, z: q.z };
  const uv = vec3Cross(qv, v);
  const uuv = vec3Cross(qv, uv);
  return vec3Add(vec3Add(v, vec3Mul(uv, 2 * q.w)), vec3Mul(uuv, 2));
}

export function quatSlerp(a: Quat, b: Quat, t: number): Quat {
  let cosHalfTheta = a.w * b.w + a.x * b.x + a.y * b.y + a.z * b.z;

  if (cosHalfTheta < 0) {
    b = { x: -b.x, y: -b.y, z: -b.z, w: -b.w };
    cosHalfTheta = -cosHalfTheta;
  }

  if (cosHalfTheta > 0.9995) {
    return {
      x: lerp(a.x, b.x, t),
      y: lerp(a.y, b.y, t),
      z: lerp(a.z, b.z, t),
      w: lerp(a.w, b.w, t),
    };
  }

  const halfTheta = Math.acos(cosHalfTheta);
  const sinHalfTheta = Math.sin(halfTheta);
  const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
  const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

  return {
    x: a.x * ratioA + b.x * ratioB,
    y: a.y * ratioA + b.y * ratioB,
    z: a.z * ratioA + b.z * ratioB,
    w: a.w * ratioA + b.w * ratioB,
  };
}

// Matrix math (4x4 column-major)
export type Mat4 = Float32Array;

export function mat4Identity(): Mat4 {
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

export function mat4Multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float32Array(16);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[i * 4 + k] * b[k * 4 + j];
      }
      out[i * 4 + j] = sum;
    }
  }
  return out;
}

export function mat4Translate(m: Mat4, v: Vec3): Mat4 {
  const out = new Float32Array(m);
  out[12] = m[0] * v.x + m[4] * v.y + m[8] * v.z + m[12];
  out[13] = m[1] * v.x + m[5] * v.y + m[9] * v.z + m[13];
  out[14] = m[2] * v.x + m[6] * v.y + m[10] * v.z + m[14];
  out[15] = m[3] * v.x + m[7] * v.y + m[11] * v.z + m[15];
  return out;
}

export function mat4RotateX(m: Mat4, rad: number): Mat4 {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const out = new Float32Array(m);
  for (let i = 0; i < 4; i++) {
    const a1 = m[i * 4 + 1];
    const a2 = m[i * 4 + 2];
    out[i * 4 + 1] = a1 * c + a2 * s;
    out[i * 4 + 2] = a2 * c - a1 * s;
  }
  return out;
}

export function mat4RotateY(m: Mat4, rad: number): Mat4 {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const out = new Float32Array(m);
  for (let i = 0; i < 4; i++) {
    const a0 = m[i * 4 + 0];
    const a2 = m[i * 4 + 2];
    out[i * 4 + 0] = a0 * c - a2 * s;
    out[i * 4 + 2] = a2 * c + a0 * s;
  }
  return out;
}

export function mat4RotateZ(m: Mat4, rad: number): Mat4 {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const out = new Float32Array(m);
  for (let i = 0; i < 4; i++) {
    const a0 = m[i * 4 + 0];
    const a1 = m[i * 4 + 1];
    out[i * 4 + 0] = a0 * c + a1 * s;
    out[i * 4 + 1] = a1 * c - a0 * s;
  }
  return out;
}

export function mat4Scale(m: Mat4, v: Vec3): Mat4 {
  const out = new Float32Array(m);
  for (let i = 0; i < 4; i++) {
    out[i * 4 + 0] *= v.x;
    out[i * 4 + 1] *= v.y;
    out[i * 4 + 2] *= v.z;
    out[i * 4 + 3] *= v.z;
  }
  return out;
}

export function mat4LookAt(eye: Vec3, target: Vec3, up: Vec3): Mat4 {
  const f = vec3Normalize(vec3Sub(target, eye));
  const s = vec3Normalize(vec3Cross(f, up));
  const u = vec3Cross(s, f);

  const m = new Float32Array(16);
  m[0] = s.x; m[4] = s.y; m[8] = s.z; m[12] = -vec3Dot(s, eye);
  m[1] = u.x; m[5] = u.y; m[9] = u.z; m[13] = -vec3Dot(u, eye);
  m[2] = -f.x; m[6] = -f.y; m[10] = -f.z; m[14] = vec3Dot(f, eye);
  m[3] = 0; m[7] = 0; m[11] = 0; m[15] = 1;
  return m;
}

export function mat4Perspective(fovy: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1.0 / Math.tan(fovy * 0.5);
  const nf = 1.0 / (near - far);

  const m = new Float32Array(16);
  m[0] = f / aspect; m[4] = 0; m[8] = 0; m[12] = 0;
  m[1] = 0; m[5] = f; m[9] = 0; m[13] = 0;
  m[2] = 0; m[6] = 0; m[10] = (far + near) * nf; m[14] = 2 * far * near * nf;
  m[3] = 0; m[7] = 0; m[11] = -1; m[15] = 0;
  return m;
}

export function mat4Inverse(m: Mat4): Mat4 {
  // Simplified inverse for affine transforms (no perspective)
  const out = new Float32Array(16);

  // Transpose rotation part
  out[0] = m[0]; out[4] = m[1]; out[8] = m[2]; out[12] = 0;
  out[1] = m[4]; out[5] = m[5]; out[9] = m[6]; out[13] = 0;
  out[2] = m[8]; out[6] = m[9]; out[10] = m[10]; out[14] = 0;

  // Translation part
  out[12] = -(m[0] * m[12] + m[4] * m[13] + m[8] * m[14]);
  out[13] = -(m[1] * m[12] + m[5] * m[13] + m[9] * m[14]);
  out[14] = -(m[2] * m[12] + m[6] * m[13] + m[10] * m[14]);
  out[15] = 1;

  return out;
}

// Random utilities
export function randomSeed(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export function randomInRange(min: number, max: number, rand: () => number = Math.random): number {
  return min + rand() * (max - min);
}

export function randomInSphere(radius: number, rand: () => number = Math.random): Vec3 {
  const u = rand();
  const v = rand();
  const theta = 2 * PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = radius * Math.cbrt(rand());
  const sinPhi = Math.sin(phi);
  return {
    x: r * sinPhi * Math.cos(theta),
    y: r * Math.cos(phi),
    z: r * sinPhi * Math.sin(theta),
  };
}

export function randomOnSphere(radius: number, rand: () => number = Math.random): Vec3 {
  const u = rand();
  const v = rand();
  const theta = 2 * PI * u;
  const phi = Math.acos(2 * v - 1);
  const sinPhi = Math.sin(phi);
  return {
    x: radius * sinPhi * Math.cos(theta),
    y: radius * Math.cos(phi),
    z: radius * sinPhi * Math.sin(theta),
  };
}

// Gaussian random (Box-Muller)
export function randomGaussian(mean: number = 0, stdDev: number = 1, rand: () => number = Math.random): number {
  const u = 1 - rand(); // Avoid 0
  const v = rand();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(TAU * v);
  return mean + z * stdDev;
}

// Number formatting
export function formatScientific(num: number, precision: number = 2): string {
  if (num === 0) return '0';
  const exp = Math.floor(Math.log10(Math.abs(num)));
  const mantissa = num / Math.pow(10, exp);
  return `${mantissa.toFixed(precision)}×10^${exp}`;
}

export function formatCompact(num: number, precision: number = 2): string {
  const abs = Math.abs(num);
  if (abs >= 1e12) return (num / 1e12).toFixed(precision) + ' T';
  if (abs >= 1e9) return (num / 1e9).toFixed(precision) + ' B';
  if (abs >= 1e6) return (num / 1e6).toFixed(precision) + ' M';
  if (abs >= 1e3) return (num / 1e3).toFixed(precision) + ' K';
  return num.toFixed(precision);
}

export function formatDistance(meters: number): string {
  const AU = 1.496e11;
  const ly = 9.461e15;
  const pc = 3.086e16;

  if (meters >= pc) return (meters / pc).toFixed(2) + ' pc';
  if (meters >= ly) return (meters / ly).toFixed(2) + ' ly';
  if (meters >= AU) return (meters / AU).toFixed(2) + ' AU';
  if (meters >= 1e6) return (meters / 1e6).toFixed(2) + ' Mm';
  if (meters >= 1e3) return (meters / 1e3).toFixed(2) + ' km';
  return meters.toFixed(2) + ' m';
}

// Orbital mechanics helpers
export function meanAnomalyFromTime(n: number, t: number, M0: number): number {
  return (M0 + n * t) % TAU;
}

export function solveKeplerEquation(M: number, e: number, tolerance: number = 1e-12, maxIter: number = 50): number {
  if (e === 0) return M;
  if (e >= 1) return M; // Hyperbolic/parabolic handled separately

  let E = M;
  for (let i = 0; i < maxIter; i++) {
    const f = E - e * Math.sin(E) - M;
    const fPrime = 1 - e * Math.cos(E);
    const delta = f / fPrime;
    E -= delta;
    if (Math.abs(delta) < tolerance) break;
  }
  return E;
}

export function trueAnomalyFromEccentric(E: number, e: number): number {
  if (e >= 1) return E; // Hyperbolic
  return 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
}

// Julian Date utilities
export function dateToJD(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds() + date.getUTCMilliseconds() / 1000;

  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }

  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);

  const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5;
  const dayFraction = (hour + minute / 60 + second / 3600) / 24;

  return jd + dayFraction;
}

export function jdToDate(jd: number): Date {
  const jdInt = Math.floor(jd + 0.5);
  const f = jd + 0.5 - jdInt;

  let A = jdInt;
  if (jdInt >= 2299161) {
    const alpha = Math.floor((jdInt - 1867216.25) / 36524.25);
    A = jdInt + 1 + alpha - Math.floor(alpha / 4);
  }

  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);

  const day = B - D - Math.floor(30.6001 * E) + f;
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;

  const dayInt = Math.floor(day);
  const dayFrac = day - dayInt;
  const hour = dayFrac * 24;
  const minute = (hour - Math.floor(hour)) * 60;
  const second = (minute - Math.floor(minute)) * 60;

  return new Date(Date.UTC(year, month - 1, dayInt, Math.floor(hour), Math.floor(minute), Math.floor(second)));
}

// Coordinate formatting
export function formatRA(radians: number): string {
  const hours = (radians * RAD_TO_DEG / 15 + 24) % 24;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = ((hours - h - m / 60) * 3600).toFixed(2);
  return `${h}h ${m}m ${s}s`;
}

export function formatDec(radians: number): string {
  const deg = radians * RAD_TO_DEG;
  const sign = deg >= 0 ? '+' : '-';
  const absDeg = Math.abs(deg);
  const d = Math.floor(absDeg);
  const m = Math.floor((absDeg - d) * 60);
  const s = ((absDeg - d - m / 60) * 3600).toFixed(1);
  return `${sign}${d}° ${m}' ${s}"`;
}

export function formatDMS(degrees: number): string {
  const sign = degrees >= 0 ? '' : '-';
  const absDeg = Math.abs(degrees);
  const d = Math.floor(absDeg);
  const m = Math.floor((absDeg - d) * 60);
  const s = ((absDeg - d - m / 60) * 3600).toFixed(2);
  return `${sign}${d}° ${m}' ${s}"`;
}