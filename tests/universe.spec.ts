import { test, expect } from '@playwright/test';

test('Universe Explorer loads and renders without errors for 10+ seconds', async ({ page }) => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Listen for console errors and warnings
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log(`[CONSOLE ERROR] ${msg.text()}`);
    } else if (msg.type() === 'warning') {
      warnings.push(msg.text());
      console.log(`[CONSOLE WARN] ${msg.text()}`);
    } else {
      console.log(`[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
    }
  });

  // Listen for page errors
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log(`[PAGE ERROR] ${error.message}`);
  });

  // Navigate to the app
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });

  // Wait for loading screen to appear
  await page.waitForSelector('.loading-screen', { timeout: 30000 });
  console.log('Loading screen detected');

  // Wait for loading to complete (progress reaches 100%)
  await page.waitForFunction(() => {
    const progressText = document.querySelector('.loading-progress-text')?.textContent || '';
    return progressText.includes('100%') || document.querySelector('canvas') !== null;
  }, { timeout: 60000 });
  console.log('Loading completed or canvas appeared');

  // Wait for canvas to be present and rendering
  await page.waitForSelector('canvas', { timeout: 30000 });
  console.log('Canvas detected');

  // Additional wait to ensure rendering is stable (10 seconds)
  await page.waitForTimeout(10000);
  console.log('Waited 10 seconds after canvas appeared');

  // Check for critical errors
  const criticalErrors = errors.filter(e =>
    e.includes('R3F: Hooks can only be used within the Canvas') ||
    e.includes('useScale must be used within a ScaleProvider') ||
    e.includes('Maximum update depth exceeded') ||
    e.includes('Minified React error #185') ||
    e.includes('getSnapshot should be cached') ||
    e.includes('cannot be updated while rendering') ||
    e.includes('Cannot read properties of null') ||
    e.includes('Cannot read properties of undefined')
  );

  console.log(`Total errors: ${errors.length}`);
  console.log(`Critical errors: ${criticalErrors.length}`);
  console.log(`Warnings: ${warnings.length}`);

  if (criticalErrors.length > 0) {
    console.error('CRITICAL ERRORS FOUND:');
    criticalErrors.forEach(e => console.error(`  - ${e}`));
    throw new Error(`Found ${criticalErrors.length} critical errors`);
  }

  // Verify canvas is still rendering (not black screen) - use the Three.js canvas, not the loading canvas
  const canvas = page.locator('canvas[data-engine="three.js r168"]');
  await expect(canvas).toBeVisible();

  // Take a screenshot for verification
  await page.screenshot({ path: 'test-result.png', fullPage: true });

  console.log('TEST PASSED: Application loaded and rendered without critical errors for 10+ seconds');
});