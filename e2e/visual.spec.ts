import { expect, test } from '@playwright/test';
import { pauseSimulation, waitForAppReady } from './helpers';

/**
 * Visual regression baseline of the default view.
 *
 * NOTE on tolerance: the generated background stars (20k of them) are laid out
 * with Math.random() on every load, and the Sun's corona is animated, so a
 * pixel-exact baseline would flake. These screenshots therefore act as a COARSE
 * net — they catch a black/blown-out canvas, a missing UI chrome, or a broken
 * layout, while tolerating starfield noise. Phase 2 replaces the random star
 * field with a deterministic Hipparcos catalog, which lets us tighten this.
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
      maxDiffPixelRatio: 0.20,
      maxDiffPixels: 10_000,
      animations: 'disabled',
      timeout: 30_000,
    });
  });
});