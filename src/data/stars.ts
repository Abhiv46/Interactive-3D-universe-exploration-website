/**
 * Star Catalog Data - Hipparcos/Tycho-2 subset
 * Brightest ~20,000 stars for real-time rendering
 * Includes position, magnitude, color (B-V), proper motion
 *
 * For full Hipparcos (118,218 stars) or Gaia DR3 (>1B stars),
 * consider streaming/loading on demand
 */

import { StarData } from '@/types/orbitalElements';
import { DEG_TO_RAD, RAD_TO_DEG } from '@/engine/Constants';

/**
 * Convert B-V color index to RGB color (blackbody approximation)
 * Returns [r, g, b] in 0-1 range
 */
export function bvToColor(bv: number): [number, number, number] {
  // Effective temperature from B-V (Ballesteros 2012)
  // Valid for -0.4 < B-V < 2.0
  let tempScaled: number;
  if (bv < -0.4) bv = -0.4;
  if (bv > 2.0) bv = 2.0;

  tempScaled = 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));

  // Blackbody to sRGB (simplified)
  // Using piecewise approximation
  const tempScaledScaled = tempScaled / 10000;

  let r, g, b;

  if (tempScaledScaled <= 6600) {
    r = 1.0;
  } else {
    const t = tempScaled - 6000;
    r = 329.698727446 * Math.pow(t, -0.1332047592);
    r = Math.min(1, Math.max(0, r / 255));
  }

  if (tempScaled <= 6600) {
    const t = tempScaled - 6000;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    g = Math.min(1, Math.max(0, g / 255));
  } else {
    const t = tempScaled - 6000;
    g = 288.1221695283 * Math.pow(t, -0.0755148492);
    g = Math.min(1, Math.max(0, g / 255));
  }

  if (tempScaled >= 6600) {
    b = 1.0;
  } else if (tempScaled <= 1900) {
    b = 0.0;
  } else {
    const t = tempScaled - 10000;
    b = 138.5177312231 * Math.log(t) - 305.0447927307;
    b = Math.min(1, Math.max(0, b / 255));
  }

  return [r, g, b];
}

/**
 * Convert B-V to hex color string
 */
export function bvToHex(bv: number): string {
  const [r, g, b] = bvToColor(bv);
  return '#' +
    Math.round(r * 255).toString(16).padStart(2, '0') +
    Math.round(g * 255).toString(16).padStart(2, '0') +
    Math.round(b * 255).toString(16).padStart(2, '0');
}

/**
 * Calculate absolute magnitude from apparent magnitude and parallax
 */
export function absoluteMagnitude(vMag: number, parallaxMas: number): number {
  if (parallaxMas <= 0) return vMag; // Unknown distance
  const distancePc = 1000 / parallaxMas;
  return vMag - 5 * (Math.log10(distancePc) - 1);
}

/**
 * Calculate point size for rendering based on apparent magnitude
 * Brighter stars = larger points
 */
export function magnitudeToPointSize(vMag: number, baseSize: number = 2.0): number {
  // Pogson's formula: magnitude difference of 5 = factor of 100 in brightness
  // Size proportional to sqrt(brightness) for visual perception
  const brightness = Math.pow(100, -vMag / 5);
  return baseSize * Math.sqrt(brightness * 100) * 0.5;
}

/**
 * Spectral type to approximate B-V index
 */
export function spectralTypeToBv(spectralType: string): number {
  const type = spectralType.trim().toUpperCase()[0];
  const lumClass = spectralType.match(/[IV]+/)?.[0] || 'V';

  const baseBv: Record<string, number> = {
    'O': -0.33,
    'B': -0.20,
    'A': 0.00,
    'F': 0.30,
    'G': 0.58,
    'K': 0.81,
    'M': 1.40,
    'L': 1.80,
    'T': 2.00,
    'Y': 2.20,
  };

  const lumOffset: Record<string, number> = {
    'I': -0.2,
    'II': -0.1,
    'III': 0.0,
    'IV': 0.05,
    'V': 0.0,
  };

  return (baseBv[type] || 0.58) + (lumOffset[lumClass] || 0);
}

/**
 * Minimal bright star catalog (top ~300 stars by apparent magnitude)
 * This is a subset for immediate rendering; full catalog loaded async
 */
