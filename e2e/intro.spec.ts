import { test, expect } from '@playwright/test';
import { waitSceneReady, sceneMeshNames } from './helpers';

/**
 * Intro Sequence E2E Tests
 *
 * Tests the cinematic intro journey:
 * 1. Intro plays on first visit (no localStorage), Skip button visible
 * 2. Clicking Skip jumps to interactive view (scene ready, UI visible)
 * 3. Returning user (localStorage set) skips intro automatically
 * 4. Re-watch from Settings restarts intro
 * 5-6. Keyboard accessibility (Enter / Space)
 * 7. Phases progress in order
 * 8. prefers-reduced-motion completes near-instantly
 *
 * DESIGN: Playwright gives every test a fresh browser context, so a plain
 * page.goto('/') is a genuine first visit — no localStorage clearing needed.
 * The intro is ~17s while scene readiness under SwiftShader takes ~30s, so
 * WAITFOREVER on the scene BEFORE interacting with the intro would let it
 * self-complete. Tests therefore interact with the intro immediately after
 * goto, and only call waitSceneReady (which does NOT re-navigate, unlike
 * waitForAppReady) AFTER skipping/completing it.
 */
test.describe('Intro Sequence', () => {
  test.describe.configure({ timeout: 180_000 });

  test('intro plays on first visit with Skip button visible', async ({ page }) => {
    await page.goto('/');

    const introSequence = page.locator('.intro-sequence');
    await expect(introSequence).toBeVisible({ timeout: 15_000 });

    // Skip button, phase label and progress bar are all present.
    await expect(page.locator('.skip-intro-button')).toBeVisible();
    await expect(page.locator('.intro-phase-label')).toContainText('Big Bang');
    // The progress BAR (container) is always visible; the fill is 0-width at the
    // very start (Big Bang = progress 0), so assert the container instead.
    await expect(page.locator('.intro-progress')).toBeVisible();

    // Progress advances (monotonic; stays equal across a phase boundary).
    const progressBar = page.locator('.intro-progress-fill');
    const progress1 = await progressBar.evaluate((el) => el.getBoundingClientRect().width);
    await page.waitForTimeout(1200);
    const progress2 = await progressBar.evaluate((el) => el.getBoundingClientRect().width);
    expect(progress2).toBeGreaterThanOrEqual(progress1);
  });

  test('clicking Skip jumps to interactive view', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.intro-sequence', { state: 'visible', timeout: 15_000 });

    await page.locator('.skip-intro-button').click();

    // Intro unmounts, then the (already-mounted) main scene becomes interactive.
    await expect(page.locator('.intro-sequence')).not.toBeVisible({ timeout: 10_000 });
    await waitSceneReady(page);

    const meshes = await sceneMeshNames(page);
    expect(meshes).toContain('sun');
    expect(meshes.length).toBeGreaterThanOrEqual(8); // 8 planets + Sun

    await expect(page.locator('.ui-overlay')).toBeVisible();
    await expect(page.locator('.settings-toggle')).toBeVisible();
  });

  test('returning user skips intro automatically', async ({ page }) => {
    // First visit (intro plays), then flip the persisted flag and reload.
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('universe-explorer-intro-completed', 'true');
    });
    await page.reload();

    await waitSceneReady(page);

    // Intro never appears for a returning user.
    await expect(page.locator('.intro-sequence')).not.toBeVisible({ timeout: 5_000 });

    const meshes = await sceneMeshNames(page);
    expect(meshes).toContain('sun');
    expect(meshes.length).toBeGreaterThanOrEqual(8);
    await expect(page.locator('.ui-overlay')).toBeVisible();
  });

  test('re-watch from Settings restarts intro', async ({ page }) => {
    // Skip the first-visit intro so we're in the interactive app.
    await page.goto('/');
    await page.waitForSelector('.intro-sequence', { state: 'visible', timeout: 15_000 });
    await page.locator('.skip-intro-button').click();
    await expect(page.locator('.intro-sequence')).not.toBeVisible({ timeout: 10_000 });
    await waitSceneReady(page);

    // Open settings → Display tab → Re-watch Intro.
    await page.locator('.settings-toggle').click();
    const displayTab = page.locator('[data-tab="display"]');
    await expect(displayTab).toBeVisible();

    const rewatchButton = page.locator('button:has-text("Re-watch Intro")');
    await expect(rewatchButton).toBeVisible();
    await rewatchButton.click();

    // Intro restarts from Big Bang.
    await expect(page.locator('.intro-sequence')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.intro-phase-label')).toContainText('Big Bang');
    await expect(page.locator('.skip-intro-button')).toBeVisible();

    // Skip again to return to the interactive app.
    await page.locator('.skip-intro-button').click();
    await expect(page.locator('.intro-sequence')).not.toBeVisible({ timeout: 10_000 });
    await waitSceneReady(page);

    const meshes = await sceneMeshNames(page);
    expect(meshes).toContain('sun');
  });

  test('keyboard accessibility: Skip button works with Enter', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.intro-sequence', { state: 'visible', timeout: 15_000 });

    await page.locator('.skip-intro-button').focus();
    await page.keyboard.press('Enter');

    await expect(page.locator('.intro-sequence')).not.toBeVisible({ timeout: 10_000 });
    await waitSceneReady(page);

    const meshes = await sceneMeshNames(page);
    expect(meshes).toContain('sun');
  });

  test('keyboard accessibility: Skip button works with Space', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.intro-sequence', { state: 'visible', timeout: 15_000 });

    await page.locator('.skip-intro-button').focus();
    await page.keyboard.press('Space');

    await expect(page.locator('.intro-sequence')).not.toBeVisible({ timeout: 10_000 });
    await waitSceneReady(page);

    const meshes = await sceneMeshNames(page);
    expect(meshes).toContain('sun');
  });

  test('intro phases progress in order', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.intro-sequence', { state: 'visible', timeout: 15_000 });

    const phaseLabel = page.locator('.intro-phase-label');

    // Starts at Big Bang.
    await expect(phaseLabel).toContainText('Big Bang', { timeout: 15_000 });

    // The cinematic advances through the remaining phases IN ORDER. Use polling
    // expectations rather than fixed sleeps: each phase lasts several seconds,
    // and Playwright polls frequently enough to catch every one, so this stays
    // robust when the full-suite CI run is slower than a standalone run.
    await expect(phaseLabel).toContainText(/Galaxy Formation/, { timeout: 20_000 });
    await expect(phaseLabel).toContainText(/Solar System Formation/, { timeout: 20_000 });
    await expect(phaseLabel).toContainText(/Welcome to the Universe Explorer/, { timeout: 20_000 });

    // Once the ~17s cinematic is done, the intro unmounts.
    await expect(page.locator('.intro-sequence')).not.toBeVisible({ timeout: 20_000 });
  });

  test('respects prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    // The intro still starts (a static frame with the welcome label).
    await expect(page.locator('.intro-sequence')).toBeVisible({ timeout: 15_000 });

    // ...but completes near-instantly instead of running the 17s cinematic.
    await expect(page.locator('.intro-sequence')).not.toBeVisible({ timeout: 8_000 });
    await waitSceneReady(page);

    const meshes = await sceneMeshNames(page);
    expect(meshes).toContain('sun');
  });
});