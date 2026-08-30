const fs = require('fs');
const path = require('path');

// Create canvas-like textures using pure JavaScript (no canvas dependency)
// We'll generate simple PPM files and convert them, or use a simple approach

// Since we can't use canvas in Node easily without dependencies,
// let's create simple colored PPM files and then use ImageMagick or similar if available,
// or just create minimal valid image files.

// Alternative: Use a simple approach - create small PNG files using a minimal PNG writer
// or better yet, just use the createFallbackTexture approach but save to files.

// Actually, the simplest approach: create 1x1 pixel colored PNGs using a known PNG header
// This is a minimal valid PNG file (1x1 pixel, RGBA)

// Color definitions for each planet/texture
const textureColors = {
  // Sun
  'sun_diffuse.jpg': { r: 255, g: 245, b: 230 }, // #fff5e6
  'sun_surface.jpg': { r: 255, g: 245, b: 230 },
  'corona.png': { r: 255, g: 204, b: 0, a: 77 }, // #ffcc00 with opacity

  // Mercury
  'mercury_diffuse.jpg': { r: 181, g: 181, b: 181 }, // #b5b5b5
  'mercury_normal.jpg': { r: 128, g: 128, b: 255 }, // Normal map default
  'mercury_elevation.jpg': { r: 181, g: 181, b: 181 },

  // Venus
  'venus_diffuse.jpg': { r: 230, g: 200, b: 122 }, // #e6c87a
  'venus_normal.jpg': { r: 128, g: 128, b: 255 },
  'venus_clouds.jpg': { r: 245, g: 230, b: 200, a: 200 },

  // Earth
  'earth_diffuse.jpg': { r: 59, g: 115, b: 184 }, // #3b73b8
  'earth_normal.jpg': { r: 128, g: 128, b: 255 },
  'earth_specular.jpg': { r: 30, g: 30, b: 60 }, // Dark for oceans
  'earth_elevation.jpg': { r: 100, g: 100, b: 100 },
  'earth_night.jpg': { r: 30, g: 30, b: 50 }, // Dark with city lights
  'earth_clouds.jpg': { r: 255, g: 255, b: 255, a: 180 },

  // Moon
  'moon_diffuse.jpg': { r: 170, g: 170, b: 170 }, // #aaaaaa
  'moon_normal.jpg': { r: 128, g: 128, b: 255 },
  'moon_elevation.jpg': { r: 170, g: 170, b: 170 },

  // Mars
  'mars_diffuse.jpg': { r: 193, g: 68, b: 14 }, // #c1440e
  'mars_normal.jpg': { r: 128, g: 128, b: 255 },
  'mars_elevation.jpg': { r: 193, g: 68, b: 14 },

  // Jupiter
  'jupiter_diffuse.jpg': { r: 212, g: 167, b: 106 }, // #d4a76a
  'jupiter_normal.jpg': { r: 128, g: 128, b: 255 },

  // Io
  'io_diffuse.jpg': { r: 244, g: 213, b: 158 }, // #f4d59e

  // Europa
  'europa_diffuse.jpg': { r: 245, g: 240, b: 225 }, // #f5f0e1

  // Ganymede
  'ganymede_diffuse.jpg': { r: 184, g: 168, b: 152 }, // #b8a898

  // Callisto
  'callisto_diffuse.jpg': { r: 152, g: 136, b: 120 }, // #988878

  // Saturn
  'saturn_diffuse.jpg': { r: 244, g: 228, b: 188 }, // #f4e4bc
  'saturn_normal.jpg': { r: 128, g: 128, b: 255 },
  'saturn_rings.png': { r: 201, g: 184, b: 150, a: 179 }, // #c9b896

  // Titan
  'titan_diffuse.jpg': { r: 212, g: 168, b: 67 }, // #d4a843

  // Enceladus
  'enceladus_diffuse.jpg': { r: 255, g: 255, b: 255 }, // #ffffff

  // Uranus
  'uranus_diffuse.jpg': { r: 125, g: 227, b: 244 }, // #7de3f4
  'uranus_normal.jpg': { r: 128, g: 128, b: 255 },

  // Neptune
  'neptune_diffuse.jpg': { r: 75, g: 112, b: 221 }, // #4b70dd
  'neptune_normal.jpg': { r: 128, g: 128, b: 255 },

  // Pluto
  'pluto_diffuse.jpg': { r: 184, g: 160, b: 136 }, // #b8a088
  'pluto_normal.jpg': { r: 128, g: 128, b: 255 },

  // Ceres
  'ceres_diffuse.jpg': { r: 140, g: 140, b: 140 }, // #8c8c8c

  // Eris
  'eris_diffuse.jpg': { r: 255, g: 255, b: 255 }, // #ffffff

  // Makemake
  'makemake_diffuse.jpg': { r: 221, g: 221, b: 187 }, // #ddddbb

  // Haumea
  'haumea_diffuse.jpg': { r: 255, g: 255, b: 255 }, // #ffffff
};

// Minimal PNG writer for 1x1 pixel
function create1x1PNG(r, g, b, a = 255) {
  // PNG signature
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(1, 0);   // width
  ihdrData.writeUInt32BE(1, 4);   // height
  ihdrData[8] = 8;                // bit depth
  ihdrData[9] = 6;                // color type (RGBA)
  ihdrData[10] = 0;               // compression
  ihdrData[11] = 0;               // filter
  ihdrData[12] = 0;               // interlace
  const ihdrLen = Buffer.alloc(4);
  ihdrLen.writeUInt32BE(13, 0);
  const ihdrType = Buffer.from('IHDR');
  const ihdrCRC = crc32(Buffer.concat([ihdrType, ihdrData]));
  const ihdrChunk = Buffer.concat([ihdrLen, ihdrType, ihdrData, ihdrCRC]);

  // IDAT chunk (compressed)
  // For 1x1 RGBA: filter byte (0) + 4 bytes pixel data
  const rawData = Buffer.from([0, r, g, b, a]);
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(rawData);
  const idatLen = Buffer.alloc(4);
  idatLen.writeUInt32BE(compressed.length, 0);
  const idatType = Buffer.from('IDAT');
  const idatCRC = crc32(Buffer.concat([idatType, compressed]));
  const idatChunk = Buffer.concat([idatLen, idatType, compressed, idatCRC]);

  // IEND chunk
  const iendLen = Buffer.from([0, 0, 0, 0]);
  const iendType = Buffer.from('IEND');
  const iendCRC = crc32(iendType);
  const iendChunk = Buffer.concat([iendLen, iendType, iendCRC]);

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// CRC32 implementation
const crcTable = [];
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[i] = c;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return Buffer.from([(crc >>> 24) & 0xFF, (crc >>> 16) & 0xFF, (crc >>> 8) & 0xFF, crc & 0xFF]);
}

// Generate all textures
const texturesDir = path.join(__dirname, '..', 'public', 'textures');

if (!fs.existsSync(texturesDir)) {
  fs.mkdirSync(texturesDir, { recursive: true });
}

console.log('Generating placeholder textures...');

for (const [filename, color] of Object.entries(textureColors)) {
  const filepath = path.join(texturesDir, filename);
  const png = create1x1PNG(color.r, color.g, color.b, color.a || 255);
  fs.writeFileSync(filepath, png);
  console.log(`Created: ${filename}`);
}

console.log('Done! Generated', Object.keys(textureColors).length, 'textures.');