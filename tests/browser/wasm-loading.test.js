import { test, expect } from '@playwright/test';

/**
 * Browser compatibility tests for WASM loading
 * Tests across different browsers to ensure consistent behavior
 */

test.describe('WASM Module Loading', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept and mock WASM requests for testing
    await page.route('**/rnnoise.wasm', route => {
      // Return a minimal valid WASM module
      const wasmHeader = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);
      route.fulfill({
        status: 200,
        contentType: 'application/wasm',
        body: Buffer.from(wasmHeader)
      });
    });
  });

  test('should load application without errors', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the main app to load
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    
    // Check for any console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Wait a bit for any async errors
    await page.waitForTimeout(2000);
    
    // Filter out known acceptable errors
    const criticalErrors = errors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('DevTools') &&
      !error.includes('Non-Error promise rejection')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('should initialize audio engine', async ({ page }) => {
    await page.goto('/');
    
    // Wait for engine initialization
    await expect(page.locator('[data-testid="engine-status"]')).toHaveText(/initialized|ready/i, { timeout: 15000 });
    
    // Check that WASM loaded successfully
    const engineStatus = await page.evaluate(() => {
      return window.murmubaraEngine?.isInitialized || false;
    });
    
    expect(engineStatus).toBe(true);
  });

  test('should handle microphone permissions gracefully', async ({ page, browserName }) => {
    // Grant microphone permissions
    await page.context().grantPermissions(['microphone']);
    
    await page.goto('/');
    
    // Try to start recording
    const recordButton = page.locator('button:has-text("Start Recording")');
    await expect(recordButton).toBeVisible();
    
    await recordButton.click();
    
    // Should either start recording or show appropriate error
    await expect(
      page.locator('text=Recording').or(page.locator('text=Microphone'))
    ).toBeVisible({ timeout: 5000 });
  });

  test('should display audio visualizations', async ({ page }) => {
    await page.goto('/');
    
    // Wait for app to load
    await page.waitForLoadState('networkidle');
    
    // Check for waveform or audio visualization elements
    const hasVisualization = await page.locator('[data-testid="waveform"], canvas, svg').count();
    expect(hasVisualization).toBeGreaterThan(0);
  });
});

test.describe('Cross-browser Compatibility', () => {
  test('should work consistently across browsers', async ({ page, browserName }) => {
    await page.goto('/');
    
    // Basic functionality should work in all browsers
    await expect(page.locator('h1')).toBeVisible();
    
    // Check for browser-specific issues
    const userAgent = await page.evaluate(() => navigator.userAgent);
    console.log(`Testing on ${browserName}: ${userAgent}`);
    
    // WebAssembly support check
    const wasmSupported = await page.evaluate(() => {
      return typeof WebAssembly !== 'undefined';
    });
    
    expect(wasmSupported).toBe(true);
    
    // AudioContext support check
    const audioContextSupported = await page.evaluate(() => {
      return typeof (window.AudioContext || window.webkitAudioContext) !== 'undefined';
    });
    
    expect(audioContextSupported).toBe(true);
  });

  test('should handle different screen sizes', async ({ page }) => {
    const viewports = [
      { width: 320, height: 568 },   // iPhone SE
      { width: 768, height: 1024 },  // iPad
      { width: 1920, height: 1080 }  // Desktop
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      
      // App should be responsive and functional
      await expect(page.locator('h1')).toBeVisible();
      
      // Main controls should be accessible
      const recordButton = page.locator('button:has-text("Start Recording")');
      await expect(recordButton).toBeVisible();
      
      // Check that content doesn't overflow
      const body = page.locator('body');
      const bodyBoundingBox = await body.boundingBox();
      expect(bodyBoundingBox.width).toBeLessThanOrEqual(viewport.width);
    }
  });
});

test.describe('Performance Tests', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
    console.log(`Page loaded in ${loadTime}ms`);
  });

  test('should not have memory leaks', async ({ page }) => {
    await page.goto('/');
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return performance.memory?.usedJSHeapSize || 0;
    });
    
    // Simulate some user interactions
    for (let i = 0; i < 10; i++) {
      await page.click('button:has-text("Start Recording")');
      await page.waitForTimeout(100);
      
      const stopButton = page.locator('button:has-text("Stop Recording")');
      if (await stopButton.isVisible()) {
        await stopButton.click();
        await page.waitForTimeout(100);
      }
    }
    
    // Force garbage collection if available
    await page.evaluate(() => {
      if (window.gc) {
        window.gc();
      }
    });
    
    const finalMemory = await page.evaluate(() => {
      return performance.memory?.usedJSHeapSize || 0;
    });
    
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory shouldn't increase by more than 50MB
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
  });
});