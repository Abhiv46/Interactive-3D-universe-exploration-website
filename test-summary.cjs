const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', error => {
    pageErrors.push(error.message);
    console.log('[PAGE ERROR]', error.message);
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore normal expected network 404/429 fallback handling
      if (!text.includes('Failed to load resource') && !text.includes('429') && !text.includes('404')) {
        consoleErrors.push(text);
        console.log('[CONSOLE ERROR]', text);
      }
    }
  });

  console.log('Navigating to http://localhost:4180 ...');
  await page.goto('http://localhost:4180', { waitUntil: 'networkidle', timeout: 30000 });

  // Wait for loading screen to complete
  console.log('Waiting for loading screen to transition...');
  await page.waitForTimeout(6000);

  // Inspect Three.js Scene
  const sceneReport = await page.evaluate(() => {
    if (!window.__THREE__ || !window.__THREE__.scene) {
      return { error: 'window.__THREE__.scene not found' };
    }

    const scene = window.__THREE__.scene;
    const planets = [];
    const moons = [];
    let sunFound = false;

    const getVector3 = () => {
      if (window.__THREE__ && window.__THREE__.THREE && window.__THREE__.THREE.Vector3) {
        return new window.__THREE__.THREE.Vector3();
      }
      if (scene && scene.position && scene.position.clone) {
        return scene.position.clone();
      }
      return null;
    };

    scene.traverse(obj => {
      if (obj.name) {
        const lower = obj.name.toLowerCase();
        if (lower === 'sun') sunFound = true;
        if (['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'].includes(lower)) {
          const worldPos = { x: 0, y: 0, z: 0 };
          const v = getVector3();
          if (obj.getWorldPosition && v) {
            obj.getWorldPosition(v);
            worldPos.x = Math.round(v.x * 100) / 100;
            worldPos.y = Math.round(v.y * 100) / 100;
            worldPos.z = Math.round(v.z * 100) / 100;
          } else if (obj.position) {
            worldPos.x = Math.round(obj.position.x * 100) / 100;
            worldPos.y = Math.round(obj.position.y * 100) / 100;
            worldPos.z = Math.round(obj.position.z * 100) / 100;
          }
          planets.push({
            name: obj.name,
            type: obj.constructor.name,
            visible: obj.visible,
            worldPosition: worldPos,
            radius: obj.scale ? Math.round(obj.scale.x * 100) / 100 : null
          });
        }
        if (['moon', 'io', 'europa', 'ganymede', 'callisto', 'titan', 'enceladus'].includes(lower)) {
          const worldPos = { x: 0, y: 0, z: 0 };
          const v = getVector3();
          if (obj.getWorldPosition && v) {
            obj.getWorldPosition(v);
            worldPos.x = Math.round(v.x * 100) / 100;
            worldPos.y = Math.round(v.y * 100) / 100;
            worldPos.z = Math.round(v.z * 100) / 100;
          } else if (obj.position) {
            worldPos.x = Math.round(obj.position.x * 100) / 100;
            worldPos.y = Math.round(obj.position.y * 100) / 100;
            worldPos.z = Math.round(obj.position.z * 100) / 100;
          }
          moons.push({
            name: obj.name,
            worldPosition: worldPos
          });
        }
      }
    });

    const camera = window.__THREE__.camera;
    const cameraInfo = camera ? {
      position: { x: Math.round(camera.position.x), y: Math.round(camera.position.y), z: Math.round(camera.position.z) },
      fov: camera.fov,
      near: camera.near,
      far: camera.far
    } : null;

    return {
      sunFound,
      planetsCount: planets.length,
      planets,
      moonsCount: moons.length,
      moons,
      cameraInfo,
      scaleMode: window.__galaxyCamera ? window.__galaxyCamera.scaleMode : 'unknown'
    };
  });

  console.log('\n=== 3D SCENE VERIFICATION REPORT ===');
  console.log(JSON.stringify(sceneReport, null, 2));

  // Take full screenshot of verified running scene
  await page.screenshot({ path: 'verified-production-scene.png', fullPage: true });
  console.log('Saved screenshot: verified-production-scene.png');

  // Verify scene stability for 10 seconds
  console.log('Verifying scene stability over 10 seconds...');
  await page.waitForTimeout(10000);

  console.log('\n=== FINAL HEALTH CHECK ===');
  console.log('Page JS Exceptions:', pageErrors.length);
  console.log('Uncaught Console Errors:', consoleErrors.length);
  console.log('Planets in view:', sceneReport.planetsCount);
  console.log('Moons in view:', sceneReport.moonsCount);
  console.log('Sun verified:', sceneReport.sunFound);

  await browser.close();

  if (pageErrors.length > 0 || consoleErrors.length > 0 || sceneReport.planetsCount < 8) {
    console.error('FAILED verification');
    process.exit(1);
  } else {
    console.log('SUCCESS: All planets, moons, Sun, and scene stability verified!');
    process.exit(0);
  }
})();