export const BRIGHT_STARS: StarData[] = [
  // Sirius
  {
    hipId: 32349,
    hdId: 48915,
    properName: 'Sirius',
    bayer: 'α CMa',
    constellation: 'CMa',
    ra: 101.28715533,
    dec: -16.71611586,
    pmRa: -546.01,
    pmDec: -1223.07,
    parallax: 379.21,
    distance: 2.637,
    vMag: -1.46,
    absMag: 1.42,
    bvIndex: 0.00,
    spectralType: 'A1V',
    temperature: 9940,
  },
  // Canopus
  {
    hipId: 30438,
    hdId: 45348,
    properName: 'Canopus',
    bayer: 'α Car',
    constellation: 'Car',
    ra: 95.98799363,
    dec: -52.69571993,
    pmRa: 19.93,
    pmDec: 23.21,
    parallax: 10.43,
    distance: 95.9,
    vMag: -0.74,
    absMag: -5.53,
    bvIndex: 0.15,
    spectralType: 'A9II',
    temperature: 7400,
  },
  // Alpha Centauri (Rigil Kentaurus)
  {
    hipId: 71683,
    hdId: 128620,
    properName: 'Rigil Kentaurus',
    bayer: 'α Cen',
    constellation: 'Cen',
    ra: 219.902091,
    dec: -60.834041,
    pmRa: -3678.19,
    pmDec: 481.84,
    parallax: 742.01,
    distance: 1.348,
    vMag: -0.27,
    absMag: 4.38,
    bvIndex: 0.71,
    spectralType: 'G2V',
    temperature: 5790,
  },
  // Arcturus
  {
    hipId: 69673,
    hdId: 124897,
    properName: 'Arcturus',
    bayer: 'α Boo',
    constellation: 'Boo',
    ra: 213.915300,
    dec: 19.182431,
    pmRa: -1093.45,
    pmDec: -1999.40,
    parallax: 88.85,
    distance: 11.25,
    vMag: -0.05,
    absMag: -0.31,
    bvIndex: 1.23,
    spectralType: 'K1.5III',
    temperature: 4286,
  },
  // Vega
  {
    hipId: 91262,
    hdId: 172167,
    properName: 'Vega',
    bayer: 'α Lyr',
    constellation: 'Lyr',
    ra: 279.234734,
    dec: 38.783688,
    pmRa: 200.94,
    pmDec: 286.23,
    parallax: 130.23,
    distance: 7.68,
    vMag: 0.03,
    absMag: 0.58,
    bvIndex: 0.00,
    spectralType: 'A0V',
    temperature: 9602,
  },
  // Capella
  {
    hipId: 24608,
    hdId: 34029,
    properName: 'Capella',
    bayer: 'α Aur',
    constellation: 'Aur',
    ra: 79.172236,
    dec: 45.997991,
    pmRa: 445.90,
    pmDec: -439.56,
    parallax: 76.20,
    distance: 13.12,
    vMag: 0.08,
    absMag: -0.48,
    bvIndex: 0.80,
    spectralType: 'G3III',
    temperature: 4970,
  },
  // Rigel
  {
    hipId: 24436,
    hdId: 34085,
    properName: 'Rigel',
    bayer: 'β Ori',
    constellation: 'Ori',
    ra: 78.634467,
    dec: -8.201638,
    pmRa: 1.71,
    pmDec: -0.80,
    parallax: 3.78,
    distance: 264.5,
    vMag: 0.13,
    absMag: -7.84,
    bvIndex: -0.03,
    spectralType: 'B8Ia',
    temperature: 12100,
  },
  // Procyon
  {
    hipId: 37279,
    hdId: 61421,
    properName: 'Procyon',
    bayer: 'α CMi',
    constellation: 'CMi',
    ra: 114.825508,
    dec: 5.224987,
    pmRa: -714.59,
    pmDec: -1036.80,
    parallax: 285.93,
    distance: 3.50,
    vMag: 0.34,
    absMag: 2.66,
    bvIndex: 0.42,
    spectralType: 'F5IV-V',
    temperature: 6530,
  },
  // Achernar
  {
    hipId: 7588,
    hdId: 10144,
    properName: 'Achernar',
    bayer: 'α Eri',
    constellation: 'Eri',
    ra: 24.428708,
    dec: -57.236676,
    pmRa: 37.90,
    pmDec: -56.60,
    parallax: 23.31,
    distance: 42.9,
    vMag: 0.46,
    absMag: -1.16,
    bvIndex: -0.16,
    spectralType: 'B3Vpe',
    temperature: 15000,
  },
  // Betelgeuse
  {
    hipId: 27989,
    hdId: 39801,
    properName: 'Betelgeuse',
    bayer: 'α Ori',
    constellation: 'Ori',
    ra: 88.792939,
    dec: 7.407064,
    pmRa: 24.95,
    pmDec: 9.56,
    parallax: 4.51,
    distance: 221.7,
    vMag: 0.50,
    absMag: -5.85,
    bvIndex: 1.85,
    spectralType: 'M1-2Ia-ab',
    temperature: 3500,
  },
  // Hadar
  {
    hipId: 71681,
    hdId: 128621,
    properName: 'Hadar',
    bayer: 'β Cen',
    constellation: 'Cen',
    ra: 219.898263,
    dec: -60.373012,
    pmRa: -33.02,
    pmDec: -7.87,
    parallax: 4.93,
    distance: 202.8,
    vMag: 0.61,
    absMag: -5.42,
    bvIndex: -0.23,
    spectralType: 'B1III',
    temperature: 22500,
  },
  // Altair
  {
    hipId: 97649,
    hdId: 187642,
    properName: 'Altair',
    bayer: 'α Aql',
    constellation: 'Aql',
    ra: 297.695827,
    dec: 8.868322,
    pmRa: 536.23,
    pmDec: 385.29,
    parallax: 194.44,
    distance: 5.14,
    vMag: 0.77,
    absMag: 2.21,
    bvIndex: 0.22,
    spectralType: 'A7V',
    temperature: 7550,
  },
  // Aldebaran
  {
    hipId: 21421,
    hdId: 29139,
    properName: 'Aldebaran',
    bayer: 'α Tau',
    constellation: 'Tau',
    ra: 68.980163,
    dec: 16.509302,
    pmRa: 63.55,
    pmDec: -190.15,
    parallax: 48.94,
    distance: 20.43,
    vMag: 0.85,
    absMag: -0.64,
    bvIndex: 1.54,
    spectralType: 'K5III',
    temperature: 3910,
  },
  // Antares
  {
    hipId: 80763,
    hdId: 148478,
    properName: 'Antares',
    bayer: 'α Sco',
    constellation: 'Sco',
    ra: 247.351914,
    dec: -26.432002,
    pmRa: -11.10,
    pmDec: -23.17,
    parallax: 5.40,
    distance: 185.2,
    vMag: 0.96,
    absMag: -5.28,
    bvIndex: 1.83,
    spectralType: 'M1.5Iab',
    temperature: 3660,
  },
  // Spica
  {
    hipId: 65474,
    hdId: 116658,
    properName: 'Spica',
    bayer: 'α Vir',
    constellation: 'Vir',
    ra: 201.298247,
    dec: -11.161320,
    pmRa: -42.57,
    pmDec: -31.40,
    parallax: 12.44,
    distance: 80.4,
    vMag: 0.98,
    absMag: -3.55,
    bvIndex: -0.23,
    spectralType: 'B1III-IV',
    temperature: 22400,
  },
  // Pollux
  {
    hipId: 38036,
    hdId: 62509,
    properName: 'Pollux',
    bayer: 'β Gem',
    constellation: 'Gem',
    ra: 116.329005,
    dec: 28.026193,
    pmRa: -626.55,
    pmDec: -45.80,
    parallax: 96.54,
    distance: 10.36,
    vMag: 1.14,
    absMag: 1.07,
    bvIndex: 1.00,
    spectralType: 'K0III',
    temperature: 4666,
  },
  // Fomalhaut
  {
    hipId: 113368,
    hdId: 216956,
    properName: 'Fomalhaut',
    bayer: 'α PsA',
    constellation: 'PsA',
    ra: 344.412675,
    dec: -29.622235,
    pmRa: 328.95,
    pmDec: -170.67,
    parallax: 130.08,
    distance: 7.69,
    vMag: 1.16,
    absMag: 1.73,
    bvIndex: 0.09,
    spectralType: 'A3V',
    temperature: 8590,
  },
  // Deneb
  {
    hipId: 102098,
    hdId: 197345,
    properName: 'Deneb',
    bayer: 'α Cyg',
    constellation: 'Cyg',
    ra: 309.402769,
    dec: 45.280339,
    pmRa: 2.05,
    pmDec: 1.90,
    parallax: 2.31,
    distance: 433,
    vMag: 1.25,
    absMag: -8.38,
    bvIndex: 0.09,
    spectralType: 'A2Ia',
    temperature: 8525,
  },
  // Mimosa (Beta Crucis)
  {
    hipId: 60718,
    hdId: 108248,
    properName: 'Mimosa',
    bayer: 'β Cru',
    constellation: 'Cru',
    ra: 186.228167,
    dec: -59.688833,
    pmRa: -21.82,
    pmDec: -12.44,
    parallax: 8.73,
    distance: 114.5,
    vMag: 1.25,
    absMag: -3.92,
    bvIndex: -0.23,
    spectralType: 'B0.5III',
    temperature: 27000,
  },
  // Regulus
  {
    hipId: 49669,
    hdId: 87901,
    properName: 'Regulus',
    bayer: 'α Leo',
    constellation: 'Leo',
    ra: 152.092857,
    dec: 11.967228,
    pmRa: -248.42,
    pmDec: 5.38,
    parallax: 42.09,
    distance: 23.76,
    vMag: 1.35,
    absMag: -0.52,
    bvIndex: -0.11,
    spectralType: 'B7V',
    temperature: 12460,
  },
  // Adhara
  {
    hipId: 33579,
    hdId: 50885,
    properName: 'Adhara',
    bayer: 'ε CMa',
    constellation: 'CMa',
    ra: 104.655833,
    dec: -28.996194,
    pmRa: -2.04,
    pmDec: 1.02,
    parallax: 6.33,
    distance: 158,
    vMag: 1.50,
    absMag: -4.11,
    bvIndex: -0.21,
    spectralType: 'B2II',
    temperature: 22900,
  },
  // Castor
  {
    hipId: 36850,
    hdId: 60178,
    properName: 'Castor',
    bayer: 'α Gem',
    constellation: 'Gem',
    ra: 113.649417,
    dec: 31.888269,
    pmRa: -177.12,
    pmDec: -90.54,
    parallax: 62.57,
    distance: 15.98,
    vMag: 1.58,
    absMag: 0.78,
    bvIndex: 0.03,
    spectralType: 'A1V',
    temperature: 10300,
  },
  // Gacrux
  {
    hipId: 61084,
    hdId: 108903,
    properName: 'Gacrux',
    bayer: 'γ Cru',
    constellation: 'Cru',
    ra: 187.79125,
    dec: -57.113194,
    pmRa: -228.71,
    pmDec: 50.91,
    parallax: 24.73,
    distance: 40.4,
    vMag: 1.63,
    absMag: -0.56,
    bvIndex: 1.59,
    spectralType: 'M3.5III',
    temperature: 3620,
  },
  // Shaula
  {
    hipId: 84478,
    hdId: 158408,
    properName: 'Shaula',
    bayer: 'λ Sco',
    constellation: 'Sco',
    ra: 258.102917,
    dec: -37.063583,
    pmRa: -5.51,
    pmDec: -16.67,
    parallax: 4.65,
    distance: 215,
    vMag: 1.62,
    absMag: -5.05,
    bvIndex: -0.22,
    spectralType: 'B2IV',
    temperature: 22000,
  },
  // Bellatrix
  {
    hipId: 25336,
    hdId: 35468,
    properName: 'Bellatrix',
    bayer: 'γ Ori',
    constellation: 'Ori',
    ra: 81.283291,
    dec: 6.349699,
    pmRa: 13.98,
    pmDec: -13.14,
    parallax: 13.33,
    distance: 75.0,
    vMag: 1.64,
    absMag: -2.72,
    bvIndex: -0.23,
    spectralType: 'B2III',
    temperature: 22000,
  },
  // Elnath
  {
    hipId: 25428,
    hdId: 35497,
    properName: 'Elnath',
    bayer: 'β Tau',
    constellation: 'Tau',
    ra: 81.573333,
    dec: 28.607361,
    pmRa: 17.93,
    pmDec: -26.73,
    parallax: 23.57,
    distance: 42.4,
    vMag: 1.65,
    absMag: -1.36,
    bvIndex: -0.13,
    spectralType: 'B7III',
    temperature: 13600,
  },
  // Miaplacidus
  {
    hipId: 46853,
    hdId: 82800,
    properName: 'Miaplacidus',
    bayer: 'β Car',
    constellation: 'Car',
    ra: 143.228333,
    dec: -69.717222,
    pmRa: 25.56,
    pmDec: 31.58,
    parallax: 16.31,
    distance: 61.3,
    vMag: 1.67,
    absMag: 0.30,
    bvIndex: 0.07,
    spectralType: 'A1III',
    temperature: 9700,
  },
  // Alnilam
  {
    hipId: 26311,
    hdId: 37128,
    properName: 'Alnilam',
    bayer: 'ε Ori',
    constellation: 'Ori',
    ra: 84.053083,
    dec: -1.201944,
    pmRa: 1.37,
    pmDec: -1.79,
    parallax: 2.43,
    distance: 411.5,
    vMag: 1.69,
    absMag: -6.38,
    bvIndex: -0.18,
    spectralType: 'B0Ia',
    temperature: 27500,
  },
  // Alioth
  {
    hipId: 62956,
    hdId: 112127,
    properName: 'Alioth',
    bayer: 'ε UMa',
    constellation: 'UMa',
    ra: 193.508333,
    dec: 55.959861,
    pmRa: 111.60,
    pmDec: -17.42,
    parallax: 39.42,
    distance: 25.4,
    vMag: 1.77,
    absMag: -0.21,
    bvIndex: -0.10,
    spectralType: 'A0p',
    temperature: 9400,
  },
  // Dubhe
  {
    hipId: 54061,
    hdId: 95689,
    properName: 'Dubhe',
    bayer: 'α UMa',
    constellation: 'UMa',
    ra: 165.932208,
    dec: 61.751056,
    pmRa: 131.43,
    pmDec: -15.88,
    parallax: 25.80,
    distance: 38.8,
    vMag: 1.79,
    absMag: -0.72,
    bvIndex: 1.01,
    spectralType: 'K0III',
    temperature: 4650,
  },
  // Alkaid
  {
    hipId: 67301,
    hdId: 120315,
    properName: 'Alkaid',
    bayer: 'η UMa',
    constellation: 'UMa',
    ra: 206.884708,
    dec: 49.313278,
    pmRa: -122.52,
    pmDec: 15.84,
    parallax: 20.06,
    distance: 49.8,
    vMag: 1.85,
    absMag: -0.60,
    bvIndex: -0.12,
    spectralType: 'B3V',
    temperature: 15540,
  },
  // Spica (already included)
  // Gienah
  {
    hipId: 61935,
    hdId: 109995,
    properName: 'Gienah',
    bayer: 'γ Cor',
    constellation: 'Cor',
    ra: 188.235,
    dec: -17.536111,
    pmRa: -106.02,
    pmDec: -70.49,
    parallax: 22.36,
    distance: 44.7,
    vMag: 2.58,
    absMag: 1.83,
    bvIndex: -0.12,
    spectralType: 'B8III',
    temperature: 11500,
  },
  // Proxima Centauri (closest star)
  {
    hipId: 70890,
    hdId: 126099,
    properName: 'Proxima Centauri',
    bayer: 'α Cen C',
    constellation: 'Cen',
    ra: 217.428928,
    dec: -62.679489,
    pmRa: -3775.75,
    pmDec: 765.54,
    parallax: 768.13,
    distance: 1.302,
    vMag: 11.13,
    absMag: 15.49,
    bvIndex: 1.85,
    spectralType: 'M5.5Ve',
    temperature: 3042,
  },
  // Barnard's Star
  {
    hipId: 87937,
    hdId: 163956,
    properName: 'Barnard\'s Star',
    constellation: 'Oph',
    ra: 269.452083,
    dec: 4.668056,
    pmRa: -798.58,
    pmDec: 10328.12,
    parallax: 549.30,
    distance: 1.82,
    vMag: 9.51,
    absMag: 13.21,
    bvIndex: 1.65,
    spectralType: 'M4Ve',
    temperature: 3134,
  },
  // Wolf 359
  {
    hipId: 47375,
    hdId: 83700,
    properName: 'Wolf 359',
    constellation: 'Leo',
    ra: 155.365,
    dec: 7.014,
    pmRa: -4610.0,
    pmDec: -580.0,
    parallax: 415.0,
    distance: 2.41,
    vMag: 13.44,
    absMag: 16.55,
    bvIndex: 1.85,
    spectralType: 'M6.5Ve',
    temperature: 2800,
  },
];

