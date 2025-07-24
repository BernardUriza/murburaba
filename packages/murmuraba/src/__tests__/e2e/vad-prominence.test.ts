import { test, expect } from '@playwright/test';

test.describe('VAD Prominence End-to-End Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Wait for the app to load
    await page.waitForSelector('[data-testid="murmuraba-studio"]', { timeout: 10000 });
    
    // Initialize engine if needed
    const initButton = page.locator('button:has-text("Initialize Engine")');
    if (await initButton.isVisible()) {
      await initButton.click();
      await page.waitForSelector('button:has-text("Start Recording")', { timeout: 15000 });
    }
  });

  test('should display VAD prominently in chunk results after recording', async ({ page }) => {
    // Start recording
    await page.click('button:has-text("Start Recording")');
    await page.waitForSelector('.recording-indicator', { timeout: 5000 });
    
    // Wait for at least one chunk to be processed (8 seconds default)
    await page.waitForTimeout(9000);
    
    // Stop recording
    await page.click('button:has-text("Stop")');
    
    // Wait for chunk processing
    await page.waitForSelector('[data-testid^="chunk-"]', { timeout: 10000 });
    
    // Check that VAD display is visible and prominent
    const vadDisplay = page.locator('.vad-display').first();
    await expect(vadDisplay).toBeVisible();
    
    // Check VAD title is present
    await expect(page.locator('.vad-display__title:has-text("Voice Activity Detection")')).toBeVisible();
    
    // Check large VAD value is displayed
    const vadValue = page.locator('.vad-metric__value--large');
    await expect(vadValue).toBeVisible();
    
    // Verify VAD value is a valid number (format: X.XXX)
    const vadText = await vadValue.textContent();
    expect(vadText).toMatch(/^\d\.\d{3}$/);
    
    // Check VAD status indicator
    const vadStatus = page.locator('.vad-status');
    await expect(vadStatus).toBeVisible();
    
    // Verify status shows one of the expected states
    const statusText = await vadStatus.textContent();
    expect(statusText).toMatch(/🟢 Strong Voice Activity|🟡 Moderate Voice Activity|🔴 Low Voice Activity/);
  });

  test('should show VAD level styling correctly', async ({ page }) => {
    // Start recording and make noise
    await page.click('button:has-text("Start Recording")');
    await page.waitForSelector('.recording-indicator');
    
    // Simulate different VAD levels by waiting for multiple chunks
    await page.waitForTimeout(12000); // Wait for at least one full chunk
    
    await page.click('button:has-text("Stop")');
    
    // Wait for chunk processing
    await page.waitForSelector('.vad-display', { timeout: 10000 });
    
    // Check that VAD display has correct data-vad-level attribute
    const vadDisplay = page.locator('.vad-display').first();
    const vadLevel = await vadDisplay.getAttribute('data-vad-level');
    
    expect(['high', 'medium', 'low']).toContain(vadLevel);
    
    // Verify appropriate styling based on level
    if (vadLevel === 'high') {
      await expect(page.locator('.vad-status--high')).toBeVisible();
    } else if (vadLevel === 'medium') {
      await expect(page.locator('.vad-status--medium')).toBeVisible();
    } else {
      await expect(page.locator('.vad-status--low')).toBeVisible();
    }
  });

  test('should display VAD timeline when chunk is expanded', async ({ page }) => {
    // Record and create a chunk
    await page.click('button:has-text("Start Recording")');
    await page.waitForTimeout(9000);
    await page.click('button:has-text("Stop")');
    
    // Wait for chunk to appear
    await page.waitForSelector('[data-testid^="chunk-"]');
    
    // Expand the chunk details
    await page.click('button:has-text("Details")');
    
    // Verify VAD timeline is visible
    await expect(page.locator('.vad-chart-container')).toBeVisible();
    await expect(page.locator('text=Voice Activity Detection (VAD) Timeline')).toBeVisible();
    
    // Check for VAD statistics
    await expect(page.locator('text=Voice Detected:')).toBeVisible();
    await expect(page.locator('text=Peak VAD:')).toBeVisible();
    await expect(page.locator('text=Min VAD:')).toBeVisible();
  });

  test('should show VAD as first priority metric in chunk header', async ({ page }) => {
    // Record a chunk
    await page.click('button:has-text("Start Recording")');
    await page.waitForTimeout(9000);
    await page.click('button:has-text("Stop")');
    
    // Wait for chunk
    await page.waitForSelector('[data-testid^="chunk-"]');
    
    // Check that VAD display appears before other metrics in the chunk header
    const chunkHeader = page.locator('.chunk__header').first();
    const vadDisplay = chunkHeader.locator('.vad-display');
    const metaItems = chunkHeader.locator('.chunk__meta');
    
    await expect(vadDisplay).toBeVisible();
    
    // VAD should be visually prominent (larger size, distinct styling)
    const vadValueLarge = vadDisplay.locator('.vad-metric__value--large');
    await expect(vadValueLarge).toBeVisible();
    
    // Verify VAD appears before metadata items in DOM order
    const vadBox = await vadDisplay.boundingBox();
    const metaBox = await metaItems.boundingBox();
    
    if (vadBox && metaBox) {
      expect(vadBox.y).toBeLessThan(metaBox.y); // VAD appears above metadata
    }
  });
});