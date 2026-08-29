# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: universe.spec.ts >> Universe Explorer loads and renders without errors for 10+ seconds
- Location: tests\universe.spec.ts:3:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForTimeout: Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e7] [cursor=pointer]:
    - generic [ref=e8]:
      - generic [ref=e9]: 2026-08-29 01:51:03 UTC
      - generic [ref=e10]: JD 2461281.57712
    - generic [ref=e11]: ▶ 1×
    - button "⌄" [ref=e13]
  - generic:
    - generic:
      - generic [ref=e14]: Universe Explorer
      - generic [ref=e16]:
        - generic: 🔍
        - textbox "Search objects... (e.g. Mars, Sirius, Andromeda)" [ref=e17]
      - generic [ref=e18]:
        - generic [ref=e19]:
          - generic [ref=e20]: Simulation Date
          - generic [ref=e21]:
            - textbox "Simulation Date" [ref=e22] [cursor=pointer]: 2026-08-29
            - button "Open calendar" [ref=e23] [cursor=pointer]
        - generic [ref=e26]:
          - button "Today" [ref=e27] [cursor=pointer]
          - button "J2000 Epoch" [ref=e28] [cursor=pointer]
          - button "Apollo 11 Landing" [ref=e29] [cursor=pointer]
          - button "Voyager 1 Launch" [ref=e30] [cursor=pointer]
          - button "JWST Launch" [ref=e31] [cursor=pointer]
        - generic [ref=e32]:
          - button "Pause" [ref=e33] [cursor=pointer]
          - generic [ref=e37]: 1×
      - button "Language" [ref=e39] [cursor=pointer]:
        - generic [ref=e43]: English
    - button "NASA Astronomy Picture of the Day" [ref=e49] [cursor=pointer]
    - generic [ref=e58]:
      - generic [ref=e59]:
        - generic [ref=e60]: 🌌 AURORA FORECAST
        - generic [ref=e61]: Kp 5
      - generic [ref=e62]:
        - text: "Solar Activity:"
        - generic [ref=e63]: 67%
      - generic [ref=e64]: "Visibility: Moderate - Visible at high latitudes"
      - generic [ref=e65]: "Northern Lights: Likely"
      - generic [ref=e66]: "Southern Lights: Likely"
      - generic [ref=e67]:
        - generic [ref=e68]: "📍 Best viewing: 60°-75° magnetic latitude"
        - generic [ref=e69]: "⏰ Peak: Local midnight ± 2 hours"
        - generic [ref=e70]: ☀️ Based on simulated solar cycle (11 yr)
        - generic [ref=e71]: ⚠️ Stylized representation — not real-time space weather data
    - generic [ref=e72]:
      - button "Take screenshot (S)" [ref=e73] [cursor=pointer]: 📸Screenshot
      - button "Share view (Shift+S)" [ref=e74] [cursor=pointer]: 🔗Share
    - generic [ref=e76] [cursor=pointer]:
      - generic [ref=e77]:
        - generic [ref=e78]: 2026-08-29 01:51:03 UTC
        - generic [ref=e79]: JD 2461281.57712
      - generic [ref=e80]: ▶ 1×
      - button "⌄" [ref=e82]
    - button "Open settings" [ref=e84] [cursor=pointer]: ⚙️
    - button "Start Tour" [ref=e86] [cursor=pointer]
    - button "Achievements" [ref=e92] [cursor=pointer]:
      - generic [ref=e97]: 0/10
    - button "Feedback" [ref=e98] [cursor=pointer]
  - status "Loading Universe Explorer" [ref=e106]:
    - generic [ref=e110]:
      - generic [ref=e111]:
        - generic [ref=e112]: 🪐
        - heading "Universe Explorer" [level=1] [ref=e113]
      - generic [ref=e114]: 37%
      - generic [ref=e118]: Loading star catalog (Hipparcos)...
      - generic [ref=e119]:
        - generic [ref=e120]:
          - generic [ref=e121]: "Textures:"
          - generic [ref=e122]: 409 / 50
        - generic [ref=e123]:
          - generic [ref=e124]: "Star Data:"
          - generic [ref=e125]: 20035 / 117955
        - generic [ref=e126]:
          - generic [ref=e127]: "Shaders:"
          - generic [ref=e128]: 0 / 8
      - generic [ref=e129]: Light from the Sun takes 8 minutes to reach Earth
    - button "Skip loading" [ref=e130] [cursor=pointer]: Skip
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('Universe Explorer loads and renders without errors for 10+ seconds', async ({ page }) => {
  4  |   const errors: string[] = [];
  5  |   const warnings: string[] = [];
  6  | 
  7  |   // Listen for console errors and warnings
  8  |   page.on('console', msg => {
  9  |     if (msg.type() === 'error') {
  10 |       errors.push(msg.text());
  11 |       console.log(`[CONSOLE ERROR] ${msg.text()}`);
  12 |     } else if (msg.type() === 'warning') {
  13 |       warnings.push(msg.text());
  14 |       console.log(`[CONSOLE WARN] ${msg.text()}`);
  15 |     } else {
  16 |       console.log(`[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
  17 |     }
  18 |   });
  19 | 
  20 |   // Listen for page errors
  21 |   page.on('pageerror', error => {
  22 |     errors.push(error.message);
  23 |     console.log(`[PAGE ERROR] ${error.message}`);
  24 |   });
  25 | 
  26 |   // Navigate to the app
  27 |   await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
  28 | 
  29 |   // Wait for loading screen to appear
  30 |   await page.waitForSelector('.loading-screen', { timeout: 30000 });
  31 |   console.log('Loading screen detected');
  32 | 
  33 |   // Wait for loading to complete (progress reaches 100%)
  34 |   await page.waitForFunction(() => {
  35 |     const progressText = document.querySelector('.loading-progress-text')?.textContent || '';
  36 |     return progressText.includes('100%') || document.querySelector('canvas') !== null;
  37 |   }, { timeout: 60000 });
  38 |   console.log('Loading completed or canvas appeared');
  39 | 
  40 |   // Wait for canvas to be present and rendering
  41 |   await page.waitForSelector('canvas', { timeout: 30000 });
  42 |   console.log('Canvas detected');
  43 | 
  44 |   // Additional wait to ensure rendering is stable (10 seconds)
> 45 |   await page.waitForTimeout(10000);
     |              ^ Error: page.waitForTimeout: Test timeout of 30000ms exceeded.
  46 |   console.log('Waited 10 seconds after canvas appeared');
  47 | 
  48 |   // Check for critical errors
  49 |   const criticalErrors = errors.filter(e =>
  50 |     e.includes('R3F: Hooks can only be used within the Canvas') ||
  51 |     e.includes('useScale must be used within a ScaleProvider') ||
  52 |     e.includes('Maximum update depth exceeded') ||
  53 |     e.includes('Minified React error #185') ||
  54 |     e.includes('getSnapshot should be cached') ||
  55 |     e.includes('cannot be updated while rendering') ||
  56 |     e.includes('Cannot read properties of null') ||
  57 |     e.includes('Cannot read properties of undefined')
  58 |   );
  59 | 
  60 |   console.log(`Total errors: ${errors.length}`);
  61 |   console.log(`Critical errors: ${criticalErrors.length}`);
  62 |   console.log(`Warnings: ${warnings.length}`);
  63 | 
  64 |   if (criticalErrors.length > 0) {
  65 |     console.error('CRITICAL ERRORS FOUND:');
  66 |     criticalErrors.forEach(e => console.error(`  - ${e}`));
  67 |     throw new Error(`Found ${criticalErrors.length} critical errors`);
  68 |   }
  69 | 
  70 |   // Verify canvas is still rendering (not black screen) - use the Three.js canvas, not the loading canvas
  71 |   const canvas = page.locator('canvas[data-engine="three.js r168"]');
  72 |   await expect(canvas).toBeVisible();
  73 | 
  74 |   // Take a screenshot for verification
  75 |   await page.screenshot({ path: 'test-result.png', fullPage: true });
  76 | 
  77 |   console.log('TEST PASSED: Application loaded and rendered without critical errors for 10+ seconds');
  78 | });
```