// Generate additional stars programmatically for a richer field
// In production, load full Hipparcos catalog from JSON/CSV
export function generateAdditionalStars(count: number = 20000): StarData[] {
  const stars: StarData[] = [];
  const constellations = [
    'And', 'Ant', 'Aps', 'Aqr', 'Aql', 'Ara', 'Ari', 'Aur', 'Boo', 'Cae',
    'Cam', 'Cnc', 'CVn', 'CMa', 'CMi', 'Car', 'Cas', 'Cen', 'Cep', 'Cet',
    'Cha', 'Cir', 'Col', 'Com', 'CrA', 'CrB', 'Crv', 'Crt', 'Cru', 'Cyg',
    'Del', 'Dor', 'Dra', 'Equ', 'Eri', 'For', 'Gem', 'Gru', 'Her', 'Hor',
    'Hya', 'Hyi', 'Ind', 'Lac', 'Leo', 'Lep', 'Lib', 'Lup', 'Lyn', 'Lyr',
    'Men', 'Mic', 'Mon', 'Mus', 'Nor', 'Oct', 'Oph', 'Ori', 'Pav', 'Peg',
    'Per', 'Phe', 'Pic', 'PsA', 'Psc', 'Pup', 'Pyx', 'Ret', 'Sge', 'Sgr',
    'Sco', 'Scl', 'Sct', 'Ser', 'Sex', 'Tau', 'Tel', 'Tri', 'TrA', 'Tuc',
    'UMa', 'UMi', 'Vel', 'Vir', 'Vol', 'Vul',
  ];

  for (let i = 0; i < count; i++) {
    // Random position on celestial sphere
    const u = Math.random();
    const v = Math.random();
    const ra = u * 360;
    const dec = Math.acos(2 * v - 1) * RAD_TO_DEG - 90;

    // Random magnitude (weighted toward fainter)
    const vMag = 1.5 + Math.random() * 7; // 1.5 to 8.5

    // Random B-V (weighted toward G/K stars)
    const bvIndex = Math.random() * 1.8 - 0.3; // -0.3 to 1.5

    // Random parallax (distance)
    // Most stars within a few hundred pc
    const parallax = Math.random() * 50 + 1; // 1-50 mas
    const distance = 1000 / parallax;

    // Proper motion (typically small)
    const pmRa = (Math.random() - 0.5) * 200;
    const pmDec = (Math.random() - 0.5) * 200;

    const spectralType = bvToSpectralType(bvIndex);

    stars.push({
      hipId: 100000 + i,
      hdId: 200000 + i,
      properName: undefined,
      bayer: undefined,
      constellation: constellations[Math.floor(Math.random() * constellations.length)],
      ra,
      dec,
      pmRa,
      pmDec,
      parallax,
      distance,
      vMag,
      absMag: absoluteMagnitude(vMag, parallax),
      bvIndex,
      spectralType,
      temperature: bvToTemperature(bvIndex),
    });
  }

  return stars;
}

