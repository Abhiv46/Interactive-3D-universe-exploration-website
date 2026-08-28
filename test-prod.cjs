const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  const warnings = [];

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      errors.push(text);
    } else if (msg.type() === 'warning') {
      warnings.push(text);
    }
    console.log(`[${msg.type().toUpperCase()}] ${text}`);
  });

  page.on('pageerror', err => {
    errors.push(err.message);
    console.log(`[PAGE ERROR] ${err.message}`);
  });

  page.on('requestfailed', req => {
    console.log(`[REQUEST FAILED] ${req.url()} - ${req.failure()?.errorText}`);
  });

  try {
    await page.goto('http://localhost:4181', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000); // Wait for app to initialize

    console.log('\n=== SUMMARY ===');
    console.log(`Total errors: ${errors.length}`);
    console.log(`Total warnings: ${warnings.length}`);

    if (errors.length > 0) {
      console.log('\n--- ERRORS ---');
      errors.forEach((e, i) => console.log(`${i+1}. ${e}`));
    }

    if (warnings.length > 0) {
      console.log('\n--- WARNINGS ---');
      warnings.forEach((w, i) => console.log(`${i+1}. ${w}`));
    }

    // Check for specific R3F errors
    const r3fErrors = errors.filter(e => e.includes('R3F') || e.includes('Hooks can only be used within the Canvas'));
    const scaleErrors = errors.filter(e => e.includes('useScale') || e.includes('ScaleProvider'));

    console.log('\n=== R3F HOOK ERRORS ===');
    if (r3fErrors.length === 0) {
      console.log('NONE - SUCCESS!');
    } else {
      r3fErrors.forEach(e => console.log(`FAIL: ${e}`));
    }

    console.log('\n=== SCALE PROVIDER ERRORS ===');
    if (scaleErrors.length === 0) {
      console.log('NONE - SUCCESS!');
    } else {
      scaleErrors.forEach(e => console.log(`FAIL: ${e}`));
    }

  } catch (err) {
    console.log(`Test failed: ${err.message}`);
  }

  await browser.close();
  process.exit(errors.length > 0 ? 1 : 0);
})();