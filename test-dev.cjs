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

  try {
    await page.goto('http://localhost:5176', { waitUntil: 'networkidle', timeout: 30000 });
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

  } catch (err) {
    console.log(`Test failed: ${err.message}`);
  }

  await browser.close();
  process.exit(errors.length > 0 ? 1 : 0);
})();