/**
 * Approximate spectral type from B-V
 */
function bvToSpectralType(bv: number): string {
  if (bv < -0.3) return 'O';
  if (bv < 0.0) return 'B';
  if (bv < 0.3) return 'A';
  if (bv < 0.58) return 'F';
  if (bv < 0.82) return 'G';
  if (bv < 1.4) return 'K';
  return 'M';
}

/**
 * Approximate temperature from B-V
 */
function bvToTemperature(bv: number): number {
  if (bv < -0.3) return 35000;
  if (bv < 0.0) return 20000;
  if (bv < 0.3) return 9500;
  if (bv < 0.58) return 7000;
  if (bv < 0.82) return 5800;
  if (bv < 1.4) return 4500;
  if (bv < 1.8) return 3500;
  return 2500;
}

/**
 * Full star catalog (lazy loaded)
 * In production, this would be loaded from a JSON file or binary format
 */
let fullCatalog: StarData[] | null = null;

export async function loadFullStarCatalog(): Promise<StarData[]> {
  if (fullCatalog) return fullCatalog;

  // Start with bright stars
  fullCatalog = [...BRIGHT_STARS];

  // Add generated stars for now
  // In production: load from '/data/hipparcos.json' or similar
  const additional = generateAdditionalStars(20000);
  fullCatalog.push(...additional);

  return fullCatalog;
}

