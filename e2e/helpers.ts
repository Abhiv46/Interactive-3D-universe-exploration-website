import { expect, Page } from '@playwright/test';

/**
 * Shared helpers for the Universe Explorer E2E suite.
 */

export type CapturedError = { type: 'console' | 'page'; text: string; url?: string };

/**
 * URLs/patterns that may legitimately fail to load in an offline CI container
 * (external CDNs, rate-limited third-party APIs, optional social assets). These
 * are the ONLY console errors the suite tolerates. Anything else — an uncaught
 * exception, a missing local texture, a rejected internal fetch — is treated as
 * a real defect.
 *
 * Matching is done against BOTH the console message text and the reconciling
 * URL. Chromium's network error text ("Failed to load resource: the server
 * responded with a status of 429 ()") contains no URL, so message-text matching
 * alone would misclassify a rate-limited NASA request as a defect.
 */
const BENIGN_URL_PATTERNS: RegExp[] = [
  /fonts\.(googleapis|gstatic)\.com/,
  /api\.nasa\.gov/,
  /images-api\.nasa\.gov/,
  /apod\.nasa\.gov/,
  /favicon\.ico/,
  /vite\.svg/,
  /manifest\.json/,
  /og-image\.png/,
  /robots\.txt/,
  /sitemap\.xml/,
];

export function isBenignError(err: CapturedError): boolean {
  // An uncaught page exception is never acceptable noise.
  if (err.type === 'page') return false;
  return BENIGN_URL_PATTERNS.some((re) => re.test(err.text) || (err.url ? re.test(err.url) : false));
}

/** Start capturing console+page errors. Returns a snapshot function. */
export function watchErrors(page: Page): () => CapturedError[] {
  const errors: CapturedError[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const url = msg.location()?.url ?? '';
      errors.push({ type: 'console', text: msg.text(), url });
    }
  });
  page.on('pageerror', (err) => errors.push({ type: 'page', text: String(err) }));
  return () => errors.slice();
}

/** Assert the app produced zero uncaught/non-benign errors. */
export function expectNoErrors(snapshot: () => CapturedError[]): void {
  const real = snapshot().filter((e) => !isBenignError(e));
  expect(
    real,
    `Expected ZERO uncaught console/page errors, got:\n${real
      .map((e) => `[${e.type}] ${e.text}${e.url ? ` (${e.url})` : ''}`)
      .join('\n')}`,
  ).toEqual([]);
}

/**
 * Load the app and wait until it is genuinely ready to drive:
 *  1. loading screen appears, then disappears (or we skip it / it self-completes)
 *  2. the WebGL scene is registered on window.__THREE__
 *  3. the canvas has been rendered for a moment
 *
 * By default the test runs as a "returning user" (the intro-completed flag is
 * seeded before load), so the cinematic intro never plays and the 20 pre-existing
 * tests keep their pre-Phase-3 behavior. Tests that specifically exercise the
 * intro pass `{ seedIntroCompleted: false }` and manage localStorage themselves.
 *
 * `waitForAppReady` returns the persisted `errors()` snapshot handle so a test
 * can keep gathering errors across the whole test and assert at the end.
 */
export async function waitForAppReady(page: Page, opts: { seedIntroCompleted?: boolean } = {}): Promise<() => CapturedError[]> {
  const { seedIntroCompleted = true } = opts;

  if (seedIntroCompleted) {
    // Fast-path: seed the persisted flag so IntroProvider initializes to
    // phase 'complete' and IntroSequence renders nothing.
    await page.addInitScript(() => {
      try {
        localStorage.setItem('universe-explorer-intro-completed', 'true');
      } catch {
        /* localStorage unavailable — treat as a fresh visit; the suite will still pass, just slower */
      }
    });
  }

  const errors = watchErrors(page);

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // The loading overlay normally mounts immediately, but under heavy CI load
  // the first React mount (and its `visible`) can lag past any fixed window.
  // Treat a missed loading screen as non-fatal: if the app already loaded
  // (overlay skipped) or is still booting, the scene-ready wait below is the
  // gate that matters. A hard timeout here only added a spurious failure mode
  // (observed on the feedback test during a contention-heavy run).
  const loadingSeen = await page
    .locator('.loading-screen')
    .waitFor({ state: 'visible', timeout: 20_000 })
    .then(() => true)
    .catch(() => false);

  if (loadingSeen) {
    // Give it a moment to make real progress, then skip if it is still stuck.
    await page.waitForTimeout(4_000);
    const skip = page.locator('.loading-skip');
    if ((await skip.count()) > 0) {
      await skip.first().click({ timeout: 5_000 }).catch(() => {});
    }

    // Loading overlay must fully detach before we consider the app usable.
    await page
      .locator('.loading-screen')
      .waitFor({ state: 'detached', timeout: 60_000 })
      .catch(() => {});
  }

  // Scene must be live and exposing its internals.
  await page.waitForFunction(
    () => !!((window as any).__THREE__?.scene && (window as any).__THREE__?.gl),
    undefined,
    { timeout: 90_000 },
  );

  // A few frames so bloom/orbit damping settle before screenshot-dependent assertions.
  await page.waitForTimeout(2_500);

  return errors;
}

