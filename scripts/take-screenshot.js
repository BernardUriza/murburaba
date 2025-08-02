const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3001');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'murmuraba-screenshot.png', fullPage: true });
  console.log('Screenshot saved as murmuraba-screenshot.png');
  await browser.close();
})();