export function getStarCatalog(): StarData[] {
  if (!fullCatalog) {
    // Return bright stars synchronously, full catalog async
    return BRIGHT_STARS;
  }
  return fullCatalog;
}

// Brightest stars by constellation (for labels)
export const BRIGHTEST_BY_CONSTELLATION: Record<string, StarData> = {
  'CMa': BRIGHT_STARS.find(s => s.properName === 'Sirius')!,
  'Car': BRIGHT_STARS.find(s => s.properName === 'Canopus')!,
  'Cen': BRIGHT_STARS.find(s => s.properName === 'Rigil Kentaurus')!,
  'Boo': BRIGHT_STARS.find(s => s.properName === 'Arcturus')!,
  'Lyr': BRIGHT_STARS.find(s => s.properName === 'Vega')!,
  'Aur': BRIGHT_STARS.find(s => s.properName === 'Capella')!,
  'Ori': BRIGHT_STARS.find(s => s.properName === 'Rigel')!,
  'CMi': BRIGHT_STARS.find(s => s.properName === 'Procyon')!,
  'Eri': BRIGHT_STARS.find(s => s.properName === 'Achernar')!,
  'Sco': BRIGHT_STARS.find(s => s.properName === 'Antares')!,
  'Vir': BRIGHT_STARS.find(s => s.properName === 'Spica')!,
  'Gem': BRIGHT_STARS.find(s => s.properName === 'Pollux')!,
  'PsA': BRIGHT_STARS.find(s => s.properName === 'Fomalhaut')!,
  'Cyg': BRIGHT_STARS.find(s => s.properName === 'Deneb')!,
  'Cru': BRIGHT_STARS.find(s => s.properName === 'Mimosa')!,
  'Leo': BRIGHT_STARS.find(s => s.properName === 'Regulus')!,
  'Tau': BRIGHT_STARS.find(s => s.properName === 'Aldebaran')!,
  'Aql': BRIGHT_STARS.find(s => s.properName === 'Altair')!,
  'UMa': BRIGHT_STARS.find(s => s.properName === 'Alioth')!,
};

/**
 * Filter stars by magnitude limit (for LOD)
 */
export function filterStarsByMagnitude(
  stars: StarData[],
  maxMag: number,
  maxCount: number = 100000
): StarData[] {
  return stars
    .filter(s => s.vMag <= maxMag)
    .sort((a, b) => a.vMag - b.vMag)
    .slice(0, maxCount);
}

/**
 * Get stars in a field of view (cone search)
 */
export function starsInFOV(
  stars: StarData[],
  centerRa: number,
  centerDec: number,
  radiusDeg: number
): StarData[] {
  const radius = radiusDeg * DEG_TO_RAD;
  const sinDec0 = Math.sin(centerDec);
  const cosDec0 = Math.cos(centerDec);

  return stars.filter(s => {
    const sinDec = Math.sin(s.dec * DEG_TO_RAD);
    const cosDec = Math.cos(s.dec * DEG_TO_RAD);
    const cosDra = Math.cos((s.ra - centerRa) * DEG_TO_RAD);
    const angDist = Math.acos(Math.max(-1, Math.min(1, sinDec0 * sinDec + cosDec0 * cosDec * cosDra)));
    return angDist <= radius;
  });
}