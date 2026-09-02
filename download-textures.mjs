// Download real 2K planet textures (Solar System Scope, CC BY 4.0) into
// public/textures/ using the project's existing {body}_{type}.jpg naming so
// the current texture references work unchanged. Skips anything already present
// and >10KB so re-runs are fast and safe.
//
// NOTE: SSS only provides diffuse/color maps for the 8 major planets + Moon +
// Sun. Normal/bump maps are NOT available from SSS except for Earth (TIF).
// Bodies without SSS diffuse maps (Pluto, Ceres, Galilean moons, Titan,
// Enceladus) will fall back to their baseColor.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'public', 'textures');
fs.mkdirSync(outDir, { recursive: true });

const BASE = 'https://www.solarsystemscope.com/textures/download/';

// SSS source file -> local texture file
// Only entries verified to return image/* content-type from SSS.
const TEX = {
  // ---- Diffuse / color maps (all major planets + Moon + Sun) ----
  '2k_mercury.jpg':          'mercury_diffuse.jpg',
  '2k_venus_surface.jpg':    'venus_diffuse.jpg',
  '2k_venus_atmosphere.jpg': 'venus_clouds.jpg',
  '2k_earth_daymap.jpg':     'earth_diffuse.jpg',
  '2k_earth_nightmap.jpg':   'earth_night.jpg',
  '2k_earth_clouds.jpg':     'earth_clouds.jpg',
  '2k_mars.jpg':             'mars_diffuse.jpg',
  '2k_jupiter.jpg':          'jupiter_diffuse.jpg',
  '2k_saturn.jpg':           'saturn_diffuse.jpg',
  '2k_saturn_ring_alpha.png':'saturn_rings.png',
  '2k_uranus.jpg':           'uranus_diffuse.jpg',
  '2k_neptune.jpg':          'neptune_diffuse.jpg',
  '2k_moon.jpg':             'moon_diffuse.jpg',
  '2k_sun.jpg':              'sun_diffuse.jpg',

  // ---- Earth normal + specular (TIF format — only ones SSS provides) ----
  '2k_earth_normal_map.tif':  'earth_normal_map.tif',
  '2k_earth_specular_map.tif':'earth_specular_map.tif',

  // ---- Star fields (for starfield/nebula enhancement) ----
  '2k_stars.jpg':            'stars.jpg',
  '2k_stars_milky_way.jpg':  'stars_milky_way.jpg',
};

async function download(src, dest) {
  const full = path.join(outDir, dest);
  if (fs.existsSync(full) && fs.statSync(full).size > 10000) {
    console.log(`SKIP  ${dest} (already present)`);
    return;
  }
  try {
    const res = await fetch(BASE + src);
    if (!res.ok) { console.log(`FAIL  ${src} -> HTTP ${res.status}`); return; }
    const ct = res.headers.get('content-type') || '';
    if (!ct.startsWith('image/')) {
      console.log(`FAIL  ${src} -> not an image (${ct})`);
      return;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(full, buf);
    console.log(`OK    ${dest} (${(buf.length / 1024).toFixed(0)} KB)`);
  } catch (e) {
    console.log(`ERR   ${src} -> ${e.message}`);
  }
}

for (const [src, dest] of Object.entries(TEX)) {
  await download(src, dest);
}
console.log('DONE');
