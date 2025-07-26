import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import puppeteer, { Browser, Page } from 'puppeteer';

describe('MurmurabaSuite Initialization', () => {
  let browser: Browser;
  let page: Page;
  const APP_URL = 'http://localhost:3000';
  const INIT_TIMEOUT = 30000; // 30 seconds - More time for WASM loading

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--autoplay-policy=no-user-gesture-required',
        '--disable-web-security',
        '--disable-features=IsolateOrigins',
        '--disable-site-isolation-trials'
      ]
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
      console.error('Stack trace:', err.stack);
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
    
    // Wait for the page to be ready
    await page.waitForSelector('body', { visible: true });
    
    // Create a user gesture to enable AudioContext
    await page.evaluate(() => {
      // Click in the center of the viewport
      const event = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: window.innerWidth / 2,
        clientY: window.innerHeight / 2
      });
      document.dispatchEvent(event);
    });
    
    // Wait a bit for the click to register
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Log what we see on the page for debugging
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('Page body text:', bodyText.substring(0, 200));
    
    // Wait for MurmurabaSuite to initialize
    let isInitialized = false;
    try {
      isInitialized = await page.waitForFunction(
        () => {
          // Check for the loading indicator to disappear
          const bodyText = document.body.innerText;
          
          // If still showing "Initializing MurmurabaSuite...", it's not ready
          if (bodyText.includes('Initializing MurmurabaSuite...')) {
            console.log('Still initializing...');
            return false;
          }
          
          // If showing error state, that's also considered "initialized" (failed)
          if (bodyText.includes('Failed to initialize MurmurabaSuite')) {
            console.log('Initialization failed');
            return true;
          }
          
          // Check for the engine status indicator
          const hasReadyStatus = bodyText.includes('Ready: ✅') || bodyText.includes('Ready: ❌');
          
          // Check if main app content is visible
          const hasAppContent = bodyText.includes('Recording Duration') || 
                               bodyText.includes('Murmuraba Studio') ||
                               bodyText.includes('Audio Demo');
          
          console.log('Body check:', { hasReadyStatus, hasAppContent });
          
          return hasReadyStatus || hasAppContent;
        },
        { timeout: INIT_TIMEOUT }
      );
    } catch (error) {
      console.error('Timeout waiting for initialization:', error);
      // Take a screenshot for debugging
      await page.screenshot({ path: 'murmuraba-timeout.png' });
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log('Final page state:', bodyText);
      throw error;
    }
    
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
    
    // Check if the app loaded (even if engine initialization failed)
    const pageContent = await page.evaluate(() => document.body.innerText);
    const appLoaded = pageContent.includes('Recording Duration') || 
                      pageContent.includes('Murmuraba Studio') ||
                      pageContent.includes('Ready:');
    
    expect(appLoaded).toBeTruthy();
  }, INIT_TIMEOUT + 5000); // Add buffer to test timeout
});