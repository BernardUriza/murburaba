import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import puppeteer, { Browser, Page } from 'puppeteer';

describe('MurmurabaSuite Initialization', () => {
  let browser: Browser;
  let page: Page;
  const APP_URL = 'http://localhost:3000';
  const INIT_TIMEOUT = 10000; // 10 seconds

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
    
    // Capture console logs
    page.on('console', msg => {
      console.log(`Browser console [${msg.type()}]:`, msg.text());
    });
    
    // Capture errors
    page.on('error', err => {
      console.error('Browser error:', err);
    });
    
    page.on('pageerror', err => {
      console.error('Page error:', err);
    });
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  test('MurmurabaSuite should initialize within 10 seconds', async () => {
    console.log('🧪 Starting MurmurabaSuite initialization test...');
    
    // Navigate to the app
    await page.goto(APP_URL, { waitUntil: 'networkidle2' });
    
    // Click on the page to trigger user gesture (required for AudioContext)
    await page.click('body');
    
    // Wait a bit for the click to register
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Log what we see on the page for debugging
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('Page body text:', bodyText.substring(0, 200));
    
    // Wait for MurmurabaSuite to initialize
    const isInitialized = await page.waitForFunction(
      () => {
        // Check for the loading indicator to disappear
        const loadingElement = document.querySelector('div');
        if (loadingElement && loadingElement.textContent?.includes('Initializing MurmurabaSuite...')) {
          return false;
        }
        
        // Check for the engine status indicator
        const statusElement = Array.from(document.querySelectorAll('*')).find(
          el => el.textContent?.includes('Ready: ✅')
        );
        
        // Check Redux state through window object (if exposed)
        const reduxState = (window as any).__REDUX_STATE__;
        const isEngineInitialized = reduxState?.audio?.isEngineInitialized;
        
        return statusElement || isEngineInitialized;
      },
      { timeout: INIT_TIMEOUT }
    );
    
    expect(isInitialized).toBeTruthy();
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'murmuraba-initialized.png' });
    
    // Additional verification: Check for specific UI elements
    const engineStatus = await page.evaluate(() => {
      const statusEl = Array.from(document.querySelectorAll('*')).find(
        el => el.textContent?.includes('Ready:')
      );
      return statusEl?.textContent || '';
    });
    
    console.log('Engine status:', engineStatus);
    expect(engineStatus).toContain('✅');
  }, INIT_TIMEOUT + 5000); // Add buffer to test timeout
});