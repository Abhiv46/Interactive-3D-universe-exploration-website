import { expect, test } from '@playwright/test';
import {
  currentJulianDate,
  dateToJulian,
  expectNoErrors,
  type CapturedError,
  waitForAppReady,
} from './helpers';

/**
 * Every visible interactive element must actually DO something. Each test
 * clicks an element and asserts an observable change (text, visibility,
 * attribute, scene state) — "no error thrown" is not enough.
 *
 * Each test gets a fresh page + context (no leaked localStorage between them).
 */
test.describe('interactions', () => {
  // Headless SwiftShader WebGL is slow (35–55s app load per test) and the
  // screenshot test additionally runs a 2× (2560×1440) canvas export. The
  // default 60s budget — which also covers beforeEach — blows up under that.
  test.describe.configure({ timeout: 180_000 });

  let getErrors: () => CapturedError[];

  test.beforeEach(async ({ page }) => {
    getErrors = await waitForAppReady(page);
  });

  test.afterEach(async () => {
    // If beforeEach failed to finish, there is no error snapshot to assert;
    // report only the primary failure instead of stacking a cascade error.
    if (getErrors) expectNoErrors(getErrors);
  });

  test('DatePicker presets change simulation date', async ({ page }) => {
    const input = page.locator('.date-input');

    async function expectPreset(label: string, expectedIsoDate: string) {
      await page.locator('.date-preset', { hasText: label }).first().click();
      await expect(input).toHaveValue(expectedIsoDate);
    }

    // J2000 Epoch — verified against the exact constant, not a guess.
    await expectPreset('J2000 Epoch', '2000-01-01');
    const jd = await currentJulianDate(page);
    expect(Math.abs(jd - 2451545.0)).toBeLessThan(0.01);

    await expectPreset('Apollo 11 Landing', '1969-07-20');
    await expectPreset('Voyager 1 Launch', '1977-09-05');
    await expectPreset('JWST Launch', '2021-12-25');

    // The clock actually moved: julian date tracks the input we chose. Must
    // be checked while the date is still 2021-12-25, BEFORE the Today reset.
    const afterJwst = await currentJulianDate(page);
    expect(Math.abs(afterJwst - dateToJulian(new Date('2021-12-25').getTime()))).toBeLessThan(0.01);

    // Back to "now" — input must reflect the current UTC date.
    await expectPreset('Today', new Date().toISOString().slice(0, 10));
  });

  test('language dropdown switches language to Hindi and persists', async ({ page }) => {
    const languageButton = page.locator('button[aria-label="Language"]');
    await expect(languageButton).toBeVisible();

    // Dropping the listbox down
    await languageButton.click();
    await expect(page.locator('[role="listbox"]')).toBeVisible();

    // Selecting Hindi produces a real, observable change.
    await page.getByRole('option', { name: /हिन्दी/ }).click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
    // Note: the button's aria-label is itself translated ("भाषा") after switching,
    // so assert on visible text, not the pre-translation locator.
    await expect(page.locator('.top-bar')).toContainText('हिन्दी');
    const stored = await page.evaluate(() => localStorage.getItem('universe-explorer-language'));
    expect(stored).toBe('hi');
  });

  test('settings gear opens panel and a toggle actually flips', async ({ page }) => {
    const gear = page.locator('button[aria-label="Open settings"]');
    await expect(gear).toBeVisible();

    await gear.click();
    await expect(page.locator('#settings-content')).toBeVisible();
    await expect(page.locator('#settings-content button[aria-label="Close settings"]')).toBeVisible();

    // Flip an actual setting and watch the checkbox state change.
    // The input is visually hidden (custom-styled checkbox), so click the label instead.
    const orbitToggle = page.locator('label.setting-toggle:has-text("Show Orbit Lines")');
    const orbitCheckbox = orbitToggle.locator('input[type="checkbox"]');
    const before = await orbitCheckbox.isChecked();
    await orbitToggle.click();
    expect(await orbitCheckbox.isChecked()).toBe(!before);

    // Panel closes and the gear label flips back.
    await page.locator('#settings-content button[aria-label="Close settings"]').click();
    await expect(page.locator('button[aria-label="Open settings"]')).toBeVisible();
  });

  test('NASA APOD dropdown expands with content', async ({ page }) => {
    const header = page.locator('.apod-panel-wrapper button[aria-controls="apod-content"]');
    await expect(header).toBeVisible();
    await expect(header).toHaveAttribute('aria-expanded', 'false');

    await header.click();
    await expect(header).toHaveAttribute('aria-expanded', 'true');
    // Content is now present (loading, error, or the picture itself — never hidden).
    await expect(page.locator('#apod-content:not([hidden])')).toBeVisible();
  });

  test('search finds Mars and opens the info card', async ({ page }) => {
    const search = page.locator('.search-input');
    await search.fill('Mars');
    await expect(page.locator('.search-results')).toBeVisible();

    await page.locator('.search-result-item', { hasText: /Mars/i }).first().click();

    const infoCard = page.locator('.info-card');
    await expect(infoCard).toBeVisible();
    await expect(infoCard).toContainText('Mars');

    await page.locator('.info-card-close').click();
    await expect(infoCard).toBeHidden();
  });

  test('screenshot button saves and shows a toast', async ({ page }) => {
    // Headless SwiftShader renders the full scene in software, so the app's
    // default 2× capture freezes the main thread for minutes (observed). The
    // click contract — real handler → real PNG → success toast — is identical
    // at 1×, which completes in ~13s. Set the seam before clicking.
    await page.evaluate(() => {
      (window as any).__screenshotMultiplier__ = 1;
    });

    const btn = page.locator('.screenshot-btn');
    await expect(btn).toBeVisible();

    await btn.click();
    await expect(page.locator('[role="alert"]').filter({ hasText: 'Screenshot saved' })).toBeVisible({
      timeout: 60_000,
    });
  });

  test('share button opens the share dialog and closes it', async ({ page }) => {
    const btn = page.locator('.share-btn');
    await expect(btn).toBeVisible();

    await btn.click();
    const dialog = page.getByRole('dialog').filter({ hasText: 'Share This View' });
    await expect(dialog).toBeVisible();

    await page.locator('.share-dialog-close').click();
    await expect(dialog).toBeHidden();
  });

  test('guided tour starts, shows first stop, and stops', async ({ page }) => {
    const start = page.getByRole('button', { name: 'Start Tour' });
    await expect(start).toBeVisible();

    await start.click();

    // Tour header + first stop's narration are unmistakable.
    await expect(page.getByText('Guided Tour')).toBeVisible();
    await expect(page.getByText('The Sun').first()).toBeVisible();
    await expect(page.getByText(/Our star, the Sun/).first()).toBeVisible();

    await page.getByRole('button', { name: 'Stop Tour' }).click();
    await expect(page.getByRole('button', { name: 'Start Tour' })).toBeVisible();
  });

  test('achievements panel expands and lists achievements', async ({ page }) => {
    const open = page.getByRole('button', { name: 'Achievements' });
    await expect(open).toBeVisible();

    await open.click();

    // Scope to the achievements filter tabs: the settings panel's tablist is
    // always in the DOM, so an unscoped [role="tablist"] is a strict violation.
    const tablist = page.locator('[role="tablist"][aria-label="achievements.filter"]');
    await expect(tablist).toBeVisible();
    await expect(page.getByText('Solar System Explorer')).toBeVisible();

    await page.locator('button[aria-label="Collapse"]').first().click();
    await expect(tablist).toBeHidden();
  });

  test('feedback button opens the feedback dialog', async ({ page }) => {
    const feedback = page.locator('button[aria-haspopup="dialog"]');
    await expect(feedback).toBeVisible();

    await feedback.click();
    const dialog = page.getByRole('dialog').filter({ hasText: 'Send Feedback' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toBeHidden();
  });

  test('time control expands; Now and J2000 update the simulation date', async ({ page }) => {
    const compact = page.locator('.time-control-compact').first();
    await expect(compact).toBeVisible();

    await compact.click();
    await expect(page.locator('.time-control-expanded')).toBeVisible();

    // J2000 preset in the time control.
    await page.locator('.time-control-expanded button', { hasText: 'J2000' }).first().click();
    await expect(page.locator('.date-input')).toHaveValue('2000-01-01');

    // Reset back to now.
    await page.locator('.time-control-expanded button', { hasText: '📅 Now' }).first().click();
    await expect(page.locator('.date-input')).toHaveValue(new Date().toISOString().slice(0, 10));

    // Speed button actually changes the running speed indicator.
    await page.locator('.time-control-expanded button', { hasText: '10×' }).first().click();
    await expect(page.locator('.speed-display')).toHaveText('10×');
  });

  test('settings Time tab presets jump the simulation date', async ({ page }) => {
    await page.locator('button[aria-label="Open settings"]').click();
    await page.getByRole('tab', { name: 'Time' }).click();

    await expect(page.locator('[data-panel="time"]')).toBeVisible();

    await page.locator('.preset-btn', { hasText: 'Apollo 11' }).first().click();
    await expect(page.locator('.date-input')).toHaveValue('1969-07-16');

    await page.locator('.preset-btn', { hasText: 'Voyager 1' }).first().click();
    await expect(page.locator('.date-input')).toHaveValue('1977-09-05');
  });
});