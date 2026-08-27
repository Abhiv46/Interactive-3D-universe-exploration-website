const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Ensure textures directory exists
const texturesDir = path.join(__dirname, 'public', 'textures');
if (!fs.existsSync(texturesDir)) {
  fs.mkdirSync(texturesDir, { recursive: true });
}

// Generate Earth elevation texture (simplified SRTM-like)
function generateEarthHeightmap() {
  const width = 2048;
  const height = 1024;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Create base ocean level (dark)
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    const lat = (y / height) * 180 - 90; // -90 to 90
    for (let x = 0; x < width; x++) {
      const lon = (x / width) * 360 - 180; // -180 to 180
      const idx = (y * width + x) * 4;

      // Simplified Earth topography
      let elevation = 0;

      // Major mountain ranges
      if (lat > 25 && lat < 40 && lon > 65 && lon < 100) {
        // Himalayas
        elevation = 0.6 + Math.random() * 0.3;
      } else if (lat > 35 && lat < 50 && lon > -125 && lon < -100) {
        // Rockies
        elevation = 0.3 + Math.random() * 0.2;
      } else if (lat > -40 && lat < -10 && lon > -80 && lon < -60) {
        // Andes
        elevation = 0.4 + Math.random() * 0.3;
      } else if (lat > -65 && lat < -55) {
        // Antarctica
        elevation = 0.4 + Math.random() * 0.2;
      } else if (Math.abs(lat) > 70) {
        // Polar regions
        elevation = 0.3 + Math.random() * 0.2;
      } else if (Math.abs(lat) < 25) {
        // Tropical regions - varied
        elevation = Math.random() * 0.15;
      } else {
        // Default terrain
        elevation = Math.random() * 0.1;
      }

      // Ocean (roughly 70% of surface)
      const isOcean = (lat > -60 && lat < 60 && (
        (lon > -180 && lon < -30) || // Pacific
        (lon > -10 && lon < 50) ||   // Atlantic
        (lon > 50 && lon < 150)      // Indian Ocean
      ));

      if (isOcean) {
        // Ocean floor variation
        elevation = -0.2 - Math.random() * 0.3;
      }

      // Normalize to 0-255
      const val = Math.floor((elevation + 0.5) * 255);
      data[idx] = data[idx + 1] = data[idx + 2] = Math.max(0, Math.min(255, val));
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(texturesDir, 'earth_elevation.png'), buffer);
  console.log('Generated earth_elevation.png');
}

// Generate Moon elevation texture (LRO LOLA-like)
function generateMoonHeightmap() {
  const width = 2048;
  const height = 1024;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  // Major lunar features
  const features = [
    // Maria (dark, low elevation)
    { lat: 0.674, lon: 23.473, radius: 15, elevation: -0.3 }, // Sea of Tranquility
    { lat: 32.8, lon: -15.6, radius: 20, elevation: -0.4 },   // Mare Imbrium
    { lat: 26.0, lon: 18.0, radius: 15, elevation: -0.3 },    // Mare Serenitatis
    { lat: 17.0, lon: 59.0, radius: 12, elevation: -0.35 },   // Mare Crisium
    { lat: 18.4, lon: -57.4, radius: 25, elevation: -0.3 },   // Oceanus Procellarum
    // Major craters
    { lat: -43.37, lon: -11.22, radius: 8, elevation: 0.5 },  // Tycho
    { lat: 9.62, lon: -20.08, radius: 10, elevation: 0.45 },  // Copernicus
    { lat: -58.4, lon: -14.4, radius: 12, elevation: 0.3 },   // Clavius
    { lat: 23.7, lon: -47.4, radius: 5, elevation: 0.4 },     // Aristarchus
    // Poles
    { lat: 90, lon: 0, radius: 10, elevation: 0.3 },
    { lat: -90, lon: 0, radius: 10, elevation: 0.2 },
    // South Pole-Aitken Basin
    { lat: -56, lon: 180, radius: 40, elevation: -0.6 },
  ];

  for (let y = 0; y < height; y++) {
    const lat = (y / height) * 180 - 90;
    for (let x = 0; x < width; x++) {
      const lon = (x / width) * 360 - 180;
      const idx = (y * width + x) * 4;

      let elevation = Math.random() * 0.1; // Base cratered terrain

      // Check features
      for (const f of features) {
        const dLat = lat - f.lat;
        const dLon = ((lon - f.lon + 180) % 360) - 180;
        const dist = Math.sqrt(dLat * dLat + dLon * dLon);
        if (dist < f.radius) {
          const factor = 1 - dist / f.radius;
          elevation = f.elevation * factor + elevation * (1 - factor);
        }
      }

      const val = Math.floor((elevation + 0.5) * 255);
      data[idx] = data[idx + 1] = data[idx + 2] = Math.max(0, Math.min(255, val));
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(texturesDir, 'moon_elevation.png'), buffer);
  console.log('Generated moon_elevation.png');
}

// Generate Mars elevation texture (MGS MOLA-like)
function generateMarsHeightmap() {
  const width = 2048;
  const height = 1024;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  // Major Martian features
  const features = [
    // Volcanoes
    { lat: 18.65, lon: 226.2, radius: 15, elevation: 1.0 },    // Olympus Mons
    { lat: -1.0, lon: 247.0, radius: 12, elevation: 0.7 },     // Tharsis Montes
    { lat: 25.0, lon: 147.2, radius: 8, elevation: 0.6 },      // Elysium Mons
    { lat: -8.35, lon: 239.5, radius: 8, elevation: 0.75 },    // Arsia Mons
    { lat: 0.6, lon: 243.5, radius: 8, elevation: 0.65 },      // Pavonis Mons
    { lat: 11.3, lon: 255.5, radius: 8, elevation: 0.8 },      // Ascraeus Mons
    // Valles Marineris
    { lat: -14.0, lon: -59.0, radius: 25, elevation: -0.4 },   // Valles Marineris
    // Hellas Basin
    { lat: -42.4, lon: 70.5, radius: 30, elevation: -0.8 },    // Hellas Planitia
    // Landing sites
    { lat: -4.5, lon: 137.4, radius: 3, elevation: -0.5 },     // Gale Crater
    { lat: 18.4, lon: 77.5, radius: 3, elevation: -0.3 },      // Jezero Crater
    // Polar caps
    { lat: 90, lon: 0, radius: 15, elevation: 0.3 },
    { lat: -90, lon: 0, radius: 15, elevation: 0.35 },
  ];

  for (let y = 0; y < height; y++) {
    const lat = (y / height) * 180 - 90;
    for (let x = 0; x < width; x++) {
      const lon = (x / width) * 360 - 180;
      const idx = (y * width + x) * 4;

      // Base elevation - Mars has a strong dichotomy
      let elevation = (lat > 0 ? 0.2 : -0.1) + Math.random() * 0.1;

      // Check features
      for (const f of features) {
        const dLat = lat - f.lat;
        const dLon = ((lon - f.lon + 180) % 360) - 180;
        const dist = Math.sqrt(dLat * dLat + dLon * dLon);
        if (dist < f.radius) {
          const factor = 1 - dist / f.radius;
          elevation = f.elevation * factor + elevation * (1 - factor);
        }
      }

      const val = Math.floor((elevation + 0.5) * 255);
      data[idx] = data[idx + 1] = data[idx + 2] = Math.max(0, Math.min(255, val));
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(texturesDir, 'mars_elevation.png'), buffer);
  console.log('Generated mars_elevation.png');
}

// Run generation
generateEarthHeightmap();
generateMoonHeightmap();
generateMarsHeightmap();
console.log('All heightmaps generated!');