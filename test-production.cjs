const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage();

  const errors = [];
  const warnings = [];
  const logs = [];
  const networkRequests = [];

  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    logs.push({ type, text, timestamp: Date.now() });
    if (type === 'error') {
      errors.push({ text, timestamp: Date.now() });
    } else if (type === 'warning') {
      warnings.push({ text, timestamp: Date.now() });
    }
    // Print ALL logs for star data loading
    if (text.includes('star') || text.includes('Star') || text.includes('Hipparcos') || text.includes('catalog') || text.includes('progress') || text.includes('Loading') || text.includes('load')) {
      console.log(`[${type.toUpperCase()}] ${text}`);
    }
  });

  page.on('pageerror', error => {
    errors.push({ text: error.message, timestamp: Date.now() });
    console.log('[PAGE ERROR]', error.message);
  });

  page.on('request', request => {
    if (request.url().includes('star') || request.url().includes('hipparcos') || request.url().includes('catalog')) {
      networkRequests.push({ url: request.url(), method: request.method(), timestamp: Date.now() });
      console.log('[REQUEST]', request.method(), request.url());
    }
  });

  page.on('response', async response => {
    if (response.url().includes('star') || response.url().includes('hipparcos') || response.url().includes('catalog')) {
      let bodyText = '';
      try {
        bodyText = await response.text();
      } catch (e) {
        bodyText = 'error';
      }
      console.log('[RESPONSE]', response.status(), response.url(), 'size:', bodyText.length);
    }
  });

  try {
    console.log('Navigating to preview...');
    await page.goto('http://localhost:4177', { waitUntil: 'networkidle', timeout: 120000 });

    console.log('Page loaded, waiting for initial render...');
    await page.waitForTimeout(3000);

    // Check if window.__THREE__ is available
    const threeAvailable = await page.evaluate(() => window.__THREE__ && window.__THREE__.scene);
    console.log('window.__THREE__ available:', threeAvailable);
    console.log('window.__THREE__ raw:', await page.evaluate(() => window.__THREE__));
    if (!threeAvailable) {
      // Wait a bit more
      await page.waitForTimeout(5000);
      const threeCheck = await page.evaluate(() => window.__THREE__);
      console.log('window.__THREE__ after wait:', threeCheck);
    }

    // Take initial screenshot
    await page.screenshot({ path: 'preview-initial.png', fullPage: true });
    console.log('Initial screenshot taken');

    // Wait for loading screen to appear and monitor progress
    console.log('Monitoring loading progress for 60 seconds...');
    let lastProgress = -1;
    let stuckCount = 0;

    for (let i = 0; i < 120; i++) { // 120 * 500ms = 60 seconds
      await page.waitForTimeout(500);

      // Check loading progress via console or DOM
      const progressText = await page.evaluate(() => {
        const loadingEl = document.querySelector('.loading-screen, [class*="loading"], [class*="progress"]');
        if (loadingEl) return loadingEl.textContent;
        return null;
      });

      if (progressText && progressText !== lastProgress) {
        console.log('[PROGRESS]', progressText.trim());
        lastProgress = progressText;
        stuckCount = 0;
      } else if (progressText === lastProgress && progressText) {
        stuckCount++;
        if (stuckCount > 10) { // stuck for 5 seconds
          console.log('[STUCK] Progress has not changed for 5 seconds:', progressText.trim());
        }
      }

      // Check if planets are rendered
      const canvas = await page.$('canvas');
      if (canvas) {
        const planetCount = await page.evaluate(() => {
          // Check Three.js scene for planet meshes
          if (window.__THREE__ && window.__THREE__.scene) {
            let count = 0;
            window.__THREE__.scene.traverse(obj => {
              if (obj.name && (obj.name.toLowerCase().includes('planet') || obj.name.toLowerCase().includes('earth') || obj.name.toLowerCase().includes('mars') || obj.name.toLowerCase().includes('jupiter') || obj.name.toLowerCase().includes('saturn') || obj.name.toLowerCase().includes('mercury') || obj.name.toLowerCase().includes('venus') || obj.name.toLowerCase().includes('uranus') || obj.name.toLowerCase().includes('neptune'))) {
                count++;
              }
            });
            return count;
          }
          return -1;
        });
        if (planetCount > 0) {
          console.log('[PLANETS FOUND]', planetCount);
        } else if (planetCount === 0) {
          console.log('[NO PLANETS] Only Sun or nothing rendered');
        }
      }

      // Debug: Check julianDate and planet physical positions
      const debugInfo = await page.evaluate(() => {
        if (window.__THREE__ && window.__THREE__.scene) {
          const result = {};
          // Check simulation clock
          result.julianDate = window.__julianDate__ || 'not available';

          // Check planet group positions (Planet components are wrapped in <group position={position}>)
          const planets = [];
          window.__THREE__.scene.traverse(obj => {
            if (obj.name && (obj.name.toLowerCase().includes('mercury') || obj.name.toLowerCase().includes('venus') || obj.name.toLowerCase().includes('earth') || obj.name.toLowerCase().includes('mars') || obj.name.toLowerCase().includes('jupiter') || obj.name.toLowerCase().includes('saturn') || obj.name.toLowerCase().includes('uranus') || obj.name.toLowerCase().includes('neptune') || obj.name.toLowerCase().includes('moon'))) {
              const worldPos = {x: 0, y: 0, z: 0};
              if (obj.getWorldPosition) {
                const pos = new (window.__THREE__.THREE || window.__THREE__.gl.constructor).Vector3();
                obj.getWorldPosition(pos);
                worldPos.x = pos.x;
                worldPos.y = pos.y;
                worldPos.z = pos.z;
              }
              planets.push({
                name: obj.name,
                localPosition: obj.position ? {x: obj.position.x, y: obj.position.y, z: obj.position.z} : null,
                worldPosition: worldPos,
                type: obj.constructor.name
              });
            }
          });
          result.planets = planets;
          return result;
        }
        return {error: 'THREE not available'};
      });
      console.log('[DEBUG INFO]', JSON.stringify(debugInfo, null, 2));
    }

    // Click Skip if still loading
    const skipButton = await page.$('button:has-text("Skip"), button:has-text("skip"), button:has-text("SKIP")');
    if (skipButton) {
      console.log('Clicking Skip button...');
      await skipButton.click();
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'preview-after-skip.png', fullPage: true });
      console.log('After-skip screenshot taken');
    }

    // Final check for planets
    const finalPlanetCheck = await page.evaluate(() => {
      if (window.__THREE__ && window.__THREE__.scene) {
        const allObjects = [];
        const planets = [];
        window.__THREE__.scene.traverse(obj => {
          allObjects.push({ name: obj.name, type: obj.constructor.name, visible: obj.visible, position: obj.position ? {x: obj.position.x, y: obj.position.y, z: obj.position.z} : null });
          if (obj.name && (obj.name.toLowerCase().includes('planet') || obj.name.toLowerCase().includes('earth') || obj.name.toLowerCase().includes('mars') || obj.name.toLowerCase().includes('jupiter') || obj.name.toLowerCase().includes('saturn') || obj.name.toLowerCase().includes('mercury') || obj.name.toLowerCase().includes('venus') || obj.name.toLowerCase().includes('uranus') || obj.name.toLowerCase().includes('neptune') || obj.name.toLowerCase().includes('moon'))) {
            planets.push({ name: obj.name, visible: obj.visible, position: obj.position ? {x: obj.position.x, y: obj.position.y, z: obj.position.z} : null });
          }
        });
        console.log('[ALL OBJECTS IN SCENE COUNT]', allObjects.length);
        console.log('[ALL OBJECTS IN SCENE]', JSON.stringify(allObjects.slice(0, 100), null, 2));
        return planets;
      }
      return [];
    });
    console.log('[FINAL PLANETS]', JSON.stringify(finalPlanetCheck, null, 2));

    // Also check scale mode
    const scaleModeCheck = await page.evaluate(() => {
      if (window.__galaxyCamera) {
        return window.__galaxyCamera;
      }
      return 'not available';
    });
    console.log('[GALAXY CAMERA]', JSON.stringify(scaleModeCheck, null, 2));

    // Check camera position
    const cameraPos = await page.evaluate(() => {
      if (window.__THREE__ && window.__THREE__.camera) {
        const cam = window.__THREE__.camera;
        return { x: cam.position.x, y: cam.position.y, z: cam.position.z, distance: Math.sqrt(cam.position.x**2 + cam.position.y**2 + cam.position.z**2) };
      }
      return 'not available';
    });
    console.log('[CAMERA POSITION]', JSON.stringify(cameraPos, null, 2));

  } catch (e) {
    console.error('Navigation error:', e.message);
  }

  console.log('\n=== SUMMARY ===');
  console.log('Errors:', errors.length);
  console.log('Warnings:', warnings.length);
  console.log('Total logs:', logs.length);

  if (errors.length > 0) {
    console.log('\n=== ERRORS ===');
    errors.forEach(e => console.log('ERROR:', e.text));
  }

  await browser.close();
  process.exit(errors.length > 0 ? 1 : 0);
})();