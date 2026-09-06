import { expect, test } from '@playwright/test';
import {
  type CapturedError,
  expectNoErrors,
  waitForAppReady,
} from './helpers';

/**
 * In-canvas body labels must be hidden by default and appear only on hover,
 * selection (click / search), or when the camera zooms close — gated by the
 * "Show Labels" setting.
 *
 * SwiftShader note: the WebGL canvas composites black, but R3F raycasts
 * geometry (not pixels), so pointer-hover hits work headless. The Sun sits at
 * world origin with the default camera at [0,120,1500] looking at the origin,
 * so it projects to the screen center.
 */
test.describe('body labels', () => {
  // Same SwiftShader budget as the other specs — a cold app load alone can run
  // 40–60s per test.
  test.describe.configure({ timeout: 180_000 });

  let getErrors: () => CapturedError[];

  test.beforeEach(async ({ page }) => {
    getErrors = await waitForAppReady(page);
  });

  test.afterEach(async () => {
    if (getErrors) expectNoErrors(getErrors);
  });

  test('no labels are visible in the default view', async ({ page }) => {
    // The default camera sits ~1500 units out; every body's zoom threshold is
    // well inside that, and nothing is hovered or selected, so no label should
    // be rendered at all.
    await expect(page.locator('.body-label')).toHaveCount(0);
  });

  test('hovering the Sun shows its label, moving away hides it', async ({ page }) => {
    const sunLabel = page.locator('.body-label[data-body-id="sun"]');

    // The Sun is at the origin and the default camera looks at the origin, so
    // the Sun's ~30-unit ball projects to the screen center (~16px across).
    const box = page.viewportSize() ?? { width: 1280, height: 720 };
    await page.mouse.move(Math.floor(box.width / 2), Math.floor(box.height / 2));

    await expect(sunLabel).toBeVisible({ timeout: 15_000 });

    // Move to an empty corner — no body there — and the label must hide.
    await page.mouse.move(10, 10);
    await expect(sunLabel).toBeHidden({ timeout: 15_000 });
  });

  test('searching a body shows its label; closing the card hides it', async ({ page }) => {
    const marsLabel = page.locator('.body-label[data-body-id="mars"]');
    await expect(marsLabel).toHaveCount(0);

    // Same flow as interactions.spec: search -> click result -> info card opens
    // (which also drives the shared selection the in-canvas label reads).
    const search = page.locator('.search-input');
    await search.fill('Mars');
    await expect(page.locator('.search-results')).toBeVisible();

    await page.locator('.search-result-item', { hasText: /Mars/i }).first().click();

    await expect(page.locator('.info-card')).toBeVisible();
    await expect(marsLabel).toBeVisible({ timeout: 15_000 });

    // Closing the info card clears the selection, so the label hides.
    await page.locator('.info-card-close').click();
    await expect(page.locator('.info-card')).toBeHidden();
    await expect(marsLabel).toBeHidden({ timeout: 15_000 });
  });

  test('zooming in close reveals a label', async ({ page }) => {
    const sunLabel = page.locator('.body-label[data-body-id="sun"]');
    await expect(sunLabel).toHaveCount(0);

    // Dolly the OrbitControls in toward the origin (Sun). Three.js
    // OrbitControls zooms via camera.zoom (projection), where each wheel event
    // increases zoom by ~5% — we need zoom > 2× to bring the effective distance
    // (position / zoom) below the Sun's threshold (radius*25 = 750 from an
    // initial distance of ~1500). Dispatch 30 scroll events to accumulate
    // enough zoom.
    await page.mouse.move(Math.floor((page.viewportSize()?.width ?? 1280) / 2), Math.floor((page.viewportSize()?.height ?? 720) / 2));
    for (let i = 0; i < 30; i++) {
      await page.mouse.wheel(0, -200);
    }

    // Let orbit damping settle, then the label should be present.
    await expect(sunLabel).toBeVisible({ timeout: 20_000 });
  });
});
