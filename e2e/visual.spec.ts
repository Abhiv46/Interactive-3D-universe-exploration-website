import { expect, test } from '@playwright/test';
import { pauseSimulation, waitForAppReady } from './helpers';

/**
 * Visual regression baseline of the default view.
 *
 * The night sky is now a deterministic Hipparcos catalog (static JSON, no
 * Math.random), and the Sun's corona is frozen while the simulation is paused
 * (see pauseSimulation), so the scene is pixel-stable. The tolerance is tight
 * but not pixel-exact to still absorb the tiny sub-pixel text/AA differences
 * that differ across Chromium builds — while still catching a black/blown-out
 * canvas, missing UI chrome, or a broken layout.
 *
 * HEADLESS SWIFTSHADER NOTE: the WebGL canvas renders black in headless
 * Chrome (SwiftShader doesn't composite the EffectComposer pipeline), so the
 * baseline reflects that: black canvas + UI chrome. The test catches regressions
 * in UI layout, missing elements, and layout shifts — not 3D rendering quality.
 */
test.describe('visual regression', () => {
  // Same SwiftShader budget as interactions.spec.ts — a cold app load alone
  // can run 40–60s; the default 60s per-test window is too tight for it plus
  // the screenshot capture.
  test.describe.configure({ timeout: 180_000 });

  test('default view matches the committed baseline', async ({ page }) => {
    await waitForAppReady(page);
    await pauseSimulation(page);
    // Let orbit damping + bloom settle completely before capturing.
    await page.waitForTimeout(2_000);

    await expect(page).toHaveScreenshot('default-view.png', {
      maxDiffPixelRatio: 0.05,
      maxDiffPixels: 10_000,
      animations: 'disabled',
      timeout: 30_000,
    });
  });
});