/**
 * Wait for the SCENE to be live on the CURRENT page without re-navigating.
 * Used by intro tests: the intro must still be assertable in the meantime, and
 * waitForAppReady's page.goto() would discard the intro state. Waits for the
 * loading overlay to detach (assets done), the scene to expose __THREE__, and a
 * short settle for bloom/orbit damping.
 */
export async function waitSceneReady(page: Page): Promise<void> {
  await page
    .locator('.loading-screen')
    .waitFor({ state: 'detached', timeout: 60_000 })
    .catch(() => {});
  await page.waitForFunction(
    () => !!((window as any).__THREE__?.scene && (window as any).__THREE__?.gl),
    undefined,
    { timeout: 120_000 },
  );
  await page.waitForTimeout(1_500);
}

/** All mesh names currently present in the Three.js scene. */
export async function sceneMeshNames(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const t = (window as any).__THREE__;
    if (!t?.scene) return [];
    const names: string[] = [];
    t.scene.traverse((obj: any) => {
      if (obj && obj.isMesh && obj.name) names.push(obj.name);
    });
    return names;
  });
}

/**
 * Prove the WebGL canvas is actually drawing (i.e. NOT a blank black canvas).
 *
 * Note on technique: `gl.readPixels` on the default framebuffer returns zeros
 * the moment the frame is composited (THREE uses preserveDrawingBuffer:false),
 * so instead we read the *displayed* output via the canvas's `toDataURL()` —
 * the exact same path the app's own screenshot button uses. The PNG is decoded
 * into an offscreen 2D canvas and sampled over the central third of the screen.
 *
 * Returns { lit, total, max } where a bright Sun / lit starfield keeps both
 * `max` high and `lit/total` comfortably above 0.
 */
export async function sampleCanvas(
  page: Page,
): Promise<{ lit: number; total: number; max: number; w: number; h: number; decoded: boolean }> {
  return page.evaluate(async () => {
    const t = (window as any).__THREE__;
    const renderer = t?.gl as any;
    if (!renderer?.domElement) return { lit: 0, total: 0, max: 0, w: 0, h: 0, decoded: false };

    // Force a synchronous re-render so the buffer matches the current scene,
    // then snapshot the presented canvas. Readbacks inside the same task that
    // produced the frame are the only guarantee we see actual pixels. (Note:
    // `gl.readPixels` on the default framebuffer is unreliable here — THREE uses
    // preserveDrawingBuffer:false and SwiftShader clears post-composite — so we
    // read the PNG the compositor presents, exactly like the app's screenshot
    // button does.)
    if (renderer.render && t.scene && t.camera) {
      renderer.render(t.scene, t.camera);
    }

    const src: string = renderer.domElement.toDataURL('image/png');
    if (!src.startsWith('data:image/png')) return { lit: 0, total: 0, max: 0, w: 0, h: 0, decoded: false };

    const img = new Image();
    const decodedPromise = new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });
    img.src = src;
    const decoded = await decodedPromise;
    if (!decoded) return { lit: 0, total: 0, max: 0, w: 0, h: 0, decoded: false };

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return { lit: 0, total: 0, max: 0, w: 0, h: 0, decoded: false };

    const c2d = document.createElement('canvas');
    c2d.width = w;
    c2d.height = h;
    const ctx = c2d.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);
    const px = ctx.getImageData(0, 0, w, h).data;

    let lit = 0;
    let max = 0;
    let total = 0;
    for (let y = Math.floor(h / 3); y < (2 * h) / 3; y += 6) {
      for (let x = Math.floor(w / 3); x < (2 * w) / 3; x += 6) {
        const i = (y * w + x) * 4;
        const v = Math.max(px[i], px[i + 1], px[i + 2]);
        if (v > 12) lit += 1;
        if (v > max) max = v;
        total += 1;
      }
    }
    return { lit, total, max, w, h, decoded: true };
  });
}

/** Julian Date currently set on the simulation clock. */
export async function currentJulianDate(page: Page): Promise<number> {
  const jd = await page.evaluate(() => (window as any).__julianDate__ as number | undefined);
  if (typeof jd !== 'number') throw new Error('window.__julianDate__ not exposed');
  return jd;
}

/** Pause the simulation clock so animated bodies hold still (for screenshots). */
export async function pauseSimulation(page: Page): Promise<void> {
  await page.evaluate(() => {
    // The play/pause lives in the UI; drive the button rather than internals.
    const btn = document.querySelector('.play-toggle') as HTMLButtonElement | null;
    if (btn && btn.getAttribute('aria-label') === 'Pause') btn.click();
  });
}

/** Convert a JS Date to a Julian Date (same convention as the app). */
export function dateToJulian(dateMs: number): number {
  return dateMs / 86_400_000 + 2440587.5;
}